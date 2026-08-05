/**
 * Lossless export.
 *
 * Rule: a resource the app cannot decode is copied through byte-for-byte.
 * Only resources the user actually edited are re-encoded, and those are written
 * uncompressed so the payload is unambiguous. Files that were never touched are
 * exported as their original uploaded bytes.
 */

import { ByteWriter, checksum } from "./binary";
import { readDbpf, writeDbpf } from "./dbpf";
import type { StblEntry } from "./resource-types";
import type { ImportedResource, ModComponent, ModProject } from "./types";
import { writeZip } from "./zip";

/** Writes an uncompressed STBL v5 payload. */
export function writeStbl(entries: StblEntry[]): Uint8Array {
  const enc = new TextEncoder();
  const rows = entries.map((e) => ({ key: parseInt(e.key, 16) >>> 0, value: enc.encode(e.value) }));
  const w = new ByteWriter();
  w.raw(enc.encode("STBL"));
  w.u16(5);
  w.u8(0);
  w.u64(BigInt(rows.length));
  w.u16(0);
  w.u32(rows.reduce((n, r) => n + r.value.byteLength, 0));
  for (const r of rows) {
    w.u32(r.key);
    w.u8(0);
    w.u16(r.value.byteLength);
    w.raw(r.value);
  }
  return w.finish();
}

export interface ExportedFile {
  name: string;
  bytes: Uint8Array;
  /** True when the bytes are the untouched originals. */
  verbatim: boolean;
}

export interface ExportReport {
  files: ExportedFile[];
  rewrittenResources: number;
  verbatimResources: number;
  warnings: string[];
  checksums: { name: string; sha256: string }[];
}

const encoder = new TextEncoder();

function editedPayload(resource: ImportedResource): Uint8Array | undefined {
  if (resource.strings && resource.subtype === "String table" && resource.dirty)
    return writeStbl(resource.strings);
  if (resource.text !== undefined && resource.dirty) return encoder.encode(resource.text);
  return undefined;
}

async function exportPackage(
  component: ModComponent,
  original: Uint8Array,
  report: ExportReport,
): Promise<ExportedFile> {
  const dirty = (component.resources ?? []).some((r) => r.dirty);
  if (!dirty || component.parseStatus === "corrupt") {
    report.verbatimResources += component.resources?.length ?? 0;
    return { name: component.originalFileName, bytes: original, verbatim: true };
  }

  const pkg = readDbpf(original);
  const entries = pkg.entries.map((entry) => {
    const resource = (component.resources ?? []).find((r) => r.originalIndex === entry.index);
    const payload = resource ? editedPayload(resource) : undefined;
    if (!payload) {
      report.verbatimResources++;
      return {
        typeNum: entry.typeNum,
        groupNum: entry.groupNum,
        instance: entry.instance,
        raw: entry.raw,
        memSize: entry.memSize,
        compressionType: entry.compressionType,
        committed: entry.committed,
      };
    }
    report.rewrittenResources++;
    return {
      typeNum: entry.typeNum,
      groupNum: entry.groupNum,
      instance: entry.instance,
      raw: payload,
      memSize: payload.byteLength,
      compressionType: 0,
      committed: 1,
    };
  });
  return { name: component.originalFileName, bytes: writeDbpf(entries), verbatim: false };
}

/**
 * Rebuilds every component of a mod project.
 * `originals` maps componentId -> the exact bytes that were uploaded.
 */
export async function exportModProject(
  project: ModProject,
  originals: Map<string, Uint8Array>,
): Promise<ExportReport> {
  const report: ExportReport = {
    files: [],
    rewrittenResources: 0,
    verbatimResources: 0,
    warnings: [],
    checksums: [],
  };

  for (const component of project.components) {
    const original = originals.get(component.id);
    if (!original) {
      report.warnings.push(`Original bytes for ${component.originalFileName} are unavailable — skipped.`);
      continue;
    }
    if (component.external) {
      report.warnings.push(
        `${component.originalFileName} is a shared library and was not re-exported. Users install it separately.`,
      );
      continue;
    }
    if (component.fileType === "package") {
      report.files.push(await exportPackage(component, original, report));
    } else {
      report.files.push({ name: component.originalFileName, bytes: original, verbatim: true });
    }
  }

  for (const f of report.files) report.checksums.push({ name: f.name, sha256: await checksum(f.bytes) });
  return report;
}

/** Packs an export report into a single distributable ZIP. */
export function zipExport(project: ModProject, report: ExportReport): Uint8Array {
  const readme = [
    `${project.name}`,
    project.creator ? `Creator: ${project.creator}` : "",
    project.version ? `Version: ${project.version}` : "",
    "",
    "Files:",
    ...report.files.map((f) => `  ${f.name} (${f.verbatim ? "unchanged" : "rebuilt"})`),
    "",
    project.dependencies.length ? "Required separately:" : "",
    ...project.dependencies.filter((d) => d.required).map((d) => `  ${d.name} — ${d.notes ?? ""}`),
  ]
    .filter(Boolean)
    .join("\n");

  return writeZip([
    ...report.files.map((f) => ({ name: f.name, bytes: f.bytes })),
    { name: "README.txt", bytes: encoder.encode(readme) },
  ]);
}

export function downloadBytes(name: string, bytes: Uint8Array, mime = "application/octet-stream") {
  const view = new Uint8Array(bytes);
  const blob = new Blob([view.buffer as ArrayBuffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
