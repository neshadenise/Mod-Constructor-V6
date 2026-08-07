/**
 * In-Game UI Preview Studio.
 *
 * A unified preview engine for every Sims 4 presentation pattern — TNS
 * notifications, chance cards, chained adventures, phone calls, modal dialogs,
 * confirmations, pickers, branch selection, promotion / demotion results, event
 * invitations, tutorials and milestone notices — sharing one asset pool
 * (Sim portraits, career icons, branch covers, strings and outcome data).
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Copy, Play, Sparkles, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  CAREER_PREVIEW_PRESETS,
  TEMPLATES,
  TEMPLATE_BY_KIND,
  createDoc,
} from "@/lib/preview-engine/registry";
import type { PreviewDoc, PreviewKind } from "@/lib/preview-engine/types";
import { FieldRenderer } from "./engine/FieldEditor";
import { PreviewRenderer, type PreviewBranch } from "./engine/Templates";
import { resolveCover, type CoverSet } from "@/lib/cover/types";

const storageKey = (projectId: string) => `mc.preview-engine.${projectId}`;

function loadDocs(projectId: string): PreviewDoc[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    return raw ? (JSON.parse(raw) as PreviewDoc[]) : [];
  } catch {
    return [];
  }
}

function saveDocs(projectId: string, docs: PreviewDoc[]) {
  try {
    window.localStorage.setItem(storageKey(projectId), JSON.stringify(docs));
  } catch {
    /* quota — preview docs are non-critical */
  }
}

/** Career branches of the active project, with cover art resolved. */
function useProjectBranches(projectId?: string) {
  const store = useStore();
  return useMemo<{ branches: PreviewBranch[]; careerName?: string; cover?: string }>(() => {
    if (!projectId) return { branches: [] };
    const career = store.state.careers.find((c) => c.projectId === projectId);
    if (!career) return { branches: [] };
    const state = (career.builderState ?? {}) as {
      branches?: {
        id: string;
        name: string;
        description: string;
        emoji?: string;
        color?: string;
        ranks?: { lvl: number; title: string; simoleonsPerHour?: number }[];
      }[];
      covers?: CoverSet;
      coverImage?: string;
    };
    const covers = state.covers;
    const careerCover = resolveCover(covers)?.master ?? state.coverImage ?? career.coverImage;
    const branches = (state.branches ?? []).map((b) => ({
      key: b.id,
      name: b.name,
      description: b.description,
      emoji: b.emoji,
      color: b.color,
      cover: resolveCover(covers, b.id)?.master ?? careerCover,
      levels: (b.ranks ?? []).map((r) => ({
        level: r.lvl,
        title: r.title,
        pay: String(r.simoleonsPerHour ?? 0),
      })),
    }));
    return { branches, careerName: career.name, cover: careerCover };
  }, [projectId, store.state.careers]);
}

export function PreviewStudio() {
  const store = useStore();
  const projectId = store.state.activeProjectId ?? "";
  const { branches, careerName, cover } = useProjectBranches(projectId);

  const [docs, setDocs] = useState<PreviewDoc[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!projectId) return;
    const loaded = loadDocs(projectId);
    setDocs(loaded);
    setActiveId(loaded[0]?.id ?? null);
  }, [projectId]);

  const persist = (next: PreviewDoc[]) => {
    setDocs(next);
    if (projectId) saveDocs(projectId, next);
  };

  const doc = docs.find((d) => d.id === activeId) ?? null;
  const template = doc ? TEMPLATE_BY_KIND[doc.kind] : null;

  const addDoc = (kind: PreviewKind, overrides?: Partial<PreviewDoc>, name?: string) => {
    const created = {
      ...createDoc(kind, projectId, name),
      ...overrides,
      careerName: overrides?.careerName ?? careerName ?? undefined,
    } as PreviewDoc;
    persist([created, ...docs]);
    setActiveId(created.id);
    toast.success(`${name ?? TEMPLATE_BY_KIND[kind].label} added`);
  };

  const patch = (p: Partial<PreviewDoc>) => {
    if (!doc) return;
    persist(docs.map((d) => (d.id === doc.id ? { ...d, ...p, updatedAt: Date.now() } : d)));
  };

  const changeKind = (kind: PreviewKind) => {
    if (!doc) return;
    const fresh = createDoc(kind, projectId);
    persist(
      docs.map((d) =>
        d.id === doc.id
          ? { ...fresh, id: d.id, name: d.name, careerName: careerName ?? fresh.careerName, updatedAt: Date.now() }
          : d,
      ),
    );
  };

  const filtered = docs.filter(
    (d) =>
      q === "" ||
      d.name.toLowerCase().includes(q.toLowerCase()) ||
      d.title.toLowerCase().includes(q.toLowerCase()),
  );

  if (!projectId) {
    return <p className="text-sm text-muted-foreground">Open a project to build in-game UI previews.</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-[260px_minmax(0,1fr)_minmax(0,420px)]">
      {/* ---- library ---- */}
      <aside className="rounded-xl border border-border bg-card p-3">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-[13px] font-bold">Preview Library</h3>
        </div>
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search previews"
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-7 pr-2 text-[12px] outline-none focus:border-primary"
          />
        </div>

        <div className="max-h-[280px] space-y-1 overflow-auto">
          {filtered.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setActiveId(d.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left",
                d.id === activeId ? "border-primary bg-primary/8" : "border-transparent hover:bg-muted",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold">{d.name}</span>
                <span className="block truncate text-[10px] text-muted-foreground">
                  {TEMPLATE_BY_KIND[d.kind].label}
                </span>
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  const next = docs.filter((x) => x.id !== d.id);
                  persist(next);
                  if (activeId === d.id) setActiveId(next[0]?.id ?? null);
                }}
                onKeyDown={() => {}}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-1 py-3 text-[11.5px] text-muted-foreground">
              No previews yet — start from a UI pattern below.
            </p>
          )}
        </div>

        <div className="mt-3 border-t border-border pt-2">
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            New from UI pattern
          </div>
          <div className="max-h-[200px] space-y-1 overflow-auto">
            {TEMPLATES.map((t) => (
              <button
                key={t.kind}
                type="button"
                onClick={() => addDoc(t.kind)}
                className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-muted"
              >
                <Plus className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block truncate text-[11.5px] font-semibold">{t.label}</span>
                  <span className="block text-[10px] leading-snug text-muted-foreground">{t.blurb}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 border-t border-border pt-2">
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Career presets
          </div>
          <div className="flex flex-wrap gap-1">
            {CAREER_PREVIEW_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => addDoc(p.kind, p.overrides, p.label)}
                className="rounded-full border border-border px-2 py-0.5 text-[10.5px] font-semibold text-muted-foreground hover:border-primary hover:text-primary"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* ---- editor ---- */}
      <section className="rounded-xl border border-border bg-card p-4">
        {!doc || !template ? (
          <p className="text-[12.5px] text-muted-foreground">
            Select a preview on the left, or create one from a Sims 4 UI pattern.
          </p>
        ) : (
          <>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <label>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Preview name
                </span>
                <input
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-[12.5px] outline-none focus:border-primary"
                  value={doc.name}
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </label>
              <label>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Preview type
                </span>
                <select
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-[12.5px] outline-none focus:border-primary"
                  value={doc.kind}
                  onChange={(e) => changeKind(e.target.value as PreviewKind)}
                >
                  {TEMPLATES.map((t) => (
                    <option key={t.kind} value={t.kind}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mb-3 rounded-lg bg-muted/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
              {template.blurb}
            </p>

            <div className="grid grid-cols-2 gap-3">
              {template.fields.map((f) => (
                <FieldRenderer
                  key={String(f.key)}
                  field={f}
                  doc={doc}
                  template={template}
                  branches={branches}
                  onPatch={patch}
                />
              ))}
            </div>

            <div className="mt-4 flex gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => {
                  const copy = { ...doc, id: `${doc.id}_c${Date.now().toString(36)}`, name: `${doc.name} copy` };
                  persist([copy, ...docs]);
                  setActiveId(copy.id);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11.5px] font-semibold hover:bg-muted"
              >
                <Copy className="h-3.5 w-3.5" /> Duplicate
              </button>
              <button
                type="button"
                onClick={() => toast.success("Preview saved to this project")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-[11.5px] font-semibold text-primary-foreground"
              >
                <Play className="h-3.5 w-3.5" /> Save & preview
              </button>
            </div>
          </>
        )}
      </section>

      {/* ---- live preview ---- */}
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[13px] font-bold">Live In-Game Preview</h3>
          {doc && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {TEMPLATE_BY_KIND[doc.kind].category}
            </span>
          )}
        </div>
        <div
          data-preview-theme="dark"
          className="flex min-h-[340px] items-start justify-center rounded-xl p-4"
          style={{
            background:
              "radial-gradient(120% 100% at 50% 0%, oklch(0.32 0.05 240), oklch(0.18 0.03 250))",
            color: "white",
          }}
        >
          {doc ? (
            <PreviewRenderer key={`${doc.id}-${doc.kind}`} doc={doc} ctx={{ branches, cover }} />
          ) : (
            <p className="mt-10 text-[12px] opacity-70">Nothing selected.</p>
          )}
        </div>
        <p className="mt-2 text-[10.5px] text-muted-foreground">
          Choices are clickable: random outcomes roll live against their success chance, and chained steps advance
          through the sequence exactly as the player would experience them.
        </p>
      </section>
    </div>
  );
}
