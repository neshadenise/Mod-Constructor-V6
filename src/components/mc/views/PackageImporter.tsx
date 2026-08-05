import { useCallback, useMemo, useRef, useState } from "react";
import {
  FileJson,
  FolderInput,
  FolderPlus,
  Import,
  Layers,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore } from "@/lib/store";
import { useAppNavigation } from "@/lib/navigation";
import type { ProjectBundle } from "@/lib/types";
import { cn } from "@/lib/utils";

type Kind = "careers" | "traits" | "aspirations" | "notifications" | "assets" | "packModules";

const KINDS: { key: Kind; label: string }[] = [
  { key: "careers", label: "Careers" },
  { key: "traits", label: "Traits" },
  { key: "aspirations", label: "Aspirations" },
  { key: "notifications", label: "Notifications" },
  { key: "assets", label: "Assets" },
  { key: "packModules", label: "Pack modules" },
];

type Staged = { bundle: ProjectBundle; filename: string; size: number };

function countOf(b: ProjectBundle, k: Kind) {
  return ((b as unknown as Record<string, unknown[]>)[k] ?? []).length;
}

const BASE = { name: "Untitled", description: "", internalId: "" };

/** Fill required collections/strings that a partial bundle may omit. */
function normalize(kind: Kind, row: unknown): unknown {
  const r = { ...(row as Record<string, unknown>) };
  if (kind === "assets" || kind === "packModules") return r;
  for (const [k, v] of Object.entries(BASE)) if (typeof r[k] !== "string") r[k] = v;
  const arrays: Record<string, string[]> = {
    careers: ["branches", "ageGates", "messageOverrides", "workFromHomeEvents"],
    traits: ["buffs", "ageGates", "blockedAges", "blockedEmotions", "buffReplacements", "commodityWeights", "socialInteractions"],
    aspirations: ["milestones"],
    notifications: [],
  };
  for (const key of arrays[kind] ?? []) if (!Array.isArray(r[key])) r[key] = [];
  if (kind === "careers") {
    r.branches = (r.branches as Record<string, unknown>[]).map((b) => ({
      ...b,
      name: typeof b.name === "string" ? b.name : "Branch",
      levels: (Array.isArray(b.levels) ? b.levels : []).map((l) => {
        const lv = l as Record<string, unknown>;
        return {
          ...lv,
          title: typeof lv.title === "string" ? lv.title : "",
          salary: typeof lv.salary === "number" ? lv.salary : 0,
          workDays: Array.isArray(lv.workDays) ? lv.workDays : [],
        };
      }),
    }));
  }
  return r;
}

export function PackageImporter() {
  const store = useStore();
  const { navigate } = useAppNavigation();
  const projects = store.state.projects;
  const active = store.state.activeProjectId ?? projects[0]?.id ?? "";

  const [staged, setStaged] = useState<Staged[]>([]);
  const [dragging, setDragging] = useState(false);
  const [targetId, setTargetId] = useState<string>("");
  const [selected, setSelected] = useState<Record<Kind, boolean>>({
    careers: true,
    traits: true,
    aspirations: true,
    notifications: true,
    assets: true,
    packModules: true,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const target = targetId || active;

  const readFiles = useCallback(async (files: File[]) => {
    const next: Staged[] = [];
    const games: File[] = [];
    for (const file of files) {
      const ext = file.name.toLowerCase().split(".").pop() ?? "";
      if (["package", "ts4script", "py", "pyo", "pyc"].includes(ext)) {
        games.push(file);
        continue;
      }
      try {
        const bundle = JSON.parse(await file.text()) as ProjectBundle;
        if (!bundle?.project) throw new Error("Missing project data");
        next.push({ bundle, filename: file.name, size: file.size });
      } catch (e) {
        toast.error(`${file.name} is not a valid .mcbundle.json`, {
          description: String((e as Error)?.message ?? e),
        });
      }
    }
    if (games.length) {
      setGameFiles((prev) => [...games, ...prev]);
      toast.success(`Staged ${games.length} game file${games.length === 1 ? "" : "s"}`);
    }
    if (next.length) {
      setStaged((prev) => [...next, ...prev]);
      toast.success(`Staged ${next.length} package${next.length === 1 ? "" : "s"}`);
    }
  }, []);

  /** Store staged .package / .ts4script files as assets on the target project. */
  const importGameFiles = async (projectId: string) => {
    const MAX_INLINE = 8 * 1024 * 1024;
    let linkedOnly = 0;
    for (const file of gameFiles) {
      const isScript = !file.name.toLowerCase().endsWith(".package");
      const inline = file.size <= MAX_INLINE;
      if (!inline) linkedOnly++;
      const dataUrl = inline
        ? await new Promise<string>((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result));
            r.readAsDataURL(file);
          })
        : undefined;
      store.addAsset({
        projectId,
        name: file.name,
        folder: isScript ? "/Scripts" : "/Packages",
        kind: isScript ? "script" : "package",
        mimeType: file.type || (isScript ? "application/x-ts4script" : "application/x-sims4-package"),
        sizeBytes: file.size,
        dataUrl,
        filePath: file.name,
        source: "upload",
        tags: [isScript ? "script" : "package"],
      });
    }
    if (gameFiles.length) {
      toast.success(`Added ${gameFiles.length} game file${gameFiles.length === 1 ? "" : "s"}`, {
        description: linkedOnly
          ? `${linkedOnly} large file${linkedOnly === 1 ? "" : "s"} referenced by name only (over 8 MB).`
          : "Stored under /Packages and /Scripts in Assets.",
      });
      setGameFiles([]);
    }
  };


  const totals = useMemo(() => {
    const t: Record<Kind, number> = {
      careers: 0, traits: 0, aspirations: 0, notifications: 0, assets: 0, packModules: 0,
    };
    staged.forEach((s) => KINDS.forEach(({ key }) => { t[key] += countOf(s.bundle, key); }));
    return t;
  }, [staged]);

  const selectedTotal = KINDS.reduce((a, k) => a + (selected[k.key] ? totals[k.key] : 0), 0);

  /**
   * Strip out the categories the user unchecked and fill in any fields a
   * hand-edited bundle may be missing, so partial files can never break the
   * workspace after import.
   */
  const filtered = (b: ProjectBundle): ProjectBundle => {
    const out = { ...b } as unknown as Record<string, unknown[]>;
    KINDS.forEach(({ key }) => {
      out[key] = selected[key] ? (out[key] ?? []).map((r) => normalize(key, r)) : [];
    });
    return out as unknown as ProjectBundle;
  };

  const mergeAll = () => {
    if (!staged.length) return toast.error("Add a package file first");
    if (!projects.length) return toast.error("Create a project first");
    try {
      let total = 0;
      let name = "";
      staged.forEach((s) => {
        const { project, added } = store.mergeBundleIntoProject(filtered(s.bundle), target);
        total += Object.values(added).reduce((a, b) => a + b, 0);
        name = project.name;
      });
      toast.success(`Added ${total} item${total === 1 ? "" : "s"} to "${name}"`);
      setStaged([]);
      navigate("explorer");
    } catch (e) {
      toast.error(String((e as Error)?.message ?? e));
    }
  };

  const importAsNew = () => {
    if (!staged.length) return toast.error("Add a package file first");
    let last = "";
    staged.forEach((s) => {
      const p = store.importBundle(filtered(s.bundle));
      store.setActiveProject(p.id);
      last = p.name;
    });
    toast.success(`Imported "${last}" as a new project`);
    setStaged([]);
    navigate("projects");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Import className="h-3.5 w-3.5 text-[var(--teal)]" /> Local Workspace
          </div>
          <h1 className="text-xl font-bold tracking-tight">Package Importer</h1>
          <p className="text-xs text-muted-foreground">
            Bring <span className="font-mono">.mcbundle.json</span> packages into this workspace. Files
            are read on this device — nothing is uploaded.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("exporter")}>
          <Upload className="mr-1.5 h-3.5 w-3.5" /> Go to Exporter
        </Button>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void readFiles(Array.from(e.dataTransfer.files));
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors",
          dragging ? "border-[var(--teal)] bg-[var(--teal)]/10" : "border-border bg-muted/20 hover:bg-muted/40",
        )}
      >
        <Upload className="h-6 w-6 text-[var(--teal)]" />
        <div className="text-sm font-semibold">Drop package files here</div>
        <div className="text-[11px] text-muted-foreground">
          or click to browse · supports multiple .mcbundle.json files
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="application/json,.json,.mcbundle.json"
          className="hidden"
          onChange={(e) => {
            void readFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      {staged.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Staged packages ({staged.length})
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStaged([])}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear
              </Button>
            </div>
            {staged.map((s, i) => (
              <div key={`${s.filename}-${i}`} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-start gap-2">
                  <FileJson className="mt-0.5 h-4 w-4 text-[var(--blue)]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{s.bundle.project?.name ?? "Untitled"}</div>
                    <div className="truncate font-mono text-[10px] text-muted-foreground">
                      {s.filename} · {(s.size / 1024).toFixed(1)} KB · v{s.bundle.project?.version ?? "0.1.0"}
                    </div>
                  </div>
                  <button
                    onClick={() => setStaged((p) => p.filter((_, j) => j !== i))}
                    className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label="Remove package"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {KINDS.map(({ key, label }) => (
                    <div key={key} className="rounded-md border border-border bg-muted/30 px-2 py-1">
                      <div className="text-sm font-bold tabular-nums">{countOf(s.bundle, key)}</div>
                      <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Layers className="h-3.5 w-3.5" /> What to import
              </div>
              <div className="mt-2 space-y-1.5">
                {KINDS.map(({ key, label }) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2 text-xs">
                    <Checkbox
                      checked={selected[key]}
                      onCheckedChange={(v) => setSelected((p) => ({ ...p, [key]: Boolean(v) }))}
                    />
                    <span className="flex-1">{label}</span>
                    <span className="tabular-nums text-muted-foreground">{totals[key]}</span>
                  </label>
                ))}
              </div>
              <div className="mt-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
                {selectedTotal} item{selectedTotal === 1 ? "" : "s"} selected
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Destination
              </div>
              <select
                value={target}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.id === active ? "(active)" : ""}
                  </option>
                ))}
              </select>
              <Button className="w-full" size="sm" onClick={mergeAll} disabled={!projects.length}>
                <FolderInput className="mr-1.5 h-3.5 w-3.5" /> Add to selected project
              </Button>
              <Button className="w-full" size="sm" variant="outline" onClick={importAsNew}>
                <FolderPlus className="mr-1.5 h-3.5 w-3.5" /> Import as new project
              </Button>
              <p className="text-[10.5px] text-muted-foreground">
                Duplicate names are numbered automatically so nothing is overwritten.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PackageImporter;
