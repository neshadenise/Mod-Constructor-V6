/**
 * DBPF package assembly + verification.
 *
 * The writer is a real DBPF v2.1 writer (shared with the importer). Untouched
 * resources keep their stored bytes and compression; rebuilt resources are
 * written uncompressed. Deleted resources are omitted; nothing else is.
 */

import { checksum } from "@/lib/modimport/binary";
import { readDbpf, writeDbpf, type DbpfWriteEntry } from "@/lib/modimport/dbpf";
import { keyToString, normalizeKey } from "./ids";
import type {
  ExportComponentSnapshot,
  ExportError,
  ExportResourceSnapshot,
  ExportSnapshot,
  ExportWarning,
} from "./types";

export interface PackageBuildResult {
  bytes?: Uint8Array;
  expected: { key: string; hash: string; size: number; state: string }[];
  warnings: ExportWarning[];
  errors: ExportError[];
}

const toNum = (hexStr: string) => parseInt(hexStr, 16) >>> 0;

export async function buildPackage(
  component: ExportComponentSnapshot,
  snapshot: ExportSnapshot,
): Promise<PackageBuildResult> {
  const warnings: ExportWarning[] = [];
  const errors: ExportError[] = [];
  const expected: PackageBuildResult["expected"] = [];

  const resources = component.resourceIds
    .map((id) => snapshot.resources.find((r) => r.resourceId === id))
    .filter((r): r is ExportResourceSnapshot => Boolean(r));

  const seen = new Map<string, string>();
  const entries: DbpfWriteEntry[] = [];

  for (const resource of resources) {
    if (resource.state === "deleted") continue;
    if (resource.state === "invalid") {
      errors.push({
        code: "UNSUPPORTED_RESOURCE_MUTATION",
        message:
          `${resource.typeLabel} ${keyToString(resource.resourceKey)} was edited but cannot be rebuilt safely. ` +
          `Revert the edit, or switch this component to Full Rebuild and accept possible data loss.`,
        componentId: component.id,
        resourceId: resource.resourceId,
      });
      continue;
    }

    const key = normalizeKey(resource.resourceKey);
    const asString = keyToString(key);
    const owner = seen.get(asString);
    if (owner) {
      errors.push({
        code: "DUPLICATE_RESOURCE_KEY",
        message: `Resource key ${asString} is used by both ${owner} and ${resource.resourceId}.`,
        componentId: component.id,
        resourceId: resource.resourceId,
      });
      continue;
    }
    seen.set(asString, resource.resourceId);

    const payload = resource.payload;
    const raw = payload ?? resource.raw;
    if (!raw) {
      errors.push({
        code: "PACKAGE_WRITE_FAILED",
        message: `No bytes available for ${asString} (${resource.typeLabel}).`,
        componentId: component.id,
        resourceId: resource.resourceId,
      });
      continue;
    }

    entries.push({
      typeNum: toNum(key.type),
      groupNum: toNum(key.group),
      instance: BigInt("0x" + key.instance),
      raw,
      memSize: payload ? payload.byteLength : (resource.memSize ?? raw.byteLength),
      compressionType: payload ? 0 : (resource.compressionType ?? 0),
      committed: 1,
    });
    expected.push({
      key: asString,
      hash: await checksum(raw),
      size: raw.byteLength,
      state: resource.state,
    });
  }

  if (errors.length) return { expected, warnings, errors };
  if (!entries.length) {
    errors.push({
      code: "NOTHING_TO_EXPORT",
      message: `${component.fileName} would contain no resources.`,
      componentId: component.id,
    });
    return { expected, warnings, errors };
  }

  let bytes: Uint8Array;
  try {
    bytes = writeDbpf(entries);
  } catch (e) {
    errors.push({
      code: "PACKAGE_WRITE_FAILED",
      message: `${component.fileName} could not be written: ${(e as Error).message}`,
      componentId: component.id,
    });
    return { expected, warnings, errors };
  }

  return { bytes, expected, warnings, errors };
}

export interface PackageVerification {
  ok: boolean;
  notes: string[];
  resourceCount: number;
  hashMismatches: string[];
  missingKeys: string[];
  unexpectedKeys: string[];
}

/** Reopens a written package and compares it against the expected index. */
export async function verifyPackage(
  bytes: Uint8Array,
  expected: { key: string; hash: string; size: number; state: string }[],
): Promise<PackageVerification> {
  const notes: string[] = [];
  const hashMismatches: string[] = [];
  let pkg;
  try {
    pkg = readDbpf(bytes);
  } catch (e) {
    return {
      ok: false,
      notes: [`Package could not be reopened: ${(e as Error).message}`],
      resourceCount: 0,
      hashMismatches,
      missingKeys: expected.map((e2) => e2.key),
      unexpectedKeys: [],
    };
  }

  const actual = new Map<string, { hash: string; size: number }>();
  const duplicates: string[] = [];
  for (const entry of pkg.entries) {
    const key = keyToString(normalizeKey(entry.key));
    if (actual.has(key)) duplicates.push(key);
    actual.set(key, { hash: await checksum(entry.raw), size: entry.raw.byteLength });
  }
  if (duplicates.length) notes.push(`Duplicate keys in written index: ${duplicates.join(", ")}`);

  const missingKeys: string[] = [];
  for (const e of expected) {
    const got = actual.get(e.key);
    if (!got) {
      missingKeys.push(e.key);
      continue;
    }
    if (got.hash !== e.hash) hashMismatches.push(e.key);
    if (got.size !== e.size) notes.push(`Size mismatch for ${e.key}: ${got.size} vs ${e.size}`);
  }
  const expectedKeys = new Set(expected.map((e) => e.key));
  const unexpectedKeys = [...actual.keys()].filter((k) => !expectedKeys.has(k));

  if (missingKeys.length) notes.push(`Missing resources after write: ${missingKeys.join(", ")}`);
  if (unexpectedKeys.length) notes.push(`Unexpected resources after write: ${unexpectedKeys.join(", ")}`);
  if (hashMismatches.length) notes.push(`Payload hash mismatch: ${hashMismatches.join(", ")}`);
  if (pkg.entries.length !== expected.length)
    notes.push(`Resource count ${pkg.entries.length} does not match the expected ${expected.length}.`);

  return {
    ok: notes.length === 0,
    notes,
    resourceCount: pkg.entries.length,
    hashMismatches,
    missingKeys,
    unexpectedKeys,
  };
}
