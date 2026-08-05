/**
 * Project Explorer file system.
 *
 * A per-project file/folder store. Every item belongs to exactly one project
 * and is addressed by a stable UUID (never by name or path), so renaming or
 * moving a file never breaks a builder reference.
 *
 * Persistence goes through the same StorageAdapter seam as the main store
 * (src/lib/storage-adapter.ts) under the "explorer" key, so a desktop build
 * can swap in real filesystem storage without touching UI code.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { localStorageAdapter, type StorageAdapter } from "./storage-adapter";

/* ------------------------------ Model --------------------------------- */

export interface ProjectExplorerItem {
  id: string;
  projectId: string;
  parentFolderId: string | null;

  itemType: "file" | "folder";

  name: string;
  extension?: string;
  mimeType?: string;

  /** Portable prototype storage. A desktop build swaps this for a real path. */
  storagePath?: string;
  dataUrl?: string;
  size?: number;

  createdAt: string;
  updatedAt: string;

  deletedAt?: string | null;
  originalParentFolderId?: string | null;
}

export type ExplorerView = "list" | "grid";
export type SortKey = "name" | "type" | "size" | "created" | "modified";
export type SortDir = "asc" | "desc";

export interface ExplorerPrefs {
  view: ExplorerView;
  sortKey: SortKey;
  sortDir: SortDir;
}

interface ExplorerData {
  version: 1;
  items: ProjectExplorerItem[];
  prefs: ExplorerPrefs;
  /** Projects that already received their starter folder scaffold. */
  seeded: string[];
}

const KEY = "explorer";

const defaultPrefs: ExplorerPrefs = { view: "list", sortKey: "name", sortDir: "asc" };

function uid(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function nowIso(): string {
  return new Date().toISOString();
}

/* --------------------------- Name helpers ------------------------------ */

const INVALID_NAME = /[\\/:*?"<>|]/;

export function splitName(name: string): { base: string; ext: string } {
  const i = name.lastIndexOf(".");
  if (i <= 0) return { base: name, ext: "" };
  return { base: name.slice(0, i), ext: name.slice(i) };
}

export function validateName(name: string, itemType: "file" | "folder"): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Name cannot be empty.";
  if (INVALID_NAME.test(trimmed)) return 'Name cannot contain \\ / : * ? " < > |';
  if (trimmed === "." || trimmed === "..") return "Reserved name.";
  if (trimmed.length > 120) return "Name is too long.";
  if (itemType === "folder" && trimmed.endsWith(".")) return "Folder names cannot end with a dot.";
  return null;
}

/** "career-icon.png" -> "career-icon copy.png" -> "career-icon copy 2.png" */
function uniqueName(
  desired: string,
  siblings: ProjectExplorerItem[],
  itemType: "file" | "folder",
  mode: "reject" | "copy" = "copy",
): string {
  const taken = new Set(siblings.map((s) => s.name.toLowerCase()));
  if (!taken.has(desired.toLowerCase())) return desired;
  const { base, ext } = itemType === "file" ? splitName(desired) : { base: desired, ext: "" };
  if (mode === "copy") {
    let candidate = `${base} copy${ext}`;
    let n = 2;
    while (taken.has(candidate.toLowerCase())) {
      candidate = `${base} copy ${n}${ext}`;
      n++;
    }
    return candidate;
  }
  let n = 2;
  let candidate = `${base} (${n})${ext}`;
  while (taken.has(candidate.toLowerCase())) {
    n++;
    candidate = `${base} (${n})${ext}`;
  }
  return candidate;
}

export function extensionOf(name: string): string {
  return splitName(name).ext.replace(/^\./, "").toLowerCase();
}

export const IMAGE_EXT = ["png", "jpg", "jpeg", "webp", "gif", "svg"];
export const TEXT_EXT = ["txt", "md", "json", "xml", "csv", "log", "cfg", "ini", "yaml", "yml"];

export function fileCategory(item: ProjectExplorerItem): string {
  if (item.itemType === "folder") return "Folder";
  const e = extensionOf(item.name);
  if (IMAGE_EXT.includes(e)) return "Image";
  if (e === "package") return "Package";
  if (e === "ts4script") return "Script bundle";
  if (e === "py") return "Python script";
  if (e === "xml") return "Tuning XML";
  if (e === "json") return "JSON";
  if (e === "md" || e === "txt") return "Document";
  if (TEXT_EXT.includes(e)) return "Text";
  return e ? `${e.toUpperCase()} file` : "File";
}

export function isPreviewableImage(item: ProjectExplorerItem): boolean {
  return item.itemType === "file" && IMAGE_EXT.includes(extensionOf(item.name));
}

export function isPreviewableText(item: ProjectExplorerItem): boolean {
  return item.itemType === "file" && TEXT_EXT.includes(extensionOf(item.name));
}

export function formatBytes(n?: number): string {
  if (!n && n !== 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/* ------------------------------- API ----------------------------------- */

export interface ClipboardState {
  mode: "copy" | "cut";
  ids: string[];
  projectId: string;
}

export interface ExplorerAPI {
  hydrated: boolean;
  items: ProjectExplorerItem[];
  prefs: ExplorerPrefs;
  clipboard: ClipboardState | null;

  /** Live (non-trashed) items for a project. */
  listProject: (projectId: string) => ProjectExplorerItem[];
  listTrash: (projectId: string) => ProjectExplorerItem[];
  childrenOf: (projectId: string, parentId: string | null) => ProjectExplorerItem[];
  getItem: (id: string) => ProjectExplorerItem | undefined;
  /** "/Images/career-icon.png" */
  pathOf: (id: string) => string;
  descendantsOf: (id: string) => ProjectExplorerItem[];

  ensureScaffold: (projectId: string) => void;

  createFolder: (projectId: string, parentFolderId: string | null, name?: string) => ProjectExplorerItem | null;
  addFiles: (
    projectId: string,
    parentFolderId: string | null,
    files: { name: string; size: number; mimeType?: string; dataUrl?: string }[],
  ) => ProjectExplorerItem[];
  replaceFile: (id: string, file: { name: string; size: number; mimeType?: string; dataUrl?: string }, keepName: boolean) => void;

  rename: (id: string, nextName: string) => string | null;
  move: (ids: string[], parentFolderId: string | null) => string | null;
  duplicate: (ids: string[]) => ProjectExplorerItem[];

  trash: (ids: string[]) => void;
  restore: (ids: string[]) => void;
  purge: (ids: string[]) => void;
  emptyTrash: (projectId: string) => void;

  copyToProject: (ids: string[], destProjectId: string, destParentId: string | null) => number;
  moveToProject: (ids: string[], destProjectId: string, destParentId: string | null) => number;

  setClipboard: (c: ClipboardState | null) => void;
  paste: (projectId: string, parentFolderId: string | null) => number;

  setPrefs: (patch: Partial<ExplorerPrefs>) => void;

  /** Wipe every item for a deleted project. */
  purgeProject: (projectId: string) => void;
}

const Ctx = createContext<ExplorerAPI | null>(null);

const SCAFFOLD = ["Packages", "Scripts", "Images", "Localization", "Documentation", "Other Assets"];

/** One-time repair: drop duplicate empty sibling folders sharing a name. */
function dedupeEmptyFolders(items: ProjectExplorerItem[]): ProjectExplorerItem[] {
  const seen = new Set<string>();
  const doomed = new Set<string>();
  for (const i of items) {
    if (i.itemType !== "folder" || i.deletedAt) continue;
    const key = `${i.projectId}|${i.parentFolderId ?? "root"}|${i.name.toLowerCase()}`;
    const hasChildren = items.some((c) => c.parentFolderId === i.id);
    if (seen.has(key) && !hasChildren) doomed.add(i.id);
    else seen.add(key);
  }
  return doomed.size ? items.filter((i) => !doomed.has(i.id)) : items;
}

export function ExplorerProvider({
  children,
  adapter = localStorageAdapter,
}: {
  children: React.ReactNode;
  adapter?: StorageAdapter;
}) {
  const [data, setData] = useState<ExplorerData>({ version: 1, items: [], prefs: defaultPrefs, seeded: [] });
  const [hydrated, setHydrated] = useState(false);
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const ref = useRef(data);
  ref.current = data;

  useEffect(() => {
    let alive = true;
    void (async () => {
      const saved = await adapter.read<ExplorerData>(KEY);
      if (!alive) return;
      if (saved && saved.version === 1) {
        setData({
          version: 1,
          items: dedupeEmptyFolders(saved.items ?? []),
          prefs: { ...defaultPrefs, ...(saved.prefs ?? {}) },
          seeded: saved.seeded ?? [],
        });
      }
      setHydrated(true);
    })();
    return () => {
      alive = false;
    };
  }, [adapter]);

  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => void adapter.write(KEY, data), 200);
    return () => clearTimeout(t);
  }, [data, hydrated, adapter]);

  const mutate = useCallback((fn: (d: ExplorerData) => ExplorerData) => setData((d) => fn(d)), []);

  const getItem = useCallback((id: string) => ref.current.items.find((i) => i.id === id), []);

  const listProject = useCallback(
    (projectId: string) => data.items.filter((i) => i.projectId === projectId && !i.deletedAt),
    [data.items],
  );

  const listTrash = useCallback(
    (projectId: string) => data.items.filter((i) => i.projectId === projectId && !!i.deletedAt),
    [data.items],
  );

  const childrenOf = useCallback(
    (projectId: string, parentId: string | null) =>
      data.items.filter((i) => i.projectId === projectId && !i.deletedAt && i.parentFolderId === parentId),
    [data.items],
  );

  const pathOf = useCallback((id: string) => {
    const all = ref.current.items;
    const parts: string[] = [];
    let cur = all.find((i) => i.id === id);
    let guard = 0;
    while (cur && guard++ < 64) {
      parts.unshift(cur.name);
      cur = cur.parentFolderId ? all.find((i) => i.id === cur!.parentFolderId) : undefined;
    }
    return "/" + parts.join("/");
  }, []);

  const descendantsOf = useCallback((id: string) => {
    const all = ref.current.items.filter((i) => !i.deletedAt);
    const out: ProjectExplorerItem[] = [];
    const walk = (pid: string) => {
      for (const child of all.filter((i) => i.parentFolderId === pid)) {
        out.push(child);
        if (child.itemType === "folder") walk(child.id);
      }
    };
    walk(id);
    return out;
  }, []);

  const ensureScaffold = useCallback(
    (projectId: string) => {
      // Computed inside `mutate` so double invocations (StrictMode, rapid
      // project switches) can never create duplicate scaffold folders.
      mutate((d) => {
        if (d.seeded.includes(projectId)) return d;
        const stamp = nowIso();
        const folders: ProjectExplorerItem[] = SCAFFOLD.filter(
          (n) =>
            !d.items.some(
              (i) =>
                i.projectId === projectId &&
                i.parentFolderId === null &&
                !i.deletedAt &&
                i.name.toLowerCase() === n.toLowerCase(),
            ),
        ).map((n) => ({
          id: uid(),
          projectId,
          parentFolderId: null,
          itemType: "folder" as const,
          name: n,
          createdAt: stamp,
          updatedAt: stamp,
          deletedAt: null,
        }));
        return { ...d, items: [...d.items, ...folders], seeded: [...d.seeded, projectId] };
      });
    },
    [mutate],
  );

  const createFolder = useCallback<ExplorerAPI["createFolder"]>(
    (projectId, parentFolderId, name = "New Folder") => {
      const err = validateName(name, "folder");
      if (err) return null;
      const siblings = ref.current.items.filter(
        (i) => i.projectId === projectId && !i.deletedAt && i.parentFolderId === parentFolderId,
      );
      const stamp = nowIso();
      const folder: ProjectExplorerItem = {
        id: uid(),
        projectId,
        parentFolderId,
        itemType: "folder",
        name: uniqueName(name.trim(), siblings, "folder", "reject"),
        createdAt: stamp,
        updatedAt: stamp,
        deletedAt: null,
      };
      mutate((s) => ({ ...s, items: [...s.items, folder] }));
      return folder;
    },
    [mutate],
  );

  const addFiles = useCallback<ExplorerAPI["addFiles"]>(
    (projectId, parentFolderId, files) => {
      const stamp = nowIso();
      const siblings = ref.current.items.filter(
        (i) => i.projectId === projectId && !i.deletedAt && i.parentFolderId === parentFolderId,
      );
      const running = [...siblings];
      const created = files.map((f) => {
        const name = uniqueName(f.name, running, "file", "reject");
        const item: ProjectExplorerItem = {
          id: uid(),
          projectId,
          parentFolderId,
          itemType: "file",
          name,
          extension: extensionOf(name) || undefined,
          mimeType: f.mimeType,
          dataUrl: f.dataUrl,
          storagePath: `project/${projectId}/${name}`,
          size: f.size,
          createdAt: stamp,
          updatedAt: stamp,
          deletedAt: null,
        };
        running.push(item);
        return item;
      });
      mutate((s) => ({ ...s, items: [...s.items, ...created] }));
      return created;
    },
    [mutate],
  );

  const replaceFile = useCallback<ExplorerAPI["replaceFile"]>(
    (id, file, keepName) => {
      mutate((s) => ({
        ...s,
        items: s.items.map((i) =>
          i.id === id
            ? {
                ...i,
                name: keepName ? i.name : file.name,
                extension: keepName ? i.extension : extensionOf(file.name) || undefined,
                mimeType: file.mimeType ?? i.mimeType,
                dataUrl: file.dataUrl,
                size: file.size,
                updatedAt: nowIso(),
              }
            : i,
        ),
      }));
    },
    [mutate],
  );

  const rename = useCallback<ExplorerAPI["rename"]>(
    (id, nextName) => {
      const item = ref.current.items.find((i) => i.id === id);
      if (!item) return "Item not found.";
      // Files keep their extension unless the user typed a new one.
      let finalName = nextName.trim();
      if (item.itemType === "file") {
        const currentExt = splitName(item.name).ext;
        const typedExt = splitName(finalName).ext;
        if (!typedExt && currentExt) finalName = `${finalName}${currentExt}`;
      }
      const err = validateName(finalName, item.itemType);
      if (err) return err;
      const dupe = ref.current.items.some(
        (i) =>
          i.id !== id &&
          i.projectId === item.projectId &&
          !i.deletedAt &&
          i.parentFolderId === item.parentFolderId &&
          i.name.toLowerCase() === finalName.toLowerCase(),
      );
      if (dupe) return "An item with that name already exists in this folder.";
      mutate((s) => ({
        ...s,
        items: s.items.map((i) =>
          i.id === id
            ? {
                ...i,
                name: finalName,
                extension: i.itemType === "file" ? extensionOf(finalName) || undefined : undefined,
                updatedAt: nowIso(),
              }
            : i,
        ),
      }));
      return null;
    },
    [mutate],
  );

  const isAncestor = useCallback((maybeAncestor: string, nodeId: string | null): boolean => {
    const all = ref.current.items;
    let cur = nodeId ? all.find((i) => i.id === nodeId) : undefined;
    let guard = 0;
    while (cur && guard++ < 64) {
      if (cur.id === maybeAncestor) return true;
      cur = cur.parentFolderId ? all.find((i) => i.id === cur!.parentFolderId) : undefined;
    }
    return false;
  }, []);

  const move = useCallback<ExplorerAPI["move"]>(
    (ids, parentFolderId) => {
      const all = ref.current.items;
      for (const id of ids) {
        const item = all.find((i) => i.id === id);
        if (!item) continue;
        if (id === parentFolderId) return "A folder cannot be moved into itself.";
        if (item.itemType === "folder" && isAncestor(id, parentFolderId)) {
          return "A folder cannot be moved into one of its own subfolders.";
        }
        if (parentFolderId) {
          const dest = all.find((i) => i.id === parentFolderId);
          if (!dest || dest.itemType !== "folder") return "Destination is not a folder.";
          if (dest.projectId !== item.projectId) return "Use Move to Project to move across projects.";
        }
      }
      const stamp = nowIso();
      mutate((s) => {
        let items = s.items;
        for (const id of ids) {
          const item = items.find((i) => i.id === id);
          if (!item || item.parentFolderId === parentFolderId) continue;
          const siblings = items.filter(
            (i) => i.projectId === item.projectId && !i.deletedAt && i.parentFolderId === parentFolderId && i.id !== id,
          );
          const name = uniqueName(item.name, siblings, item.itemType, "reject");
          items = items.map((i) => (i.id === id ? { ...i, parentFolderId, name, updatedAt: stamp } : i));
        }
        return { ...s, items };
      });
      return null;
    },
    [mutate, isAncestor],
  );

  /** Deep clone a subtree into a target project/parent. */
  const cloneTree = useCallback(
    (
      sourceItems: ProjectExplorerItem[],
      rootIds: string[],
      destProjectId: string,
      destParentId: string | null,
      destSiblings: ProjectExplorerItem[],
      nameMode: "copy" | "reject",
    ): ProjectExplorerItem[] => {
      const stamp = nowIso();
      const out: ProjectExplorerItem[] = [];
      const running = [...destSiblings];
      const cloneOne = (item: ProjectExplorerItem, parentId: string | null, siblings: ProjectExplorerItem[]) => {
        const name = uniqueName(item.name, siblings, item.itemType, nameMode);
        const copy: ProjectExplorerItem = {
          ...item,
          id: uid(),
          projectId: destProjectId,
          parentFolderId: parentId,
          name,
          createdAt: stamp,
          updatedAt: stamp,
          deletedAt: null,
          originalParentFolderId: null,
        };
        out.push(copy);
        siblings.push(copy);
        if (item.itemType === "folder") {
          const kids = sourceItems.filter((i) => i.parentFolderId === item.id && !i.deletedAt);
          const childSiblings: ProjectExplorerItem[] = [];
          kids.forEach((k) => cloneOne(k, copy.id, childSiblings));
        }
      };
      rootIds.forEach((id) => {
        const item = sourceItems.find((i) => i.id === id);
        if (item) cloneOne(item, destParentId, running);
      });
      return out;
    },
    [],
  );

  const duplicate = useCallback<ExplorerAPI["duplicate"]>(
    (ids) => {
      const all = ref.current.items;
      const created: ProjectExplorerItem[] = [];
      mutate((s) => {
        let items = s.items;
        for (const id of ids) {
          const item = all.find((i) => i.id === id);
          if (!item) continue;
          const siblings = items.filter(
            (i) => i.projectId === item.projectId && !i.deletedAt && i.parentFolderId === item.parentFolderId,
          );
          const clones = cloneTree(items, [id], item.projectId, item.parentFolderId, siblings, "copy");
          created.push(...clones);
          items = [...items, ...clones];
        }
        return { ...s, items };
      });
      return created;
    },
    [mutate, cloneTree],
  );

  const trash = useCallback<ExplorerAPI["trash"]>(
    (ids) => {
      const stamp = nowIso();
      mutate((s) => {
        const doomed = new Set<string>();
        const collect = (id: string) => {
          doomed.add(id);
          s.items.filter((i) => i.parentFolderId === id && !i.deletedAt).forEach((c) => collect(c.id));
        };
        ids.forEach(collect);
        return {
          ...s,
          items: s.items.map((i) =>
            doomed.has(i.id)
              ? {
                  ...i,
                  deletedAt: stamp,
                  originalParentFolderId: i.parentFolderId,
                  updatedAt: stamp,
                }
              : i,
          ),
        };
      });
    },
    [mutate],
  );

  const restore = useCallback<ExplorerAPI["restore"]>(
    (ids) => {
      const stamp = nowIso();
      mutate((s) => {
        const revived = new Set<string>();
        const collect = (id: string) => {
          revived.add(id);
          s.items.filter((i) => i.parentFolderId === id && i.deletedAt).forEach((c) => collect(c.id));
        };
        ids.forEach(collect);
        const liveIds = new Set(s.items.filter((i) => !i.deletedAt).map((i) => i.id));
        return {
          ...s,
          items: s.items.map((i) => {
            if (!revived.has(i.id)) return i;
            const parent = i.originalParentFolderId ?? i.parentFolderId;
            const parentOk = parent === null || liveIds.has(parent) || revived.has(parent);
            return {
              ...i,
              deletedAt: null,
              parentFolderId: parentOk ? parent : null,
              originalParentFolderId: null,
              updatedAt: stamp,
            };
          }),
        };
      });
    },
    [mutate],
  );

  const purge = useCallback<ExplorerAPI["purge"]>(
    (ids) => {
      mutate((s) => {
        const doomed = new Set<string>();
        const collect = (id: string) => {
          doomed.add(id);
          s.items.filter((i) => i.parentFolderId === id).forEach((c) => collect(c.id));
        };
        ids.forEach(collect);
        return { ...s, items: s.items.filter((i) => !doomed.has(i.id)) };
      });
    },
    [mutate],
  );

  const emptyTrash = useCallback<ExplorerAPI["emptyTrash"]>(
    (projectId) => {
      mutate((s) => ({ ...s, items: s.items.filter((i) => !(i.projectId === projectId && i.deletedAt)) }));
    },
    [mutate],
  );

  const copyToProject = useCallback<ExplorerAPI["copyToProject"]>(
    (ids, destProjectId, destParentId) => {
      let count = 0;
      mutate((s) => {
        const siblings = s.items.filter(
          (i) => i.projectId === destProjectId && !i.deletedAt && i.parentFolderId === destParentId,
        );
        const clones = cloneTree(s.items, ids, destProjectId, destParentId, siblings, "reject");
        count = clones.length;
        return { ...s, items: [...s.items, ...clones], seeded: s.seeded.includes(destProjectId) ? s.seeded : [...s.seeded, destProjectId] };
      });
      return count;
    },
    [mutate, cloneTree],
  );

  const moveToProject = useCallback<ExplorerAPI["moveToProject"]>(
    (ids, destProjectId, destParentId) => {
      let count = 0;
      mutate((s) => {
        const siblings = s.items.filter(
          (i) => i.projectId === destProjectId && !i.deletedAt && i.parentFolderId === destParentId,
        );
        const clones = cloneTree(s.items, ids, destProjectId, destParentId, siblings, "reject");
        if (clones.length === 0) return s; // copy failed -> keep source intact
        count = clones.length;
        const doomed = new Set<string>();
        const collect = (id: string) => {
          doomed.add(id);
          s.items.filter((i) => i.parentFolderId === id).forEach((c) => collect(c.id));
        };
        ids.forEach(collect);
        return {
          ...s,
          items: [...s.items.filter((i) => !doomed.has(i.id)), ...clones],
          seeded: s.seeded.includes(destProjectId) ? s.seeded : [...s.seeded, destProjectId],
        };
      });
      return count;
    },
    [mutate, cloneTree],
  );

  const paste = useCallback<ExplorerAPI["paste"]>(
    (projectId, parentFolderId) => {
      const cb = clipboard;
      if (!cb || cb.ids.length === 0) return 0;
      if (cb.mode === "copy") {
        if (cb.projectId === projectId) {
          let n = 0;
          mutate((s) => {
            const siblings = s.items.filter(
              (i) => i.projectId === projectId && !i.deletedAt && i.parentFolderId === parentFolderId,
            );
            const clones = cloneTree(s.items, cb.ids, projectId, parentFolderId, siblings, "copy");
            n = clones.length;
            return { ...s, items: [...s.items, ...clones] };
          });
          return n;
        }
        return copyToProject(cb.ids, projectId, parentFolderId);
      }
      // cut
      if (cb.projectId === projectId) {
        const err = move(cb.ids, parentFolderId);
        setClipboard(null);
        return err ? 0 : cb.ids.length;
      }
      const n = moveToProject(cb.ids, projectId, parentFolderId);
      setClipboard(null);
      return n;
    },
    [clipboard, mutate, cloneTree, copyToProject, move, moveToProject],
  );

  const setPrefs = useCallback<ExplorerAPI["setPrefs"]>(
    (patch) => mutate((s) => ({ ...s, prefs: { ...s.prefs, ...patch } })),
    [mutate],
  );

  const purgeProject = useCallback<ExplorerAPI["purgeProject"]>(
    (projectId) =>
      mutate((s) => ({
        ...s,
        items: s.items.filter((i) => i.projectId !== projectId),
        seeded: s.seeded.filter((p) => p !== projectId),
      })),
    [mutate],
  );

  const api = useMemo<ExplorerAPI>(
    () => ({
      hydrated,
      items: data.items,
      prefs: data.prefs,
      clipboard,
      listProject,
      listTrash,
      childrenOf,
      getItem,
      pathOf,
      descendantsOf,
      ensureScaffold,
      createFolder,
      addFiles,
      replaceFile,
      rename,
      move,
      duplicate,
      trash,
      restore,
      purge,
      emptyTrash,
      copyToProject,
      moveToProject,
      setClipboard,
      paste,
      setPrefs,
      purgeProject,
    }),
    [
      hydrated, data.items, data.prefs, clipboard,
      listProject, listTrash, childrenOf, getItem, pathOf, descendantsOf, ensureScaffold,
      createFolder, addFiles, replaceFile, rename, move, duplicate, trash, restore, purge,
      emptyTrash, copyToProject, moveToProject, paste, setPrefs, purgeProject,
    ],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useExplorer(): ExplorerAPI {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useExplorer must be used inside <ExplorerProvider>");
  return ctx;
}

/* --------------------- Builder reference helpers ----------------------- */

/** Builder fields store explorer files as `file:<stable item id>`. */
export function serializeFileRef(id: string): string {
  return `file:${id}`;
}

export function parseFileRef(value: string | undefined): string | null {
  return value && value.startsWith("file:") ? value.slice(5) : null;
}

/** Read a File into the portable item payload used by addFiles/replaceFile. */
export function readFilePayload(file: File): Promise<{ name: string; size: number; mimeType?: string; dataUrl?: string }> {
  return new Promise((resolve) => {
    const meta = { name: file.name, size: file.size, mimeType: file.type || undefined };
    // Only inline reasonably small files; larger ones keep metadata only.
    if (file.size > 6 * 1024 * 1024) {
      resolve(meta);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve({ ...meta, dataUrl: typeof reader.result === "string" ? reader.result : undefined });
    reader.onerror = () => resolve(meta);
    reader.readAsDataURL(file);
  });
}

/** Sorting helper shared by list + grid views. Folders always come first. */
export function sortItems(items: ProjectExplorerItem[], key: SortKey, dir: SortDir): ProjectExplorerItem[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    if (a.itemType !== b.itemType) return a.itemType === "folder" ? -1 : 1;
    let cmp = 0;
    switch (key) {
      case "name":
        cmp = a.name.localeCompare(b.name, undefined, { numeric: true });
        break;
      case "type":
        cmp = fileCategory(a).localeCompare(fileCategory(b)) || a.name.localeCompare(b.name);
        break;
      case "size":
        cmp = (a.size ?? 0) - (b.size ?? 0);
        break;
      case "created":
        cmp = a.createdAt.localeCompare(b.createdAt);
        break;
      case "modified":
        cmp = a.updatedAt.localeCompare(b.updatedAt);
        break;
    }
    return cmp * sign;
  });
}
