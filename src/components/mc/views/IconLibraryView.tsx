/**
 * IconLibraryView — full "Icon Library" workspace section.
 *
 * The read-only Default Icon Library expanded from the old Assets
 * workspace. Provides browse / search / category filter / tag filter /
 * favorites / recently used / collections / grid & list views / preview
 * panel / quick assign / copy to project assets / sorting.
 *
 * Users cannot modify built-in originals. "Copy to Project Assets"
 * creates an editable project copy in a future engine wire-up.
 */

import { useMemo, useState } from "react";
import {
  Search,
  Star,
  StarOff,
  Filter,
  LayoutGrid,
  List,
  Clock,
  Copy,
  FolderPlus,
  Sparkles,
  ArrowUpDown,
  X,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DEFAULT_ICONS,
  CATEGORY_LABEL,
  iconLibraryState,
  findBuiltin,
  type IconAsset,
  type IconCategory,
  type IconCollection,
} from "@/lib/icon-library";
import { IconArt } from "../icons/IconArt";

type View = "grid-large" | "grid-small" | "list";
type Sort = "category" | "alpha" | "recent";

const CATS: (IconCategory | "all")[] = [
  "all",
  "careers",
  "traits",
  "skills",
  "rewards",
  "relationships",
  "lifestyle",
  "objects",
  "worlds",
  "notifications",
];

export function IconLibraryView() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<IconCategory | "all">("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [view, setView] = useState<View>("grid-large");
  const [sort, setSort] = useState<Sort>("category");
  const [favs, setFavs] = useState<string[]>(() => iconLibraryState.getFavorites());
  const [recent, setRecent] = useState<string[]>(() => iconLibraryState.getRecent());
  const [collections, setCollections] = useState<IconCollection[]>(() =>
    iconLibraryState.getCollections(),
  );
  const [showCollections, setShowCollections] = useState(false);
  const [selected, setSelected] = useState<IconAsset | null>(DEFAULT_ICONS[0] ?? null);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const i of DEFAULT_ICONS) i.tags.forEach((t) => s.add(t));
    return Array.from(s).sort();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = DEFAULT_ICONS.filter((i) => {
      if (cat !== "all" && i.category !== cat) return false;
      if (tagFilter && !i.tags.includes(tagFilter)) return false;
      if (!q) return true;
      const hay = [i.name, i.category, i.subcategory ?? "", ...i.keywords, ...i.tags]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
    if (sort === "alpha") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "recent")
      list = [...list].sort(
        (a, b) => (recent.indexOf(a.id) < 0 ? 999 : recent.indexOf(a.id)) -
          (recent.indexOf(b.id) < 0 ? 999 : recent.indexOf(b.id)),
      );
    return list;
  }, [query, cat, tagFilter, sort, recent]);

  const toggleFav = (id: string) => {
    const cur = iconLibraryState.getFavorites();
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    iconLibraryState.setFavorites(next);
    setFavs(next);
  };

  const pick = (a: IconAsset) => {
    setSelected(a);
    iconLibraryState.pushRecent(a.id);
    setRecent(iconLibraryState.getRecent());
  };

  const createCollection = () => {
    const name = window.prompt("Collection name?");
    if (!name) return;
    const c: IconCollection = {
      id: `col_${Date.now()}`,
      name,
      iconIds: selected ? [selected.id] : [],
      createdAt: new Date().toISOString(),
    };
    const next = [c, ...collections];
    iconLibraryState.setCollections(next);
    setCollections(next);
    toast.success(`Created collection · ${name}`);
  };

  const addToCollection = (colId: string) => {
    if (!selected) return;
    const next = collections.map((c) =>
      c.id === colId && !c.iconIds.includes(selected.id)
        ? { ...c, iconIds: [...c.iconIds, selected.id] }
        : c,
    );
    iconLibraryState.setCollections(next);
    setCollections(next);
    toast.success(`Added ${selected.name} to collection`);
  };

  const cellSize = view === "grid-large" ? 96 : view === "grid-small" ? 64 : 40;

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-semibold tracking-tight">Icon Library</div>
            <span className="rounded-full bg-[var(--teal)]/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--teal)]">
              Default Pack · v1.0 · Read-only
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            One cohesive, hand-illustrated pack — {DEFAULT_ICONS.length} original
            icons rendered in the same painterly game-UI language, sharp from
            16 → 128 px, transparent background, no watermarks. Copy any icon
            into Project Assets to customise it — originals stay untouched.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCollections((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold",
              showCollections
                ? "border-[var(--teal)] bg-[var(--teal)]/8 text-foreground"
                : "border-border hover:bg-accent",
            )}
          >
            <FolderPlus className="h-3 w-3" />
            Collections · {collections.length}
          </button>
          <button
            onClick={createCollection}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--teal)] px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-3 w-3" />
            New Collection
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search icons…"
            className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-xs outline-none focus:border-[var(--teal)]"
          />
        </div>

        <div className="flex items-center gap-1 rounded-md border border-border bg-background p-0.5">
          {(
            [
              { id: "grid-large", icon: LayoutGrid, label: "Large" },
              { id: "grid-small", icon: LayoutGrid, label: "Small" },
              { id: "list", icon: List, label: "List" },
            ] as const
          ).map((v) => {
            const Icon = v.icon;
            const active = view === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setView(v.id as View)}
                title={v.label}
                className={cn(
                  "flex items-center gap-1 rounded px-2 py-1 text-[10.5px] font-semibold",
                  active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-3 w-3", v.id === "grid-small" && "scale-90")} />
                {v.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-1 text-[10.5px] font-semibold text-muted-foreground">
          <ArrowUpDown className="h-3 w-3" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="bg-transparent text-[10.5px] font-semibold outline-none"
          >
            <option value="category">Category</option>
            <option value="alpha">Alphabetical</option>
            <option value="recent">Recently Used</option>
          </select>
        </div>

        {tagFilter && (
          <button
            onClick={() => setTagFilter(null)}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--teal)]/12 px-2 py-0.5 text-[10.5px] font-semibold text-[var(--teal)] hover:opacity-80"
          >
            <Filter className="h-3 w-3" />
            #{tagFilter}
            <X className="h-3 w-3" />
          </button>
        )}

        <div className="ml-auto text-[11px] text-muted-foreground tabular-nums">
          {filtered.length} icons · {favs.length} favorites
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-[220px_1fr_320px] gap-4">
        {/* Categories rail */}
        <aside className="rounded-lg border border-border bg-card p-2">
          <div className="mb-1 px-1.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Categories
          </div>
          {CATS.map((c) => {
            const label = c === "all" ? "All Icons" : CATEGORY_LABEL[c];
            const count =
              c === "all"
                ? DEFAULT_ICONS.length
                : DEFAULT_ICONS.filter((i) => i.category === c).length;
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium",
                  cat === c
                    ? "bg-[var(--teal)]/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span>{label}</span>
                <span className="tabular-nums text-[10px]">{count}</span>
              </button>
            );
          })}

          {recent.length > 0 && (
            <>
              <div className="mb-1 mt-3 flex items-center gap-1 px-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Clock className="h-2.5 w-2.5" />
                Recently Used
              </div>
              <div className="grid grid-cols-4 gap-1 px-1">
                {recent.slice(0, 8).map((id) => {
                  const a = findBuiltin(id);
                  if (!a) return null;
                  return (
                    <button
                      key={id}
                      onClick={() => pick(a)}
                      title={a.name}
                      className="rounded p-0.5 hover:bg-muted"
                    >
                      <IconArt icon={a} size={28} />
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="mb-1 mt-3 px-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Popular Tags
          </div>
          <div className="flex flex-wrap gap-1 px-1">
            {allTags.slice(0, 14).map((t) => (
              <button
                key={t}
                onClick={() => setTagFilter(t === tagFilter ? null : t)}
                className={cn(
                  "rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                  tagFilter === t
                    ? "border-[var(--teal)] bg-[var(--teal)]/10 text-[var(--teal)]"
                    : "border-border text-muted-foreground hover:border-foreground/30",
                )}
              >
                #{t}
              </button>
            ))}
          </div>
        </aside>

        {/* Grid / list */}
        <main className="rounded-lg border border-border bg-card">
          {showCollections && (
            <div className="border-b border-border bg-muted/20 p-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Collections
              </div>
              {collections.length === 0 ? (
                <div className="text-[11px] text-muted-foreground">
                  No collections yet. Select an icon and click "New Collection".
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {collections.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2 rounded-md border border-border bg-background p-2"
                    >
                      <div className="flex-1">
                        <div className="text-xs font-semibold">{c.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {c.iconIds.length} icons
                        </div>
                      </div>
                      <div className="flex -space-x-2">
                        {c.iconIds.slice(0, 5).map((id) => {
                          const a = findBuiltin(id);
                          if (!a) return null;
                          return (
                            <div
                              key={id}
                              className="rounded-full border-2 border-background"
                              title={a.name}
                            >
                              <IconArt icon={a} size={22} />
                            </div>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => addToCollection(c.id)}
                        disabled={!selected}
                        className="rounded-md border border-border px-2 py-1 text-[10px] font-semibold hover:bg-accent disabled:opacity-40"
                      >
                        Add selected
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="max-h-[64vh] overflow-y-auto p-3">
            {view === "list" ? (
              <div className="flex flex-col divide-y divide-border">
                {filtered.map((a) => {
                  const isSel = selected?.id === a.id;
                  const isFav = favs.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => pick(a)}
                      className={cn(
                        "flex items-center gap-3 px-2 py-2 text-left hover:bg-muted/40",
                        isSel && "bg-[var(--teal)]/8",
                      )}
                    >
                      <IconArt icon={a} size={36} />
                      <div className="flex-1">
                        <div className="text-xs font-semibold">{a.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {CATEGORY_LABEL[a.category]}
                          {a.subcategory ? ` · ${a.subcategory}` : ""}
                        </div>
                      </div>
                      <div className="hidden sm:flex flex-wrap gap-1">
                        {a.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFav(a.id);
                        }}
                        className="rounded p-1 hover:bg-background"
                      >
                        {isFav ? (
                          <Star className="h-3.5 w-3.5 fill-[var(--gold)] text-[var(--gold)]" />
                        ) : (
                          <StarOff className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(auto-fill,minmax(${cellSize + 20}px,1fr))`,
                }}
              >
                {filtered.map((a) => {
                  const isSel = selected?.id === a.id;
                  const isFav = favs.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => pick(a)}
                      title={a.name}
                      className={cn(
                        "group relative flex flex-col items-center gap-1 rounded-lg border p-2 transition-all",
                        isSel
                          ? "border-[var(--teal)] bg-[var(--teal)]/8 shadow-sm"
                          : "border-transparent hover:border-border hover:bg-muted/40",
                      )}
                    >
                      <IconArt icon={a} size={cellSize} />
                      <div className="line-clamp-1 w-full text-center text-[10px] font-medium text-muted-foreground">
                        {a.name}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFav(a.id);
                        }}
                        className={cn(
                          "absolute right-1 top-1 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100",
                          isFav && "opacity-100",
                        )}
                      >
                        {isFav ? (
                          <Star className="h-3 w-3 fill-[var(--gold)] text-[var(--gold)]" />
                        ) : (
                          <StarOff className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* Preview / Used-By panel */}
        <aside className="rounded-lg border border-border bg-card p-4">
          {selected ? (
            <>
              <div className="mx-auto mb-3 flex h-40 w-40 items-center justify-center rounded-2xl border border-border bg-muted/30">
                <IconArt icon={selected} size={128} />
              </div>
              <div className="text-sm font-semibold">{selected.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {CATEGORY_LABEL[selected.category]}
                {selected.subcategory ? ` · ${selected.subcategory}` : ""}
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 rounded-md border border-border bg-background p-2">
                {[16, 24, 48, 96].map((s) => (
                  <div key={s} className="flex flex-col items-center gap-1">
                    <IconArt icon={selected} size={s} />
                    <div className="text-[9px] text-muted-foreground">{s}px</div>
                  </div>
                ))}
              </div>

              <div className="mt-3">
                <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  Metadata
                </div>
                <div className="mt-1 space-y-1 text-[10.5px]">
                  <MetaRow k="ID" v={<span className="font-mono">{selected.id}</span>} />
                  <MetaRow k="Version" v={selected.version} />
                  <MetaRow k="Keywords" v={selected.keywords.join(", ") || "—"} />
                  <MetaRow
                    k="Tags"
                    v={
                      <div className="flex flex-wrap gap-1">
                        {selected.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded bg-muted px-1 py-0.5 text-[9.5px] text-muted-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    }
                  />
                  <MetaRow k="Kind" v={selected.kind} />
                </div>
              </div>

              <div className="mt-3">
                <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  Used By
                </div>
                <div className="mt-1 rounded-md border border-dashed border-border p-2 text-[10.5px] text-muted-foreground">
                  Not referenced yet. Once you assign this icon to a career,
                  trait, aspiration or notification, this panel lists every
                  entity linking to it.
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={() => toggleFav(selected.id)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                >
                  {favs.includes(selected.id) ? "Unfavorite" : "Add to favorites"}
                </button>
                <button
                  onClick={() =>
                    toast.info(`Copied "${selected.name}" to Project Assets (mock)`, {
                      description:
                        "Built-in originals stay read-only. Editing creates a project copy.",
                    })
                  }
                  className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                >
                  <Copy className="h-3 w-3" />
                  Copy to Project Assets
                </button>
                <button
                  onClick={() =>
                    toast.message(`Quick Assign · ${selected.name}`, {
                      description: "Opens the last-active field. In this build, pickers use it directly.",
                    })
                  }
                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[var(--teal)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  <Sparkles className="h-3 w-3" />
                  Quick Assign
                </button>
              </div>
            </>
          ) : (
            <div className="mt-16 text-center text-xs text-muted-foreground">
              Select an icon to preview.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function MetaRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="w-16 shrink-0 text-muted-foreground">{k}</div>
      <div className="flex-1 text-right">{v}</div>
    </div>
  );
}
