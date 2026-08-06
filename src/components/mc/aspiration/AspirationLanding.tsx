/**
 * Aspiration landing — every aspiration in the ACTIVE project, never others.
 *
 * Each card shows real state: validation, milestone/objective counts, reward
 * trait, health contribution and export status. Nothing here is mocked.
 */

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileDown,
  FolderInput,
  LayoutTemplate,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore, useActiveProject } from "@/lib/store";
import { migrateAspirationDoc } from "@/lib/aspirations/migrate";
import {
  ASPIRATION_CATEGORIES,
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  aspirationTypeSpec,
  completeness,
  isVisible,
  objectiveCount,
  type AspirationDoc,
} from "@/lib/aspirations/schema";
import { validateAspiration } from "@/lib/aspirations/validate";
import { requiredPacks, resolveRef, type ResolveContext } from "@/lib/aspirations/resolver";
import { ASPIRATION_TEMPLATES, type AspirationTemplate } from "@/lib/aspirations/templates";
import { Badge, Btn, Chip, EmptyHint, Panel, SelectInput, TextInput } from "@/components/mc/trait/primitives";

type SortId =
  | "alpha" | "recent" | "created" | "category" | "difficulty" | "validation" | "complete";

const SORTS: { value: SortId; label: string }[] = [
  { value: "recent", label: "Recently edited" },
  { value: "alpha", label: "Alphabetical" },
  { value: "created", label: "Creation date" },
  { value: "category", label: "Category" },
  { value: "difficulty", label: "Difficulty" },
  { value: "validation", label: "Validation score" },
  { value: "complete", label: "Completion %" },
];

export function AspirationLanding({
  ctx,
  onOpen,
  onCreate,
  onCreateFromTemplate,
  onImport,
  onDuplicate,
  onRename,
  onDelete,
  onExport,
  onBatchValidate,
}: {
  ctx: ResolveContext;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onCreateFromTemplate: (t: AspirationTemplate) => void;
  onImport: () => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
  onBatchValidate: () => void;
}) {
  const store = useStore();
  const project = useActiveProject();

  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortId>("recent");
  const [category, setCategory] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [onlyInvalid, setOnlyInvalid] = useState(false);
  const [onlyReward, setOnlyReward] = useState(false);
  const [hidden, setHidden] = useState<"all" | "visible" | "hidden">("all");
  const [showTemplates, setShowTemplates] = useState(false);

  const rows = useMemo(() => {
    return store.state.aspirations
      .filter((a) => a.projectId === project?.id)
      .map((a) => {
        const doc: AspirationDoc = migrateAspirationDoc(a);
        const v = validateAspiration(doc, ctx, a.id);
        const reward = doc.rewardTrait ? resolveRef(doc.rewardTrait, ctx) : null;
        return {
          id: a.id,
          doc,
          v,
          reward,
          packs: requiredPacks(doc, ctx),
          updatedAt: a.updatedAt ?? doc.updatedAt,
          createdAt: a.createdAt ?? doc.createdAt,
        };
      });
  }, [store.state.aspirations, project?.id, ctx]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (n && ![r.doc.displayName, r.doc.ids.internalName, r.doc.category, r.doc.aspirationType]
        .join(" ").toLowerCase().includes(n)) return false;
      if (category !== "all" && r.doc.category !== category) return false;
      if (difficulty !== "all" && r.doc.difficulty !== difficulty) return false;
      if (onlyInvalid && r.v.errors === 0) return false;
      if (onlyReward && !r.doc.rewardTrait) return false;
      if (hidden === "visible" && !isVisible(r.doc)) return false;
      if (hidden === "hidden" && isVisible(r.doc)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "alpha": return a.doc.displayName.localeCompare(b.doc.displayName);
        case "created": return b.createdAt - a.createdAt;
        case "category": return a.doc.category.localeCompare(b.doc.category);
        case "difficulty": return DIFFICULTIES.indexOf(b.doc.difficulty) - DIFFICULTIES.indexOf(a.doc.difficulty);
        case "validation": return b.v.score - a.v.score;
        case "complete": return completeness(b.doc) - completeness(a.doc);
        default: return b.updatedAt - a.updatedAt;
      }
    });
    return list;
  }, [rows, q, category, difficulty, onlyInvalid, onlyReward, hidden, sort]);

  const totals = useMemo(
    () => ({
      errors: rows.reduce((n, r) => n + r.v.errors, 0),
      warnings: rows.reduce((n, r) => n + r.v.warnings, 0),
      health: rows.length ? Math.round(rows.reduce((n, r) => n + r.v.score, 0) / rows.length) : 100,
    }),
    [rows],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card/60 px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Project</div>
        <div className="text-[15px] font-semibold tracking-tight">{project?.name ?? "No project"}</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <Badge tone="muted">{rows.length} aspirations</Badge>
          <Badge tone={totals.errors ? "error" : "ok"}>{totals.errors} errors</Badge>
          <Badge tone={totals.warnings ? "warn" : "muted"}>{totals.warnings} warnings</Badge>
          <Badge tone={totals.health > 80 ? "ok" : totals.health > 50 ? "warn" : "error"}>
            avg health {totals.health}
          </Badge>
        </div>
      </div>

      <Panel
        title="Aspiration Builder"
        subtitle="Only aspirations belonging to the active project are ever shown."
        actions={
          <>
            <Btn icon={LayoutTemplate} onClick={() => setShowTemplates((s) => !s)}>From template</Btn>
            <Btn icon={FolderInput} onClick={onImport}>Import</Btn>
            <Btn icon={ShieldCheck} onClick={onBatchValidate}>Batch validate</Btn>
            <Btn icon={Plus} variant="primary" onClick={onCreate}>New aspiration</Btn>
          </>
        }
      >
        {showTemplates && (
          <div className="mb-3 grid gap-2 rounded-md border border-border bg-background/60 p-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {ASPIRATION_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setShowTemplates(false); onCreateFromTemplate(t); }}
                className="rounded-md border border-border bg-card px-2.5 py-2 text-left transition-colors hover:bg-muted"
              >
                <div className="text-[12px] font-semibold">{t.label}</div>
                <div className="text-[10.5px] text-muted-foreground">{t.blurb}</div>
                <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {t.structure.length} milestones ·{" "}
                  {t.structure.reduce((n, [, o]) => n + o.length, 0)} objectives
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mb-3 grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search aspirations…" className="pl-8" />
          </div>
          <SelectInput
            value={category}
            onChange={setCategory}
            options={[{ value: "all", label: "All categories" }, ...ASPIRATION_CATEGORIES.map((c) => ({ value: c, label: c }))]}
          />
          <SelectInput
            value={difficulty}
            onChange={setDifficulty}
            options={[{ value: "all", label: "All difficulties" }, ...DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABEL[d] }))]}
          />
          <SelectInput value={sort} onChange={(v) => setSort(v as SortId)} options={SORTS} />
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          <Chip active={onlyInvalid} onClick={() => setOnlyInvalid((s) => !s)}>Has errors</Chip>
          <Chip active={onlyReward} onClick={() => setOnlyReward((s) => !s)}>Has reward trait</Chip>
          <Chip active={hidden === "visible"} onClick={() => setHidden(hidden === "visible" ? "all" : "visible")}>Visible</Chip>
          <Chip active={hidden === "hidden"} onClick={() => setHidden(hidden === "hidden" ? "all" : "hidden")}>Hidden</Chip>
        </div>

        {filtered.length === 0 ? (
          <EmptyHint>
            {rows.length === 0
              ? "No aspirations in this project yet. Create one, or start from a template."
              : "No aspirations match those filters."}
          </EmptyHint>
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {filtered.map(({ id, doc, v, reward, packs, updatedAt }) => {
              const spec = aspirationTypeSpec(doc.aspirationType);
              const pct = completeness(doc);
              return (
                <article key={id} className="rounded-lg border border-border bg-background/60 p-3">
                  <header className="flex items-start gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-[15px]">
                      {doc.icon ? "🖼" : "🎯"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => onOpen(id)}
                        className="truncate text-[13px] font-semibold hover:underline"
                      >
                        {doc.displayName || "Untitled aspiration"}
                      </button>
                      <div className="truncate font-mono text-[10px] text-muted-foreground">
                        {doc.ids.namespace}:{doc.ids.internalName}
                      </div>
                    </div>
                    <Badge tone={v.errors ? "error" : v.warnings ? "warn" : "ok"}>
                      {v.errors ? `${v.errors} errors` : v.warnings ? `${v.warnings} warnings` : "valid"}
                    </Badge>
                  </header>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone="muted">{spec.label}</Badge>
                    <Badge tone="muted">{doc.category}</Badge>
                    <Badge tone="muted">{DIFFICULTY_LABEL[doc.difficulty]}</Badge>
                    <Badge tone="muted">{doc.milestones.length} milestones</Badge>
                    <Badge tone="muted">{objectiveCount(doc)} objectives</Badge>
                    <Badge tone={isVisible(doc) ? "accent" : "muted"}>{isVisible(doc) ? "visible" : "hidden"}</Badge>
                    {packs.map((p) => <Badge key={p} tone="accent">{p}</Badge>)}
                  </div>

                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10.5px] text-muted-foreground">
                    <div className="flex justify-between gap-2">
                      <dt>Reward trait</dt>
                      <dd className={cn("truncate font-medium", reward && reward.status !== "ok" && "text-red-500")}>
                        {reward ? reward.label || reward.tuningName : "none"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Health</dt>
                      <dd className="font-medium">{v.score}/100</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Complete</dt>
                      <dd className="font-medium">{pct}%</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Modified</dt>
                      <dd className="font-medium">{new Date(updatedAt).toLocaleDateString()}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Export</dt>
                      <dd className="flex items-center gap-1 font-medium">
                        {doc.ids.lastBuiltAt ? (
                          <><CheckCircle2 className="h-3 w-3 text-[var(--green,#22c55e)]" /> built</>
                        ) : (
                          <><AlertTriangle className="h-3 w-3 text-amber-500" /> never built</>
                        )}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>

                  <footer className="mt-2 flex flex-wrap gap-1.5">
                    <Btn variant="primary" onClick={() => onOpen(id)}>Open</Btn>
                    <Btn icon={Copy} onClick={() => onDuplicate(id)}>Duplicate</Btn>
                    <Btn
                      icon={Pencil}
                      onClick={() => {
                        const next = window.prompt("Rename aspiration", doc.displayName);
                        if (next && next.trim()) onRename(id, next.trim());
                      }}
                    >
                      Rename
                    </Btn>
                    <Btn icon={FileDown} onClick={() => onExport(id)}>Export</Btn>
                    <Btn icon={Trash2} variant="danger" onClick={() => onDelete(id)}>Delete</Btn>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
