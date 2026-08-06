/**
 * EA interaction library: faceted search, behaviour-based grouping, result
 * cards, and the two distinct add actions (reference vs clone).
 */

import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  Eye,
  Filter,
  Link2,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge, Btn, Chip, EmptyHint, Panel, TextInput } from "@/components/mc/trait/primitives";
import { lookupRefs } from "@/lib/gamedata/registry";
import {
  ALL_PACKS,
  EA_INTERACTIONS,
  emptyQuery,
  groupByCategory,
  searchInteractions,
  type EaInteraction,
  type InteractionQuery,
} from "@/lib/interactions/catalog";
import {
  AGES,
  INTERACTION_CATEGORIES,
  INTERACTION_KINDS,
  INTERACTION_KIND_LABEL,
  SPECIES,
  TARGET_TYPES,
  type InteractionCategory,
} from "@/lib/interactions/schema";

export function InteractionLibrary({
  installedPacks,
  onReference,
  onClone,
}: {
  installedPacks: string[];
  onReference: (ea: EaInteraction) => void;
  onClone: (ea: EaInteraction) => void;
}) {
  const [q, setQ] = useState<InteractionQuery>(emptyQuery);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<"grouped" | "flat">("grouped");
  const [inspect, setInspect] = useState<EaInteraction | null>(null);
  const [resolved, setResolved] = useState<Record<string, string>>({});

  // Resolve real instance ids from the user's install / Lot51 when possible.
  // Ids are only ever shown when a trusted source returned them.
  useEffect(() => {
    let cancelled = false;
    const text = q.text.trim();
    if (text.length < 3) return;
    void lookupRefs(text, { kind: "interaction", limit: 40 })
      .then((res) => {
        if (cancelled) return;
        const map: Record<string, string> = {};
        for (const ref of res.refs) map[ref.name.toLowerCase()] = ref.id;
        setResolved((cur) => ({ ...cur, ...map }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [q.text]);

  const results = useMemo(
    () =>
      searchInteractions(q).map((i) => ({
        ...i,
        ...(resolved[i.tuningName.toLowerCase()]
          ? { instanceId: resolved[i.tuningName.toLowerCase()] }
          : {}),
      })),
    [q, resolved],
  );
  const grouped = useMemo(() => groupByCategory(results), [results]);

  const toggle = <K extends keyof InteractionQuery>(key: K, value: string) =>
    setQ((cur) => {
      const list = cur[key] as unknown as string[];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...cur, [key]: next } as InteractionQuery;
    });

  const activeFilters =
    q.categories.length + q.kinds.length + q.targetTypes.length + q.packs.length + q.ages.length + q.species.length;

  return (
    <div className="space-y-3">
      <Panel
        title="EA interaction library"
        subtitle={`${EA_INTERACTIONS.length} curated interactions, organised by what they actually do. Instance ids appear only when your install or Lot51 confirms them.`}
        actions={
          <>
            <Btn icon={Filter} onClick={() => setFiltersOpen((v) => !v)}>
              Filters{activeFilters ? ` (${activeFilters})` : ""}
            </Btn>
            <Btn icon={RotateCcw} onClick={() => setQ(emptyQuery())}>
              Reset
            </Btn>
          </>
        }
      >
        <div className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <TextInput
            value={q.text}
            placeholder="Search name, tuning name, class, pack, animation, trait, buff, skill or resource id…"
            onChange={(e) => setQ({ ...q, text: e.target.value })}
          />
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip active={view === "grouped"} onClick={() => setView("grouped")}>
            By behaviour
          </Chip>
          <Chip active={view === "flat"} onClick={() => setView("flat")}>
            Flat list
          </Chip>
          <span className="mx-1 w-px bg-border" />
          <Chip active={q.animatedOnly} onClick={() => setQ({ ...q, animatedOnly: !q.animatedOnly })}>
            Animated
          </Chip>
          <Chip active={q.autonomousOnly} onClick={() => setQ({ ...q, autonomousOnly: !q.autonomousOnly })}>
            Autonomous
          </Chip>
          <Chip active={q.routedOnly} onClick={() => setQ({ ...q, routedOnly: !q.routedOnly })}>
            Routed
          </Chip>
          <Chip active={q.minParticipants >= 2} onClick={() => setQ({ ...q, minParticipants: q.minParticipants >= 2 ? 0 : 2 })}>
            Multi-Sim
          </Chip>
          <span className="ml-auto self-center text-[11px] text-muted-foreground">
            {results.length} match{results.length === 1 ? "" : "es"}
          </span>
        </div>

        {filtersOpen && (
          <div className="mt-3 space-y-3 rounded-lg border border-border bg-background/50 p-2.5">
            <FilterRow label="Category">
              {INTERACTION_CATEGORIES.map((c) => (
                <Chip key={c} active={q.categories.includes(c)} onClick={() => toggle("categories", c)}>
                  {c}
                </Chip>
              ))}
            </FilterRow>
            <FilterRow label="Interaction type">
              {INTERACTION_KINDS.map((k) => (
                <Chip key={k} active={q.kinds.includes(k)} onClick={() => toggle("kinds", k)}>
                  {INTERACTION_KIND_LABEL[k]}
                </Chip>
              ))}
            </FilterRow>
            <FilterRow label="Target type">
              {TARGET_TYPES.map((t) => (
                <Chip key={t} active={q.targetTypes.includes(t)} onClick={() => toggle("targetTypes", t)}>
                  {t.replace(/_/g, " ")}
                </Chip>
              ))}
            </FilterRow>
            <FilterRow label="Pack">
              {ALL_PACKS.map((p) => (
                <Chip key={p} active={q.packs.includes(p)} onClick={() => toggle("packs", p)}>
                  {p}
                </Chip>
              ))}
            </FilterRow>
            <FilterRow label="Age">
              {AGES.map((a) => (
                <Chip key={a} active={q.ages.includes(a)} onClick={() => toggle("ages", a)}>
                  {a}
                </Chip>
              ))}
            </FilterRow>
            <FilterRow label="Species">
              {SPECIES.map((s) => (
                <Chip key={s} active={q.species.includes(s)} onClick={() => toggle("species", s)}>
                  {s}
                </Chip>
              ))}
            </FilterRow>
          </div>
        )}
      </Panel>

      {!results.length && <EmptyHint>Nothing matches those filters yet — try clearing a few.</EmptyHint>}

      {view === "flat" ? (
        <div className="grid gap-2 xl:grid-cols-2">
          {results.map((i) => (
            <ResultCard
              key={i.id}
              ea={i}
              installedPacks={installedPacks}
              onReference={onReference}
              onClone={onClone}
              onInspect={setInspect}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map(({ category, items }) => (
            <CategoryBlock
              key={category}
              category={category}
              items={items}
              installedPacks={installedPacks}
              onReference={onReference}
              onClone={onClone}
              onInspect={setInspect}
            />
          ))}
        </div>
      )}

      {inspect && <StructureViewer ea={inspect} onClose={() => setInspect(null)} />}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function CategoryBlock({
  category,
  items,
  installedPacks,
  onReference,
  onClone,
  onInspect,
}: {
  category: InteractionCategory;
  items: EaInteraction[];
  installedPacks: string[];
  onReference: (ea: EaInteraction) => void;
  onClone: (ea: EaInteraction) => void;
  onInspect: (ea: EaInteraction) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span className="text-[12.5px] font-semibold">{category}</span>
        <Badge tone="muted">{items.length}</Badge>
        <span className="ml-auto text-[11px] text-muted-foreground">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="grid gap-2 border-t border-border p-2 xl:grid-cols-2">
          {items.map((i) => (
            <ResultCard
              key={i.id}
              ea={i}
              installedPacks={installedPacks}
              onReference={onReference}
              onClone={onClone}
              onInspect={onInspect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ResultCard({
  ea,
  installedPacks,
  onReference,
  onClone,
  onInspect,
}: {
  ea: EaInteraction;
  installedPacks: string[];
  onReference: (ea: EaInteraction) => void;
  onClone: (ea: EaInteraction) => void;
  onInspect: (ea: EaInteraction) => void;
}) {
  const packInstalled = ea.pack === "Base Game" || !installedPacks.length || installedPacks.includes(ea.pack);
  return (
    <div className="rounded-lg border border-border bg-background/60 p-2.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold">{ea.displayName}</p>
          <p className="truncate font-mono text-[10px] text-muted-foreground">{ea.tuningName}</p>
        </div>
        <Badge tone={packInstalled ? "ok" : "warn"}>{packInstalled ? "compatible" : "pack missing"}</Badge>
      </div>

      <p className="mt-1.5 text-[11px] text-muted-foreground">{ea.summary}</p>

      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10.5px]">
        <Row label="Resource" value="Interaction tuning" />
        <Row label="Class" value={ea.interactionClass} />
        <Row label="Tuning id" value={ea.instanceId ?? "not resolved locally"} mono />
        <Row label="Pack" value={ea.pack} />
        <Row label="Type" value={ea.kind.replace(/_/g, " ")} />
        <Row label="Target" value={ea.targetType.replace(/_/g, " ")} />
        <Row label="Actor" value={ea.actorType} />
        <Row label="Participants" value={String(ea.participants)} />
      </dl>

      <div className="mt-2 flex flex-wrap gap-1">
        {ea.categories.slice(0, 5).map((c) => (
          <Badge key={c} tone="accent">
            {c}
          </Badge>
        ))}
        {ea.routing && <Badge tone="muted">routes</Badge>}
        {ea.animated && <Badge tone="muted">animated</Badge>}
        {ea.autonomous && <Badge tone="muted">autonomous</Badge>}
        {ea.hasTests && <Badge tone="muted">has tests</Badge>}
        {ea.hasOutcomes && <Badge tone="muted">has outcomes</Badge>}
        {ea.referencesInteractions && <Badge tone="muted">chains interactions</Badge>}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Btn icon={Eye} onClick={() => onInspect(ea)}>
          Preview structure
        </Btn>
        <Btn
          icon={Link2}
          onClick={() => {
            onReference(ea);
            toast.success(`Added a reference to ${ea.displayName} — EA's tuning is untouched`);
          }}
        >
          Add existing
        </Btn>
        <Btn
          icon={Copy}
          variant="primary"
          onClick={() => {
            onClone(ea);
            toast.success("Cloned into a new project-owned tuning with a fresh instance id");
          }}
        >
          Clone & customize
        </Btn>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <dt className="truncate text-muted-foreground">{label}</dt>
      <dd className={cn("truncate", mono && "font-mono text-[10px]")} title={value}>
        {value}
      </dd>
    </>
  );
}

function StructureViewer({ ea, onClose }: { ea: EaInteraction; onClose: () => void }) {
  const lines = [
    `<I c="${ea.interactionClass}" n="${ea.tuningName}">`,
    `  <T n="target_type">${ea.targetType}</T>`,
    `  <T n="participants">${ea.participants}</T>`,
    `  <T n="pie_menu_category">${ea.pieMenuCategory}</T>`,
    `  <T n="allow_autonomous">${ea.autonomous ? "True" : "False"}</T>`,
    ea.animationRef ? `  <T n="animation">${ea.animationRef}</T>` : "",
    ea.requiredSkill ? `  <T n="required_skill">${ea.requiredSkill}</T>` : "",
    ea.requiredTrait ? `  <T n="required_trait">${ea.requiredTrait}</T>` : "",
    ea.hasTests ? `  <L n="tests"><!-- EA test set --></L>` : "",
    ea.hasOutcomes ? `  <L n="outcomes"><!-- EA outcomes --></L>` : "",
    `</I>`,
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl border border-border bg-card p-4 shadow-xl">
        <div className="mb-2 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-[13px] font-semibold">{ea.displayName}</h3>
            <p className="font-mono text-[10px] text-muted-foreground">{ea.tuningName}</p>
          </div>
          <Btn onClick={onClose}>Close</Btn>
        </div>
        <p className="mb-2 rounded-md bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-500">
          Read-only structural summary, not EA's verbatim tuning. Cloning copies this shape into a new
          project-owned resource — the original file is never modified.
        </p>
        <pre className="overflow-auto rounded-lg border border-border bg-muted/30 p-2 font-mono text-[10.5px] leading-relaxed">
          {lines.join("\n")}
        </pre>
        {ea.usedByNote && <p className="mt-2 text-[11px] text-muted-foreground">{ea.usedByNote}</p>}
      </div>
    </div>
  );
}

/** Optional note some catalogue entries carry. */
declare module "@/lib/interactions/catalog" {
  interface EaInteraction {
    usedByNote?: string;
  }
}

export const AddInteractionHint = () => (
  <p className="text-[11px] text-muted-foreground">
    <Plus className="mr-1 inline h-3 w-3" />
    “Add existing” stores a reference only — nothing is copied, and the interaction stays EA's. “Clone &amp;
    customize” mints a new tuning name and instance id you own and can freely edit.
  </p>
);
