/**
 * Aspiration export.
 *
 * Turns an AspirationDoc into the resources a package needs: aspiration tuning
 * XML, milestone/objective stubs, STBL entries, the icon reference, a
 * dependency manifest and a build report. References are resolved to ids here
 * and nowhere else.
 *
 * SimData: the game will not load aspiration tuning without its SimData
 * companion and this build has no SimData writer. The key pair is generated
 * and validated so the package is correct the moment a writer exists — the
 * result is reported as non-loadable rather than silently shipped.
 */

import { canSerializeSimData, requiresSimData } from "@/lib/modexport/simdata";
import { keyToString } from "@/lib/modexport/ids";
import {
  ALL_STRING_FIELDS,
  computeAspirationKeys,
  computeGameplayKeys,
  ensureStringKeys,
  notificationStringKeys,
  type AspirationGameplayKeys,
  type AspirationKeys,
} from "./ids";
import {
  COMPLETION_STAGE_LABEL,
  rewardKindSpec,
  rewardsFor,
  type AspirationGameplay,
  type RewardCard,
  type RewardCondition,
} from "./gameplay";
import { REWARD_NUMERIC, objectiveTypeSpec } from "./goals";
import {
  AGE_LABEL,
  aspirationTypeSpec,
  collectRefs,
  ensureGameplay,
  isVisible,
  objectiveCount,
  type AspirationDoc,
  type AspirationObjective,
  type ResourceRef,
} from "./schema";

import { externalDependencies, requiredPacks, resolveRef, type ResolveContext } from "./resolver";
import { validateAspiration, type AspirationValidation } from "./validate";

export interface AspirationExportFile {
  name: string;
  kind: "tuning" | "stbl" | "simdata" | "report" | "manifest";
  contents: string;
  resourceKey?: string;
}

export interface AspirationExportResult {
  ok: boolean;
  /** True when the produced package would actually load in-game. */
  loadable: boolean;
  keys: AspirationKeys;
  files: AspirationExportFile[];
  packs: string[];
  dependencies: ReturnType<typeof externalDependencies>;
  validation: AspirationValidation;
  blockers: string[];
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function refValue(ref: ResourceRef | null | undefined, ctx: ResolveContext): string {
  if (!ref) return "";
  const r = resolveRef(ref, ctx);
  return r.tuningId && r.tuningId !== "resolved-at-build" ? r.tuningId : r.tuningName;
}

/* -------------------------------------------------------------- tuning -- */

export function buildAspirationXml(
  doc: AspirationDoc,
  ctx: ResolveContext,
  keys: AspirationKeys,
): string {
  const spec = aspirationTypeSpec(doc.aspirationType);
  const strings = ensureStringKeys(doc);
  const L: string[] = [];
  const push = (indent: number, line: string) => L.push(`${"  ".repeat(indent)}${line}`);

  push(0, `<?xml version="1.0" encoding="utf-8"?>`);
  push(
    0,
    `<I c="Aspiration" i="aspiration" m="aspirations.aspiration_types" n="${esc(keys.tuningName)}" s="${keys.tuningDecimal}">`,
  );
  push(1, `<T n="aspiration_type">${spec.gameAspirationType}</T>`);
  push(1, `<T n="display_name">0x${strings.displayName.key}<!--${esc(doc.displayName)}--></T>`);
  if (strings.description.text)
    push(1, `<T n="description">0x${strings.description.key}<!--${esc(doc.description)}--></T>`);
  if (strings.tooltip.text) push(1, `<T n="tooltip">0x${strings.tooltip.key}</T>`);
  if (doc.icon) push(1, `<T n="icon">${esc(doc.icon)}</T>`);
  push(1, `<T n="category">${esc(doc.category)}</T>`);
  push(1, `<T n="visible">${isVisible(doc) ? "True" : "False"}</T>`);

  if (doc.availability.ages.length) {
    push(1, `<L n="available_ages">`);
    for (const a of doc.availability.ages)
      push(2, `<T>${AGE_LABEL[a].toUpperCase().replace(" ", "")}</T>`);
    push(1, `</L>`);
  }
  if (doc.availability.species.length) {
    push(1, `<L n="available_species">`);
    for (const s of doc.availability.species) push(2, `<T>${s.toUpperCase()}</T>`);
    push(1, `</L>`);
  }
  if (doc.availability.occultMode !== "any" && doc.availability.occults.length) {
    push(1, `<L n="occult_${doc.availability.occultMode.replace("-", "_")}">`);
    for (const o of doc.availability.occults) push(2, `<T>${o.toUpperCase()}</T>`);
    push(1, `</L>`);
  }
  if (doc.availability.gender !== "none")
    push(1, `<T n="gender_requirement">${esc(doc.availability.gender)}</T>`);

  const reward = refValue(doc.rewardTrait, ctx);
  if (reward) push(1, `<T n="reward">${esc(reward)}</T>`);

  const gameplay = ensureGameplay(doc);
  const gKeys = computeGameplayKeys(doc);
  push(1, `<T n="repeat_rule">${gameplay.completion.repeat}</T>`);
  push(1, `<T n="completion_timing">${gameplay.completion.timing}</T>`);
  if (gameplay.completion.timing === "delayed")
    push(1, `<T n="completion_delay">${gameplay.completion.delaySeconds}</T>`);
  push(1, `<L n="completion_order">`);
  for (const stage of gameplay.completion.order) push(2, `<T>${stage}</T>`);
  push(1, `</L>`);

  const completionLoot = gKeys.rewards.filter((k) =>
    rewardsFor(gameplay, "aspiration").some((r) => r.uuid === k.uuid && r.trigger === "completed"),
  );
  if (completionLoot.length) {
    push(1, `<L n="complete_loot_actions">`);
    for (const k of completionLoot) push(2, `<T>${k.decimal}<!--${esc(k.tuningName)}--></T>`);
    push(1, `</L>`);
  }
  if (gKeys.listeners.length) {
    push(1, `<L n="event_listeners">`);
    for (const k of gKeys.listeners) push(2, `<T>${k.decimal}<!--${esc(k.tuningName)}--></T>`);
    push(1, `</L>`);
  }
  if (gameplay.story.audience !== "player-only") {
    push(1, `<U n="story_progression">`);
    push(2, `<T n="audience">${gameplay.story.audience}</T>`);
    push(2, `<T n="npc_progress">${gameplay.story.npcProgress ? "True" : "False"}</T>`);
    push(2, `<T n="autonomous">${gameplay.story.autonomousProgress ? "True" : "False"}</T>`);
    push(2, `<T n="population_weight">${gameplay.story.populationWeight}</T>`);
    push(2, `<T n="random_chance">${gameplay.story.randomChance}</T>`);
    push(1, `</U>`);
  }

  if (keys.milestones.length) {
    push(1, `<L n="milestones">`);
    for (const m of keys.milestones) push(2, `<T>${m.decimal}<!--${esc(m.tuningName)}--></T>`);
    push(1, `</L>`);
  }

  push(0, `</I>`);
  return L.join("\n");
}

/* ---------------------------------------------------- milestones/goals -- */

function objectiveXml(
  o: AspirationObjective,
  ctx: ResolveContext,
  tuningName: string,
  decimal: string,
): string {
  const spec = objectiveTypeSpec(o.type);
  const L: string[] = [];
  const push = (indent: number, line: string) => L.push(`${"  ".repeat(indent)}${line}`);
  push(0, `<?xml version="1.0" encoding="utf-8"?>`);
  push(
    0,
    `<I c="${spec.testClass}" i="objective" m="aspirations.aspiration_tuning" n="${esc(tuningName)}" s="${decimal}">`,
  );
  push(1, `<T n="goal_type">${spec.id}</T>`);
  push(1, `<T n="display_text">${esc(o.label)}</T>`);
  if (o.description.trim()) push(1, `<T n="description">${esc(o.description)}</T>`);
  push(1, `<T n="iterations">${Math.max(1, o.count)}</T>`);
  push(1, `<T n="display_style">${o.progress}</T>`);
  if (o.hidden) push(1, `<T n="hidden">True</T>`);
  if (o.optional) push(1, `<T n="optional">True</T>`);
  if (o.bonus) push(1, `<T n="bonus">True</T>`);

  const params = Object.entries(o.params).filter(([, v]) => v !== "" && v !== false && v !== 0);
  if (params.length) {
    push(1, `<U n="goal_settings">`);
    for (const [k, v] of params) push(2, `<T n="${k}">${esc(String(v))}</T>`);
    push(1, `</U>`);
  }

  const refs = Object.entries(o.refs).filter(([, r]) => Boolean(r)) as [string, ResourceRef][];
  if (refs.length || o.ref) {
    push(1, `<U n="goal_targets">`);
    if (o.ref) push(2, `<T n="target">${esc(refValue(o.ref, ctx))}</T>`);
    for (const [k, r] of refs) push(2, `<T n="${k}">${esc(refValue(r, ctx))}</T>`);
    push(1, `</U>`);
  }

  if (o.conditions.length) {
    push(1, `<L n="tests">`);
    for (const c of o.conditions)
      push(2, `<T n="${c.kind}"${c.negate ? ` invert="True"` : ""}>${esc(c.value)}</T>`);
    push(1, `</L>`);
  }

  if (o.repeat.mode !== "one-time") {
    push(1, `<U n="repeat">`);
    push(2, `<T n="mode">${o.repeat.mode}</T>`);
    push(2, `<T n="reset_on_failure">${o.repeat.resetOnFailure ? "True" : "False"}</T>`);
    push(2, `<T n="reset_on_travel">${o.repeat.resetOnTravel ? "True" : "False"}</T>`);
    push(2, `<T n="reset_on_age_up">${o.repeat.resetOnAgeUp ? "True" : "False"}</T>`);
    push(1, `</U>`);
  }

  if (o.timer.mode !== "none") {
    push(1, `<U n="timing">`);
    push(2, `<T n="mode">${o.timer.mode}</T>`);
    if (o.timer.hours) push(2, `<T n="hours">${o.timer.hours}</T>`);
    if (o.timer.window) push(2, `<T n="window">${esc(o.timer.window)}</T>`);
    push(1, `</U>`);
  }

  if (o.dependsOn.length) {
    push(1, `<L n="requires">`);
    for (const d of o.dependsOn) push(2, `<T>${esc(d)}</T>`);
    push(1, `</L>`);
  }

  if (o.children.length) {
    push(1, `<L n="children">`);
    for (const c of o.children) push(2, `<T>${esc(c.label)}</T>`);
    push(1, `</L>`);
  }

  push(0, `</I>`);
  return L.join("\n");
}

function buildMilestoneXml(
  doc: AspirationDoc,
  ctx: ResolveContext,
  keys: AspirationKeys,
): AspirationExportFile[] {
  return keys.milestones.flatMap((mk, i) => {
    const m = doc.milestones[i];
    if (!m) return [];
    const L: string[] = [];
    const push = (indent: number, line: string) => L.push(`${"  ".repeat(indent)}${line}`);
    push(0, `<?xml version="1.0" encoding="utf-8"?>`);
    push(
      0,
      `<I c="Objective" i="aspiration" m="aspirations.aspiration_tuning" n="${esc(mk.tuningName)}" s="${mk.decimal}">`,
    );
    push(1, `<T n="tier">${esc(m.tier)}</T>`);
    push(1, `<T n="display_order">${m.order}</T>`);
    push(1, `<T n="display_name">${esc(m.title)}</T>`);
    if (m.description.trim()) push(1, `<T n="description">${esc(m.description)}</T>`);
    if (m.strings.tooltip.trim()) push(1, `<T n="tooltip">${esc(m.strings.tooltip)}</T>`);
    if (m.strings.journal.trim()) push(1, `<T n="journal_text">${esc(m.strings.journal)}</T>`);
    if (m.strings.notification.trim())
      push(1, `<T n="completion_notification">${esc(m.strings.notification)}</T>`);
    if (m.icon) push(1, `<T n="icon">${esc(m.icon)}</T>`);
    push(1, `<T n="hidden">${m.hidden ? "True" : "False"}</T>`);
    push(1, `<T n="points">${m.points}</T>`);

    push(1, `<U n="completion">`);
    push(2, `<T n="mode">${m.completion.mode}</T>`);
    if (m.completion.mode === "count") push(2, `<T n="count">${m.completion.count}</T>`);
    push(2, `<T n="sequential">${m.completion.sequential ? "True" : "False"}</T>`);
    push(1, `</U>`);

    if (m.unlockMode === "conditions" && m.unlocks.length) {
      push(1, `<L n="unlock_tests">`);
      for (const u of m.unlocks)
        push(2, `<T n="${u.kind}"${u.negate ? ` invert="True"` : ""}>${esc(u.value)}</T>`);
      push(1, `</L>`);
    }

    if (m.failures.length) {
      push(1, `<L n="failure_tests">`);
      for (const f of m.failures) push(2, `<T n="${f.kind}">${esc(f.value)}</T>`);
      push(1, `</L>`);
    }

    const legacyReward = refValue(m.rewardRef, ctx);
    if (legacyReward) push(1, `<T n="reward">${esc(legacyReward)}</T>`);
    if (m.rewards.length) {
      push(1, `<L n="rewards">`);
      for (const r of m.rewards) {
        const value = REWARD_NUMERIC.includes(r.type)
          ? String(r.amount)
          : refValue(r.ref, ctx) || r.text;
        push(2, `<U>`);
        push(3, `<T n="type">${r.type}</T>`);
        push(3, `<T n="value">${esc(value)}</T>`);
        push(2, `</U>`);
      }
      push(1, `</L>`);
    }

    push(1, `<L n="objectives">`);
    mk.objectives.forEach((ok, j) => {
      const o = m.objectives[j];
      push(2, `<T>${ok.decimal}<!--${esc(o?.label ?? ok.tuningName)}--></T>`);
    });
    push(1, `</L>`);
    push(0, `</I>`);

    const files: AspirationExportFile[] = [
      {
        name: `${mk.tuningName.replace(":", "_")}.xml`,
        kind: "tuning" as const,
        contents: L.join("\n"),
        resourceKey: keyToString(mk.key),
      },
    ];

    mk.objectives.forEach((ok, j) => {
      const o = m.objectives[j];
      if (!o) return;
      files.push({
        name: `${ok.tuningName.replace(":", "_")}.xml`,
        kind: "tuning",
        contents: objectiveXml(o, ctx, ok.tuningName, ok.decimal),
        resourceKey: keyToString(ok.key),
      });
    });

    return files;
  });
}




/* ------------------------------------------------------- Part 3: gameplay -- */

const conditionsXml = (
  conditions: RewardCondition[],
  push: (indent: number, line: string) => void,
  indent = 1,
) => {
  if (!conditions.length) return;
  push(indent, `<L n="tests">`);
  for (const c of conditions)
    push(indent + 1, `<T n="${c.kind}"${c.negate ? ` invert="True"` : ""}>${esc(c.value)}</T>`);
  push(indent, `</L>`);
};

/** One loot action resource per reward card — rewards are never inlined. */
function rewardXml(
  reward: RewardCard,
  ctx: ResolveContext,
  tuningName: string,
  decimal: string,
  gameplay: AspirationGameplay,
): string {
  const spec = rewardKindSpec(reward.kind);
  const L: string[] = [];
  const push = (indent: number, line: string) => L.push(`${"  ".repeat(indent)}${line}`);
  push(0, `<?xml version="1.0" encoding="utf-8"?>`);
  push(
    0,
    `<I c="${spec.lootClass}" i="action" m="interactions.utils.loot" n="${esc(tuningName)}" s="${decimal}">`,
  );
  push(1, `<T n="reward_kind">${reward.kind}</T>`);
  push(1, `<T n="scope">${reward.scope}</T>`);
  push(1, `<T n="trigger">${reward.trigger}</T>`);
  push(1, `<T n="execution">${reward.execution}</T>`);
  push(1, `<T n="order">${reward.order}</T>`);
  if (reward.ownerUuid) push(1, `<T n="owner">${esc(reward.ownerUuid)}</T>`);

  for (const f of spec.fields) {
    if (f.kind === "ref") {
      const value = refValue(reward.refs[f.id] ?? null, ctx);
      if (value) push(1, `<T n="${f.id}">${esc(value)}</T>`);
      continue;
    }
    const raw = reward.params[f.id];
    if (raw === undefined || raw === "" ) continue;
    if (f.id === "notificationId") {
      const note = gameplay.notifications.find((n) => n.uuid === raw);
      push(1, `<T n="notification">${esc(note?.name ?? String(raw))}</T>`);
      continue;
    }
    const text = typeof raw === "boolean" ? (raw ? "True" : "False") : String(raw);
    push(1, `<T n="${f.id}">${esc(text)}</T>`);
  }

  conditionsXml(reward.conditions, push);
  push(0, `</I>`);
  return L.join("\n");
}

function lootXml(
  loot: AspirationGameplay["loot"][number],
  ctx: ResolveContext,
  tuningName: string,
  decimal: string,
  gameplay: AspirationGameplay,
): string {
  const L: string[] = [];
  const push = (indent: number, line: string) => L.push(`${"  ".repeat(indent)}${line}`);
  push(0, `<?xml version="1.0" encoding="utf-8"?>`);
  push(
    0,
    `<I c="LootActions" i="action" m="interactions.utils.loot" n="${esc(tuningName)}" s="${decimal}">`,
  );
  push(1, `<T n="trigger">${loot.trigger}</T>`);
  if (loot.trigger === "custom-event") push(1, `<T n="event">${esc(loot.customEvent)}</T>`);
  if (loot.ownerUuid) push(1, `<T n="owner">${esc(loot.ownerUuid)}</T>`);
  if (loot.cooldownHours > 0) push(1, `<T n="cooldown_hours">${loot.cooldownHours}</T>`);
  push(1, `<L n="operations">`);
  for (const op of loot.ops) {
    push(2, `<U>`);
    push(3, `<T n="type">${op.type}</T>`);
    const target = refValue(op.ref, ctx);
    if (target) push(3, `<T n="target">${esc(target)}</T>`);
    if (op.type === "notification" && op.value) {
      const note = gameplay.notifications.find((n) => n.uuid === op.value);
      push(3, `<T n="notification">${esc(note?.name ?? op.value)}</T>`);
    } else if (op.value) push(3, `<T n="value">${esc(op.value)}</T>`);
    if (op.amount) push(3, `<T n="amount">${op.amount}</T>`);
    push(2, `</U>`);
  }
  push(1, `</L>`);
  conditionsXml(loot.conditions, push);
  push(0, `</I>`);
  return L.join("\n");
}

function notificationXml(
  note: AspirationGameplay["notifications"][number],
  tuningName: string,
  decimal: string,
  stbl: { title: string; body: string },
): string {
  const L: string[] = [];
  const push = (indent: number, line: string) => L.push(`${"  ".repeat(indent)}${line}`);
  push(0, `<?xml version="1.0" encoding="utf-8"?>`);
  push(
    0,
    `<I c="UiDialogNotification" i="notification" m="ui.ui_dialog_notification" n="${esc(tuningName)}" s="${decimal}">`,
  );
  push(1, `<T n="style">${note.style}</T>`);
  push(1, `<T n="trigger">${note.trigger}</T>`);
  if (note.localize) {
    push(1, `<T n="title">0x${stbl.title}<!--${esc(note.title)}--></T>`);
    push(1, `<T n="text">0x${stbl.body}<!--${esc(note.body)}--></T>`);
  } else {
    push(1, `<T n="title">${esc(note.title)}</T>`);
    push(1, `<T n="text">${esc(note.body)}</T>`);
  }
  if (note.icon) push(1, `<T n="icon">${esc(note.icon)}</T>`);
  if (note.sound) push(1, `<T n="audio_sting">${esc(note.sound)}</T>`);
  if (note.animation) push(1, `<T n="animation">${esc(note.animation)}</T>`);
  push(1, `<T n="urgency">${note.priority}</T>`);
  push(1, `<T n="duration">${note.durationSeconds}</T>`);
  push(0, `</I>`);
  return L.join("\n");
}

function broadcasterXml(
  b: AspirationGameplay["broadcasters"][number],
  ctx: ResolveContext,
  tuningName: string,
  decimal: string,
): string {
  const L: string[] = [];
  const push = (indent: number, line: string) => L.push(`${"  ".repeat(indent)}${line}`);
  push(0, `<?xml version="1.0" encoding="utf-8"?>`);
  push(
    0,
    `<I c="BroadcasterRequest" i="broadcaster" m="broadcasters.broadcaster" n="${esc(tuningName)}" s="${decimal}">`,
  );
  push(1, `<T n="radius">${b.radius}</T>`);
  push(1, `<T n="targets">${b.targets}</T>`);
  if (b.relationshipFilter) push(1, `<T n="relationship_filter">${esc(b.relationshipFilter)}</T>`);
  const trait = refValue(b.traitRef, ctx);
  if (trait) push(1, `<T n="trait_filter">${esc(trait)}</T>`);
  const buff = refValue(b.buffRef, ctx);
  if (buff) push(1, `<T n="buff">${esc(buff)}</T>`);
  push(1, `<T n="frequency_hours">${b.frequencyHours}</T>`);
  push(1, `<T n="duration_hours">${b.durationHours}</T>`);
  push(1, `<T n="priority">${b.priority}</T>`);
  conditionsXml(b.conditions, push);
  push(0, `</I>`);
  return L.join("\n");
}

function listenerXml(
  l: AspirationGameplay["listeners"][number],
  tuningName: string,
  decimal: string,
  gKeys: AspirationGameplayKeys,
): string {
  const L: string[] = [];
  const push = (indent: number, line: string) => L.push(`${"  ".repeat(indent)}${line}`);
  const lookup = (uuid: string) =>
    [...gKeys.loot, ...gKeys.rewards, ...gKeys.notifications].find((k) => k.uuid === uuid);
  push(0, `<?xml version="1.0" encoding="utf-8"?>`);
  push(
    0,
    `<I c="EventListener" i="snippet" m="event_testing.test_events" n="${esc(tuningName)}" s="${decimal}">`,
  );
  push(1, `<T n="event">${l.event === "custom-event" ? esc(l.customEvent) : l.event}</T>`);
  push(1, `<T n="priority">${l.priority}</T>`);
  if (l.cooldownHours > 0) push(1, `<T n="cooldown_hours">${l.cooldownHours}</T>`);
  push(1, `<T n="enabled">${l.enabled ? "True" : "False"}</T>`);
  push(1, `<L n="actions">`);
  for (const a of l.actions) {
    const target = lookup(a.targetUuid);
    push(2, `<U>`);
    push(3, `<T n="kind">${a.kind}</T>`);
    push(3, `<T n="target">${esc(target ? target.decimal : a.targetUuid)}</T>`);
    if (target) push(3, `<T n="target_name">${esc(target.tuningName)}</T>`);
    if (a.value) push(3, `<T n="value">${esc(a.value)}</T>`);
    push(2, `</U>`);
  }
  push(1, `</L>`);
  conditionsXml(l.conditions, push);
  push(0, `</I>`);
  return L.join("\n");
}

/** Buffs, wants/fears and journal settings ride on the aspiration snippet. */
function gameplaySnippetXml(
  doc: AspirationDoc,
  ctx: ResolveContext,
  keys: AspirationKeys,
  g: AspirationGameplay,
): string {
  const L: string[] = [];
  const push = (indent: number, line: string) => L.push(`${"  ".repeat(indent)}${line}`);
  push(0, `<?xml version="1.0" encoding="utf-8"?>`);
  push(
    0,
    `<I c="AspirationGameplay" i="snippet" m="aspirations.aspiration_tuning" n="${esc(keys.tuningName)}_gameplay" s="${keys.tuningDecimal}">`,
  );
  if (g.buffs.length) {
    push(1, `<L n="buffs">`);
    for (const b of g.buffs) {
      push(2, `<U>`);
      push(3, `<T n="buff">${esc(refValue(b.ref, ctx))}</T>`);
      push(3, `<T n="category">${b.category}</T>`);
      push(3, `<T n="apply_mode">${b.applyMode}</T>`);
      push(3, `<T n="duration_hours">${b.durationHours}</T>`);
      push(3, `<T n="mood">${b.mood}</T>`);
      push(3, `<T n="visible">${b.visible ? "True" : "False"}</T>`);
      push(3, `<T n="priority">${b.priority}</T>`);
      push(3, `<T n="remove_on_travel">${b.removeOnTravel ? "True" : "False"}</T>`);
      push(3, `<T n="remove_on_death">${b.removeOnDeath ? "True" : "False"}</T>`);
      if (b.removeOnMilestone) push(3, `<T n="remove_on_milestone">${esc(b.removeOnMilestoneUuid)}</T>`);
      push(2, `</U>`);
    }
    push(1, `</L>`);
  }
  if (g.wants.length) {
    push(1, `<L n="wants_and_fears">`);
    for (const w of g.wants) {
      push(2, `<U>`);
      push(3, `<T n="mode">${w.mode}</T>`);
      const target = refValue(w.ref, ctx);
      if (target) push(3, `<T n="target">${esc(target)}</T>`);
      if (w.ownerUuid) push(3, `<T n="owner">${esc(w.ownerUuid)}</T>`);
      push(3, `<T n="weight">${w.weight}</T>`);
      push(2, `</U>`);
    }
    push(1, `</L>`);
  }
  push(1, `<U n="journal">`);
  push(2, `<T n="enabled">${g.journal.enabled ? "True" : "False"}</T>`);
  push(2, `<T n="show_current_milestone">${g.journal.showCurrentMilestone ? "True" : "False"}</T>`);
  push(2, `<T n="show_completed">${g.journal.showCompletedObjectives ? "True" : "False"}</T>`);
  push(2, `<T n="show_locked">${g.journal.showLockedObjectives ? "True" : "False"}</T>`);
  push(2, `<T n="show_reward_preview">${g.journal.showRewardPreview ? "True" : "False"}</T>`);
  push(2, `<T n="show_progress">${g.journal.showProgressPercent ? "True" : "False"}</T>`);
  if (g.journal.flavorText) push(2, `<T n="flavor_text">${esc(g.journal.flavorText)}</T>`);
  push(1, `</U>`);
  if (g.failure.mode !== "none") {
    push(1, `<U n="failure">`);
    push(2, `<T n="mode">${g.failure.mode}</T>`);
    push(2, `<T n="keep_rewards">${g.failure.keepRewards ? "True" : "False"}</T>`);
    const fl = refValue(g.failure.lootRef, ctx);
    if (fl) push(2, `<T n="loot">${esc(fl)}</T>`);
    const fb = refValue(g.failure.buffRef, ctx);
    if (fb) push(2, `<T n="buff">${esc(fb)}</T>`);
    if (g.failure.customBehavior) push(2, `<T n="custom">${esc(g.failure.customBehavior)}</T>`);
    push(1, `</U>`);
  }
  push(0, `</I>`);
  return L.join("\n");
}

/** Every Part 3 resource, as separate files with their own resource keys. */
export function buildGameplayFiles(
  doc: AspirationDoc,
  ctx: ResolveContext,
  keys: AspirationKeys,
): AspirationExportFile[] {
  const g = ensureGameplay(doc);
  const gKeys = computeGameplayKeys(doc);
  const files: AspirationExportFile[] = [];

  gKeys.rewards.forEach((k) => {
    const reward = g.rewards.find((r) => r.uuid === k.uuid);
    if (!reward || !reward.enabled) return;
    files.push({
      name: `${k.tuningName.replace(":", "_")}.xml`,
      kind: "tuning",
      contents: rewardXml(reward, ctx, k.tuningName, k.decimal, g),
      resourceKey: keyToString(k.key),
    });
  });

  gKeys.loot.forEach((k) => {
    const loot = g.loot.find((l) => l.uuid === k.uuid);
    if (!loot || !loot.enabled) return;
    files.push({
      name: `${k.tuningName.replace(":", "_")}.xml`,
      kind: "tuning",
      contents: lootXml(loot, ctx, k.tuningName, k.decimal, g),
      resourceKey: keyToString(k.key),
    });
  });

  gKeys.notifications.forEach((k) => {
    const note = g.notifications.find((n) => n.uuid === k.uuid);
    if (!note) return;
    files.push({
      name: `${k.tuningName.replace(":", "_")}.xml`,
      kind: "tuning",
      contents: notificationXml(
        note,
        k.tuningName,
        k.decimal,
        notificationStringKeys(doc, note.uuid, note.name),
      ),
      resourceKey: keyToString(k.key),
    });
  });

  gKeys.broadcasters.forEach((k) => {
    const b = g.broadcasters.find((x) => x.uuid === k.uuid);
    if (!b) return;
    files.push({
      name: `${k.tuningName.replace(":", "_")}.xml`,
      kind: "tuning",
      contents: broadcasterXml(b, ctx, k.tuningName, k.decimal),
      resourceKey: keyToString(k.key),
    });
  });

  gKeys.listeners.forEach((k) => {
    const l = g.listeners.find((x) => x.uuid === k.uuid);
    if (!l || !l.enabled) return;
    files.push({
      name: `${k.tuningName.replace(":", "_")}.xml`,
      kind: "tuning",
      contents: listenerXml(l, k.tuningName, k.decimal, gKeys),
      resourceKey: keyToString(k.key),
    });
  });

  if (g.buffs.length || g.wants.length || g.journal.enabled || g.failure.mode !== "none") {
    files.push({
      name: `${keys.tuningName.replace(":", "_")}_gameplay.xml`,
      kind: "tuning",
      contents: gameplaySnippetXml(doc, ctx, keys, g),
    });
  }

  return files;
}

/** Notification strings join the aspiration's STBL table. */
export function gameplayStblEntries(doc: AspirationDoc) {
  const g = ensureGameplay(doc);
  return g.notifications
    .filter((n) => n.localize)
    .flatMap((n) => {
      const k = notificationStringKeys(doc, n.uuid, n.name);
      const rows: { key: string; field: string; value: string }[] = [];
      if (n.title.trim()) rows.push({ key: `0x${k.title}`, field: `note_title_${n.name}`, value: n.title });
      if (n.body.trim()) rows.push({ key: `0x${k.body}`, field: `note_body_${n.name}`, value: n.body });
      return rows;
    });
}

/** Human-readable execution order, used by the build report and the preview. */
export function completionTimeline(doc: AspirationDoc): string[] {
  const g = ensureGameplay(doc);
  return g.completion.order.map((stage) => {
    const count =
      stage === "rewards"
        ? rewardsFor(g, "aspiration").length
        : stage === "loot"
          ? g.loot.filter((l) => l.trigger === "aspiration-completed").length
          : stage === "buffs"
            ? g.buffs.length
            : stage === "notifications"
              ? g.notifications.filter((n) => n.trigger === "aspiration").length
              : stage === "broadcasters"
                ? g.broadcasters.length
                : 1;
    return `${COMPLETION_STAGE_LABEL[stage]} (${count})`;
  });
}

/* --------------------------------------------------------------- STBL -- */

export function buildStblEntries(doc: AspirationDoc) {
  const strings = ensureStringKeys(doc);
  return ALL_STRING_FIELDS(strings)
    .filter((t) => t.text.trim())
    .map((t) => ({ key: `0x${t.key}`, field: t.field, value: t.text }));
}

/* -------------------------------------------------------------- export -- */

export function exportAspiration(
  doc: AspirationDoc,
  ctx: ResolveContext,
  opts: { recordId?: string; includeReport?: boolean } = {},
): AspirationExportResult {
  const validation = validateAspiration(doc, ctx, opts.recordId);
  const keys = computeAspirationKeys(doc);
  const packs = requiredPacks(doc, ctx);
  const dependencies = externalDependencies(doc);
  const blockers: string[] = [];

  const files: AspirationExportFile[] = [];
  const hardErrors = validation.blocking.filter((i) => i.code !== "NO_SIMDATA_WRITER");
  const ok = hardErrors.length === 0;

  if (ok) {
    files.push({
      name: `${keys.tuningName.replace(":", "_")}.xml`,
      kind: "tuning",
      contents: buildAspirationXml(doc, ctx, keys),
      resourceKey: keyToString(keys.tuning),
    });
    files.push(...buildMilestoneXml(doc, ctx, keys));
    files.push(...buildGameplayFiles(doc, ctx, keys));

    files.push({
      name: `${keys.tuningName.replace(":", "_")}.stbl.json`,
      kind: "stbl",
      contents: JSON.stringify(
        {
          locale: "en-US",
          entries: [...buildStblEntries(doc), ...gameplayStblEntries(doc)],
        },
        null,
        2,
      ),
    });
  } else {
    blockers.push(...hardErrors.map((e) => e.message));
  }

  let loadable = ok;
  if (requiresSimData("aspiration")) {
    if (canSerializeSimData("aspiration")) {
      files.push({
        name: `${keys.tuningName.replace(":", "_")}.simdata`,
        kind: "simdata",
        contents: "",
        resourceKey: keyToString(keys.simData),
      });
    } else {
      loadable = false;
      blockers.push(
        "No SimData writer in this build. Aspiration XML, strings and icons are produced and the SimData key pair is reserved, but the game will not load the aspiration until SimData is generated.",
      );
    }
  }

  files.push({
    name: "dependencies.json",
    kind: "manifest",
    contents: JSON.stringify(
      {
        aspiration: keys.tuningName,
        uuid: doc.ids.uuid,
        tuning: keyToString(keys.tuning),
        simData: keyToString(keys.simData),
        milestones: keys.milestones.map((m) => ({
          name: m.tuningName,
          key: keyToString(m.key),
          objectives: m.objectives.map((o) => ({ name: o.tuningName, key: keyToString(o.key) })),
        })),
        requiredPacks: packs,
        baseGameCompatible: packs.length === 0,
        externalMods: dependencies,
        projectReferences: collectResolved(doc, ctx),
      },
      null,
      2,
    ),
  });

  if (opts.includeReport !== false) {
    files.push({
      name: "build-report.md",
      kind: "report",
      contents: buildReport(doc, keys, validation, packs, loadable, blockers),
    });
  }

  return { ok, loadable, keys, files, packs, dependencies, validation, blockers };
}

function collectResolved(doc: AspirationDoc, ctx: ResolveContext) {
  return collectRefs(doc).map(({ path, ref }) => {
    const r = resolveRef(ref, ctx);
    return {
      path,
      kind: ref.resourceKind,
      source: ref.source,
      name: r.tuningName,
      id: r.tuningId,
      status: r.status,
    };
  });
}

function buildReport(
  doc: AspirationDoc,
  keys: AspirationKeys,
  v: AspirationValidation,
  packs: string[],
  loadable: boolean,
  blockers: string[],
) {
  const lines = [
    `# Build report — ${doc.displayName}`,
    "",
    `- Tuning name: \`${keys.tuningName}\``,
    `- Tuning instance: \`${keys.tuning.instance}\` (${keys.tuningDecimal})`,
    `- SimData instance: \`${keys.simData.instance}\``,
    `- Type: ${aspirationTypeSpec(doc.aspirationType).label} → ${aspirationTypeSpec(doc.aspirationType).gameAspirationType}`,
    `- Milestones: ${doc.milestones.length} · Objectives: ${objectiveCount(doc)}`,
    `- Required packs: ${packs.length ? packs.join(", ") : "base game only"}`,
    `- Completion order: ${completionTimeline(doc).join(" → ")}`,
    `- Loadable in-game: ${loadable ? "yes" : "NO"}`,
    "",
    `## Validation`,
    `${v.errors} error(s), ${v.warnings} warning(s), ${v.suggestions} suggestion(s)`,
    "",
    ...v.issues.map((i) => `- **${i.level}** \`${i.code}\` ${i.message}`),
  ];
  if (blockers.length) lines.push("", "## Blockers", ...blockers.map((b) => `- ${b}`));
  return lines.join("\n");
}
