/**
 * Rebuild an imported .package from the files that live in the project.
 *
 * The import writes every package resource into the Project Explorer as a real
 * file plus a `resources.json` manifest that records each file's resource key
 * (type / group / instance) and how it was encoded. This module walks that
 * manifest, re-encodes only the resources whose file content actually changed,
 * and copies every other resource through byte-for-byte from the original
 * package.
 */

import { readDbpf, readDbpfResource, writeDbpf } from "./dbpf";
import { writeStbl } from "./export";
import type { ResourceManifest } from "./save-to-project";
import type { ResourceKey } from "./types";

export interface RebuildFile {
  /** Path relative to the imported mod folder, e.g. "Tuning/trait_x.xml". */
  path: string;
  /** Current text content for xml / stbl-json files. */
  text?: string;
  /** True when the file was deleted from the project. */
  missing?: boolean;
}

export interface RebuildSource {
  /** Original uploaded .package bytes, keyed by file name. */
  packages: Map<string, Uint8Array>;
  manifest: ResourceManifest;
  files: Map<string, RebuildFile>;
}

export interface RebuiltPackage {
  name: string;
  bytes: Uint8Array;
  editedResources: number;
  verbatimResources: number;
  droppedResources: number;
  warnings: string[];
  /** Re-read of the written package matched the expected resource keys. */
  verified: boolean;
}

const encoder = new TextEncoder();

function keyTag(key: ResourceKey): string {
  return `${key.type.toUpperCase()}!${key.group.toUpperCase()}!${key.instance.toUpperCase()}`;
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Encodes the current content of an edited file back into a resource payload. */
function encodePayload(
  encoding: ResourceManifest["resources"][number]["encoding"],
  file: RebuildFile,
): Uint8Array | undefined {
  if (file.text === undefined) return undefined;
  if (encoding === "xml") return encoder.encode(file.text);
  if (encoding === "stbl-json") {
    const parsed = JSON.parse(file.text) as Record<string, string>;
    return writeStbl(Object.entries(parsed).map(([key, value]) => ({ key, value })));
  }
  return undefined;
}

/**
 * Rebuilds every package referenced by the manifest.
 * Resources whose file is unchanged keep their original stored bytes and
 * compression; edited resources are written uncompressed so the payload is
 * unambiguous; resources whose file was deleted are omitted.
 */
export async function rebuildPackages(source: RebuildSource): Promise<RebuiltPackage[]> {
  const out: RebuiltPackage[] = [];

  for (const [fileName, original] of source.packages) {
    const result: RebuiltPackage = {
      name: fileName,
      bytes: original,
      editedResources: 0,
      verbatimResources: 0,
      droppedResources: 0,
      warnings: [],
      verified: false,
    };

    let pkg;
    try {
      pkg = readDbpf(original);
    } catch (e) {
      result.warnings.push(`${fileName} could not be read: ${(e as Error).message}`);
      out.push(result);
      continue;
    }

    const byKey = new Map(
      source.manifest.resources
        .filter((r) => !r.sourceFile || r.sourceFile === fileName)
        .map((r) => [keyTag(r.key), r]),
    );

    const entries: Parameters<typeof writeDbpf>[0] = [];
    for (const entry of pkg.entries) {
      const record = byKey.get(keyTag(entry.key));
      const file = record ? source.files.get(record.path) : undefined;

      if (record && file?.missing) {
        result.droppedResources++;
        continue;
      }

      let payload: Uint8Array | undefined;
      if (record && file && record.encoding !== "preserved") {
        try {
          payload = encodePayload(record.encoding, file);
        } catch (e) {
          result.warnings.push(`${record.path} could not be re-encoded: ${(e as Error).message}`);
          payload = undefined;
        }
        if (payload) {
          try {
            const current = await readDbpfResource(entry);
            if (sameBytes(current, payload)) payload = undefined;
          } catch {
            /* unreadable original — treat the file content as authoritative */
          }
        }
      }

      if (!payload) {
        result.verbatimResources++;
        entries.push({
          typeNum: entry.typeNum,
          groupNum: entry.groupNum,
          instance: entry.instance,
          raw: entry.raw,
          memSize: entry.memSize,
          compressionType: entry.compressionType,
          committed: entry.committed,
        });
        continue;
      }

      result.editedResources++;
      entries.push({
        typeNum: entry.typeNum,
        groupNum: entry.groupNum,
        instance: entry.instance,
        raw: payload,
        memSize: payload.byteLength,
        compressionType: 0,
        committed: 1,
      });
    }

    if (!entries.length) {
      result.warnings.push(`${fileName} would contain no resources — original kept instead.`);
      out.push(result);
      continue;
    }

    if (result.editedResources === 0 && result.droppedResources === 0) {
      result.bytes = original;
      result.verified = true;
      out.push(result);
      continue;
    }

    const bytes = writeDbpf(entries);
    result.bytes = bytes;

    // Verification: the rebuilt package must re-read with exactly the keys we wrote.
    try {
      const check = readDbpf(bytes);
      const expected = new Set(entries.map((e) => `${e.typeNum}!${e.groupNum}!${e.instance}`));
      const actual = new Set(
        check.entries.map((e) => `${e.typeNum}!${e.groupNum}!${e.instance}`),
      );
      result.verified = expected.size === actual.size && [...expected].every((k) => actual.has(k));
      if (!result.verified) result.warnings.push(`${fileName} re-read with a different resource set.`);
    } catch (e) {
      result.warnings.push(`${fileName} could not be re-read after writing: ${(e as Error).message}`);
    }

    out.push(result);
  }

  return out;
}
