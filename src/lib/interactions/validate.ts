/**
 * Interaction validation.
 *
 * Findings are graded the way a creator experiences them, not the way a
 * compiler does: blocking errors, likely in-game failures, compatibility
 * warnings, design warnings and informational notes.
 */

import { checkAnimationCompatibility, findAnimation } from "./animations";
import { analyzeSequence } from "./sequence";
import { stringFields, computeInteractionKeys } from "./export";
import type { InteractionDoc } from "./schema";

export type Severity = "blocking" | "likely_failure" | "compatibility" | "design" | "info";

export const SEVERITY_LABEL: Record<Severity, string> = {
  blocking: "Blocking error",
  likely_failure: "Likely in-game failure",
  compatibility: "Compatibility warning",
  design: "Design warning",
  info: "Informational note",
};

export interface Finding {
  id: string;
  severity: Severity;
  section: string;
  message: string;
  fix?: string;
  target?: string;
}

export interface ValidationResult {
  findings: Finding[];
  counts: Record<Severity, number>;
  /** Blocking findings must be empty before export is allowed. */
  exportable: boolean;
  score: number;
}

export function validateInteraction(
  doc: InteractionDoc,
  opts: { installedPacks?: string[]; otherDocs?: InteractionDoc[]; knownTestSets?: string[] } = {},
): ValidationResult {
  const { installedPacks = [], otherDocs = [], knownTestSets = [] } = opts;
  const f: Finding[] = [];
  const push = (
    severity: Severity,
    section: string,
    message: string,
    extra: { fix?: string; target?: string } = {},
  ) => f.push({ id: `${section}:${f.length}`, severity, section, message, ...extra });

  const keys = computeInteractionKeys(doc);

  /* identity ------------------------------------------------------------- */
  if (!doc.displayName.trim()) push("blocking", "details", "The interaction has no name.");
  if (!doc.ids.internalName.trim())
    push("blocking", "details", "The internal tuning name is empty — nothing can be exported.");
  if (!/^[a-z0-9_]+$/.test(doc.ids.internalName))
    push("blocking", "details", "Internal tuning names may only contain lowercase letters, numbers and underscores.");
  if (!doc.ids.namespace.trim())
    push("blocking", "details", "A namespace is required so your tuning cannot collide with another creator's.");
  if (!doc.interactionClass.trim())
    push("blocking", "details", "No interaction class is set.");

  for (const other of otherDocs) {
    if (other.uuid === doc.uuid) continue;
    const otherKeys = computeInteractionKeys(other);
    if (otherKeys.interaction.instanceHex === keys.interaction.instanceHex)
      push("blocking", "details", `“${other.displayName}” already uses this tuning name — instance ids collide.`, {
        fix: "Rename one of them.",
      });
  }

  if (doc.source.mode === "clone" && doc.source.originalInstanceId &&
      doc.source.originalInstanceId === keys.interaction.instanceDecimal)
    push("blocking", "source", "This clone would reuse EA's instance id. Rename the interaction to mint a new one.");

  /* participants --------------------------------------------------------- */
  if (!doc.participants.length)
    push("blocking", "participants", "No participants are defined — the game cannot run this.");
  if (!doc.participants.some((p) => p.slot === "Actor"))
    push("likely_failure", "participants", "No Actor participant — every interaction needs one.");
  const labels = new Set<string>();
  for (const p of doc.participants) {
    if (labels.has(p.label.toLowerCase()))
      push("design", "participants", `Two participants are both called “${p.label}”.`, { target: p.uuid });
    labels.add(p.label.toLowerCase());
    if (p.slot === "Custom" && !p.customSlotName.trim())
      push("blocking", "participants", `“${p.label}” is a custom slot with no underlying participant mapping.`, {
        target: p.uuid,
        fix: "Choose the real participant slot this label maps to.",
      });
    if (!p.animationRole && doc.animations.length)
      push("design", "participants", `“${p.label}” has no animation role, so animations cannot address it.`, {
        target: p.uuid,
      });
  }
  if (doc.targetType === "sim" && !doc.participants.some((p) => p.slot === "TargetSim" || p.slot === "PickedSim"))
    push("likely_failure", "participants", "Target type is a Sim but no target Sim participant exists.");
  if (
    (doc.targetType === "object" || doc.targetType === "custom_object") &&
    !doc.participants.some((p) => p.slot === "Object" || p.slot === "PickedObject")
  )
    push("design", "participants", "Target type is an object but no object participant is defined.");

  /* tests ---------------------------------------------------------------- */
  for (const uuid of doc.tests.testSets) {
    if (knownTestSets.length && !knownTestSets.includes(uuid))
      push("blocking", "availability", "This interaction references a test set that no longer exists in the project.", {
        fix: "Replace or detach the missing test set.",
      });
  }
  if (doc.tests.userDirectedOnly && doc.flags.autonomous)
    push("design", "availability", "Marked user-directed only, but the autonomy flag is still on.");

  /* animation ------------------------------------------------------------ */
  for (const a of doc.animations) {
    const anim = a.source === "ea_animation" || a.source === "ea_asm" ? findAnimation(a.refId) : undefined;
    const issues = checkAnimationCompatibility(anim, a, doc, installedPacks);
    for (const issue of issues) {
      const severity: Severity =
        issue.level === "error"
          ? issue.code === "pack_unavailable"
            ? "compatibility"
            : "likely_failure"
          : issue.level === "warning"
            ? issue.code.includes("pack") || issue.code.includes("rig")
              ? "compatibility"
              : "design"
            : "info";
      push(severity, "animation", `${a.label}: ${issue.message}`, {
        target: a.uuid,
        ...(issue.fix ? { fix: issue.fix } : {}),
      });
    }
    if (a.source === "none" && doc.animations.length === 1)
      push("info", "animation", "No animation is assigned — the Sim will stand still.");
  }
  for (const set of doc.animationSets) {
    if (!set.actors.length)
      push("blocking", "animation", `Imported set “${set.name}” has no actors defined.`, { target: set.uuid });
    if (!set.states.some((s) => s.kind === "exit"))
      push("design", "animation", `Imported set “${set.name}” has no exit state — Sims may get stuck.`, {
        target: set.uuid,
      });
  }

  /* sequence -------------------------------------------------------------- */
  for (const issue of analyzeSequence(doc.sequence)) {
    const severity: Severity =
      issue.level === "error"
        ? issue.code === "broken_branch" || issue.code === "unknown_step"
          ? "blocking"
          : "likely_failure"
        : issue.level === "warning"
          ? "design"
          : "info";
    push(severity, "sequence", issue.message, { ...(issue.stepUuid ? { target: issue.stepUuid } : {}) });
  }

  /* outcomes -------------------------------------------------------------- */
  const enabledOutcomes = doc.outcomes.filter((o) => o.enabled);
  if (!enabledOutcomes.length)
    push("design", "outcomes", "No outcomes are enabled — nothing happens when the interaction ends.");
  if (!enabledOutcomes.some((o) => o.kind === "success"))
    push("design", "outcomes", "There is no success outcome.");
  for (const o of enabledOutcomes) {
    for (const e of o.effects) {
      if (!e.ref.trim() && e.kind !== "notification" && e.kind !== "dialog")
        push("likely_failure", "outcomes", `A ${e.kind.replace(/_/g, " ")} effect on ${o.kind} has no reference set.`, {
          target: o.uuid,
        });
    }
  }

  /* autonomy -------------------------------------------------------------- */
  const a = doc.autonomy;
  if (a.allowAutonomous && !a.modifiers.length && !a.cooldownMinutes && !doc.tests.testSets.length)
    push(
      "design",
      "autonomy",
      "This interaction is autonomous with no scoring, cooldown or availability tests — Sims will spam it.",
      { fix: "Add score modifiers, a cooldown, or gating tests." },
    );
  if (a.allowAutonomous && a.baseScore <= 0)
    push("design", "autonomy", "Autonomy is enabled but the base score is zero, so it will never be chosen.");
  if (!a.allowAutonomous && !a.allowUserDirected)
    push("blocking", "autonomy", "The interaction is neither autonomous nor user-directed — nothing can ever run it.");

  /* placement / injection ------------------------------------------------- */
  const p = doc.placement;
  if (!p.surfaces.length) push("likely_failure", "injection", "No placement surface is selected.");
  if (p.method === "xml_injector") {
    if (!p.targets.length)
      push("blocking", "injection", "XML Injector needs at least one affordance list target.", {
        fix: "Add the object tuning name or tag the interaction should be injected into.",
      });
    push("info", "injection", "XML Injector will be listed as a required dependency for players.");
  }
  if (p.method === "script") {
    if (!p.scriptModule.trim())
      push("design", "injection", "No script module name is set — a default will be generated from the namespace.");
    push("info", "injection", "A .ts4script file is exported alongside the package and must ship together with it.");
  }
  if (p.method === "object_tuning" && !doc.objectReqs.objectTuning)
    push("blocking", "injection", "Object tuning placement needs a target object tuning name.");
  const dupeTargets = p.targets.filter((t, i) => p.targets.indexOf(t) !== i);
  if (dupeTargets.length)
    push("design", "injection", `Duplicate injection target: ${[...new Set(dupeTargets)].join(", ")}.`);

  /* objects and slots ----------------------------------------------------- */
  const o = doc.objectReqs;
  if (doc.targetType === "object" && !o.objectTuning && !o.objectTags.length && !o.objectDefinition)
    push("likely_failure", "objects", "Target type is an object but no object, tag or definition is required.");
  if (o.slot && !o.objectTuning && !o.objectTags.length)
    push("design", "objects", "A slot is required but no object is — the slot can never be resolved.");
  if (o.requiredPosture && !doc.sequence.steps.some((s) => s.type === "change_posture"))
    push("design", "objects", `The interaction requires the ${o.requiredPosture} posture but never enters it.`);

  /* strings and icons ------------------------------------------------------ */
  const strings = stringFields(doc);
  if (!strings.some((s) => s.key === "pie_menu"))
    push("blocking", "wording", "There is no pie menu text — players would see an empty menu entry.");
  if (!strings.some((s) => s.key === "tooltip"))
    push("info", "wording", "No tooltip is set.");
  if (!doc.icon) push("info", "details", "No icon is assigned; the game will use the default.");
  for (const s of strings) {
    const tokens = s.text.match(/\{(\d+)\./g) ?? [];
    for (const t of tokens) {
      const index = parseInt(t.slice(1), 10);
      if (index >= doc.participants.length)
        push("likely_failure", "wording", `“${s.label}” uses token ${t}…} but only ${doc.participants.length} participant(s) exist.`, {
          fix: "Add the participant or remove the token.",
        });
    }
  }

  /* packs ------------------------------------------------------------------ */
  if (doc.packCompat.requirement === "pack_required" && !doc.packCompat.packs.length)
    push("blocking", "packs", "Pack required is selected but no pack is named.");
  if (doc.packCompat.requirement === "pack_required" && doc.packCompat.fallback === "none")
    push("compatibility", "packs", "No fallback is configured for players who do not own the required pack.", {
      fix: "Hide the interaction, disable it with a tooltip, or supply alternate tuning.",
    });
  if (doc.packCompat.fallback === "alternate_tuning" && !doc.packCompat.alternateTuning)
    push("blocking", "packs", "Alternate tuning fallback is selected but no tuning is named.");
  if (doc.packCompat.fallback === "disable_with_tooltip" && !doc.packCompat.fallbackTooltip)
    push("design", "packs", "Disable-with-tooltip is selected but the tooltip text is empty.");
  if (installedPacks.length) {
    for (const pack of doc.packCompat.packs) {
      if (!installedPacks.includes(pack))
        push("compatibility", "packs", `${pack} is referenced but is not marked as installed on this machine.`);
    }
  }

  /* source integrity -------------------------------------------------------- */
  if (doc.source.mode === "reference" && doc.source.pack && doc.source.pack !== "Base Game")
    push("compatibility", "source", `This references a ${doc.source.pack} resource, so the pack becomes required.`);
  if (doc.rawFields.length)
    push("info", "advanced", `${doc.rawFields.length} imported tuning field(s) are preserved but not editable in the visual builder.`);

  const counts: Record<Severity, number> = {
    blocking: 0,
    likely_failure: 0,
    compatibility: 0,
    design: 0,
    info: 0,
  };
  for (const finding of f) counts[finding.severity] += 1;

  const penalty =
    counts.blocking * 25 + counts.likely_failure * 10 + counts.compatibility * 4 + counts.design * 2;
  return {
    findings: f,
    counts,
    exportable: counts.blocking === 0,
    score: Math.max(0, Math.min(100, 100 - penalty)),
  };
}
