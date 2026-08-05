/**
 * .ts4script analysis — static inspection only.
 *
 * A .ts4script is a ZIP of Python modules. Nothing inside is ever executed,
 * imported, evaluated or compiled: the archive is opened read-only, the module
 * tree is enumerated, .pyc magic numbers are mapped to Python versions, and
 * .py sources are scanned with a regex tokenizer for import/class/command names.
 */

import { readZipEntry, readZipIndex, isZip } from "./zip";
import { utf8 } from "./binary";
import type { ScriptModule } from "./types";

/** CPython bytecode magic (first 2 bytes little endian) -> version. */
const PYC_MAGIC: Record<number, string> = {
  3379: "Python 3.7",
  3390: "Python 3.7",
  3392: "Python 3.7",
  3393: "Python 3.7",
  3394: "Python 3.7",
  3400: "Python 3.8",
  3413: "Python 3.8",
  3425: "Python 3.9",
  3439: "Python 3.10",
  3495: "Python 3.11",
  3531: "Python 3.12",
};

/** Python versions the game itself runs. Anything else is flagged. */
export const GAME_PYTHON = "Python 3.7";

export interface ParsedScriptArchive {
  modules: ScriptModule[];
  namespaces: string[];
  imports: string[];
  classNames: string[];
  commandNames: string[];
  manifest?: Record<string, string>;
  warnings: string[];
  compiledOnly: boolean;
}

const moduleNamespace = (path: string) =>
  path
    .replace(/\.(py|pyc|pyo)$/i, "")
    .replace(/\/__init__$/i, "")
    .split("/")
    .filter(Boolean)
    .join(".");

function scanSource(text: string) {
  const imports = new Set<string>();
  const classNames = new Set<string>();
  const commandNames = new Set<string>();
  for (const m of text.matchAll(/^\s*(?:from\s+([A-Za-z0-9_.]+)\s+import|import\s+([A-Za-z0-9_., \t]+))/gm)) {
    if (m[1]) imports.add(m[1]);
    for (const part of (m[2] ?? "").split(",")) {
      const name = part.trim().split(/\s+as\s+/)[0];
      if (name) imports.add(name);
    }
  }
  for (const m of text.matchAll(/^\s*class\s+([A-Za-z0-9_]+)/gm)) classNames.add(m[1]!);
  for (const m of text.matchAll(/Command\(\s*['"]([^'"]+)['"]/g)) commandNames.add(m[1]!);
  return { imports, classNames, commandNames };
}

export async function parseScriptArchive(bytes: Uint8Array): Promise<ParsedScriptArchive> {
  if (!isZip(bytes)) throw new Error("Not a valid .ts4script archive (missing ZIP signature)");
  const { entries, warnings } = readZipIndex(bytes);
  const modules: ScriptModule[] = [];
  const imports = new Set<string>();
  const classNames = new Set<string>();
  const commandNames = new Set<string>();
  let manifest: Record<string, string> | undefined;
  let sawSource = false;
  let sawCompiled = false;

  for (const entry of entries) {
    if (entry.directory || entry.encrypted) continue;
    const path = entry.safeName;
    const lower = path.toLowerCase();
    const kind: ScriptModule["kind"] = lower.endsWith(".py")
      ? "py"
      : /\.(pyc|pyo)$/.test(lower)
        ? "pyc"
        : /(^|\/)(manifest|mod\.json|modinfo)[^/]*$/.test(lower)
          ? "manifest"
          : /\.(json|cfg|ini|toml|yaml|yml)$/.test(lower)
            ? "config"
            : "asset";

    const mod: ScriptModule = {
      path,
      kind,
      byteSize: entry.byteSize,
      compiled: kind === "pyc",
      ...(kind === "py" || kind === "pyc" ? { namespace: moduleNamespace(path) } : {}),
    };

    if (kind === "pyc") {
      sawCompiled = true;
      try {
        const raw = await readZipEntry(bytes, entry);
        const magic = raw[0]! | (raw[1]! << 8);
        mod.bytecodeVersion = PYC_MAGIC[magic] ?? `Unknown bytecode (magic ${magic})`;
        if (mod.bytecodeVersion !== GAME_PYTHON)
          warnings.push(`${path}: compiled for ${mod.bytecodeVersion}; the game runs ${GAME_PYTHON}`);
      } catch (e) {
        warnings.push(`${path}: could not read bytecode header (${(e as Error).message})`);
      }
    } else if (kind === "py") {
      sawSource = true;
      try {
        const text = utf8(await readZipEntry(bytes, entry));
        const scan = scanSource(text);
        mod.imports = [...scan.imports];
        scan.imports.forEach((i) => imports.add(i));
        scan.classNames.forEach((i) => classNames.add(i));
        scan.commandNames.forEach((i) => commandNames.add(i));
      } catch (e) {
        warnings.push(`${path}: source could not be read (${(e as Error).message})`);
      }
    } else if (kind === "manifest" || kind === "config") {
      try {
        const text = utf8(await readZipEntry(bytes, entry));
        if (lower.endsWith(".json")) {
          const json = JSON.parse(text) as Record<string, unknown>;
          manifest = manifest ?? {};
          for (const [k, v] of Object.entries(json))
            if (typeof v === "string" || typeof v === "number") manifest[k] = String(v);
        } else {
          manifest = manifest ?? {};
          for (const line of text.split(/\r?\n/)) {
            const kv = /^\s*([A-Za-z0-9_ .-]+)\s*[:=]\s*(.+)$/.exec(line);
            if (kv) manifest[kv[1]!.trim().toLowerCase()] = kv[2]!.trim();
          }
        }
      } catch {
        /* manifest is optional */
      }
    }
    modules.push(mod);
  }

  const namespaces = [
    ...new Set(
      modules
        .filter((m) => m.namespace)
        .map((m) => m.namespace!.split(".")[0]!)
        .filter(Boolean),
    ),
  ];

  return {
    modules,
    namespaces,
    imports: [...imports],
    classNames: [...classNames],
    commandNames: [...commandNames],
    ...(manifest ? { manifest } : {}),
    warnings,
    compiledOnly: sawCompiled && !sawSource,
  };
}
