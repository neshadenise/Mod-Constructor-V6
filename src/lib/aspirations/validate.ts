/**
 * Aspiration validation.
 *
 * Answers one question: could this aspiration be exported, loaded, started,
 * progressed, completed and displayed without broken references? Runs
 * continuously in the editor and again before every export.
 */

import { canSerializeSimData, requiresSimData } from "@/lib/modexport/simdata";
import {
  aspirationTypeSpec,
  collectRefs,
  isVisible,
  objectiveCount,
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
  doc.milestones.forEach((m) => {
    if (!m.title.trim())
      out.push(issue("error", "MS_NO_TITLE", "A milestone has no title.", "milestones", m.id));
    if (!m.objectives.length)
      out.push(
        issue(
          "warning",
          "MS_NO_OBJ",
          `Milestone "${m.title || m.tier}" has no objectives.`,
          "milestones",
          m.id,
        ),
      );
    m.objectives.forEach((o) => {
      if (!o.label.trim())
        out.push(
          issue(
            "error",
            "OBJ_NO_LABEL",
            `An objective in "${m.title || m.tier}" has no label.`,
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

  const errors = out.filter((i) => i.level === "error").length;
  const warnings = out.filter((i) => i.level === "warning").length;
  const suggestions = out.filter((i) => i.level === "suggestion").length;
  const blocking = out.filter((i) => i.level === "error");

  // Optional metadata never sinks the score: suggestions cost almost nothing.
  const score = Math.max(0, Math.min(100, 100 - errors * 18 - warnings * 5 - suggestions * 1));

  return { issues: out, errors, warnings, suggestions, exportable: errors === 0, blocking, score };
}
