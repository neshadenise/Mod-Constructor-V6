/**
 * Export history — metadata only. Generated binaries are never persisted.
 */

import type { ExportHistoryEntry, ExportJob } from "./types";

const KEY = "mc6.export.history";
const MAX = 60;

function read(): ExportHistoryEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ExportHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function write(entries: ExportHistoryEntry[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX)));
  } catch {
    /* storage full — history is best effort */
  }
}

export function listExportHistory(projectId?: string): ExportHistoryEntry[] {
  const all = read();
  return projectId ? all.filter((e) => e.projectId === projectId) : all;
}

export function recordExport(job: ExportJob, version?: string): ExportHistoryEntry {
  const entry: ExportHistoryEntry = {
    id: job.id,
    projectId: job.projectId,
    version,
    exportType: job.request.exportType,
    exportMode: job.request.mode,
    outputFiles: job.outputFiles.map((f) => ({ fileName: f.name, checksum: f.checksum, size: f.size })),
    warnings: job.warnings.length,
    errors: job.errors.length,
    exporterVersion: job.logs.length ? job.logs[0]!.message.match(/exporter ([\d.]+)/)?.[1] ?? "" : "",
    createdAt: job.completedAt ?? job.createdAt,
  };
  write([entry, ...read().filter((e) => e.id !== entry.id)]);
  return entry;
}

export function clearExportHistory(projectId?: string) {
  if (!projectId) return write([]);
  write(read().filter((e) => e.projectId !== projectId));
}
