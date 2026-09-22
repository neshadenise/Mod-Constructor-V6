/**
 * Snippets Library.
 *
 * A snippet is a reusable block of tuning text the creator pastes into other
 * builders — it is deliberately NOT a compiled resource, so it has no export
 * path of its own. Everything here reads and writes the real project store, so
 * snippets survive reloads and appear in the project's saved data.
 */

import { useEffect, useMemo, useState } from "react";
import { Code2, Search, Copy, Plus, Tag, Trash2, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import type { Snippet } from "@/lib/types";

const CATS = ["All", "Buff", "Objective", "Interaction", "Message", "Tuning", "General"] as const;
const EDITABLE_CATS = CATS.filter((c) => c !== "All");
const LANGS: Snippet["language"][] = ["xml", "python", "text"];

export function SnippetsLibrary() {
  const store = useStore();
  const snippets = store.state.snippets;

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");
  const [selected, setSelected] = useState<string>("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return snippets.filter((s) => {
      if (cat !== "All" && s.category !== cat) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q)) ||
        s.body.toLowerCase().includes(q)
      );
    });
  }, [snippets, query, cat]);

  const active = snippets.find((s) => s.id === selected) ?? shown[0] ?? null;

  /* Keep a valid selection as the list changes. */
  useEffect(() => {
    if (active && active.id !== selected) setSelected(active.id);
  }, [active, selected]);

  const createSnippet = () => {
    const s = store.saveSnippet({
      name: "New snippet",
      category: "Tuning",
      language: "xml",
      body: "<!-- your snippet -->",
      tags: [],
    });
    setSelected(s.id);
    setCat("All");
    setQuery("");
    toast.success("Snippet created");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--teal)] text-white shadow-sm">
            <Code2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Reusable
            </div>
            <h1 className="text-xl font-bold tracking-tight">Snippets Library</h1>
          </div>
        </div>
        <button
          onClick={createSnippet}
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--blue)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> New Snippet
        </button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <aside className="col-span-12 rounded-xl border border-border bg-card p-3 card-elevated md:col-span-4">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search snippets..."
              className="h-8 pl-7 text-xs"
            />
          </div>
          <div className="mb-3 flex flex-wrap gap-1">
            {CATS.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors",
                  cat === c
                    ? "border-[var(--teal)] bg-[var(--teal)]/10 text-[var(--teal)]"
                    : "border-border bg-background text-muted-foreground hover:bg-accent",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="max-h-[540px] space-y-0.5 overflow-y-auto pr-1">
            {snippets.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground">
                No snippets yet. Create one to reuse tuning across your builders.
              </div>
            ) : shown.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground">
                Nothing matches this search.
              </div>
            ) : (
              shown.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s.id)}
                  className={cn(
                    "flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left transition-colors",
                    active?.id === s.id ? "bg-accent" : "hover:bg-accent/60",
                  )}
                >
                  <span className="flex items-center gap-1 text-xs font-semibold">
                    {s.favorite && <Star className="h-3 w-3 fill-[var(--amber)] text-[var(--amber)]" />}
                    {s.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {s.category} · {s.language}
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="col-span-12 rounded-xl border border-border bg-card p-5 card-elevated md:col-span-8">
          {!active ? (
            <div className="text-xs text-muted-foreground">
              Select a snippet, or create one to get started.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <Input
                    value={active.name}
                    onChange={(e) => store.updateSnippet(active.id, { name: e.target.value })}
                    placeholder="Snippet name"
                    className="h-8 text-sm font-semibold"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={active.category}
                      onChange={(e) => store.updateSnippet(active.id, { category: e.target.value })}
                      className="h-7 rounded-md border border-border bg-background px-2 text-[11px]"
                    >
                      {EDITABLE_CATS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <select
                      value={active.language}
                      onChange={(e) =>
                        store.updateSnippet(active.id, {
                          language: e.target.value as Snippet["language"],
                        })
                      }
                      className="h-7 rounded-md border border-border bg-background px-2 text-[11px]"
                    >
                      {LANGS.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                    <Input
                      value={active.tags.join(", ")}
                      onChange={(e) =>
                        store.updateSnippet(active.id, {
                          tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                        })
                      }
                      placeholder="tags, comma separated"
                      className="h-7 max-w-[240px] text-[11px]"
                    />
                  </div>
                  {active.tags.length > 0 && (
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
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => store.updateSnippet(active.id, { favorite: !active.favorite })}
                    title={active.favorite ? "Remove from favourites" : "Add to favourites"}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium hover:bg-accent"
                  >
                    <Star
                      className={cn(
                        "h-3 w-3",
                        active.favorite && "fill-[var(--amber)] text-[var(--amber)]",
                      )}
                    />
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(active.body);
                      toast.success("Copied to clipboard");
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium hover:bg-accent"
                  >
                    <Copy className="h-3 w-3" /> Copy
                  </button>
                  <button
                    onClick={() => {
                      store.deleteSnippet(active.id);
                      setSelected("");
                      toast.success("Snippet deleted");
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-[var(--red)] hover:bg-accent"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <Textarea
                value={active.body}
                onChange={(e) => store.updateSnippet(active.id, { body: e.target.value })}
                className="min-h-[280px] font-mono text-[11px]"
              />
              <p className="text-[10px] text-muted-foreground">
                Snippets are reusable text you paste into other builders. They are saved with the
                project but are not compiled into the package on their own.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
