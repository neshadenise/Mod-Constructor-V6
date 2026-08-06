/**
 * Milestone & Objective Builder (Aspiration Builder — Part 2).
 *
 * The progression tree on the left owns structure: add, reorder by drag and
 * drop, collapse, duplicate, copy/paste, multi-select, move to another
 * aspiration. The inspector on the right owns meaning: goal type, dynamic
 * goal fields, progress tracking, conditions, repeatability, timing,
 * dependencies, unlock rules, rewards and failure states.
 *
 * Every edit goes through the builder's `patch` so undo/redo and auto-save
 * keep working, and every reference is a structured resource ref — the
 * creator never types a tuning id.
 */

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ClipboardPaste,
  Copy,
  CornerDownRight,
  Eye,
  EyeOff,
  GitBranch,
  Gift,
  ListChecks,
  Plus,
  Sparkles,
  Target,
  Timer,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { RefField } from "@/components/mc/trait/ResourcePicker";
import {
  Badge,
  Btn,
  Chip,
  EmptyHint,
  Field,
  NumberInput,
  Panel,
  SelectInput,
  TextArea,
  TextInput,
  Toggle,
} from "@/components/mc/trait/primitives";
import {
  CONDITION_KINDS,
  CONDITION_LABEL,
  FAILURE_KINDS,
  FAILURE_LABEL,
  OBJECTIVE_GROUPS,
  OBJECTIVE_TEMPLATES,
  OBJECTIVE_TYPES,
  PROGRESS_STYLES,
  REPEAT_LABEL,
  REWARD_EXPECTS,
  REWARD_LABEL,
  REWARD_NUMERIC,
  REWARD_TYPES,
  TIMER_LABEL,
  UNLOCK_KINDS,
  UNLOCK_LABEL,
  objectiveTypeSpec,
  pickerKind,
  type ConditionKind,
  type FailureKind,
  type GoalField,
  type ObjectiveTypeId,
  type ProgressStyle,
  type RepeatMode,
  type RewardType,
  type TimerMode,
  type UnlockKind,
} from "@/lib/aspirations/goals";
import {
  cloneMilestone,
  cloneObjective,
  defaultParams,
  makeCondition,
  makeFailure,
  makeMilestone,
  makeObjective,
  makeReward,
  makeUnlock,
  milestoneInternalName,
  moveItem,
  objectiveInternalName,
  reindexMilestones,
  requiredObjectives,
  type AspirationDoc,
  type AspirationMilestone,
  type AspirationObjective,
} from "@/lib/aspirations/schema";
import { migrateAspirationDoc } from "@/lib/aspirations/migrate";
import type { AspirationValidation } from "@/lib/aspirations/validate";

/* ------------------------------------------------------------- clipboard -- */

type Clip =
  | { kind: "milestone"; data: AspirationMilestone }
  | { kind: "objective"; data: AspirationObjective }
  | null;

let clipboard: Clip = null;

/* ----------------------------------------------------------------- props -- */

export interface MilestoneBuilderProps {
  doc: AspirationDoc;
  patch: (fn: (d: AspirationDoc) => AspirationDoc) => void;
  validation: AspirationValidation;
  focus?: string;
  /** Record id of the aspiration being edited, so "move to" can skip itself. */
  recordId?: string;
  projectId?: string;
}

type Selection = { type: "milestone" | "objective"; msId: string; objId?: string } | null;

/* ------------------------------------------------------------------ tree -- */

export function MilestoneBuilder({
  doc,
  patch,
  validation,
  focus,
  recordId,
  projectId,
}: MilestoneBuilderProps) {
  const store = useStore();
  const [selection, setSelection] = useState<Selection>(null);
  const [marked, setMarked] = useState<string[]>([]);
  const [drag, setDrag] = useState<{ msId: string; objId?: string } | null>(null);
  const [, bump] = useState(0);

  const issuesFor = (id: string) => validation.issues.filter((i) => i.target === id);

  /* ---------------------------------------------------------- mutations -- */

  const setMilestones = (fn: (list: AspirationMilestone[]) => AspirationMilestone[]) =>
    patch((d) => ({ ...d, milestones: fn(d.milestones) }));

  const updateMilestone = (msId: string, fn: (m: AspirationMilestone) => AspirationMilestone) =>
    setMilestones((list) => list.map((m) => (m.id === msId ? fn(m) : m)));

  const updateObjective = (
    msId: string,
    objId: string,
    fn: (o: AspirationObjective) => AspirationObjective,
  ) =>
    updateMilestone(msId, (m) => ({
      ...m,
      objectives: m.objectives.map((o) =>
        o.id === objId
          ? fn(o)
          : { ...o, children: o.children.map((c) => (c.id === objId ? fn(c) : c)) },
      ),
    }));

  const addMilestone = () =>
    setMilestones((list) => reindexMilestones([...list, makeMilestone(list.length)]));

  const addObjective = (msId: string, type: ObjectiveTypeId = "custom", label?: string) => {
    const objective = makeObjective(label ?? "New objective", type);
    updateMilestone(msId, (m) => ({ ...m, objectives: [...m.objectives, objective] }));
    setSelection({ type: "objective", msId, objId: objective.id });
  };

  const removeMilestone = (msId: string) => {
    setMilestones((list) => reindexMilestones(list.filter((m) => m.id !== msId)));
    setSelection(null);
  };

  const removeObjective = (msId: string, objId: string) => {
    updateMilestone(msId, (m) => ({
      ...m,
      objectives: m.objectives
        .filter((o) => o.id !== objId)
        .map((o) => ({ ...o, children: o.children.filter((c) => c.id !== objId) })),
    }));
    setSelection({ type: "milestone", msId });
  };

  const duplicateMilestone = (msId: string) =>
    setMilestones((list) => {
      const i = list.findIndex((m) => m.id === msId);
      if (i < 0) return list;
      const copy = cloneMilestone(list[i]!);
      return reindexMilestones([...list.slice(0, i + 1), copy, ...list.slice(i + 1)]);
    });

  const duplicateObjective = (msId: string, objId: string) =>
    updateMilestone(msId, (m) => {
      const i = m.objectives.findIndex((o) => o.id === objId);
      if (i < 0) return m;
      const copy = cloneObjective(m.objectives[i]!);
      return {
        ...m,
        objectives: [...m.objectives.slice(0, i + 1), copy, ...m.objectives.slice(i + 1)],
      };
    });

  const copyNode = () => {
    if (!selection) return;
    const m = doc.milestones.find((x) => x.id === selection.msId);
    if (!m) return;
    if (selection.type === "milestone") clipboard = { kind: "milestone", data: m };
    else {
      const o = m.objectives.find((x) => x.id === selection.objId);
      if (!o) return;
      clipboard = { kind: "objective", data: o };
    }
    bump((n) => n + 1);
    toast.success(`Copied ${clipboard.kind}`);
  };

  const pasteNode = () => {
    if (!clipboard) return toast.info("Nothing copied yet");
    if (clipboard.kind === "milestone") {
      const copy = cloneMilestone(clipboard.data);
      setMilestones((list) => reindexMilestones([...list, copy]));
      toast.success("Milestone pasted");
      return;
    }
    const msId = selection?.msId ?? doc.milestones[0]?.id;
    if (!msId) return toast.error("Add a milestone first");
    const copy = cloneObjective(clipboard.data, "");
    updateMilestone(msId, (m) => ({ ...m, objectives: [...m.objectives, copy] }));
    toast.success("Objective pasted");
  };

  /** Move the selected milestones into another aspiration in this project. */
  const moveToAspiration = (targetRecordId: string) => {
    const ids = marked.length ? marked : selection?.type === "milestone" ? [selection.msId] : [];
    if (!ids.length) return toast.info("Select at least one milestone first");
    const target = store.state.aspirations.find((a) => a.id === targetRecordId);
    if (!target) return;
    const targetDoc = migrateAspirationDoc(target);
    const moving = doc.milestones.filter((m) => ids.includes(m.id));
    const merged = reindexMilestones([
      ...targetDoc.milestones,
      ...moving.map((m) => cloneMilestone(m, "")),
    ]);
    store.updateAspiration(targetRecordId, {
      builderState: { ...targetDoc, milestones: merged } as unknown as Record<string, unknown>,
    });
    setMilestones((list) => reindexMilestones(list.filter((m) => !ids.includes(m.id))));
    setMarked([]);
    setSelection(null);
    toast.success(`Moved ${moving.length} milestone(s) to ${target.name}`);
  };

  /* ------------------------------------------------------------- drag -- */

  const onDropMilestone = (targetId: string) => {
    if (!drag || drag.objId) return;
    setMilestones((list) => {
      const from = list.findIndex((m) => m.id === drag.msId);
      const to = list.findIndex((m) => m.id === targetId);
      return reindexMilestones(moveItem(list, from, to));
    });
    setDrag(null);
  };

  const onDropObjective = (targetMsId: string, targetObjId?: string) => {
    if (!drag?.objId) return;
    const source = doc.milestones.find((m) => m.id === drag.msId);
    const moving = source?.objectives.find((o) => o.id === drag.objId);
    if (!moving) return setDrag(null);

    if (drag.msId === targetMsId) {
      updateMilestone(targetMsId, (m) => {
        const from = m.objectives.findIndex((o) => o.id === drag.objId);
        const to = targetObjId
          ? m.objectives.findIndex((o) => o.id === targetObjId)
          : m.objectives.length - 1;
        return { ...m, objectives: moveItem(m.objectives, from, to) };
      });
    } else {
      setMilestones((list) =>
        list.map((m) => {
          if (m.id === drag.msId)
            return { ...m, objectives: m.objectives.filter((o) => o.id !== drag.objId) };
          if (m.id === targetMsId) {
            const to = targetObjId
              ? m.objectives.findIndex((o) => o.id === targetObjId)
              : m.objectives.length;
            const next = [...m.objectives];
            next.splice(to < 0 ? next.length : to, 0, moving);
            return { ...m, objectives: next };
          }
          return m;
        }),
      );
      setSelection({ type: "objective", msId: targetMsId, objId: moving.id });
    }
    setDrag(null);
  };

  const toggleMark = (id: string) =>
    setMarked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const otherAspirations = store.state.aspirations.filter(
    (a) => a.id !== recordId && (!projectId || a.projectId === projectId),
  );

  const selectedMilestone = doc.milestones.find((m) => m.id === selection?.msId) ?? null;
  const selectedObjective =
    selection?.type === "objective" && selectedMilestone
      ? ([...selectedMilestone.objectives].flatMap((o) => [o, ...o.children]).find(
          (o) => o.id === selection.objId,
        ) ?? null)
      : null;

  /* ------------------------------------------------------------ render -- */

  return (
    <div className="space-y-4">
      <Panel
        title="Progression tree"
        subtitle="Drag to reorder or move objectives between milestones. Ctrl-click to multi-select."
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <Btn icon={Copy} onClick={copyNode} title="Copy selection">
              {""}
            </Btn>
            <Btn icon={ClipboardPaste} onClick={pasteNode} title="Paste">
              {""}
            </Btn>
            {otherAspirations.length > 0 && (
              <SelectInput
                value=""
                className="w-40"
                onChange={(v) => v && moveToAspiration(v)}
                options={[
                  { value: "", label: "Move to…" },
                  ...otherAspirations.map((a) => ({ value: a.id, label: a.name })),
                ]}
              />
            )}
            <Btn icon={Plus} variant="primary" onClick={addMilestone}>
              Milestone
            </Btn>
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(240px,320px)_1fr]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-2.5 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                {doc.displayName || "Untitled aspiration"}
              </span>
              <Badge tone="muted">{doc.milestones.length}</Badge>
            </div>

            {doc.milestones.length === 0 ? (
              <EmptyHint>No milestones yet. Add one to start the progression.</EmptyHint>
            ) : (
              <ul className="space-y-1">
                {doc.milestones.map((m, i) => {
                  const open = !m.collapsed;
                  const msIssues = issuesFor(m.id);
                  const active = selection?.msId === m.id && selection.type === "milestone";
                  return (
                    <li key={m.id}>
                      <div
                        draggable
                        onDragStart={() => setDrag({ msId: m.id })}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => (drag?.objId ? onDropObjective(m.id) : onDropMilestone(m.id))}
                        className={cn(
                          "flex items-center gap-1.5 rounded-md border px-2 py-1.5 transition-colors",
                          active
                            ? "border-primary/50 bg-primary/10"
                            : "border-border bg-background hover:bg-muted/60",
                          marked.includes(m.id) && "ring-1 ring-primary/50",
                          focus === m.id && "ring-2 ring-primary/60",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            updateMilestone(m.id, (x) => ({ ...x, collapsed: !x.collapsed }))
                          }
                          className="shrink-0 text-muted-foreground"
                          title={open ? "Collapse" : "Expand"}
                        >
                          {open ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                          onClick={(e) => {
                            if (e.ctrlKey || e.metaKey) toggleMark(m.id);
                            else setSelection({ type: "milestone", msId: m.id });
                          }}
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-[9px] font-bold">
                            {m.tier}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                            {m.title || `Milestone ${i + 1}`}
                          </span>
                          {m.hidden && <EyeOff className="h-3 w-3 shrink-0 text-muted-foreground" />}
                          {msIssues.length > 0 && (
                            <span
                              className={cn(
                                "h-1.5 w-1.5 shrink-0 rounded-full",
                                msIssues.some((x) => x.level === "error")
                                  ? "bg-red-500"
                                  : "bg-amber-500",
                              )}
                            />
                          )}
                        </button>
                        <span className="shrink-0 font-mono text-[9.5px] text-muted-foreground">
                          {m.objectives.length}
                        </span>
                        <button
                          type="button"
                          title="Duplicate"
                          onClick={() => duplicateMilestone(m.id)}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => removeMilestone(m.id)}
                          className="shrink-0 text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>

                      {open && (
                        <ul className="mt-1 space-y-1 border-l border-border pl-3">
                          {m.objectives.map((o) => {
                            const objIssues = issuesFor(o.id);
                            const activeObj = selection?.objId === o.id;
                            return (
                              <li key={o.id}>
                                <div
                                  draggable
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    setDrag({ msId: m.id, objId: o.id });
                                  }}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.stopPropagation();
                                    onDropObjective(m.id, o.id);
                                  }}
                                  className={cn(
                                    "flex items-center gap-1.5 rounded-md border px-2 py-1 transition-colors",
                                    activeObj
                                      ? "border-primary/50 bg-primary/10"
                                      : "border-transparent hover:bg-muted/60",
                                    marked.includes(o.id) && "ring-1 ring-primary/50",
                                    focus === o.id && "ring-2 ring-primary/60",
                                  )}
                                >
                                  <CornerDownRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                                  <button
                                    type="button"
                                    className="min-w-0 flex-1 truncate text-left text-[11.5px]"
                                    onClick={(e) => {
                                      if (e.ctrlKey || e.metaKey) toggleMark(o.id);
                                      else
                                        setSelection({
                                          type: "objective",
                                          msId: m.id,
                                          objId: o.id,
                                        });
                                    }}
                                  >
                                    {o.label || "Untitled objective"}
                                  </button>
                                  {o.hidden && (
                                    <EyeOff className="h-3 w-3 shrink-0 text-muted-foreground" />
                                  )}
                                  {o.optional && <Badge tone="muted">opt</Badge>}
                                  {objIssues.length > 0 && (
                                    <span
                                      className={cn(
                                        "h-1.5 w-1.5 shrink-0 rounded-full",
                                        objIssues.some((x) => x.level === "error")
                                          ? "bg-red-500"
                                          : "bg-amber-500",
                                      )}
                                    />
                                  )}
                                  <button
                                    type="button"
                                    title="Duplicate"
                                    onClick={() => duplicateObjective(m.id, o.id)}
                                    className="shrink-0 text-muted-foreground hover:text-foreground"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Delete"
                                    onClick={() => removeObjective(m.id, o.id)}
                                    className="shrink-0 text-muted-foreground hover:text-red-500"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                          <li>
                            <button
                              type="button"
                              onClick={() => addObjective(m.id)}
                              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[11px] text-muted-foreground hover:bg-muted"
                            >
                              <Plus className="h-3 w-3" /> Add objective
                            </button>
                          </li>
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {marked.length > 0 && (
              <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-2.5 py-1.5 text-[11px]">
                <span className="flex-1">{marked.length} selected</span>
                <Btn onClick={() => setMarked([])}>Clear</Btn>
              </div>
            )}
          </div>

          <div className="min-w-0">
            {selectedObjective && selectedMilestone ? (
              <ObjectiveInspector
                doc={doc}
                milestone={selectedMilestone}
                objective={selectedObjective}
                validation={validation}
                onChange={(fn) => updateObjective(selectedMilestone.id, selectedObjective.id, fn)}
              />
            ) : selectedMilestone ? (
              <MilestoneInspector
                doc={doc}
                milestone={selectedMilestone}
                validation={validation}
                onChange={(fn) => updateMilestone(selectedMilestone.id, fn)}
                onAddObjective={(type, label) => addObjective(selectedMilestone.id, type, label)}
                onMove={(dir) =>
                  setMilestones((list) => {
                    const from = list.findIndex((m) => m.id === selectedMilestone.id);
                    return reindexMilestones(moveItem(list, from, from + dir));
                  })
                }
              />
            ) : (
              <EmptyHint>
                Select a milestone or objective to edit it. Structure on the left, meaning on the
                right.
              </EmptyHint>
            )}
          </div>
        </div>
      </Panel>

      <JournalPreview doc={doc} />
    </div>
  );
}

/* --------------------------------------------------- milestone inspector -- */

function MilestoneInspector({
  doc,
  milestone: m,
  validation,
  onChange,
  onAddObjective,
  onMove,
}: {
  doc: AspirationDoc;
  milestone: AspirationMilestone;
  validation: AspirationValidation;
  onChange: (fn: (m: AspirationMilestone) => AspirationMilestone) => void;
  onAddObjective: (type: ObjectiveTypeId, label: string) => void;
  onMove: (dir: number) => void;
}) {
  const issues = validation.issues.filter((i) => i.target === m.id);
  const set = <K extends keyof AspirationMilestone>(key: K, value: AspirationMilestone[K]) =>
    onChange((x) => ({ ...x, [key]: value }));

  return (
    <div className="space-y-4">
      <Panel
        title="Milestone"
        subtitle="Renaming never changes the internal name or any generated id."
        actions={
          <div className="flex gap-1.5">
            <Btn icon={ArrowUp} onClick={() => onMove(-1)} title="Move up">
              {""}
            </Btn>
            <Btn icon={ArrowDown} onClick={() => onMove(1)} title="Move down">
              {""}
            </Btn>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Milestone name" hint="Player-facing. Creates the STBL name automatically.">
            <TextInput value={m.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label="Internal name" hint="Unique. Left empty it is derived from the name.">
            <TextInput
              value={m.internalName}
              placeholder={milestoneInternalName(doc, m)}
              onChange={(e) => set("internalName", e.target.value)}
              className="font-mono"
            />
          </Field>
          <Field label="Icon" hint="Project asset id, built-in icon key or an EA resource key.">
            <TextInput
              value={m.icon}
              placeholder="ic_milestone_reputation"
              onChange={(e) => set("icon", e.target.value)}
              className="font-mono"
            />
          </Field>
          <Field label="Display order" hint="Maintained by drag and drop. Override if you must.">
            <NumberInput value={m.order} min={0} onChange={(v) => set("order", v)} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Description" hint="Localised. Shown in the aspiration panel.">
            <TextArea value={m.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Field label="Tooltip">
            <TextInput
              value={m.strings.tooltip}
              onChange={(e) => onChange((x) => ({ ...x, strings: { ...x.strings, tooltip: e.target.value } }))}
            />
          </Field>
          <Field label="Journal text">
            <TextInput
              value={m.strings.journal}
              onChange={(e) => onChange((x) => ({ ...x, strings: { ...x.strings, journal: e.target.value } }))}
            />
          </Field>
          <Field label="Completion notification">
            <TextInput
              value={m.strings.notification}
              onChange={(e) =>
                onChange((x) => ({ ...x, strings: { ...x.strings, notification: e.target.value } }))
              }
            />
          </Field>
        </div>
        <div className="mt-3">
          <Toggle
            checked={m.hidden}
            onChange={(v) => set("hidden", v)}
            label="Hidden milestone"
            hint="Stays out of the aspiration panel until its unlock conditions pass."
          />
        </div>
        {issues.length > 0 && (
          <ul className="mt-3 space-y-1">
            {issues.map((i) => (
              <li
                key={i.id}
                className={cn(
                  "text-[10.5px]",
                  i.level === "error" ? "text-red-500" : "text-amber-500",
                )}
              >
                {i.message}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Unlock conditions"
        subtitle="How this milestone becomes available."
        actions={
          m.unlockMode === "conditions" ? (
            <Btn icon={Plus} onClick={() => onChange((x) => ({ ...x, unlocks: [...x.unlocks, makeUnlock()] }))}>
              Condition
            </Btn>
          ) : undefined
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {(["auto", "conditions"] as const).map((mode) => (
            <Chip key={mode} active={m.unlockMode === mode} onClick={() => set("unlockMode", mode)}>
              {mode === "auto" ? "Automatically after the previous milestone" : "Conditional"}
            </Chip>
          ))}
        </div>
        {m.unlockMode === "conditions" && (
          <div className="mt-3 space-y-2">
            {m.unlocks.length === 0 ? (
              <EmptyHint>No conditions yet — this milestone would never unlock.</EmptyHint>
            ) : (
              m.unlocks.map((u) => (
                <div key={u.id} className="flex flex-wrap items-end gap-2">
                  <div className="w-52">
                    <Field label="Condition">
                      <SelectInput<UnlockKind>
                        value={u.kind}
                        onChange={(v) =>
                          onChange((x) => ({
                            ...x,
                            unlocks: x.unlocks.map((y) => (y.id === u.id ? { ...y, kind: v } : y)),
                          }))
                        }
                        options={UNLOCK_KINDS.map((k) => ({ value: k, label: UNLOCK_LABEL[k] }))}
                      />
                    </Field>
                  </div>
                  <div className="min-w-[140px] flex-1">
                    <Field label="Value" hint="Milestone name, level, tuning name — as the condition needs.">
                      <TextInput
                        value={u.value}
                        onChange={(e) =>
                          onChange((x) => ({
                            ...x,
                            unlocks: x.unlocks.map((y) =>
                              y.id === u.id ? { ...y, value: e.target.value } : y,
                            ),
                          }))
                        }
                      />
                    </Field>
                  </div>
                  <Chip
                    active={u.negate}
                    onClick={() =>
                      onChange((x) => ({
                        ...x,
                        unlocks: x.unlocks.map((y) =>
                          y.id === u.id ? { ...y, negate: !y.negate } : y,
                        ),
                      }))
                    }
                  >
                    NOT
                  </Chip>
                  <Btn
                    variant="danger"
                    onClick={() =>
                      onChange((x) => ({ ...x, unlocks: x.unlocks.filter((y) => y.id !== u.id) }))
                    }
                  >
                    Remove
                  </Btn>
                </div>
              ))
            )}
          </div>
        )}
      </Panel>

      <Panel title="Completion logic" subtitle="What has to finish before the milestone completes.">
        <div className="flex flex-wrap gap-1.5">
          {(["all", "any", "count"] as const).map((mode) => (
            <Chip
              key={mode}
              active={m.completion.mode === mode}
              onClick={() => onChange((x) => ({ ...x, completion: { ...x.completion, mode } }))}
            >
              {mode === "all"
                ? "Complete ALL"
                : mode === "any"
                  ? "Complete ANY"
                  : "Complete N of them"}
            </Chip>
          ))}
        </div>
        {m.completion.mode === "count" && (
          <div className="mt-3 w-40">
            <Field label="Required count">
              <NumberInput
                value={m.completion.count}
                min={1}
                onChange={(v) => onChange((x) => ({ ...x, completion: { ...x.completion, count: v } }))}
              />
            </Field>
          </div>
        )}
        <div className="mt-3">
          <Toggle
            checked={m.completion.sequential}
            onChange={(v) =>
              onChange((x) => ({ ...x, completion: { ...x.completion, sequential: v } }))
            }
            label="Sequential"
            hint="Objectives must be completed in the order they appear."
          />
        </div>
        <p className="mt-2 text-[10.5px] text-muted-foreground">
          {requiredObjectives(m)} of {m.objectives.length} objectives required ·{" "}
          {m.objectives.filter((o) => o.optional || o.bonus).length} optional
        </p>
      </Panel>

      <Panel
        title="Completion rewards"
        subtitle="Granted the moment the milestone completes."
        actions={
          <Btn icon={Gift} onClick={() => onChange((x) => ({ ...x, rewards: [...x.rewards, makeReward()] }))}>
            Reward
          </Btn>
        }
      >
        <div className="mb-3 w-44">
          <Field label="Satisfaction points" hint="Awarded on top of the rewards below.">
            <NumberInput value={m.points} min={0} step={50} onChange={(v) => set("points", v)} />
          </Field>
        </div>
        {m.rewards.length === 0 ? (
          <EmptyHint>No rewards attached.</EmptyHint>
        ) : (
          <div className="space-y-2">
            {m.rewards.map((r) => (
              <div key={r.id} className="rounded-md border border-border bg-background/60 p-2.5">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="w-48">
                    <Field label="Reward type">
                      <SelectInput<RewardType>
                        value={r.type}
                        onChange={(v) =>
                          onChange((x) => ({
                            ...x,
                            rewards: x.rewards.map((y) =>
                              y.id === r.id ? { ...y, type: v, ref: null } : y,
                            ),
                          }))
                        }
                        options={REWARD_TYPES.map((t) => ({ value: t, label: REWARD_LABEL[t] }))}
                      />
                    </Field>
                  </div>
                  {REWARD_NUMERIC.includes(r.type) ? (
                    <div className="w-36">
                      <Field label="Amount">
                        <NumberInput
                          value={r.amount}
                          min={0}
                          step={50}
                          onChange={(v) =>
                            onChange((x) => ({
                              ...x,
                              rewards: x.rewards.map((y) =>
                                y.id === r.id ? { ...y, amount: v } : y,
                              ),
                            }))
                          }
                        />
                      </Field>
                    </div>
                  ) : (
                    <div className="min-w-[200px] flex-1">
                      <RefField
                        label={REWARD_LABEL[r.type]}
                        expects={pickerKind(REWARD_EXPECTS[r.type])}
                        value={r.ref}
                        onChange={(ref) =>
                          onChange((x) => ({
                            ...x,
                            rewards: x.rewards.map((y) => (y.id === r.id ? { ...y, ref } : y)),
                          }))
                        }
                      />
                    </div>
                  )}
                  <Btn
                    variant="danger"
                    onClick={() =>
                      onChange((x) => ({ ...x, rewards: x.rewards.filter((y) => y.id !== r.id) }))
                    }
                  >
                    Remove
                  </Btn>
                </div>
                <div className="mt-2">
                  <Field label="Notes / custom payload" hint="Free text carried into the build report.">
                    <TextInput
                      value={r.text}
                      onChange={(e) =>
                        onChange((x) => ({
                          ...x,
                          rewards: x.rewards.map((y) =>
                            y.id === r.id ? { ...y, text: e.target.value } : y,
                          ),
                        }))
                      }
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title="Failure conditions"
        subtitle="Optional. What resets or fails this milestone."
        actions={
          <Btn icon={Plus} onClick={() => onChange((x) => ({ ...x, failures: [...x.failures, makeFailure()] }))}>
            Condition
          </Btn>
        }
      >
        {m.failures.length === 0 ? (
          <EmptyHint>No failure states — the milestone can only move forward.</EmptyHint>
        ) : (
          <div className="space-y-2">
            {m.failures.map((f) => (
              <div key={f.id} className="flex flex-wrap items-end gap-2">
                <div className="w-52">
                  <Field label="Failure">
                    <SelectInput<FailureKind>
                      value={f.kind}
                      onChange={(v) =>
                        onChange((x) => ({
                          ...x,
                          failures: x.failures.map((y) => (y.id === f.id ? { ...y, kind: v } : y)),
                        }))
                      }
                      options={FAILURE_KINDS.map((k) => ({ value: k, label: FAILURE_LABEL[k] }))}
                    />
                  </Field>
                </div>
                <div className="min-w-[140px] flex-1">
                  <Field label="Detail">
                    <TextInput
                      value={f.value}
                      onChange={(e) =>
                        onChange((x) => ({
                          ...x,
                          failures: x.failures.map((y) =>
                            y.id === f.id ? { ...y, value: e.target.value } : y,
                          ),
                        }))
                      }
                    />
                  </Field>
                </div>
                <Btn
                  variant="danger"
                  onClick={() =>
                    onChange((x) => ({ ...x, failures: x.failures.filter((y) => y.id !== f.id) }))
                  }
                >
                  Remove
                </Btn>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title="Objective templates"
        subtitle="Start from a known-good goal instead of an empty one."
      >
        <div className="flex flex-wrap gap-1.5">
          {OBJECTIVE_TEMPLATES.map((t) => (
            <Chip key={t.id} onClick={() => onAddObjective(t.type, t.label)}>
              {t.label}
            </Chip>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* --------------------------------------------------- objective inspector -- */

function ObjectiveInspector({
  doc,
  milestone,
  objective: o,
  validation,
  onChange,
}: {
  doc: AspirationDoc;
  milestone: AspirationMilestone;
  objective: AspirationObjective;
  validation: AspirationValidation;
  onChange: (fn: (o: AspirationObjective) => AspirationObjective) => void;
}) {
  const spec = objectiveTypeSpec(o.type);
  const issues = validation.issues.filter((i) => i.target === o.id);
  const pct = o.count > 0 ? Math.min(100, Math.round((o.current / o.count) * 100)) : 0;

  const setParam = (id: string, v: string | number | boolean) =>
    onChange((x) => ({ ...x, params: { ...x.params, [id]: v } }));

  const siblings = milestone.objectives.filter((s) => s.uuid !== o.uuid);

  const renderField = (f: GoalField) => {
    if (f.kind === "ref")
      return (
        <RefField
          key={f.id}
          label={f.label}
          expects={pickerKind(f.expects)}
          value={o.refs[f.id] ?? null}
          onChange={(ref) => onChange((x) => ({ ...x, refs: { ...x.refs, [f.id]: ref } }))}
          {...(f.hint ? { hint: f.hint } : {})}
        />
      );
    if (f.kind === "toggle")
      return (
        <Toggle
          key={f.id}
          checked={Boolean(o.params[f.id])}
          onChange={(v) => setParam(f.id, v)}
          label={f.label}
          {...(f.hint ? { hint: f.hint } : {})}
        />
      );
    return (
      <Field key={f.id} label={f.label} {...(f.hint ? { hint: f.hint } : {})}>
        {f.kind === "number" ? (
          <NumberInput
            value={Number(o.params[f.id] ?? 0)}
            {...(f.min !== undefined ? { min: f.min } : {})}
            {...(f.max !== undefined ? { max: f.max } : {})}
            onChange={(v) => setParam(f.id, v)}
          />
        ) : f.kind === "select" ? (
          <SelectInput
            value={String(o.params[f.id] ?? f.options?.[0]?.value ?? "")}
            onChange={(v) => setParam(f.id, v)}
            options={f.options ?? []}
          />
        ) : (
          <TextInput
            value={String(o.params[f.id] ?? "")}
            onChange={(e) => setParam(f.id, e.target.value)}
          />
        )}
      </Field>
    );
  };

  return (
    <div className="space-y-4">
      <Panel title="Objective" subtitle={spec.hint}>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Objective name" hint="Player-facing. Localised automatically.">
            <TextInput value={o.label} onChange={(e) => onChange((x) => ({ ...x, label: e.target.value }))} />
          </Field>
          <Field label="Internal name" hint="Unique. Derived from the name when left empty.">
            <TextInput
              value={o.internalName}
              placeholder={objectiveInternalName(doc, o)}
              onChange={(e) => onChange((x) => ({ ...x, internalName: e.target.value }))}
              className="font-mono"
            />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Description" hint="Optional helper text. Appears in the journal.">
            <TextArea
              rows={2}
              value={o.description}
              onChange={(e) => onChange((x) => ({ ...x, description: e.target.value }))}
            />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Objective type" hint="Changing the type swaps the fields below.">
            <SelectInput<ObjectiveTypeId>
              value={o.type}
              onChange={(v) =>
                onChange((x) => ({
                  ...x,
                  type: v,
                  params: { ...defaultParams(v) },
                  refs: {},
                  progress: objectiveTypeSpec(v).progress,
                }))
              }
              options={OBJECTIVE_GROUPS.flatMap((g) =>
                OBJECTIVE_TYPES.filter((t) => t.group === g).map((t) => ({
                  value: t.id,
                  label: `${g} — ${t.label}`,
                })),
              )}
            />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone="muted">{spec.testClass}</Badge>
          {spec.connects.map((c) => (
            <Badge key={c} tone="accent">
              {c}
            </Badge>
          ))}
        </div>
        {issues.length > 0 && (
          <ul className="mt-3 space-y-1">
            {issues.map((i) => (
              <li
                key={i.id}
                className={cn(
                  "text-[10.5px]",
                  i.level === "error" ? "text-red-500" : "text-amber-500",
                )}
              >
                {i.message}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={`${spec.label} settings`} subtitle="Every field here is written into the goal tuning.">
        <div className="grid gap-3 md:grid-cols-2">{spec.fields.map(renderField)}</div>
      </Panel>

      <Panel title="Progress tracking" subtitle="How the goal counts, and how the player sees it.">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Target value">
            <NumberInput value={o.count} min={0} onChange={(v) => onChange((x) => ({ ...x, count: v }))} />
          </Field>
          <Field label="Preview current value" hint="Editor preview only. Never exported.">
            <NumberInput
              value={o.current}
              min={0}
              onChange={(v) => onChange((x) => ({ ...x, current: v }))}
            />
          </Field>
          <Field label="Display style">
            <SelectInput<ProgressStyle>
              value={o.progress}
              onChange={(v) => onChange((x) => ({ ...x, progress: v }))}
              options={PROGRESS_STYLES}
            />
          </Field>
        </div>
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-[10.5px] text-muted-foreground">
            {o.current} / {o.count} · {pct}% · {o.progress}
          </p>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <Toggle
            checked={o.hidden}
            onChange={(v) => onChange((x) => ({ ...x, hidden: v }))}
            label="Hidden objective"
            hint="Tracked silently, never rendered."
          />
          <Toggle
            checked={o.optional}
            onChange={(v) => onChange((x) => ({ ...x, optional: v }))}
            label="Optional"
          />
          <Toggle
            checked={o.bonus}
            onChange={(v) => onChange((x) => ({ ...x, bonus: v }))}
            label="Bonus objective"
          />
        </div>
      </Panel>

      <Panel
        title="Conditions"
        subtitle="Extra tests that must pass for progress to count."
        actions={
          <Btn icon={Plus} onClick={() => onChange((x) => ({ ...x, conditions: [...x.conditions, makeCondition()] }))}>
            Condition
          </Btn>
        }
      >
        {o.conditions.length === 0 ? (
          <EmptyHint>No conditions — progress always counts.</EmptyHint>
        ) : (
          <div className="space-y-2">
            {o.conditions.map((c) => (
              <div key={c.id} className="flex flex-wrap items-end gap-2">
                <div className="w-44">
                  <Field label="Condition">
                    <SelectInput<ConditionKind>
                      value={c.kind}
                      onChange={(v) =>
                        onChange((x) => ({
                          ...x,
                          conditions: x.conditions.map((y) =>
                            y.id === c.id ? { ...y, kind: v } : y,
                          ),
                        }))
                      }
                      options={CONDITION_KINDS.map((k) => ({ value: k, label: CONDITION_LABEL[k] }))}
                    />
                  </Field>
                </div>
                <div className="min-w-[140px] flex-1">
                  <Field label="Value">
                    <TextInput
                      value={c.value}
                      onChange={(e) =>
                        onChange((x) => ({
                          ...x,
                          conditions: x.conditions.map((y) =>
                            y.id === c.id ? { ...y, value: e.target.value } : y,
                          ),
                        }))
                      }
                    />
                  </Field>
                </div>
                <Chip
                  active={c.negate}
                  onClick={() =>
                    onChange((x) => ({
                      ...x,
                      conditions: x.conditions.map((y) =>
                        y.id === c.id ? { ...y, negate: !y.negate } : y,
                      ),
                    }))
                  }
                >
                  NOT
                </Chip>
                <Btn
                  variant="danger"
                  onClick={() =>
                    onChange((x) => ({
                      ...x,
                      conditions: x.conditions.filter((y) => y.id !== c.id),
                    }))
                  }
                >
                  Remove
                </Btn>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Repeatability & timing" subtitle="Reset rules, windows and countdowns.">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Repeat mode">
            <SelectInput<RepeatMode>
              value={o.repeat.mode}
              onChange={(v) => onChange((x) => ({ ...x, repeat: { ...x.repeat, mode: v } }))}
              options={(Object.keys(REPEAT_LABEL) as RepeatMode[]).map((k) => ({
                value: k,
                label: REPEAT_LABEL[k],
              }))}
            />
          </Field>
          <Field label="Timing">
            <SelectInput<TimerMode>
              value={o.timer.mode}
              onChange={(v) => onChange((x) => ({ ...x, timer: { ...x.timer, mode: v } }))}
              options={(Object.keys(TIMER_LABEL) as TimerMode[]).map((k) => ({
                value: k,
                label: TIMER_LABEL[k],
              }))}
            />
          </Field>
        </div>
        {o.timer.mode !== "none" && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Field label="Duration (sim hours)">
              <NumberInput
                value={o.timer.hours}
                min={0}
                onChange={(v) => onChange((x) => ({ ...x, timer: { ...x.timer, hours: v } }))}
              />
            </Field>
            <Field label="Window" hint='e.g. "8:00–17:00", "Winter", "Harvestfest".'>
              <TextInput
                value={o.timer.window}
                onChange={(e) => onChange((x) => ({ ...x, timer: { ...x.timer, window: e.target.value } }))}
              />
            </Field>
          </div>
        )}
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <Toggle
            checked={o.repeat.resetOnFailure}
            onChange={(v) => onChange((x) => ({ ...x, repeat: { ...x.repeat, resetOnFailure: v } }))}
            label="Reset on failure"
          />
          <Toggle
            checked={o.repeat.resetOnTravel}
            onChange={(v) => onChange((x) => ({ ...x, repeat: { ...x.repeat, resetOnTravel: v } }))}
            label="Reset on travel"
          />
          <Toggle
            checked={o.repeat.resetOnAgeUp}
            onChange={(v) => onChange((x) => ({ ...x, repeat: { ...x.repeat, resetOnAgeUp: v } }))}
            label="Reset on age up"
          />
        </div>
      </Panel>

      <Panel
        title="Dependencies"
        subtitle="Objectives that must finish before this one starts counting."
      >
        {siblings.length === 0 ? (
          <EmptyHint>This milestone has no other objectives to depend on.</EmptyHint>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {siblings.map((s) => (
              <Chip
                key={s.uuid}
                active={o.dependsOn.includes(s.uuid)}
                onClick={() =>
                  onChange((x) => ({
                    ...x,
                    dependsOn: x.dependsOn.includes(s.uuid)
                      ? x.dependsOn.filter((d) => d !== s.uuid)
                      : [...x.dependsOn, s.uuid],
                  }))
                }
              >
                {s.label || "Untitled"}
              </Chip>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center gap-2 text-[10.5px] text-muted-foreground">
          <GitBranch className="h-3.5 w-3.5" />
          {o.dependsOn.length
            ? `Starts after ${o.dependsOn.length} objective(s)`
            : "Starts immediately with the milestone"}
        </div>
      </Panel>

      {o.type === "composite" && (
        <Panel
          title="Composite children"
          subtitle="Combined with the operator above (AND / OR / NOT)."
          actions={
            <Btn
              icon={Plus}
              onClick={() =>
                onChange((x) => ({ ...x, children: [...x.children, makeObjective("Child goal")] }))
              }
            >
              Child goal
            </Btn>
          }
        >
          {o.children.length === 0 ? (
            <EmptyHint>A composite goal with no children can never complete.</EmptyHint>
          ) : (
            <div className="space-y-2">
              {o.children.map((c) => (
                <div key={c.id} className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[160px] flex-1">
                    <Field label="Child name">
                      <TextInput
                        value={c.label}
                        onChange={(e) =>
                          onChange((x) => ({
                            ...x,
                            children: x.children.map((y) =>
                              y.id === c.id ? { ...y, label: e.target.value } : y,
                            ),
                          }))
                        }
                      />
                    </Field>
                  </div>
                  <div className="w-56">
                    <Field label="Type">
                      <SelectInput<ObjectiveTypeId>
                        value={c.type}
                        onChange={(v) =>
                          onChange((x) => ({
                            ...x,
                            children: x.children.map((y) =>
                              y.id === c.id
                                ? { ...y, type: v, params: defaultParams(v), refs: {} }
                                : y,
                            ),
                          }))
                        }
                        options={OBJECTIVE_TYPES.map((t) => ({ value: t.id, label: t.label }))}
                      />
                    </Field>
                  </div>
                  <Btn
                    variant="danger"
                    onClick={() =>
                      onChange((x) => ({ ...x, children: x.children.filter((y) => y.id !== c.id) }))
                    }
                  >
                    Remove
                  </Btn>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      <Panel title="Notes" subtitle="Editor-only. Never exported.">
        <TextArea
          rows={3}
          value={o.notes}
          onChange={(e) => onChange((x) => ({ ...x, notes: e.target.value }))}
        />
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------------- preview -- */

/** Visual simulation of the in-game aspiration journal. */
function JournalPreview({ doc }: { doc: AspirationDoc }) {
  const stats = useMemo(() => {
    const objectives = doc.milestones.flatMap((m) => m.objectives);
    const done = objectives.filter((o) => o.count > 0 && o.current >= o.count).length;
    return { total: objectives.length, done };
  }, [doc]);

  return (
    <Panel
      title="Aspiration journal preview"
      subtitle="Simulated with the preview values you entered on each objective."
      actions={
        <Badge tone="accent">
          {stats.done}/{stats.total} goals
        </Badge>
      }
    >
      {doc.milestones.length === 0 ? (
        <EmptyHint>Nothing to preview yet.</EmptyHint>
      ) : (
        <ol className="space-y-2">
          {doc.milestones.map((m, i) => {
            const required = requiredObjectives(m);
            const complete = m.objectives.filter((o) => o.count > 0 && o.current >= o.count).length;
            const unlocked = i === 0 || m.unlockMode === "auto";
            const finished = required > 0 && complete >= required;
            return (
              <li
                key={m.id}
                className={cn(
                  "rounded-lg border p-3",
                  finished
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : unlocked
                      ? "border-border bg-background/60"
                      : "border-dashed border-border bg-muted/30",
                )}
              >
                <div className="flex items-center gap-2">
                  <ListChecks className="h-3.5 w-3.5 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                    {m.hidden && !finished ? "??? Hidden milestone" : m.title || `Milestone ${i + 1}`}
                  </span>
                  {m.points > 0 && <Badge tone="accent">{m.points} pts</Badge>}
                  {finished && <Badge tone="ok">complete</Badge>}
                  {!unlocked && <Badge tone="muted">locked</Badge>}
                </div>
                {m.description && (
                  <p className="mt-1 text-[11px] text-muted-foreground">{m.description}</p>
                )}
                <ul className="mt-2 space-y-1.5">
                  {m.objectives
                    .filter((o) => !o.hidden)
                    .map((o) => {
                      const pct = o.count > 0 ? Math.min(100, (o.current / o.count) * 100) : 0;
                      return (
                        <li key={o.id} className="flex items-center gap-2">
                          <Target className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className="w-44 shrink-0 truncate text-[11px]">
                            {o.label || "Objective"}
                          </span>
                          <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                            <span
                              className="block h-full rounded-full bg-primary"
                              style={{ width: `${pct}%` }}
                            />
                          </span>
                          <span className="w-16 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                            {o.progress === "boolean"
                              ? o.current >= o.count
                                ? "done"
                                : "—"
                              : `${o.current}/${o.count}`}
                          </span>
                          {o.timer.mode !== "none" && (
                            <Timer className="h-3 w-3 shrink-0 text-amber-500" />
                          )}
                          {o.optional && <Eye className="h-3 w-3 shrink-0 text-muted-foreground" />}
                        </li>
                      );
                    })}
                </ul>
                {m.rewards.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.rewards.map((r) => (
                      <Badge key={r.id} tone="muted">
                        {REWARD_LABEL[r.type]}
                        {REWARD_NUMERIC.includes(r.type) ? ` ${r.amount}` : ""}
                      </Badge>
                    ))}
                  </div>
                )}
                {m.strings.notification && (
                  <p className="mt-2 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-[11px]">
                    {m.strings.notification}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
