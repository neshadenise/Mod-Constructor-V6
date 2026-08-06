/**
 * Aspiration gameplay systems (Part 3).
 *
 * Everything that happens *because* an aspiration progresses: rewards, loot
 * actions, buffs, notifications, broadcasters, event listeners, wants and
 * fears, story progression, journal pages, completion and failure behaviour.
 *
 * The rule this module exists to enforce: gameplay is built from reusable
 * project resources joined through the resolver, never from XML pasted into
 * the aspiration tuning. Each system therefore declares its fields the same
 * way objective types do — as data — so the editor, the validator and the
 * exporter all read one description instead of three.
 */

import type { GoalField, GoalParamValue } from "./goals";
import type { ResourceRef } from "@/lib/traits/schema";

const num = (id: string, label: string, extra: Partial<GoalField> = {}): GoalField => ({
  id,
  label,
  kind: "number",
  min: 0,
  ...extra,
});
const txt = (id: string, label: string, extra: Partial<GoalField> = {}): GoalField => ({
  id,
  label,
  kind: "text",
  ...extra,
});
const tog = (id: string, label: string, extra: Partial<GoalField> = {}): GoalField => ({
  id,
  label,
  kind: "toggle",
  ...extra,
});
const sel = (
  id: string,
  label: string,
  values: string[],
  extra: Partial<GoalField> = {},
): GoalField => ({
  id,
  label,
  kind: "select",
  options: values.map((v) => ({ value: v, label: v })),
  ...extra,
});
const ref = (
  id: string,
  label: string,
  expects: string,
  extra: Partial<GoalField> = {},
): GoalField => ({ id, label, kind: "ref", expects, ...extra });

/* ---------------------------------------------------------- reward kinds -- */

export const REWARD_KINDS = [
  "trait",
  "satisfaction",
  "buff",
  "loot",
  "money",
  "object",
  "cas-unlock",
  "interaction-unlock",
  "recipe-unlock",
  "career-unlock",
  "skill",
  "statistic",
  "relationship",
  "broadcaster",
  "notification",
  "custom",
] as const;
export type RewardKind = (typeof REWARD_KINDS)[number];

export interface RewardKindSpec {
  id: RewardKind;
  label: string;
  group: "Sim" | "Economy" | "Unlocks" | "Presentation";
  hint: string;
  /** Loot class the exporter writes for this reward. */
  lootClass: string;
  fields: GoalField[];
}

export const REWARD_KIND_SPECS: RewardKindSpec[] = [
  {
    id: "trait",
    label: "Reward trait",
    group: "Sim",
    hint: "Grants a trait. Project traits stay live-linked — editing the trait updates every aspiration that awards it.",
    lootClass: "LootActions_AddTrait",
    fields: [
      ref("trait", "Trait", "Trait"),
      sel("visibility", "Visibility", ["visible", "hidden"]),
      tog("notify", "Show the reward popup"),
    ],
  },
  {
    id: "satisfaction",
    label: "Satisfaction points",
    group: "Economy",
    hint: "Adds satisfaction points to the Sim's reward store balance.",
    lootClass: "LootActions_AddSatisfaction",
    fields: [
      num("points", "Points awarded", { step: 50 }),
      tog("notify", "Display notification"),
      txt("animation", "Animation", { hint: "Optional flourish played with the award." }),
      txt("scaling", "Scaling formula", {
        hint: "Optional, e.g. points * household_size. Left empty the flat value is used.",
      }),
    ],
  },
  {
    id: "buff",
    label: "Buff",
    group: "Sim",
    hint: "Applies a buff. Duration, mood and stacking are written into the loot, not the buff itself.",
    lootClass: "LootActions_AddBuff",
    fields: [
      ref("buff", "Buff", "Buff"),
      num("duration", "Duration (sim hours)", { hint: "0 keeps the buff permanent." }),
      sel("mood", "Mood", [
        "inherit",
        "happy",
        "confident",
        "inspired",
        "focused",
        "playful",
        "flirty",
        "energized",
        "sad",
        "angry",
        "embarrassed",
        "tense",
        "uncomfortable",
        "bored",
        "dazed",
      ]),
      sel("visibility", "Visibility", ["visible", "hidden"]),
      sel("stacking", "Stacking", ["prevent-duplicate", "stack", "refresh", "replace"]),
      num("priority", "Priority", { max: 100 }),
      tog("afterNotification", "Apply after the notification"),
      ref("removes", "Removes buff", "Buff", { hint: "Optional. Cleared before this one applies." }),
    ],
  },
  {
    id: "loot",
    label: "Loot action",
    group: "Sim",
    hint: "Runs an existing loot action. Chain several by adding more reward cards.",
    lootClass: "LootActions_Chain",
    fields: [ref("loot", "Loot action", "Loot"), txt("notes", "Chain note")],
  },
  {
    id: "money",
    label: "Money",
    group: "Economy",
    hint: "Adds simoleons to household or business funds.",
    lootClass: "LootActions_Money",
    fields: [
      num("household", "Household funds", { step: 100 }),
      num("business", "Business funds", { step: 100 }),
      num("percent", "Percentage bonus", { max: 500 }),
      tog("taxable", "Taxable"),
      tog("notify", "Notification"),
    ],
  },
  {
    id: "object",
    label: "Object",
    group: "Economy",
    hint: "Gives an object to the Sim.",
    lootClass: "LootActions_GiveObject",
    fields: [
      ref("object", "Object", "Object"),
      num("quantity", "Quantity", { min: 1 }),
      sel("quality", "Quality", ["normal", "good", "excellent", "masterwork"]),
      sel("destination", "Destination", [
        "household-inventory",
        "sim-inventory",
        "mailbox",
        "direct-placement",
        "wrapped-gift",
      ]),
    ],
  },
  {
    id: "cas-unlock",
    label: "CAS unlock",
    group: "Unlocks",
    hint: "Unlocks Create-A-Sim content for the household.",
    lootClass: "LootActions_UnlockCasPart",
    fields: [
      ref("part", "CAS part", "CASPart"),
      sel("casKind", "Content type", [
        "cas-part",
        "accessory",
        "hair",
        "clothing",
        "makeup",
        "tattoo",
        "walkstyle",
        "trait",
      ]),
      tog("permanent", "Unlock permanently"),
    ],
  },
  {
    id: "interaction-unlock",
    label: "Interaction unlock",
    group: "Unlocks",
    hint: "Unlocks a social or object interaction.",
    lootClass: "LootActions_UnlockInteraction",
    fields: [
      ref("interaction", "Interaction", "Interaction"),
      txt("target", "Target", { hint: "Sim, object or terrain the interaction attaches to." }),
      sel("unlockMode", "Unlock mode", ["permanent", "temporary", "conditional"]),
      txt("pack", "Required pack", { hint: "Validated against the aspiration's pack list." }),
    ],
  },
  {
    id: "recipe-unlock",
    label: "Recipe unlock",
    group: "Unlocks",
    hint: "Unlocks a recipe for cooking, mixing, crafting or fabrication.",
    lootClass: "LootActions_UnlockRecipe",
    fields: [
      ref("recipe", "Recipe", "Recipe"),
      sel("recipeKind", "Recipe type", [
        "food",
        "drink",
        "potion",
        "crafting",
        "fabrication",
        "custom",
      ]),
    ],
  },
  {
    id: "career-unlock",
    label: "Career unlock",
    group: "Unlocks",
    hint: "Unlocks or advances a career.",
    lootClass: "LootActions_Career",
    fields: [
      ref("career", "Career", "Career"),
      txt("branch", "Branch"),
      num("startingLevel", "Starting level", { max: 20 }),
      num("performance", "Bonus performance"),
      tog("promotionCredit", "Grant promotion credit"),
    ],
  },
  {
    id: "skill",
    label: "Skill",
    group: "Sim",
    hint: "Awards skill levels or raw experience.",
    lootClass: "LootActions_AddSkill",
    fields: [
      ref("skill", "Skill", "Skill"),
      num("levels", "Levels awarded", { max: 20 }),
      num("experience", "Experience", { step: 50 }),
      sel("bonusType", "Bonus type", ["permanent", "temporary"]),
    ],
  },
  {
    id: "statistic",
    label: "Statistic",
    group: "Sim",
    hint: "Changes a statistic or commodity value.",
    lootClass: "LootActions_Statistic",
    fields: [
      ref("statistic", "Statistic", "Statistic"),
      sel("operation", "Operation", ["set", "add", "subtract", "multiply", "clamp"]),
      num("value", "Value", { min: -1000000 }),
      num("min", "Minimum", { min: -1000000 }),
      num("max", "Maximum", { min: -1000000 }),
    ],
  },
  {
    id: "relationship",
    label: "Relationship",
    group: "Sim",
    hint: "Changes a relationship track, sentiment or bit.",
    lootClass: "LootActions_Relationship",
    fields: [
      sel("target", "Target", [
        "all-household",
        "target-sim",
        "romantic-partner",
        "family",
        "friends",
        "nearby-sims",
      ]),
      sel("relType", "Relationship type", ["friendship", "romance", "sentiment", "bit", "trust"]),
      num("amount", "Amount", { min: -100, max: 100 }),
      txt("sentiment", "Sentiment"),
      ref("bit", "Relationship bit", "RelationshipBit"),
    ],
  },
  {
    id: "broadcaster",
    label: "Broadcaster",
    group: "Presentation",
    hint: "Runs a broadcaster aura around the Sim.",
    lootClass: "LootActions_Broadcaster",
    fields: [
      ref("broadcaster", "Broadcaster", "Broadcaster"),
      num("radius", "Radius (m)", { max: 60 }),
      sel("targets", "Targets", ["nearby-sims", "household", "lot", "friends", "family"]),
      num("duration", "Duration (sim hours)"),
    ],
  },
  {
    id: "notification",
    label: "Notification",
    group: "Presentation",
    hint: "Shows one of this aspiration's notifications.",
    lootClass: "LootActions_Notification",
    fields: [
      txt("notificationId", "Notification", { hint: "Pick one from the Notifications workspace." }),
    ],
  },
  {
    id: "custom",
    label: "Custom loot",
    group: "Presentation",
    hint: "Escape hatch for a hand-written loot reference.",
    lootClass: "LootActions_Custom",
    fields: [txt("tuning", "Tuning name"), txt("notes", "Notes")],
  },
];

export const rewardKindSpec = (id: RewardKind): RewardKindSpec =>
  REWARD_KIND_SPECS.find((s) => s.id === id) ?? REWARD_KIND_SPECS[REWARD_KIND_SPECS.length - 1]!;

export const REWARD_GROUPS = [...new Set(REWARD_KIND_SPECS.map((s) => s.group))];

/* ------------------------------------------------------- reward wiring -- */

export type RewardScope = "aspiration" | "milestone" | "objective";

export const REWARD_TRIGGERS = [
  "completed",
  "started",
  "unlocked",
  "failed",
  "cancelled",
  "reset",
  "manual",
] as const;
export type RewardTrigger = (typeof REWARD_TRIGGERS)[number];

export const REWARD_CONDITION_KINDS = [
  "age",
  "occult",
  "species",
  "career",
  "relationship",
  "weather",
  "season",
  "holiday",
  "household",
  "skill",
  "lot-type",
  "world",
  "buff",
  "trait",
  "statistic",
  "time",
  "situation",
  "custom-test-set",
] as const;
export type RewardConditionKind = (typeof REWARD_CONDITION_KINDS)[number];

export interface RewardCondition {
  id: string;
  kind: RewardConditionKind;
  value: string;
  negate: boolean;
}

export interface RewardCard {
  id: string;
  /** Permanent id. Survives renames and reordering. */
  uuid: string;
  name: string;
  kind: RewardKind;
  scope: RewardScope;
  /** Milestone or objective uuid this reward hangs off. Empty for aspiration. */
  ownerUuid: string;
  trigger: RewardTrigger;
  params: Record<string, GoalParamValue>;
  refs: Record<string, ResourceRef | null>;
  conditions: RewardCondition[];
  /** Position in the execution sequence. */
  order: number;
  execution: "sequential" | "parallel";
  enabled: boolean;
  notes: string;
}

/* ------------------------------------------------------------ loot --- */

export const LOOT_TRIGGERS = [
  "aspiration-started",
  "milestone-started",
  "milestone-completed",
  "objective-completed",
  "aspiration-completed",
  "aspiration-cancelled",
  "aspiration-reset",
  "travel",
  "zone-load",
  "game-load",
  "custom-event",
] as const;
export type LootTrigger = (typeof LOOT_TRIGGERS)[number];

export const LOOT_OP_TYPES = [
  "add-buff",
  "remove-buff",
  "add-trait",
  "remove-trait",
  "modify-relationship",
  "modify-statistic",
  "unlock-recipe",
  "unlock-interaction",
  "give-object",
  "remove-object",
  "teleport-sim",
  "run-animation",
  "play-effect",
  "money",
  "notification",
  "broadcaster",
  "situation",
  "spawn-sim",
  "push-interaction",
] as const;
export type LootOpType = (typeof LOOT_OP_TYPES)[number];

/** Which resource kind each loot operation points at, when it points at one. */
export const LOOT_OP_EXPECTS: Partial<Record<LootOpType, string>> = {
  "add-buff": "Buff",
  "remove-buff": "Buff",
  "add-trait": "Trait",
  "remove-trait": "Trait",
  "modify-statistic": "Statistic",
  "unlock-recipe": "Recipe",
  "unlock-interaction": "Interaction",
  "give-object": "Object",
  "remove-object": "Object",
  broadcaster: "Broadcaster",
  situation: "Situation",
  "push-interaction": "Interaction",
  "modify-relationship": "RelationshipBit",
};

export interface LootOp {
  id: string;
  type: LootOpType;
  ref: ResourceRef | null;
  value: string;
  amount: number;
}

export interface LootActionDef {
  id: string;
  uuid: string;
  name: string;
  internalName: string;
  trigger: LootTrigger;
  /** Milestone/objective uuid for the scoped triggers. */
  ownerUuid: string;
  customEvent: string;
  ops: LootOp[];
  conditions: RewardCondition[];
  cooldownHours: number;
  notes: string;
  enabled: boolean;
}

/* ------------------------------------------------------------ buffs --- */

export const BUFF_CATEGORIES = [
  "mood",
  "gameplay",
  "narrative",
  "reward",
  "milestone",
] as const;
export type BuffCategory = (typeof BUFF_CATEGORIES)[number];

export const BUFF_APPLY_MODES = [
  "apply",
  "remove",
  "replace",
  "refresh",
  "stack",
  "prevent-duplicate",
] as const;
export type BuffApplyMode = (typeof BUFF_APPLY_MODES)[number];

export interface BuffLink {
  id: string;
  uuid: string;
  name: string;
  ref: ResourceRef | null;
  category: BuffCategory;
  applyMode: BuffApplyMode;
  /** 0 = permanent. */
  durationHours: number;
  mood: string;
  visible: boolean;
  priority: number;
  removeAfterTime: boolean;
  removeOnTravel: boolean;
  removeOnDeath: boolean;
  removeOnMilestone: boolean;
  /** Milestone uuid for "remove on milestone". */
  removeOnMilestoneUuid: string;
  notes: string;
}

/* ---------------------------------------------------- notifications --- */

export const NOTIFICATION_STYLES = [
  "toast",
  "phone-popup",
  "journal-update",
  "achievement",
  "reward-popup",
  "text-message",
  "letter",
  "career-notification",
  "milestone-banner",
] as const;
export type NotificationStyle = (typeof NOTIFICATION_STYLES)[number];

export const NOTIFICATION_TRIGGERS = [
  "objective",
  "milestone",
  "aspiration",
  "manual",
  "loot",
  "event",
] as const;
export type NotificationTrigger = (typeof NOTIFICATION_TRIGGERS)[number];

export interface NotificationDef {
  id: string;
  uuid: string;
  name: string;
  style: NotificationStyle;
  title: string;
  body: string;
  icon: string;
  sound: string;
  animation: string;
  priority: number;
  durationSeconds: number;
  trigger: NotificationTrigger;
  ownerUuid: string;
  /** STBL keys are assigned at export; this records the creator's intent. */
  localize: boolean;
}

/* ----------------------------------------------------- broadcasters --- */

export interface BroadcasterDef {
  id: string;
  uuid: string;
  name: string;
  radius: number;
  targets: string;
  relationshipFilter: string;
  traitRef: ResourceRef | null;
  buffRef: ResourceRef | null;
  frequencyHours: number;
  durationHours: number;
  priority: number;
  conditions: RewardCondition[];
  notes: string;
}

export const BROADCASTER_TARGETS = [
  "nearby-sims",
  "household",
  "lot",
  "friends",
  "family",
  "romantic-partner",
  "everyone",
];

/* -------------------------------------------------- event listeners --- */

export const GAME_EVENTS = [
  "interaction-completed",
  "skill-increased",
  "promotion",
  "demotion",
  "travel",
  "marriage",
  "breakup",
  "birth",
  "death",
  "aging",
  "object-crafted",
  "object-purchased",
  "object-placed",
  "recipe-learned",
  "collection-completed",
  "holiday-completed",
  "festival-attended",
  "relationship-changed",
  "emotion-changed",
  "buff-added",
  "buff-removed",
  "trait-added",
  "trait-removed",
  "occult-changed",
  "career-joined",
  "career-quit",
  "career-branch",
  "situation-started",
  "situation-ended",
  "zone-loaded",
  "household-loaded",
  "custom-event",
] as const;
export type GameEvent = (typeof GAME_EVENTS)[number];

export const LISTENER_ACTION_KINDS = [
  "run-loot",
  "grant-reward",
  "show-notification",
  "advance-objective",
  "complete-milestone",
  "fail-milestone",
  "start-broadcaster",
  "custom",
] as const;
export type ListenerActionKind = (typeof LISTENER_ACTION_KINDS)[number];

export interface ListenerAction {
  id: string;
  kind: ListenerActionKind;
  /** uuid of the loot / reward / notification / objective it points at. */
  targetUuid: string;
  value: string;
}

export interface EventListenerDef {
  id: string;
  uuid: string;
  name: string;
  event: GameEvent;
  customEvent: string;
  conditions: RewardCondition[];
  actions: ListenerAction[];
  cooldownHours: number;
  priority: number;
  enabled: boolean;
  notes: string;
}

/* ----------------------------------------------------- wants & fears --- */

export const WANT_MODES = [
  "generate-want",
  "suppress-want",
  "prioritize-want",
  "disable-want",
  "unlock-want",
  "auto-complete-want",
  "reduce-fear",
  "generate-fear",
  "remove-fear",
  "custom-fear",
] as const;
export type WantMode = (typeof WANT_MODES)[number];

export const WANT_MODE_LABEL: Record<WantMode, string> = {
  "generate-want": "Generate want",
  "suppress-want": "Suppress want",
  "prioritize-want": "Prioritise want",
  "disable-want": "Disable want",
  "unlock-want": "Unlock want",
  "auto-complete-want": "Complete want automatically",
  "reduce-fear": "Reduce fear",
  "generate-fear": "Generate fear",
  "remove-fear": "Remove fear",
  "custom-fear": "Custom fear behaviour",
};

export interface WantRule {
  id: string;
  uuid: string;
  mode: WantMode;
  ref: ResourceRef | null;
  /** Objective/milestone uuid this rule reacts to. Empty = whole aspiration. */
  ownerUuid: string;
  weight: number;
  notes: string;
}

/* -------------------------------------------------- story progression --- */

export interface StoryProgression {
  audience: "player-only" | "npc-only" | "everyone";
  npcProgress: boolean;
  autonomousProgress: boolean;
  householdStories: boolean;
  storyArcs: boolean;
  milestoneUnlocks: boolean;
  townieGeneration: boolean;
  randomChance: number;
  populationWeight: number;
  notes: string;
}

/* ------------------------------------------------------------ journal --- */

export interface JournalConfig {
  enabled: boolean;
  showCurrentMilestone: boolean;
  showCompletedObjectives: boolean;
  showLockedObjectives: boolean;
  showRewardPreview: boolean;
  showProgressPercent: boolean;
  flavorText: string;
  /** Editor only. Never exported. */
  devNotes: string;
}

/* --------------------------------------------------------- completion --- */

export const COMPLETION_STAGES = [
  "rewards",
  "loot",
  "buffs",
  "notifications",
  "broadcasters",
  "journal",
  "story",
  "save",
] as const;
export type CompletionStage = (typeof COMPLETION_STAGES)[number];

export const COMPLETION_STAGE_LABEL: Record<CompletionStage, string> = {
  rewards: "Rewards",
  loot: "Loot",
  buffs: "Buffs",
  notifications: "Notifications",
  broadcasters: "Broadcasters",
  journal: "Journal update",
  story: "Story progression update",
  save: "Save completion",
};

export const REPEAT_RULES = [
  "never",
  "daily",
  "weekly",
  "per-generation",
  "manual-reset",
  "story-reset",
  "custom",
] as const;
export type AspirationRepeatRule = (typeof REPEAT_RULES)[number];

export interface CompletionBehavior {
  timing: "immediate" | "delayed" | "animation-wait" | "notification-wait";
  delaySeconds: number;
  queueRewards: boolean;
  order: CompletionStage[];
  repeat: AspirationRepeatRule;
  customResetRule: string;
  saveCompletion: boolean;
}

export const FAILURE_MODES = [
  "none",
  "fail-aspiration",
  "restart-milestone",
  "restart-aspiration",
] as const;
export type FailureMode = (typeof FAILURE_MODES)[number];

export interface FailureBehavior {
  mode: FailureMode;
  keepRewards: boolean;
  lootRef: ResourceRef | null;
  buffRef: ResourceRef | null;
  notificationUuid: string;
  customBehavior: string;
}

/* ------------------------------------------------------------ the bag --- */

export interface AspirationGameplay {
  rewards: RewardCard[];
  loot: LootActionDef[];
  buffs: BuffLink[];
  notifications: NotificationDef[];
  broadcasters: BroadcasterDef[];
  listeners: EventListenerDef[];
  wants: WantRule[];
  story: StoryProgression;
  journal: JournalConfig;
  completion: CompletionBehavior;
  failure: FailureBehavior;
}

/* --------------------------------------------------------- factories --- */

const gid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const newUuid = (prefix: string) =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}_${crypto.randomUUID()}`
    : `${prefix}_${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;

export function defaultRewardParams(kind: RewardKind): Record<string, GoalParamValue> {
  const out: Record<string, GoalParamValue> = {};
  for (const f of rewardKindSpec(kind).fields) {
    if (f.kind === "number") out[f.id] = f.id === "quantity" ? 1 : 0;
    else if (f.kind === "toggle") out[f.id] = f.id === "notify";
    else if (f.kind === "select") out[f.id] = f.options?.[0]?.value ?? "";
    else if (f.kind === "text") out[f.id] = "";
  }
  return out;
}

export const makeRewardCard = (
  kind: RewardKind = "trait",
  scope: RewardScope = "aspiration",
  ownerUuid = "",
  order = 0,
): RewardCard => ({
  id: gid("rwd"),
  uuid: newUuid("reward"),
  name: rewardKindSpec(kind).label,
  kind,
  scope,
  ownerUuid,
  trigger: "completed",
  params: defaultRewardParams(kind),
  refs: {},
  conditions: [],
  order,
  execution: "sequential",
  enabled: true,
  notes: "",
});

export const makeRewardCondition = (): RewardCondition => ({
  id: gid("cond"),
  kind: "age",
  value: "",
  negate: false,
});

export const makeLootOp = (type: LootOpType = "add-buff"): LootOp => ({
  id: gid("op"),
  type,
  ref: null,
  value: "",
  amount: 0,
});

export const makeLootAction = (trigger: LootTrigger = "aspiration-completed"): LootActionDef => ({
  id: gid("loot"),
  uuid: newUuid("loot"),
  name: "New loot action",
  internalName: "",
  trigger,
  ownerUuid: "",
  customEvent: "",
  ops: [makeLootOp()],
  conditions: [],
  cooldownHours: 0,
  notes: "",
  enabled: true,
});

export const makeBuffLink = (): BuffLink => ({
  id: gid("buff"),
  uuid: newUuid("bufflink"),
  name: "New buff link",
  ref: null,
  category: "reward",
  applyMode: "apply",
  durationHours: 0,
  mood: "inherit",
  visible: true,
  priority: 1,
  removeAfterTime: false,
  removeOnTravel: false,
  removeOnDeath: true,
  removeOnMilestone: false,
  removeOnMilestoneUuid: "",
  notes: "",
});

export const makeNotification = (style: NotificationStyle = "toast"): NotificationDef => ({
  id: gid("note"),
  uuid: newUuid("notification"),
  name: "New notification",
  style,
  title: "",
  body: "",
  icon: "",
  sound: "",
  animation: "",
  priority: 1,
  durationSeconds: 8,
  trigger: "milestone",
  ownerUuid: "",
  localize: true,
});

export const makeBroadcaster = (): BroadcasterDef => ({
  id: gid("bc"),
  uuid: newUuid("broadcaster"),
  name: "New broadcaster",
  radius: 5,
  targets: "nearby-sims",
  relationshipFilter: "",
  traitRef: null,
  buffRef: null,
  frequencyHours: 1,
  durationHours: 2,
  priority: 1,
  conditions: [],
  notes: "",
});

export const makeListenerAction = (): ListenerAction => ({
  id: gid("act"),
  kind: "run-loot",
  targetUuid: "",
  value: "",
});

export const makeEventListener = (event: GameEvent = "skill-increased"): EventListenerDef => ({
  id: gid("ev"),
  uuid: newUuid("listener"),
  name: "New listener",
  event,
  customEvent: "",
  conditions: [],
  actions: [makeListenerAction()],
  cooldownHours: 0,
  priority: 1,
  enabled: true,
  notes: "",
});

export const makeWantRule = (mode: WantMode = "generate-want"): WantRule => ({
  id: gid("want"),
  uuid: newUuid("want"),
  mode,
  ref: null,
  ownerUuid: "",
  weight: 1,
  notes: "",
});

export const blankStory = (): StoryProgression => ({
  audience: "player-only",
  npcProgress: false,
  autonomousProgress: false,
  householdStories: false,
  storyArcs: false,
  milestoneUnlocks: true,
  townieGeneration: false,
  randomChance: 0,
  populationWeight: 1,
  notes: "",
});

export const blankJournal = (): JournalConfig => ({
  enabled: true,
  showCurrentMilestone: true,
  showCompletedObjectives: true,
  showLockedObjectives: false,
  showRewardPreview: true,
  showProgressPercent: true,
  flavorText: "",
  devNotes: "",
});

export const blankCompletion = (): CompletionBehavior => ({
  timing: "immediate",
  delaySeconds: 0,
  queueRewards: true,
  order: [...COMPLETION_STAGES],
  repeat: "never",
  customResetRule: "",
  saveCompletion: true,
});

export const blankFailure = (): FailureBehavior => ({
  mode: "none",
  keepRewards: true,
  lootRef: null,
  buffRef: null,
  notificationUuid: "",
  customBehavior: "",
});

export const blankGameplay = (): AspirationGameplay => ({
  rewards: [],
  loot: [],
  buffs: [],
  notifications: [],
  broadcasters: [],
  listeners: [],
  wants: [],
  story: blankStory(),
  journal: blankJournal(),
  completion: blankCompletion(),
  failure: blankFailure(),
});

/* -------------------------------------------------------- normalisers --- */

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const bool = (v: unknown, fallback = false) => (typeof v === "boolean" ? v : fallback);
const int = (v: unknown, fallback = 0) => (typeof v === "number" && isFinite(v) ? v : fallback);
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);

const normCondition = (raw: Partial<RewardCondition>): RewardCondition => ({
  id: str(raw.id) || gid("cond"),
  kind: (REWARD_CONDITION_KINDS as readonly string[]).includes(String(raw.kind))
    ? (raw.kind as RewardConditionKind)
    : "age",
  value: str(raw.value),
  negate: bool(raw.negate),
});

export function normalizeReward(raw: Partial<RewardCard>, index = 0): RewardCard {
  const kind = (REWARD_KINDS as readonly string[]).includes(String(raw.kind))
    ? (raw.kind as RewardKind)
    : "trait";
  return {
    id: str(raw.id) || gid("rwd"),
    uuid: str(raw.uuid) || newUuid("reward"),
    name: str(raw.name) || rewardKindSpec(kind).label,
    kind,
    scope: (["aspiration", "milestone", "objective"] as string[]).includes(String(raw.scope))
      ? (raw.scope as RewardScope)
      : "aspiration",
    ownerUuid: str(raw.ownerUuid),
    trigger: (REWARD_TRIGGERS as readonly string[]).includes(String(raw.trigger))
      ? (raw.trigger as RewardTrigger)
      : "completed",
    params: { ...defaultRewardParams(kind), ...(raw.params ?? {}) },
    refs: raw.refs ?? {},
    conditions: arr<Partial<RewardCondition>>(raw.conditions).map(normCondition),
    order: int(raw.order, index),
    execution: raw.execution === "parallel" ? "parallel" : "sequential",
    enabled: bool(raw.enabled, true),
    notes: str(raw.notes),
  };
}

export function normalizeGameplay(raw: unknown): AspirationGameplay {
  const g = (raw ?? {}) as Partial<AspirationGameplay>;
  const base = blankGameplay();
  return {
    rewards: arr<Partial<RewardCard>>(g.rewards).map((r, i) => normalizeReward(r, i)),
    loot: arr<Partial<LootActionDef>>(g.loot).map((l) => ({
      ...makeLootAction(),
      ...l,
      ops: arr<Partial<LootOp>>(l.ops).map((o) => ({ ...makeLootOp(), ...o })),
      conditions: arr<Partial<RewardCondition>>(l.conditions).map(normCondition),
    })),
    buffs: arr<Partial<BuffLink>>(g.buffs).map((b) => ({ ...makeBuffLink(), ...b })),
    notifications: arr<Partial<NotificationDef>>(g.notifications).map((n) => ({
      ...makeNotification(),
      ...n,
    })),
    broadcasters: arr<Partial<BroadcasterDef>>(g.broadcasters).map((b) => ({
      ...makeBroadcaster(),
      ...b,
      conditions: arr<Partial<RewardCondition>>(b.conditions).map(normCondition),
    })),
    listeners: arr<Partial<EventListenerDef>>(g.listeners).map((l) => ({
      ...makeEventListener(),
      ...l,
      conditions: arr<Partial<RewardCondition>>(l.conditions).map(normCondition),
      actions: arr<Partial<ListenerAction>>(l.actions).map((a) => ({
        ...makeListenerAction(),
        ...a,
      })),
    })),
    wants: arr<Partial<WantRule>>(g.wants).map((w) => ({ ...makeWantRule(), ...w })),
    story: { ...base.story, ...(g.story ?? {}) },
    journal: { ...base.journal, ...(g.journal ?? {}) },
    completion: {
      ...base.completion,
      ...(g.completion ?? {}),
      order: arr<CompletionStage>(g.completion?.order).length
        ? [
            ...new Set([
              ...arr<CompletionStage>(g.completion?.order).filter((s) =>
                (COMPLETION_STAGES as readonly string[]).includes(s),
              ),
              ...COMPLETION_STAGES,
            ]),
          ]
        : [...COMPLETION_STAGES],
    },
    failure: { ...base.failure, ...(g.failure ?? {}) },
  };
}

/* ------------------------------------------------------------ helpers --- */

export const rewardsFor = (
  gameplay: AspirationGameplay,
  scope: RewardScope,
  ownerUuid = "",
): RewardCard[] =>
  gameplay.rewards
    .filter((r) => r.scope === scope && (scope === "aspiration" || r.ownerUuid === ownerUuid))
    .sort((a, b) => a.order - b.order);

/** Every resource reference the gameplay layer holds, for the resolver. */
export function collectGameplayRefs(
  g: AspirationGameplay,
): { path: string; ref: ResourceRef }[] {
  const out: { path: string; ref: ResourceRef }[] = [];
  const push = (path: string, ref?: ResourceRef | null) => {
    if (ref) out.push({ path, ref });
  };
  g.rewards.forEach((r, i) => {
    for (const [field, ref] of Object.entries(r.refs ?? {}))
      push(`rewards[${i}].${field}`, ref ?? null);
  });
  g.loot.forEach((l, i) => l.ops.forEach((o, j) => push(`loot[${i}].ops[${j}]`, o.ref)));
  g.buffs.forEach((b, i) => push(`buffs[${i}]`, b.ref));
  g.broadcasters.forEach((b, i) => {
    push(`broadcasters[${i}].buff`, b.buffRef);
    push(`broadcasters[${i}].traitFilter`, b.traitRef);
  });
  push("failure.loot", g.failure.lootRef);
  push("failure.buff", g.failure.buffRef);
  g.wants.forEach((w, i) => push(`wants[${i}]`, w.ref));
  return out;
}

/** Reward chains that point back at themselves through notifications/loot. */
export function rewardChainCycles(g: AspirationGameplay): string[] {
  const cycles: string[] = [];
  for (const l of g.loot) {
    for (const op of l.ops) {
      if (op.type !== "notification") continue;
      const note = g.notifications.find((n) => n.uuid === op.value);
      if (!note) continue;
      const back = g.rewards.find(
        (r) => r.kind === "notification" && r.params["notificationId"] === note.uuid,
      );
      const feeds = g.listeners.some(
        (li) =>
          li.actions.some((a) => a.kind === "run-loot" && a.targetUuid === l.uuid) &&
          li.event === "buff-added",
      );
      if (back && feeds) cycles.push(`${l.name} → ${note.name} → ${back.name}`);
    }
  }
  return cycles;
}
