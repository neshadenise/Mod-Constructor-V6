/**
 * Objective validation and health.
 *
 * Blocking errors stop export. Warnings describe designs that will ship but
 * probably misbehave. Every finding carries the field path the editor can jump
 * to, so nothing is a dead-end message.
 */

import {
  collectRefs,
  derivedPacks,
  refIsSet,
  typeSpec,
  type ObjectiveDoc,
  type ResourceRef,
} from "./schema";
import { computeObjectiveKeys, findCollisions, needsListener, needsTracker } from "./ids";

export type Level = "error" | "warning" | "suggestion";

export interface Finding {
  id: string;
  level: Level;
  /** Section the editor should open. */
  section: string;
  /** Exact field path, used to focus and highlight. */
  field: string;
  message: string;
  fix?: string;
}

export interface ObjectiveValidation {
  findings: Finding[];
  errors: number;
  warnings: number;
  suggestions: number;
  exportable: boolean;
  /** 0-100. Decoration never costs the same as broken gameplay logic. */
  health: number;
  capabilities: {
    canActivate: boolean;
    canListen: boolean;
    canTrack: boolean;
    canResolveTarget: boolean;
    canComplete: boolean;
    canNotifyParent: boolean;
    canExport: boolean;
  };
}

export interface ValidationContext {
  /** Other objectives in the same project. */
  others: ObjectiveDoc[];
  /** Project resource UUIDs that currently exist, for broken-reference checks. */
  knownResourceIds?: Set<string>;
  installedPacks?: string[];
}

export function validateObjective(doc: ObjectiveDoc, ctx: ValidationContext): ObjectiveValidation {
  const { others, knownResourceIds, installedPacks = [] } = ctx;
  const f: Finding[] = [];
  let n = 0;
  const push = (level: Level, section: string, field: string, message: string, fix?: string) =>
    f.push({ id: `${field}:${n++}`, level, section, field, message, ...(fix ? { fix } : {}) });

  const spec = typeSpec(doc.type);
  const keys = computeObjectiveKeys(doc);
  const refs = collectRefs(doc);

  /* identity ------------------------------------------------------------- */
  if (!doc.displayName.trim()) push("error", "basics", "displayName", "The objective has no name.");
  else if (doc.displayName.trim().length < 4 || /^(new|untitled|test)\b/i.test(doc.displayName.trim()))
    push("warning", "basics", "displayName", "The objective name is vague — players see this text.");

  if (!doc.internalName.trim())
    push("error", "basics", "internalName", "The internal name is empty.");
  if (/^[0-9]/.test(doc.internalName))
    push("error", "basics", "internalName", "Internal names cannot begin with a number.");
  if (/[^A-Za-z0-9_]/.test(doc.internalName))
    push("error", "basics", "internalName", "Internal names may only use letters, numbers and underscores.");
  if (others.some((o) => o.uuid !== doc.uuid && o.internalName === doc.internalName))
    push("error", "basics", "internalName", "Another objective in this project already uses this internal name.", "Rename one of them.");
  if (others.some((o) => o.uuid !== doc.uuid && computeObjectiveKeys(o).tuningName === keys.tuningName))
    push("error", "identity", "tuningName", "Duplicate tuning name in this project.");
  for (const c of findCollisions(doc, others))
    push("error", "identity", "ids", `Generated id ${c.decimal} (${c.label}) collides with “${c.otherObjective}”.`, "Regenerate ids on one of them.");
  if (!doc.namespace.trim()) push("error", "basics", "namespace", "A creator namespace is required.");

  /* type and tracked resource -------------------------------------------- */
  if (!doc.type) push("error", "type", "type", "No objective type is set.");
  if (spec.tracked) {
    const tracked = refs.filter((r) => r.ref.expectedResourceKind === spec.tracked);
    const set = tracked.filter((r) => refIsSet(r.ref));
    if (!set.length)
      push("error", "type", tracked[0]?.path ?? "payload", `This ${spec.label.toLowerCase()} does not point at a ${spec.tracked} yet.`, `Pick the ${spec.tracked} it tracks.`);
    for (const { path, ref } of set) {
      if (ref.resourceKind !== ref.expectedResourceKind)
        push("error", "type", path, `That field expects a ${ref.expectedResourceKind} but holds a ${ref.resourceKind}.`);
    }
  }

  /* broken references ------------------------------------------------------ */
  for (const { path, ref } of refs) {
    if (!refIsSet(ref)) {
      if (ref.resolutionMode === "required" && isRelevantRef(doc, path))
        push("error", "type", path, "A required reference is not set.");
      continue;
    }
    if (ref.source === "project" && knownResourceIds && ref.projectResourceId && !knownResourceIds.has(ref.projectResourceId))
      push("error", "type", path, `Broken project reference: ${ref.label ?? ref.projectResourceId} no longer exists.`);
  }

  /* progress ---------------------------------------------------------------- */
  const p = doc.progress;
  if (!spec.progressModes.includes(p.mode))
    push("warning", "progress", "progress.mode", `“${p.mode}” is an unusual progress mode for a ${spec.label.toLowerCase()}.`);
  if (p.mode !== "boolean" && p.targetSource === "fixed") {
    if (p.target < 0) push("error", "progress", "progress.target", "The target value is negative.");
    else if (p.target === 0) push("warning", "progress", "progress.target", "The target is zero, so the objective completes immediately.");
  }
  if (p.targetSource === "dynamic_formula" && !p.formula.trim())
    push("error", "progress", "progress.formula", "A dynamic target needs a formula.");
  if (p.comparison === "between" || p.comparison === "outside") {
    if (p.rangeHigh <= p.target)
      push("error", "progress", "progress.rangeHigh", "The range high value must be greater than the low value.");
  }
  if (p.clampMax && p.max > 0 && p.target > p.max)
    push("error", "progress", "progress.target", "The target is above the clamped maximum — completion is impossible.");
  if (p.comparison === "lt" && p.target <= 0 && p.mode === "current_value")
    push("warning", "progress", "progress.comparison", "“Less than 0” can never be satisfied by most game values.");
  if (p.starting === "current_game_value" && ["counter", "accumulated"].includes(p.mode))
    push("warning", "progress", "progress.starting", "Counting modes seeded from the current value will include gameplay from before the objective started.", "Switch to “count only changes after activation” if that is unintended.");
  if (needsTracker(doc) && !keys.tracker)
    push("error", "progress", "progress.mode", "This progress mode needs a persistent tracker but none was generated.");
  if (p.evaluation === "polling") {
    if (p.pollSeconds <= 0) push("error", "progress", "progress.pollSeconds", "Polling is selected but no interval is set.");
    else push("warning", "progress", "progress.evaluation", "Polling is expensive — prefer event-driven evaluation where an event exists.");
  }
  if (needsListener(doc) && !keys.listener)
    push("error", "progress", "progress.evaluation", "Event-driven evaluation needs a listener but none was generated.");
  if (p.mode === "duration" && !doc.failure.enabled && p.requireContinuousSeconds > 0)
    push("warning", "failure", "failure.enabled", "A continuous-duration objective has no reset rule, so a brief interruption may never be punished.");

  /* type-specific gameplay -------------------------------------------------- */
  if (doc.type === "interaction" && doc.payload.interaction.includeCancelled)
    push("warning", "type", "payload.interaction.includeCancelled", "Cancelled interactions are being counted — players can farm this by cancelling repeatedly.");
  if (doc.type === "interaction" && doc.payload.interaction.uniqueTargets > 0 && p.mode !== "unique_targets")
    push("warning", "progress", "progress.mode", "A unique-target count is configured but progress is not in unique-target mode.");
  if (doc.type === "composite") {
    const children = doc.payload.composite.children;
    if (!children.length) push("error", "type", "payload.composite.children", "A composite objective needs at least one child.");
    if (hasCycle(doc, others)) push("error", "type", "payload.composite.children", "Circular composite dependency — this objective ends up requiring itself.");
    const needed = doc.payload.composite.n;
    if (["exactly_n", "at_least_n", "at_most_n"].includes(doc.payload.composite.logic) && needed > children.length)
      push("error", "progress", "payload.composite.n", "The required count is greater than the number of children.");
  }
  if (doc.type === "skill" && doc.payload.skill.maxLevel > 0 && doc.payload.skill.requiredLevel > doc.payload.skill.maxLevel)
    push("error", "type", "payload.skill.requiredLevel", "The required level is above the maximum allowed level.");
  if (doc.type === "money" && doc.payload.money.amount <= 0)
    push("error", "type", "payload.money.amount", "The money amount must be greater than zero.");

  /* activation / visibility -------------------------------------------------- */
  if (doc.activation.mode === "after_objective" && !refIsSet(doc.activation.gate))
    push("error", "activation", "activation.gate", "Activation waits on an objective, but none is selected.");
  if (doc.activation.mode === "after_test" && !refIsSet(doc.activation.gate))
    push("error", "activation", "activation.gate", "Activation waits on a test set, but none is selected.");
  if (doc.activation.mode === "manual" && !doc.parents.length)
    push("warning", "activation", "activation.mode", "Nothing activates this objective — it is manual and has no parent.");
  if (doc.visibility === "revealed_by_objective" && !refIsSet(doc.revealedBy))
    push("error", "visibility", "revealedBy", "Visibility depends on another objective, but none is selected.");
  if (doc.visibility.startsWith("hidden") && doc.strings.name.text.trim() && doc.visibility === "hidden")
    push("warning", "visibility", "visibility", "This hidden objective has player-facing text but no reveal behaviour.", "Use “hidden until active” or “hidden until progress begins” if it should ever appear.");

  /* completion --------------------------------------------------------------- */
  if (!doc.completion.length)
    push("error", "completion", "completion", "Nothing happens when this objective completes.");
  for (const [i, a] of doc.completion.entries()) {
    const needsRef = ["unlock_objective", "execute_loot", "grant_reward", "add_buff", "add_trait", "show_notification", "trigger_event", "update_statistic"].includes(a.kind);
    if (needsRef && !refIsSet(a.ref))
      push("error", "completion", `completion.${i}.ref`, `“${a.kind.replace(/_/g, " ")}” has no resource selected.`);
  }
  if (!doc.completion.some((a) => a.kind === "notify_parent") && doc.parents.length)
    push("warning", "completion", "completion", "The objective has parents but never notifies them on completion.");

  /* parents and sharing ------------------------------------------------------- */
  if (!doc.parents.length)
    push("suggestion", "usage", "parents", "This objective is not used by any parent resource yet.");
  const overridden = doc.parents.filter((x) => x.override);
  if (overridden.length > 1) {
    const targets = new Set(overridden.map((o) => o.override?.target).filter((v) => v !== undefined));
    if (targets.size > 1)
      push("warning", "usage", "parents", "Parents disagree on the override target value for this shared objective.");
  }

  /* packs ---------------------------------------------------------------------- */
  const packs = derivedPacks(doc);
  for (const { pack, introducedBy } of packs) {
    if (installedPacks.length && !installedPacks.includes(pack))
      push("warning", "packs", "extraPacks", `${pack} is required by ${introducedBy} but is not installed here.`);
  }
  if (packs.length && doc.origin === "project" && !doc.lastExportedAt)
    push("suggestion", "packs", "extraPacks", `This objective introduces ${packs.length} pack dependenc${packs.length === 1 ? "y" : "ies"}.`);

  /* polish -------------------------------------------------------------------- */
  if (!doc.description.trim())
    push("suggestion", "basics", "description", "No player-facing description.");
  if (!doc.developerSummary.trim())
    push("suggestion", "basics", "developerSummary", "No developer summary for your future self.");
  if (!doc.lastExportedAt)
    push("warning", "export", "lastExportedAt", "This objective has never been test-exported.");

  const errors = f.filter((x) => x.level === "error").length;
  const warnings = f.filter((x) => x.level === "warning").length;
  const suggestions = f.filter((x) => x.level === "suggestion").length;

  const capabilities = {
    canActivate: doc.activation.mode !== "manual" || doc.parents.length > 0,
    canListen: !needsListener(doc) || !!keys.listener,
    canTrack: !needsTracker(doc) || !!keys.tracker,
    canResolveTarget: !spec.tracked || refs.some((r) => r.ref.expectedResourceKind === spec.tracked && refIsSet(r.ref)),
    canComplete: doc.completion.length > 0 && (p.mode === "boolean" || p.target > 0 || p.targetSource !== "fixed"),
    canNotifyParent: doc.completion.some((a) => a.kind === "notify_parent") || doc.parents.length === 0,
    canExport: errors === 0,
  };

  // Broken gameplay logic dominates; decoration barely registers.
  const health = Math.max(
    0,
    Math.min(100, 100 - errors * 22 - warnings * 6 - suggestions * 1),
  );

  return { findings: f, errors, warnings, suggestions, exportable: errors === 0, health, capabilities };
}

/** Only complain about unset refs that belong to the active type. */
function isRelevantRef(doc: ObjectiveDoc, path: string): boolean {
  if (!path.startsWith("payload.")) return true;
  return path.startsWith(`payload.${doc.type}.`);
}

/** Depth-first cycle detection across composite children. */
function hasCycle(doc: ObjectiveDoc, others: ObjectiveDoc[]): boolean {
  const byId = new Map<string, ObjectiveDoc>([[doc.uuid, doc], ...others.map((o) => [o.uuid, o] as const)]);
  const seen = new Set<string>();
  const stack = new Set<string>();

  const visit = (id: string): boolean => {
    if (stack.has(id)) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    stack.add(id);
    const node = byId.get(id);
    for (const child of node?.payload.composite.children ?? []) {
      const childId = child.ref.projectResourceId;
      if (childId && visit(childId)) return true;
    }
    stack.delete(id);
    return false;
  };
  return visit(doc.uuid);
}

/** Batch validation for the landing screen and project health. */
export function validateAll(docs: ObjectiveDoc[], ctx: Omit<ValidationContext, "others">) {
  const map = new Map<string, ObjectiveValidation>();
  for (const doc of docs) {
    map.set(doc.uuid, validateObjective(doc, { ...ctx, others: docs.filter((d) => d.uuid !== doc.uuid) }));
  }
  return map;
}

export const refSummary = (ref: ResourceRef | undefined) =>
  !refIsSet(ref) ? "unset" : `${ref?.resourceKind}: ${ref?.label ?? ref?.tuningName ?? ref?.projectResourceId}`;
