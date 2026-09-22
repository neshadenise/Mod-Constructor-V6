/**
 * TDESC requirement checks for builder records.
 *
 * Turns a canonical builder model into the flat bag of tunables the exporter
 * would emit, then compares it against the required-field table derived from
 * the Lot51 TDESC browser. Missing required tunables are errors (the resource
 * is left out of the package); missing recommended ones are warnings.
 */

import {
  TDESC_SPECS,
  checkTdescFields,
  missingTdescFields,
  tdescDocUrl,
  type TdescFieldStatus,
  type TdescResourceKey,
} from "@/lib/gamedata/required-fields";
import type { Aspiration, Career, NotificationTemplate, Trait } from "@/lib/types";
import type { ValidationResult } from "./serializers";

/* --------------------------- model -> tunables --------------------------- */

export function careerTunables(model: Career): Record<string, unknown> {
  return {
    career_name: model.name,
    career_description: model.description,
    career_tracks: model.branches,
    career_category: model.careerType,
    available_for_ages: model.ageGates,
  };
}

export function trackTunables(branch: Career["branches"][number]): Record<string, unknown> {
  return {
    career_name: branch.name,
    career_description: branch.description,
    career_levels: branch.levels,
  };
}

export function levelTunables(level: Career["branches"][number]["levels"][number]): Record<string, unknown> {
  return {
    level_name: level.title,
    level: level.rank,
    pay_per_shift: level.salary,
    work_start_time: level.workStart,
    work_end_time: level.workEnd,
    work_days: level.workDays,
  };
}

export function traitTunables(model: Trait): Record<string, unknown> {
  return {
    display_name: model.name,
    trait_description: model.description,
    trait_type: model.category,
    ages: model.ageGates,
  };
}

export function buffTunables(buff: Trait["buffs"][number]): Record<string, unknown> {
  return {
    buff_name: buff.name,
    buff_description: buff.description,
    mood_type: buff.emotion,
    timeout: buff.durationHours,
  };
}

export function aspirationTunables(model: Aspiration): Record<string, unknown> {
  return {
    display_name: model.name,
    description: model.description,
    objectives: model.milestones,
    category: model.category,
    reward_trait: model.rewardTraitId,
  };
}

export function milestoneTunables(m: Aspiration["milestones"][number]): Record<string, unknown> {
  return {
    display_text: m.name,
    description_text: m.description,
    objectives: m.objectives,
  };
}

export function notificationTunables(model: NotificationTemplate): Record<string, unknown> {
  return {
    dialog_title: model.title,
    dialog_text: model.body,
    ui_style: model.visual,
    icon: model.iconAssetId,
  };
}

/* ------------------------------- issues --------------------------------- */

export function tdescIssues(
  key: TdescResourceKey,
  values: Record<string, unknown>,
  subject: string,
): ValidationResult[] {
  const spec = TDESC_SPECS[key];
  return missingTdescFields(key, values).map((f) => ({
    severity: f.level === "required" ? ("error" as const) : ("warning" as const),
    code: f.level === "required" ? "TDESC_MISSING_REQUIRED" : "TDESC_MISSING_RECOMMENDED",
    message:
      `${subject}: ${spec.className}.${f.field} (${f.label}) is empty. ${f.why} ` +
      `See the ${spec.className} schema at ${tdescDocUrl(spec.className)}.`,
    ...(f.modelPath ? { fieldPath: f.modelPath } : {}),
  }));
}

/** Drops TDESC issues already reported by a builder-specific rule. */
export function mergeTdescIssues(
  existing: ValidationResult[],
  extra: ValidationResult[],
): ValidationResult[] {
  const seen = new Set(existing.map((i) => i.fieldPath).filter(Boolean));
  return [...existing, ...extra.filter((i) => !i.fieldPath || !seen.has(i.fieldPath))];
}

/** Whole-record checklist for the builder UI. */
export function careerChecklist(model: Career): TdescFieldStatus[] {
  return checkTdescFields("career", careerTunables(model));
}
export function traitChecklist(model: Trait): TdescFieldStatus[] {
  return checkTdescFields("trait", traitTunables(model));
}
export function aspirationChecklist(model: Aspiration): TdescFieldStatus[] {
  return checkTdescFields("aspiration", aspirationTunables(model));
}
export function notificationChecklist(model: NotificationTemplate): TdescFieldStatus[] {
  return checkTdescFields("notification", notificationTunables(model));
}
