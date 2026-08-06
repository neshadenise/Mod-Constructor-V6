/**
 * Aspiration Builder — Part 3 workspaces.
 *
 * Rewards, loot actions, buffs, notifications, broadcasters, event listeners,
 * wants & fears, story progression, journal, completion and failure.
 *
 * Every editor here writes into `doc.gameplay`. Nothing is stored in loose
 * component state, every reference goes through the resource picker, and every
 * cross-link (a reward pointing at a notification, a listener pointing at a
 * loot action) is stored as the target's permanent uuid so renames are safe.
 */

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Copy,
  GitBranch,
  Plus,
  Radio,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import { pickerKind, type GoalField, type GoalParamValue } from "@/lib/aspirations/goals";
import { allObjectives, ensureGameplay, type AspirationDoc } from "@/lib/aspirations/schema";
import {
  BROADCASTER_TARGETS,
  BUFF_APPLY_MODES,
  BUFF_CATEGORIES,
  COMPLETION_STAGES,
  COMPLETION_STAGE_LABEL,
  FAILURE_MODES,
  GAME_EVENTS,
  LISTENER_ACTION_KINDS,
  LOOT_OP_EXPECTS,
  LOOT_OP_TYPES,
  LOOT_TRIGGERS,
  NOTIFICATION_STYLES,
  NOTIFICATION_TRIGGERS,
  REPEAT_RULES,
  REWARD_CONDITION_KINDS,
  REWARD_GROUPS,
  REWARD_KIND_SPECS,
  REWARD_TRIGGERS,
  WANT_MODES,
  WANT_MODE_LABEL,
  makeBroadcaster,
  makeBuffLink,
  makeEventListener,
  makeListenerAction,
  makeLootAction,
  makeLootOp,
  makeNotification,
  makeRewardCard,
  makeRewardCondition,
  makeWantRule,
  rewardKindSpec,
  type AspirationGameplay,
  type BroadcasterDef,
  type BuffLink,
  type CompletionStage,
  type EventListenerDef,
  type LootActionDef,
  type LootOpType,
  type NotificationDef,
  type RewardCard,
  type RewardCondition,
  type RewardKind,
  type RewardScope,
  type WantRule,
} from "@/lib/aspirations/gameplay";
import type { SectionProps } from "./sections";

/* ------------------------------------------------------------ helpers -- */

type Patch = SectionProps["patch"];

const setGameplay = (patch: Patch, fn: (g: AspirationGameplay) => AspirationGameplay) =>
  patch((d) => ({ ...d, gameplay: fn(ensureGameplay(d)) }));

const label = (s: string) => s.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
const opts = (values: readonly string[]) =>
  values.map((v) => ({ value: v, label: label(v) }));

const issuesFor = (props: SectionProps, target: string) =>
  props.validation.issues.filter((i) => i.target === target);

/** Owner names for the "attached to" dropdowns. */
function useOwners(doc: AspirationDoc) {
  return useMemo(() => {
    const milestones = doc.milestones.map((m) => ({ value: m.uuid, label: m.title || "Milestone" }));
    const objectives = allObjectives(doc).map((o) => ({
      value: o.uuid,
      label: o.label || "Objective",
    }));
    return { milestones, objectives };
  }, [doc]);
}

function IssueList({ items }: { items: { level: string; message: string }[] }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-1">
      {items.map((i, n) => (
        <li
          key={n}
          className={cn(
            "flex items-start gap-1.5 text-[11px]",
            i.level === "error" ? "text-red-500" : "text-amber-500",
          )}
        >
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{i.message}</span>
        </li>
      ))}
    </ul>
  );
}

/** Master/detail list used by every gameplay workspace. */
function ListPane<T extends { id: string }>({
  items,
  selected,
  onSelect,
  render,
  badge,
  empty,
}: {
  items: T[];
  selected: string | null;
  onSelect: (id: string) => void;
  render: (item: T) => string;
  badge?: (item: T) => string | undefined;
  empty: string;
}) {
  if (!items.length) return <EmptyHint>{empty}</EmptyHint>;
  return (
    <div className="space-y-0.5">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px]",
            selected === item.id
              ? "bg-primary/15 text-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          <span className="flex-1 truncate">{render(item)}</span>
          {badge?.(item) && <Badge tone="muted">{badge(item)}</Badge>}
        </button>
      ))}
    </div>
  );
}

function ConditionEditor({
  conditions,
  onChange,
}: {
  conditions: RewardCondition[];
  onChange: (next: RewardCondition[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Conditions
        </span>
        <Btn icon={Plus} onClick={() => onChange([...conditions, makeRewardCondition()])}>
          Add
        </Btn>
      </div>
      {!conditions.length && (
        <p className="text-[11px] text-muted-foreground">
          No conditions — this always runs.
        </p>
      )}
      {conditions.map((c, i) => (
        <div key={c.id} className="flex items-center gap-1.5">
          <SelectInput
            className="w-40"
            value={c.kind}
            onChange={(v) =>
              onChange(conditions.map((x, n) => (n === i ? { ...x, kind: v } : x)))
            }
            options={opts(REWARD_CONDITION_KINDS)}
          />
          <TextInput
            value={c.value}
            placeholder="Value"
            onChange={(e) =>
              onChange(conditions.map((x, n) => (n === i ? { ...x, value: e.target.value } : x)))
            }
          />
          <Chip
            active={c.negate}
            tone="warn"
            onClick={() =>
              onChange(conditions.map((x, n) => (n === i ? { ...x, negate: !x.negate } : x)))
            }
          >
            NOT
          </Chip>
          <Btn icon={Trash2} variant="danger" onClick={() => onChange(conditions.filter((_, n) => n !== i))} />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ rewards -- */

export function RewardsSection(props: SectionProps) {
  const { doc, patch, validation } = props;
  const g = ensureGameplay(doc);
  const owners = useOwners(doc);
  const [sel, setSel] = useState<string | null>(g.rewards[0]?.id ?? null);
  const [scope, setScope] = useState<RewardScope | "all">("all");

  const visible = g.rewards
    .filter((r) => scope === "all" || r.scope === scope)
    .sort((a, b) => a.order - b.order);
  const current = g.rewards.find((r) => r.id === sel) ?? visible[0] ?? null;

  const update = (id: string, fn: (r: RewardCard) => RewardCard) =>
    setGameplay(patch, (x) => ({ ...x, rewards: x.rewards.map((r) => (r.id === id ? fn(r) : r)) }));

  const add = (kind: RewardKind) => {
    const card = makeRewardCard(kind, "aspiration", "", g.rewards.length);
    setGameplay(patch, (x) => ({ ...x, rewards: [...x.rewards, card] }));
    setSel(card.id);
  };

  const remove = (id: string) => {
    setGameplay(patch, (x) => ({ ...x, rewards: x.rewards.filter((r) => r.id !== id) }));
    setSel(null);
  };

  const duplicate = (r: RewardCard) => {
    const copy = {
      ...makeRewardCard(r.kind, r.scope, r.ownerUuid, g.rewards.length),
      name: `${r.name} copy`,
      params: { ...r.params },
      refs: { ...r.refs },
      trigger: r.trigger,
      conditions: r.conditions.map((c) => ({ ...c, id: `${c.id}_c` })),
    };
    setGameplay(patch, (x) => ({ ...x, rewards: [...x.rewards, copy] }));
    setSel(copy.id);
  };

  const move = (r: RewardCard, dir: -1 | 1) =>
    setGameplay(patch, (x) => {
      const sorted = [...x.rewards].sort((a, b) => a.order - b.order);
      const i = sorted.findIndex((c) => c.id === r.id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= sorted.length) return x;
      const next = [...sorted];
      const a = next[i]!;
      const b = next[j]!;
      next[i] = b;
      next[j] = a;
      return { ...x, rewards: next.map((c, n) => ({ ...c, order: n })) };
    });

  return (
    <div className="space-y-4">
      <Panel
        title="Rewards"
        subtitle="What the Sim receives. Rewards run in order — the list below is the execution sequence."
        actions={
          <div className="flex items-center gap-1.5">
            <SelectInput
              className="w-36"
              value={scope}
              onChange={(v) => setScope(v as RewardScope | "all")}
              options={[
                { value: "all", label: "All rewards" },
                { value: "aspiration", label: "Aspiration" },
                { value: "milestone", label: "Milestone" },
                { value: "objective", label: "Objective" },
              ]}
            />
            <Badge tone="accent">{g.rewards.length}</Badge>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-[230px_1fr]">
          <div className="space-y-2">
            <ListPane
              items={visible}
              selected={current?.id ?? null}
              onSelect={setSel}
              render={(r) => `${r.order + 1}. ${r.name}`}
              badge={(r) => (r.enabled ? undefined : "off")}
              empty="No rewards yet. Pick a reward type to start."
            />
            <div className="space-y-1.5 rounded-lg border border-border p-2">
              {REWARD_GROUPS.map((group) => (
                <div key={group} className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {group}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {REWARD_KIND_SPECS.filter((s) => s.group === group).map((s) => (
                      <Chip key={s.id} onClick={() => add(s.id)}>
                        {s.label}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {current ? (
            <RewardEditor
              key={current.id}
              reward={current}
              gameplay={g}
              owners={owners}
              issues={issuesFor(props, current.id)}
              onChange={(fn) => update(current.id, fn)}
              onDelete={() => remove(current.id)}
              onDuplicate={() => duplicate(current)}
              onMove={(d) => move(current, d)}
            />
          ) : (
            <EmptyHint>Select a reward to edit it.</EmptyHint>
          )}
        </div>
      </Panel>

      <Panel title="Execution preview" subtitle="The order rewards fire when this aspiration completes.">
        {validation.issues.some((i) => i.code === "REWARD_CYCLE") && (
          <p className="mb-2 text-[11px] text-red-500">
            A reward chain loops back on itself — the game would fire it forever.
          </p>
        )}
        <ol className="space-y-1">
          {g.rewards
            .filter((r) => r.scope === "aspiration" && r.trigger === "completed")
            .sort((a, b) => a.order - b.order)
            .map((r, i) => (
              <li key={r.id} className="flex items-center gap-2 text-[12px]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold">
                  {i + 1}
                </span>
                <span className="flex-1 truncate">{r.name}</span>
                <Badge tone="muted">{rewardKindSpec(r.kind).label}</Badge>
                <Badge tone={r.execution === "parallel" ? "accent" : "muted"}>{r.execution}</Badge>
              </li>
            ))}
        </ol>
        {!g.rewards.some((r) => r.scope === "aspiration") && (
          <EmptyHint>Completing this aspiration currently grants nothing.</EmptyHint>
        )}
      </Panel>
    </div>
  );
}

function RewardEditor({
  reward,
  gameplay,
  owners,
  issues,
  onChange,
  onDelete,
  onDuplicate,
  onMove,
}: {
  reward: RewardCard;
  gameplay: AspirationGameplay;
  owners: { milestones: { value: string; label: string }[]; objectives: { value: string; label: string }[] };
  issues: { level: string; message: string }[];
  onChange: (fn: (r: RewardCard) => RewardCard) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const spec = rewardKindSpec(reward.kind);
  const setParam = (id: string, v: GoalParamValue) =>
    onChange((r) => ({ ...r, params: { ...r.params, [id]: v } }));

  const renderField = (f: GoalField) => {
    if (f.id === "notificationId")
      return (
        <Field key={f.id} label={f.label} hint="Notifications are defined in the Notifications section.">
          <SelectInput
            value={String(reward.params[f.id] ?? "")}
            onChange={(v) => setParam(f.id, v)}
            options={[
              { value: "", label: "Select a notification…" },
              ...gameplay.notifications.map((n) => ({ value: n.uuid, label: n.name })),
            ]}
          />
        </Field>
      );
    if (f.kind === "ref")
      return (
        <RefField
          key={f.id}
          label={f.label}
          expects={pickerKind(f.expects)}
          value={reward.refs[f.id] ?? null}
          onChange={(ref) => onChange((r) => ({ ...r, refs: { ...r.refs, [f.id]: ref } }))}
          {...(f.hint ? { hint: f.hint } : {})}
        />
      );
    if (f.kind === "toggle")
      return (
        <Toggle
          key={f.id}
          checked={Boolean(reward.params[f.id])}
          onChange={(v) => setParam(f.id, v)}
          label={f.label}
          {...(f.hint ? { hint: f.hint } : {})}
        />
      );
    return (
      <Field key={f.id} label={f.label} {...(f.hint ? { hint: f.hint } : {})}>
        {f.kind === "number" ? (
          <NumberInput
            value={Number(reward.params[f.id] ?? 0)}
            {...(f.step !== undefined ? { step: f.step } : {})}
            onChange={(v) => setParam(f.id, v)}
          />
        ) : f.kind === "select" ? (
          <SelectInput
            value={String(reward.params[f.id] ?? f.options?.[0]?.value ?? "")}
            onChange={(v) => setParam(f.id, v)}
            options={f.options ?? []}
          />
        ) : (
          <TextInput
            value={String(reward.params[f.id] ?? "")}
            onChange={(e) => setParam(f.id, e.target.value)}
          />
        )}
      </Field>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="flex-1 truncate text-[12px] font-semibold">{spec.label}</span>
        <Btn onClick={() => onMove(-1)}>↑</Btn>
        <Btn onClick={() => onMove(1)}>↓</Btn>
        <Btn icon={Copy} onClick={onDuplicate}>
          Duplicate
        </Btn>
        <Btn icon={Trash2} variant="danger" onClick={onDelete}>
          Delete
        </Btn>
      </div>
      <p className="text-[11px] text-muted-foreground">{spec.hint}</p>
      <IssueList items={issues} />

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Reward name" hint="Editor label only.">
          <TextInput value={reward.name} onChange={(e) => onChange((r) => ({ ...r, name: e.target.value }))} />
        </Field>
        <Field label="Reward type">
          <SelectInput
            value={reward.kind}
            onChange={(v) =>
              onChange((r) => ({ ...r, kind: v as RewardKind, name: rewardKindSpec(v as RewardKind).label }))
            }
            options={REWARD_KIND_SPECS.map((s) => ({ value: s.id, label: `${s.group} · ${s.label}` }))}
          />
        </Field>
        <Field label="Attached to">
          <SelectInput
            value={reward.scope}
            onChange={(v) => onChange((r) => ({ ...r, scope: v as RewardScope, ownerUuid: "" }))}
            options={[
              { value: "aspiration", label: "The aspiration" },
              { value: "milestone", label: "A milestone" },
              { value: "objective", label: "An objective" },
            ]}
          />
        </Field>
        {reward.scope !== "aspiration" && (
          <Field label={reward.scope === "milestone" ? "Milestone" : "Objective"}>
            <SelectInput
              value={reward.ownerUuid}
              onChange={(v) => onChange((r) => ({ ...r, ownerUuid: v }))}
              options={[
                { value: "", label: "Select…" },
                ...(reward.scope === "milestone" ? owners.milestones : owners.objectives),
              ]}
            />
          </Field>
        )}
        <Field label="Trigger">
          <SelectInput
            value={reward.trigger}
            onChange={(v) => onChange((r) => ({ ...r, trigger: v as RewardCard["trigger"] }))}
            options={opts(REWARD_TRIGGERS)}
          />
        </Field>
        <Field label="Execution" hint="Parallel rewards fire together instead of queueing.">
          <SelectInput
            value={reward.execution}
            onChange={(v) => onChange((r) => ({ ...r, execution: v as RewardCard["execution"] }))}
            options={[
              { value: "sequential", label: "Sequential" },
              { value: "parallel", label: "Parallel" },
            ]}
          />
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-2">{spec.fields.map(renderField)}</div>

      <ConditionEditor
        conditions={reward.conditions}
        onChange={(conditions) => onChange((r) => ({ ...r, conditions }))}
      />

      <Toggle
        checked={reward.enabled}
        onChange={(v) => onChange((r) => ({ ...r, enabled: v }))}
        label="Include in export"
      />
      <Field label="Notes">
        <TextArea value={reward.notes} onChange={(e) => onChange((r) => ({ ...r, notes: e.target.value }))} />
      </Field>
    </div>
  );
}

/* --------------------------------------------------- loot & buffs -- */

export function GameplaySection(props: SectionProps) {
  const { doc, patch } = props;
  const g = ensureGameplay(doc);
  const owners = useOwners(doc);
  const [tab, setTab] = useState<"loot" | "buffs">("loot");
  const [selLoot, setSelLoot] = useState<string | null>(g.loot[0]?.id ?? null);
  const [selBuff, setSelBuff] = useState<string | null>(g.buffs[0]?.id ?? null);

  const loot = g.loot.find((l) => l.id === selLoot) ?? null;
  const buff = g.buffs.find((b) => b.id === selBuff) ?? null;

  const updLoot = (id: string, fn: (l: LootActionDef) => LootActionDef) =>
    setGameplay(patch, (x) => ({ ...x, loot: x.loot.map((l) => (l.id === id ? fn(l) : l)) }));
  const updBuff = (id: string, fn: (b: BuffLink) => BuffLink) =>
    setGameplay(patch, (x) => ({ ...x, buffs: x.buffs.map((b) => (b.id === id ? fn(b) : b)) }));

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        <Chip active={tab === "loot"} onClick={() => setTab("loot")}>
          Loot actions ({g.loot.length})
        </Chip>
        <Chip active={tab === "buffs"} onClick={() => setTab("buffs")}>
          Buffs ({g.buffs.length})
        </Chip>
      </div>

      {tab === "loot" ? (
        <Panel
          title="Loot actions"
          subtitle="Bundles of operations the game runs at a trigger point. Everything a reward can do, loot can do in sequence."
          actions={
            <Btn
              icon={Plus}
              variant="primary"
              onClick={() => {
                const l = makeLootAction();
                setGameplay(patch, (x) => ({ ...x, loot: [...x.loot, l] }));
                setSelLoot(l.id);
              }}
            >
              New loot
            </Btn>
          }
        >
          <div className="grid gap-4 md:grid-cols-[230px_1fr]">
            <ListPane
              items={g.loot}
              selected={loot?.id ?? null}
              onSelect={setSelLoot}
              render={(l) => l.name}
              badge={(l) => `${l.ops.length} ops`}
              empty="No loot actions yet."
            />
            {loot ? (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  <span className="flex-1 text-[12px] font-semibold">Loot action</span>
                  <Btn
                    icon={Trash2}
                    variant="danger"
                    onClick={() => {
                      setGameplay(patch, (x) => ({ ...x, loot: x.loot.filter((l) => l.id !== loot.id) }));
                      setSelLoot(null);
                    }}
                  >
                    Delete
                  </Btn>
                </div>
                <IssueList items={issuesFor(props, loot.id)} />
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Name">
                    <TextInput
                      value={loot.name}
                      onChange={(e) => updLoot(loot.id, (l) => ({ ...l, name: e.target.value }))}
                    />
                  </Field>
                  <Field label="Internal name" hint="Used for the tuning file name.">
                    <TextInput
                      className="font-mono"
                      value={loot.internalName}
                      onChange={(e) => updLoot(loot.id, (l) => ({ ...l, internalName: e.target.value }))}
                    />
                  </Field>
                  <Field label="Trigger">
                    <SelectInput
                      value={loot.trigger}
                      onChange={(v) => updLoot(loot.id, (l) => ({ ...l, trigger: v as LootActionDef["trigger"] }))}
                      options={opts(LOOT_TRIGGERS)}
                    />
                  </Field>
                  {loot.trigger === "custom-event" ? (
                    <Field label="Custom event name">
                      <TextInput
                        value={loot.customEvent}
                        onChange={(e) => updLoot(loot.id, (l) => ({ ...l, customEvent: e.target.value }))}
                      />
                    </Field>
                  ) : loot.trigger.startsWith("milestone") || loot.trigger.startsWith("objective") ? (
                    <Field label={loot.trigger.startsWith("milestone") ? "Milestone" : "Objective"}>
                      <SelectInput
                        value={loot.ownerUuid}
                        onChange={(v) => updLoot(loot.id, (l) => ({ ...l, ownerUuid: v }))}
                        options={[
                          { value: "", label: "Any" },
                          ...(loot.trigger.startsWith("milestone") ? owners.milestones : owners.objectives),
                        ]}
                      />
                    </Field>
                  ) : null}
                  <Field label="Cooldown (hours)" hint="0 = no cooldown.">
                    <NumberInput
                      value={loot.cooldownHours}
                      onChange={(v) => updLoot(loot.id, (l) => ({ ...l, cooldownHours: v }))}
                    />
                  </Field>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Operations
                    </span>
                    <Btn
                      icon={Plus}
                      onClick={() => updLoot(loot.id, (l) => ({ ...l, ops: [...l.ops, makeLootOp()] }))}
                    >
                      Add operation
                    </Btn>
                  </div>
                  {!loot.ops.length && <EmptyHint>This loot does nothing yet.</EmptyHint>}
                  {loot.ops.map((op, i) => {
                    const expects = LOOT_OP_EXPECTS[op.type];
                    return (
                      <div key={op.id} className="space-y-2 rounded-lg border border-border p-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-muted-foreground">{i + 1}</span>
                          <SelectInput
                            className="flex-1"
                            value={op.type}
                            onChange={(v) =>
                              updLoot(loot.id, (l) => ({
                                ...l,
                                ops: l.ops.map((o, n) =>
                                  n === i ? { ...o, type: v as LootOpType, ref: null } : o,
                                ),
                              }))
                            }
                            options={opts(LOOT_OP_TYPES)}
                          />
                          <Btn
                            icon={Trash2}
                            variant="danger"
                            onClick={() =>
                              updLoot(loot.id, (l) => ({ ...l, ops: l.ops.filter((_, n) => n !== i) }))
                            }
                          />
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                          {expects && (
                            <RefField
                              label="Target"
                              expects={pickerKind(expects)}
                              value={op.ref}
                              onChange={(ref) =>
                                updLoot(loot.id, (l) => ({
                                  ...l,
                                  ops: l.ops.map((o, n) => (n === i ? { ...o, ref } : o)),
                                }))
                              }
                            />
                          )}
                          {op.type === "notification" ? (
                            <Field label="Notification">
                              <SelectInput
                                value={op.value}
                                onChange={(v) =>
                                  updLoot(loot.id, (l) => ({
                                    ...l,
                                    ops: l.ops.map((o, n) => (n === i ? { ...o, value: v } : o)),
                                  }))
                                }
                                options={[
                                  { value: "", label: "Select…" },
                                  ...g.notifications.map((n) => ({ value: n.uuid, label: n.name })),
                                ]}
                              />
                            </Field>
                          ) : (
                            <Field label="Value" hint="Optional free-form value.">
                              <TextInput
                                value={op.value}
                                onChange={(e) =>
                                  updLoot(loot.id, (l) => ({
                                    ...l,
                                    ops: l.ops.map((o, n) => (n === i ? { ...o, value: e.target.value } : o)),
                                  }))
                                }
                              />
                            </Field>
                          )}
                          <Field label="Amount">
                            <NumberInput
                              value={op.amount}
                              onChange={(v) =>
                                updLoot(loot.id, (l) => ({
                                  ...l,
                                  ops: l.ops.map((o, n) => (n === i ? { ...o, amount: v } : o)),
                                }))
                              }
                            />
                          </Field>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <ConditionEditor
                  conditions={loot.conditions}
                  onChange={(conditions) => updLoot(loot.id, (l) => ({ ...l, conditions }))}
                />
                <Toggle
                  checked={loot.enabled}
                  onChange={(v) => updLoot(loot.id, (l) => ({ ...l, enabled: v }))}
                  label="Include in export"
                />
              </div>
            ) : (
              <EmptyHint>Select a loot action.</EmptyHint>
            )}
          </div>
        </Panel>
      ) : (
        <Panel
          title="Buffs"
          subtitle="Buffs applied by this aspiration, with the lifetime rules that decide when they end."
          actions={
            <Btn
              icon={Plus}
              variant="primary"
              onClick={() => {
                const b = makeBuffLink();
                setGameplay(patch, (x) => ({ ...x, buffs: [...x.buffs, b] }));
                setSelBuff(b.id);
              }}
            >
              New buff
            </Btn>
          }
        >
          <div className="grid gap-4 md:grid-cols-[230px_1fr]">
            <ListPane
              items={g.buffs}
              selected={buff?.id ?? null}
              onSelect={setSelBuff}
              render={(b) => b.name}
              badge={(b) => b.category}
              empty="No buffs connected."
            />
            {buff ? (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <span className="flex-1 text-[12px] font-semibold">Buff</span>
                  <Btn
                    icon={Trash2}
                    variant="danger"
                    onClick={() => {
                      setGameplay(patch, (x) => ({ ...x, buffs: x.buffs.filter((b) => b.id !== buff.id) }));
                      setSelBuff(null);
                    }}
                  >
                    Delete
                  </Btn>
                </div>
                <IssueList items={issuesFor(props, buff.id)} />
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Label">
                    <TextInput
                      value={buff.name}
                      onChange={(e) => updBuff(buff.id, (b) => ({ ...b, name: e.target.value }))}
                    />
                  </Field>
                  <RefField
                    label="Buff"
                    expects="Buff"
                    value={buff.ref}
                    onChange={(ref) => updBuff(buff.id, (b) => ({ ...b, ref }))}
                    hint="Project buffs stay live-linked."
                  />
                  <Field label="Category">
                    <SelectInput
                      value={buff.category}
                      onChange={(v) => updBuff(buff.id, (b) => ({ ...b, category: v as BuffLink["category"] }))}
                      options={opts(BUFF_CATEGORIES)}
                    />
                  </Field>
                  <Field label="Apply mode">
                    <SelectInput
                      value={buff.applyMode}
                      onChange={(v) => updBuff(buff.id, (b) => ({ ...b, applyMode: v as BuffLink["applyMode"] }))}
                      options={opts(BUFF_APPLY_MODES)}
                    />
                  </Field>
                  <Field label="Duration (hours)" hint="0 = permanent.">
                    <NumberInput
                      value={buff.durationHours}
                      onChange={(v) => updBuff(buff.id, (b) => ({ ...b, durationHours: v }))}
                    />
                  </Field>
                  <Field label="Mood">
                    <TextInput
                      value={buff.mood}
                      placeholder="Happy, Confident…"
                      onChange={(e) => updBuff(buff.id, (b) => ({ ...b, mood: e.target.value }))}
                    />
                  </Field>
                  <Field label="Priority">
                    <NumberInput
                      value={buff.priority}
                      onChange={(v) => updBuff(buff.id, (b) => ({ ...b, priority: v }))}
                    />
                  </Field>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Toggle
                    checked={buff.visible}
                    onChange={(v) => updBuff(buff.id, (b) => ({ ...b, visible: v }))}
                    label="Visible in the moodlet panel"
                  />
                  <Toggle
                    checked={buff.removeAfterTime}
                    onChange={(v) => updBuff(buff.id, (b) => ({ ...b, removeAfterTime: v }))}
                    label="Remove after the duration"
                  />
                  <Toggle
                    checked={buff.removeOnTravel}
                    onChange={(v) => updBuff(buff.id, (b) => ({ ...b, removeOnTravel: v }))}
                    label="Remove on travel"
                  />
                  <Toggle
                    checked={buff.removeOnDeath}
                    onChange={(v) => updBuff(buff.id, (b) => ({ ...b, removeOnDeath: v }))}
                    label="Remove on death"
                  />
                  <Toggle
                    checked={buff.removeOnMilestone}
                    onChange={(v) => updBuff(buff.id, (b) => ({ ...b, removeOnMilestone: v }))}
                    label="Remove when a milestone completes"
                  />
                </div>
                {buff.removeOnMilestone && (
                  <Field label="Milestone">
                    <SelectInput
                      value={buff.removeOnMilestoneUuid}
                      onChange={(v) => updBuff(buff.id, (b) => ({ ...b, removeOnMilestoneUuid: v }))}
                      options={[{ value: "", label: "Select…" }, ...owners.milestones]}
                    />
                  </Field>
                )}
              </div>
            ) : (
              <EmptyHint>Select a buff.</EmptyHint>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ------------------------------------- notifications & broadcasters -- */

export function NotificationsSection(props: SectionProps) {
  const { doc, patch } = props;
  const g = ensureGameplay(doc);
  const [tab, setTab] = useState<"notifications" | "broadcasters">("notifications");
  const [selNote, setSelNote] = useState<string | null>(g.notifications[0]?.id ?? null);
  const [selBc, setSelBc] = useState<string | null>(g.broadcasters[0]?.id ?? null);

  const note = g.notifications.find((n) => n.id === selNote) ?? null;
  const bc = g.broadcasters.find((b) => b.id === selBc) ?? null;

  const updNote = (id: string, fn: (n: NotificationDef) => NotificationDef) =>
    setGameplay(patch, (x) => ({
      ...x,
      notifications: x.notifications.map((n) => (n.id === id ? fn(n) : n)),
    }));
  const updBc = (id: string, fn: (b: BroadcasterDef) => BroadcasterDef) =>
    setGameplay(patch, (x) => ({
      ...x,
      broadcasters: x.broadcasters.map((b) => (b.id === id ? fn(b) : b)),
    }));

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        <Chip active={tab === "notifications"} onClick={() => setTab("notifications")}>
          Notifications ({g.notifications.length})
        </Chip>
        <Chip active={tab === "broadcasters"} onClick={() => setTab("broadcasters")}>
          Broadcasters ({g.broadcasters.length})
        </Chip>
      </div>

      {tab === "notifications" ? (
        <Panel
          title="Notifications"
          subtitle="Popups, phone messages and journal updates. Localised strings join the aspiration's string table."
          actions={
            <Btn
              icon={Plus}
              variant="primary"
              onClick={() => {
                const n = makeNotification();
                setGameplay(patch, (x) => ({ ...x, notifications: [...x.notifications, n] }));
                setSelNote(n.id);
              }}
            >
              New notification
            </Btn>
          }
        >
          <div className="grid gap-4 md:grid-cols-[230px_1fr]">
            <ListPane
              items={g.notifications}
              selected={note?.id ?? null}
              onSelect={setSelNote}
              render={(n) => n.name}
              badge={(n) => n.style}
              empty="No notifications yet."
            />
            {note ? (
              <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <Bell className="h-3.5 w-3.5 text-primary" />
                    <span className="flex-1 text-[12px] font-semibold">Notification</span>
                    <Btn
                      icon={Trash2}
                      variant="danger"
                      onClick={() => {
                        setGameplay(patch, (x) => ({
                          ...x,
                          notifications: x.notifications.filter((n) => n.id !== note.id),
                        }));
                        setSelNote(null);
                      }}
                    >
                      Delete
                    </Btn>
                  </div>
                  <IssueList items={issuesFor(props, note.id)} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Editor name">
                      <TextInput
                        value={note.name}
                        onChange={(e) => updNote(note.id, (n) => ({ ...n, name: e.target.value }))}
                      />
                    </Field>
                    <Field label="Style">
                      <SelectInput
                        value={note.style}
                        onChange={(v) => updNote(note.id, (n) => ({ ...n, style: v as NotificationDef["style"] }))}
                        options={opts(NOTIFICATION_STYLES)}
                      />
                    </Field>
                    <Field label="Fires on">
                      <SelectInput
                        value={note.trigger}
                        onChange={(v) =>
                          updNote(note.id, (n) => ({ ...n, trigger: v as NotificationDef["trigger"] }))
                        }
                        options={opts(NOTIFICATION_TRIGGERS)}
                      />
                    </Field>
                    <Field label="Duration (seconds)">
                      <NumberInput
                        value={note.durationSeconds}
                        onChange={(v) => updNote(note.id, (n) => ({ ...n, durationSeconds: v }))}
                      />
                    </Field>
                    <Field label="Priority">
                      <NumberInput
                        value={note.priority}
                        onChange={(v) => updNote(note.id, (n) => ({ ...n, priority: v }))}
                      />
                    </Field>
                    <Field label="Icon" hint="Optional icon key or project asset name.">
                      <TextInput
                        value={note.icon}
                        onChange={(e) => updNote(note.id, (n) => ({ ...n, icon: e.target.value }))}
                      />
                    </Field>
                    <Field label="Sound sting">
                      <TextInput
                        value={note.sound}
                        onChange={(e) => updNote(note.id, (n) => ({ ...n, sound: e.target.value }))}
                      />
                    </Field>
                    <Field label="Animation">
                      <TextInput
                        value={note.animation}
                        onChange={(e) => updNote(note.id, (n) => ({ ...n, animation: e.target.value }))}
                      />
                    </Field>
                  </div>
                  <Field label="Title">
                    <TextInput
                      value={note.title}
                      onChange={(e) => updNote(note.id, (n) => ({ ...n, title: e.target.value }))}
                    />
                  </Field>
                  <Field label="Body">
                    <TextArea
                      value={note.body}
                      onChange={(e) => updNote(note.id, (n) => ({ ...n, body: e.target.value }))}
                    />
                  </Field>
                  <Toggle
                    checked={note.localize}
                    onChange={(v) => updNote(note.id, (n) => ({ ...n, localize: v }))}
                    label="Localise this notification"
                    hint="Adds the title and body to the string table so translators can reach them."
                  />
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    In-game preview
                  </span>
                  <div className="rounded-xl border border-border bg-card p-3 shadow-lg">
                    <div className="mb-1 flex items-center gap-1.5">
                      <span className="h-6 w-6 rounded-md bg-primary/20" />
                      <span className="truncate text-[12px] font-semibold">
                        {note.title || "Notification title"}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {note.body || "The message body appears here."}
                    </p>
                    <div className="mt-2 flex items-center gap-1">
                      <Badge tone="accent">{note.style}</Badge>
                      <Badge tone="muted">{note.durationSeconds}s</Badge>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyHint>Select a notification.</EmptyHint>
            )}
          </div>
        </Panel>
      ) : (
        <Panel
          title="Broadcasters"
          subtitle="Area effects that reach nearby Sims while the aspiration is active."
          actions={
            <Btn
              icon={Plus}
              variant="primary"
              onClick={() => {
                const b = makeBroadcaster();
                setGameplay(patch, (x) => ({ ...x, broadcasters: [...x.broadcasters, b] }));
                setSelBc(b.id);
              }}
            >
              New broadcaster
            </Btn>
          }
        >
          <div className="grid gap-4 md:grid-cols-[230px_1fr]">
            <ListPane
              items={g.broadcasters}
              selected={bc?.id ?? null}
              onSelect={setSelBc}
              render={(b) => b.name}
              badge={(b) => `${b.radius}m`}
              empty="No broadcasters yet."
            />
            {bc ? (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <Radio className="h-3.5 w-3.5 text-primary" />
                  <span className="flex-1 text-[12px] font-semibold">Broadcaster</span>
                  <Btn
                    icon={Trash2}
                    variant="danger"
                    onClick={() => {
                      setGameplay(patch, (x) => ({
                        ...x,
                        broadcasters: x.broadcasters.filter((b) => b.id !== bc.id),
                      }));
                      setSelBc(null);
                    }}
                  >
                    Delete
                  </Btn>
                </div>
                <IssueList items={issuesFor(props, bc.id)} />
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Name">
                    <TextInput value={bc.name} onChange={(e) => updBc(bc.id, (b) => ({ ...b, name: e.target.value }))} />
                  </Field>
                  <Field label="Radius (metres)">
                    <NumberInput value={bc.radius} onChange={(v) => updBc(bc.id, (b) => ({ ...b, radius: v }))} />
                  </Field>
                  <Field label="Affects">
                    <SelectInput
                      value={bc.targets}
                      onChange={(v) => updBc(bc.id, (b) => ({ ...b, targets: v }))}
                      options={opts(BROADCASTER_TARGETS)}
                    />
                  </Field>
                  <Field label="Relationship filter" hint="Optional, e.g. friend, enemy.">
                    <TextInput
                      value={bc.relationshipFilter}
                      onChange={(e) => updBc(bc.id, (b) => ({ ...b, relationshipFilter: e.target.value }))}
                    />
                  </Field>
                  <RefField
                    label="Buff applied"
                    expects="Buff"
                    value={bc.buffRef}
                    onChange={(ref) => updBc(bc.id, (b) => ({ ...b, buffRef: ref }))}
                  />
                  <RefField
                    label="Trait filter"
                    expects="Trait"
                    value={bc.traitRef}
                    onChange={(ref) => updBc(bc.id, (b) => ({ ...b, traitRef: ref }))}
                    hint="Only Sims with this trait are affected."
                  />
                  <Field label="Frequency (hours)">
                    <NumberInput
                      value={bc.frequencyHours}
                      onChange={(v) => updBc(bc.id, (b) => ({ ...b, frequencyHours: v }))}
                    />
                  </Field>
                  <Field label="Effect duration (hours)">
                    <NumberInput
                      value={bc.durationHours}
                      onChange={(v) => updBc(bc.id, (b) => ({ ...b, durationHours: v }))}
                    />
                  </Field>
                  <Field label="Priority">
                    <NumberInput value={bc.priority} onChange={(v) => updBc(bc.id, (b) => ({ ...b, priority: v }))} />
                  </Field>
                </div>
                <ConditionEditor
                  conditions={bc.conditions}
                  onChange={(conditions) => updBc(bc.id, (b) => ({ ...b, conditions }))}
                />
              </div>
            ) : (
              <EmptyHint>Select a broadcaster.</EmptyHint>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}

/* --------------------- events, wants, story, completion & failure -- */

export function EventsSection(props: SectionProps) {
  const { doc, patch } = props;
  const g = ensureGameplay(doc);
  const owners = useOwners(doc);
  const [sel, setSel] = useState<string | null>(g.listeners[0]?.id ?? null);
  const listener = g.listeners.find((l) => l.id === sel) ?? null;

  const upd = (id: string, fn: (l: EventListenerDef) => EventListenerDef) =>
    setGameplay(patch, (x) => ({ ...x, listeners: x.listeners.map((l) => (l.id === id ? fn(l) : l)) }));

  const targetOptions = (kind: string) => {
    if (kind === "run-loot") return g.loot.map((l) => ({ value: l.uuid, label: l.name }));
    if (kind === "grant-reward") return g.rewards.map((r) => ({ value: r.uuid, label: r.name }));
    if (kind === "show-notification") return g.notifications.map((n) => ({ value: n.uuid, label: n.name }));
    if (kind === "advance-objective") return owners.objectives;
    if (kind === "complete-milestone" || kind === "fail-milestone") return owners.milestones;
    return [];
  };

  const updWant = (id: string, fn: (w: WantRule) => WantRule) =>
    setGameplay(patch, (x) => ({ ...x, wants: x.wants.map((w) => (w.id === id ? fn(w) : w)) }));

  const moveStage = (stage: CompletionStage, dir: -1 | 1) =>
    setGameplay(patch, (x) => {
      const order = [...x.completion.order];
      const i = order.indexOf(stage);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= order.length) return x;
      const a = order[i]!;
      order[i] = order[j]!;
      order[j] = a;
      return { ...x, completion: { ...x.completion, order } };
    });

  return (
    <div className="space-y-4">
      <Panel
        title="Event listeners"
        subtitle="React to things that happen elsewhere in the game and drive this aspiration forward."
        actions={
          <Btn
            icon={Plus}
            variant="primary"
            onClick={() => {
              const l = makeEventListener();
              setGameplay(patch, (x) => ({ ...x, listeners: [...x.listeners, l] }));
              setSel(l.id);
            }}
          >
            New listener
          </Btn>
        }
      >
        <div className="grid gap-4 md:grid-cols-[230px_1fr]">
          <ListPane
            items={g.listeners}
            selected={listener?.id ?? null}
            onSelect={setSel}
            render={(l) => l.name}
            badge={(l) => l.event}
            empty="No listeners yet."
          />
          {listener ? (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5 text-primary" />
                <span className="flex-1 text-[12px] font-semibold">Listener</span>
                <Btn
                  icon={Trash2}
                  variant="danger"
                  onClick={() => {
                    setGameplay(patch, (x) => ({
                      ...x,
                      listeners: x.listeners.filter((l) => l.id !== listener.id),
                    }));
                    setSel(null);
                  }}
                >
                  Delete
                </Btn>
              </div>
              <IssueList items={issuesFor(props, listener.id)} />
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Name">
                  <TextInput
                    value={listener.name}
                    onChange={(e) => upd(listener.id, (l) => ({ ...l, name: e.target.value }))}
                  />
                </Field>
                <Field label="Event">
                  <SelectInput
                    value={listener.event}
                    onChange={(v) => upd(listener.id, (l) => ({ ...l, event: v as EventListenerDef["event"] }))}
                    options={opts(GAME_EVENTS)}
                  />
                </Field>
                {listener.event === "custom-event" && (
                  <Field label="Custom event name">
                    <TextInput
                      value={listener.customEvent}
                      onChange={(e) => upd(listener.id, (l) => ({ ...l, customEvent: e.target.value }))}
                    />
                  </Field>
                )}
                <Field label="Cooldown (hours)">
                  <NumberInput
                    value={listener.cooldownHours}
                    onChange={(v) => upd(listener.id, (l) => ({ ...l, cooldownHours: v }))}
                  />
                </Field>
                <Field label="Priority">
                  <NumberInput
                    value={listener.priority}
                    onChange={(v) => upd(listener.id, (l) => ({ ...l, priority: v }))}
                  />
                </Field>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Actions
                  </span>
                  <Btn
                    icon={Plus}
                    onClick={() =>
                      upd(listener.id, (l) => ({ ...l, actions: [...l.actions, makeListenerAction()] }))
                    }
                  >
                    Add action
                  </Btn>
                </div>
                {!listener.actions.length && <EmptyHint>This listener does nothing yet.</EmptyHint>}
                {listener.actions.map((a, i) => (
                  <div key={a.id} className="flex flex-wrap items-center gap-1.5">
                    <SelectInput
                      className="w-44"
                      value={a.kind}
                      onChange={(v) =>
                        upd(listener.id, (l) => ({
                          ...l,
                          actions: l.actions.map((x, n) =>
                            n === i ? { ...x, kind: v as ListenerActionKindT, targetUuid: "" } : x,
                          ),
                        }))
                      }
                      options={opts(LISTENER_ACTION_KINDS)}
                    />
                    {a.kind === "custom" ? (
                      <TextInput
                        value={a.value}
                        placeholder="Custom behaviour"
                        onChange={(e) =>
                          upd(listener.id, (l) => ({
                            ...l,
                            actions: l.actions.map((x, n) => (n === i ? { ...x, value: e.target.value } : x)),
                          }))
                        }
                      />
                    ) : (
                      <SelectInput
                        className="flex-1"
                        value={a.targetUuid}
                        onChange={(v) =>
                          upd(listener.id, (l) => ({
                            ...l,
                            actions: l.actions.map((x, n) => (n === i ? { ...x, targetUuid: v } : x)),
                          }))
                        }
                        options={[{ value: "", label: "Select target…" }, ...targetOptions(a.kind)]}
                      />
                    )}
                    <Btn
                      icon={Trash2}
                      variant="danger"
                      onClick={() =>
                        upd(listener.id, (l) => ({ ...l, actions: l.actions.filter((_, n) => n !== i) }))
                      }
                    />
                  </div>
                ))}
              </div>

              <ConditionEditor
                conditions={listener.conditions}
                onChange={(conditions) => upd(listener.id, (l) => ({ ...l, conditions }))}
              />
              <Toggle
                checked={listener.enabled}
                onChange={(v) => upd(listener.id, (l) => ({ ...l, enabled: v }))}
                label="Listener enabled"
              />
            </div>
          ) : (
            <EmptyHint>Select a listener.</EmptyHint>
          )}
        </div>
      </Panel>

      <Panel
        title="Wants & fears"
        subtitle="Steer the wants system while this aspiration is active."
        actions={
          <Btn
            icon={Plus}
            onClick={() => setGameplay(patch, (x) => ({ ...x, wants: [...x.wants, makeWantRule()] }))}
          >
            Add rule
          </Btn>
        }
      >
        {!g.wants.length && <EmptyHint>No wants or fears rules.</EmptyHint>}
        <div className="space-y-2">
          {g.wants.map((w) => (
            <div key={w.id} className="grid gap-2 rounded-lg border border-border p-2 md:grid-cols-4">
              <Field label="Behaviour">
                <SelectInput
                  value={w.mode}
                  onChange={(v) => updWant(w.id, (x) => ({ ...x, mode: v as WantRule["mode"] }))}
                  options={WANT_MODES.map((m) => ({ value: m, label: WANT_MODE_LABEL[m] }))}
                />
              </Field>
              <RefField
                label="Target"
                expects="Interaction"
                value={w.ref}
                onChange={(ref) => updWant(w.id, (x) => ({ ...x, ref }))}
              />
              <Field label="Attached to">
                <SelectInput
                  value={w.ownerUuid}
                  onChange={(v) => updWant(w.id, (x) => ({ ...x, ownerUuid: v }))}
                  options={[
                    { value: "", label: "Whole aspiration" },
                    ...owners.milestones,
                    ...owners.objectives,
                  ]}
                />
              </Field>
              <div className="flex items-end gap-1.5">
                <Field label="Weight" className="flex-1">
                  <NumberInput value={w.weight} onChange={(v) => updWant(w.id, (x) => ({ ...x, weight: v }))} />
                </Field>
                <Btn
                  icon={Trash2}
                  variant="danger"
                  onClick={() => setGameplay(patch, (x) => ({ ...x, wants: x.wants.filter((y) => y.id !== w.id) }))}
                />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Story progression" subtitle="How NPCs and the wider world engage with this aspiration.">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Audience">
            <SelectInput
              value={g.story.audience}
              onChange={(v) =>
                setGameplay(patch, (x) => ({
                  ...x,
                  story: { ...x.story, audience: v as AspirationGameplay["story"]["audience"] },
                }))
              }
              options={[
                { value: "player-only", label: "Played Sims only" },
                { value: "npc-only", label: "NPCs only" },
                { value: "everyone", label: "Everyone" },
              ]}
            />
          </Field>
          <Field label="Random assignment chance (%)">
            <NumberInput
              value={g.story.randomChance}
              max={100}
              onChange={(v) => setGameplay(patch, (x) => ({ ...x, story: { ...x.story, randomChance: v } }))}
            />
          </Field>
          <Field label="Population weight">
            <NumberInput
              value={g.story.populationWeight}
              onChange={(v) => setGameplay(patch, (x) => ({ ...x, story: { ...x.story, populationWeight: v } }))}
            />
          </Field>
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {(
            [
              ["npcProgress", "NPCs make progress off-screen"],
              ["autonomousProgress", "Autonomous progress"],
              ["householdStories", "Feed household stories"],
              ["storyArcs", "Participate in story arcs"],
              ["milestoneUnlocks", "Milestones unlock story beats"],
              ["townieGeneration", "Assign to generated townies"],
            ] as const
          ).map(([key, text]) => (
            <Toggle
              key={key}
              checked={g.story[key]}
              onChange={(v) => setGameplay(patch, (x) => ({ ...x, story: { ...x.story, [key]: v } }))}
              label={text}
            />
          ))}
        </div>
      </Panel>

      <Panel title="Journal" subtitle="What the aspiration panel shows the player.">
        <div className="grid gap-2 md:grid-cols-2">
          {(
            [
              ["enabled", "Show in the aspiration journal"],
              ["showCurrentMilestone", "Show the current milestone"],
              ["showCompletedObjectives", "Show completed objectives"],
              ["showLockedObjectives", "Show locked objectives"],
              ["showRewardPreview", "Preview the rewards"],
              ["showProgressPercent", "Show progress percentage"],
            ] as const
          ).map(([key, text]) => (
            <Toggle
              key={key}
              checked={g.journal[key]}
              onChange={(v) => setGameplay(patch, (x) => ({ ...x, journal: { ...x.journal, [key]: v } }))}
              label={text}
            />
          ))}
        </div>
        <Field label="Flavour text" className="mt-3">
          <TextArea
            value={g.journal.flavorText}
            onChange={(e) =>
              setGameplay(patch, (x) => ({ ...x, journal: { ...x.journal, flavorText: e.target.value } }))
            }
          />
        </Field>
      </Panel>

      <Panel title="Completion behaviour" subtitle="What happens the moment the last milestone finishes.">
        <IssueList items={issuesFor(props, "completion")} />
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Timing">
            <SelectInput
              value={g.completion.timing}
              onChange={(v) =>
                setGameplay(patch, (x) => ({
                  ...x,
                  completion: { ...x.completion, timing: v as AspirationGameplay["completion"]["timing"] },
                }))
              }
              options={[
                { value: "immediate", label: "Immediately" },
                { value: "delayed", label: "After a delay" },
                { value: "animation-wait", label: "After the animation" },
                { value: "notification-wait", label: "After the notification" },
              ]}
            />
          </Field>
          {g.completion.timing === "delayed" && (
            <Field label="Delay (seconds)">
              <NumberInput
                value={g.completion.delaySeconds}
                onChange={(v) =>
                  setGameplay(patch, (x) => ({ ...x, completion: { ...x.completion, delaySeconds: v } }))
                }
              />
            </Field>
          )}
          <Field label="Repeatable">
            <SelectInput
              value={g.completion.repeat}
              onChange={(v) =>
                setGameplay(patch, (x) => ({
                  ...x,
                  completion: { ...x.completion, repeat: v as AspirationGameplay["completion"]["repeat"] },
                }))
              }
              options={opts(REPEAT_RULES)}
            />
          </Field>
          {g.completion.repeat === "custom" && (
            <Field label="Custom reset rule">
              <TextInput
                value={g.completion.customResetRule}
                onChange={(e) =>
                  setGameplay(patch, (x) => ({
                    ...x,
                    completion: { ...x.completion, customResetRule: e.target.value },
                  }))
                }
              />
            </Field>
          )}
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <Toggle
            checked={g.completion.queueRewards}
            onChange={(v) => setGameplay(patch, (x) => ({ ...x, completion: { ...x.completion, queueRewards: v } }))}
            label="Queue reward popups instead of stacking them"
          />
          <Toggle
            checked={g.completion.saveCompletion}
            onChange={(v) =>
              setGameplay(patch, (x) => ({ ...x, completion: { ...x.completion, saveCompletion: v } }))
            }
            label="Save completion to the Sim"
          />
        </div>
        <div className="mt-3 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Completion order
          </span>
          {g.completion.order.map((stage, i) => (
            <div key={stage} className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1">
              <span className="w-4 text-[10px] font-mono text-muted-foreground">{i + 1}</span>
              <span className="flex-1 text-[12px]">{COMPLETION_STAGE_LABEL[stage]}</span>
              <Btn onClick={() => moveStage(stage, -1)}>↑</Btn>
              <Btn onClick={() => moveStage(stage, 1)}>↓</Btn>
            </div>
          ))}
          {g.completion.order.length !== COMPLETION_STAGES.length && (
            <Btn
              onClick={() =>
                setGameplay(patch, (x) => ({
                  ...x,
                  completion: { ...x.completion, order: [...COMPLETION_STAGES] },
                }))
              }
            >
              Restore default order
            </Btn>
          )}
        </div>
      </Panel>

      <Panel title="Failure behaviour" subtitle="Optional. Only aspirations that can be failed need this.">
        <IssueList items={issuesFor(props, "failure")} />
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="On failure">
            <SelectInput
              value={g.failure.mode}
              onChange={(v) =>
                setGameplay(patch, (x) => ({
                  ...x,
                  failure: { ...x.failure, mode: v as AspirationGameplay["failure"]["mode"] },
                }))
              }
              options={opts(FAILURE_MODES)}
            />
          </Field>
          <Field label="Notification">
            <SelectInput
              value={g.failure.notificationUuid}
              onChange={(v) =>
                setGameplay(patch, (x) => ({ ...x, failure: { ...x.failure, notificationUuid: v } }))
              }
              options={[
                { value: "", label: "None" },
                ...g.notifications.map((n) => ({ value: n.uuid, label: n.name })),
              ]}
            />
          </Field>
          <RefField
            label="Failure loot"
            expects="Loot"
            value={g.failure.lootRef}
            onChange={(ref) => setGameplay(patch, (x) => ({ ...x, failure: { ...x.failure, lootRef: ref } }))}
          />
          <RefField
            label="Failure buff"
            expects="Buff"
            value={g.failure.buffRef}
            onChange={(ref) => setGameplay(patch, (x) => ({ ...x, failure: { ...x.failure, buffRef: ref } }))}
          />
        </div>
        <Toggle
          checked={g.failure.keepRewards}
          onChange={(v) => setGameplay(patch, (x) => ({ ...x, failure: { ...x.failure, keepRewards: v } }))}
          label="Keep rewards already earned"
        />
      </Panel>
    </div>
  );
}

type ListenerActionKindT = EventListenerDef["actions"][number]["kind"];
