/**
 * Local game-data indexer.
 *
 * Scans .package files the user points us at (their Sims 4 install or Mods
 * folder) and records every tuning name/ID and every localized string it
 * finds. This is the only legitimate source for EA's real IDs and strings —
 * they are game data, so they never leave the machine: the index is written to
 * IndexedDB on-device and is never uploaded anywhere.
 */

import { readDbpf, readDbpfResource } from "../modimport/dbpf";
import { isStbl, parseStbl, sniffFormat } from "../modimport/resource-types";
import { parseTuning } from "../modimport/tuning";
import { STORE_LOCAL, idbClear, idbGet, idbSet } from "./db";
import type { GameRef, GameRefKind } from "./types";

const TUNING_KEY = "tuning";
const STRINGS_KEY = "strings";
const META_KEY = "meta";

export interface LocalIndexMeta {
  scannedAt: string;
  packagesScanned: number;
  tuningCount: number;
  stringCount: number;
  /** File names of the packages that produced this index. */
  sources: string[];
}

export interface ScanProgress {
  file: string;
  fileIndex: number;
  fileCount: number;
  tuning: number;
  strings: number;
}

function kindOf(instanceType: string | undefined, module: string | undefined): GameRefKind {
  const s = `${instanceType ?? ""} ${module ?? ""}`.toLowerCase();
  if (s.includes("buff")) return "buff";
  if (s.includes("career_track") || s.includes("careertrack")) return "career_track";
  if (s.includes("career")) return "career";
  if (s.includes("trait")) return "trait";
  if (s.includes("aspiration")) return "aspiration";
  if (s.includes("statistic") || s.includes("skill") || s.includes("commodity")) return "statistic";
  if (s.includes("interaction") || s.includes("affordance")) return "interaction";
  if (s.includes("loot") || s.includes("action")) return "loot";
  return "other";
}

/**
 * Indexes a batch of packages. Existing index entries are merged, so a user can
 * scan the base game once and add pack packages later without rescanning.
 */
export async function scanPackages(
  files: File[],
  onProgress?: (p: ScanProgress) => void,
  signal?: { cancelled: boolean },
): Promise<LocalIndexMeta> {
  const existing = await loadIndex();
  const tuning = new Map(existing.tuning.map((r) => [r.id, r]));
  const strings = new Map(existing.strings.map((r) => [r.id, r]));
  const prevMeta = await getLocalMeta();
  const sources = new Set(prevMeta?.sources ?? []);

  let fileIndex = 0;
  for (const file of files) {
    if (signal?.cancelled) break;
    fileIndex += 1;
    onProgress?.({
      file: file.name,
      fileIndex,
      fileCount: files.length,
      tuning: tuning.size,
      strings: strings.size,
    });

    let pkg;
    try {
      pkg = readDbpf(new Uint8Array(await file.arrayBuffer()));
    } catch {
      // Not a package (or an unsupported variant) — skip it rather than fail
      // the whole scan; users routinely select whole folders.
      continue;
    }
    sources.add(file.name);

    for (const entry of pkg.entries) {
      if (signal?.cancelled) break;
      let payload: Uint8Array;
      try {
        payload = await readDbpfResource(entry);
      } catch {
        continue;
      }

      const format = sniffFormat(payload);

      if (format === "stbl" && isStbl(payload)) {
        try {
          for (const s of parseStbl(payload)) {
            strings.set(s.key, {
              id: s.key,
              hex: `0x${s.key}`,
              name: s.value,
              value: s.value,
              kind: "string",
              source: "local",
            });
          }
        } catch {
          /* malformed table — ignore */
        }
        continue;
      }

      if (format === "xml") {
        try {
          const text = new TextDecoder().decode(payload);
          const parsed = parseTuning(text);
          const id = parsed.instanceId ?? entry.instance.toString();
          if (!parsed.name) continue;
          const ref: GameRef = {
            id,
            name: parsed.name,
            kind: kindOf(parsed.instanceType, parsed.modulePath ?? parsed.className),
            source: "local",
          };
          if (parsed.modulePath) ref.module = parsed.modulePath;
          if (parsed.className) ref.className = parsed.className;
          tuning.set(id, ref);
        } catch {
          /* unparsable tuning — ignore */
        }
      }
    }
  }

  const meta: LocalIndexMeta = {
    scannedAt: new Date().toISOString(),
    packagesScanned: sources.size,
    tuningCount: tuning.size,
    stringCount: strings.size,
    sources: [...sources],
  };

  await idbSet(STORE_LOCAL, TUNING_KEY, [...tuning.values()]);
  await idbSet(STORE_LOCAL, STRINGS_KEY, [...strings.values()]);
  await idbSet(STORE_LOCAL, META_KEY, meta);
  return meta;
}

export async function loadIndex(): Promise<{ tuning: GameRef[]; strings: GameRef[] }> {
  const [tuning, strings] = await Promise.all([
    idbGet<GameRef[]>(STORE_LOCAL, TUNING_KEY),
    idbGet<GameRef[]>(STORE_LOCAL, STRINGS_KEY),
  ]);
  return { tuning: tuning ?? [], strings: strings ?? [] };
}

export function getLocalMeta(): Promise<LocalIndexMeta | null> {
  return idbGet<LocalIndexMeta>(STORE_LOCAL, META_KEY);
}

export async function clearLocalIndex(): Promise<void> {
  await idbClear(STORE_LOCAL);
}

export async function searchLocal(query: string, kind?: GameRefKind, limit = 50): Promise<GameRef[]> {
  const { tuning, strings } = await loadIndex();
  const q = query.trim().toLowerCase();
  const pool = kind === "string" ? strings : tuning;
  const out: GameRef[] = [];
  for (const r of pool) {
    if (kind && kind !== "string" && r.kind !== kind) continue;
    if (q && !r.name.toLowerCase().includes(q) && r.id !== q) continue;
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}
