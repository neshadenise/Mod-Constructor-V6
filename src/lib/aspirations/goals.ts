/**
 * Goal logic catalogue (Aspiration Builder — Part 2).
 *
 * Every objective type, its dynamic field set, the reward types a milestone
 * can grant, unlock/condition/failure vocabularies and the objective template
 * library live here. The editor renders itself from this data, the validator
 * checks against it, and the exporter maps it to tuning — so a new goal type
 * is one entry in this file, not a new screen.
 */

import type { ResourceKind, ResourceRef } from "@/lib/traits/schema";

/* ------------------------------------------------------------- field spec -- */

export type GoalFieldKind = "text" | "number" | "toggle" | "select" | "ref";

export interface GoalField {
  id: string;
  label: string;
  kind: GoalFieldKind;
  hint?: string;
  /** select */
  options?: { value: string; label: string }[];
  /** ref — the resource kind the picker expects */
  expects?: string;
  /** number */
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  /** Pack this field's content usually comes from. Surfaced as a hint only. */
  pack?: string;
}

export type GoalParamValue = string | number | boolean;

/* --------------------------------------------------------- objective type -- */

export type ObjectiveTypeId =
  | "statistic"
  | "skill"
  | "interaction"
  | "relationship"
  | "career"
  | "trait"
  | "buff"
  | "collection"
  | "object"
  | "travel"
  | "location"
  | "occult"
  | "event"
  | "situation"
  | "inventory"
  | "recipe"
  | "crafting"
  | "harvest"
  | "fishing"
  | "social"
  | "custom"
  | "hidden"
  | "composite";

export type ProgressStyle =
  | "bar"
  | "counter"
  | "boolean"
  | "hidden-counter"
  | "timer"
  | "collection"
  | "percentage";

export const PROGRESS_STYLES: { value: ProgressStyle; label: string }[] = [
  { value: "bar", label: "Progress bar" },
  { value: "counter", label: "Counter" },
  { value: "boolean", label: "Done / not done" },
  { value: "hidden-counter", label: "Hidden counter" },
  { value: "timer", label: "Timer" },
  { value: "collection", label: "Collection grid" },
  { value: "percentage", label: "Percentage" },
];

export interface ObjectiveTypeSpec {
  id: ObjectiveTypeId;
  label: string;
  group: string;
  hint: string;
  /** Tuning class written by the exporter. */
  testClass: string;
  /** Which resources this goal always connects to. */
  connects: string[];
  progress: ProgressStyle;
  fields: GoalField[];
}

const COMPARISONS: GoalField["options"] = [
  { value: "gte", label: "At least (≥)" },
  { value: "lte", label: "At most (≤)" },
  { value: "eq", label: "Exactly (=)" },
  { value: "gt", label: "More than (>)" },
  { value: "lt", label: "Less than (<)" },
];

const num = (id: string, label: string, extra: Partial<GoalField> = {}): GoalField => ({
  id,
  label,
  kind: "number",
  min: 0,
  step: 1,
  ...extra,
});

const ref = (
  id: string,
  label: string,
  expects: string,
  extra: Partial<GoalField> = {},
): GoalField => ({
  id,
  label,
  kind: "ref",
  expects,
  ...extra,
});

export const OBJECTIVE_TYPES: ObjectiveTypeSpec[] = [
  {
    id: "statistic",
    label: "Statistic Goal",
    group: "Sim state",
    hint: "Track a commodity or statistic until it crosses a threshold.",
    testClass: "TestSetBasedObjective",
    connects: ["Statistic"],
    progress: "bar",
    fields: [
      ref("statistic", "Statistic", "Statistic", {
        required: true,
        hint: "Hunger, Fun, Confidence, a custom statistic…",
      }),
      num("minimum", "Minimum"),
      num("maximum", "Maximum"),
      num("target", "Target value", { required: true }),
      { id: "comparison", label: "Comparison", kind: "select", options: COMPARISONS },
      {
        id: "mode",
        label: "Tracking",
        kind: "select",
        options: [
          { value: "one-time", label: "One time" },
          { value: "continuous", label: "Continuous" },
        ],
      },
    ],
  },
  {
    id: "skill",
    label: "Skill Goal",
    group: "Sim state",
    hint: "Reach a skill level, optionally through a specific gain method.",
    testClass: "ObjectiveSkillTest",
    connects: ["Skill"],
    progress: "bar",
    fields: [
      ref("skill", "Skill", "Skill", { required: true }),
      num("targetLevel", "Target level", { min: 1, max: 20, required: true }),
      num("minimumLevel", "Minimum level", { min: 0, max: 20 }),
      num("maximumLevel", "Maximum level", { min: 0, max: 20 }),
      {
        id: "gainMethod",
        label: "Gain method",
        kind: "text",
        hint: "Optional — restrict how the skill may be raised.",
      },
      { id: "pack", label: "Pack requirement", kind: "text" },
    ],
  },
  {
    id: "career",
    label: "Career Goal",
    group: "Progression",
    hint: "Reach a career level, branch or performance target.",
    testClass: "ObjectiveCareerTest",
    connects: ["Career"],
    progress: "bar",
    fields: [
      ref("career", "Career", "Career", { required: true }),
      { id: "branch", label: "Branch", kind: "text" },
      num("level", "Level", { min: 1, max: 15 }),
      { id: "promotionRequired", label: "Promotion required", kind: "toggle" },
      num("performance", "Performance required"),
      num("workCompleted", "Work days completed"),
      num("dailyTasks", "Daily tasks completed"),
      num("promotionCount", "Promotion count"),
    ],
  },
  {
    id: "interaction",
    label: "Interaction Goal",
    group: "Gameplay",
    hint: "Run an interaction a number of times, optionally on a target.",
    testClass: "ObjectiveInteractionOfInterestTest",
    connects: ["Interaction"],
    progress: "counter",
    fields: [
      ref("interaction", "Interaction", "Interaction", { required: true }),
      ref("targetObject", "Target object", "Object"),
      { id: "targetSim", label: "Target Sim filter", kind: "text" },
      num("times", "Times completed", { min: 1, required: true }),
      { id: "uniqueSims", label: "Unique Sims only", kind: "toggle" },
      num("cooldown", "Cooldown (sim minutes)"),
      { id: "location", label: "Location", kind: "text" },
      { id: "conditions", label: "Extra conditions", kind: "text" },
    ],
  },
  {
    id: "relationship",
    label: "Relationship Goal",
    group: "Social",
    hint: "Reach a relationship track value, bit or sentiment.",
    testClass: "ObjectiveRelationshipTest",
    connects: ["Relationship"],
    progress: "bar",
    fields: [
      {
        id: "relationshipType",
        label: "Relationship type",
        kind: "select",
        options: [
          { value: "friendship", label: "Friendship" },
          { value: "romance", label: "Romance" },
          { value: "sentiment", label: "Sentiment" },
          { value: "bit", label: "Relationship bit" },
        ],
      },
      { id: "target", label: "Target Sim filter", kind: "text" },
      num("value", "Target value", { min: -100, max: 100, required: true }),
      ref("bit", "Relationship bit", "RelationshipBit"),
      num("simCount", "Number of Sims", { min: 1 }),
    ],
  },
  {
    id: "buff",
    label: "Buff Goal",
    group: "Sim state",
    hint: "Hold a buff, optionally for a duration or stack count.",
    testClass: "ObjectiveBuffTest",
    connects: ["Buff"],
    progress: "boolean",
    fields: [
      ref("buff", "Required buff", "Buff", { required: true }),
      num("duration", "Duration (sim hours)"),
      num("intensity", "Intensity"),
      num("stackCount", "Stack count"),
      { id: "hidden", label: "Hidden buff", kind: "toggle" },
      { id: "mood", label: "Mood", kind: "text" },
    ],
  },
  {
    id: "trait",
    label: "Trait Goal",
    group: "Sim state",
    hint: "Require or forbid traits.",
    testClass: "ObjectiveTraitTest",
    connects: ["Trait"],
    progress: "boolean",
    fields: [
      ref("trait", "Required trait", "Trait"),
      ref("forbiddenTrait", "Forbidden trait", "Trait"),
      { id: "category", label: "Trait category", kind: "text" },
      num("count", "Trait count", { min: 1 }),
    ],
  },
  {
    id: "collection",
    label: "Collection Goal",
    group: "Collecting",
    hint: "Collect pieces of a collection.",
    testClass: "ObjectiveCollectionTest",
    connects: ["Collection"],
    progress: "collection",
    fields: [
      ref("collection", "Collection", "Collection", { required: true }),
      num("pieces", "Pieces required", { min: 1 }),
      { id: "completeAll", label: "Complete entire collection", kind: "toggle" },
      { id: "duplicates", label: "Duplicates allowed", kind: "toggle" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory Goal",
    group: "Collecting",
    hint: "Hold items in the Sim or household inventory.",
    testClass: "ObjectiveInventoryTest",
    connects: ["Object"],
    progress: "counter",
    fields: [
      ref("item", "Required item", "Object", { required: true }),
      num("quantity", "Quantity", { min: 1 }),
      { id: "quality", label: "Quality", kind: "text" },
      { id: "crafted", label: "Must be crafted", kind: "toggle" },
      { id: "purchased", label: "Must be purchased", kind: "toggle" },
      { id: "harvested", label: "Must be harvested", kind: "toggle" },
    ],
  },
  {
    id: "object",
    label: "Object Goal",
    group: "Gameplay",
    hint: "Own, place, use or destroy an object.",
    testClass: "ObjectiveObjectTest",
    connects: ["Object"],
    progress: "counter",
    fields: [
      ref("object", "Object", "Object"),
      { id: "tag", label: "Object tag", kind: "text" },
      { id: "placement", label: "Placement", kind: "text" },
      { id: "owned", label: "Owned", kind: "toggle" },
      { id: "purchased", label: "Purchased", kind: "toggle" },
      { id: "used", label: "Used", kind: "toggle" },
      { id: "destroyed", label: "Destroyed", kind: "toggle" },
      num("count", "Count", { min: 1 }),
    ],
  },
  {
    id: "location",
    label: "Location Goal",
    group: "World",
    hint: "Be on a specific lot, venue or world.",
    testClass: "ObjectiveLocationTest",
    connects: ["Venue"],
    progress: "boolean",
    fields: [
      { id: "world", label: "World", kind: "text" },
      { id: "neighborhood", label: "Neighborhood", kind: "text" },
      { id: "lotType", label: "Lot type", kind: "text" },
      { id: "venue", label: "Venue", kind: "text" },
      { id: "zone", label: "Custom zone", kind: "text" },
    ],
  },
  {
    id: "travel",
    label: "Travel Goal",
    group: "World",
    hint: "Visit worlds or lots.",
    testClass: "ObjectiveTravelTest",
    connects: ["Venue"],
    progress: "counter",
    fields: [
      { id: "world", label: "World", kind: "text" },
      num("visits", "Visits required", { min: 1 }),
      { id: "uniqueWorlds", label: "Unique worlds only", kind: "toggle" },
    ],
  },
  {
    id: "occult",
    label: "Occult Goal",
    group: "Sim state",
    hint: "Become, or interact with, an occult life state.",
    testClass: "ObjectiveOccultTest",
    connects: ["Trait"],
    progress: "boolean",
    fields: [
      { id: "occult", label: "Occult", kind: "text", required: true },
      { id: "mustBe", label: "Sim must be this occult", kind: "toggle" },
      num("interactions", "Interactions with this occult"),
    ],
  },
  {
    id: "event",
    label: "Event Goal",
    group: "Events",
    hint: "Attend or complete a festival, holiday or life event.",
    testClass: "ObjectiveEventTest",
    connects: ["Situation"],
    progress: "boolean",
    fields: [
      { id: "event", label: "Event", kind: "text", required: true },
      {
        id: "eventKind",
        label: "Event kind",
        kind: "select",
        options: [
          { value: "festival", label: "Festival" },
          { value: "holiday", label: "Holiday" },
          { value: "wedding", label: "Wedding" },
          { value: "birthday", label: "Birthday" },
          { value: "career", label: "Career event" },
          { value: "custom", label: "Custom event" },
        ],
      },
      num("count", "Times", { min: 1 }),
    ],
  },
  {
    id: "situation",
    label: "Situation Goal",
    group: "Events",
    hint: "Complete a situation, optionally at a medal level.",
    testClass: "ObjectiveSituationTest",
    connects: ["Situation"],
    progress: "boolean",
    fields: [
      ref("situation", "Situation", "Situation", { required: true }),
      { id: "role", label: "Role", kind: "text" },
      { id: "completed", label: "Must complete", kind: "toggle" },
      {
        id: "medal",
        label: "Medal required",
        kind: "select",
        options: [
          { value: "none", label: "Any" },
          { value: "bronze", label: "Bronze" },
          { value: "silver", label: "Silver" },
          { value: "gold", label: "Gold" },
        ],
      },
    ],
  },
  {
    id: "recipe",
    label: "Recipe Goal",
    group: "Crafting",
    hint: "Learn or prepare a specific recipe.",
    testClass: "ObjectiveRecipeTest",
    connects: ["Recipe"],
    progress: "counter",
    fields: [
      ref("recipe", "Recipe", "Recipe", { required: true }),
      num("count", "Times", { min: 1 }),
      { id: "learned", label: "Must be learned first", kind: "toggle" },
    ],
  },
  {
    id: "crafting",
    label: "Crafting Goal",
    group: "Crafting",
    hint: "Craft items at a station, with quality and ingredient rules.",
    testClass: "ObjectiveCraftedTest",
    connects: ["Recipe", "Object"],
    progress: "counter",
    fields: [
      ref("recipe", "Recipe", "Recipe"),
      { id: "quality", label: "Quality", kind: "text" },
      num("craftCount", "Craft count", { min: 1, required: true }),
      ref("station", "Station", "Object"),
      { id: "ingredients", label: "Ingredient restrictions", kind: "text" },
    ],
  },
  {
    id: "harvest",
    label: "Harvest Goal",
    group: "Crafting",
    hint: "Harvest plants or produce.",
    testClass: "ObjectiveHarvestTest",
    connects: ["Object"],
    progress: "counter",
    fields: [
      { id: "plant", label: "Plant / produce", kind: "text" },
      num("count", "Harvest count", { min: 1, required: true }),
      { id: "quality", label: "Quality", kind: "text" },
      { id: "perfectOnly", label: "Perfect quality only", kind: "toggle" },
    ],
  },
  {
    id: "fishing",
    label: "Fishing Goal",
    group: "Crafting",
    hint: "Catch fish, optionally of a species or size.",
    testClass: "ObjectiveFishingTest",
    connects: ["Object"],
    progress: "counter",
    fields: [
      { id: "fish", label: "Fish", kind: "text" },
      num("count", "Catch count", { min: 1, required: true }),
      { id: "bait", label: "Bait required", kind: "text" },
      { id: "location", label: "Fishing spot", kind: "text" },
    ],
  },
  {
    id: "social",
    label: "Social Goal",
    group: "Social",
    hint: "Run social interactions with other Sims.",
    testClass: "ObjectiveSocialTest",
    connects: ["Interaction"],
    progress: "counter",
    fields: [
      ref("social", "Social interaction", "Interaction", { required: true }),
      num("times", "Times", { min: 1 }),
      { id: "uniqueSims", label: "Unique Sims only", kind: "toggle" },
      { id: "targetFilter", label: "Target filter", kind: "text" },
    ],
  },
  {
    id: "custom",
    label: "Custom Test Goal",
    group: "Advanced",
    hint: "Point at a test set you tune yourself.",
    testClass: "TestSetBasedObjective",
    connects: ["TestSet"],
    progress: "boolean",
    fields: [
      ref("testSet", "Test set", "TestSet", { required: true }),
      num("count", "Iterations", { min: 1 }),
      { id: "notes", label: "Behaviour notes", kind: "text" },
    ],
  },
  {
    id: "hidden",
    label: "Hidden Goal",
    group: "Advanced",
    hint: "Tracked silently. Never rendered in the aspiration panel.",
    testClass: "TestSetBasedObjective",
    connects: ["TestSet"],
    progress: "hidden-counter",
    fields: [
      ref("testSet", "Test set", "TestSet"),
      num("count", "Internal count", { min: 1 }),
      { id: "triggersReward", label: "Fires reward when met", kind: "toggle" },
    ],
  },
  {
    id: "composite",
    label: "Composite Goal",
    group: "Advanced",
    hint: "Combine child objectives with AND / OR / NOT logic.",
    testClass: "CompositeObjective",
    connects: [],
    progress: "percentage",
    fields: [
      {
        id: "operator",
        label: "Operator",
        kind: "select",
        options: [
          { value: "and", label: "AND — all children" },
          { value: "or", label: "OR — any child" },
          { value: "not", label: "NOT — none of the children" },
        ],
      },
      num("requiredCount", "Required children (for counted groups)", { min: 0 }),
    ],
  },
];

export const objectiveTypeSpec = (id: ObjectiveTypeId): ObjectiveTypeSpec =>
  OBJECTIVE_TYPES.find((t) => t.id === id) ?? OBJECTIVE_TYPES[0]!;

export const OBJECTIVE_GROUPS = [...new Set(OBJECTIVE_TYPES.map((t) => t.group))];

/* -------------------------------------------------------------- conditions -- */

export const CONDITION_KINDS = [
  "age",
  "species",
  "occult",
  "career",
  "career-branch",
  "relationship",
  "trait",
  "buff",
  "emotion",
  "weather",
  "season",
  "holiday",
  "world",
  "lot",
  "time",
  "inventory",
  "object-nearby",
  "club",
  "household",
  "funds",
  "skill",
  "test-set",
] as const;
export type ConditionKind = (typeof CONDITION_KINDS)[number];

export const CONDITION_LABEL: Record<ConditionKind, string> = {
  age: "Age",
  species: "Species",
  occult: "Occult",
  career: "Career",
  "career-branch": "Career branch",
  relationship: "Relationship",
  trait: "Trait",
  buff: "Buff",
  emotion: "Emotion",
  weather: "Weather",
  season: "Season",
  holiday: "Holiday",
  world: "World",
  lot: "Lot",
  time: "Time of day",
  inventory: "Inventory",
  "object-nearby": "Object nearby",
  club: "Club",
  household: "Household",
  funds: "Funds",
  skill: "Skill",
  "test-set": "Custom test set",
};

export interface GoalCondition {
  id: string;
  kind: ConditionKind;
  value: string;
  negate: boolean;
}

/* ------------------------------------------------------------- unlock rules -- */

export const UNLOCK_KINDS = [
  "previous-milestone",
  "milestone-complete",
  "objective-complete",
  "career-level",
  "trait",
  "buff",
  "relationship",
  "skill-level",
  "occult",
  "statistic",
  "situation",
  "lot",
  "time",
  "test-set",
] as const;
export type UnlockKind = (typeof UNLOCK_KINDS)[number];

export const UNLOCK_LABEL: Record<UnlockKind, string> = {
  "previous-milestone": "After the previous milestone",
  "milestone-complete": "Specific milestone complete",
  "objective-complete": "Specific objective complete",
  "career-level": "Career level",
  trait: "Trait",
  buff: "Buff",
  relationship: "Relationship",
  "skill-level": "Skill level",
  occult: "Occult",
  statistic: "Statistic",
  situation: "Situation",
  lot: "Lot",
  time: "Time",
  "test-set": "Custom test set",
};

export interface UnlockCondition {
  id: string;
  kind: UnlockKind;
  value: string;
  negate: boolean;
}

/* ----------------------------------------------------------------- rewards -- */

export const REWARD_TYPES = [
  "buff",
  "trait",
  "loot",
  "object",
  "money",
  "satisfaction",
  "unlock-interaction",
  "unlock-recipe",
  "unlock-career",
  "unlock-cas-part",
  "notification",
  "broadcaster",
  "custom",
] as const;
export type RewardType = (typeof REWARD_TYPES)[number];

export const REWARD_LABEL: Record<RewardType, string> = {
  buff: "Buff",
  trait: "Trait",
  loot: "Loot action",
  object: "Object",
  money: "Money",
  satisfaction: "Satisfaction points",
  "unlock-interaction": "Unlock interaction",
  "unlock-recipe": "Unlock recipe",
  "unlock-career": "Unlock career",
  "unlock-cas-part": "Unlock CAS part",
  notification: "Notification",
  broadcaster: "Broadcaster",
  custom: "Custom reward",
};

/** Which reward types point at a resource, and what the picker should expect. */
export const REWARD_EXPECTS: Partial<Record<RewardType, string>> = {
  buff: "Buff",
  trait: "Trait",
  loot: "Loot",
  object: "Object",
  "unlock-interaction": "Interaction",
  "unlock-recipe": "Recipe",
  "unlock-career": "Career",
  "unlock-cas-part": "CASPart",
  notification: "Notification",
  broadcaster: "Broadcaster",
  custom: "Loot",
};

/** Reward types that use the numeric amount instead of a reference. */
export const REWARD_NUMERIC: RewardType[] = ["money", "satisfaction"];

export interface MilestoneReward {
  id: string;
  type: RewardType;
  ref: ResourceRef | null;
  amount: number;
  text: string;
}

/* ------------------------------------------------------- failure conditions -- */

export const FAILURE_KINDS = [
  "timer-expired",
  "lost-trait",
  "career-demotion",
  "relationship-failure",
  "death",
  "travel",
  "buff-expired",
  "test-set",
] as const;
export type FailureKind = (typeof FAILURE_KINDS)[number];

export const FAILURE_LABEL: Record<FailureKind, string> = {
  "timer-expired": "Timer expired",
  "lost-trait": "Lost a trait",
  "career-demotion": "Career demotion",
  "relationship-failure": "Relationship failure",
  death: "Death",
  travel: "Travelled away",
  "buff-expired": "Buff expired",
  "test-set": "Custom test set",
};

export interface FailureCondition {
  id: string;
  kind: FailureKind;
  value: string;
}

/* ---------------------------------------------------------------- timing -- */

export type TimerMode =
  | "none"
  | "countdown"
  | "stopwatch"
  | "time-limit"
  | "daily-window"
  | "career-shift"
  | "holiday-window"
  | "season"
  | "expiration";

export const TIMER_LABEL: Record<TimerMode, string> = {
  none: "No timing",
  countdown: "Countdown",
  stopwatch: "Stopwatch",
  "time-limit": "Time limit",
  "daily-window": "Daily window",
  "career-shift": "Career shift",
  "holiday-window": "Holiday window",
  season: "Season",
  expiration: "Expiration",
};

export interface GoalTimer {
  mode: TimerMode;
  /** Sim hours for countdown / limit / window length. */
  hours: number;
  /** Free-form window description, e.g. "8:00–17:00" or "Winter". */
  window: string;
}

export type RepeatMode = "one-time" | "repeatable" | "daily" | "weekly" | "never-reset";

export const REPEAT_LABEL: Record<RepeatMode, string> = {
  "one-time": "One time",
  repeatable: "Repeatable",
  daily: "Daily",
  weekly: "Weekly",
  "never-reset": "Never reset",
};

export interface RepeatRules {
  mode: RepeatMode;
  resetOnFailure: boolean;
  resetOnTravel: boolean;
  resetOnAgeUp: boolean;
}

/* -------------------------------------------------- milestone completion -- */

export type CompletionMode = "all" | "any" | "count";

export interface CompletionRule {
  mode: CompletionMode;
  /** Used when mode === "count" — "complete 3 of 5". */
  count: number;
  /** Sequential objectives must be finished in order. */
  sequential: boolean;
}

/* ------------------------------------------------------ objective templates -- */

export interface ObjectiveTemplate {
  id: string;
  label: string;
  type: ObjectiveTypeId;
  description: string;
  params: Record<string, GoalParamValue>;
  progress?: ProgressStyle;
}

export const OBJECTIVE_TEMPLATES: ObjectiveTemplate[] = [
  {
    id: "skill-level",
    label: "Reach Skill Level",
    type: "skill",
    description: "Raise a skill to a target level.",
    params: { targetLevel: 5 },
  },
  {
    id: "earn-money",
    label: "Earn Money",
    type: "statistic",
    description: "Earn a total amount of Simoleons.",
    params: { target: 5000, comparison: "gte" },
    progress: "bar",
  },
  {
    id: "meet-sims",
    label: "Meet Sims",
    type: "social",
    description: "Introduce yourself to new Sims.",
    params: { times: 10, uniqueSims: true },
  },
  {
    id: "make-friends",
    label: "Make Friends",
    type: "relationship",
    description: "Become friends with several Sims.",
    params: { relationshipType: "friendship", value: 50, simCount: 3 },
  },
  {
    id: "cook-meals",
    label: "Cook Meals",
    type: "crafting",
    description: "Prepare meals of any kind.",
    params: { craftCount: 10 },
  },
  {
    id: "paint-paintings",
    label: "Paint Paintings",
    type: "crafting",
    description: "Finish paintings on an easel.",
    params: { craftCount: 5 },
  },
  {
    id: "harvest-crops",
    label: "Harvest Crops",
    type: "harvest",
    description: "Harvest produce from plants.",
    params: { count: 20 },
  },
  {
    id: "travel-worlds",
    label: "Travel Worlds",
    type: "travel",
    description: "Visit different worlds.",
    params: { visits: 5, uniqueWorlds: true },
  },
  {
    id: "become-famous",
    label: "Become Famous",
    type: "statistic",
    description: "Raise fame to a target level.",
    params: { target: 3, comparison: "gte" },
  },
  {
    id: "graduate",
    label: "Graduate University",
    type: "event",
    description: "Complete a university degree.",
    params: { eventKind: "custom", event: "Graduation", count: 1 },
  },
  {
    id: "promotion",
    label: "Complete Career Promotion",
    type: "career",
    description: "Earn a promotion in a career.",
    params: { promotionRequired: true, promotionCount: 1 },
  },
  {
    id: "collect-objects",
    label: "Collect Objects",
    type: "collection",
    description: "Gather pieces of a collection.",
    params: { pieces: 5 },
  },
  {
    id: "exercise",
    label: "Exercise",
    type: "interaction",
    description: "Work out repeatedly.",
    params: { times: 8 },
  },
  {
    id: "lose-weight",
    label: "Lose Weight",
    type: "statistic",
    description: "Reduce a body statistic.",
    params: { comparison: "lte", target: 25 },
  },
  {
    id: "read-books",
    label: "Read Books",
    type: "interaction",
    description: "Read books to completion.",
    params: { times: 5 },
  },
  {
    id: "watch-tv",
    label: "Watch TV",
    type: "interaction",
    description: "Watch television for a while.",
    params: { times: 3 },
  },
  {
    id: "use-computer",
    label: "Use Computer",
    type: "interaction",
    description: "Use a computer for any task.",
    params: { times: 5 },
  },
  {
    id: "custom",
    label: "Custom",
    type: "custom",
    description: "Start from an empty custom test goal.",
    params: {},
  },
];

/* --------------------------------------------------------- picker mapping -- */

/**
 * Goal fields name resources the way creators talk about them; the resource
 * picker speaks the shared trait vocabulary. This is the only place the two
 * are reconciled.
 */
export const PICKER_KIND: Record<string, ResourceKind> = {
  Trait: "Trait",
  Buff: "Buff",
  Loot: "Loot",
  Interaction: "Interaction",
  TestSet: "TestSet",
  Statistic: "Statistic",
  Skill: "Skill",
  Career: "Career",
  Notification: "Notification",
  Broadcaster: "Broadcaster",
  Aspiration: "Aspiration",
  CASPart: "CasPart",
  Object: "Snippet",
  Recipe: "Snippet",
  Collection: "Snippet",
  Situation: "Snippet",
  Venue: "Snippet",
  RelationshipBit: "Snippet",
};

export const pickerKind = (expects?: string): ResourceKind =>
  (expects && PICKER_KIND[expects]) || "Snippet";
