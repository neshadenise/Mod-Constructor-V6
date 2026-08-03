/**
 * IconPicker — universal modal picker used by every icon field.
 *
 * Three tabs:
 *   1. Default Library  → built-in read-only pack (via IconArt)
 *   2. Project Assets   → user's project.assets entries
 *   3. Upload Image     → OS file picker (mocked in preview build)
 *
 * The value stored on the parent entity is an `IconRef` — `{kind, id}` —
 * so future AI-generated icons plug into "Project Assets" with the same
 * shape. Zero UI changes will be needed when generated icons appear.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Star,
  StarOff,
  Upload,
  ImageIcon,
  X,
  FolderOpen,
  Layers,
  Sparkles,
  Wand2,
  Loader2,
  Trash2,
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
  type IconRef,
} from "@/lib/icon-library";
import {
  addCustomIcon,
  findCustomIcon,
  removeCustomIcon,
  toIconAsset,
  useCustomIcons,
} from "@/lib/custom-icons";
import { cropToAspect, generateArt, iconPrompt } from "@/lib/ai-art";
import { IconArt } from "./IconArt";

type Tab = "library" | "ai" | "assets" | "upload";

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


export function IconPicker({
  open,
  onClose,
  onPick,
  value,
  title = "Choose Icon",
  initialTab = "library",
  suggestion,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (ref: IconRef, resolved: { name: string }) => void;
  value?: IconRef;
  title?: string;
  /** Open straight onto a tab (used by the "AI icon" buttons). */
  initialTab?: Tab;
  /** Prefilled AI subject, e.g. the career name. */
  suggestion?: string;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<IconCategory | "all">("all");
  const [favs, setFavs] = useState<string[]>(() => iconLibraryState.getFavorites());
  const [recent, setRecent] = useState<string[]>(() => iconLibraryState.getRecent());
  const custom = useCustomIcons();
  const [selected, setSelected] = useState<IconAsset | null>(null);

  // AI generator state
  const [aiSubject, setAiSubject] = useState(suggestion ?? "");
  const [aiCategory, setAiCategory] = useState<IconCategory>("careers");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiPreview, setAiPreview] = useState<string | null>(null);

  const resolveRef = (v?: IconRef): IconAsset | null => {
    if (!v) return null;
    if (v.kind === "builtin") return findBuiltin(v.id) ?? null;
    const c = findCustomIcon(v.id);
    return c ? toIconAsset(c) : null;
  };

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setAiSubject(suggestion ?? "");
    setAiPreview(null);
    setSelected(resolveRef(value));
    setFavs(iconLibraryState.getFavorites());
    setRecent(iconLibraryState.getRecent());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value, initialTab, suggestion]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DEFAULT_ICONS.filter((i) => {
      if (cat !== "all" && i.category !== cat) return false;
      if (!q) return true;
      const hay = [
        i.name,
        i.category,
        i.subcategory ?? "",
        ...i.keywords,
        ...i.tags,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query, cat]);

  if (!open) return null;

  const toggleFav = (id: string) => {
    const cur = iconLibraryState.getFavorites();
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    iconLibraryState.setFavorites(next);
    setFavs(next);
  };

  const commit = (asset: IconAsset) => {
    iconLibraryState.pushRecent(asset.id);
    setRecent(iconLibraryState.getRecent());
    onPick(
      { kind: asset.kind === "builtin" ? "builtin" : "generated", id: asset.id },
      { name: asset.name },
    );
    toast.success(`Icon · ${asset.name}`);
    onClose();
  };

  const runGenerate = async () => {
    if (aiBusy) return;
    setAiBusy(true);
    setAiPreview(null);
    try {
      const dataUrl = await generateArt(iconPrompt(aiSubject));
      setAiPreview(dataUrl);
      const icon = addCustomIcon({
        name: aiSubject.trim() || "AI Icon",
        category: aiCategory,
        dataUrl,
        prompt: aiSubject,
        source: "ai",
      });
      setSelected(toIconAsset(icon));
      toast.success("Icon generated and added to your library");
    } catch (err) {
      toast.error("Couldn't generate that icon", {
        description: err instanceof Error ? err.message : "Try a simpler subject.",
      });
    } finally {
      setAiBusy(false);
    }
  };


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm">
      <div className="flex h-[82vh] w-[min(1120px,96vw)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--teal)]" />
            <div className="text-sm font-semibold">{title}</div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Default Icon Library · v1.0
            </span>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border px-3 pt-2">
          {(
            [
              { id: "library", label: "Default Library", icon: Layers },
              { id: "ai", label: "Generate with AI", icon: Wand2 },
              { id: "assets", label: "My Icons", icon: FolderOpen },
              { id: "upload", label: "Upload Image", icon: Upload },

            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2 text-xs font-semibold transition-colors",
                  active
                    ? "border-[var(--teal)] text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {tab === "library" && (
            <>
              {/* Left rail */}
              <div className="w-56 shrink-0 overflow-y-auto border-r border-border bg-muted/20 p-3">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Categories
                </div>
                <div className="flex flex-col gap-0.5">
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
                          "flex items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium",
                          cat === c
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                        )}
                      >
                        <span>{label}</span>
                        <span className="tabular-nums text-[10px] text-muted-foreground">{count}</span>
                      </button>
                    );
                  })}
                </div>

                {favs.length > 0 && (
                  <>
                    <div className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Favorites · {favs.length}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {favs.slice(0, 12).map((id) => {
                        const a = findBuiltin(id);
                        if (!a) return null;
                        return (
                          <button
                            key={id}
                            onClick={() => setSelected(a)}
                            onDoubleClick={() => commit(a)}
                            title={a.name}
                            className="rounded-md border border-transparent p-1 hover:border-border hover:bg-background"
                          >
                            <IconArt icon={a} size={30} />
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {recent.length > 0 && (
                  <>
                    <div className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Recently Used
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {recent.slice(0, 8).map((id) => {
                        const a = findBuiltin(id);
                        if (!a) return null;
                        return (
                          <button
                            key={id}
                            onClick={() => setSelected(a)}
                            onDoubleClick={() => commit(a)}
                            title={a.name}
                            className="rounded-md border border-transparent p-1 hover:border-border hover:bg-background"
                          >
                            <IconArt icon={a} size={30} />
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Grid */}
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border p-3">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search 200+ icons by name, keyword or tag…"
                      className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-xs outline-none focus:border-[var(--teal)]"
                    />
                  </div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    {filtered.length} matches
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                  {filtered.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      No icons match "{query}"
                    </div>
                  ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
                      {filtered.map((a) => {
                        const isSel = selected?.id === a.id;
                        const isFav = favs.includes(a.id);
                        return (
                          <button
                            key={a.id}
                            onClick={() => setSelected(a)}
                            onDoubleClick={() => commit(a)}
                            title={`${a.name} — ${CATEGORY_LABEL[a.category]}`}
                            className={cn(
                              "group relative flex flex-col items-center gap-1 rounded-lg border p-2 transition-all",
                              isSel
                                ? "border-[var(--teal)] bg-[var(--teal)]/8 shadow-sm"
                                : "border-transparent hover:border-border hover:bg-background",
                            )}
                          >
                            <IconArt icon={a} size={44} />
                            <div className="line-clamp-1 w-full text-center text-[10px] font-medium text-muted-foreground">
                              {a.name}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFav(a.id);
                              }}
                              className={cn(
                                "absolute right-0.5 top-0.5 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100",
                                isFav && "opacity-100",
                              )}
                              aria-label={isFav ? "Unfavorite" : "Favorite"}
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
              </div>

              {/* Preview panel */}
              <div className="w-64 shrink-0 overflow-y-auto border-l border-border bg-muted/20 p-4">
                {selected ? (
                  <>
                    <div className="mx-auto mb-3 flex h-32 w-32 items-center justify-center rounded-2xl border border-border bg-background/60 shadow-inner">
                      <IconArt icon={selected} size={112} />
                    </div>
                    <div className="text-sm font-semibold">{selected.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {CATEGORY_LABEL[selected.category]}
                      {selected.subcategory ? ` · ${selected.subcategory}` : ""}
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-md border border-border bg-background/60 p-2">
                      {[16, 32, 64].map((s) => (
                        <div key={s} className="flex flex-col items-center gap-1">
                          <IconArt icon={selected} size={s} />
                          <div className="text-[9px] text-muted-foreground">{s}px</div>
                        </div>
                      ))}
                    </div>

                    {selected.tags.length > 0 && (
                      <div className="mt-3">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                          Tags
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {selected.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 text-[10px] text-muted-foreground">
                      ID · <span className="font-mono">{selected.id}</span>
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                      <button
                        onClick={() => commit(selected)}
                        className="rounded-md bg-[var(--teal)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                      >
                        Use this icon
                      </button>
                      <button
                        onClick={() => toggleFav(selected.id)}
                        className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                      >
                        {favs.includes(selected.id) ? "Unfavorite" : "Add to favorites"}
                      </button>
                      <button
                        onClick={() =>
                          toast.info(`"${selected.name}" copied to Project Assets (mock)`, {
                            description:
                              "In the desktop build this creates an editable project copy while keeping the original read-only.",
                          })
                        }
                        className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                      >
                        Copy to Project Assets
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="mt-16 text-center text-xs text-muted-foreground">
                    Select an icon to preview.
                  </div>
                )}
              </div>
            </>
          )}

          {tab === "ai" && (
            <div className="flex flex-1 overflow-hidden">
              <div className="w-[360px] shrink-0 space-y-3 overflow-y-auto border-r border-border bg-muted/20 p-4">
                <div className="text-sm font-semibold">Generate a Sims-style icon</div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Describe the subject only — the studio applies the shared Sims 4
                  aspiration/icon art style (glossy vector, soft glow, centered subject,
                  no text) so every generated icon matches the pack.
                </p>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Subject
                  </label>
                  <input
                    value={aiSubject}
                    onChange={(e) => setAiSubject(e.target.value)}
                    placeholder="e.g. ballet slippers, ring light, chef's knife"
                    className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-[var(--teal)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Library category
                  </label>
                  <select
                    value={aiCategory}
                    onChange={(e) => setAiCategory(e.target.value as IconCategory)}
                    className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-[var(--teal)]"
                  >
                    {CATS.filter((c) => c !== "all").map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABEL[c as IconCategory]}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={runGenerate}
                  disabled={aiBusy}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--teal)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                  {aiBusy ? "Generating…" : "Generate icon"}
                </button>
                <div className="rounded-md border border-dashed border-border bg-background/60 p-3 text-[10.5px] text-muted-foreground">
                  Generated icons are saved to <span className="font-semibold">My Icons</span>{" "}
                  automatically and become available in every icon field.
                </div>
              </div>

              <div className="flex flex-1 flex-col items-center justify-center p-8">
                {aiBusy ? (
                  <div className="flex flex-col items-center gap-3 text-xs text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--teal)]" />
                    Painting your icon…
                  </div>
                ) : aiPreview ? (
                  <>
                    <img
                      src={aiPreview}
                      alt="Generated icon"
                      className="h-56 w-56 rounded-2xl border border-border bg-background object-contain shadow-lg"
                    />
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => selected && commit(selected)}
                        className="rounded-md bg-[var(--teal)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                      >
                        Use this icon
                      </button>
                      <button
                        onClick={runGenerate}
                        className="rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-accent"
                      >
                        Try again
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="max-w-sm text-center text-xs text-muted-foreground">
                    <Wand2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    Your generated icon will appear here.
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "assets" && (
            <div className="flex-1 overflow-y-auto p-4">
              {custom.length === 0 ? (
                <div className="flex h-full items-center justify-center p-10 text-center">
                  <div className="max-w-md">
                    <FolderOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    <div className="text-sm font-semibold">No custom icons yet</div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      Use <span className="font-semibold">Generate with AI</span> or{" "}
                      <span className="font-semibold">Upload Image</span> — everything you add
                      lands here and is reusable in every icon field.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-3">
                  {custom.map((c) => {
                    const asset = toIconAsset(c);
                    return (
                      <div
                        key={c.id}
                        className="group relative flex flex-col items-center gap-1 rounded-lg border border-border p-2 hover:border-[var(--teal)]"
                      >
                        <button onClick={() => commit(asset)} className="w-full">
                          <img
                            src={c.dataUrl}
                            alt={c.name}
                            className="mx-auto h-16 w-16 rounded-md object-contain"
                          />
                          <div className="mt-1 line-clamp-1 text-center text-[10px] font-medium text-muted-foreground">
                            {c.name}
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            removeCustomIcon(c.id);
                            toast.message(`Removed "${c.name}"`);
                          }}
                          aria-label={`Delete ${c.name}`}
                          className="absolute right-1 top-1 rounded p-0.5 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                        >
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}


          {tab === "upload" && (
            <div className="flex flex-1 items-center justify-center p-10 text-center">
              <div className="max-w-md">
                <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <div className="text-sm font-semibold">Upload custom image</div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Bring your own PNG (128×128 recommended, transparent
                  background). It's cropped square, saved to{" "}
                  <span className="font-semibold">My Icons</span>, and reusable everywhere.
                </p>
                <button
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.onchange = async () => {
                      const f = input.files?.[0];
                      if (!f) return;
                      const dataUrl = await cropToAspect(f, 1, 256);
                      if (!dataUrl) {
                        toast.error("Couldn't read that image");
                        return;
                      }
                      const icon = addCustomIcon({
                        name: f.name.replace(/\.[^.]+$/, ""),
                        category: "objects",
                        dataUrl,
                        source: "upload",
                      });
                      commit(toIconAsset(icon));
                    };
                    input.click();
                  }}

                  className="mt-4 rounded-md bg-[var(--teal)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                >
                  Choose file…
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2 text-[10.5px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-3 w-3" />
            <span>
              {DEFAULT_ICONS.length} built-in icons · single cohesive pack ·
              transparent background · 16–128 px
            </span>
          </div>
          <div>Tip · double-click any icon to apply</div>
        </div>
      </div>
    </div>
  );
}
