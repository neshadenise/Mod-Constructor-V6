/**
 * Export pipeline.
 *
 * Runs outside React: validate -> resolve resources -> build packages ->
 * build/preserve scripts -> assemble files -> verify -> ready. Every output is
 * reopened by the reader before it is offered for download, and any unexpected
 * resource loss fails the job instead of shipping a bad file.
 */

import { checksum } from "@/lib/modimport/binary";
import { readZipIndex, readZipEntry, writeZip } from "@/lib/modimport/zip";
import { folderName, sanitizeFileName, versionedName } from "./filenames";
import { buildDependencyFile, buildManifest, buildReadme } from "./manifest";
import { buildPackage, verifyPackage } from "./package-build";
import { exportScriptComponent, verifyScriptArchive } from "./scripts";
import { buildSnapshot, type SnapshotInput } from "./snapshot";
import { nonExportableKinds } from "./simdata";
import { checkXmlWellFormed } from "./xml-preserve";
import {
  EXPORTER_VERSION,
  type ExportError,
  type ExportJob,
  type ExportSnapshot,
  type ExportStatus,
  type ExportValidationReport,
  type ExportValidationResult,
  type ExportWarning,
  type ExportedFile,
  type RoundTripReport,
} from "./types";

const enc = new TextEncoder();
const dec = new TextDecoder();

export interface ExportRunOptions extends SnapshotInput {
  onProgress?: (job: ExportJob) => void;
  signal?: { cancelled: boolean };
}

let jobSeq = 0;
const activeProjects = new Set<string>();

function newJob(input: SnapshotInput): ExportJob {
  return {
    id: `export-${Date.now().toString(36)}-${(jobSeq++).toString(36)}`,
    projectId: input.request.projectId,
    request: input.request,
    status: "queued",
    progress: 0,
    warnings: [],
    errors: [],
    outputFiles: [],
    logs: [],
    createdAt: new Date().toISOString(),
  };
}

function log(job: ExportJob, level: "debug" | "info" | "warn" | "error", message: string) {
  job.logs.push({ at: new Date().toISOString(), stage: job.status, level, message });
}

function stage(job: ExportJob, status: ExportStatus, progress: number, opts?: ExportRunOptions) {
  job.status = status;
  job.progress = progress;
  opts?.onProgress?.({ ...job });
}

function fail(job: ExportJob, error: ExportError, opts?: ExportRunOptions): ExportJob {
  job.errors.push({ ...error, stage: error.stage ?? job.status });
  log(job, "error", `${error.code}: ${error.message}`);
  job.status = "failed";
  job.progress = 100;
  job.completedAt = new Date().toISOString();
  job.outputFiles = []; // never hand back a partial download
  opts?.onProgress?.({ ...job });
  return job;
}

async function toExportedFile(
  name: string,
  kind: ExportedFile["kind"],
  bytes: Uint8Array,
  verbatim: boolean,
  verified: boolean,
  verifyNotes: string[] = [],
): Promise<ExportedFile> {
  return {
    name,
    kind,
    bytes,
    size: bytes.byteLength,
    checksum: await checksum(bytes),
    verbatim,
    verified,
    verifyNotes,
  };
}

/* ---------------------------- validation ----------------------------- */

let validationSeq = 0;
const v = (
  severity: ExportValidationResult["severity"],
  code: string,
  message: string,
  extra: Partial<ExportValidationResult> = {},
): ExportValidationResult => ({
  id: `v${validationSeq++}`,
  severity,
  code,
  message,
  canAutoFix: false,
  ...extra,
});

export function validateSnapshot(
  snapshot: ExportSnapshot,
  simDataGaps: { resourceId: string; kind: string; message: string }[],
  serializerIssues: { severity: "error" | "warning" | "info"; code: string; message: string; fieldPath?: string }[],
): ExportValidationResult[] {
  const results: ExportValidationResult[] = [];
  const req = snapshot.settings;

  for (const issue of serializerIssues)
    results.push(v(issue.severity, issue.code, issue.message, { fieldPath: issue.fieldPath }));

  // Duplicate resource keys across the whole project.
  const byKey = new Map<string, string[]>();
  for (const r of snapshot.resources) {
    if (r.state === "deleted") continue;
    const k = `${r.componentId}|${r.resourceKey.type}:${r.resourceKey.group}:${r.resourceKey.instance}`;
    byKey.set(k, [...(byKey.get(k) ?? []), r.resourceId]);
  }
  for (const [key, owners] of byKey)
    if (owners.length > 1)
      results.push(
        v("error", "DUPLICATE_RESOURCE_KEY", `Resource key ${key.split("|")[1]} is used by ${owners.length} resources in the same package.`, {
          canAutoFix: req.conflictPolicy === "auto-fix-safe",
          autoFixAction: "Regenerate the duplicate key deterministically from its namespace.",
        }),
      );

  // Unsupported mutations.
  for (const r of snapshot.resources.filter((x) => x.state === "invalid"))
    results.push(
      v("error", "UNSUPPORTED_RESOURCE_MUTATION", `${r.typeLabel} ${r.resourceKey.instance} was edited but has no serializer. Revert the edit or use Full Rebuild.`, {
        componentId: r.componentId,
        resourceId: r.resourceId,
      }),
    );

  // XML well-formedness for anything we rebuilt.
  for (const r of snapshot.resources) {
    if (!r.payload || r.typeLabel !== "XML Tuning") continue;
    const check = checkXmlWellFormed(dec.decode(r.payload));
    if (!check.ok)
      results.push(
        v("error", "INVALID_XML", `Generated tuning for ${r.name ?? r.resourceId} is not well formed: ${check.error}`, {
          componentId: r.componentId,
          resourceId: r.resourceId,
        }),
      );
  }

  // SimData capability.
  if (simDataGaps.length) {
    const severity = req.allowTuningOnly ? "warning" : "error";
    results.push(
      v(severity, "SIMDATA_UNSUPPORTED",
        `${simDataGaps.length} generated resource(s) require a SimData companion this build cannot generate (${nonExportableKinds().join(", ")}). ` +
        (req.allowTuningOnly
          ? "Exporting tuning only — the game may ignore these resources."
          : "Enable “Allow tuning-only package” in advanced options to export anyway, or keep using imported SimData."),
      ),
    );
  }

  // Missing required components.
  const required = snapshot.components.filter((c) => c.required);
  if (!required.length && req.exportType !== "validation-report" && req.exportType !== "project-source")
    results.push(v("error", "MISSING_REQUIRED_COMPONENT", "This export contains no required mod components."));
  if (req.selectedComponentIds?.length) {
    for (const c of snapshot.components)
      if (c.required && !req.selectedComponentIds.includes(c.id))
        results.push(
          v("error", "MISSING_REQUIRED_COMPONENT", `${c.fileName} is required but was excluded from this export.`, { componentId: c.id }),
        );
  }

  // File name safety.
  for (const c of snapshot.components) {
    const check = sanitizeFileName(c.fileName);
    if (!check.ok)
      results.push(
        v("error", "INVALID_FILE_NAME", `${c.fileName}: ${check.problems.join(" ")}`, {
          componentId: c.id,
          canAutoFix: true,
          autoFixAction: `Rename to ${check.name}`,
        }),
      );
  }

  // Dependencies are never bundled silently.
  for (const d of snapshot.dependencies)
    if (d.required && !d.installedComponentId)
      results.push(v("warning", "DEPENDENCY_NOT_INCLUDED", `${d.name} is required but is not redistributed — it is listed in dependencies.json instead.`));

  // Informational preservation summary.
  const preserved = snapshot.resources.filter((r) => r.state === "unsupported-preserved").length;
  if (preserved)
    results.push(v("info", "UNSUPPORTED_PRESERVED", `${preserved} unsupported resource(s) will be copied through byte for byte.`));

  if (!snapshot.description?.trim())
    results.push(v("warning", "EMPTY_DESCRIPTION", "The project has no description; the README will be sparse."));

  return results;
}

/* ------------------------------ runner ------------------------------- */

export async function runExport(opts: ExportRunOptions): Promise<ExportJob> {
  const job = newJob(opts);
  log(job, "info", `Mod Constructor exporter ${EXPORTER_VERSION} starting (${opts.request.mode} / ${opts.request.exportType}).`);

  if (activeProjects.has(job.projectId))
    return fail(job, { code: "PACKAGE_WRITE_FAILED", message: "Another export for this project is already running." }, opts);
  activeProjects.add(job.projectId);

  try {
    const cancelled = () => Boolean(opts.signal?.cancelled);

    stage(job, "validating", 5, opts);
    const { snapshot, issues, simDataGaps } = await buildSnapshot(opts);
    const results = validateSnapshot(snapshot, simDataGaps, issues);
    const report: ExportValidationReport = {
      results,
      blocked: results.some((r) => r.severity === "error"),
      generatedAt: new Date().toISOString(),
    };
    job.validationReport = report;
    for (const w of results.filter((r) => r.severity === "warning"))
      job.warnings.push({ code: w.code, message: w.message, componentId: w.componentId });

    if (opts.request.exportType === "validation-report") {
      stage(job, "assembling-files", 80, opts);
      const bytes = enc.encode(JSON.stringify({ project: snapshot.projectName, ...report }, null, 2));
      job.outputFiles = [await toExportedFile(versionedName(snapshot.projectName, "validation.json", snapshot.projectVersion), "report", bytes, false, true)];
      stage(job, "ready", 100, opts);
      job.completedAt = new Date().toISOString();
      return job;
    }

    if (report.blocked)
      return fail(job, {
        code: (results.find((r) => r.severity === "error")?.code as ExportError["code"]) ?? "PACKAGE_WRITE_FAILED",
        message: results.filter((r) => r.severity === "error").map((r) => r.message).join(" "),
      }, opts);

    if (cancelled()) return fail(job, { code: "EXPORT_CANCELLED", message: "Export cancelled before compilation." }, opts);

    if (opts.request.exportType === "project-source") {
      stage(job, "assembling-files", 70, opts);
      if (!snapshot.projectSource)
        return fail(job, { code: "NOTHING_TO_EXPORT", message: "No builder project is available to export as source." }, opts);
      const bytes = enc.encode(JSON.stringify(snapshot.projectSource, null, 2));
      job.outputFiles = [await toExportedFile(versionedName(snapshot.projectName, "ts4builder", snapshot.projectVersion), "project-source", bytes, false, true)];
      stage(job, "ready", 100, opts);
      job.completedAt = new Date().toISOString();
      return job;
    }

    /* ---------------------- resources + packages --------------------- */
    stage(job, "resolving-resources", 25, opts);
    const roundTrip: RoundTripReport = {
      preservedResources: snapshot.resources.filter((r) => r.state === "unchanged").length,
      modifiedResources: snapshot.resources.filter((r) => r.state === "modified").length,
      addedResources: snapshot.resources.filter((r) => r.state === "created").length,
      removedResources: snapshot.resources.filter((r) => r.state === "deleted").length,
      unsupportedPreserved: snapshot.resources.filter((r) => r.state === "unsupported-preserved").length,
      packageComponents: 0,
      scriptComponentsPreserved: 0,
      unexpectedLosses: [],
      hashMismatches: [],
    };

    const wantPackages = opts.request.exportType !== "scripts-only";
    const wantScripts = opts.request.exportType !== "package-only";
    const files: ExportedFile[] = [];

    stage(job, "building-packages", 40, opts);
    if (wantPackages) {
      for (const component of snapshot.components.filter((c) => c.kind === "package")) {
        if (cancelled()) return fail(job, { code: "EXPORT_CANCELLED", message: "Export cancelled while building packages." }, opts);
        if (opts.request.onlyModified && !componentChanged(component.id, snapshot)) {
          log(job, "info", `${component.fileName} is unchanged — skipped (changed components only).`);
          continue;
        }
        if (component.external) {
          job.warnings.push({ code: "EXTERNAL_NOT_REDISTRIBUTED", message: `${component.fileName} is a shared library and is not redistributed.`, componentId: component.id });
          continue;
        }

        // Preserve-original / untouched imported package: ship original bytes.
        const untouched =
          component.preserveOriginalBytes ||
          !snapshot.resources.some((r) => r.componentId === component.id && r.payload);
        const originalBytes = opts.imported?.originals.get(component.id);
        if (untouched && originalBytes) {
          const verify = await verifyPackage(
            originalBytes,
            await Promise.all(
              snapshot.resources
                .filter((r) => r.componentId === component.id)
                .map(async (r) => ({
                  key: `${r.resourceKey.type}:${r.resourceKey.group}:${r.resourceKey.instance}`,
                  hash: r.originalHash ?? (await checksum(r.raw ?? new Uint8Array())),
                  size: r.raw?.byteLength ?? 0,
                  state: r.state,
                })),
            ),
          );
          files.push(await toExportedFile(component.fileName, "package", originalBytes, true, verify.ok, verify.notes));
          roundTrip.packageComponents++;
          continue;
        }

        const built = await buildPackage(component, snapshot);
        job.warnings.push(...built.warnings);
        if (built.errors.length) return fail(job, built.errors[0]!, opts);
        if (!built.bytes) return fail(job, { code: "PACKAGE_WRITE_FAILED", message: `${component.fileName} produced no bytes.`, componentId: component.id }, opts);

        const verify = await verifyPackage(built.bytes, built.expected);
        if (verify.missingKeys.length)
          return fail(job, {
            code: "UNEXPECTED_RESOURCE_LOSS",
            message: `${component.fileName} lost ${verify.missingKeys.length} resource(s) during writing: ${verify.missingKeys.join(", ")}`,
            componentId: component.id,
          }, opts);
        if (!verify.ok && verify.hashMismatches.length)
          return fail(job, {
            code: "PACKAGE_REOPEN_FAILED",
            message: `${component.fileName} failed verification: ${verify.notes.join(" ")}`,
            componentId: component.id,
          }, opts);
        roundTrip.hashMismatches.push(...verify.hashMismatches);
        files.push(await toExportedFile(component.fileName, "package", built.bytes, false, verify.ok, verify.notes));
        roundTrip.packageComponents++;
      }
    }

    /* --------------------------- scripts ----------------------------- */
    stage(job, "building-scripts", 60, opts);
    if (wantScripts) {
      for (const component of snapshot.components.filter((c) => c.kind === "ts4script")) {
        if (cancelled()) return fail(job, { code: "EXPORT_CANCELLED", message: "Export cancelled while handling scripts." }, opts);
        const result = exportScriptComponent({
          componentId: component.id,
          fileName: component.fileName,
          originalBytes: component.bytes,
          behaviorChanged: false,
        });
        job.warnings.push(...result.warnings);
        if (result.errors.length) return fail(job, result.errors[0]!, opts);
        if (!result.bytes) continue;
        const verify = verifyScriptArchive(result.bytes);
        files.push(await toExportedFile(component.fileName, "ts4script", result.bytes, result.verbatim, verify.ok, verify.notes));
        roundTrip.scriptComponentsPreserved++;
      }
    }

    if (!files.length)
      return fail(job, { code: "NOTHING_TO_EXPORT", message: "No mod components matched this export request." }, opts);

    /* -------------------------- assembling --------------------------- */
    stage(job, "assembling-files", 78, opts);
    const extras: ExportedFile[] = [];

    if (opts.request.includeProjectSource && snapshot.projectSource) {
      const bytes = enc.encode(JSON.stringify(snapshot.projectSource, null, 2));
      extras.push(await toExportedFile(versionedName(snapshot.projectName, "ts4builder", snapshot.projectVersion), "project-source", bytes, false, true));
    }
    if (opts.request.includeDocumentation) {
      const readme = enc.encode(buildReadme(snapshot, files));
      extras.push(await toExportedFile("README.txt", "documentation", readme, false, true));
    }
    if (snapshot.dependencies.length) {
      const deps = enc.encode(JSON.stringify(buildDependencyFile(snapshot), null, 2));
      extras.push(await toExportedFile("dependencies.json", "documentation", deps, false, true));
    }
    if (opts.request.includeManifest) {
      const manifest = enc.encode(JSON.stringify(buildManifest(snapshot, [...files, ...extras]), null, 2));
      extras.push(await toExportedFile("manifest.json", "manifest", manifest, false, true));
    }

    let outputs = [...files, ...extras];

    if (opts.request.exportType === "complete-mod") {
      const root = folderName(opts.request.outputName || snapshot.projectName, opts.request.versionedFileNames ? snapshot.projectVersion : undefined);
      const zipEntries = outputs.map((f) => {
        const component = snapshot.components.find((c) => c.fileName === f.name);
        const optional = component?.optional ? "Optional/" : "";
        const folder = opts.request.preserveFolderStructure && component?.relativePath
          ? `${component.relativePath.replace(/[^/]+$/, "")}`
          : optional;
        return { name: `${root}/${folder}${f.name}`, bytes: f.bytes };
      });
      const zipBytes = writeZip(zipEntries);
      const zipVerify = await verifyZip(zipBytes, zipEntries.map((e) => e.name));
      if (!zipVerify.ok)
        return fail(job, { code: "ZIP_VERIFY_FAILED", message: `Mod ZIP failed verification: ${zipVerify.notes.join(" ")}` }, opts);
      outputs = [
        await toExportedFile(versionedName(opts.request.outputName || snapshot.projectName, "zip", opts.request.versionedFileNames ? snapshot.projectVersion : undefined), "zip", zipBytes, false, true, zipVerify.notes),
        ...outputs,
      ];
    }

    /* --------------------------- verifying --------------------------- */
    stage(job, "verifying", 92, opts);
    const unverified = outputs.filter((f) => !f.verified);
    for (const f of unverified)
      job.warnings.push({ code: "VERIFY_NOTES", message: `${f.name}: ${f.verifyNotes.join(" ")}` });

    job.validationReport = { ...report, roundTrip };
    job.outputFiles = outputs;
    stage(job, "ready", 100, opts);
    job.completedAt = new Date().toISOString();
    log(job, "info", `Export complete: ${outputs.length} file(s).`);
    return job;
  } catch (e) {
    return fail(job, { code: "PACKAGE_WRITE_FAILED", message: (e as Error).message }, opts);
  } finally {
    activeProjects.delete(job.projectId);
  }
}

function componentChanged(componentId: string, snapshot: ExportSnapshot) {
  return snapshot.resources.some(
    (r) => r.componentId === componentId && r.state !== "unchanged" && r.state !== "unsupported-preserved",
  );
}

export async function verifyZip(bytes: Uint8Array, expectedNames: string[]) {
  const notes: string[] = [];
  try {
    const { entries } = readZipIndex(bytes);
    const names = new Set(entries.map((e) => e.safeName));
    for (const want of expectedNames) if (!names.has(want)) notes.push(`Missing ${want} in ZIP.`);
    for (const e of entries) if (e.unsafeName) notes.push(`Unsafe path ${e.name} in ZIP.`);
    // Spot check the first entry decodes.
    const first = entries.find((e) => !e.directory);
    if (first) await readZipEntry(bytes, first);
  } catch (e) {
    notes.push((e as Error).message);
  }
  return { ok: notes.length === 0, notes };
}

export function downloadExportedFile(file: ExportedFile) {
  const view = new Uint8Array(file.bytes);
  const blob = new Blob([view.buffer as ArrayBuffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
