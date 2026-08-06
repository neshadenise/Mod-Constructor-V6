/**
 * Objective Builder — canonical document model.
 *
 * An objective is a standalone, reusable project resource. Aspirations,
 * careers, gigs, events, situations, scenarios and custom systems reference an
 * objective by its immutable project UUID; they never own or embed it. Inline
 * tuning is only ever produced at export time, when the Sims 4 format demands
 * it.
 *
 * Everything the game needs to actually run the goal lives here: what is
 * tracked, which event drives it, how progress is counted, when it activates,
 * what happens on completion, and which packs it drags in.
 */

export const OBJECTIVE_DOC_VERSION = 1;

export const oid = (prefix: string) =>
  `${prefix}_${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;

export function sanitizeInternalName(s: string): string {
  const cleaned = s
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");
  // Tuning names may not begin with a digit.
  return /^[0-9]/.test(cleaned) ? `Objective_${cleaned}` : cleaned || "Objective_Untitled";
}

/* ---------------------------------------------------------- references --- */

export type ResourceKind =
  | "Statistic" | "Skill" | "Interaction" | "Career" | "CareerTrack" | "Trait" | "Buff"
  | "Mood" | "Object" | "ObjectDefinition" | "Collection" | "Recipe" | "Plant" | "Fish"
  | "World" | "Venue" | "Lot" | "Situation" | "Event" | "Aspiration" | "Milestone"
  | "Objective" | "ObjectiveSet" | "TestSet" | "Loot" | "Notification" | "Reward"
  | "String" | "RelationshipTrack" | "RelationshipBit" | "Sentiment" | "Organization"
  | "Degree" | "Gig" | "Scenario" | "Other";

/**
 * A reference always carries its kind, its source and how strictly it must
 * resolve. A bare pasted number is never a valid reference.
 */
export interface ResourceRef {
  /** Project resources: the target's immutable UUID. */
  projectResourceId?: string;
  resourceKind: ResourceKind;
  expectedResourceKind: ResourceKind;
  source: "project" | "game" | "mod" | "community" | "unset";
  resolutionMode: "required" | "optional";
  /** Game/mod resources. */
  tuningName?: string;
  tuningId?: string;
  pack?: string;
  gameVersionResolved?: string;
  /** Cached label for display; never used for resolution. */
  label?: string;
}

export function blankRef(kind: ResourceKind, mode: ResourceRef["resolutionMode"] = "required"): ResourceRef {
  return { resourceKind: kind, expectedResourceKind: kind, source: "unset", resolutionMode: mode };
}

export const refIsSet = (r: ResourceRef | undefined): boolean =>
  !!r && r.source !== "unset" && !!(r.projectResourceId || r.tuningName || r.tuningId);

export const refLabel = (r: ResourceRef | undefined): string =>
  !r || !refIsSet(r) ? "Not set" : r.label || r.tuningName || r.projectResourceId || r.tuningId || "Unnamed";

/* -------------------------------------------------------- objective type -- */

export const OBJECTIVE_TYPES = [
  "statistic", "skill", "interaction", "career", "relationship", "trait", "buff",
  "emotion", "money", "object", "inventory", "collection", "crafting", "recipe",
  "harvesting", "fishing", "location", "travel", "situation", "event", "social",
  "fame", "reputation", "university", "occult", "time", "test_based", "composite",
  "parent_completion", "custom_advanced",
] as const;
export type ObjectiveType = (typeof OBJECTIVE_TYPES)[number];

export interface ObjectiveTypeSpec {
  id: ObjectiveType;
  label: string;
  summary: string;
  /** The resource the objective tracks, when it needs one. */
  tracked?: ResourceKind;
  /** Game event the generated listener subscribes to. */
  event: string;
  /** Progress modes that make sense for this type; first is the default. */
  progressModes: ProgressMode[];
  /** Pack this type itself requires, when it is pack-only. */
  pack?: string;
  group: "Progression" | "Behaviour" | "Social" | "Economy" | "World" | "Meta";
}

export const OBJECTIVE_TYPE_SPECS: ObjectiveTypeSpec[] = [
  { id: "statistic", label: "Statistic objective", summary: "Tracks a statistic or commodity value.", tracked: "Statistic", event: "statistic_changed", progressModes: ["current_value", "accumulated", "counter", "boolean"], group: "Progression" },
  { id: "skill", label: "Skill objective", summary: "Tracks a skill level or levels gained.", tracked: "Skill", event: "skill_level_up", progressModes: ["current_value", "counter", "boolean"], group: "Progression" },
  { id: "interaction", label: "Interaction objective", summary: "Counts completed interactions and their outcomes.", tracked: "Interaction", event: "interaction_complete", progressModes: ["counter", "unique_targets", "duration", "boolean"], group: "Behaviour" },
  { id: "career", label: "Career objective", summary: "Career level, promotions, shifts and performance.", tracked: "Career", event: "career_event", progressModes: ["current_value", "counter", "boolean"], group: "Progression" },
  { id: "relationship", label: "Relationship objective", summary: "Relationship tracks, bits and sentiments.", tracked: "RelationshipTrack", event: "relationship_changed", progressModes: ["current_value", "unique_targets", "counter", "duration", "boolean"], group: "Social" },
  { id: "trait", label: "Trait objective", summary: "Gaining, removing or holding traits.", tracked: "Trait", event: "trait_changed", progressModes: ["boolean", "counter"], group: "Behaviour" },
  { id: "buff", label: "Buff objective", summary: "Gaining, removing or maintaining a buff.", tracked: "Buff", event: "buff_added", progressModes: ["boolean", "duration", "counter"], group: "Behaviour" },
  { id: "emotion", label: "Emotion objective", summary: "Reaching or holding a mood at an intensity.", tracked: "Mood", event: "mood_changed", progressModes: ["boolean", "duration"], group: "Behaviour" },
  { id: "money", label: "Money objective", summary: "Earning, spending or holding funds, by source.", event: "funds_changed", progressModes: ["accumulated", "current_value", "counter"], group: "Economy" },
  { id: "object", label: "Object objective", summary: "Owning, buying, using, upgrading or repairing objects.", tracked: "Object", event: "object_event", progressModes: ["counter", "unique_targets", "boolean"], group: "Economy" },
  { id: "inventory", label: "Inventory objective", summary: "Holding items in a specific inventory.", tracked: "Object", event: "inventory_changed", progressModes: ["counter", "unique_targets", "boolean"], group: "Economy" },
  { id: "collection", label: "Collection objective", summary: "Collecting items or finishing a collection.", tracked: "Collection", event: "collection_item_found", progressModes: ["collection", "counter", "boolean"], group: "Economy" },
  { id: "crafting", label: "Crafting objective", summary: "Crafting objects at a station.", tracked: "Recipe", event: "craft_complete", progressModes: ["counter", "unique_targets", "boolean"], group: "Behaviour" },
  { id: "recipe", label: "Recipe objective", summary: "Learning or cooking specific recipes.", tracked: "Recipe", event: "recipe_learned", progressModes: ["counter", "unique_targets", "boolean"], group: "Behaviour" },
  { id: "harvesting", label: "Harvesting objective", summary: "Harvesting plants and produce quality.", tracked: "Plant", event: "harvest_complete", progressModes: ["counter", "unique_targets"], group: "Behaviour" },
  { id: "fishing", label: "Fishing objective", summary: "Catching fish, species and locations.", tracked: "Fish", event: "fish_caught", progressModes: ["counter", "unique_targets"], group: "Behaviour" },
  { id: "location", label: "Location objective", summary: "Being at, or acting at, a place.", tracked: "Venue", event: "zone_load", progressModes: ["boolean", "duration", "unique_targets", "counter"], group: "World" },
  { id: "travel", label: "Travel objective", summary: "Travelling to worlds and lots.", tracked: "World", event: "travel_complete", progressModes: ["counter", "unique_targets", "boolean"], group: "World" },
  { id: "situation", label: "Situation objective", summary: "Situation completion, role and medal.", tracked: "Situation", event: "situation_ended", progressModes: ["boolean", "counter", "ranked_state"], group: "World" },
  { id: "event", label: "Event objective", summary: "Social events, goals and medals.", tracked: "Event", event: "event_ended", progressModes: ["boolean", "counter", "ranked_state"], group: "World" },
  { id: "social", label: "Social objective", summary: "Social interactions with filtered Sims.", tracked: "Interaction", event: "social_complete", progressModes: ["counter", "unique_targets"], group: "Social" },
  { id: "fame", label: "Fame objective", summary: "Celebrity level and fame points.", event: "fame_changed", progressModes: ["current_value", "accumulated"], pack: "Get Famous", group: "Progression" },
  { id: "reputation", label: "Reputation objective", summary: "Reputation level and standing.", event: "reputation_changed", progressModes: ["current_value", "ranked_state"], pack: "Get Famous", group: "Progression" },
  { id: "university", label: "University objective", summary: "Enrolment, courses, GPA and graduation.", tracked: "Degree", event: "university_event", progressModes: ["boolean", "counter", "current_value"], pack: "Discover University", group: "Progression" },
  { id: "occult", label: "Occult objective", summary: "Occult type, rank, powers and weaknesses.", tracked: "Trait", event: "occult_changed", progressModes: ["boolean", "current_value", "counter"], group: "Progression" },
  { id: "time", label: "Time objective", summary: "Surviving or maintaining a state for a period.", event: "time_elapsed", progressModes: ["duration", "boolean"], group: "Meta" },
  { id: "test_based", label: "Test-based objective", summary: "Completes when a test set evaluates true.", tracked: "TestSet", event: "test_evaluation", progressModes: ["boolean", "duration"], group: "Meta" },
  { id: "composite", label: "Composite objective", summary: "Combines other objective resources with logic.", tracked: "Objective", event: "objective_complete", progressModes: ["composite", "counter"], group: "Meta" },
  { id: "parent_completion", label: "Parent-completion objective", summary: "Tracks completion of another resource.", event: "resource_complete", progressModes: ["boolean", "counter"], group: "Meta" },
  { id: "custom_advanced", label: "Custom advanced objective", summary: "Hand-authored tuning for cases the builder cannot model.", event: "custom", progressModes: ["hidden_state", "boolean", "counter"], group: "Meta" },
];

export const typeSpec = (id: ObjectiveType): ObjectiveTypeSpec =>
  OBJECTIVE_TYPE_SPECS.find((t) => t.id === id) ?? OBJECTIVE_TYPE_SPECS[0]!;

/* ------------------------------------------------------------- progress -- */

export const PROGRESS_MODES = [
  "boolean", "counter", "accumulated", "current_value", "percentage", "duration",
  "unique_targets", "collection", "ranked_state", "composite", "hidden_state",
] as const;
export type ProgressMode = (typeof PROGRESS_MODES)[number];

export const PROGRESS_MODE_LABEL: Record<ProgressMode, string> = {
  boolean: "Boolean — done or not done",
  counter: "Counter — count events",
  accumulated: "Accumulated value — sum of gains",
  current_value: "Current value — read the live value",
  percentage: "Percentage",
  duration: "Duration",
  unique_targets: "Unique targets",
  collection: "Collection completeness",
  ranked_state: "Ranked state (medal / tier)",
  composite: "Composite of child objectives",
  hidden_state: "Hidden internal state",
};

export const COMPARISONS = ["eq", "gt", "gte", "lt", "lte", "between", "outside"] as const;
export type Comparison = (typeof COMPARISONS)[number];

export const COMPARISON_LABEL: Record<Comparison, string> = {
  eq: "Equal to",
  gt: "Greater than",
  gte: "Greater than or equal to",
  lt: "Less than",
  lte: "Less than or equal to",
  between: "Between",
  outside: "Outside range",
};

export type StartingProgress =
  | "zero"
  | "current_game_value"
  | "changes_after_activation"
  | "import_existing"
  | "parent_decides"
  | "custom_loot";

export const STARTING_PROGRESS_LABEL: Record<StartingProgress, string> = {
  zero: "Start at zero",
  current_game_value: "Use the current game value",
  changes_after_activation: "Count only changes after activation",
  import_existing: "Import existing qualifying progress",
  parent_decides: "Let the parent decide",
  custom_loot: "Custom initialization loot",
};

export type TargetSourceKind = "fixed" | "dynamic_formula" | "parent_provided" | "difficulty_scaled" | "household_scaled";

export interface ProgressConfig {
  mode: ProgressMode;
  starting: StartingProgress;
  initLoot?: ResourceRef;
  targetSource: TargetSourceKind;
  target: number;
  min: number;
  max: number;
  comparison: Comparison;
  /** Only meaningful for between / outside. */
  rangeHigh: number;
  formula: string;
  /** Statistic-flavoured switches; harmless for other types. */
  countOnlyGains: boolean;
  countOnlyLosses: boolean;
  trackAbsolute: boolean;
  clampMin: boolean;
  clampMax: boolean;
  /** How often completion is evaluated. Event-driven is the default. */
  evaluation: "on_event" | "on_zone_load" | "on_sim_load" | "polling" | "continuous";
  pollSeconds: number;
  requireContinuousSeconds: number;
  display: {
    style: "number" | "fraction" | "percentage" | "bar" | "checkmark" | "hidden" | "custom";
    customFormat: string;
  };
}

export function blankProgress(patch: Partial<ProgressConfig> = {}): ProgressConfig {
  return {
    mode: "counter",
    starting: "changes_after_activation",
    targetSource: "fixed",
    target: 1,
    min: 0,
    max: 0,
    comparison: "gte",
    rangeHigh: 0,
    formula: "",
    countOnlyGains: true,
    countOnlyLosses: false,
    trackAbsolute: false,
    clampMin: false,
    clampMax: false,
    evaluation: "on_event",
    pollSeconds: 0,
    requireContinuousSeconds: 0,
    display: { style: "fraction", customFormat: "" },
    ...patch,
  };
}

/* ------------------------------------------------------- visibility etc -- */

export type Visibility =
  | "always" | "hidden" | "hidden_until_active" | "hidden_until_progress"
  | "revealed_by_objective" | "revealed_by_milestone" | "parent_controlled" | "debug_only";

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  always: "Always visible",
  hidden: "Hidden",
  hidden_until_active: "Hidden until active",
  hidden_until_progress: "Hidden until progress begins",
  revealed_by_objective: "Revealed by another objective",
  revealed_by_milestone: "Revealed by a milestone",
  parent_controlled: "Parent controlled",
  debug_only: "Debug only",
};

export type ActivationMode =
  | "immediate" | "parent_start" | "after_previous" | "after_objective" | "after_test"
  | "through_loot" | "on_event" | "scheduled" | "manual";

export const ACTIVATION_LABEL: Record<ActivationMode, string> = {
  immediate: "Immediately",
  parent_start: "When the parent begins",
  after_previous: "After the previous objective",
  after_objective: "After a specific objective completes",
  after_test: "After a test passes",
  through_loot: "Through loot",
  on_event: "On an event",
  scheduled: "At a scheduled time",
  manual: "Manually, through a custom system",
};

export interface Activation {
  mode: ActivationMode;
  gate?: ResourceRef;
  scheduledHour: number;
  trackRetroactively: boolean;
}

export const COMPLETION_ACTIONS = [
  "mark_complete", "freeze_progress", "continue_tracking", "notify_parent",
  "unlock_objective", "execute_loot", "grant_reward", "add_buff", "add_trait",
  "show_notification", "play_vfx", "trigger_event", "update_statistic",
] as const;
export type CompletionActionKind = (typeof COMPLETION_ACTIONS)[number];

export const COMPLETION_ACTION_LABEL: Record<CompletionActionKind, string> = {
  mark_complete: "Mark complete",
  freeze_progress: "Freeze progress",
  continue_tracking: "Keep tracking",
  notify_parent: "Notify the parent",
  unlock_objective: "Unlock another objective",
  execute_loot: "Execute loot",
  grant_reward: "Grant a reward",
  add_buff: "Add a buff",
  add_trait: "Add a trait",
  show_notification: "Show a notification",
  play_vfx: "Play a visual effect",
  trigger_event: "Trigger an event",
  update_statistic: "Update a statistic",
};

export interface CompletionAction {
  uuid: string;
  kind: CompletionActionKind;
  /** Connected resource, for every kind that needs one. */
  ref?: ResourceRef;
  amount: number;
  notes: string;
}

export function blankCompletionAction(kind: CompletionActionKind = "mark_complete"): CompletionAction {
  return { uuid: oid("act"), kind, amount: 0, notes: "" };
}

export interface FailureConfig {
  enabled: boolean;
  condition: string;
  testSet?: ResourceRef;
  notification?: ResourceRef;
  loot?: ResourceRef;
  onFail: "reset_progress" | "preserve_partial" | "lock_permanently" | "retry" | "parent_handles";
}

/* --------------------------------------------------------------- scope --- */

export const SIM_SCOPES = [
  "active_sim", "objective_owner", "selected_sim", "any_household_member",
  "all_household_members", "specific_sim", "target_sim", "any_world_sim",
  "npc_only", "player_sim_only", "filtered_population",
] as const;
export type SimScope = (typeof SIM_SCOPES)[number];

export const SIM_SCOPE_LABEL: Record<SimScope, string> = {
  active_sim: "Active Sim",
  objective_owner: "Objective owner",
  selected_sim: "Selected Sim",
  any_household_member: "Any household member",
  all_household_members: "All household members",
  specific_sim: "A specific Sim",
  target_sim: "Target Sim",
  any_world_sim: "Any Sim in the world",
  npc_only: "NPCs only",
  player_sim_only: "Player Sims only",
  filtered_population: "Filtered population",
};

export const AGES = ["infant", "toddler", "child", "teen", "youngadult", "adult", "elder"] as const;
export const SPECIES = ["human", "dog", "cat", "horse", "fox", "smalldog"] as const;
export const OCCULTS = ["alien", "vampire", "mermaid", "spellcaster", "werewolf", "ghost", "servo", "fairy"] as const;

export interface Scope {
  sim: SimScope;
  specificSim?: ResourceRef;
  ages: string[];
  species: string[];
  occultMode: "any" | "human_only" | "include" | "exclude" | "exact";
  occults: string[];
  customOccult?: ResourceRef;
}

/* --------------------------------------------------------- type payload -- */

/**
 * Per-type configuration. Only the block matching the objective's type is
 * meaningful, but all blocks persist so switching type back never loses work.
 */
export interface TypePayload {
  statistic: { stat?: ResourceRef; source: "sim" | "object" | "household" | "lot" | "custom"; startingValue: number; direction: "increase" | "decrease" | "either"; countEvents: boolean; resetBehavior: "never" | "on_fail" | "on_reactivate" };
  skill: { skill?: ResourceRef; requiredLevel: number; exactLevel: boolean; maxLevel: number; levelsGained: number; countAfterStart: boolean; simCount: number; allowBooks: boolean; allowClasses: boolean; allowCheats: boolean; gainMethod: "any" | "practice" | "books" | "classes" | "objects" };
  interaction: { interaction?: ResourceRef; category: string; tag: string; actor: string; target: string; objectType?: ResourceRef; count: number; uniqueTargets: number; successOnly: boolean; failedOnly: boolean; includeAutonomous: boolean; includeUserDirected: boolean; includeCancelled: boolean; outcome: string; durationSeconds: number; location?: ResourceRef; timeRestriction: string; emotion: string; objectState: string; cooldownMinutes: number };
  career: { career?: ResourceRef; track?: ResourceRef; branch: string; level: number; promotions: number; trigger: "reach_level" | "promotion" | "join" | "leave" | "retire" | "shift_complete" | "daily_task" | "wfh_assignment" | "performance" | "career_event"; performance: string; anyFromCategory: string; exactCareer: boolean };
  relationship: { track?: ResourceRef; bit?: ResourceRef; sentiment?: ResourceRef; minValue: number; maxValue: number; changeAmount: number; uniqueCount: number; restriction: "any" | "friendship" | "romance" | "family" | "household"; maintainDays: number; trigger: string };
  trait: { required?: ResourceRef; forbidden?: ResourceRef; category: string; count: number; action: "gain" | "remove" | "maintain"; matching: "exact" | "any_in_group" | "all_in_group"; householdCount: number };
  buff: { buff?: ResourceRef; category: string; emotion: string; intensity: number; action: "gain" | "remove" | "maintain"; continuousMinutes: number; totalMinutes: number; occurrences: number; stacks: number; resetOnRemove: boolean };
  money: { fundsSource: "household" | "business" | "retail" | "restaurant" | "vet"; behavior: "earn" | "spend" | "balance"; amount: number; transactionType: string; minTransaction: number; countRefunds: boolean; countTransfers: boolean; countSales: boolean; countWages: boolean; countTips: boolean; countRoyalties: boolean; countInheritance: boolean };
  object: { object?: ResourceRef; definition?: ResourceRef; tag: string; category: string; quantity: number; action: "own" | "purchase" | "place" | "use" | "upgrade" | "repair" | "break" | "clean" | "destroy"; quality: string; minValue: number; state: string; uniqueOnly: boolean; location?: ResourceRef };
  inventory: { object?: ResourceRef; tag: string; quantity: number; uniqueQuantity: number; quality: string; rarity: string; owner: "sim" | "household" | "business" | "object"; obtainMethod: string; keepUntilComplete: boolean; consumeAllowed: boolean };
  collection: { collection?: ResourceRef; quantity: number; completeEntire: boolean; rarity: string; uniqueOnly: boolean };
  crafting: { recipe?: ResourceRef; station?: ResourceRef; ingredient?: ResourceRef; quality: string; quantity: number; uniqueRecipes: number; successOnly: boolean };
  recipe: { recipe?: ResourceRef; action: "learn" | "cook" | "master"; quantity: number; uniqueRecipes: number; quality: string };
  harvesting: { plant?: ResourceRef; item?: ResourceRef; quality: string; quantity: number; uniqueOnly: boolean };
  fishing: { fish?: ResourceRef; location?: ResourceRef; bait?: ResourceRef; quantity: number; uniqueSpecies: number; sellOrKeep: "either" | "sell" | "keep" };
  location: { world?: ResourceRef; venue?: ResourceRef; lot?: ResourceRef; region: string; neighborhood: string; lotTrait: string; visits: number; uniqueLocations: number; durationHours: number; withSim: boolean; timeWindow: string; actionWhileThere?: ResourceRef };
  travel: { world?: ResourceRef; venue?: ResourceRef; visits: number; uniqueWorlds: number; withHouseholdMember: boolean };
  situation: { situation?: ResourceRef; role: string; medal: string; score: number; result: "success" | "failure" | "any"; participantRole: "host" | "guest" | "participant"; durationHours: number; instances: number; uniqueInstances: boolean };
  event: { event?: ResourceRef; medal: string; goalCount: number; result: "success" | "failure" | "any"; participantRole: "host" | "guest" | "participant"; instances: number };
  social: { interaction?: ResourceRef; category: string; count: number; uniqueSims: number; targetFilter: string };
  fame: { level: number; points: number; mode: "level" | "points" };
  reputation: { level: string; value: number };
  university: { university: string; degree?: ResourceRef; action: "enroll" | "courses" | "gpa" | "graduate" | "organization"; courseCount: number; gpa: number; organizationRank: string };
  occult: { occultType: string; rank: number; power?: ResourceRef; weakness?: ResourceRef; transformation: boolean; customStat?: ResourceRef };
  time: { hours: number; continuous: boolean; whileState: string; testSet?: ResourceRef };
  test_based: { testSet?: ResourceRef; completeImmediately: boolean; resetIfFalse: boolean; targetSim: string; targetObject?: ResourceRef; resolverContext: string };
  composite: { logic: "all" | "any" | "exactly_n" | "at_least_n" | "at_most_n" | "ordered" | "weighted" | "not"; n: number; children: { uuid: string; ref: ResourceRef; weight: number }[]; weightThreshold: number };
  parent_completion: { parent?: ResourceRef; parentKind: "Objective" | "ObjectiveSet" | "Milestone" | "Aspiration" | "Career" | "Gig" | "Event" | "Scenario" | "Other"; count: number; branch: string; scope: "current_save" | "lifetime"; who: "same_sim" | "household_member" | "any_sim" };
  custom_advanced: { tuningXml: string; notes: string };
}

export function blankTypePayload(): TypePayload {
  return {
    statistic: { source: "sim", startingValue: 0, direction: "increase", countEvents: false, resetBehavior: "never" },
    skill: { requiredLevel: 5, exactLevel: false, maxLevel: 0, levelsGained: 0, countAfterStart: false, simCount: 1, allowBooks: true, allowClasses: true, allowCheats: false, gainMethod: "any" },
    interaction: { category: "", tag: "", actor: "Actor", target: "TargetSim", count: 1, uniqueTargets: 0, successOnly: true, failedOnly: false, includeAutonomous: true, includeUserDirected: true, includeCancelled: false, outcome: "", durationSeconds: 0, timeRestriction: "", emotion: "", objectState: "", cooldownMinutes: 0 },
    career: { branch: "", level: 1, promotions: 0, trigger: "reach_level", performance: "", anyFromCategory: "", exactCareer: true },
    relationship: { minValue: 0, maxValue: 100, changeAmount: 0, uniqueCount: 0, restriction: "any", maintainDays: 0, trigger: "" },
    trait: { category: "", count: 1, action: "gain", matching: "exact", householdCount: 0 },
    buff: { category: "", emotion: "", intensity: 1, action: "gain", continuousMinutes: 0, totalMinutes: 0, occurrences: 1, stacks: 1, resetOnRemove: true },
    money: { fundsSource: "household", behavior: "earn", amount: 1000, transactionType: "", minTransaction: 0, countRefunds: false, countTransfers: false, countSales: true, countWages: true, countTips: true, countRoyalties: true, countInheritance: false },
    object: { tag: "", category: "", quantity: 1, action: "own", quality: "", minValue: 0, state: "", uniqueOnly: true },
    inventory: { tag: "", quantity: 1, uniqueQuantity: 0, quality: "", rarity: "", owner: "sim", obtainMethod: "", keepUntilComplete: true, consumeAllowed: false },
    collection: { quantity: 1, completeEntire: false, rarity: "", uniqueOnly: true },
    crafting: { quality: "", quantity: 1, uniqueRecipes: 0, successOnly: true },
    recipe: { action: "learn", quantity: 1, uniqueRecipes: 0, quality: "" },
    harvesting: { quality: "", quantity: 1, uniqueOnly: false },
    fishing: { quantity: 1, uniqueSpecies: 0, sellOrKeep: "either" },
    location: { region: "", neighborhood: "", lotTrait: "", visits: 1, uniqueLocations: 0, durationHours: 0, withSim: false, timeWindow: "" },
    travel: { visits: 1, uniqueWorlds: 0, withHouseholdMember: false },
    situation: { role: "", medal: "", score: 0, result: "success", participantRole: "participant", durationHours: 0, instances: 1, uniqueInstances: false },
    event: { medal: "", goalCount: 0, result: "success", participantRole: "host", instances: 1 },
    social: { category: "", count: 1, uniqueSims: 0, targetFilter: "" },
    fame: { level: 1, points: 0, mode: "level" },
    reputation: { level: "", value: 0 },
    university: { university: "", action: "enroll", courseCount: 0, gpa: 0, organizationRank: "" },
    occult: { occultType: "", rank: 0, transformation: false },
    time: { hours: 24, continuous: true, whileState: "" },
    test_based: { completeImmediately: true, resetIfFalse: false, targetSim: "active", resolverContext: "sim", },
    composite: { logic: "all", n: 1, children: [], weightThreshold: 0 },
    parent_completion: { parentKind: "Objective", count: 1, branch: "", scope: "current_save", who: "same_sim" },
    custom_advanced: { tuningXml: "", notes: "" },
  };
}

/* ------------------------------------------------------------- document -- */

export interface LocalizedText {
  /** Stable STBL key; survives text edits. */
  key: string;
  text: string;
}

export interface ObjectiveStrings {
  name: LocalizedText;
  shortLabel: LocalizedText;
  description: LocalizedText;
}

/** A parent system that references this objective. */
export interface ParentUsage {
  uuid: string;
  parentKind: "Aspiration" | "Career" | "ActiveCareer" | "Gig" | "Event" | "Situation" | "Scenario" | "Quest" | "Tutorial" | "Achievement" | "Holiday" | "Organization" | "Dynasty" | "Club" | "StoryProgression" | "Custom";
  parentResourceId: string;
  parentLabel: string;
  /** e.g. "Milestone 2: Build Your Reputation". */
  slotLabel: string;
  /** Parent-local overrides that do not touch the canonical objective. */
  override?: {
    displayText?: string;
    target?: number;
    visibility?: Visibility;
    reward?: ResourceRef;
  };
  addedAt: number;
}

export interface ObjectiveDoc {
  version: number;
  /** Immutable. Survives renames, moves, re-export and id regeneration. */
  uuid: string;
  projectId: string;
  displayName: string;
  shortLabel: string;
  description: string;
  strings: ObjectiveStrings;
  internalName: string;
  namespace: string;
  /** Set when Advanced Mode let the creator diverge from the project namespace. */
  namespaceOverridden: boolean;
  developerSummary: string;
  developerNotes: string;
  icon: string;
  type: ObjectiveType;
  payload: TypePayload;
  progress: ProgressConfig;
  visibility: Visibility;
  revealedBy?: ResourceRef;
  repeatable: boolean;
  repeatLimit: number;
  activation: Activation;
  completion: CompletionAction[];
  failure: FailureConfig;
  scope: Scope;
  /** Creator-declared extra packs; detected packs are computed, not stored. */
  extraPacks: string[];
  parents: ParentUsage[];
  origin: "project" | "imported" | "ea_reference" | "template";
  templateId?: string;
  /** Frozen ids; regenerating is deliberate and transactional. */
  ids: {
    tuningDecimal: string;
    tuningHex: string;
    manual: boolean;
    lastGeneratedAt: number;
  };
  lastExportedAt: number;
  createdAt: number;
  updatedAt: number;
}

export function blankObjectiveDoc(patch: Partial<ObjectiveDoc> = {}): ObjectiveDoc {
  const now = Date.now();
  const base: ObjectiveDoc = {
    version: OBJECTIVE_DOC_VERSION,
    uuid: oid("objective"),
    projectId: "",
    displayName: "New Objective",
    shortLabel: "",
    description: "",
    strings: {
      name: { key: "", text: "New Objective" },
      shortLabel: { key: "", text: "" },
      description: { key: "", text: "" },
    },
    internalName: "Objective_NewObjective",
    namespace: "MyMods",
    namespaceOverridden: false,
    developerSummary: "",
    developerNotes: "",
    icon: "",
    type: "statistic",
    payload: blankTypePayload(),
    progress: blankProgress(),
    visibility: "always",
    repeatable: false,
    repeatLimit: 0,
    activation: { mode: "parent_start", scheduledHour: 8, trackRetroactively: false },
    completion: [blankCompletionAction("mark_complete"), blankCompletionAction("notify_parent")],
    failure: { enabled: false, condition: "", onFail: "parent_handles" },
    scope: { sim: "active_sim", ages: [], species: ["human"], occultMode: "any", occults: [] },
    extraPacks: [],
    parents: [],
    origin: "project",
    ids: { tuningDecimal: "", tuningHex: "", manual: false, lastGeneratedAt: 0 },
    lastExportedAt: 0,
    createdAt: now,
    updatedAt: now,
  };
  return { ...base, ...patch };
}

/** A fresh copy with a new identity, used by duplicate and "duplicate for parent". */
export function duplicateObjective(doc: ObjectiveDoc, suffix = " Copy"): ObjectiveDoc {
  return {
    ...doc,
    uuid: oid("objective"),
    displayName: `${doc.displayName}${suffix}`,
    internalName: sanitizeInternalName(`${doc.internalName}${suffix}`),
    strings: {
      name: { key: "", text: `${doc.strings.name.text}${suffix}` },
      shortLabel: { key: "", text: doc.strings.shortLabel.text },
      description: { key: "", text: doc.strings.description.text },
    },
    parents: [],
    ids: { tuningDecimal: "", tuningHex: "", manual: false, lastGeneratedAt: 0 },
    lastExportedAt: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/* ---------------------------------------------------------- derived bits -- */

/** Every reference the document points at, with the field path that owns it. */
export function collectRefs(doc: ObjectiveDoc): { path: string; ref: ResourceRef }[] {
  const out: { path: string; ref: ResourceRef }[] = [];
  const add = (path: string, ref?: ResourceRef) => {
    if (ref) out.push({ path, ref });
  };
  const p = doc.payload;
  add("payload.statistic.stat", p.statistic.stat);
  add("payload.skill.skill", p.skill.skill);
  add("payload.interaction.interaction", p.interaction.interaction);
  add("payload.interaction.objectType", p.interaction.objectType);
  add("payload.career.career", p.career.career);
  add("payload.career.track", p.career.track);
  add("payload.relationship.track", p.relationship.track);
  add("payload.relationship.bit", p.relationship.bit);
  add("payload.relationship.sentiment", p.relationship.sentiment);
  add("payload.trait.required", p.trait.required);
  add("payload.trait.forbidden", p.trait.forbidden);
  add("payload.buff.buff", p.buff.buff);
  add("payload.object.object", p.object.object);
  add("payload.object.definition", p.object.definition);
  add("payload.inventory.object", p.inventory.object);
  add("payload.collection.collection", p.collection.collection);
  add("payload.crafting.recipe", p.crafting.recipe);
  add("payload.crafting.station", p.crafting.station);
  add("payload.recipe.recipe", p.recipe.recipe);
  add("payload.harvesting.plant", p.harvesting.plant);
  add("payload.fishing.fish", p.fishing.fish);
  add("payload.location.world", p.location.world);
  add("payload.location.venue", p.location.venue);
  add("payload.travel.world", p.travel.world);
  add("payload.situation.situation", p.situation.situation);
  add("payload.event.event", p.event.event);
  add("payload.social.interaction", p.social.interaction);
  add("payload.university.degree", p.university.degree);
  add("payload.occult.power", p.occult.power);
  add("payload.occult.customStat", p.occult.customStat);
  add("payload.time.testSet", p.time.testSet);
  add("payload.test_based.testSet", p.test_based.testSet);
  add("payload.parent_completion.parent", p.parent_completion.parent);
  p.composite.children.forEach((c, i) => add(`payload.composite.children.${i}`, c.ref));
  add("progress.initLoot", doc.progress.initLoot);
  add("activation.gate", doc.activation.gate);
  add("revealedBy", doc.revealedBy);
  add("failure.testSet", doc.failure.testSet);
  add("failure.notification", doc.failure.notification);
  add("failure.loot", doc.failure.loot);
  doc.completion.forEach((a, i) => add(`completion.${i}.ref`, a.ref));
  add("scope.specificSim", doc.scope.specificSim);
  add("scope.customOccult", doc.scope.customOccult);
  return out;
}

/** Packs the objective actually needs, derived from what it references. */
export function derivedPacks(doc: ObjectiveDoc): { pack: string; introducedBy: string }[] {
  const found = new Map<string, string>();
  const spec = typeSpec(doc.type);
  if (spec.pack) found.set(spec.pack, `${spec.label} type`);
  for (const { path, ref } of collectRefs(doc)) {
    if (ref.pack && ref.pack !== "Base Game" && !found.has(ref.pack))
      found.set(ref.pack, refLabel(ref) || path);
  }
  for (const pack of doc.extraPacks) if (!found.has(pack)) found.set(pack, "Declared manually");
  return [...found.entries()].map(([pack, introducedBy]) => ({ pack, introducedBy }));
}

/** Rough per-objective completeness, used on cards and in health. */
export function completeness(doc: ObjectiveDoc): number {
  const spec = typeSpec(doc.type);
  const checks = [
    doc.displayName.trim().length > 2,
    doc.internalName.trim().length > 0,
    doc.description.trim().length > 0,
    !spec.tracked || collectRefs(doc).some((r) => r.ref.expectedResourceKind === spec.tracked && refIsSet(r.ref)),
    doc.progress.target > 0 || doc.progress.mode === "boolean",
    doc.completion.length > 0,
    doc.parents.length > 0,
    !!doc.icon,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
