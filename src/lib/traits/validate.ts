/**
 * Trait validation.
 *
 * Answers one question: could this trait be exported, loaded, acquired,
 * displayed and used without broken references? Runs continuously in the
 * editor and again before every export.
 */

import {
  EFFECT_EXPECTS,
  EFFECT_LABEL,
  collectRefs,
  isVisible,
  traitTypeSpec,
  type TraitDoc,
} from "./schema";
import { computeTraitKeys, duplicateStringKeys, orphanStrings } from "./ids";
import { canSerializeSimData, requiresSimData } from "@/lib/modexport/simdata";
import { resolveRef, type ResolveContext } from "./resolver";
import { projectTraitDocs } from "./resolver";

export type IssueLevel = "error" | "warning" | "suggestion";

export interface TraitIssue {
  id: string;
  level: IssueLevel;
  code: string;
  message: string;
  /** Editor section to open when the issue is clicked. */
  section: string;
  /** Field / effect id inside that section. */
  target?: string;
  fix?: string;
}

export interface TraitValidation {
  issues: TraitIssue[];
  errors: number;
  warnings: number;
  suggestions: number;
  exportable: boolean;
  /** Blocking issues that mean the package cannot load at all. */
  blocking: TraitIssue[];
}

const issue = (
  level: IssueLevel,
  code: string,
  message: string,
  section: string,
  target?: string,
  fix?: string,
): TraitIssue => ({ id: `${code}:${target ?? section}`, level, code, message, section, ...(target ? { target } : {}), ...(fix ? { fix } : {}) });

export function validateTrait(doc: TraitDoc, ctx: ResolveContext, currentRecordId?: string): TraitValidation {
  const out: TraitIssue[] = [];
  const spec = traitTypeSpec(doc.traitType);
  const keys = computeTraitKeys(doc);

  /* ---- identity ---- */
  if (!doc.displayName.trim())
    out.push(issue("error", "NO_NAME", "Trait has no display name.", "identity", "displayName"));
  if (!doc.ids.internalName.trim())
    out.push(issue("error", "NO_INTERNAL", "Trait has no internal name.", "identity", "internalName"));
  if (/^\d/.test(doc.ids.internalName))
    out.push(issue("error", "BAD_INTERNAL", "Internal name must not start with a number.", "identity", "internalName"));
  if (!doc.ids.namespace.trim())
    out.push(issue("error", "NO_NAMESPACE", "Creator namespace is required for collision-safe ids.", "identity", "namespace"));

  const siblings = projectTraitDocs(ctx.state, ctx.projectId).filter(
    (t) => t.id !== currentRecordId && t.doc.ids.uuid !== doc.ids.uuid,
  );
  if (siblings.some((s) => s.doc.ids.internalName === doc.ids.internalName))
    out.push(issue("error", "DUP_INTERNAL", `Internal name "${doc.ids.internalName}" is already used by another trait in this project.`, "identity", "internalName"));
  const dupKey = siblings.find((s) => computeTraitKeys(s.doc).tuning.instance === keys.tuning.instance);
  if (dupKey)
    out.push(issue("error", "DUP_TUNING_ID", `Tuning instance ${keys.tuning.instance} collides with "${dupKey.doc.displayName}".`, "advanced", "tuningId", "Regenerate IDs or change the internal name."));

  /* ---- XML / SimData pair ---- */
  if (keys.simData.instance !== keys.tuning.instance && !doc.ids.manualSimDataInstance)
    out.push(issue("error", "SIMDATA_MISMATCH", "Trait XML and SimData instances do not match.", "advanced", "simData"));
  if (doc.ids.manualSimDataInstance && doc.ids.manualSimDataInstance.toUpperCase() !== keys.tuning.instance)
    out.push(issue("warning", "SIMDATA_MANUAL", "SimData instance was overridden and no longer matches the tuning instance. The game will not pair them unless you know exactly what you are doing.", "advanced", "simData"));
  if (requiresSimData("trait") && !canSerializeSimData("trait"))
    out.push(issue("error", "NO_SIMDATA_WRITER", "Trait tuning needs a SimData companion and this build has no SimData writer. XML, strings and icons still export; the package will not load in-game until SimData is generated.", "validation", "simdata"));

  /* ---- type / visibility coherence ---- */
  if (!spec.exportable)
    out.push(issue("error", "TYPE_UNSUPPORTED", `Trait type "${spec.label}" cannot be exported correctly yet.`, "identity", "traitType"));
  if (spec.usesCategory && !doc.category)
    out.push(issue("error", "NO_CATEGORY", "This trait type needs a CAS category.", "identity", "category"));
  if (!isVisible(doc) && doc.acquisition.methods.includes("cas"))
    out.push(issue("warning", "HIDDEN_IN_CAS", "Hidden trait is configured to appear in CAS.", "acquisition", "cas"));
  if (isVisible(doc) && !doc.icon)
    out.push(issue("warning", "NO_ICON", "Visible trait has no icon.", "identity", "icon"));
  if (isVisible(doc) && !doc.description.trim())
    out.push(issue("warning", "NO_DESC", "Visible trait has no description.", "identity", "description"));

  /* ---- eligibility ---- */
  if (!doc.eligibility.ages.length)
    out.push(issue("error", "NO_AGES", "No ages selected — no Sim can ever have this trait.", "eligibility", "ages"));
  if (!doc.eligibility.species.length)
    out.push(issue("error", "NO_SPECIES", "No species selected.", "eligibility", "species"));
  if (spec.cas && doc.acquisition.methods.includes("cas") && doc.eligibility.ages.every((a) => a === "infant" || a === "toddler"))
    out.push(issue("warning", "CAS_AGE", "CAS personality traits are not selectable for infants or toddlers only.", "eligibility", "ages"));
  if (doc.eligibility.occultMode !== "any" && !doc.eligibility.occults.length)
    out.push(issue("warning", "OCCULT_EMPTY", "Occult filter is enabled but no occults are selected.", "eligibility", "occults"));

  /* ---- strings ---- */
  if (!doc.strings.displayName.text.trim() && !doc.displayName.trim())
    out.push(issue("error", "NO_STBL_NAME", "Display name string is missing.", "strings", "display_name"));
  for (const dup of duplicateStringKeys(doc))
    out.push(issue("error", "DUP_STBL", `Duplicate string key ${dup}.`, "strings", dup));
  for (const orphan of orphanStrings(doc))
    out.push(issue("suggestion", "ORPHAN_STBL", `String "${orphan.field}" is not used anywhere.`, "strings", orphan.field));

  /* ---- effects & references ---- */
  if (!doc.effects.length)
    out.push(issue("warning", "NO_EFFECTS", "Trait has no gameplay effects — it will do nothing in-game.", "effects"));

  const seenEffect = new Set<string>();
  doc.effects.forEach((e) => {
    const sig = `${e.kind}:${e.label}`;
    if (seenEffect.has(sig)) out.push(issue("warning", "DUP_EFFECT", `Duplicate ${EFFECT_LABEL[e.kind]} "${e.label}".`, "effects", e.id));
    seenEffect.add(sig);

    const expects = EFFECT_EXPECTS[e.kind];
    const ref = "ref" in e ? e.ref : null;
    if (expects && !ref)
      out.push(issue("error", "EFFECT_NO_REF", `${EFFECT_LABEL[e.kind]} "${e.label}" is not connected to a ${expects} resource.`, "effects", e.id, `Pick a ${expects} in the resource picker.`));

    const scope = e.ages.length ? e.ages : doc.eligibility.ages;
    const outside = e.ages.filter((a) => !doc.eligibility.ages.includes(a));
    if (outside.length)
      out.push(issue("warning", "EFFECT_AGE", `${EFFECT_LABEL[e.kind]} "${e.label}" targets ages the trait does not allow (${outside.join(", ")}).`, "effects", e.id));
    if (!scope.length)
      out.push(issue("warning", "EFFECT_NO_AGE", `${EFFECT_LABEL[e.kind]} "${e.label}" has no age it can apply to.`, "effects", e.id));

    if (e.kind === "buff" && e.mode === "visible" && e.durationHours === 0)
      out.push(issue("warning", "PERMANENT_VISIBLE_BUFF", `"${e.label}" is a permanent visible moodlet — that clutters the Sim's mood panel forever.`, "effects", e.id));
  });

  for (const { path, ref } of collectRefs(doc)) {
    const r = resolveRef(ref, ctx);
    if (r.status === "missing")
      out.push(issue("error", "BROKEN_REF", `Broken reference at ${path}: ${r.message}`, "effects", path));
    if (r.status === "wrong-type")
      out.push(issue("error", "WRONG_TYPE", `Wrong resource type at ${path}: ${r.message}`, "effects", path));
    if (r.status === "unresolved-external")
      out.push(issue("error", "UNRESOLVED_DEP", `Unresolved external dependency at ${path}: ${r.message}`, "effects", path));
  }

  /* ---- acquisition ---- */
  if (!doc.acquisition.methods.length)
    out.push(issue(spec.id === "hidden" ? "warning" : "error", "NO_ACQUISITION", "Trait has no acquisition method — nothing can ever grant it.", "acquisition", "methods"));
  if (doc.acquisition.methods.includes("reward-store")) {
    if (doc.acquisition.rewardStore.cost <= 0)
      out.push(issue("error", "REWARD_COST", "Reward store entry needs a satisfaction point cost above zero.", "acquisition", "rewardStore.cost"));
    if (!doc.acquisition.rewardStore.name.trim() && !doc.displayName.trim())
      out.push(issue("error", "REWARD_NAME", "Reward store entry has no name.", "acquisition", "rewardStore.name"));
  }
  if (spec.purchasable && !doc.acquisition.methods.includes("reward-store") && !doc.acquisition.grantedBy.length)
    out.push(issue("warning", "REWARD_NO_SOURCE", "Reward trait has no reward-store entry and no award method.", "acquisition", "methods"));
  if (doc.acquisition.methods.includes("cas") && !spec.cas)
    out.push(issue("error", "CAS_INVALID", `"${spec.label}" traits cannot be selected in CAS.`, "acquisition", "cas"));

  /* ---- conflicts ---- */
  doc.conflicts.forEach((c) => {
    if (c.matchKind === "trait" && !c.ref)
      out.push(issue("error", "CONFLICT_NO_REF", "Conflict row has no trait selected.", "conflicts", c.id));
    if (c.ref && c.ref.source === "project" && c.ref.projectResourceId === doc.ids.uuid)
      out.push(issue("warning", "SELF_CONFLICT", "Trait conflicts with itself.", "conflicts", c.id));
  });
  doc.requirements.forEach((r) => {
    if (["must-have-trait", "must-not-have-trait", "any-of-group", "all-of-group"].includes(r.kind) && !r.refs.length)
      out.push(issue("error", "REQ_EMPTY", "Requirement has no resources selected.", "conflicts", r.id));
  });

  /* ---- reactions ---- */
  doc.reactions.forEach((r) => {
    const hasOutcome =
      r.outcomes.animation || r.outcomes.buffRef || r.outcomes.lootRef || r.outcomes.notification ||
      r.outcomes.relationshipDelta !== 0 || r.outcomes.pushInteractionRef || r.outcomes.thoughtBalloon || r.outcomes.vfx;
    if (!hasOutcome) out.push(issue("warning", "REACTION_NO_OUTCOME", `Reaction "${r.label}" has no outcome.`, "reactions", r.id));
  });

  /* ---- packaging claims ---- */
  const packs = collectRefs(doc)
    .map(({ ref }) => resolveRef(ref, ctx).pack)
    .filter((p): p is string => Boolean(p) && p !== "BaseGame");
  if (doc.eligibility.claimsBaseGame && packs.length)
    out.push(issue("error", "FALSE_BASEGAME", `Marked base-game compatible but references pack content (${[...new Set(packs)].join(", ")}).`, "eligibility", "claimsBaseGame"));

  /* ---- build history ---- */
  if (!doc.ids.lastBuiltAt)
    out.push(issue("suggestion", "NEVER_BUILT", "Trait has never been test-exported.", "validation", "build"));

  const errors = out.filter((i) => i.level === "error");
  return {
    issues: out,
    errors: errors.length,
    warnings: out.filter((i) => i.level === "warning").length,
    suggestions: out.filter((i) => i.level === "suggestion").length,
    blocking: errors,
    exportable: errors.filter((i) => i.code !== "NO_SIMDATA_WRITER").length === 0,
  };
}

/** Compact status used by the landing cards. */
export function traitStatus(v: TraitValidation): "ok" | "warn" | "error" {
  if (v.errors) return "error";
  if (v.warnings) return "warn";
  return "ok";
}
