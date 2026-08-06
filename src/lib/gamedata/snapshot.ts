/**
 * Bundled offline snapshot.
 *
 * A fresh install that has never been online (and never will be — the app is
 * offline-first) still needs enough schema to validate the fields our builders
 * actually emit. This is a hand-trimmed subset of the Lot51 TDESC for the
 * classes the Career / Trait / Aspiration builders write, plus the enums those
 * fields reference. Syncing from Lot51 replaces it with the full, current set.
 */

import type { TdescClass } from "./types";

export const SNAPSHOT_VERSION = "1.126.58";

function f(
  name: string,
  type: string,
  className: string,
  extra: Partial<TdescClass["fields"][number]> = {},
): TdescClass["fields"][number] {
  return { name, type, className, ...extra };
}

const now = "bundled";

export const BUNDLED_CLASSES: TdescClass[] = [
  {
    className: "Career",
    path: "Careers/Descriptions/Career.tdesc",
    module: "careers.career_tuning",
    description: "Top-level career tuning.",
    version: SNAPSHOT_VERSION,
    fetchedAt: now,
    fields: [
      f("active_career_type", "ActiveCareerType", "TunableEnumEntry", {
        default: "NON_ACTIVE",
        enumSource: "careers-career_tuning.ActiveCareerType",
        group: "General",
      }),
      f("career_name", "string", "TunableLocalizedString", { group: "General" }),
      f("career_description", "string", "TunableLocalizedString", { group: "General" }),
      f("career_levels", "career_level", "TunableList", { group: "Levels" }),
      f("career_story_progression_name", "string", "TunableLocalizedString", { group: "General" }),
      f("icon", "resource", "TunableResourceKey", { group: "Display" }),
      f("start_track", "career_track", "TunableReference", { group: "Levels" }),
      f("aspirations_to_activate", "aspiration", "TunableList", { group: "General" }),
      f("allow_active_offlot", "bool", "Tunable", { default: "False", group: "General" }),
      f("pto_taken_notification", "string", "TunableLocalizedString", { group: "Notifications" }),
      f("promotion_notification", "string", "TunableLocalizedString", { group: "Notifications" }),
      f("demotion_notification", "string", "TunableLocalizedString", { group: "Notifications" }),
      f("age_requirement", "Age", "TunableEnumEntry", { group: "Requirements" }),
    ],
  },
  {
    className: "CareerLevel",
    path: "Careers/Descriptions/CareerLevel.tdesc",
    module: "careers.career_tuning",
    description: "A single rank within a career track.",
    version: SNAPSHOT_VERSION,
    fetchedAt: now,
    fields: [
      f("title", "string", "TunableLocalizedString", { group: "General" }),
      f("level", "int", "Tunable", { default: "1", group: "General" }),
      f("simoleons_per_hour", "float", "Tunable", { default: "0", group: "Pay" }),
      f("work_schedule", "schedule", "TunableReference", { group: "Schedule" }),
      f("promotion_performance", "float", "Tunable", { group: "Progression" }),
      f("demotion_performance", "float", "Tunable", { group: "Progression" }),
      f("gameplay_statistic", "statistic", "TunableReference", { group: "Progression" }),
      f("promotion_reward", "reward", "TunableReference", { group: "Rewards" }),
      f("outfit", "outfit", "TunableReference", { group: "Display" }),
      f("icon", "resource", "TunableResourceKey", { group: "Display" }),
    ],
  },
  {
    className: "CareerTrack",
    path: "Careers/Descriptions/CareerTrack.tdesc",
    module: "careers.career_tuning",
    description: "An ordered branch of career levels.",
    version: SNAPSHOT_VERSION,
    fetchedAt: now,
    fields: [
      f("career_levels", "career_level", "TunableList", { group: "Levels" }),
      f("branches", "career_track", "TunableList", { group: "Branching" }),
      f("track_name", "string", "TunableLocalizedString", { group: "General" }),
      f("icon", "resource", "TunableResourceKey", { group: "Display" }),
      f("parent_track", "career_track", "TunableReference", { group: "Branching" }),
    ],
  },
  {
    className: "Trait",
    path: "Traits/Descriptions/Trait.tdesc",
    module: "traits.traits",
    description: "Sim trait tuning.",
    version: SNAPSHOT_VERSION,
    fetchedAt: now,
    fields: [
      f("display_name", "string", "TunableLocalizedString", { group: "Display" }),
      f("trait_description", "string", "TunableLocalizedString", { group: "Display" }),
      f("icon", "resource", "TunableResourceKey", { group: "Display" }),
      f("trait_type", "TraitType", "TunableEnumEntry", {
        default: "PERSONALITY",
        enumSource: "traits-trait_type.TraitType",
        group: "General",
      }),
      f("ages", "Age", "TunableEnumSet", { group: "Requirements" }),
      f("conflicting_traits", "trait", "TunableList", { group: "Requirements" }),
      f("buffs", "buff", "TunableList", { group: "Buffs" }),
      f("buffs_add_on_spawn", "bool", "Tunable", { default: "False", group: "Buffs" }),
      f("is_personality_trait", "bool", "Tunable", { default: "True", group: "General" }),
      f("initial_commodities", "statistic", "TunableList", { group: "Statistics" }),
    ],
  },
  {
    className: "Buff",
    path: "Buffs/Descriptions/Buff.tdesc",
    module: "buffs.buff",
    description: "Moodlet / buff tuning.",
    version: SNAPSHOT_VERSION,
    fetchedAt: now,
    fields: [
      f("buff_name", "string", "TunableLocalizedString", { group: "Display" }),
      f("buff_description", "string", "TunableLocalizedString", { group: "Display" }),
      f("icon", "resource", "TunableResourceKey", { group: "Display" }),
      f("mood_type", "mood", "TunableReference", { group: "Mood" }),
      f("mood_weight", "int", "Tunable", { default: "0", group: "Mood" }),
      f("visible", "bool", "Tunable", { default: "True", group: "Display" }),
      f("timeout_string", "string", "TunableLocalizedString", { group: "Display" }),
      f("audio_sting_on_add", "resource", "TunableResourceKey", { group: "Audio" }),
      f("audio_sting_on_remove", "resource", "TunableResourceKey", { group: "Audio" }),
      f("_temporary_commodity_info", "variant", "TunableVariant", { group: "Duration" }),
    ],
  },
  {
    className: "Aspiration",
    path: "Aspirations/Descriptions/Aspiration.tdesc",
    module: "aspirations.aspiration_types",
    description: "Aspiration milestone tuning.",
    version: SNAPSHOT_VERSION,
    fetchedAt: now,
    fields: [
      f("display_name", "string", "TunableLocalizedString", { group: "Display" }),
      f("display_text", "string", "TunableLocalizedString", { group: "Display" }),
      f("icon", "resource", "TunableResourceKey", { group: "Display" }),
      f("objectives", "objective", "TunableList", { group: "Objectives" }),
      f("reward", "reward", "TunableReference", { group: "Rewards" }),
      f("complete_notification", "string", "TunableLocalizedString", { group: "Notifications" }),
    ],
  },
  {
    className: "AspirationTrack",
    path: "Aspirations/Descriptions/AspirationTrack.tdesc",
    module: "aspirations.aspiration_track",
    description: "An ordered set of aspiration milestones.",
    version: SNAPSHOT_VERSION,
    fetchedAt: now,
    fields: [
      f("display_name", "string", "TunableLocalizedString", { group: "Display" }),
      f("description", "string", "TunableLocalizedString", { group: "Display" }),
      f("aspirations", "aspiration", "TunableList", { group: "Milestones" }),
      f("category", "AspirationCategory", "TunableReference", { group: "General" }),
      f("icon", "resource", "TunableResourceKey", { group: "Display" }),
      f("primary_trait", "trait", "TunableReference", { group: "Rewards" }),
    ],
  },
];

/** Enum values referenced by the bundled classes. */
export const BUNDLED_ENUMS: Record<string, Record<string, string>> = {
  "careers-career_tuning.ActiveCareerType": {
    NON_ACTIVE: "0",
    ACTIVE: "1",
    DYNAMIC_EVENTS: "2",
  },
  "traits-trait_type.TraitType": {
    PERSONALITY: "1",
    GAMEPLAY: "2",
    HIDDEN: "3",
    REWARD: "5",
    ASPIRATION: "6",
  },
  "sims-sim_info_types.Age": {
    BABY: "1",
    TODDLER: "2",
    CHILD: "4",
    TEEN: "8",
    YOUNGADULT: "16",
    ADULT: "32",
    ELDER: "64",
  },
};
