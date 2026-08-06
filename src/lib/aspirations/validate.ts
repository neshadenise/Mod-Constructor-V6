/**
 * Aspiration validation.
 *
 * Answers one question: could this aspiration be exported, loaded, started,
 * progressed, completed and displayed without broken references? Runs
 * continuously in the editor and again before every export.
 */

import { canSerializeSimData, requiresSimData } from "@/lib/modexport/simdata";
import { REWARD_LABEL, REWARD_NUMERIC, objectiveTypeSpec } from "./goals";
import {
  ensureGameplay,
  rewardChainCycles,
  rewardKindSpec,
  type AspirationGameplay,
} from "./gameplay";
import {
  allObjectives,
  aspirationTypeSpec,
  collectRefs,
  dependencyCycles,
  flattenObjectives,
  isVisible,
  milestoneInternalName,
  objectiveCount,
  objectiveInternalName,
  type AspirationDoc,
} from "./schema";
import { computeAspirationKeys, duplicateStringKeys, orphanStrings } from "./ids";
import { projectAspirationDocs, requiredPacks, resolveRef, type ResolveContext } from "./resolver";


export type IssueLevel = "error" | "warning" | "suggestion";

export interface AspirationIssue {
  id: string;
  level: IssueLevel;
  code: string;
  message: string;
  /** Editor section to open when the issue is clicked. */
  section: string;
  /** Field / row id inside that section. */
  target?: string;
  fix?: string;
}

export interface AspirationValidation {
  issues: AspirationIssue[];
  errors: number;
  warnings: number;
  suggestions: number;
  exportable: boolean;
  /** Blocking issues that mean the package cannot load at all. */
  blocking: AspirationIssue[];
  /** 0–100 contribution to project health. */
  score: number;
}

const issue = (
  level: IssueLevel,
  code: string,
  message: string,
  section: string,
  target?: string,
  fix?: string,
): AspirationIssue => ({
  id: `${code}:${target ?? section}`,
  level,
  code,
  message,
  section,
  ...(target ? { target } : {}),
  ...(fix ? { fix } : {}),
});

export function validateAspiration(
  doc: AspirationDoc,
  ctx: ResolveContext,
  currentRecordId?: string,
): AspirationValidation {
  const out: AspirationIssue[] = [];
  const spec = aspirationTypeSpec(doc.aspirationType);
  const keys = computeAspirationKeys(doc);

  /* ---- identity ---- */
  if (!doc.displayName.trim())
    out.push(
      issue("error", "NO_NAME", "Aspiration has no display name.", "identity", "displayName"),
    );
  if (!doc.ids.internalName.trim())
    out.push(
      issue("error", "NO_INTERNAL", "Aspiration has no internal name.", "identity", "internalName"),
    );
  if (/^\d/.test(doc.ids.internalName))
    out.push(
      issue(
        "error",
        "BAD_INTERNAL",
        "Internal name must not start with a number.",
        "identity",
        "internalName",
      ),
    );
  if (/\s/.test(doc.ids.internalName))
    out.push(
      issue(
        "error",
        "SPACE_INTERNAL",
        "Internal name cannot contain spaces.",
        "identity",
        "internalName",
      ),
    );
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(doc.ids.internalName || "_"))
    out.push(
      issue(
        "error",
        "CHARS_INTERNAL",
        "Internal name may only use letters, numbers and underscores.",
        "identity",
        "internalName",
      ),
    );
  if (!doc.ids.namespace.trim())
    out.push(
      issue(
        "error",
        "NO_NAMESPACE",
        "Creator namespace is required for collision-safe ids.",
        "identity",
        "namespace",
      ),
    );

  const siblings = projectAspirationDocs(ctx.state, ctx.projectId).filter(
    (a) => a.id !== currentRecordId && a.doc.ids.uuid !== doc.ids.uuid,
  );
  if (siblings.some((s) => s.doc.ids.internalName === doc.ids.internalName))
    out.push(
      issue(
        "error",
        "DUP_INTERNAL",
        `Internal name "${doc.ids.internalName}" is already used by another aspiration in this project.`,
        "identity",
        "internalName",
      ),
    );
  const dupKey = siblings.find(
    (s) => computeAspirationKeys(s.doc).tuning.instance === keys.tuning.instance,
  );
  if (dupKey)
    out.push(
      issue(
        "error",
        "DUP_TUNING_ID",
        `Tuning instance ${keys.tuning.instance} collides with "${dupKey.doc.displayName}".`,
        "resources",
        "tuningId",
        "Change the internal name or set a manual instance.",
      ),
    );

  /* ---- XML / SimData pair ---- */
  if (
    doc.ids.manualSimDataInstance &&
    doc.ids.manualSimDataInstance.toUpperCase() !== keys.tuning.instance
  )
    out.push(
      issue(
        "warning",
        "SIMDATA_MANUAL",
        "SimData instance was overridden and no longer matches the tuning instance. The game will not pair them.",
        "resources",
        "simData",
      ),
    );
  if (requiresSimData("aspiration") && !canSerializeSimData("aspiration"))
    out.push(
      issue(
        "error",
        "NO_SIMDATA_WRITER",
        "Aspiration tuning needs a SimData companion and this build has no SimData writer. XML, strings and icons still export; the package will not load in-game until SimData is generated.",
        "validation",
        "simdata",
      ),
    );

  /* ---- type / presentation ---- */
  if (!spec.exportable)
    out.push(
      issue(
        "error",
        "TYPE_UNSUPPORTED",
        `Aspiration type "${spec.label}" cannot be exported correctly yet.`,
        "identity",
        "aspirationType",
      ),
    );
  if (spec.usesCategory && !doc.category)
    out.push(
      issue(
        "error",
        "NO_CATEGORY",
        "This aspiration type needs a category.",
        "identity",
        "category",
      ),
    );
  if (isVisible(doc) && !doc.icon)
    out.push(
      issue(
        "error",
        "NO_ICON",
        "Visible aspiration has no icon — the picker will show a blank tile.",
        "identity",
        "icon",
      ),
    );
  if (isVisible(doc) && !doc.description.trim())
    out.push(
      issue(
        "warning",
        "NO_DESC",
        "Visible aspiration has no description.",
        "identity",
        "description",
      ),
    );
  if (!doc.summary.trim())
    out.push(
      issue(
        "suggestion",
        "NO_SUMMARY",
        "No developer summary. It is never exported, but future-you will want it.",
        "identity",
        "summary",
      ),
    );
  if (!doc.notes.trim())
    out.push(issue("suggestion", "NO_NOTES", "No developer notes recorded.", "identity", "notes"));

  /* ---- availability ---- */
  if (!doc.availability.ages.length)
    out.push(
      issue(
        "error",
        "NO_AGES",
        "No ages selected — no Sim can ever take this aspiration.",
        "availability",
        "ages",
      ),
    );
  if (!doc.availability.species.length)
    out.push(issue("error", "NO_SPECIES", "No species selected.", "availability", "species"));
  if (doc.availability.occultMode !== "any" && !doc.availability.occults.length)
    out.push(
      issue(
        "warning",
        "OCCULT_EMPTY",
        "Occult filter is enabled but no occults are selected.",
        "availability",
        "occults",
      ),
    );
  if (doc.aspirationType === "occult" && doc.availability.occultMode === "any")
    out.push(
      issue(
        "warning",
        "OCCULT_TYPE",
        "Occult aspiration has no occult restriction.",
        "availability",
        "occults",
      ),
    );
  if (doc.availability.gender === "custom" && !doc.availability.genderCustomTest.trim())
    out.push(
      issue(
        "error",
        "GENDER_TEST",
        "Custom gender rule has no test set.",
        "availability",
        "gender",
      ),
    );
  if (
    spec.visibleByDefault &&
    doc.availability.ages.every((a) => a === "infant" || a === "toddler")
  )
    out.push(
      issue(
        "warning",
        "AGE_PICKER",
        "Infants and toddlers cannot choose aspirations in CAS.",
        "availability",
        "ages",
      ),
    );

  /* ---- packs ---- */
  const packs = requiredPacks(doc, ctx);
  if (doc.availability.claimsBaseGame && packs.length)
    out.push(
      issue(
        "error",
        "PACK_CLAIM",
        `Marked base-game compatible but requires ${packs.join(", ")}.`,
        "availability",
        "claimsBaseGame",
        "Untick base-game compatible, or remove the pack content.",
      ),
    );

  /* ---- milestones / objectives ---- */
  if (!doc.milestones.length)
    out.push(
      issue(
        "error",
        "NO_MILESTONES",
        "Aspiration has no milestones — it can never be completed.",
        "milestones",
      ),
    );
  if (doc.milestones.length && !objectiveCount(doc))
    out.push(
      issue("error", "NO_OBJECTIVES", "Milestones exist but contain no objectives.", "milestones"),
    );

  const seenMilestoneNames = new Map<string, number>();
  const seenObjectiveNames = new Map<string, number>();
  const allUuids = new Set(allObjectives(doc).map((o) => o.uuid));

  doc.milestones.forEach((m) => {
    const label = m.title || m.tier;
    if (!m.title.trim())
      out.push(issue("error", "MS_NO_TITLE", "A milestone has no title.", "milestones", m.id));

    const internal = milestoneInternalName(doc, m);
    seenMilestoneNames.set(internal, (seenMilestoneNames.get(internal) ?? 0) + 1);
    if ((seenMilestoneNames.get(internal) ?? 0) > 1)
      out.push(
        issue(
          "error",
          "MS_DUP_NAME",
          `Two milestones resolve to the same internal name "${internal}".`,
          "milestones",
          m.id,
          "Rename one milestone or set its internal name manually.",
        ),
      );

    if (!m.objectives.length)
      out.push(
        issue("warning", "MS_NO_OBJ", `Milestone "${label}" has no objectives.`, "milestones", m.id),
      );
    if (!m.icon)
      out.push(issue("warning", "MS_NO_ICON", `Milestone "${label}" has no icon.`, "milestones", m.id));
    if (!m.description.trim())
      out.push(
        issue(
          "warning",
          "MS_NO_DESC",
          `Milestone "${label}" has no description.`,
          "milestones",
          m.id,
        ),
      );
    if (!m.rewards.length && !m.rewardRef && !m.points)
      out.push(
        issue(
          "warning",
          "MS_NO_REWARD",
          `Milestone "${label}" grants nothing on completion.`,
          "milestones",
          m.id,
        ),
      );
    for (const r of m.rewards) {
      const numeric = REWARD_NUMERIC.includes(r.type);
      if (numeric && r.amount <= 0)
        out.push(
          issue(
            "error",
            "RW_NO_AMOUNT",
            `Reward "${REWARD_LABEL[r.type]}" in "${label}" has no amount.`,
            "milestones",
            m.id,
          ),
        );
      if (!numeric && !r.ref && r.type !== "custom")
        out.push(
          issue(
            "error",
            "RW_NO_TARGET",
            `Reward "${REWARD_LABEL[r.type]}" in "${label}" has no resource attached.`,
            "milestones",
            m.id,
          ),
        );
    }
    if (m.hidden && m.unlockMode === "auto" && !m.unlocks.length)
      out.push(
        issue(
          "suggestion",
          "MS_HIDDEN_AUTO",
          `Hidden milestone "${label}" unlocks automatically — it will appear immediately after the previous one.`,
          "milestones",
          m.id,
        ),
      );
    if (m.unlockMode === "conditions" && !m.unlocks.length)
      out.push(
        issue(
          "error",
          "MS_NO_UNLOCK",
          `Milestone "${label}" uses conditional unlocking but has no conditions.`,
          "milestones",
          m.id,
        ),
      );

    const required = m.objectives.filter((o) => !o.optional && !o.bonus);
    if (m.objectives.length && !required.length)
      out.push(
        issue(
          "error",
          "MS_ALL_OPTIONAL",
          `Every objective in "${label}" is optional — the milestone can never complete.`,
          "milestones",
          m.id,
        ),
      );
    if (m.completion.mode === "count" && m.completion.count > required.length)
      out.push(
        issue(
          "error",
          "MS_IMPOSSIBLE",
          `"${label}" asks for ${m.completion.count} of ${required.length} objectives — impossible.`,
          "milestones",
          m.id,
          "Lower the count or add objectives.",
        ),
      );
    for (const bad of dependencyCycles(m))
      out.push(
        issue(
          "error",
          "OBJ_CYCLE",
          `Circular objective dependency in "${label}".`,
          "milestones",
          bad,
        ),
      );

    const labels = new Map<string, number>();
    flattenObjectives(m.objectives).forEach((o) => {
      const oLabel = o.label || "objective";
      if (!o.label.trim())
        out.push(
          issue(
            "error",
            "OBJ_NO_LABEL",
            `An objective in "${label}" has no name.`,
            "milestones",
            o.id,
          ),
        );
      labels.set(oLabel, (labels.get(oLabel) ?? 0) + 1);
      if ((labels.get(oLabel) ?? 0) === 2)
        out.push(
          issue(
            "warning",
            "OBJ_DUP",
            `"${label}" has two objectives called "${oLabel}".`,
            "milestones",
            o.id,
          ),
        );

      const oInternal = objectiveInternalName(doc, o);
      seenObjectiveNames.set(oInternal, (seenObjectiveNames.get(oInternal) ?? 0) + 1);
      if ((seenObjectiveNames.get(oInternal) ?? 0) === 2)
        out.push(
          issue(
            "error",
            "OBJ_DUP_NAME",
            `Two objectives resolve to the same internal name "${oInternal}".`,
            "milestones",
            o.id,
          ),
        );

      const oSpec = objectiveTypeSpec(o.type);
      for (const f of oSpec.fields) {
        if (!f.required) continue;
        if (f.kind === "ref" && !o.refs[f.id])
          out.push(
            issue(
              "error",
              "OBJ_NO_TEST",
              `"${oLabel}" needs a ${f.label.toLowerCase()} before the game can test it.`,
              "milestones",
              o.id,
            ),
          );
        if (f.kind === "number" && !Number(o.params[f.id] ?? 0))
          out.push(
            issue(
              "error",
              "OBJ_BAD_TARGET",
              `"${oLabel}" has no ${f.label.toLowerCase()}.`,
              "milestones",
              o.id,
            ),
          );
        if (f.kind === "text" && !String(o.params[f.id] ?? "").trim())
          out.push(
            issue(
              "error",
              "OBJ_MISSING_FIELD",
              `"${oLabel}" is missing ${f.label.toLowerCase()}.`,
              "milestones",
              o.id,
            ),
          );
      }

      const min = Number(o.params["minimum"] ?? o.params["minimumLevel"] ?? 0);
      const max = Number(o.params["maximum"] ?? o.params["maximumLevel"] ?? 0);
      if (max && min > max)
        out.push(
          issue(
            "error",
            "OBJ_RANGE",
            `"${oLabel}" has a minimum above its maximum.`,
            "milestones",
            o.id,
          ),
        );
      if (o.count <= 0 && o.progress !== "boolean")
        out.push(
          issue(
            "error",
            "OBJ_BAD_TARGET",
            `"${oLabel}" has a target value of ${o.count}.`,
            "milestones",
            o.id,
          ),
        );
      if (o.type === "composite" && !o.children.length)
        out.push(
          issue(
            "error",
            "OBJ_EMPTY_COMPOSITE",
            `Composite goal "${oLabel}" has no child objectives.`,
            "milestones",
            o.id,
          ),
        );
      if (o.timer.mode !== "none" && o.timer.mode !== "stopwatch" && !o.timer.hours)
        out.push(
          issue(
            "error",
            "OBJ_TIMER",
            `"${oLabel}" is timed but has no duration.`,
            "milestones",
            o.id,
          ),
        );
      for (const dep of o.dependsOn)
        if (!allUuids.has(dep))
          out.push(
            issue(
              "error",
              "OBJ_DEAD_DEP",
              `"${oLabel}" depends on an objective that no longer exists.`,
              "milestones",
              o.id,
            ),
          );
      const dupConditions = new Set<string>();
      for (const c of o.conditions) {
        const sig = `${c.kind}:${c.value}:${c.negate}`;
        if (dupConditions.has(sig))
          out.push(
            issue(
              "warning",
              "OBJ_DUP_COND",
              `"${oLabel}" repeats the same condition twice.`,
              "milestones",
              o.id,
            ),
          );
        dupConditions.add(sig);
      }
      if (o.hidden && o.progress !== "hidden-counter")
        out.push(
          issue(
            "suggestion",
            "OBJ_HIDDEN_STYLE",
            `Hidden objective "${oLabel}" uses a visible progress style.`,
            "milestones",
            o.id,
          ),
        );
      if (o.optional && o.bonus)
        out.push(
          issue(
            "suggestion",
            "OBJ_FLAGS",
            `"${oLabel}" is marked both optional and bonus.`,
            "milestones",
            o.id,
          ),
        );
    });
  });


  /* ---- reward ---- */
  if (spec.expectsRewardTrait && !doc.rewardTrait)
    out.push(
      issue(
        "error",
        "NO_REWARD",
        "This aspiration type is expected to award a reward trait.",
        "resources",
        "rewardTrait",
      ),
    );

  /* ---- references ---- */
  for (const { path, ref } of collectRefs(doc)) {
    const r = resolveRef(ref, ctx);
    if (r.status === "missing")
      out.push(
        issue(
          "error",
          "BROKEN_REF",
          `Broken reference at ${path}: ${r.message}`,
          "resources",
          path,
        ),
      );
    if (r.status === "wrong-type")
      out.push(
        issue(
          "error",
          "WRONG_TYPE",
          `Wrong resource type at ${path}: ${r.message}`,
          "resources",
          path,
        ),
      );
    if (r.status === "unresolved-external")
      out.push(
        issue(
          "error",
          "UNRESOLVED_DEP",
          `Unresolved external dependency at ${path}: ${r.message}`,
          "resources",
          path,
        ),
      );
  }

  /* ---- localisation ---- */
  if (!doc.strings.displayName.text.trim() && !doc.displayName.trim())
    out.push(
      issue("error", "NO_STBL_NAME", "Display name string is missing.", "strings", "display_name"),
    );
  for (const dup of duplicateStringKeys(doc))
    out.push(issue("error", "DUP_STBL", `Duplicate string key ${dup}.`, "strings", dup));
  for (const orphan of orphanStrings(doc))
    out.push(
      issue(
        "suggestion",
        "ORPHAN_STBL",
        `String "${orphan.field}" is not used anywhere.`,
        "strings",
        orphan.field,
      ),
    );
  if (doc.milestones.length && !doc.strings.completionNotification.text.trim())
    out.push(
      issue(
        "warning",
        "NO_COMPLETION_TEXT",
        "No completion notification text — the game will show an empty popup.",
        "strings",
        "completion_notification",
      ),
    );


  /* ---- Part 3: gameplay systems ---- */
  out.push(...validateGameplay(doc, ensureGameplay(doc)));

  const errors = out.filter((i) => i.level === "error").length;
  const warnings = out.filter((i) => i.level === "warning").length;
  const suggestions = out.filter((i) => i.level === "suggestion").length;
  const blocking = out.filter((i) => i.level === "error");

  // Optional metadata never sinks the score: suggestions cost almost nothing.
  const score = Math.max(0, Math.min(100, 100 - errors * 18 - warnings * 5 - suggestions * 1));

  return { issues: out, errors, warnings, suggestions, exportable: errors === 0, blocking, score };
}

/* ------------------------------------------------- Part 3: gameplay -- */

/** Reference fields a reward can legitimately leave empty. */
const OPTIONAL_REWARD_REFS = new Set(["removes", "bit", "sentiment", "traitFilter"]);

/**
 * Rewards, loot, buffs, notifications, broadcasters and listeners.
 *
 * Errors are the things that break the package or the gameplay wiring;
 * warnings are the things that quietly waste a resource or a string.
 */
export function validateGameplay(doc: AspirationDoc, g: AspirationGameplay): AspirationIssue[] {
  const out: AspirationIssue[] = [];

  const milestoneUuids = new Set(doc.milestones.map((m) => m.uuid));
  const objectiveUuids = new Set(allObjectives(doc).map((o) => o.uuid));
  const noteUuids = new Set(g.notifications.map((n) => n.uuid));
  const lootUuids = new Set(g.loot.map((l) => l.uuid));
  const rewardUuids = new Set(g.rewards.map((r) => r.uuid));

  /* rewards */
  const signatures = new Map<string, number>();
  for (const r of g.rewards) {
    const spec = rewardKindSpec(r.kind);
    const where = `Reward "${r.name}"`;

    if (r.scope === "milestone" && !milestoneUuids.has(r.ownerUuid))
      out.push(
        issue("error", "REWARD_ORPHAN", `${where} is attached to a milestone that no longer exists.`, "rewards", r.id),
      );
    if (r.scope === "objective" && !objectiveUuids.has(r.ownerUuid))
      out.push(
        issue("error", "REWARD_ORPHAN", `${where} is attached to an objective that no longer exists.`, "rewards", r.id),
      );

    for (const f of spec.fields) {
      if (f.kind !== "ref" || OPTIONAL_REWARD_REFS.has(f.id)) continue;
      if (!r.refs[f.id])
        out.push(
          issue("error", "REWARD_NO_REF", `${where} has no ${f.label.toLowerCase()} selected.`, "rewards", r.id),
        );
    }

    if (r.kind === "satisfaction" && Number(r.params["points"] ?? 0) <= 0)
      out.push(issue("warning", "REWARD_ZERO", `${where} awards zero satisfaction points.`, "rewards", r.id));

    if (r.kind === "money" && !Number(r.params["household"]) && !Number(r.params["business"]))
      out.push(issue("warning", "REWARD_ZERO_MONEY", `${where} pays nothing.`, "rewards", r.id));

    if (r.kind === "notification") {
      const target = String(r.params["notificationId"] ?? "");
      if (!target)
        out.push(issue("error", "REWARD_NO_NOTE", `${where} has no notification selected.`, "rewards", r.id));
      else if (!noteUuids.has(target))
        out.push(
          issue("error", "REWARD_BAD_NOTE", `${where} points at a notification that was deleted.`, "rewards", r.id),
        );
    }

    if (r.kind === "statistic") {
      const min = Number(r.params["min"] ?? 0);
      const max = Number(r.params["max"] ?? 0);
      if (max !== 0 && min > max)
        out.push(issue("error", "REWARD_RANGE", `${where} has a minimum above its maximum.`, "rewards", r.id));
    }

    const sig = `${r.scope}:${r.ownerUuid}:${r.kind}:${JSON.stringify(r.refs)}:${JSON.stringify(r.params)}`;
    signatures.set(sig, (signatures.get(sig) ?? 0) + 1);
    if ((signatures.get(sig) ?? 0) > 1)
      out.push(issue("error", "REWARD_DUP", `${where} is a duplicate of another reward on the same trigger.`, "rewards", r.id));

    const dupCond = new Set<string>();
    for (const c of r.conditions) {
      const key = `${c.kind}:${c.value}:${c.negate}`;
      if (dupCond.has(key))
        out.push(issue("warning", "REWARD_DUP_COND", `${where} repeats the same condition.`, "rewards", r.id));
      dupCond.add(key);
    }
  }

  const completionRewards = g.rewards.filter((r) => r.scope === "aspiration" && r.trigger === "completed");
  if (completionRewards.length > 8)
    out.push(
      issue("warning", "REWARD_LONG_CHAIN", `${completionRewards.length} rewards fire on completion — the popup queue will be long.`, "rewards"),
    );
  if (doc.milestones.length && !completionRewards.length)
    out.push(
      issue("warning", "NO_COMPLETION_REWARD", "Completing this aspiration grants nothing.", "rewards"),
    );

  for (const cycle of rewardChainCycles(g))
    out.push(issue("error", "REWARD_CYCLE", `Circular reward chain: ${cycle}.`, "rewards"));

  /* loot */
  for (const l of g.loot) {
    if (!l.ops.length)
      out.push(issue("error", "LOOT_EMPTY", `Loot "${l.name}" has no actions.`, "gameplay", l.id));
    if (l.trigger === "custom-event" && !l.customEvent.trim())
      out.push(issue("error", "LOOT_NO_EVENT", `Loot "${l.name}" listens for an unnamed custom event.`, "gameplay", l.id));
    if ((l.trigger === "milestone-completed" || l.trigger === "milestone-started") && l.ownerUuid && !milestoneUuids.has(l.ownerUuid))
      out.push(issue("error", "LOOT_ORPHAN", `Loot "${l.name}" targets a deleted milestone.`, "gameplay", l.id));
    if (l.trigger === "objective-completed" && l.ownerUuid && !objectiveUuids.has(l.ownerUuid))
      out.push(issue("error", "LOOT_ORPHAN", `Loot "${l.name}" targets a deleted objective.`, "gameplay", l.id));
    for (const op of l.ops) {
      if (op.type === "notification" && op.value && !noteUuids.has(op.value))
        out.push(issue("error", "LOOT_BAD_NOTE", `Loot "${l.name}" shows a notification that was deleted.`, "gameplay", l.id));
    }
  }

  /* buffs */
  const buffUsed = (uuid: string, refKey: string) =>
    g.rewards.some((r) => r.refs["buff"] && JSON.stringify(r.refs["buff"]) === refKey) ||
    g.loot.some((l) => l.ops.some((o) => o.ref && JSON.stringify(o.ref) === refKey)) ||
    g.broadcasters.some((b) => b.buffRef && JSON.stringify(b.buffRef) === refKey) ||
    uuid === g.failure.buffRef?.label;

  for (const b of g.buffs) {
    if (!b.ref)
      out.push(issue("error", "BUFF_NO_REF", `Buff link "${b.name}" has no buff selected.`, "gameplay", b.id));
    if (b.removeAfterTime && b.durationHours <= 0)
      out.push(issue("error", "BUFF_NO_DURATION", `Buff "${b.name}" removes after time but has no duration.`, "gameplay", b.id));
    if (b.removeOnMilestone && !milestoneUuids.has(b.removeOnMilestoneUuid))
      out.push(issue("error", "BUFF_BAD_MILESTONE", `Buff "${b.name}" is removed by a milestone that no longer exists.`, "gameplay", b.id));
    if (b.ref && b.category !== "reward" && !buffUsed(b.uuid, JSON.stringify(b.ref)))
      out.push(issue("warning", "BUFF_UNUSED", `Buff "${b.name}" is connected but never applied by a reward, loot or broadcaster.`, "gameplay", b.id));
  }

  /* notifications */
  const titles = new Set<string>();
  for (const n of g.notifications) {
    if (!n.body.trim())
      out.push(issue("warning", "NOTE_EMPTY", `Notification "${n.name}" has no body text.`, "notifications", n.id));
    if (n.title.trim() && titles.has(n.title.trim().toLowerCase()))
      out.push(issue("warning", "NOTE_DUP", `Two notifications share the title "${n.title}".`, "notifications", n.id));
    titles.add(n.title.trim().toLowerCase());
    if (!n.localize && (n.title.trim() || n.body.trim()))
      out.push(issue("warning", "NOTE_NO_STBL", `Notification "${n.name}" is not localised — it will ship in English only.`, "notifications", n.id));
    const used =
      g.rewards.some((r) => r.params["notificationId"] === n.uuid) ||
      g.loot.some((l) => l.ops.some((o) => o.type === "notification" && o.value === n.uuid)) ||
      g.listeners.some((l) => l.actions.some((a) => a.kind === "show-notification" && a.targetUuid === n.uuid)) ||
      g.failure.notificationUuid === n.uuid ||
      n.trigger === "manual";
    if (!used)
      out.push(issue("warning", "NOTE_UNUSED", `Notification "${n.name}" is never shown.`, "notifications", n.id));
  }

  /* broadcasters */
  for (const b of g.broadcasters) {
    if (b.radius <= 0)
      out.push(issue("error", "BC_RADIUS", `Broadcaster "${b.name}" has no radius — it affects nobody.`, "notifications", b.id));
    if (!b.buffRef && !b.traitRef)
      out.push(issue("warning", "BC_EMPTY", `Broadcaster "${b.name}" applies nothing.`, "notifications", b.id));
    if (b.frequencyHours <= 0)
      out.push(issue("warning", "BC_FREQ", `Broadcaster "${b.name}" never ticks.`, "notifications", b.id));
  }

  /* event listeners */
  const listenerSigs = new Set<string>();
  for (const l of g.listeners) {
    if (l.event === "custom-event" && !l.customEvent.trim())
      out.push(issue("error", "EV_NO_NAME", `Listener "${l.name}" listens for an unnamed custom event.`, "events", l.id));
    if (!l.actions.length)
      out.push(issue("error", "EV_NO_ACTION", `Listener "${l.name}" does nothing.`, "events", l.id));
    for (const a of l.actions) {
      const bad =
        (a.kind === "run-loot" && !lootUuids.has(a.targetUuid)) ||
        (a.kind === "show-notification" && !noteUuids.has(a.targetUuid)) ||
        (a.kind === "grant-reward" && !rewardUuids.has(a.targetUuid)) ||
        (a.kind === "advance-objective" && !objectiveUuids.has(a.targetUuid)) ||
        ((a.kind === "complete-milestone" || a.kind === "fail-milestone") && !milestoneUuids.has(a.targetUuid));
      if (bad)
        out.push(issue("error", "EV_BAD_TARGET", `Listener "${l.name}" points at a resource that no longer exists.`, "events", l.id));
    }
    const sig = `${l.event}:${l.customEvent}:${JSON.stringify(l.actions.map((a) => [a.kind, a.targetUuid]))}`;
    if (listenerSigs.has(sig))
      out.push(issue("warning", "EV_REDUNDANT", `Listener "${l.name}" duplicates another listener.`, "events", l.id));
    listenerSigs.add(sig);
  }

  /* wants & fears */
  for (const w of g.wants) {
    if (!w.ref && !w.notes.trim())
      out.push(issue("warning", "WANT_EMPTY", "A wants/fears rule has no target and no note.", "events", w.id));
    if (w.ownerUuid && !objectiveUuids.has(w.ownerUuid) && !milestoneUuids.has(w.ownerUuid))
      out.push(issue("error", "WANT_ORPHAN", "A wants/fears rule is attached to a deleted objective.", "events", w.id));
  }

  /* completion & failure */
  if (g.completion.timing === "delayed" && g.completion.delaySeconds <= 0)
    out.push(issue("warning", "COMP_DELAY", "Completion is delayed by zero seconds.", "events", "completion"));
  if (g.completion.repeat === "custom" && !g.completion.customResetRule.trim())
    out.push(issue("warning", "COMP_RESET", "Custom repeat rule has no description.", "events", "completion"));
  if (!g.completion.saveCompletion)
    out.push(issue("warning", "COMP_NO_SAVE", "Completion is never saved — the aspiration can be completed forever.", "events", "completion"));
  if (g.failure.mode !== "none" && !g.failure.lootRef && !g.failure.buffRef && !g.failure.notificationUuid)
    out.push(issue("suggestion", "FAIL_SILENT", "Failure happens silently — no loot, buff or notification.", "events", "failure"));
  if (g.failure.notificationUuid && !noteUuids.has(g.failure.notificationUuid))
    out.push(issue("error", "FAIL_BAD_NOTE", "Failure notification was deleted.", "events", "failure"));

  /* story progression */
  if (g.story.audience !== "player-only" && !g.story.npcProgress && !g.story.autonomousProgress)
    out.push(issue("warning", "STORY_INERT", "NPCs are in scope but no autonomous progress is enabled.", "events", "story"));
  if (g.story.randomChance < 0 || g.story.randomChance > 100)
    out.push(issue("error", "STORY_CHANCE", "Random chance must be between 0 and 100.", "events", "story"));

  return out;
}
