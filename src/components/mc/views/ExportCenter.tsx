/**
 * Export Center — the UI shell over src/lib/modexport.
 *
 * All package writing, script handling, validation and verification happen in
 * the pipeline module; this component only collects settings and renders the
 * job it produces.
 */

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileArchive,
  FileCode2,
  FileJson,
  FileText,
  Info,
  Loader2,
  Package,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore } from "@/lib/store";
import { useAdvanced } from "@/lib/advanced-mode";
import { downloadExportedFile, runExport } from "@/lib/modexport/pipeline";
import { applyCreatorPrefix, normalizeCreatorPrefix, versionedName } from "@/lib/modexport/filenames";
import { listImportedProjects, subscribeImports } from "@/lib/modexport/registry";
import { listExportHistory, recordExport } from "@/lib/modexport/history";
import { nonExportableKinds } from "@/lib/modexport/simdata";
import {
  DEFAULT_EXPORT_REQUEST,
  EXPORTER_VERSION,
  type ExportJob,
  type ExportMode,
  type ExportRequest,
  type ExportType,
  type ExportedFile,
} from "@/lib/modexport/types";
import { cn } from "@/lib/utils";
import RebuildImportedPanel from "./RebuildImportedPanel";

const TARGETS: { value: ExportType; label: string; hint: string }[] = [
  { value: "complete-mod", label: "Complete Mod ZIP", hint: "Every owned component in one installable folder." },
  { value: "package-only", label: "Individual Packages", hint: "Only the .package files." },
  { value: "scripts-only", label: "Script Components", hint: "Only preserved .ts4script archives." },
  { value: "changed-components", label: "Changed Components Only", hint: "Skip components with no changes." },
  { value: "project-source", label: "Builder Project (.ts4builder)", hint: "Re-importable project source, not a game file." },
  { value: "validation-report", label: "Validation Report", hint: "Run every check without writing mod files." },
];

const MODES: { value: ExportMode; label: string; hint: string }[] = [
  { value: "safe", label: "Safe Export — recommended", hint: "Untouched resources keep their original bytes; only edited resources are rebuilt. Blocks anything that cannot be rebuilt safely." },
  { value: "rebuild", label: "Full Rebuild — advanced", hint: "Regenerates output from the builder model. Anything the builder does not represent is lost." },
  { value: "preserve-original", label: "Preserve Originals", hint: "Repackages imported files unchanged and adds documentation only." },
];

const FILE_ICON: Record<ExportedFile["kind"], typeof Package> = {
  package: Package,
  ts4script: FileCode2,
  zip: FileArchive,
  manifest: FileJson,
  documentation: FileText,
  "project-source": FileJson,
  report: ShieldCheck,
};

function bytesLabel(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function Card({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-border bg-card/60 p-4", className)}>
      <header className="mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function Row({ checked, onChange, label, hint, required }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; required?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1.5 hover:bg-muted/50">
      <Checkbox checked={checked} disabled={required} onCheckedChange={(v) => onChange(Boolean(v))} className="mt-0.5" />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          {label}
          {required && <span className="rounded bg-primary/15 px-1 py-px text-[9px] font-semibold uppercase text-primary">required</span>}
        </span>
        {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

export default function ExportCenter() {
  const store = useStore();
  const { advanced } = useAdvanced();
  const imports = useSyncExternalStore(subscribeImports, listImportedProjects, listImportedProjects);

  const project = store.state.projects.find((p) => p.id === store.state.activeProjectId) ?? store.state.projects[0];
  const pid = project?.id;

  const builder = useMemo(() => {
    if (!project) return undefined;
    return {
      project,
      careers: store.state.careers.filter((c) => c.projectId === pid),
      traits: store.state.traits.filter((t) => t.projectId === pid),
      aspirations: store.state.aspirations.filter((a) => a.projectId === pid),
      notifications: store.state.notifications.filter((n) => n.projectId === pid),
      assets: store.state.assets.filter((a) => a.projectId === pid),
    };
  }, [project, pid, store.state]);

  const [sourceId, setSourceId] = useState<string>("builder");
  const imported = imports.find((i) => i.project.id === sourceId);

  const [request, setRequest] = useState<ExportRequest>({ ...DEFAULT_EXPORT_REQUEST, projectId: pid ?? "none" });
  const [excluded, setExcluded] = useState<string[]>([]);
  /** Per-export escape hatch: skip the workspace creator prefix this once. */
  const [skipPrefix, setSkipPrefix] = useState(false);
  const creatorPrefix = skipPrefix
    ? undefined
    : normalizeCreatorPrefix(store.state.settings.creatorPrefix ?? "") || undefined;
  const [job, setJob] = useState<ExportJob | null>(null);
  const [running, setRunning] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [history, setHistory] = useState(() => listExportHistory(pid));

  useEffect(() => {
    setRequest((r) => ({ ...r, projectId: pid ?? "none" }));
    setHistory(listExportHistory(pid));
  }, [pid]);

  const patch = (p: Partial<ExportRequest>) => setRequest((r) => ({ ...r, ...p }));

  const components = imported
    ? imported.project.components.map((c) => ({
        id: c.id,
        label: c.originalFileName,
        hint: `${c.fileType} · ${c.role}${c.external ? " · shared library" : ""}`,
        required: !c.optional && !c.external,
      }))
    : builder
      ? [
          {
            id: `builder:${builder.project.id}`,
            label: `${builder.project.name}.package`,
            hint: `${builder.careers.length} careers · ${builder.traits.length} traits · ${builder.aspirations.length} aspirations`,
            required: true,
          },
        ]
      : [];

  const run = async () => {
    if (!project) return;
    setRunning(true);
    setJob(null);
    const selected = components.filter((c) => !excluded.includes(c.id)).map((c) => c.id);
    const result = await runExport({
      request: { ...request, projectId: project.id, creatorPrefix, selectedComponentIds: selected.length === components.length ? undefined : selected },
      builder: imported ? undefined : builder,
      imported: imported ? { project: imported.project, originals: imported.originals } : undefined,
      onProgress: (j) => setJob({ ...j }),
    });
    setJob(result);
    setRunning(false);
    if (result.status === "ready") {
      recordExport(result, project.version);
      setHistory(listExportHistory(project.id));
      toast.success(`Export ready — ${result.outputFiles.length} file(s) verified.`);
    } else {
      toast.error(result.errors[0]?.message ?? "Export failed.");
    }
  };

  const errors = job?.validationReport?.results.filter((r) => r.severity === "error") ?? [];
  const warnings = job?.validationReport?.results.filter((r) => r.severity === "warning") ?? [];
  const infos = job?.validationReport?.results.filter((r) => r.severity === "info") ?? [];
  const roundTrip = job?.validationReport?.roundTrip;

  if (!project) return <p className="text-sm text-muted-foreground">Create a project first.</p>;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Package className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Export Center</h2>
          <p className="text-[11px] text-muted-foreground">
            Real .package / .ts4script output · exporter {EXPORTER_VERSION} · every file is reopened and verified before download
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {running && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          <Button size="sm" onClick={run} disabled={running || !components.length}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {running ? `${job?.status ?? "working"}…` : "Run export"}
          </Button>
        </div>
      </header>

      {running && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${job?.progress ?? 0}%` }} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px]">
        <span className="font-semibold uppercase tracking-wider text-muted-foreground">
          File name
        </span>
        <span className="font-mono text-foreground">
          {versionedName(
            request.outputName || project.name,
            "package",
            request.versionedFileNames ? project.version : undefined,
            creatorPrefix,
          )}
        </span>
        {store.state.settings.creatorPrefix ? (
          <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-muted-foreground">
            <Checkbox checked={skipPrefix} onCheckedChange={(v) => setSkipPrefix(Boolean(v))} />
            Skip creator prefix for this export
          </label>
        ) : (
          <span className="ml-auto text-muted-foreground">
            Set a creator prefix in Settings to name files “Creator_ModTitle”.
          </span>
        )}
      </div>



      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Source" subtitle="Builder projects rebuild from your models; imported mods preserve their original resources.">
          <div className="space-y-1">
            <button
              onClick={() => setSourceId("builder")}
              className={cn("w-full rounded-md border px-3 py-2 text-left text-xs", sourceId === "builder" ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50")}
            >
              <span className="font-medium">{project.name}</span>
              <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">v{project.version}</span>
              <span className="block text-[11px] text-muted-foreground">Builder project</span>
            </button>
            {imports.map((i) => (
              <button
                key={i.project.id}
                onClick={() => setSourceId(i.project.id)}
                className={cn("w-full rounded-md border px-3 py-2 text-left text-xs", sourceId === i.project.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50")}
              >
                <span className="font-medium">{i.project.name}</span>
                <span className="block text-[11px] text-muted-foreground">
                  Imported · {i.project.components.length} components · {i.project.resources.length} resources
                </span>
              </button>
            ))}
            {!imports.length && (
              <p className="px-1 pt-1 text-[11px] text-muted-foreground">
                Imported mods appear here after you analyse them in the Mod Importer.
              </p>
            )}
          </div>
        </Card>

        <Card title="Export target">
          <div className="space-y-1">
            {TARGETS.map((t) => (
              <button
                key={t.value}
                onClick={() => patch({ exportType: t.value, onlyModified: t.value === "changed-components" })}
                className={cn("w-full rounded-md border px-3 py-2 text-left", request.exportType === t.value ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50")}
              >
                <span className="text-xs font-medium">{t.label}</span>
                <span className="block text-[11px] text-muted-foreground">{t.hint}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Export mode">
          <div className="space-y-1">
            {MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => patch({ mode: m.value })}
                className={cn("w-full rounded-md border px-3 py-2 text-left", request.mode === m.value ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50")}
              >
                <span className="text-xs font-medium">{m.label}</span>
                <span className="block text-[11px] text-muted-foreground">{m.hint}</span>
              </button>
            ))}
          </div>
          {request.mode === "rebuild" && imported && (
            <p className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[11px]">
              This imported mod contains resources the builder does not represent. Full Rebuild can drop them.
            </p>
          )}
        </Card>
      </div>

      {project ? <RebuildImportedPanel projectId={project.id} /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Included components">
          <div className="space-y-0.5">
            {components.map((c) => (
              <Row
                key={c.id}
                checked={!excluded.includes(c.id)}
                required={c.required}
                onChange={(v) => setExcluded((e) => (v ? e.filter((x) => x !== c.id) : [...e, c.id]))}
                label={c.label}
                hint={c.hint}
              />
            ))}
            <div className="mt-2 border-t border-border pt-2">
              <Row checked={request.includeDocumentation} onChange={(v) => patch({ includeDocumentation: v })} label="README.txt" hint="Installation notes and file list." />
              <Row checked={Boolean(request.includeManifest)} onChange={(v) => patch({ includeManifest: v })} label="manifest.json" hint="Machine readable component + checksum list." />
              <Row checked={request.includeProjectSource} onChange={(v) => patch({ includeProjectSource: v })} label="Builder project source" hint="Re-importable .ts4builder file." />
              <Row checked={request.includeOptionalAddons} onChange={(v) => patch({ includeOptionalAddons: v })} label="Optional add-ons" hint="Optional compatibility packages." />
              <Row
                checked={request.includeDependencies}
                onChange={(v) => patch({ includeDependencies: v })}
                label="Bundle dependency files"
                hint="Off by default — shared libraries are listed in dependencies.json instead of being redistributed."
              />
            </div>
          </div>
        </Card>

        <Card title="Validation summary" subtitle="Run an export or a validation report to populate this.">
          {!job ? (
            <p className="text-[11px] text-muted-foreground">No results yet.</p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  ["Blocking errors", errors.length, "text-destructive"],
                  ["Warnings", warnings.length, "text-amber-500"],
                  ["Notes", infos.length, "text-muted-foreground"],
                ].map(([label, value, tone]) => (
                  <div key={String(label)} className="rounded-md border border-border bg-background/60 p-2">
                    <div className={cn("text-lg font-semibold", tone as string)}>{value as number}</div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label as string}</div>
                  </div>
                ))}
              </div>
              <ul className="max-h-52 space-y-1 overflow-auto">
                {[...errors, ...warnings, ...infos].map((r) => (
                  <li key={r.id} className="flex items-start gap-1.5 rounded-md border border-border bg-background/50 px-2 py-1.5 text-[11px]">
                    {r.severity === "error" ? <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-destructive" /> : r.severity === "warning" ? <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" /> : <Info className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />}
                    <span>
                      <span className="font-mono text-[10px] text-muted-foreground">{r.code}</span> {r.message}
                      {r.canAutoFix && r.autoFixAction && <span className="block text-[10px] text-primary">Auto-fix: {r.autoFixAction}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {roundTrip && (
                <div className="rounded-md border border-border bg-background/50 p-2 text-[11px]">
                  <div className="mb-1 font-semibold">Round-trip report</div>
                  <div className="grid grid-cols-2 gap-x-3 font-mono text-[10px] text-muted-foreground">
                    <span>Preserved: {roundTrip.preservedResources}</span>
                    <span>Modified: {roundTrip.modifiedResources}</span>
                    <span>Added: {roundTrip.addedResources}</span>
                    <span>Removed: {roundTrip.removedResources}</span>
                    <span>Unsupported preserved: {roundTrip.unsupportedPreserved}</span>
                    <span>Package components: {roundTrip.packageComponents}</span>
                    <span>Scripts preserved: {roundTrip.scriptComponentsPreserved}</span>
                    <span>Hash mismatches: {roundTrip.hashMismatches.length}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {advanced && (
        <Card title="Advanced options" subtitle="Only shown in advanced interface mode.">
          <div className="grid gap-1 sm:grid-cols-2">
            <Row checked={request.preserveFolderStructure} onChange={(v) => patch({ preserveFolderStructure: v })} label="Preserve imported folder structure" />
            <Row checked={Boolean(request.versionedFileNames)} onChange={(v) => patch({ versionedFileNames: v })} label="Generate versioned filenames" hint={`e.g. ${versionedName(request.outputName || project.name, "package", project.version, creatorPrefix)}`} />
            <Row checked={Boolean(request.onlyModified)} onChange={(v) => patch({ onlyModified: v })} label="Export only modified components" />
            <Row
              checked={Boolean(request.allowTuningOnly)}
              onChange={(v) => patch({ allowTuningOnly: v })}
              label="Allow tuning-only package"
              hint={`Required to export builder content: this build has no SimData writer, so ${nonExportableKinds().join(", ")} resources ship without their SimData companion and the game may ignore them.`}
            />
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="text-[11px]">
              <span className="mb-1 block text-muted-foreground">Custom output name</span>
              <input
                value={request.outputName ?? ""}
                onChange={(e) => patch({ outputName: e.target.value })}
                placeholder={project.name}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              />
            </label>
            <label className="text-[11px]">
              <span className="mb-1 block text-muted-foreground">Conflict policy</span>
              <select
                value={request.conflictPolicy}
                onChange={(e) => patch({ conflictPolicy: e.target.value as ExportRequest["conflictPolicy"] })}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              >
                <option value="block">Block on conflicts</option>
                <option value="warn">Warn only</option>
                <option value="auto-fix-safe">Auto-fix safe conflicts</option>
              </select>
            </label>
          </div>
        </Card>
      )}

      <Card title="Export result" subtitle="Files are only listed once they have been reopened and verified.">
        {!job || job.status === "queued" ? (
          <p className="text-[11px] text-muted-foreground">Nothing exported yet.</p>
        ) : job.status === "failed" ? (
          <div className="space-y-2">
            {job.errors.map((e, i) => (
              <div key={i} className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px]">
                <div className="font-mono text-[10px] font-semibold text-destructive">{e.code}</div>
                <div>{e.message}</div>
                {e.stage && <div className="text-muted-foreground">Failed during: {e.stage}</div>}
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">No files were produced. Your project was not modified.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {job.outputFiles.map((f) => {
              const Icon = FILE_ICON[f.kind] ?? FileText;
              return (
                <div key={f.name} className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-2">
                  <Icon className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{f.name}</div>
                    <div className="truncate font-mono text-[10px] text-muted-foreground">
                      {f.kind} · {bytesLabel(f.size)} · {f.checksum.slice(0, 16)}… · {f.verbatim ? "preserved" : "rebuilt"}
                    </div>
                    {f.verifyNotes.length > 0 && <div className="text-[10px] text-amber-500">{f.verifyNotes.join(" ")}</div>}
                  </div>
                  {f.verified ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                  <Button size="sm" variant="outline" onClick={() => downloadExportedFile(f)}>
                    <Download className="mr-1 h-3 w-3" /> Download
                  </Button>
                </div>
              );
            })}
            <Button size="sm" variant="ghost" onClick={() => setShowReport((s) => !s)}>
              <FileText className="mr-1 h-3 w-3" /> {showReport ? "Hide" : "Show"} technical report
            </Button>
            {showReport && (
              <pre className="max-h-64 overflow-auto rounded-md border border-border bg-background/60 p-2 text-[10px] leading-relaxed">
                {job.logs.map((l) => `[${l.stage}] ${l.level.toUpperCase()} ${l.message}`).join("\n")}
              </pre>
            )}
          </div>
        )}
      </Card>

      {history.length > 0 && (
        <Card title="Export history" subtitle="Metadata only — generated binaries are never stored.">
          <ul className="space-y-1">
            {history.slice(0, 8).map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background/50 px-2 py-1.5 text-[11px]">
                <span className="font-mono text-[10px] text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</span>
                <span className="font-medium">{h.exportType}</span>
                <span className="text-muted-foreground">{h.exportMode}</span>
                {h.version && <span className="font-mono text-[10px]">v{h.version}</span>}
                <span className="ml-auto text-muted-foreground">
                  {h.outputFiles.length} file(s) · {h.warnings} warning(s) · {h.errors} error(s)
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
