/**
 * Sims 4 Mod Importer.
 *
 * One upload = one import session. Every file is analysed as a batch before any
 * mod project is created, so a .package and its companion .ts4script are
 * recognised as one mod instead of two unrelated imports.
 *
 * Nothing is uploaded anywhere — all parsing happens on this device.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileCode2,
  FileWarning,
  FolderInput,
  Info,
  Layers,
  Link2,
  Loader2,
  Package,
  ShieldCheck,
  Split,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { analyzeUpload, type UploadInput } from "@/lib/modimport/analyze";
import { downloadBytes, exportModProject, zipExport } from "@/lib/modimport/export";
import { registerImportedProject, unregisterImportedProject } from "@/lib/modexport/registry";
import {
  IMPORT_STAGES,
  type Confidence,
  type ImportSession,
  type ModComponent,
  type ModProject,
} from "@/lib/modimport/types";
import { buildImportFiles } from "@/lib/modimport/save-to-project";
import { useExplorer } from "@/lib/explorer";
import { useActiveProject } from "@/lib/store";
import { FolderTree } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPT = ".package,.ts4script,.zip,.py,.xml,.json,.txt,.md,.cfg,.png,.jpg,.jpeg,.webp,.dds";

const CONFIDENCE_STYLE: Record<Confidence, string> = {
  confirmed: "bg-[var(--green)]/15 text-[var(--green)] border-[var(--green)]/30",
  high: "bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/25",
  medium: "bg-[var(--orange)]/15 text-[var(--orange)] border-[var(--orange)]/30",
  low: "bg-destructive/10 text-destructive border-destructive/30",
  conflict: "bg-destructive/15 text-destructive border-destructive/40",
};

const STATUS_LABEL: Record<ModProject["importStatus"], string> = {
  uploading: "Uploading",
  analyzing: "Analyzing",
  "needs-review": "Needs review",
  ready: "Ready",
  "partially-supported": "Partially supported",
  failed: "Failed",
};

const bytesLabel = (n: number) =>
  n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : n > 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`;

const FILE_ICON: Record<string, typeof Package> = {
  package: Package,
  ts4script: FileCode2,
  archive: Boxes,
};

export function ModImporter() {
  const [session, setSession] = useState<ImportSession | null>(null);
  const [projects, setProjects] = useState<ModProject[]>([]);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const bytesRef = useRef<Map<string, Uint8Array>>(new Map());
  const ex = useExplorer();
  const activeProject = useActiveProject();

  /** Write an imported mod into the current project's assets so it can be
   *  opened and edited in the Project Explorer like any other file. */
  const saveToProject = useCallback(
    (project: ModProject) => {
      if (!activeProject) {
        toast.error("Open a project first", {
          description: "Imported files are saved into the assets of the project you have open.",
        });
        return;
      }
      ex.ensureScaffold(activeProject.id);
      const files = buildImportFiles(project, bytesRef.current);
      const byFolder = new Map<string, typeof files>();
      for (const f of files) {
        const key = f.folder.join("/");
        byFolder.set(key, [...(byFolder.get(key) ?? []), f]);
      }
      let saved = 0;
      for (const [key, group] of byFolder) {
        saved += ex.addFilesAtPath(
          activeProject.id,
          key.split("/"),
          group.map((f) => ({
            name: f.name,
            size: f.size,
            mimeType: f.mimeType,
            dataUrl: f.dataUrl,
            resourceKey: f.resourceKey,
          })),
        );
      }
      toast.success(`Saved ${saved} file${saved === 1 ? "" : "s"} to ${activeProject.name}`, {
        description: "Find them under Imported → " + project.name + " in the Project Explorer.",
      });
    },
    [activeProject, ex],
  );

  // Publish analysed mods to the Export Center (memory only).
  useEffect(() => {
    projects.forEach((p) => registerImportedProject(p, bytesRef.current));
    const ids = projects.map((p) => p.id);
    return () => ids.forEach(unregisterImportedProject);
  }, [projects]);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const folderInput = useRef<HTMLInputElement | null>(null);

  const run = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setBusy(true);
    setStage(IMPORT_STAGES[0]);
    try {
      const inputs: UploadInput[] = [];
      for (const file of files) {
        const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
        inputs.push({
          name: file.name,
          relativePath: rel && rel.length ? rel : file.name,
          bytes: new Uint8Array(await file.arrayBuffer()),
        });
      }
      const { session: result, bytes } = await analyzeUpload(inputs, (s) => setStage(s));
      bytesRef.current = bytes;
      setSession(result);
      setProjects(result.projects);
      const review = result.projects.filter((p) => p.importStatus === "needs-review").length;
      toast.success(
        `Analyzed ${result.files.length} file${result.files.length === 1 ? "" : "s"} into ${result.projects.length} mod${result.projects.length === 1 ? "" : "s"}`,
        review ? { description: `${review} need${review === 1 ? "s" : ""} your review before import.` } : undefined,
      );
    } catch (e) {
      toast.error("Import failed", { description: String((e as Error)?.message ?? e) });
    } finally {
      setBusy(false);
      setStage("");
    }
  }, []);

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    await run([...e.dataTransfer.files]);
  };

  const updateProject = (id: string, patch: Partial<ModProject>) =>
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const mergeProjects = (sourceId: string, targetId: string) => {
    setProjects((prev) => {
      const source = prev.find((p) => p.id === sourceId);
      const target = prev.find((p) => p.id === targetId);
      if (!source || !target || source === target) return prev;
      const merged: ModProject = {
        ...target,
        components: [...target.components, ...source.components.map((c) => ({ ...c, projectId: target.id }))],
        resources: [...target.resources, ...source.resources],
        dependencies: [...target.dependencies, ...source.dependencies],
        relationships: [...target.relationships, ...source.relationships],
        validationResults: [...target.validationResults, ...source.validationResults],
        groupingReasons: [...target.groupingReasons, `Merged with "${source.name}" by you`],
        confidence: "confirmed",
        importStatus: "ready",
      };
      return prev.filter((p) => p.id !== sourceId && p.id !== targetId).concat(merged);
    });
    toast.success("Mods merged into one project");
  };

  const splitComponent = (project: ModProject, component: ModComponent) => {
    setProjects((prev) => {
      const rest: ModProject = {
        ...project,
        components: project.components.filter((c) => c.id !== component.id),
        resources: project.resources.filter((r) => r.componentId !== component.id),
        relationships: project.relationships.filter(
          (r) => r.sourceComponentId !== component.id && r.targetComponentId !== component.id,
        ),
        groupingReasons: [...project.groupingReasons, `Split out "${component.originalFileName}" by you`],
      };
      const split: ModProject = {
        ...project,
        id: `${project.id}-split-${component.id}`,
        name: component.originalFileName.replace(/\.[^.]+$/, ""),
        components: [{ ...component, projectId: `${project.id}-split-${component.id}` }],
        resources: project.resources.filter((r) => r.componentId === component.id),
        relationships: [],
        dependencies: [],
        validationResults: [],
        groupingReasons: ["Separated from another mod by you"],
        confidence: "confirmed",
        importStatus: "ready",
      };
      return prev.flatMap((p) => (p.id === project.id ? [rest, split] : [p]));
    });
    toast.success("File separated into its own mod");
  };

  const doExport = async (project: ModProject) => {
    try {
      const report = await exportModProject(project, bytesRef.current);
      const zip = zipExport(project, report);
      downloadBytes(`${project.name.replace(/\s+/g, "_")}.zip`, zip, "application/zip");
      toast.success("Exported with original files preserved", {
        description: `${report.verbatimResources} resources copied unchanged, ${report.rewrittenResources} rebuilt.`,
      });
    } catch (e) {
      toast.error("Export failed", { description: String((e as Error)?.message ?? e) });
    }
  };

  const totals = useMemo(() => {
    const resources = projects.reduce((n, p) => n + p.resources.length, 0);
    const editable = projects.reduce(
      (n, p) => n + p.resources.filter((r) => r.editability === "editable").length,
      0,
    );
    return { resources, editable };
  }, [projects]);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold">
            <FolderInput className="h-5 w-5 text-[var(--orange)]" /> Mod Importer
          </h1>
          <p className="text-xs text-muted-foreground">
            Drop a mod folder, a .zip, or individual .package / .ts4script files. Companion files are
            detected and imported as one mod.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--green)]" /> Read on this device · scripts are never
          executed
        </div>
      </header>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          dragging ? "border-[var(--orange)] bg-[var(--orange)]/5" : "border-border bg-muted/20",
        )}
      >
        {busy ? (
          <div className="space-y-3">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--orange)]" />
            <div className="text-sm font-semibold">{stage}</div>
            <div className="mx-auto h-1.5 w-64 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-[var(--orange)] transition-all"
                style={{
                  width: `${((IMPORT_STAGES.indexOf(stage as never) + 1) / IMPORT_STAGES.length) * 100}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
            <div className="text-sm font-semibold">Drop mod files or a folder here</div>
            <div className="text-[11px] text-muted-foreground">
              .package · .ts4script · .zip · loose tuning, scripts and images
            </div>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => fileInput.current?.click()}
                className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent"
              >
                Choose files
              </button>
              <button
                onClick={() => folderInput.current?.click()}
                className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent"
              >
                Choose folder
              </button>
            </div>
          </div>
        )}
        <input
          ref={fileInput}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            void run([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
        <input
          ref={folderInput}
          type="file"
          multiple
          className="hidden"
          // @ts-expect-error non-standard but supported in Chromium/WebKit
          webkitdirectory=""
          onChange={(e) => {
            void run([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
      </div>

      {session && (
        <div className="grid grid-cols-4 gap-2">
          {[
            ["Files read", session.files.length],
            ["Mods detected", projects.length],
            ["Resources", totals.resources],
            ["Editable here", totals.editable],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border border-border bg-card p-3">
              <div className="text-lg font-bold tabular-nums">{value as number}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      )}

      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          others={projects.filter((p) => p.id !== project.id)}
          onRename={(name) => updateProject(project.id, { name })}
          onPatch={(patch) => updateProject(project.id, patch)}
          onSave={() => saveToProject(project)}

          onConfirm={() => updateProject(project.id, { importStatus: "ready", confidence: "confirmed" })}
          onMergeInto={(targetId) => mergeProjects(project.id, targetId)}
          onSplit={(component) => splitComponent(project, component)}
          onToggleExternal={(component) =>
            updateProject(project.id, {
              components: project.components.map((c) =>
                c.id === component.id ? { ...c, external: !c.external, role: c.external ? "tuning" : "dependency" } : c,
              ),
            })
          }
          onExport={() => void doExport(project)}
        />
      ))}

      {session && !projects.length && (
        <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No importable mod files were found in that upload.
        </div>
      )}

      {session?.warnings.length ? (
        <section className="rounded-lg border border-border bg-card p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Import warnings
          </div>
          <ul className="space-y-1.5">
            {session.warnings.map((w) => (
              <li key={w.id} className="flex items-start gap-2 text-xs">
                {w.level === "error" ? (
                  <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                ) : w.level === "warning" ? (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--orange)]" />
                ) : (
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span>
                  {w.message}
                  {w.detail ? <span className="text-muted-foreground"> — {w.detail}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function ProjectCard({
  project,
  others,
  onRename,
  onPatch,
  onSave,
  onConfirm,
  onMergeInto,
  onSplit,
  onToggleExternal,
  onExport,
}: {
  project: ModProject;
  others: ModProject[];
  onRename: (name: string) => void;
  onPatch: (patch: Partial<ModProject>) => void;
  onSave: () => void;
  onConfirm: () => void;
  onMergeInto: (targetId: string) => void;
  onSplit: (component: ModComponent) => void;
  onToggleExternal: (component: ModComponent) => void;
  onExport: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<"files" | "resources" | "relationships" | "checks">("files");

  const editable = project.resources.filter((r) => r.editability === "editable").length;
  const preserved = project.resources.filter((r) => r.editability === "read-only").length;
  const unknown = project.resources.filter((r) => r.editability === "preserved-unsupported").length;
  const coverage = project.resources.length
    ? Math.round(((editable + preserved) / project.resources.length) * 100)
    : 0;
  // Type breakdown of what is preserved, so "preserved" never reads as a gap.
  const preservedTypes = Object.entries(
    project.resources
      .filter((r) => r.editability === "read-only")
      .reduce<Record<string, number>>((acc, r) => {
        acc[r.typeLabel] = (acc[r.typeLabel] ?? 0) + 1;
        return acc;
      }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);


  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <button onClick={() => setOpen((v) => !v)} className="text-muted-foreground">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <input
          value={project.name}
          onChange={(e) => onRename(e.target.value)}
          className="min-w-40 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-bold hover:border-border focus:border-border focus:outline-none"
        />
        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase", CONFIDENCE_STYLE[project.confidence])}>
          {project.confidence}
        </span>
        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
          {STATUS_LABEL[project.importStatus]}
        </span>
        {project.importStatus === "needs-review" && (
          <button
            onClick={onConfirm}
            className="rounded-md bg-[var(--green)]/15 px-2 py-1 text-[11px] font-semibold text-[var(--green)] hover:bg-[var(--green)]/25"
          >
            Confirm grouping
          </button>
        )}
        <button
          onClick={onSave}
          className="flex items-center gap-1 rounded-md bg-[var(--teal)] px-2 py-1 text-[11px] font-semibold text-white hover:opacity-90"
        >
          <FolderTree className="h-3 w-3" /> Save to project
        </button>
        <button
          onClick={onExport}
          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-semibold hover:bg-accent"
        >
          <Download className="h-3 w-3" /> Export
        </button>
      </header>

      {open && (
        <div className="space-y-3 p-3">
          {/* Mod details — filled from the manifest when present, editable here. */}
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                ["Creator", "creator", "Your creator name"],
                ["Version", "version", "1.0.0"],
              ] as const
            ).map(([label, field, placeholder]) => (
              <label key={field} className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {label}
                </span>
                <input
                  value={project[field] ?? ""}
                  placeholder={placeholder}
                  onChange={(e) => onPatch({ [field]: e.target.value } as Partial<ModProject>)}
                  className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-[var(--teal)]"
                />
              </label>
            ))}
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </span>
              <input
                value={project.description ?? ""}
                placeholder="What this mod does"
                onChange={(e) => onPatch({ description: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-[var(--teal)]"
              />
            </label>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-2.5">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="font-semibold uppercase tracking-wider text-muted-foreground">
                Support coverage
              </span>
              <span className="tabular-nums font-semibold">{coverage}%</span>
              <span className="text-muted-foreground">
                {editable} editable · {preserved} preserved byte-for-byte
                {unknown ? ` · ${unknown} unknown` : ""}
              </span>
            </div>
            {project.importStatus !== "ready" && project.supportReasons?.length ? (
              <>
                <div className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Why it is “{STATUS_LABEL[project.importStatus]}”
                </div>
                <ul className="mt-1 space-y-0.5">
                  {project.supportReasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs">
                      <Info className="mt-0.5 h-3 w-3 shrink-0 text-[var(--orange)]" /> {r}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="mt-1 text-xs text-muted-foreground">
                Everything in this mod is either editable here or preserved byte-for-byte on export.
              </div>
            )}
          </div>


          <div className="rounded-lg border border-border bg-muted/30 p-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Why these files were grouped
            </div>
            <ul className="mt-1 space-y-0.5">
              {project.groupingReasons.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs">
                  <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[var(--green)]" /> {r}
                </li>
              ))}
            </ul>
            {others.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  defaultValue=""
                  onChange={(e) => e.target.value && onMergeInto(e.target.value)}
                  className="rounded-md border border-border bg-background px-2 py-1 text-[11px]"
                >
                  <option value="">Merge this mod into…</option>
                  {others.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-1 border-b border-border">
            {(["files", "resources", "relationships", "checks"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "-mb-px border-b-2 px-2.5 py-1.5 text-xs font-semibold capitalize",
                  tab === t
                    ? "border-[var(--orange)] text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
                {t === "checks" && project.validationResults.length ? ` (${project.validationResults.length})` : ""}
              </button>
            ))}
          </div>

          {tab === "files" && (
            <ul className="space-y-1.5">
              {project.components.map((c) => {
                const Icon = FILE_ICON[c.fileType] ?? FileCode2;
                return (
                  <li key={c.id} className="flex items-start gap-2 rounded-lg border border-border p-2.5">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--blue)]" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold">{c.originalFileName}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {c.fileType} · {c.role} · {bytesLabel(c.byteSize)} ·{" "}
                        {c.resources?.length ? `${c.resources.length} resources` : ""}
                        {c.modules?.length ? `${c.modules.length} modules` : ""}
                        {c.parseStatus === "corrupt" ? ` · unreadable: ${c.parseError ?? ""}` : ""}
                      </div>
                      {c.namespaces?.length ? (
                        <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {c.namespaces.join(" · ")}
                        </div>
                      ) : null}
                      {c.external && (
                        <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-[var(--blue)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--blue)]">
                          Shared library — kept as a dependency
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => onToggleExternal(c)}
                        title="Toggle shared-library classification"
                        className="rounded-md border border-border p-1 text-muted-foreground hover:bg-accent"
                      >
                        <Link2 className="h-3 w-3" />
                      </button>
                      {project.components.length > 1 && (
                        <button
                          onClick={() => onSplit(c)}
                          title="This file is a different mod"
                          className="rounded-md border border-border p-1 text-muted-foreground hover:bg-accent"
                        >
                          <Split className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
              {project.dependencies.length > 0 && (
                <li className="rounded-lg border border-border bg-muted/30 p-2.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Required separately
                  </div>
                  {project.dependencies.map((d) => (
                    <div key={d.id} className="mt-1 text-xs">
                      <span className="font-semibold">{d.name}</span>{" "}
                      <span className="text-muted-foreground">
                        — detected from {d.detectedFrom.replace("-", " ")} ({d.confidence} confidence)
                      </span>
                      {d.notes ? <div className="text-[11px] text-muted-foreground">{d.notes}</div> : null}
                    </div>
                  ))}
                </li>
              )}
            </ul>
          )}

          {tab === "resources" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-[var(--green)]" style={{ width: `${coverage}%` }} />
                </div>
                {coverage}% of resources can be edited here. The rest are preserved exactly on export.
              </div>
              <div className="max-h-80 overflow-auto rounded-lg border border-border">
                <table className="w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-muted/60 text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 font-semibold">Type</th>
                      <th className="px-2 py-1.5 font-semibold">Name</th>
                      <th className="px-2 py-1.5 font-mono font-semibold">Instance</th>
                      <th className="px-2 py-1.5 font-semibold">Size</th>
                      <th className="px-2 py-1.5 font-semibold">Editability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.resources.slice(0, 400).map((r) => (
                      <tr key={r.id} className="border-t border-border">
                        <td className="px-2 py-1">{r.typeLabel}</td>
                        <td className="max-w-56 truncate px-2 py-1">{r.name ?? r.subtype ?? "—"}</td>
                        <td className="px-2 py-1 font-mono text-[10px]">{r.key.instance}</td>
                        <td className="px-2 py-1 tabular-nums">{bytesLabel(r.byteSize)}</td>
                        <td className="px-2 py-1">
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                              r.editability === "editable"
                                ? "bg-[var(--green)]/15 text-[var(--green)]"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {r.editability.replace("-", " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {project.resources.length > 400 && (
                <div className="text-[11px] text-muted-foreground">
                  Showing the first 400 of {project.resources.length} resources.
                </div>
              )}
            </div>
          )}

          {tab === "relationships" && (
            <ul className="space-y-1.5">
              {project.relationships.length === 0 && (
                <li className="text-xs text-muted-foreground">No cross-file references were detected.</li>
              )}
              {project.relationships.slice(0, 200).map((rel) => {
                const source = project.components.find((c) => c.id === rel.sourceComponentId);
                const target = project.components.find((c) => c.id === rel.targetComponentId);
                return (
                  <li key={rel.id} className="rounded-lg border border-border p-2 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold">{source?.originalFileName ?? "project"}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-semibold">{target?.originalFileName ?? "external"}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                        {rel.relationshipType.replace("-", " ")}
                      </span>
                      <span className={cn("rounded border px-1.5 py-0.5 text-[10px]", CONFIDENCE_STYLE[rel.confidence])}>
                        {rel.confidence}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{rel.evidence.join(" · ")}</div>
                  </li>
                );
              })}
            </ul>
          )}

          {tab === "checks" && (
            <ul className="space-y-1.5">
              {project.validationResults.length === 0 && (
                <li className="flex items-center gap-1.5 text-xs text-[var(--green)]">
                  <CheckCircle2 className="h-3.5 w-3.5" /> No problems found.
                </li>
              )}
              {project.validationResults.map((v) => (
                <li key={v.id} className="flex items-start gap-2 rounded-lg border border-border p-2 text-xs">
                  {v.level === "error" ? (
                    <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                  ) : v.level === "warning" ? (
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--orange)]" />
                  ) : (
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span>
                    {v.message}
                    {v.suggestion ? (
                      <span className="block text-[11px] text-muted-foreground">{v.suggestion}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export function ImportEmptyHint() {
  return (
    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
      <Trash2 className="h-3 w-3" /> Import sessions are kept in memory only and clear when you reload.
    </div>
  );
}

export default ModImporter;
