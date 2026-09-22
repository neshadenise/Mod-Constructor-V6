/**
 * TDESC-required tunable fields, per resource class.
 *
 * Source of truth for the field names, classes and module paths below is the
 * Lot51 TDESC browser (https://tdesc.lot51.cc/), which publishes EA's own
 * tuning descriptions per game version. This table is the subset the builders
 * actually emit: the tunables a resource of that class must carry for the game
 * to load and display it, plus the ones that are strongly recommended.
 *
 * Nothing here is inferred from a package we wrote — each entry names the
 * TDESC class it came from so it can be re-checked against the live schema.
 */

export type TdescResourceKey =
  | "career"
  | "career_track"
  | "career_level"
  | "trait"
  | "buff"
  | "aspiration"
  | "milestone"
  | "objective"
  | "notification"
  | "snippet"
  | "dynasty";

export type TdescFieldLevel = "required" | "recommended";

export interface TdescFieldSpec {
  /** Tunable name as it appears in the TDESC for this class. */
  field: string;
  /** Human label used in the builder checklist. */
  label: string;
  level: TdescFieldLevel;
  /** What breaks in game when it is missing. */
  why: string;
  /** Where the value lives on the builder record. */
  modelPath?: string;
}

export interface TdescClassSpec {
  key: TdescResourceKey;
  className: string;
  module: string;
  summary: string;
  fields: TdescFieldSpec[];
}

export const TDESC_SITE = "https://tdesc.lot51.cc/";

/** Deep link into the Lot51 TDESC browser for a tuning class. */
export function tdescDocUrl(className: string): string {
  return `${TDESC_SITE}?q=${encodeURIComponent(className)}`;
}

export const TDESC_SPECS: Record<TdescResourceKey, TdescClassSpec> = {
  career: {
    key: "career",
    className: "Career",
    module: "careers.career_tuning",
    summary: "The career itself: the shell that owns one or more tracks.",
    fields: [
      { field: "career_name", label: "Career name", level: "required", why: "The career has no label in the job panel.", modelPath: "name" },
      { field: "career_description", label: "Career description", level: "required", why: "The career picker shows an empty tooltip.", modelPath: "description" },
      { field: "career_tracks", label: "At least one track", level: "required", why: "A career with no track cannot be joined.", modelPath: "branches" },
      { field: "career_category", label: "Career category", level: "required", why: "Decides full-time vs part-time scheduling.", modelPath: "careerType" },
      { field: "available_for_ages", label: "Available ages", level: "recommended", why: "With no ages set the game falls back to adult only.", modelPath: "ageGates" },
    ],
  },
  career_track: {
    key: "career_track",
    className: "CareerTrack",
    module: "careers.career_tuning",
    summary: "One branch of a career, holding its ordered levels.",
    fields: [
      { field: "career_name", label: "Track name", level: "required", why: "Branch selection shows a blank option.", modelPath: "branches[].name" },
      { field: "career_description", label: "Track description", level: "required", why: "The branch card has no text.", modelPath: "branches[].description" },
      { field: "career_levels", label: "At least one level", level: "required", why: "An empty track cannot be promoted through.", modelPath: "branches[].levels" },
    ],
  },
  career_level: {
    key: "career_level",
    className: "CareerLevel",
    module: "careers.career_tuning",
    summary: "A single rank: title, pay and work schedule.",
    fields: [
      { field: "level_name", label: "Level title", level: "required", why: "The rank shows as blank in the career panel.", modelPath: "levels[].title" },
      { field: "level", label: "Rank number", level: "required", why: "Promotion order is undefined without it.", modelPath: "levels[].rank" },
      { field: "pay_per_shift", label: "Pay", level: "required", why: "The sim earns nothing for the shift.", modelPath: "levels[].salary" },
      { field: "work_start_time", label: "Shift start", level: "required", why: "The sim never leaves for work.", modelPath: "levels[].workStart" },
      { field: "work_end_time", label: "Shift end", level: "required", why: "The shift never ends.", modelPath: "levels[].workEnd" },
      { field: "work_days", label: "Work days", level: "required", why: "A level with no work days is never scheduled.", modelPath: "levels[].workDays" },
    ],
  },
  trait: {
    key: "trait",
    className: "Trait",
    module: "traits.traits",
    summary: "A personality or gameplay trait.",
    fields: [
      { field: "display_name", label: "Trait name", level: "required", why: "The trait is unnamed in CAS.", modelPath: "name" },
      { field: "trait_description", label: "Trait description", level: "required", why: "CAS shows an empty tooltip.", modelPath: "description" },
      { field: "trait_type", label: "Trait type", level: "required", why: "Decides whether it appears in the personality picker.", modelPath: "category" },
      { field: "ages", label: "Allowed ages", level: "required", why: "A trait with no ages cannot be picked.", modelPath: "ageGates" },
    ],
  },
  buff: {
    key: "buff",
    className: "Buff",
    module: "buffs.buff",
    summary: "A moodlet applied by a trait, career or interaction.",
    fields: [
      { field: "buff_name", label: "Moodlet name", level: "required", why: "The moodlet is unnamed in the mood panel.", modelPath: "buffs[].name" },
      { field: "buff_description", label: "Moodlet description", level: "required", why: "The moodlet tooltip is empty.", modelPath: "buffs[].description" },
      { field: "mood_type", label: "Emotion", level: "required", why: "The moodlet changes no mood.", modelPath: "buffs[].emotion" },
      { field: "timeout", label: "Duration", level: "required", why: "Without a timeout the moodlet never expires.", modelPath: "buffs[].durationHours" },
    ],
  },
  aspiration: {
    key: "aspiration",
    className: "AspirationTrack",
    module: "aspirations.aspiration_tuning",
    summary: "An aspiration track and its ordered milestones.",
    fields: [
      { field: "display_name", label: "Aspiration name", level: "required", why: "The aspiration is unnamed in CAS.", modelPath: "name" },
      { field: "description", label: "Aspiration description", level: "required", why: "The aspiration card is blank.", modelPath: "description" },
      { field: "objectives", label: "At least one milestone", level: "required", why: "An empty aspiration can never be completed.", modelPath: "milestones" },
      { field: "category", label: "Category", level: "recommended", why: "Groups the aspiration in the CAS list.", modelPath: "category" },
      { field: "reward_trait", label: "Reward trait", level: "recommended", why: "Completing it grants nothing.", modelPath: "rewardTraitId" },
    ],
  },
  milestone: {
    key: "milestone",
    className: "AspirationMilestone",
    module: "aspirations.aspiration_tuning",
    summary: "One stage of an aspiration.",
    fields: [
      { field: "display_text", label: "Milestone name", level: "required", why: "The stage is unnamed in the aspiration panel.", modelPath: "milestones[].name" },
      { field: "description_text", label: "Milestone description", level: "recommended", why: "The stage has no explanatory text.", modelPath: "milestones[].description" },
      { field: "objectives", label: "At least one objective", level: "required", why: "A stage with no objectives completes instantly.", modelPath: "milestones[].objectives" },
    ],
  },
  objective: {
    key: "objective",
    className: "Objective",
    module: "aspirations.aspiration_tuning",
    summary: "A single goal inside a milestone or career level.",
    fields: [
      { field: "display_text", label: "Objective text", level: "required", why: "The goal line is blank.", modelPath: "objectives[].text" },
      { field: "goal_value", label: "Goal value", level: "required", why: "The goal can never be reached.", modelPath: "objectives[].goal" },
    ],
  },
  notification: {
    key: "notification",
    className: "Snippet",
    module: "snippets.snippet",
    summary: "In-game message text, shipped as a snippet plus string table.",
    fields: [
      { field: "dialog_title", label: "Title", level: "required", why: "The message shows with no heading.", modelPath: "title" },
      { field: "dialog_text", label: "Body", level: "required", why: "The message is empty.", modelPath: "body" },
      { field: "ui_style", label: "Presentation type", level: "required", why: "The game cannot choose a layout.", modelPath: "visual" },
      { field: "icon", label: "Icon", level: "recommended", why: "The message falls back to a generic icon.", modelPath: "iconAssetId" },
    ],
  },
  snippet: {
    key: "snippet",
    className: "Snippet",
    module: "snippets.snippet",
    summary: "Generic reusable tuning fragment.",
    fields: [
      { field: "n", label: "Snippet name", level: "required", why: "The resource cannot be referenced.", modelPath: "name" },
    ],
  },
  dynasty: {
    key: "dynasty",
    className: "Snippet",
    module: "snippets.snippet",
    summary: "Custom dynasty rules, lowered into snippet tuning.",
    fields: [
      { field: "n", label: "Dynasty name", level: "required", why: "The rule set cannot be referenced.", modelPath: "identity.displayName" },
      { field: "description", label: "Description", level: "required", why: "Nothing explains the rule set in game.", modelPath: "identity.description" },
      { field: "roles", label: "At least one role", level: "required", why: "A dynasty with no roles has no structure.", modelPath: "hierarchy.roles" },
    ],
  },
};

export interface TdescFieldStatus extends TdescFieldSpec {
  present: boolean;
}

function filled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  return true;
}

/** Checks a flat bag of emitted tunable values against the class requirements. */
export function checkTdescFields(
  key: TdescResourceKey,
  values: Record<string, unknown>,
): TdescFieldStatus[] {
  return TDESC_SPECS[key].fields.map((f) => ({ ...f, present: filled(values[f.field]) }));
}

export function missingTdescFields(
  key: TdescResourceKey,
  values: Record<string, unknown>,
): TdescFieldStatus[] {
  return checkTdescFields(key, values).filter((f) => !f.present);
}
