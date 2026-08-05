import { useMemo, useRef, useState } from "react";
import {
  Boxes,
  FolderPlus,
  Folder,
  FolderOpen,
  Search,
  Upload,
  Grid3x3,
  List,
  Image as ImageIcon,
  FileAudio,
  FileText,
  FileCode2,
  Pencil,
  Trash2,
  Copy,
  Star,
  Tag,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import type { Asset, AssetKind } from "@/lib/types";

const KIND_META: Record<AssetKind, { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string }> = {
  icon: { icon: ImageIcon, color: "var(--pink)" },
  image: { icon: ImageIcon, color: "var(--pink)" },
  audio: { icon: FileAudio, color: "var(--orange)" },
  package: { icon: Boxes, color: "var(--blue)" },
  script: { icon: FileText, color: "var(--green)" },
  other: { icon: FileText, color: "var(--teal)" },
};

/** Sims 4 game files the app must accept alongside images/audio. */
export const GAME_FILE_ACCEPT = ".package,.ts4script,.py,.pyo,.pyc,.zip";

export function kindFromFile(name: string, mime: string): AssetKind {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "package") return "package";
  if (["ts4script", "py", "pyo", "pyc"].includes(ext)) return "script";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  return "other";
}


function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtWhen(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function AssetManager() {
  const store = useStore();
  const activeProject = store.state.projects.find((p) => p.id === store.state.activeProjectId);
  const projectAssets = useMemo(
    () => store.state.assets.filter((a) => a.projectId === activeProject?.id),
    [store.state.assets, activeProject?.id],
  );

  const folders = useMemo(() => {
    const set = new Set<string>();
    projectAssets.forEach((a) => set.add(a.folder || "/"));
    return Array.from(set).sort();
  }, [projectAssets]);

  const [activeFolder, setActiveFolder] = useState<string>("All");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projectAssets.filter((a) => {
      if (activeFolder !== "All" && (a.folder || "/") !== activeFolder) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        (a.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [projectAssets, activeFolder, query]);

  const active = projectAssets.find((a) => a.id === selected) ?? null;

  const addFolder = () => {
    if (!activeProject) return;
    const n = window.prompt("New folder path (e.g. Careers/Rewards):")?.trim();
    if (!n) return;
    setActiveFolder(n);
    toast.success(`Folder "${n}" ready — assets moved here will create it.`);
  };

  const renameFolder = () => {
    if (activeFolder === "All" || activeFolder === "/") return;
    const n = window.prompt("Rename folder", activeFolder)?.trim();
    if (!n || n === activeFolder) return;
    projectAssets
      .filter((a) => (a.folder || "/") === activeFolder)
      .forEach((a) => store.moveAsset(a.id, n));
    setActiveFolder(n);
    toast.success("Folder renamed");
  };

  const deleteFolder = () => {
    if (activeFolder === "All" || activeFolder === "/") return;
    if (!window.confirm(`Delete folder "${activeFolder}"? Assets will move to /.`)) return;
    projectAssets
      .filter((a) => (a.folder || "/") === activeFolder)
      .forEach((a) => store.moveAsset(a.id, "/"));
    setActiveFolder("All");
    toast.success("Folder emptied");
  };

  const onImport = async (files: FileList | null) => {
    if (!files || !activeProject) return;
    const MAX_INLINE = 8 * 1024 * 1024; // keep local storage sane for big .package files
    let linkedOnly = 0;
    for (const file of Array.from(files)) {
      const kind = kindFromFile(file.name, file.type);
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
        projectId: activeProject.id,
        name: file.name,
        folder: activeFolder === "All" ? "/" : activeFolder,
        kind,
        mimeType: file.type || (kind === "package" ? "application/x-sims4-package" : "application/octet-stream"),
        sizeBytes: file.size,
        dataUrl,
        filePath: file.name,
        source: "upload",
        tags: kind === "package" ? ["package"] : kind === "script" ? ["script"] : [],
      });
    }
    toast.success(`Imported ${files.length} file${files.length === 1 ? "" : "s"}`, {
      description: linkedOnly
        ? `${linkedOnly} large file${linkedOnly === 1 ? "" : "s"} referenced by name only (over 8 MB).`
        : undefined,
    });
  };


  if (!activeProject) {
    return (
      <div className="space-y-4">
        <Header title="Assets" subtitle="No project selected" onImport={() => {}} disabled />
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-10 text-center text-xs text-muted-foreground">
          Select or create a project to manage its assets.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Header
        title="Assets"
        subtitle={`Project · ${activeProject.name} · images, audio, .package & .ts4script`}
        view={view}
        onView={setView}
        onImport={() => fileRef.current?.click()}
      />
      <input
        ref={fileRef}
        type="file"
        multiple
        accept={`image/*,audio/*,${GAME_FILE_ACCEPT}`}
        className="hidden"
        onChange={(e) => { void onImport(e.target.files); e.target.value = ""; }}
      />


      <div className="grid grid-cols-12 gap-4">
        {/* Folders */}
        <aside className="col-span-12 rounded-xl border border-border bg-card p-3 card-elevated md:col-span-3 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Folders
            </div>
            <button
              onClick={addFolder}
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="New folder"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-0.5">
            <FolderRow name="All" label="All" count={projectAssets.length} active={activeFolder === "All"} onClick={() => setActiveFolder("All")} />
            {folders.map((f) => (
              <FolderRow
                key={f}
                name={f}
                label={f === "/" ? "(root)" : f}
                count={projectAssets.filter((a) => (a.folder || "/") === f).length}
                active={activeFolder === f}
                onClick={() => setActiveFolder(f)}
              />
            ))}
          </div>

          {activeFolder !== "All" && activeFolder !== "/" && (
            <div className="mt-3 flex gap-1 border-t border-border pt-2">
              <button
                onClick={renameFolder}
                className="flex-1 inline-flex items-center justify-center gap-1 rounded border border-border py-1 text-[10px] font-medium hover:bg-accent"
              >
                <Pencil className="h-3 w-3" /> Rename
              </button>
              <button
                onClick={deleteFolder}
                className="flex-1 inline-flex items-center justify-center gap-1 rounded border border-border py-1 text-[10px] font-medium text-[var(--red)] hover:bg-accent"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          )}
        </aside>

        {/* Assets */}
        <section className="col-span-12 rounded-xl border border-border bg-card p-4 card-elevated md:col-span-6 lg:col-span-7">
          <div className="mb-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search filenames & tags..."
                className="h-8 pl-7 text-xs"
              />
            </div>
            <div className="text-[10px] text-muted-foreground tabular-nums">
              {shown.length} of {projectAssets.length}
            </div>
          </div>

          {shown.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
              {projectAssets.length === 0
                ? "This project has no assets yet. Click Import to add images, audio, or files."
                : "No assets match this folder or search."}
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {shown.map((a) => (
                <AssetTile key={a.id} asset={a} selected={selected === a.id} onClick={() => setSelected(a.id)} />
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-background/60 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-semibold">Name</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Folder</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Size</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((a) => {
                    const meta = KIND_META[a.kind];
                    const Icon = meta.icon;
                    return (
                      <tr
                        key={a.id}
                        onClick={() => setSelected(a.id)}
                        className={cn(
                          "cursor-pointer border-t border-border/70",
                          selected === a.id ? "bg-[var(--blue)]/10" : "hover:bg-accent/50",
                        )}
                      >
                        <td className="flex items-center gap-2 px-2 py-1.5">
                          <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                          <span className="font-medium">{a.name}</span>
                          {a.favorite && <Star className="h-3 w-3 fill-[var(--orange)] text-[var(--orange)]" />}
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground">{a.folder || "/"}</td>
                        <td className="px-2 py-1.5 text-muted-foreground tabular-nums">{fmtSize(a.sizeBytes)}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{fmtWhen(a.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Inspector */}
        <aside className="col-span-12 rounded-xl border border-border bg-card p-4 card-elevated md:col-span-3">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Inspector
          </div>
          {!active ? (
            <div className="text-xs text-muted-foreground">Select an asset to inspect.</div>
          ) : (
            <div className="space-y-3">
              <div
                className="grid aspect-square w-full place-items-center overflow-hidden rounded-lg"
                style={{ backgroundColor: KIND_META[active.kind].color + "18" }}
              >
                {active.kind === "image" || active.kind === "icon" ? (
                  active.dataUrl ? (
                    <img src={active.dataUrl} alt={active.name} className="h-full w-full object-contain" />
                  ) : (
                    <ImageIcon className="h-10 w-10" style={{ color: KIND_META[active.kind].color }} />
                  )
                ) : (
                  (() => {
                    const Icon = KIND_META[active.kind].icon;
                    return <Icon className="h-10 w-10" style={{ color: KIND_META[active.kind].color }} />;
                  })()
                )}
              </div>
              <div>
                <div className="truncate text-sm font-semibold">{active.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {(active.folder || "/")} · {fmtSize(active.sizeBytes)} · {fmtWhen(active.createdAt)}
                </div>
              </div>
              {(active.tags?.length ?? 0) > 0 && (
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tags
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {active.tags!.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-1.5 py-0.5 text-[10px]"
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-1 border-t border-border pt-3">
                <button
                  onClick={() => store.updateAsset(active.id, { favorite: !active.favorite })}
                  className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] font-medium hover:bg-accent"
                >
                  <Star className="h-3 w-3" /> {active.favorite ? "Unfavorite" : "Favorite"}
                </button>
                <button
                  onClick={() => {
                    store.addAsset({
                      projectId: active.projectId!,
                      name: active.name.replace(/(\.[^.]+)?$/, " (copy)$1"),
                      folder: active.folder,
                      kind: active.kind,
                      mimeType: active.mimeType,
                      sizeBytes: active.sizeBytes,
                      dataUrl: active.dataUrl,
                      tags: active.tags,
                      source: active.source,
                    });
                    toast.success("Duplicated");
                  }}
                  className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] font-medium hover:bg-accent"
                >
                  <Copy className="h-3 w-3" /> Duplicate
                </button>
                <button
                  onClick={() => {
                    store.deleteAsset(active.id);
                    setSelected(null);
                    toast("Asset removed");
                  }}
                  className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] font-medium text-[var(--red)] hover:bg-accent"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Header({
  title, subtitle, view, onView, onImport, disabled,
}: {
  title: string;
  subtitle: string;
  view?: "grid" | "list";
  onView?: (v: "grid" | "list") => void;
  onImport: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--pink)] text-white shadow-sm">
          <Boxes className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {subtitle}
          </div>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {view && onView && (
          <div className="inline-flex overflow-hidden rounded-md border border-border">
            <button
              onClick={() => onView("grid")}
              className={cn("px-2 py-1.5 text-xs", view === "grid" ? "bg-accent" : "text-muted-foreground hover:bg-accent/60")}
              title="Grid"
            >
              <Grid3x3 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onView("list")}
              className={cn("px-2 py-1.5 text-xs", view === "list" ? "bg-accent" : "text-muted-foreground hover:bg-accent/60")}
              title="List"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <button
          onClick={onImport}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--blue)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" /> Import
        </button>
      </div>
    </div>
  );
}

function AssetTile({ asset, selected, onClick }: { asset: Asset; selected: boolean; onClick: () => void }) {
  const meta = KIND_META[asset.kind];
  const Icon = meta.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex flex-col items-start gap-2 rounded-lg border p-2.5 text-left transition-all",
        selected
          ? "border-[var(--blue)] bg-[var(--blue)]/5"
          : "border-border bg-background/40 hover:border-border/80 hover:bg-accent/40",
      )}
    >
      <div
        className="grid aspect-square w-full place-items-center overflow-hidden rounded-md"
        style={{ backgroundColor: meta.color + "18" }}
      >
        {(asset.kind === "image" || asset.kind === "icon") && asset.dataUrl ? (
          <img src={asset.dataUrl} alt={asset.name} className="h-full w-full object-contain" />
        ) : (
          <Icon className="h-7 w-7" style={{ color: meta.color }} />
        )}
      </div>
      <div className="w-full min-w-0">
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1 truncate text-[11px] font-semibold">{asset.name}</div>
          {asset.favorite && <Star className="h-3 w-3 fill-[var(--orange)] text-[var(--orange)]" />}
        </div>
        <div className="text-[10px] text-muted-foreground">{fmtSize(asset.sizeBytes)}</div>
      </div>
    </button>
  );
}

function FolderRow({
  name, label, count, active, onClick,
}: { name: string; label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      key={name}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors",
        active ? "bg-accent text-foreground" : "text-foreground/80 hover:bg-accent/60",
      )}
    >
      {active ? (
        <FolderOpen className="h-3.5 w-3.5 text-[var(--blue)]" />
      ) : (
        <Folder className="h-3.5 w-3.5 text-muted-foreground" />
      )}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="text-[10px] text-muted-foreground tabular-nums">{count}</span>
    </button>
  );
}
