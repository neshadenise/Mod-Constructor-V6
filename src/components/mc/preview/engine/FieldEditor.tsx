/**
 * Schema-driven editor for the In-Game UI Preview Engine.
 *
 * The field list comes from the template registry, so switching preview type
 * reshapes the form to expose only the fields that Sims 4 pattern actually has.
 */

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Upload, ChevronDown } from "lucide-react";
import type { FieldDef, TemplateDef } from "@/lib/preview-engine/registry";
import {
  PREVIEW_STYLES,
  STYLE_META,
  blankChoice,
  uid,
  type PreviewChoice,
  type PreviewDoc,
  type PreviewNode,
  type PreviewOption,
  type PreviewOutcome,
  type PreviewStyle,
} from "@/lib/preview-engine/types";
import type { PreviewBranch } from "./Templates";
import { DEFAULT_SIM_PORTRAIT, SECOND_SIM_PORTRAIT } from "../GameUI";

const inputCls =
  "w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-[12.5px] outline-none transition-colors focus:border-primary";
const labelCls = "mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground";

function Label({ children }: { children: React.ReactNode }) {
  return <span className={labelCls}>{children}</span>;
}

function TagsEditor({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      {value.map((v, i) => (
        <div key={i} className="flex gap-1.5">
          <input
            className={inputCls}
            value={v}
            placeholder={placeholder}
            onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))}
          />
          <button
            type="button"
            className="rounded-lg border border-border px-2 text-muted-foreground hover:text-destructive"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
        onClick={() => onChange([...value, ""])}
      >
        <Plus className="h-3 w-3" /> Add
      </button>
    </div>
  );
}

function ImageField({ value, onChange }: { value?: string; onChange: (v: string | undefined) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-2">
      {value ? (
        <img src={value} alt="" className="h-12 w-20 rounded-md object-cover" />
      ) : (
        <div className="flex h-12 w-20 items-center justify-center rounded-md border border-dashed border-border text-[10px] text-muted-foreground">
          none
        </div>
      )}
      <input className={inputCls} value={value ?? ""} placeholder="https:// or data URL" onChange={(e) => onChange(e.target.value || undefined)} />
      <button
        type="button"
        className="rounded-lg border border-border px-2 py-1.5 text-muted-foreground hover:text-foreground"
        onClick={() => ref.current?.click()}
      >
        <Upload className="h-3.5 w-3.5" />
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => onChange(String(reader.result));
          reader.readAsDataURL(f);
        }}
      />
    </div>
  );
}

function PortraitField({ value, onChange }: { value?: string; onChange: (v: string | undefined) => void }) {
  const presets = [
    { label: "Default Sim", v: DEFAULT_SIM_PORTRAIT },
    { label: "Second Sim", v: SECOND_SIM_PORTRAIT },
    { label: "No portrait", v: "none" },
  ];
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(p.v)}
            className={cn(
              "rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors",
              (value ?? DEFAULT_SIM_PORTRAIT) === p.v
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <ImageField value={value === "none" ? undefined : value} onChange={onChange} />
    </div>
  );
}

function StyleField({ value, onChange }: { value: PreviewStyle; onChange: (v: PreviewStyle) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PREVIEW_STYLES.map((s) => {
        const m = STYLE_META[s];
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10.5px] font-bold transition-all",
              value === s ? "text-white" : "border-border text-muted-foreground hover:text-foreground",
            )}
            style={value === s ? { backgroundColor: `var(--${m.color})`, borderColor: `var(--${m.color})` } : undefined}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

function OutcomeEditor({
  title,
  value,
  onChange,
  nodeOptions,
}: {
  title: string;
  value: PreviewOutcome;
  onChange: (v: PreviewOutcome) => void;
  nodeOptions?: { id: string; title: string }[];
}) {
  const set = (patch: Partial<PreviewOutcome>) => onChange({ ...value, ...patch });
  return (
    <div className="rounded-lg border border-border p-2">
      <div className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="grid grid-cols-2 gap-2">
        <label>
          <Label>Work performance</Label>
          <input
            type="number"
            className={inputCls}
            value={value.performance ?? 0}
            onChange={(e) => set({ performance: Number(e.target.value) })}
          />
        </label>
        <label>
          <Label>Moodlet</Label>
          <input className={inputCls} value={value.moodlet ?? ""} onChange={(e) => set({ moodlet: e.target.value })} />
        </label>
      </div>
      <div className="mt-2">
        <Label>Notification</Label>
        <textarea
          rows={2}
          className={inputCls}
          value={value.notification ?? ""}
          onChange={(e) => set({ notification: e.target.value })}
        />
      </div>
      <div className="mt-2">
        <Label>Style</Label>
        <StyleField value={value.style ?? "neutral"} onChange={(s) => set({ style: s })} />
      </div>
      <div className="mt-2">
        <Label>Rewards / consequences</Label>
        <TagsEditor value={value.rewards ?? []} onChange={(rewards) => set({ rewards })} />
      </div>
      {nodeOptions && nodeOptions.length > 0 && (
        <div className="mt-2">
          <Label>Chain into</Label>
          <select
            className={inputCls}
            value={value.nextNodeId ?? ""}
            onChange={(e) => set({ nextNodeId: e.target.value || undefined })}
          >
            <option value="">— end sequence —</option>
            {nodeOptions.map((n) => (
              <option key={n.id} value={n.id}>
                {n.title || n.id}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export function ChoicesEditor({
  value,
  onChange,
  choiceLabel = "Choice",
  nodeOptions,
}: {
  value: PreviewChoice[];
  onChange: (v: PreviewChoice[]) => void;
  choiceLabel?: string;
  nodeOptions?: { id: string; title: string }[];
}) {
  const patch = (i: number, p: Partial<PreviewChoice>) =>
    onChange(value.map((c, j) => (j === i ? { ...c, ...p } : c)));
  return (
    <div className="space-y-2">
      {value.map((c, i) => (
        <details key={c.id} open={i === 0} className="rounded-xl border border-border">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2">
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              {choiceLabel} {String.fromCharCode(65 + i)}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{c.label}</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onChange(value.filter((_, j) => j !== i));
              }}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </summary>
          <div className="space-y-2 border-t border-border p-3">
            <label className="block">
              <Label>Button text</Label>
              <input className={inputCls} value={c.label} onChange={(e) => patch(i, { label: e.target.value })} />
            </label>
            <label className="block">
              <Label>Visibility condition (optional)</Label>
              <input
                className={inputCls}
                placeholder="e.g. Sim has Charisma 5"
                value={c.condition ?? ""}
                onChange={(e) => patch(i, { condition: e.target.value })}
              />
            </label>
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                {(["fixed", "random"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => patch(i, { outcomeMode: m })}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10.5px] font-bold capitalize",
                      c.outcomeMode === m
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
              {c.outcomeMode === "random" && (
                <label className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                  Success chance
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={c.successChance}
                    onChange={(e) => patch(i, { successChance: Number(e.target.value) })}
                  />
                  <span className="w-9 text-right tabular-nums text-foreground">{c.successChance}%</span>
                </label>
              )}
            </div>
            <OutcomeEditor
              title={c.outcomeMode === "random" ? "Success" : "Outcome"}
              value={c.success}
              onChange={(v) => patch(i, { success: v })}
              nodeOptions={nodeOptions}
            />
            {c.outcomeMode === "random" && (
              <OutcomeEditor
                title="Failure"
                value={c.failure}
                onChange={(v) => patch(i, { failure: v })}
                nodeOptions={nodeOptions}
              />
            )}
          </div>
        </details>
      ))}
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-2.5 py-1.5 text-[11.5px] font-semibold text-muted-foreground hover:text-foreground"
        onClick={() => onChange([...value, blankChoice()])}
      >
        <Plus className="h-3.5 w-3.5" /> Add {choiceLabel.toLowerCase()}
      </button>
    </div>
  );
}

function OptionsEditor({ value, onChange }: { value: PreviewOption[]; onChange: (v: PreviewOption[]) => void }) {
  const patch = (i: number, p: Partial<PreviewOption>) =>
    onChange(value.map((o, j) => (j === i ? { ...o, ...p } : o)));
  return (
    <div className="space-y-2">
      {value.map((o, i) => (
        <div key={o.id} className="rounded-lg border border-border p-2">
          <div className="flex gap-1.5">
            <input
              className={cn(inputCls, "w-14 text-center")}
              value={o.emoji ?? ""}
              placeholder="🙂"
              onChange={(e) => patch(i, { emoji: e.target.value })}
            />
            <input className={inputCls} value={o.label} placeholder="Label" onChange={(e) => patch(i, { label: e.target.value })} />
            <button
              type="button"
              className="rounded-lg border border-border px-2 text-muted-foreground hover:text-destructive"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-1.5 flex gap-1.5">
            <input
              className={inputCls}
              value={o.description ?? ""}
              placeholder="Description"
              onChange={(e) => patch(i, { description: e.target.value })}
            />
            <input
              className={cn(inputCls, "w-28")}
              value={o.value ?? ""}
              placeholder="Value"
              onChange={(e) => patch(i, { value: e.target.value })}
            />
          </div>
          <div className="mt-1.5">
            <ImageField value={o.image} onChange={(image) => patch(i, { image })} />
          </div>
        </div>
      ))}
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-2.5 py-1.5 text-[11.5px] font-semibold text-muted-foreground hover:text-foreground"
        onClick={() => onChange([...value, { id: uid("op"), label: "New entry" }])}
      >
        <Plus className="h-3.5 w-3.5" /> Add entry
      </button>
    </div>
  );
}

function NodesEditor({
  nodes,
  startNodeId,
  onChange,
}: {
  nodes: PreviewNode[];
  startNodeId?: string;
  onChange: (nodes: PreviewNode[], startNodeId?: string) => void;
}) {
  const nodeOptions = nodes.map((n) => ({ id: n.id, title: n.title }));
  const patch = (i: number, p: Partial<PreviewNode>) =>
    onChange(nodes.map((n, j) => (j === i ? { ...n, ...p } : n)), startNodeId);
  return (
    <div className="space-y-2">
      <label className="block">
        <Label>Start node</Label>
        <select
          className={inputCls}
          value={startNodeId ?? nodes[0]?.id ?? ""}
          onChange={(e) => onChange(nodes, e.target.value)}
        >
          {nodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.title || n.id}
            </option>
          ))}
        </select>
      </label>
      {nodes.map((n, i) => (
        <details key={n.id} open={i === 0} className="rounded-xl border border-border">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2">
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider">
              {n.kind}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{n.title}</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onChange(nodes.filter((_, j) => j !== i), startNodeId);
              }}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </summary>
          <div className="space-y-2 border-t border-border p-3">
            <label className="block">
              <Label>Step type</Label>
              <select
                className={inputCls}
                value={n.kind}
                onChange={(e) => patch(i, { kind: e.target.value as PreviewNode["kind"] })}
              >
                {["chance-card", "phone-call", "dialog", "tns", "picker", "branch-select"].map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <Label>Title</Label>
              <input className={inputCls} value={n.title} onChange={(e) => patch(i, { title: e.target.value })} />
            </label>
            <label className="block">
              <Label>Body</Label>
              <textarea rows={2} className={inputCls} value={n.body} onChange={(e) => patch(i, { body: e.target.value })} />
            </label>
            <div>
              <Label>Style</Label>
              <StyleField value={n.style} onChange={(s) => patch(i, { style: s })} />
            </div>
            <div>
              <Label>Choices</Label>
              <ChoicesEditor
                value={n.choices}
                onChange={(choices) => patch(i, { choices })}
                nodeOptions={nodeOptions.filter((o) => o.id !== n.id)}
              />
            </div>
          </div>
        </details>
      ))}
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-2.5 py-1.5 text-[11.5px] font-semibold text-muted-foreground hover:text-foreground"
        onClick={() =>
          onChange(
            [
              ...nodes,
              {
                id: uid("nd"),
                kind: "chance-card",
                title: "New step",
                body: "",
                style: "neutral",
                choices: [blankChoice("Continue")],
              },
            ],
            startNodeId,
          )
        }
      >
        <Plus className="h-3.5 w-3.5" /> Add step
      </button>
    </div>
  );
}

function BranchesField({
  branches,
  selected,
  onChange,
}: {
  branches: PreviewBranch[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  if (branches.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-3 text-[11.5px] text-muted-foreground">
        No career branches in this project yet — add branches (and their cover art) in the Career Builder and they
        appear here automatically.
      </p>
    );
  }
  const active = selected.length ? selected : branches.map((b) => b.key);
  return (
    <div className="space-y-1.5">
      {branches.map((b) => {
        const on = active.includes(b.key);
        return (
          <button
            key={b.key}
            type="button"
            onClick={() => onChange(on ? active.filter((k) => k !== b.key) : [...active, b.key])}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg border p-2 text-left",
              on ? "border-primary bg-primary/8" : "border-border opacity-70",
            )}
          >
            {b.cover ? (
              <img src={b.cover} alt="" className="h-9 w-16 rounded-md object-cover" />
            ) : (
              <span className="flex h-9 w-16 items-center justify-center rounded-md bg-muted text-[15px]">
                {b.emoji ?? "🎬"}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-bold">{b.name}</span>
              <span className="block truncate text-[10.5px] text-muted-foreground">
                {b.cover ? "Branch cover art" : "Inherits career cover"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function FieldRenderer({
  field,
  doc,
  template,
  branches,
  onPatch,
}: {
  field: FieldDef;
  doc: PreviewDoc;
  template: TemplateDef;
  branches: PreviewBranch[];
  onPatch: (patch: Partial<PreviewDoc>) => void;
}) {
  const key = field.key as keyof PreviewDoc;
  const raw = doc[key];

  const control = (() => {
    switch (field.type) {
      case "textarea":
        return (
          <textarea
            rows={3}
            className={inputCls}
            placeholder={field.placeholder}
            value={(raw as string) ?? ""}
            onChange={(e) => onPatch({ [key]: e.target.value } as Partial<PreviewDoc>)}
          />
        );
      case "number":
        return (
          <input
            type="number"
            className={inputCls}
            value={(raw as number) ?? 0}
            onChange={(e) => onPatch({ [key]: Number(e.target.value) } as Partial<PreviewDoc>)}
          />
        );
      case "select":
        return (
          <select
            className={inputCls}
            value={(raw as string) ?? field.options?.[0] ?? ""}
            onChange={(e) => onPatch({ [key]: e.target.value } as Partial<PreviewDoc>)}
          >
            {(field.options ?? []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        );
      case "style":
        return <StyleField value={doc.style} onChange={(s) => onPatch({ style: s })} />;
      case "image":
        return <ImageField value={raw as string | undefined} onChange={(v) => onPatch({ [key]: v } as Partial<PreviewDoc>)} />;
      case "portrait":
        return <PortraitField value={raw as string | undefined} onChange={(v) => onPatch({ [key]: v } as Partial<PreviewDoc>)} />;
      case "tags":
        return (
          <TagsEditor
            value={(raw as string[]) ?? []}
            placeholder={field.placeholder}
            onChange={(v) => onPatch({ [key]: v } as Partial<PreviewDoc>)}
          />
        );
      case "choices":
        return (
          <ChoicesEditor
            value={doc.choices ?? []}
            choiceLabel={template.choiceLabel ?? "Choice"}
            onChange={(choices) => onPatch({ choices })}
          />
        );
      case "options":
        return <OptionsEditor value={doc.options ?? []} onChange={(options) => onPatch({ options })} />;
      case "nodes":
        return (
          <NodesEditor
            nodes={doc.nodes ?? []}
            startNodeId={doc.startNodeId}
            onChange={(nodes, startNodeId) => onPatch({ nodes, startNodeId })}
          />
        );
      case "branches":
        return (
          <BranchesField
            branches={branches}
            selected={doc.branchIds ?? []}
            onChange={(branchIds) => onPatch({ branchIds })}
          />
        );
      default:
        return (
          <input
            className={inputCls}
            placeholder={field.placeholder}
            value={(raw as string) ?? ""}
            onChange={(e) => onPatch({ [key]: e.target.value } as Partial<PreviewDoc>)}
          />
        );
    }
  })();

  return (
    <div className={cn(field.half ? "col-span-1" : "col-span-2")}>
      <Label>{field.label}</Label>
      {control}
      {field.help && <p className="mt-1 text-[10.5px] text-muted-foreground">{field.help}</p>}
    </div>
  );
}
