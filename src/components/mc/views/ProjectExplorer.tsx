/**
 * Project Explorer — the file and asset manager for the active project.
 *
 * Everything here reads and writes the persisted explorer store
 * (src/lib/explorer.tsx). Items are addressed by stable IDs so builder
 * references survive renames and moves.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FolderTree, Folder, FolderOpen, File as FileIcon, FileImage, FileCode2, FileText, Package,
  ChevronRight, ChevronDown, Search, Plus, Upload, Copy, Scissors, ClipboardPaste, Pencil,
  Trash2, Download, ArrowRightLeft, LayoutGrid, List, ArrowUpDown, RotateCcw, RefreshCw,
  AlertTriangle, Home, X, Save, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useAppNavigation } from "@/lib/navigation";
import { requestRevealRecord, type BuilderKind } from "@/lib/builder-record";
import {
  useExplorer, sortItems, fileCategory, formatBytes, isPreviewableImage, isPreviewableText,
  readFilePayload, splitName, extensionOf,
  type ProjectExplorerItem, type SortKey,
} from "@/lib/explorer";

/* ------------------------- builder resolution -------------------------- */

const BUILDER_LABEL: Record<BuilderKind, string> = {
  career: "Career Builder",
  trait: "Trait Builder",
  aspiration: "Aspiration Builder",
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

export type BuilderTarget = { kind: BuilderKind; id?: string; label: string };

/**
 * Work out which builder (and which record) a file belongs to, so "Open"
 * can take the user straight there. Matches a saved record by name first,
 * then falls back to the folder the file lives in.
 */
function resolveBuilderTarget(
  item: ProjectExplorerItem,
  path: string,
  records: { kind: BuilderKind; id: string; name: string }[],
): BuilderTarget | null {
  if (item.itemType === "folder") {
    const p = norm(item.name);
    if (p.startsWith("career")) return { kind: "career", label: BUILDER_LABEL.career };
    if (p.startsWith("trait") || p.startsWith("buff")) return { kind: "trait", label: BUILDER_LABEL.trait };
    if (p.startsWith("aspiration")) return { kind: "aspiration", label: BUILDER_LABEL.aspiration };
    return null;
  }

  const base = norm(splitName(item.name).base);
  const hit = records.find((r) => norm(r.name) === base) ?? records.find((r) => base.includes(norm(r.name)) && norm(r.name).length > 3);
  if (hit) return { kind: hit.kind, id: hit.id, label: BUILDER_LABEL[hit.kind] };

  const p = norm(path);
  if (p.includes("career")) return { kind: "career", label: BUILDER_LABEL.career };
  if (p.includes("trait") || p.includes("buff")) return { kind: "trait", label: BUILDER_LABEL.trait };
  if (p.includes("aspiration")) return { kind: "aspiration", label: BUILDER_LABEL.aspiration };
  return null;
}


/* ------------------------------ helpers -------------------------------- */

function ItemIcon({ item, className }: { item: ProjectExplorerItem; className?: string }) {
  if (item.itemType === "folder") return <Folder className={cn("text-[var(--blue)]", className)} />;
  const e = extensionOf(item.name);
  if (isPreviewableImage(item)) return <FileImage className={cn("text-[var(--pink)]", className)} />;
  if (e === "package") return <Package className={cn("text-[var(--orange)]", className)} />;
  if (e === "ts4script" || e === "py") return <FileCode2 className={cn("text-[var(--green)]", className)} />;
  if (e === "xml" || e === "json") return <FileCode2 className={cn("text-[var(--teal)]", className)} />;
  if (isPreviewableText(item)) return <FileText className={cn("text-muted-foreground", className)} />;
  return <FileIcon className={cn("text-muted-foreground", className)} />;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function downloadItem(item: ProjectExplorerItem) {
  if (!item.dataUrl) {
    toast.error(`"${item.name}" has no stored contents to download.`);
    return;
  }
  const a = document.createElement("a");
  a.href = item.dataUrl;
  a.download = item.name;
  a.click();
  toast.success(`Downloading ${item.name}`);
}

function decodeText(dataUrl?: string): string {
  if (!dataUrl) return "";
  try {
    const [, payload = ""] = dataUrl.split(",");
    if (dataUrl.includes(";base64")) return decodeURIComponent(escape(atob(payload)));
    return decodeURIComponent(payload);
  } catch {
    return "";
  }
}

function encodeText(text: string, mimeType?: string): { dataUrl: string; size: number } {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { dataUrl: `data:${mimeType || "text/plain"};base64,${btoa(binary)}`, size: bytes.byteLength };
}

/* ------------------------------ view ----------------------------------- */

export function ProjectExplorer() {
  const store = useStore();
  const ex = useExplorer();
  const nav = useAppNavigation();
  const project = store.state.projects.find((p) => p.id === store.state.activeProjectId);
  const projectId = project?.id;

  const [cwd, setCwd] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [showTrash, setShowTrash] = useState(false);
  const [dragOver, setDragOver] = useState<string | null | "root">(null);
  const [deleteTarget, setDeleteTarget] = useState<string[] | null>(null);
  const [moveDialog, setMoveDialog] = useState<{ ids: string[] } | null>(null);
  const [projectDialog, setProjectDialog] = useState<{ ids: string[]; mode: "copy" | "move" } | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);

  /* Reset explorer state whenever the active project changes. */
  useEffect(() => {
    setCwd(null);
    setSelection([]);
    setExpanded({});
    setQuery("");
    setShowTrash(false);
    setRenaming(null);
  }, [projectId]);

  useEffect(() => {
    if (projectId && ex.hydrated) ex.ensureScaffold(projectId);
  }, [projectId, ex.hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const stored = useMemo(() => (projectId ? ex.listProject(projectId) : []), [ex, projectId]);
  const trashed = useMemo(() => (projectId ? ex.listTrash(projectId) : []), [ex, projectId]);

  /**
   * Records built in this project are surfaced as read-only virtual files so
   * the Explorer always reflects the current project's actual contents, not
   * just uploaded assets.
   */
  const virtualItems = useMemo(() => {
    if (!projectId) return [] as ProjectExplorerItem[];
    const groups: { folder: string; ext: string; rows: { id: string; name: string; updatedAt?: string; createdAt?: string }[] }[] = [
      { folder: "Careers", ext: "career", rows: store.state.careers.filter((c) => c.projectId === projectId) },
      { folder: "Traits", ext: "trait", rows: store.state.traits.filter((t) => t.projectId === projectId) },
      { folder: "Aspirations", ext: "aspiration", rows: store.state.aspirations.filter((a) => a.projectId === projectId) },
      { folder: "Notifications", ext: "notification", rows: store.state.notifications.filter((n) => n.projectId === projectId) },
    ];
    const out: ProjectExplorerItem[] = [];
    for (const g of groups) {
      if (!g.rows.length) continue;
      const folderId = `virtual:${projectId}:${g.folder}`;
      out.push({
        id: folderId,
        projectId,
        parentFolderId: null,
        itemType: "folder",
        name: g.folder,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      });
      for (const r of g.rows) {
        out.push({
          id: `virtual:${g.ext}:${r.id}`,
          projectId,
          parentFolderId: folderId,
          itemType: "file",
          name: `${r.name || "Untitled"}.${g.ext}`,
          extension: g.ext,
          createdAt: (r as { createdAt?: string }).createdAt ?? new Date().toISOString(),
          updatedAt: (r as { updatedAt?: string }).updatedAt ?? new Date().toISOString(),
          deletedAt: null,
        });
      }
    }
    return out;
  }, [projectId, store.state.careers, store.state.traits, store.state.aspirations, store.state.notifications]);

  const all = useMemo(() => [...virtualItems, ...stored], [virtualItems, stored]);


  const childrenOf = useCallback(
    (parent: string | null) => all.filter((i) => i.parentFolderId === parent),
    [all],
  );

  const pathOf = useCallback(
    (id: string) => {
      const parts: string[] = [];
      let cur: ProjectExplorerItem | undefined = all.find((i) => i.id === id);
      let guard = 0;
      while (cur && guard++ < 64) {
        parts.unshift(cur.name);
        cur = cur.parentFolderId ? all.find((i) => i.id === cur!.parentFolderId) : undefined;
      }
      return "/" + parts.join("/");
    },
    [all],
  );

  /** Builder records belonging to this project, for file → builder matching. */
  const builderRecords = useMemo(() => {
    const rows: { kind: BuilderKind; id: string; name: string }[] = [];
    for (const c of store.state.careers) if (c.projectId === projectId) rows.push({ kind: "career", id: c.id, name: c.name });
    for (const t of store.state.traits) if (t.projectId === projectId) rows.push({ kind: "trait", id: t.id, name: t.name });
    for (const a of store.state.aspirations) if (a.projectId === projectId) rows.push({ kind: "aspiration", id: a.id, name: a.name });
    return rows;
  }, [projectId, store.state.careers, store.state.traits, store.state.aspirations]);

  const builderTargetOf = useCallback(
    (item: ProjectExplorerItem) => resolveBuilderTarget(item, pathOf(item.id), builderRecords),
    [pathOf, builderRecords],
  );


  const breadcrumb = useMemo(() => {
    const chain: ProjectExplorerItem[] = [];
    let cur = cwd ? all.find((i) => i.id === cwd) : undefined;
    let guard = 0;
    while (cur && guard++ < 64) {
      chain.unshift(cur);
      cur = cur.parentFolderId ? all.find((i) => i.id === cur!.parentFolderId) : undefined;
    }
    return chain;
  }, [cwd, all]);

  const searching = query.trim().length > 0;
  const rows = useMemo(() => {
    if (showTrash) return sortItems(trashed.filter((i) => !i.parentFolderId || !trashed.some((p) => p.id === i.parentFolderId)), ex.prefs.sortKey, ex.prefs.sortDir);
    if (searching) {
      const q = query.trim().toLowerCase();
      return sortItems(
        all.filter(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            (i.extension ?? "").toLowerCase().includes(q) ||
            fileCategory(i).toLowerCase().includes(q),
        ),
        ex.prefs.sortKey,
        ex.prefs.sortDir,
      );
    }
    return sortItems(childrenOf(cwd), ex.prefs.sortKey, ex.prefs.sortDir);
  }, [showTrash, trashed, searching, query, all, childrenOf, cwd, ex.prefs.sortKey, ex.prefs.sortDir]);

  const selected = selection.map((id) => all.find((i) => i.id === id) ?? trashed.find((i) => i.id === id)).filter(Boolean) as ProjectExplorerItem[];
  const single = selected.length === 1 ? selected[0] : null;

  /* -------------------- reference safety -------------------- */
  const referencedIds = useMemo(() => {
    const blob = JSON.stringify({
      careers: store.state.careers,
      traits: store.state.traits,
      aspirations: store.state.aspirations,
      notifications: store.state.notifications,
      packModules: store.state.packModules,
      projects: store.state.projects,
    });
    return new Set(all.filter((i) => blob.includes(`file:${i.id}`)).map((i) => i.id));
  }, [store.state, all]);

  /* ------------------------- actions ------------------------- */

  const startRename = (id: string) => {
    const item = all.find((i) => i.id === id) ?? trashed.find((i) => i.id === id);
    if (!item) return;
    setRenaming(id);
    setRenameDraft(item.itemType === "file" ? splitName(item.name).base : item.name);
  };

  const commitRename = (next?: string) => {
    if (!renaming) return;
    const err = ex.rename(renaming, next ?? renameDraft);
    if (err) toast.error(err);
    else toast.success("Renamed");
    setRenaming(null);
  };

  const newFolder = (parent: string | null) => {
    if (!projectId) return;
    const created = ex.createFolder(projectId, parent, "New Folder");
    if (!created) {
      toast.error("Could not create folder.");
      return;
    }
    if (parent) setExpanded((s) => ({ ...s, [parent]: true }));
    setCwd(parent);
    setSelection([created.id]);
    setRenaming(created.id);
    setRenameDraft(created.name);
  };

  const uploadInto = useCallback(
    async (parent: string | null, files: FileList | File[]) => {
      if (!projectId) return;
      const list = Array.from(files);
      if (!list.length) return;
      const payloads = await Promise.all(list.map(readFilePayload));
      const created = ex.addFiles(projectId, parent, payloads);
      toast.success(`Added ${created.length} file${created.length === 1 ? "" : "s"} to ${parent ? pathOf(parent) : "project root"}`);
    },
    [projectId, ex, pathOf],
  );

  const doDelete = (ids: string[]) => {
    ex.trash(ids);
    setSelection([]);
    toast.success(`Moved ${ids.length} item${ids.length === 1 ? "" : "s"} to Trash`, {
      action: { label: "Undo", onClick: () => ex.restore(ids) },
    });
  };

  const requestDelete = (ids: string[]) => {
    if (!ids.length) return;
    const items = ids.map((id) => all.find((i) => i.id === id)).filter(Boolean) as ProjectExplorerItem[];
    const needsConfirm =
      ids.length > 1 ||
      items.some((i) => i.itemType === "folder") ||
      items.some((i) => referencedIds.has(i.id)) ||
      items.some((i) => ["package", "ts4script"].includes(extensionOf(i.name)));
    if (needsConfirm) setDeleteTarget(ids);
    else doDelete(ids);
  };

  const doCopy = (mode: "copy" | "cut") => {
    if (!projectId || !selection.length) return;
    ex.setClipboard({ mode, ids: selection, projectId });
    toast.message(`${mode === "copy" ? "Copied" : "Cut"} ${selection.length} item${selection.length === 1 ? "" : "s"}`);
  };

  const doPaste = () => {
    if (!projectId) return;
    const n = ex.paste(projectId, cwd);
    if (n > 0) toast.success(`Pasted ${n} item${n === 1 ? "" : "s"}`);
    else toast.error("Nothing to paste here.");
  };

  const doDuplicate = () => {
    if (!selection.length) return;
    const created = ex.duplicate(selection);
    toast.success(`Duplicated ${created.length} item${created.length === 1 ? "" : "s"}`);
  };

  /* keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA"].includes(t.tagName)) return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "c") { e.preventDefault(); doCopy("copy"); }
      else if (meta && e.key.toLowerCase() === "x") { e.preventDefault(); doCopy("cut"); }
      else if (meta && e.key.toLowerCase() === "v") { e.preventDefault(); doPaste(); }
      else if (meta && e.key.toLowerCase() === "d") { e.preventDefault(); doDuplicate(); }
      else if (e.key === "Delete" || e.key === "Backspace") { if (selection.length) { e.preventDefault(); requestDelete(selection); } }
      else if (e.key === "F2") { if (single) { e.preventDefault(); startRename(single.id); } }
      else if (e.key === "Enter") {
        if (single?.itemType === "folder") { e.preventDefault(); setCwd(single.id); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ------------------------- empty state ------------------------- */
  if (!project) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <FolderTree className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-lg font-bold">Project Explorer</h1>
        <p className="max-w-sm text-sm text-muted-foreground">Select or create a project to view its files.</p>
      </div>
    );
  }

  const clickItem = (e: React.MouseEvent, item: ProjectExplorerItem) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      setSelection((s) => (s.includes(item.id) ? s.filter((x) => x !== item.id) : [...s, item.id]));
    } else {
      setSelection([item.id]);
    }
  };

  /** Jump to the builder that owns this file (and select its record). */
  const openInBuilder = (item: ProjectExplorerItem, target: BuilderTarget) => {
    nav.navigate(target.kind);
    if (target.id) requestRevealRecord(target.kind, target.id);
    toast.success(
      target.id ? `Opened "${item.name}" in the ${target.label}` : `Opened the ${target.label}`,
    );
  };

  const openItem = (item: ProjectExplorerItem) => {
    if (item.itemType === "folder") {
      setCwd(item.id);
      setQuery("");
      setSelection([]);
      return;
    }
    const target = builderTargetOf(item);
    if (target?.id) {
      openInBuilder(item, target);
      return;
    }
    setSelection([item.id]);
  };


  const revealItem = (item: ProjectExplorerItem) => {
    setQuery("");
    setCwd(item.itemType === "folder" ? item.id : item.parentFolderId);
    setSelection([item.id]);
  };

  const folderTree = (parent: string | null, depth: number): React.ReactNode =>
    sortItems(childrenOf(parent).filter((i) => i.itemType === "folder"), "name", "asc").map((f) => {
      const open = expanded[f.id] ?? depth === 0;
      const kids = childrenOf(f.id).filter((i) => i.itemType === "folder");
      return (
        <div key={f.id}>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(f.id); }}
            onDragLeave={() => setDragOver((d) => (d === f.id ? null : d))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              if (e.dataTransfer.files.length) { void uploadInto(f.id, e.dataTransfer.files); return; }
              const ids = e.dataTransfer.getData("text/explorer-ids");
              if (ids) {
                const err = ex.move(JSON.parse(ids), f.id);
                if (err) toast.error(err); else toast.success("Moved");
              }
            }}
            className={cn(
              "flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs hover:bg-accent/60",
              cwd === f.id && "bg-accent text-foreground",
              dragOver === f.id && "ring-1 ring-[var(--teal)]",
            )}
            style={{ paddingLeft: 6 + depth * 12 }}
            onClick={() => { setCwd(f.id); setQuery(""); setShowTrash(false); }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded((s) => ({ ...s, [f.id]: !open })); }}
              className="shrink-0 text-muted-foreground"
            >
              {kids.length ? (open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />) : <span className="inline-block h-3 w-3" />}
            </button>
            {open ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-[var(--blue)]" /> : <Folder className="h-3.5 w-3.5 shrink-0 text-[var(--blue)]" />}
            <span className="truncate">{f.name}</span>
          </div>
          {open && folderTree(f.id, depth + 1)}
        </div>
      );
    });

  const toolbarBtn = (
    label: string,
    Icon: React.ComponentType<{ className?: string }>,
    onClick: () => void,
    disabled = false,
  ) => (
    <button
      key={label}
      onClick={onClick}
      disabled={disabled}
      title={label}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1.5 text-[11px] font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden xl:inline">{label}</span>
    </button>
  );

  return (
    <div className="space-y-4">
      <input
        ref={uploadRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files) void uploadInto(cwd, e.target.files); e.target.value = ""; }}
      />
      <input
        ref={replaceRef}
        type="file"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          const id = replaceTarget;
          e.target.value = "";
          if (!f || !id) return;
          const target = all.find((i) => i.id === id);
          const payload = await readFilePayload(f);
          if (target && extensionOf(target.name) !== extensionOf(f.name)) {
            toast.warning(`Replacement is a .${extensionOf(f.name)} file but the original is .${extensionOf(target.name)}.`);
          }
          ex.replaceFile(id, payload, true);
          setReplaceTarget(null);
          toast.success("File replaced — name and location kept");
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--blue)] text-white shadow-sm">
            <FolderTree className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Files & Assets</div>
            <h1 className="truncate text-xl font-bold tracking-tight">Project Explorer — {project.name}</h1>
          </div>
        </div>
        <button
          onClick={() => setShowTrash((s) => !s)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent",
            showTrash && "bg-accent",
          )}
        >
          <Trash2 className="h-3.5 w-3.5" /> Trash{trashed.length ? ` (${trashed.length})` : ""}
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5">
        {toolbarBtn(
          single && single.itemType === "file" && builderTargetOf(single)
            ? `Open in ${builderTargetOf(single)!.label}`
            : "Open",
          ExternalLink,
          () => {
            if (!single) return;
            if (single.itemType === "folder") { openItem(single); return; }
            const target = builderTargetOf(single);
            if (target) openInBuilder(single, target);
            else { setSelection([single.id]); toast.message(`"${single.name}" has no matching builder — showing its preview.`); }
          },
          !single || showTrash,
        )}
        {toolbarBtn("New Folder", Plus, () => newFolder(cwd), showTrash)}
        {toolbarBtn("Upload Files", Upload, () => uploadRef.current?.click(), showTrash)}
        <span className="mx-1 h-5 w-px bg-border" />
        {toolbarBtn("Copy", Copy, () => doCopy("copy"), !selection.length || showTrash)}
        {toolbarBtn("Cut", Scissors, () => doCopy("cut"), !selection.length || showTrash)}
        {toolbarBtn("Paste", ClipboardPaste, doPaste, !ex.clipboard || showTrash)}
        {toolbarBtn("Rename", Pencil, () => single && startRename(single.id), !single || showTrash)}
        {toolbarBtn("Delete", Trash2, () => requestDelete(selection), !selection.length || showTrash)}
        {toolbarBtn("Download", Download, () => single && downloadItem(single), !single || single.itemType === "folder")}
        {toolbarBtn("Copy to Project", ArrowRightLeft, () => setProjectDialog({ ids: selection, mode: "copy" }), !selection.length || showTrash)}
        <span className="mx-1 h-5 w-px bg-border" />
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowTrash(false); }}
            placeholder="Search files in this project..."
            className="h-8 pl-7 text-xs"
          />
        </div>
        <select
          value={`${ex.prefs.sortKey}:${ex.prefs.sortDir}`}
          onChange={(e) => {
            const [k, d] = e.target.value.split(":");
            ex.setPrefs({ sortKey: k as SortKey, sortDir: d as "asc" | "desc" });
          }}
          className="h-8 rounded-md border border-border bg-card px-2 text-[11px]"
          title="Sort"
        >
          <option value="name:asc">Name A–Z</option>
          <option value="name:desc">Name Z–A</option>
          <option value="type:asc">Type</option>
          <option value="size:desc">Size (largest)</option>
          <option value="size:asc">Size (smallest)</option>
          <option value="created:desc">Date added (newest)</option>
          <option value="modified:desc">Date modified (newest)</option>
        </select>
        <div className="flex overflow-hidden rounded-md border border-border">
          <button
            onClick={() => ex.setPrefs({ view: "list" })}
            className={cn("px-2 py-1.5", ex.prefs.view === "list" && "bg-accent")}
            title="List view"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => ex.setPrefs({ view: "grid" })}
            className={cn("px-2 py-1.5", ex.prefs.view === "grid" && "bg-accent")}
            title="Grid view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Folder tree */}
        <section className="col-span-12 rounded-xl border border-border bg-card p-2 card-elevated lg:col-span-3">
          <div
            onClick={() => { setCwd(null); setShowTrash(false); setQuery(""); }}
            onDragOver={(e) => { e.preventDefault(); setDragOver("root"); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              if (e.dataTransfer.files.length) { void uploadInto(null, e.dataTransfer.files); return; }
              const ids = e.dataTransfer.getData("text/explorer-ids");
              if (ids) {
                const err = ex.move(JSON.parse(ids), null);
                if (err) toast.error(err); else toast.success("Moved to project root");
              }
            }}
            className={cn(
              "mb-1 flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-semibold hover:bg-accent/60",
              cwd === null && !showTrash && "bg-accent",
              dragOver === "root" && "ring-1 ring-[var(--teal)]",
            )}
          >
            <Home className="h-3.5 w-3.5 text-[var(--teal)]" />
            <span className="truncate">{project.name}</span>
          </div>
          {folderTree(null, 0)}
          <button
            onClick={() => newFolder(cwd)}
            className="mt-2 inline-flex w-full items-center gap-1.5 rounded-md border border-dashed border-border px-2 py-1.5 text-[11px] text-muted-foreground hover:bg-accent"
          >
            <Plus className="h-3 w-3" /> New folder here
          </button>
        </section>

        {/* File area */}
        <section className="col-span-12 rounded-xl border border-border bg-card card-elevated lg:col-span-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 border-b border-border px-3 py-2 text-[11px] text-muted-foreground">
            <button className="hover:text-foreground" onClick={() => { setCwd(null); setShowTrash(false); }}>
              {project.name}
            </button>
            {showTrash && <><ChevronRight className="h-3 w-3" /><span className="text-foreground">Trash</span></>}
            {!showTrash && breadcrumb.map((b) => (
              <span key={b.id} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                <button className="hover:text-foreground" onClick={() => setCwd(b.id)}>{b.name}</button>
              </span>
            ))}
            {searching && <span className="ml-auto">Search results ({rows.length})</span>}
          </div>

          {showTrash && trashed.length > 0 && (
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-[11px] text-muted-foreground">Deleted items are kept here until you empty the Trash.</span>
              <button
                onClick={() => { if (projectId) { ex.emptyTrash(projectId); toast.success("Trash emptied"); } }}
                className="rounded-md border border-[var(--red)]/40 px-2 py-1 text-[11px] font-semibold text-[var(--red)] hover:bg-[var(--red)]/10"
              >
                Empty Trash
              </button>
            </div>
          )}

          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div
                className={cn("min-h-[420px] p-2", dragOver === (cwd ?? "root") && "bg-accent/40")}
                onClick={(e) => { if (e.target === e.currentTarget) setSelection([]); }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(cwd ?? "root"); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(null);
                  if (showTrash) return;
                  if (e.dataTransfer.files.length) { void uploadInto(cwd, e.dataTransfer.files); return; }
                  const ids = e.dataTransfer.getData("text/explorer-ids");
                  if (ids) {
                    const err = ex.move(JSON.parse(ids), cwd);
                    if (err) toast.error(err); else toast.success("Moved");
                  }
                }}
              >
                {rows.length === 0 && (
                  <div className="flex h-[380px] flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
                    <Upload className="h-6 w-6" />
                    {showTrash ? "Trash is empty." : "This folder is empty. Drag files here or use Upload Files."}
                  </div>
                )}

                {ex.prefs.view === "grid" ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                    {rows.map((item) => (
                      <ItemContextMenu
                        key={item.id}
                        item={item}
                        showTrash={showTrash}
                        onOpen={() => openItem(item)}
                        builderTarget={builderTargetOf(item)}
                        onOpenBuilder={() => { const t = builderTargetOf(item); if (t) openInBuilder(item, t); }}
                        onNewFolder={() => newFolder(item.itemType === "folder" ? item.id : cwd)}
                        onUpload={() => { setCwd(item.itemType === "folder" ? item.id : cwd); uploadRef.current?.click(); }}
                        onRename={() => startRename(item.id)}
                        onDownload={() => downloadItem(item)}
                        onReplace={() => { setReplaceTarget(item.id); replaceRef.current?.click(); }}
                        onDuplicate={() => { setSelection([item.id]); ex.duplicate([item.id]); toast.success("Duplicated"); }}
                        onCopy={() => { setSelection([item.id]); projectId && ex.setClipboard({ mode: "copy", ids: [item.id], projectId }); toast.message("Copied"); }}
                        onCut={() => { setSelection([item.id]); projectId && ex.setClipboard({ mode: "cut", ids: [item.id], projectId }); toast.message("Cut"); }}
                        onMove={() => setMoveDialog({ ids: selection.includes(item.id) ? selection : [item.id] })}
                        onCopyProject={() => setProjectDialog({ ids: selection.includes(item.id) ? selection : [item.id], mode: "copy" })}
                        onMoveProject={() => setProjectDialog({ ids: selection.includes(item.id) ? selection : [item.id], mode: "move" })}
                        onDelete={() => requestDelete(selection.includes(item.id) ? selection : [item.id])}
                        onRestore={() => { ex.restore([item.id]); toast.success("Restored"); }}
                        onPurge={() => { ex.purge([item.id]); toast.success("Permanently deleted"); }}
                        onDetails={() => setSelection([item.id])}
                      >
                        <div
                          draggable={!showTrash}
                          onDragStart={(e) => e.dataTransfer.setData("text/explorer-ids", JSON.stringify(selection.includes(item.id) ? selection : [item.id]))}
                          onDragOver={(e) => { if (item.itemType === "folder") { e.preventDefault(); setDragOver(item.id); } }}
                          onDrop={(e) => {
                            if (item.itemType !== "folder") return;
                            e.preventDefault(); e.stopPropagation(); setDragOver(null);
                            if (e.dataTransfer.files.length) { void uploadInto(item.id, e.dataTransfer.files); return; }
                            const ids = e.dataTransfer.getData("text/explorer-ids");
                            if (ids) { const err = ex.move(JSON.parse(ids), item.id); if (err) toast.error(err); else toast.success("Moved"); }
                          }}
                          onClick={(e) => clickItem(e, item)}
                          onDoubleClick={() => openItem(item)}
                          className={cn(
                            "flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-border p-3 text-center hover:bg-accent/50",
                            selection.includes(item.id) && "border-[var(--teal)] bg-accent",
                            dragOver === item.id && "ring-1 ring-[var(--teal)]",
                          )}
                        >
                          <div className="flex h-16 w-full items-center justify-center overflow-hidden rounded-md bg-muted/40">
                            {isPreviewableImage(item) && item.dataUrl ? (
                              <img src={item.dataUrl} alt={item.name} className="h-full w-full object-contain" />
                            ) : (
                              <ItemIcon item={item} className="h-7 w-7" />
                            )}
                          </div>
                          {renaming === item.id ? (
                            <RenameInput value={renameDraft} onChange={setRenameDraft} onCommit={(v) => commitRename(v)} onCancel={() => setRenaming(null)} />
                          ) : (
                            <span className="w-full truncate text-[11px] font-medium">{item.name}</span>
                          )}
                        </div>
                      </ItemContextMenu>
                    ))}
                  </div>
                ) : (
                  <div>
                    <div className="grid grid-cols-12 gap-2 border-b border-border px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <span className="col-span-6">Name</span>
                      <span className="col-span-2">Type</span>
                      <span className="col-span-2">Size</span>
                      <span className="col-span-2">Modified</span>
                    </div>
                    {rows.map((item) => (
                      <ItemContextMenu
                        key={item.id}
                        item={item}
                        showTrash={showTrash}
                        onOpen={() => openItem(item)}
                        builderTarget={builderTargetOf(item)}
                        onOpenBuilder={() => { const t = builderTargetOf(item); if (t) openInBuilder(item, t); }}
                        onNewFolder={() => newFolder(item.itemType === "folder" ? item.id : cwd)}
                        onUpload={() => { setCwd(item.itemType === "folder" ? item.id : cwd); uploadRef.current?.click(); }}
                        onRename={() => startRename(item.id)}
                        onDownload={() => downloadItem(item)}
                        onReplace={() => { setReplaceTarget(item.id); replaceRef.current?.click(); }}
                        onDuplicate={() => { ex.duplicate([item.id]); toast.success("Duplicated"); }}
                        onCopy={() => { setSelection([item.id]); projectId && ex.setClipboard({ mode: "copy", ids: [item.id], projectId }); toast.message("Copied"); }}
                        onCut={() => { setSelection([item.id]); projectId && ex.setClipboard({ mode: "cut", ids: [item.id], projectId }); toast.message("Cut"); }}
                        onMove={() => setMoveDialog({ ids: selection.includes(item.id) ? selection : [item.id] })}
                        onCopyProject={() => setProjectDialog({ ids: selection.includes(item.id) ? selection : [item.id], mode: "copy" })}
                        onMoveProject={() => setProjectDialog({ ids: selection.includes(item.id) ? selection : [item.id], mode: "move" })}
                        onDelete={() => requestDelete(selection.includes(item.id) ? selection : [item.id])}
                        onRestore={() => { ex.restore([item.id]); toast.success("Restored"); }}
                        onPurge={() => { ex.purge([item.id]); toast.success("Permanently deleted"); }}
                        onDetails={() => setSelection([item.id])}
                      >
                        <div
                          draggable={!showTrash}
                          onDragStart={(e) => e.dataTransfer.setData("text/explorer-ids", JSON.stringify(selection.includes(item.id) ? selection : [item.id]))}
                          onDragOver={(e) => { if (item.itemType === "folder") { e.preventDefault(); setDragOver(item.id); } }}
                          onDragLeave={() => setDragOver((d) => (d === item.id ? null : d))}
                          onDrop={(e) => {
                            if (item.itemType !== "folder") return;
                            e.preventDefault(); e.stopPropagation(); setDragOver(null);
                            if (e.dataTransfer.files.length) { void uploadInto(item.id, e.dataTransfer.files); return; }
                            const ids = e.dataTransfer.getData("text/explorer-ids");
                            if (ids) { const err = ex.move(JSON.parse(ids), item.id); if (err) toast.error(err); else toast.success("Moved"); }
                          }}
                          onClick={(e) => clickItem(e, item)}
                          onDoubleClick={() => (searching ? revealItem(item) : openItem(item))}
                          className={cn(
                            "grid cursor-pointer grid-cols-12 items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent/50",
                            selection.includes(item.id) && "bg-accent",
                            dragOver === item.id && "ring-1 ring-[var(--teal)]",
                          )}
                        >
                          <span className="col-span-6 flex min-w-0 items-center gap-2">
                            <ItemIcon item={item} className="h-4 w-4 shrink-0" />
                            {renaming === item.id ? (
                              <RenameInput value={renameDraft} onChange={setRenameDraft} onCommit={(v) => commitRename(v)} onCancel={() => setRenaming(null)} />
                            ) : (
                              <span className="min-w-0 truncate font-medium">
                                {item.name}
                                {searching && (
                                  <span className="ml-2 text-[10px] font-normal text-muted-foreground">{pathOf(item.id)}</span>
                                )}
                                {referencedIds.has(item.id) && (
                                  <span className="ml-2 rounded bg-[var(--teal)]/15 px-1 text-[9px] font-semibold text-[var(--teal)]">linked</span>
                                )}
                              </span>
                            )}
                          </span>
                          <span className="col-span-2 truncate text-[11px] text-muted-foreground">{fileCategory(item)}</span>
                          <span className="col-span-2 text-[11px] text-muted-foreground">{item.itemType === "folder" ? "—" : formatBytes(item.size)}</span>
                          <span className="col-span-2 truncate text-[11px] text-muted-foreground">{fmtDate(item.updatedAt)}</span>
                        </div>
                      </ItemContextMenu>
                    ))}
                  </div>
                )}
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-52">
              <ContextMenuItem onSelect={() => newFolder(cwd)}><Plus className="mr-2 h-3.5 w-3.5" /> New Folder</ContextMenuItem>
              <ContextMenuItem onSelect={() => uploadRef.current?.click()}><Upload className="mr-2 h-3.5 w-3.5" /> Upload Files</ContextMenuItem>
              <ContextMenuItem disabled={!ex.clipboard} onSelect={doPaste}><ClipboardPaste className="mr-2 h-3.5 w-3.5" /> Paste</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={() => { setSelection([]); toast.message("Refreshed"); }}><RefreshCw className="mr-2 h-3.5 w-3.5" /> Refresh</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </section>

        {/* Details panel */}
        <section className="col-span-12 rounded-xl border border-border bg-card p-3 card-elevated lg:col-span-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {selected.length > 1 ? `${selected.length} items selected` : "Details"}
          </div>
          {!single ? (
            <p className="text-xs text-muted-foreground">
              {selected.length > 1
                ? "Use the toolbar or right-click to move, copy, or delete the selected items."
                : "Select a file or folder to see its details."}
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex h-32 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40">
                {isPreviewableImage(single) && single.dataUrl ? (
                  <img src={single.dataUrl} alt={single.name} className="h-full w-full object-contain" />
                ) : (
                  <ItemIcon item={single} className="h-10 w-10" />
                )}
              </div>
              <div className="truncate text-sm font-semibold">{single.name}</div>
              <dl className="space-y-1 text-[11px]">
                <Row k="Type" v={fileCategory(single)} />
                <Row k="Size" v={single.itemType === "folder" ? `${ex.descendantsOf(single.id).length} items` : formatBytes(single.size)} />
                <Row k="Location" v={single.parentFolderId ? pathOf(single.parentFolderId) : "/"} />
                <Row k="Added" v={fmtDate(single.createdAt)} />
                <Row k="Modified" v={fmtDate(single.updatedAt)} />
                <Row k="Project" v={project.name} />
                <Row k="File ID" v={single.id.slice(0, 8)} />
              </dl>
              {referencedIds.has(single.id) && (
                <div className="flex items-start gap-1.5 rounded-md border border-[var(--teal)]/40 bg-[var(--teal)]/10 p-2 text-[11px] text-[var(--teal)]">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  This asset is used by the builder. Renaming and moving are safe; deleting will break the link.
                </div>
              )}
              {isPreviewableText(single) && single.dataUrl && (
                editing?.id === single.id ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={editing.text}
                      onChange={(e) => setEditing({ id: single.id, text: e.target.value })}
                      spellCheck={false}
                      className="h-48 w-full resize-y rounded-md border border-border bg-background p-2 font-mono text-[10px] leading-relaxed outline-none focus:border-[var(--teal)]"
                    />
                    <div className="flex gap-1.5">
                      <MiniBtn
                        onClick={() => {
                          const { dataUrl, size } = encodeText(editing.text, single.mimeType);
                          ex.replaceFile(single.id, { name: single.name, size, mimeType: single.mimeType, dataUrl }, true);
                          setEditing(null);
                          toast.success("Saved changes");
                        }}
                        icon={Save}
                        label="Save"
                      />
                      <MiniBtn onClick={() => setEditing(null)} icon={X} label="Cancel" />
                    </div>
                  </div>
                ) : (
                  <pre className="max-h-48 overflow-auto rounded-md border border-border bg-muted/40 p-2 text-[10px] leading-relaxed">
                    {decodeText(single.dataUrl).slice(0, 4000) || "(empty file)"}
                  </pre>
                )
              )}
              {!isPreviewableImage(single) && !isPreviewableText(single) && single.itemType === "file" && (
                <p className="text-[11px] text-muted-foreground">
                  No safe preview for this file type. Scripts and packages are never executed — download, rename, move, copy, or delete instead.
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {single.itemType === "file" && (
                  <>
                    <MiniBtn onClick={() => downloadItem(single)} icon={Download} label="Download" />
                    <MiniBtn onClick={() => { setReplaceTarget(single.id); replaceRef.current?.click(); }} icon={RefreshCw} label="Replace" />
                    {isPreviewableText(single) && editing?.id !== single.id && (
                      <MiniBtn
                        onClick={() => setEditing({ id: single.id, text: decodeText(single.dataUrl) })}
                        icon={Pencil}
                        label="Edit contents"
                      />
                    )}
                  </>
                )}
                <MiniBtn onClick={() => startRename(single.id)} icon={Pencil} label="Rename" />
                <MiniBtn onClick={() => setMoveDialog({ ids: [single.id] })} icon={ArrowRightLeft} label="Move" />
                {showTrash ? (
                  <MiniBtn onClick={() => { ex.restore([single.id]); toast.success("Restored"); }} icon={RotateCcw} label="Restore" />
                ) : (
                  <MiniBtn onClick={() => requestDelete([single.id])} icon={Trash2} label="Delete" />
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Trash?</DialogTitle>
            <DialogDescription>Deleted items go to this project's Trash and can be restored.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-xs">
            {(deleteTarget ?? []).map((id) => {
              const item = all.find((i) => i.id === id);
              if (!item) return null;
              const kids = item.itemType === "folder" ? ex.descendantsOf(item.id) : [];
              return (
                <div key={id} className="rounded-md border border-border p-2">
                  <div className="flex items-center gap-2 font-medium">
                    <ItemIcon item={item} className="h-4 w-4" /> {item.name}
                  </div>
                  {item.itemType === "folder" && (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Contains {kids.filter((k) => k.itemType === "file").length} file(s) and{" "}
                      {kids.filter((k) => k.itemType === "folder").length} folder(s) — all of them will be moved to Trash too.
                    </div>
                  )}
                  {["package", "ts4script"].includes(extensionOf(item.name)) && (
                    <div className="mt-1 text-[11px] text-[var(--orange)]">
                      Deleting this file may stop the mod from working correctly in-game.
                    </div>
                  )}
                  {referencedIds.has(item.id) && (
                    <div className="mt-1 text-[11px] text-[var(--red)]">
                      This asset is linked in the builder — the reference will break.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <button className="rounded-md border border-border px-3 py-1.5 text-xs" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button
              className="rounded-md bg-[var(--red)] px-3 py-1.5 text-xs font-semibold text-white"
              onClick={() => { doDelete(deleteTarget!); setDeleteTarget(null); }}
            >
              Move to Trash
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move dialog */}
      <Dialog open={!!moveDialog} onOpenChange={(o) => !o && setMoveDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Move items</DialogTitle></DialogHeader>
          <FolderChooser
            folders={all.filter((i) => i.itemType === "folder")}
            excludeIds={moveDialog?.ids ?? []}
            onPick={(dest) => {
              const err = ex.move(moveDialog!.ids, dest);
              if (err) toast.error(err);
              else toast.success("Moved");
              setMoveDialog(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Copy / Move to project */}
      <Dialog open={!!projectDialog} onOpenChange={(o) => !o && setProjectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{projectDialog?.mode === "move" ? "Move to another project" : "Copy to another project"}</DialogTitle>
            <DialogDescription>Only files and folders are transferred — builder data is untouched.</DialogDescription>
          </DialogHeader>
          <CrossProjectPicker
            projects={store.state.projects.filter((p) => p.id !== projectId).map((p) => ({ id: p.id, name: p.name }))}
            allItems={ex.items}
            onConfirm={(destProject, destFolder) => {
              const ids = projectDialog!.ids;
              const n =
                projectDialog!.mode === "move"
                  ? ex.moveToProject(ids, destProject, destFolder)
                  : ex.copyToProject(ids, destProject, destFolder);
              if (n > 0) {
                toast.success(`${projectDialog!.mode === "move" ? "Moved" : "Copied"} ${n} item${n === 1 ? "" : "s"} to the destination project`);
                setSelection([]);
              } else {
                toast.error("Nothing was transferred — the original files were kept.");
              }
              setProjectDialog(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* --------------------------- small pieces ------------------------------ */

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="max-w-[60%] truncate text-right font-medium">{v}</dd>
    </div>
  );
}

function MiniBtn({ onClick, icon: Icon, label }: { onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium hover:bg-accent">
      <Icon className="h-3 w-3" /> {label}
    </button>
  );
}

function RenameInput({
  value, onChange, onCommit, onCancel,
}: { value: string; onChange: (v: string) => void; onCommit: (v: string) => void; onCancel: () => void }) {
  // Uncontrolled on purpose: unrelated re-renders of the Explorer must not
  // clobber the caret position while the user is typing a name.
  const inputRef = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.value = value;
    el.focus();
    el.select();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onCommit(inputRef.current?.value ?? value);
  };
  return (
    <input
      ref={inputRef}
      defaultValue={value}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onBlur={finish}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") finish();
        if (e.key === "Escape") { done.current = true; onCancel(); }
      }}
      className="w-full rounded border border-[var(--teal)] bg-background px-1 py-0.5 text-[11px] outline-none"
    />
  );
}

function ItemContextMenu(props: {
  item: ProjectExplorerItem;
  showTrash: boolean;
  children: React.ReactNode;
  builderTarget?: BuilderTarget | null; onOpenBuilder?: () => void;
  onOpen: () => void; onNewFolder: () => void; onUpload: () => void; onRename: () => void;
  onDownload: () => void; onReplace: () => void; onDuplicate: () => void; onCopy: () => void;
  onCut: () => void; onMove: () => void; onCopyProject: () => void; onMoveProject: () => void;
  onDelete: () => void; onRestore: () => void; onPurge: () => void; onDetails: () => void;
}) {
  const isFolder = props.item.itemType === "folder";
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{props.children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        {props.showTrash ? (
          <>
            <ContextMenuItem onSelect={props.onRestore}><RotateCcw className="mr-2 h-3.5 w-3.5" /> Restore</ContextMenuItem>
            <ContextMenuItem className="text-[var(--red)]" onSelect={props.onPurge}><X className="mr-2 h-3.5 w-3.5" /> Delete permanently</ContextMenuItem>
          </>
        ) : (
          <>
            <ContextMenuItem onSelect={props.onOpen}>{isFolder ? "Open" : "Preview"}</ContextMenuItem>
            {props.builderTarget && props.onOpenBuilder && (
              <ContextMenuItem onSelect={props.onOpenBuilder}>
                <ExternalLink className="mr-2 h-3.5 w-3.5" /> Open in {props.builderTarget.label}
              </ContextMenuItem>
            )}
            {isFolder && <ContextMenuItem onSelect={props.onNewFolder}><Plus className="mr-2 h-3.5 w-3.5" /> New Folder</ContextMenuItem>}
            {isFolder && <ContextMenuItem onSelect={props.onUpload}><Upload className="mr-2 h-3.5 w-3.5" /> Upload Files</ContextMenuItem>}
            <ContextMenuItem onSelect={props.onRename}><Pencil className="mr-2 h-3.5 w-3.5" /> Rename</ContextMenuItem>
            {!isFolder && <ContextMenuItem onSelect={props.onDownload}><Download className="mr-2 h-3.5 w-3.5" /> Download</ContextMenuItem>}
            {!isFolder && <ContextMenuItem onSelect={props.onReplace}><RefreshCw className="mr-2 h-3.5 w-3.5" /> Replace</ContextMenuItem>}
            <ContextMenuItem onSelect={props.onDuplicate}><Copy className="mr-2 h-3.5 w-3.5" /> Duplicate</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={props.onCopy}><Copy className="mr-2 h-3.5 w-3.5" /> Copy</ContextMenuItem>
            <ContextMenuItem onSelect={props.onCut}><Scissors className="mr-2 h-3.5 w-3.5" /> Cut</ContextMenuItem>
            <ContextMenuItem onSelect={props.onMove}><ArrowRightLeft className="mr-2 h-3.5 w-3.5" /> Move…</ContextMenuItem>
            <ContextMenuItem onSelect={props.onCopyProject}>Copy to Project…</ContextMenuItem>
            <ContextMenuItem onSelect={props.onMoveProject}>Move to Project…</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={props.onDetails}>{isFolder ? "Folder Details" : "File Details"}</ContextMenuItem>
            <ContextMenuItem className="text-[var(--red)]" onSelect={props.onDelete}><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete</ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

function FolderChooser({
  folders, excludeIds, onPick,
}: { folders: ProjectExplorerItem[]; excludeIds: string[]; onPick: (dest: string | null) => void }) {
  const [dest, setDest] = useState<string | null>(null);
  const blocked = new Set(excludeIds);
  const options = folders.filter((f) => !blocked.has(f.id));
  const label = (f: ProjectExplorerItem) => {
    const parts: string[] = [];
    let cur: ProjectExplorerItem | undefined = f;
    let guard = 0;
    while (cur && guard++ < 32) {
      parts.unshift(cur.name);
      cur = cur.parentFolderId ? folders.find((x) => x.id === cur!.parentFolderId) : undefined;
    }
    return "/" + parts.join("/");
  };
  return (
    <div className="space-y-3">
      <select
        value={dest ?? ""}
        onChange={(e) => setDest(e.target.value || null)}
        className="h-9 w-full rounded-md border border-border bg-card px-2 text-xs"
      >
        <option value="">/ (project root)</option>
        {options.map((f) => (
          <option key={f.id} value={f.id}>{label(f)}</option>
        ))}
      </select>
      <DialogFooter>
        <button className="rounded-md bg-[var(--teal)] px-3 py-1.5 text-xs font-semibold text-white" onClick={() => onPick(dest)}>
          Move here
        </button>
      </DialogFooter>
    </div>
  );
}

function CrossProjectPicker({
  projects, allItems, onConfirm,
}: {
  projects: { id: string; name: string }[];
  allItems: ProjectExplorerItem[];
  onConfirm: (projectId: string, folderId: string | null) => void;
}) {
  const [pid, setPid] = useState(projects[0]?.id ?? "");
  const [fid, setFid] = useState<string | null>(null);
  const folders = allItems.filter((i) => i.projectId === pid && i.itemType === "folder" && !i.deletedAt);
  if (!projects.length) return <p className="text-xs text-muted-foreground">You have no other projects to transfer into.</p>;
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Destination project</label>
        <select value={pid} onChange={(e) => { setPid(e.target.value); setFid(null); }} className="h-9 w-full rounded-md border border-border bg-card px-2 text-xs">
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Destination folder</label>
        <select value={fid ?? ""} onChange={(e) => setFid(e.target.value || null)} className="h-9 w-full rounded-md border border-border bg-card px-2 text-xs">
          <option value="">/ (project root)</option>
          {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>
      <DialogFooter>
        <button className="rounded-md bg-[var(--teal)] px-3 py-1.5 text-xs font-semibold text-white" onClick={() => onConfirm(pid, fid)}>
          Confirm
        </button>
      </DialogFooter>
    </div>
  );
}
