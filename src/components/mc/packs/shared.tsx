/**
 * Reusable Pack Mechanics editors.
 *
 * These components are purely presentational: they receive a value and an
 * onChange, and never touch the store directly (except the resource selector,
 * which reads project resources read-only). Data models live in
 * src/lib/packs/*, generator logic will live separately.
 */

import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronDown, ChevronRight, Plus, Trash2, AlertTriangle, AlertCircle, Info,
  Copy, Link2, Languages, Bell,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import {
  emptyConditionGroup, emptyConditionLeaf, emptyLoot, fnv32, rid,
  type BuildSupport, type ConditionGroup, type ConditionLeaf, type ConditionLogic,
  type ConditionNode, type ConditionOperator, type ConditionSubject,
  type LocalizedString, type LootAction, type NotifySpec, type NotifyStyle,
  type ResourceRef, type ResourceRefKind, type ResourceRefSource,
} from "@/lib/packs/types";
import type { PackIssue } from "@/lib/packs/validate";

/* ------------------------------------------------------------------ *
 * Layout primitives — compact, dense, no wasted space
 * ------------------------------------------------------------------ */

export function PackSection({
  title, subtitle, actions, children, defaultOpen = true,
}: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button onClick={() => setOpen((v) => !v)} className="flex flex-1 items-center gap-1.5 text-left">
          {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="text-[13px] font-semibold">{title}</span>
          {subtitle && <span className="text-[11px] text-muted-foreground">· {subtitle}</span>}
        </button>
        {actions}
      </header>
      {open && <div className="p-3">{children}</div>}
    </section>
  );
}

export function Grid({ cols = 3, children }: { cols?: 2 | 3 | 4; children: ReactNode }) {
  return (
    <div className={cn("grid gap-2.5", cols === 2 && "sm:grid-cols-2", cols === 3 && "sm:grid-cols-2 lg:grid-cols-3", cols === 4 && "sm:grid-cols-2 lg:grid-cols-4")}>
      {children}
    </div>
  );
}

function FieldShell({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
      {children}
      {error ? <p className="text-[10.5px] text-destructive">{error}</p>
        : hint ? <p className="text-[10.5px] text-muted-foreground/80">{hint}</p> : null}
    </div>
  );
}

export function TextField({ label, value, onChange, hint, error, placeholder, multiline }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string; error?: string; placeholder?: string; multiline?: boolean;
}) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {multiline
        ? <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className={cn("text-xs", error && "border-destructive")} />
        : <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cn("h-8 text-xs", error && "border-destructive")} />}
    </FieldShell>
  );
}

export function NumField({ label, value, onChange, hint, error, min, max, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; hint?: string; error?: string; min?: number; max?: number; step?: number;
}) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      <Input type="number" value={Number.isFinite(value) ? value : 0} min={min} max={max} step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn("h-8 text-xs", error && "border-destructive")} />
    </FieldShell>
  );
}

export function SelectField<T extends string>({ label, value, options, onChange, hint, error }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; hint?: string; error?: string;
}) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}
        className={cn("h-8 w-full rounded-md border border-input bg-background px-2 text-xs", error && "border-destructive")}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </FieldShell>
  );
}

export function BoolField({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5">
      <div>
        <div className="text-[11.5px] font-medium">{label}</div>
        {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

/** Comma-token list editor used for tags, packs, permissions, goals. */
export function TokenListField({ label, values, onChange, placeholder }: {
  label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...values, v]);
    setDraft("");
  };
  return (
    <FieldShell label={label}>
      <div className="flex flex-wrap gap-1 rounded-md border border-input p-1.5">
        {values.map((v, i) => (
          <Badge key={`${v}-${i}`} variant="secondary" className="gap-1 text-[10px]">
            {v}
            <button onClick={() => onChange(values.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">×</button>
          </Badge>
        ))}
        <input
          value={draft}
          placeholder={placeholder ?? "Add…"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
          onBlur={add}
          className="min-w-[80px] flex-1 bg-transparent px-1 text-[11px] outline-none"
        />
      </div>
    </FieldShell>
  );
}

/* ------------------------------------------------------------------ *
 * ResourceReferenceSelector
 * ------------------------------------------------------------------ */

const SOURCE_OPTIONS: { value: ResourceRefSource; label: string }[] = [
  { value: "none", label: "Not set" },
  { value: "ea-tuning", label: "Existing EA tuning" },
  { value: "project", label: "Existing project resource" },
  { value: "new", label: "New custom resource" },
  { value: "tuning-id", label: "Manual tuning ID" },
  { value: "instance-id", label: "Manual instance ID" },
  { value: "imported-xml", label: "Imported XML resource" },
  { value: "imported-package", label: "Imported package resource" },
];

export function ResourceReferenceSelector({ label, value, onChange, kind, error }: {
  label: string; value: ResourceRef; onChange: (v: ResourceRef) => void; kind?: ResourceRefKind; error?: string;
}) {
  const { state } = useStore();
  const activeId = state.activeProjectId;
  const k = kind ?? value.kind;

  // Project resources are linked by stable UUID; the label is display-only so
  // renaming a resource never breaks the reference.
  const projectOptions = useMemo(() => {
    const rows: { id: string; name: string; group: string }[] = [];
    const inProj = <T extends { projectId?: string; id: string; name: string }>(a: T[]) => a.filter((r) => r.projectId === activeId);
    if (k === "trait" || k === "any") inProj(state.traits).forEach((t) => rows.push({ id: t.id, name: t.name, group: "Traits" }));
    if (k === "career" || k === "any") inProj(state.careers).forEach((c) => rows.push({ id: c.id, name: c.name, group: "Careers" }));
    if (k === "aspiration" || k === "any") inProj(state.aspirations).forEach((a) => rows.push({ id: a.id, name: a.name, group: "Aspirations" }));
    if (k === "notification" || k === "dialogue" || k === "any") inProj(state.notifications).forEach((n) => rows.push({ id: n.id, name: n.name, group: "Notifications" }));
    if (k === "icon" || k === "object" || k === "cas-part" || k === "any") inProj(state.assets).forEach((a) => rows.push({ id: a.id, name: a.name, group: "Assets" }));
    return rows;
  }, [state, activeId, k]);

  const resolvedName = useMemo(() => {
    if (!value.refId) return undefined;
    return projectOptions.find((o) => o.id === value.refId)?.name;
  }, [projectOptions, value.refId]);

  const broken = value.source === "project" && value.refId && !resolvedName;

  return (
    <div className="space-y-1 rounded-md border border-border p-2">
      <div className="flex items-center gap-1.5">
        <Link2 className="h-3 w-3 text-muted-foreground" />
        <span className="text-[11px] font-medium">{label}</span>
        <Badge variant="outline" className="ml-auto text-[9px] uppercase">{k}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <select
          value={value.source}
          onChange={(e) => onChange({ ...value, source: e.target.value as ResourceRefSource, kind: k })}
          className="h-7 rounded-md border border-input bg-background px-1.5 text-[11px]"
        >
          {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {value.source === "project" || value.source === "new" ? (
          <select
            value={value.refId ?? ""}
            onChange={(e) => {
              const id = e.target.value;
              onChange({ ...value, refId: id || undefined, label: projectOptions.find((o) => o.id === id)?.name });
            }}
            className="h-7 rounded-md border border-input bg-background px-1.5 text-[11px]"
          >
            <option value="">Select resource…</option>
            {projectOptions.map((o) => <option key={o.id} value={o.id}>{o.group} · {o.name}</option>)}
          </select>
        ) : value.source === "none" ? (
          <div className="flex h-7 items-center px-1.5 text-[10.5px] text-muted-foreground">No reference</div>
        ) : (
          <Input
            value={value.tuningId ?? ""}
            placeholder={value.source === "instance-id" ? "0x00000000000000" : "Tuning ID / path"}
            onChange={(e) => onChange({ ...value, tuningId: e.target.value })}
            className="h-7 text-[11px]"
          />
        )}
      </div>
      {broken && <p className="text-[10.5px] text-destructive">Broken reference — the linked resource was deleted.</p>}
      {resolvedName && <p className="text-[10.5px] text-muted-foreground">Linked to <span className="font-medium text-foreground">{resolvedName}</span> · id {value.refId?.slice(0, 8)}</p>}
      {error && <p className="text-[10.5px] text-destructive">{error}</p>}
    </div>
  );
}

export function RefListEditor({ label, kind, values, onChange }: {
  label: string; kind: ResourceRefKind; values: ResourceRef[]; onChange: (v: ResourceRef[]) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10.5px]"
          onClick={() => onChange([...values, { id: rid(), kind, source: "none" }])}>
          <Plus className="mr-1 h-3 w-3" /> Add
        </Button>
      </div>
      {values.length === 0 && <p className="text-[10.5px] text-muted-foreground">None linked.</p>}
      {values.map((v, i) => (
        <div key={v.id} className="flex items-start gap-1.5">
          <div className="flex-1">
            <ResourceReferenceSelector label={`${label} ${i + 1}`} kind={kind} value={v}
              onChange={(nv) => onChange(values.map((x, j) => j === i ? nv : x))} />
          </div>
          <Button size="icon" variant="ghost" className="mt-1 h-6 w-6" onClick={() => onChange(values.filter((_, j) => j !== i))}>
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * LocalizationEditor
 * ------------------------------------------------------------------ */

const LANGS = ["fr-FR", "de-DE", "es-ES", "it-IT", "pt-BR", "ja-JP", "zh-CN", "ru-RU"];

export function LocalizationEditor({ label, value, onChange, multiline, error, keyPrefix }: {
  label: string; value: LocalizedString; onChange: (v: LocalizedString) => void;
  multiline?: boolean; error?: string; keyPrefix?: string;
}) {
  const [showLangs, setShowLangs] = useState(false);
  const setKey = (key: string) => onChange({ ...value, key, hash: key ? fnv32(key) : "" });
  const autoKey = () => {
    const base = `${keyPrefix ?? "MC6"}_${value.text.toUpperCase().replace(/[^A-Z0-9]+/g, "_").slice(0, 32)}`.replace(/_+$/, "");
    setKey(base);
  };
  const missing = value.text.trim() && !value.key.trim();
  return (
    <div className="space-y-1 rounded-md border border-border p-2">
      <div className="flex items-center gap-1.5">
        <Languages className="h-3 w-3 text-muted-foreground" />
        <span className="text-[11px] font-medium">{label}</span>
        {value.hash && <Badge variant="outline" className="ml-auto font-mono text-[9px]">{value.hash}</Badge>}
      </div>
      {multiline
        ? <Textarea rows={2} value={value.text} onChange={(e) => onChange({ ...value, text: e.target.value })} placeholder="Default English text" className="text-xs" />
        : <Input value={value.text} onChange={(e) => onChange({ ...value, text: e.target.value })} placeholder="Default English text" className="h-7 text-xs" />}
      <div className="flex items-center gap-1.5">
        <Input value={value.key} onChange={(e) => setKey(e.target.value)} placeholder="STBL string key"
          className={cn("h-7 flex-1 font-mono text-[10.5px]", (missing || error) && "border-destructive")} />
        <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" onClick={autoKey}>Auto key</Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => setShowLangs((v) => !v)}>
          {Object.keys(value.translations).length || 0} langs
        </Button>
      </div>
      {showLangs && (
        <div className="grid gap-1 pt-1 sm:grid-cols-2">
          {LANGS.map((l) => (
            <div key={l} className="flex items-center gap-1">
              <span className="w-12 shrink-0 font-mono text-[9.5px] text-muted-foreground">{l}</span>
              <Input value={value.translations[l] ?? ""} placeholder="—" className="h-6 text-[10.5px]"
                onChange={(e) => onChange({ ...value, translations: { ...value.translations, [l]: e.target.value } })} />
            </div>
          ))}
        </div>
      )}
      {missing && <p className="text-[10.5px] text-destructive">Missing STBL key — player-facing text must be localized.</p>}
      {error && <p className="text-[10.5px] text-destructive">{error}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * ConditionGroupBuilder
 * ------------------------------------------------------------------ */

const SUBJECTS: { value: ConditionSubject; label: string; refKind?: ResourceRefKind }[] = [
  { value: "age", label: "Age" }, { value: "gender", label: "Gender" },
  { value: "trait", label: "Trait", refKind: "trait" }, { value: "career", label: "Career", refKind: "career" },
  { value: "career-level", label: "Career level" }, { value: "skill", label: "Skill" },
  { value: "skill-level", label: "Skill level" }, { value: "aspiration", label: "Aspiration", refKind: "aspiration" },
  { value: "relationship-status", label: "Relationship status" }, { value: "family-relationship", label: "Family relationship" },
  { value: "occult", label: "Occult type" }, { value: "degree", label: "University degree" },
  { value: "household-funds", label: "Household funds" }, { value: "fame", label: "Fame level" },
  { value: "reputation", label: "Reputation" }, { value: "world", label: "World" },
  { value: "neighborhood", label: "Neighborhood" }, { value: "lot-type", label: "Lot type" },
  { value: "species", label: "Species" }, { value: "pregnancy", label: "Pregnancy status" },
  { value: "custom-trait", label: "Custom trait", refKind: "trait" }, { value: "custom-career", label: "Custom career", refKind: "career" },
  { value: "custom-statistic", label: "Custom statistic", refKind: "statistic" },
  { value: "tuning-id", label: "Existing tuning ID" }, { value: "pack-installed", label: "Pack installed" },
  { value: "time-of-day", label: "Time of day" }, { value: "day-of-week", label: "Day of week" },
  { value: "chance", label: "Chance (%)" }, { value: "household", label: "Household test" },
  { value: "object", label: "Object test", refKind: "object" }, { value: "zone", label: "Zone test" },
  { value: "relationship-bit", label: "Relationship bit", refKind: "relationship-bit" },
];

const OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: "is", label: "is" }, { value: "is-not", label: "is not" },
  { value: "has", label: "has" }, { value: "has-not", label: "does not have" },
  { value: "gte", label: "≥" }, { value: "lte", label: "≤" },
  { value: "gt", label: ">" }, { value: "lt", label: "<" },
  { value: "between", label: "between" }, { value: "contains", label: "contains" },
];

const LOGIC: { value: ConditionLogic; label: string }[] = [
  { value: "and", label: "ALL (AND)" }, { value: "or", label: "ANY (OR)" },
  { value: "not", label: "NONE (NOT)" }, { value: "min-match", label: "Minimum matched" },
];

export function ConditionGroupBuilder({ label, value, onChange, depth = 0, issues }: {
  label?: string; value: ConditionGroup; onChange: (v: ConditionGroup) => void; depth?: number; issues?: PackIssue[];
}) {
  const setChild = (i: number, node: ConditionNode) =>
    onChange({ ...value, children: value.children.map((c, j) => j === i ? node : c) });
  const remove = (i: number) => onChange({ ...value, children: value.children.filter((_, j) => j !== i) });

  return (
    <div className={cn("rounded-md border p-2", depth === 0 ? "border-border bg-muted/20" : "border-dashed border-border")}>
      <div className="flex flex-wrap items-center gap-1.5">
        {label && depth === 0 && <span className="text-[11px] font-semibold">{label}</span>}
        <select value={value.logic} onChange={(e) => onChange({ ...value, logic: e.target.value as ConditionLogic })}
          className="h-6 rounded border border-input bg-background px-1 text-[10.5px] font-medium">
          {LOGIC.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
        {value.logic === "min-match" && (
          <Input type="number" min={1} value={value.minMatch ?? 1} onChange={(e) => onChange({ ...value, minMatch: Number(e.target.value) })}
            className="h-6 w-16 text-[10.5px]" />
        )}
        <span className="text-[10px] text-muted-foreground">{value.children.length} condition(s)</span>
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]"
            onClick={() => onChange({ ...value, children: [...value.children, emptyConditionLeaf()] })}>
            <Plus className="mr-1 h-3 w-3" /> Condition
          </Button>
          {depth < 3 && (
            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]"
              onClick={() => onChange({ ...value, children: [...value.children, emptyConditionGroup("or")] })}>
              <Plus className="mr-1 h-3 w-3" /> Group
            </Button>
          )}
        </div>
      </div>

      <div className="mt-1.5 space-y-1.5">
        {value.children.map((c, i) => (
          <div key={c.id} className="flex items-start gap-1">
            <div className="flex-1">
              {c.type === "group"
                ? <ConditionGroupBuilder value={c} onChange={(g) => setChild(i, g)} depth={depth + 1} />
                : <ConditionLeafRow value={c} onChange={(l) => setChild(i, l)} />}
            </div>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => remove(i)}>
              <Trash2 className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
        ))}
        {value.children.length === 0 && <p className="text-[10.5px] text-muted-foreground">No conditions — this rule always applies.</p>}
      </div>

      {issues?.length ? (
        <div className="mt-1.5 space-y-0.5">
          {issues.map((i) => <p key={i.id} className="text-[10.5px] text-destructive">{i.message}</p>)}
        </div>
      ) : null}
    </div>
  );
}

function ConditionLeafRow({ value, onChange }: { value: ConditionLeaf; onChange: (v: ConditionLeaf) => void }) {
  const subject = SUBJECTS.find((s) => s.value === value.subject);
  return (
    <div className="space-y-1 rounded border border-border bg-background p-1.5">
      <div className="flex flex-wrap items-center gap-1">
        <select value={value.subject} onChange={(e) => onChange({ ...value, subject: e.target.value as ConditionSubject })}
          className="h-6 rounded border border-input bg-background px-1 text-[10.5px]">
          {SUBJECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={value.operator} onChange={(e) => onChange({ ...value, operator: e.target.value as ConditionOperator })}
          className="h-6 rounded border border-input bg-background px-1 text-[10.5px]">
          {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <Input value={value.value} onChange={(e) => onChange({ ...value, value: e.target.value })}
          placeholder="Value" className="h-6 w-28 text-[10.5px]" />
        {value.operator === "between" && (
          <Input value={value.value2 ?? ""} onChange={(e) => onChange({ ...value, value2: e.target.value })}
            placeholder="Max" className="h-6 w-20 text-[10.5px]" />
        )}
        <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
          Weight
          <Input type="number" value={value.weight ?? 0} onChange={(e) => onChange({ ...value, weight: Number(e.target.value) })}
            className="h-6 w-14 text-[10.5px]" />
        </label>
      </div>
      {subject?.refKind && (
        <ResourceReferenceSelector label="Linked resource" kind={subject.refKind}
          value={value.ref ?? { id: rid(), kind: subject.refKind, source: "none" }}
          onChange={(r) => onChange({ ...value, ref: r })} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * LootActionBuilder
 * ------------------------------------------------------------------ */

const LOOT_KINDS: LootAction["kind"][] = ["buff", "trait", "statistic", "commodity", "relationship", "money", "skill", "career", "notification", "situation", "custom"];
const LOOT_TARGETS: LootAction["target"][] = ["actor", "target", "household", "club", "all-members", "family"];

export function LootActionBuilder({ label = "Loot actions", value, onChange }: {
  label?: string; value: LootAction[]; onChange: (v: LootAction[]) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10.5px]" onClick={() => onChange([...value, emptyLoot()])}>
          <Plus className="mr-1 h-3 w-3" /> Add action
        </Button>
      </div>
      {value.length === 0 && <p className="text-[10.5px] text-muted-foreground">No outcome configured.</p>}
      {value.map((l, i) => (
        <div key={l.id} className="space-y-1 rounded border border-border p-1.5">
          <div className="flex flex-wrap items-center gap-1">
            <select value={l.kind} onChange={(e) => onChange(value.map((x, j) => j === i ? { ...x, kind: e.target.value as LootAction["kind"] } : x))}
              className="h-6 rounded border border-input bg-background px-1 text-[10.5px]">
              {LOOT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <Input type="number" value={l.amount} onChange={(e) => onChange(value.map((x, j) => j === i ? { ...x, amount: Number(e.target.value) } : x))}
              className="h-6 w-20 text-[10.5px]" placeholder="Amount" />
            <select value={l.target} onChange={(e) => onChange(value.map((x, j) => j === i ? { ...x, target: e.target.value as LootAction["target"] } : x))}
              className="h-6 rounded border border-input bg-background px-1 text-[10.5px]">
              {LOOT_TARGETS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <Input value={l.notes} onChange={(e) => onChange(value.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))}
              className="h-6 flex-1 text-[10.5px]" placeholder="Notes" />
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <Trash2 className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
          <ResourceReferenceSelector label="Target resource" kind={l.kind === "money" ? "any" : (l.kind as ResourceRefKind)}
            value={l.ref} onChange={(r) => onChange(value.map((x, j) => j === i ? { ...x, ref: r } : x))} />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * NotificationEditor + in-game style preview
 * ------------------------------------------------------------------ */

const NOTIFY_STYLES: { value: NotifyStyle; label: string }[] = [
  { value: "none", label: "No notification" }, { value: "standard", label: "Standard notification" },
  { value: "urgent", label: "Urgent notification" }, { value: "sim", label: "Sim notification" },
  { value: "phone", label: "Phone notification" }, { value: "dialog", label: "Dialogue popup" },
  { value: "dialog-multi", label: "Multi-choice dialogue" }, { value: "dialog-yes-no", label: "Yes / No dialogue" },
  { value: "dialog-picker", label: "Picker dialogue" },
];

export function NotificationEditor({ value, onChange, keyPrefix }: {
  value: NotifySpec; onChange: (v: NotifySpec) => void; keyPrefix?: string;
}) {
  return (
    <div className="space-y-2 rounded-md border border-border p-2">
      <div className="flex items-center gap-1.5">
        <Bell className="h-3 w-3 text-muted-foreground" />
        <span className="text-[11px] font-semibold">Notification / dialogue</span>
        <select value={value.style} onChange={(e) => onChange({ ...value, style: e.target.value as NotifyStyle })}
          className="ml-auto h-6 rounded border border-input bg-background px-1 text-[10.5px]">
          {NOTIFY_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      {value.style !== "none" && (
        <>
          <LocalizationEditor label="Title text" value={value.title} keyPrefix={keyPrefix} onChange={(t) => onChange({ ...value, title: t })} />
          <LocalizationEditor label="Body text" multiline value={value.body} keyPrefix={keyPrefix} onChange={(b) => onChange({ ...value, body: b })} />
          {value.style.startsWith("dialog") && (
            <div className="grid gap-1.5 sm:grid-cols-2">
              <LocalizationEditor label="Accept text" value={value.acceptText} keyPrefix={keyPrefix} onChange={(t) => onChange({ ...value, acceptText: t })} />
              <LocalizationEditor label="Cancel text" value={value.cancelText} keyPrefix={keyPrefix} onChange={(t) => onChange({ ...value, cancelText: t })} />
            </div>
          )}
          <div className="grid gap-1.5 sm:grid-cols-2">
            <ResourceReferenceSelector label="Custom icon" kind="icon" value={value.iconRef} onChange={(r) => onChange({ ...value, iconRef: r })} />
            <ResourceReferenceSelector label="Sound reference" kind="any" value={value.soundRef} onChange={(r) => onChange({ ...value, soundRef: r })} />
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <BoolField label="Sim portrait" value={value.simPortrait} onChange={(v) => onChange({ ...value, simPortrait: v })} />
            <BoolField label="Object thumbnail" value={value.objectThumbnail} onChange={(v) => onChange({ ...value, objectThumbnail: v })} />
          </div>
          <SimsNotificationPreview spec={value} />
        </>
      )}
    </div>
  );
}

export function SimsNotificationPreview({ spec, fallbackTitle, fallbackBody }: {
  spec: NotifySpec; fallbackTitle?: string; fallbackBody?: string;
}) {
  if (spec.style === "none") return null;
  const title = spec.title.text || fallbackTitle || "Bella Goth has been named heir to the Goth family legacy.";
  const body = spec.body.text || fallbackBody || "The household gathers in the parlor as Mortimer announces his decision. Cassandra offers a stiff smile.";
  const urgent = spec.style === "urgent";
  const isDialog = spec.style.startsWith("dialog");
  return (
    <div className="rounded-lg bg-gradient-to-b from-[#0b2a3a] to-[#06131c] p-2.5 shadow-inner">
      <div className="text-[9px] font-semibold uppercase tracking-widest text-[#7fd7f5]/70">In-game preview</div>
      <div className={cn(
        "mt-1.5 flex gap-2 rounded-md border p-2.5 backdrop-blur",
        urgent ? "border-[#f59e0b]/60 bg-[#3b2609]/80" : "border-[#38bdf8]/40 bg-[#0e2c3d]/85",
      )}>
        {spec.simPortrait && (
          <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-[#7dd3fc] to-[#0369a1] ring-2 ring-white/30" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-semibold text-white">{title}</div>
          <div className="mt-0.5 line-clamp-3 text-[11px] leading-snug text-white/80">{body}</div>
          {isDialog && (
            <div className="mt-2 flex gap-1.5">
              <span className="rounded bg-[#38bdf8] px-2 py-0.5 text-[10px] font-semibold text-[#04212f]">{spec.acceptText.text || "OK"}</span>
              {spec.style !== "dialog" && (
                <span className="rounded border border-white/30 px-2 py-0.5 text-[10px] font-semibold text-white/80">{spec.cancelText.text || "Cancel"}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Build support + validation
 * ------------------------------------------------------------------ */

const SUPPORT_LABEL: { key: keyof BuildSupport; label: string }[] = [
  { key: "uiConfig", label: "UI config" },
  { key: "projectData", label: "Project data" },
  { key: "xmlGenerator", label: "XML" },
  { key: "simDataGenerator", label: "SimData" },
  { key: "stblGenerator", label: "STBL" },
  { key: "pythonGenerator", label: "Python" },
  { key: "packageWriter", label: "Package" },
];

export function BuildSupportBadge({ support, compact }: { support: BuildSupport; compact?: boolean }) {
  const done = SUPPORT_LABEL.filter((s) => support[s.key]).length;
  if (compact) {
    return (
      <Badge variant="outline" className="gap-1 text-[9.5px]">
        <span className={cn("h-1.5 w-1.5 rounded-full", support.packageWriter ? "bg-[var(--teal,#2dd4bf)]" : "bg-amber-500")} />
        {done}/{SUPPORT_LABEL.length} build stages
      </Badge>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {SUPPORT_LABEL.map((s) => (
        <Badge key={s.key} variant={support[s.key] ? "secondary" : "outline"}
          className={cn("text-[9.5px]", !support[s.key] && "text-muted-foreground/70 line-through")}>
          {s.label}
        </Badge>
      ))}
    </div>
  );
}

export function ValidationPanel({ issues, onJump }: { issues: PackIssue[]; onJump?: (path: string) => void }) {
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  const infos = issues.filter((i) => i.level === "info");
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-[13px] font-semibold">Validation</span>
        <Badge variant={errors.length ? "destructive" : "secondary"} className="text-[9.5px]">{errors.length} errors</Badge>
        <Badge variant="outline" className="text-[9.5px]">{warnings.length} warnings</Badge>
        <Badge variant="outline" className="text-[9.5px]">{infos.length} notes</Badge>
      </div>
      <div className="max-h-64 space-y-1 overflow-y-auto p-2">
        {issues.length === 0 && <p className="px-1 text-[11px] text-muted-foreground">No issues found.</p>}
        {issues.map((i) => (
          <button key={i.id} onClick={() => onJump?.(i.path)}
            className="flex w-full items-start gap-1.5 rounded px-1.5 py-1 text-left hover:bg-muted/60">
            {i.level === "error" ? <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
              : i.level === "warning" ? <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
              : <Info className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />}
            <span className="text-[11px] leading-snug">
              {i.message}
              <span className="ml-1 font-mono text-[9.5px] text-muted-foreground">{i.path}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Inline error text for a specific field path. */
export function fieldError(issues: PackIssue[], path: string): string | undefined {
  return issues.find((i) => i.level === "error" && i.path === path)?.message;
}

/* ------------------------------------------------------------------ *
 * Generic repeatable list editor
 * ------------------------------------------------------------------ */

export function ListEditor<T extends { id: string }>({
  label, items, onChange, create, renderTitle, renderBody, addLabel = "Add",
}: {
  label: string;
  items: T[];
  onChange: (v: T[]) => void;
  create: () => T;
  renderTitle: (item: T, index: number) => ReactNode;
  renderBody: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
  addLabel?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const update = (i: number) => (patch: Partial<T>) => onChange(items.map((x, j) => j === i ? { ...x, ...patch } : x));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] font-semibold">{label} <span className="text-muted-foreground">({items.length})</span></span>
        <Button size="sm" variant="outline" className="h-6 px-2 text-[10.5px]"
          onClick={() => { const n = create(); onChange([...items, n]); setOpenId(n.id); }}>
          <Plus className="mr-1 h-3 w-3" /> {addLabel}
        </Button>
      </div>
      {items.length === 0 && <p className="rounded border border-dashed border-border px-2 py-3 text-center text-[11px] text-muted-foreground">Nothing configured yet.</p>}
      {items.map((item, i) => {
        const open = openId === item.id;
        return (
          <div key={item.id} className="rounded-md border border-border">
            <div className="flex items-center gap-1.5 px-2 py-1.5">
              <button onClick={() => setOpenId(open ? null : item.id)} className="flex flex-1 items-center gap-1.5 text-left">
                {open ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                <span className="text-[11.5px] font-medium">{renderTitle(item, i)}</span>
              </button>
              <Button size="icon" variant="ghost" className="h-6 w-6"
                onClick={() => onChange([...items.slice(0, i + 1), { ...structuredClone(item), id: rid() }, ...items.slice(i + 1)])}>
                <Copy className="h-3 w-3 text-muted-foreground" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
            {open && <div className="space-y-2 border-t border-border p-2">{renderBody(item, update(i), i)}</div>}
          </div>
        );
      })}
    </div>
  );
}
