/**
 * .ts4script handling for export.
 *
 * A .ts4script is a ZIP of Python modules. This build never executes, imports
 * or evaluates mod source, and it has no Python compiler, so:
 *
 *  - a preserved compiled archive is exported byte for byte,
 *  - an archive assembled from editable .py sources is only produced when the
 *    project supplies already-compiled modules,
 *  - a change that would require recompiling bytecode blocks script export.
 */

import { readZipIndex, sanitizeZipPath, writeZip, type ZipEntry } from "@/lib/modimport/zip";
import type { ExportError, ExportWarning } from "./types";

export interface ScriptExportInput {
  componentId: string;
  fileName: string;
  /** Original uploaded archive bytes, when the component was imported. */
  originalBytes?: Uint8Array;
  /** True when the user changed something that needs new bytecode. */
  behaviorChanged?: boolean;
  /** True when the archive only contains .pyc modules. */
  compiledOnly?: boolean;
  /** Editable source modules the user authored in the app. */
  sourceModules?: { path: string; text: string }[];
}

export interface ScriptExportResult {
  fileName: string;
  bytes?: Uint8Array;
  verbatim: boolean;
  warnings: ExportWarning[];
  errors: ExportError[];
}

const MAX_MODULES = 5000;
const MAX_ARCHIVE_BYTES = 64 * 1024 * 1024;

export function exportScriptComponent(input: ScriptExportInput): ScriptExportResult {
  const warnings: ExportWarning[] = [];
  const errors: ExportError[] = [];

  if (input.originalBytes && !input.behaviorChanged) {
    // Structural check only — the archive is never opened for execution.
    try {
      const { entries } = readZipIndex(input.originalBytes);
      const unsafe = entries.filter((e) => e.unsafeName);
      if (unsafe.length)
        errors.push({
          code: "SCRIPT_ARCHIVE_INVALID",
          message: `${input.fileName} contains unsafe archive paths and was not exported.`,
          componentId: input.componentId,
        });
      if (entries.length > MAX_MODULES)
        errors.push({
          code: "SCRIPT_ARCHIVE_INVALID",
          message: `${input.fileName} contains ${entries.length} entries, above the ${MAX_MODULES} limit.`,
          componentId: input.componentId,
        });
    } catch (e) {
      errors.push({
        code: "SCRIPT_ARCHIVE_INVALID",
        message: `${input.fileName} could not be reopened: ${(e as Error).message}`,
        componentId: input.componentId,
      });
    }
    return {
      fileName: input.fileName,
      bytes: errors.length ? undefined : input.originalBytes,
      verbatim: true,
      warnings,
      errors,
    };
  }

  if (input.behaviorChanged && input.compiledOnly) {
    errors.push({
      code: "SCRIPT_SOURCE_UNAVAILABLE",
      message:
        `${input.fileName} only contains compiled bytecode, so the requested script change cannot be applied. ` +
        `Export the original script unchanged, or add a new replacement script module as a separate component.`,
      componentId: input.componentId,
    });
    return { fileName: input.fileName, verbatim: false, warnings, errors };
  }

  const sources = input.sourceModules ?? [];
  if (!sources.length) {
    errors.push({
      code: "SCRIPT_SOURCE_UNAVAILABLE",
      message: `${input.fileName} has no preserved archive and no editable source modules.`,
      componentId: input.componentId,
    });
    return { fileName: input.fileName, verbatim: false, warnings, errors };
  }

  // No Python compiler is available in this runtime. Shipping .py sources only
  // is valid for script mods that the game byte-compiles itself is NOT true —
  // the game loads .pyc. Be honest and block instead of faking a build.
  errors.push({
    code: "SCRIPT_COMPILATION_FAILED",
    message:
      `${input.fileName} needs a Python compiler configured for the game's Python version. ` +
      `This build has no compiler service, so a script archive cannot be produced from source.`,
    componentId: input.componentId,
  });
  return { fileName: input.fileName, verbatim: false, warnings, errors };
}

export interface ScriptVerification {
  ok: boolean;
  notes: string[];
  entries: ZipEntry[];
}

/** Reopens a produced .ts4script and checks paths, modules and integrity. */
export function verifyScriptArchive(bytes: Uint8Array): ScriptVerification {
  const notes: string[] = [];
  if (bytes.byteLength > MAX_ARCHIVE_BYTES) notes.push("Archive exceeds the size limit.");
  let entries: ZipEntry[] = [];
  try {
    entries = readZipIndex(bytes).entries;
  } catch (e) {
    return { ok: false, notes: [`Archive could not be reopened: ${(e as Error).message}`], entries: [] };
  }
  const files = entries.filter((e) => !e.directory);
  if (!files.length) notes.push("Archive contains no modules.");
  for (const e of files) {
    if (e.unsafeName) notes.push(`Unsafe path in archive: ${e.name}`);
    if (sanitizeZipPath(e.name).safe !== e.name.replace(/\\/g, "/"))
      notes.push(`Path was rewritten during sanitisation: ${e.name}`);
    if (/(^|\/)(__pycache__|\.DS_Store|Thumbs\.db)(\/|$)/i.test(e.name))
      notes.push(`Temporary build artefact present: ${e.name}`);
  }
  const hasCompiled = files.some((e) => e.name.toLowerCase().endsWith(".pyc"));
  if (!hasCompiled) notes.push("Archive contains no compiled .pyc modules — the game will not load it.");
  return { ok: notes.length === 0, notes, entries };
}

/** Repacks documentation/config side files into a ZIP with sanitised paths. */
export function packFiles(files: { name: string; bytes: Uint8Array }[]): Uint8Array {
  return writeZip(files.map((f) => ({ name: sanitizeZipPath(f.name).safe, bytes: f.bytes })));
}
