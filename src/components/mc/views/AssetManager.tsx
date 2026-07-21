import { useMemo, useState } from "react";
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

type AssetKind = "image" | "audio" | "text" | "xml";

type Asset = {
  id: string;
  name: string;
  kind: AssetKind;
  size: string;
  folder: string;
  updated: string;
  tags: string[];
  favorite?: boolean;
};

const INITIAL_FOLDERS = ["Careers/Icons", "Careers/Uniforms", "Traits/Portraits", "Audio/Stings", "Text/Strings"];

const INITIAL_ASSETS: Asset[] = [
  { id: "a1", name: "marine_bio_icon.png", kind: "image", size: "18 KB", folder: "Careers/Icons", updated: "2m ago", tags: ["career", "icon"], favorite: true },
  { id: "a2", name: "reef_guardian_icon.png", kind: "image", size: "22 KB", folder: "Careers/Icons", updated: "1h ago", tags: ["career"] },
  { id: "a3", name: "diver_uniform_f.png", kind: "image", size: "94 KB", folder: "Careers/Uniforms", updated: "3h ago", tags: ["uniform", "female"] },
  { id: "a4", name: "diver_uniform_m.png", kind: "image", size: "92 KB", folder: "Careers/Uniforms", updated: "3h ago", tags: ["uniform", "male"] },
  { id: "a5", name: "dreamer_portrait.png", kind: "image", size: "128 KB", folder: "Traits/Portraits", updated: "yesterday", tags: ["trait"], favorite: true },
  { id: "a6", name: "promotion_sting.wav", kind: "audio", size: "42 KB", folder: "Audio/Stings", updated: "yesterday", tags: ["sfx"] },
  { id: "a7", name: "career_strings.stbl", kind: "text", size: "6 KB", folder: "Text/Strings", updated: "4d ago", tags: ["stbl"] },
  { id: "a8", name: "career_base.xml", kind: "xml", size: "3 KB", folder: "Careers/Icons", updated: "1w ago", tags: ["tuning"] },
];

const KIND_META: Record<AssetKind, { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string }> = {
  image: { icon: ImageIcon, color: "var(--pink)" },
  audio: { icon: FileAudio, color: "var(--orange)" },
  text: { icon: FileText, color: "var(--teal)" },
  xml: { icon: FileCode2, color: "var(--blue)" },
};

export function AssetManager() {
  const [folders, setFolders] = useState<string[]>(INITIAL_FOLDERS);
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [activeFolder, setActiveFolder] = useState<string>("Careers/Icons");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>("a1");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      if (activeFolder !== "All" && a.folder !== activeFolder) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [assets, activeFolder, query]);

  const active = assets.find((a) => a.id === selected) ?? null;

  const addFolder = () => {
    const n = window.prompt("New folder path (e.g. Careers/Rewards):")?.trim();
    if (!n) return;
    if (folders.includes(n)) {
      toast.error("Folder already exists");
      return;
    }
    setFolders((f) => [...f, n]);
    setActiveFolder(n);
    toast.success("Folder created");
  };

  const renameFolder = () => {
    const n = window.prompt("Rename folder", activeFolder)?.trim();
    if (!n || n === activeFolder) return;
    setFolders((f) => f.map((x) => (x === activeFolder ? n : x)));
    setAssets((a) => a.map((x) => (x.folder === activeFolder ? { ...x, folder: n } : x)));
    setActiveFolder(n);
    toast.success("Folder renamed");
  };

  const deleteFolder = () => {
    if (!window.confirm(`Delete folder "${activeFolder}"? Assets will move to Unsorted.`)) return;
    setAssets((a) => a.map((x) => (x.folder === activeFolder ? { ...x, folder: "Unsorted" } : x)));
    setFolders((f) => f.filter((x) => x !== activeFolder));
    setActiveFolder("All");
    toast.success("Folder deleted");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--pink)] text-white shadow-sm">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Media
            </div>
            <h1 className="text-xl font-bold tracking-tight">Asset Manager</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-md border border-border">
            <button
              onClick={() => setView("grid")}
              className={cn(
                "px-2 py-1.5 text-xs",
                view === "grid" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60",
              )}
              title="Grid"
            >
              <Grid3x3 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "px-2 py-1.5 text-xs",
                view === "list" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60",
              )}
              title="List"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            onClick={() => toast.success("Import dialog opened")}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--blue)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
          >
            <Upload className="h-3.5 w-3.5" /> Import
          </button>
        </div>
      </div>

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
            <FolderRow name="All" count={assets.length} active={activeFolder === "All"} onClick={() => setActiveFolder("All")} />
            {folders.map((f) => (
              <FolderRow
                key={f}
                name={f}
                count={assets.filter((a) => a.folder === f).length}
                active={activeFolder === f}
                onClick={() => setActiveFolder(f)}
              />
            ))}
          </div>

          {activeFolder !== "All" && (
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

        {/* Assets grid/list */}
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
              {shown.length} of {assets.length}
            </div>
          </div>

          {shown.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
              Empty folder. Import an asset or drag files here.
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {shown.map((a) => {
                const meta = KIND_META[a.kind];
                const Icon = meta.icon;
                return (
                  <button
                    key={a.id}
                    onClick={() => setSelected(a.id)}
                    className={cn(
                      "group flex flex-col items-start gap-2 rounded-lg border p-2.5 text-left transition-all",
                      selected === a.id
                        ? "border-[var(--blue)] bg-[var(--blue)]/5"
                        : "border-border bg-background/40 hover:border-border/80 hover:bg-accent/40",
                    )}
                  >
                    <div
                      className="grid aspect-square w-full place-items-center rounded-md"
                      style={{ backgroundColor: meta.color + "18" }}
                    >
                      <Icon className="h-7 w-7" style={{ color: meta.color }} />
                    </div>
                    <div className="w-full min-w-0">
                      <div className="flex items-center gap-1">
                        <div className="min-w-0 flex-1 truncate text-[11px] font-semibold">
                          {a.name}
                        </div>
                        {a.favorite && (
                          <Star className="h-3 w-3 fill-[var(--orange)] text-[var(--orange)]" />
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{a.size}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-background/60 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-semibold">Name</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Folder</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Size</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Updated</th>
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
                        <td className="px-2 py-1.5 text-muted-foreground">{a.folder}</td>
                        <td className="px-2 py-1.5 text-muted-foreground tabular-nums">{a.size}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{a.updated}</td>
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
                className="grid aspect-square w-full place-items-center rounded-lg"
                style={{ backgroundColor: KIND_META[active.kind].color + "18" }}
              >
                {(() => {
                  const Icon = KIND_META[active.kind].icon;
                  return <Icon className="h-10 w-10" style={{ color: KIND_META[active.kind].color }} />;
                })()}
              </div>
              <div>
                <div className="truncate text-sm font-semibold">{active.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {active.folder} · {active.size} · {active.updated}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Tags
                </div>
                <div className="flex flex-wrap gap-1">
                  {active.tags.map((t) => (
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
              <div className="flex flex-wrap gap-1 border-t border-border pt-3">
                <button
                  onClick={() => {
                    setAssets((a) =>
                      a.map((x) => (x.id === active.id ? { ...x, favorite: !x.favorite } : x)),
                    );
                  }}
                  className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] font-medium hover:bg-accent"
                >
                  <Star className="h-3 w-3" /> {active.favorite ? "Unfavorite" : "Favorite"}
                </button>
                <button
                  onClick={() => toast.success("Duplicated")}
                  className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] font-medium hover:bg-accent"
                >
                  <Copy className="h-3 w-3" /> Duplicate
                </button>
                <button
                  onClick={() => {
                    setAssets((a) => a.filter((x) => x.id !== active.id));
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

function FolderRow({
  name,
  count,
  active,
  onClick,
}: {
  name: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
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
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <span className="text-[10px] text-muted-foreground tabular-nums">{count}</span>
    </button>
  );
}
