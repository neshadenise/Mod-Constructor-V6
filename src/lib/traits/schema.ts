/**
 * Trait document schema.
 *
 * This is the single source of truth for a trait inside a project. It is
 * stored opaquely in `Trait.builderState`, so nothing else in the store has to
 * change, but every builder screen, the validator, the resolver and the
 * exporter read and write THIS shape — never loose component state.
 *
 * Two rules matter more than anything else here:
 *  1. Every link to another resource is a structured {@link ResourceRef},
 *     never a bare numeric id.
 *  2. The canonical project id (`uuid`) is immutable. Renaming, duplicating,
 *     moving or re-hashing a trait must never change it.
 */

/* ---------------------------------------------------------------- refs -- */

export type ResourceKind =
  | "Trait"
  | "Buff"
  | "Loot"
  | "Interaction"
  | "TestSet"
  | "Statistic"
  | "Commodity"
  | "Skill"
  | "Motive"
  | "Broadcaster"
  | "Aspiration"
  | "Career"
  | "Notification"
  | "Snippet"
  | "CasPart"
  | "Asset"
  | "String";

export const RESOURCE_KIND_LABEL: Record<ResourceKind, string> = {
  Trait: "Trait",
  Buff: "Buff",
  Loot: "Loot action",
  Interaction: "Interaction",
  TestSet: "Test set",
  Statistic: "Statistic",
  Commodity: "Commodity",
  Skill: "Skill",
  Motive: "Motive",
  Broadcaster: "Broadcaster",
  Aspiration: "Aspiration",
  Career: "Career",
  Notification: "Notification",
  Snippet: "Snippet",
  CasPart: "CAS part",
  Asset: "Asset",
  String: "String",
};

/** A resource that lives in the current project. Survives renames and re-hashing. */
export interface ProjectResourceRef {
  source: "project";
  /** Canonical, immutable project resource id, e.g. "buff_e15d...". */
  projectResourceId: string;
  resourceKind: ResourceKind;
  /** Human label cached for display only — never used for resolution. */
  label?: string;
  /** "Namespace:buff_FashionJudgment". Recomputed on build. */
  tuningName: string;
  /** Deliberately unresolved until build time. */
  tuningId: "resolved-at-build" | string;
  expectedType: ResourceKind;
}

/** A resource that ships with the game. */
export interface GameResourceRef {
  source: "game";
  resourceKind: ResourceKind;
  label?: string;
  tuningName: string;
  tuningId: string;
  pack: string;
  gameVersionResolved?: string;
  expectedType: ResourceKind;
}

/** A resource owned by another creator's mod. */
export interface ModResourceRef {
  source: "mod";
  resourceKind: ResourceKind;
  label?: string;
  tuningName: string;
  tuningId: string;
  creator: string;
  modName: string;
  minVersion?: string;
  required: boolean;
  fallback?: "skip-effect" | "disable-trait" | "warn-only";
  expectedType: ResourceKind;
}

export type ResourceRef = ProjectResourceRef | GameResourceRef | ModResourceRef;

export const refLabel = (r?: ResourceRef | null) =>
  !r ? "" : r.label || r.tuningName || r.tuningId || "(unnamed)";

/* -------------------------------------------------------------- strings -- */

/**
 * A localized text field. The key is stable: rewording the text keeps the key,
 * so existing translations and references never break.
 */
export interface LocalizedText {
  /** Stable field slug, e.g. "display_name". */
  field: string;
  text: string;
  /** 8-digit hex STBL key, assigned once and preserved. */
  key: string;
}

/* ---------------------------------------------------------------- types -- */

export type TraitTypeId =
  | "personality"
  | "reward"
  | "aspiration_reward"
  | "hidden"
  | "gameplay"
  | "ghost"
  | "death"
  | "occult"
  | "relationship"
  | "lifestyle"
  | "preference"
  | "temporary"
  | "custom";

export interface TraitTypeSpec {
  id: TraitTypeId;
  label: string;
  /** EA `trait_type` enum written into the tuning + SimData. */
  gameTraitType: "PERSONALITY" | "GAMEPLAY" | "HIDDEN" | "ASPIRATION";
  visibleByDefault: boolean;
  /** Appears in Create-A-Sim. */
  cas: boolean;
  /** Uses the CAS trait category field. */
  usesCategory: boolean;
  /** Can be bought with satisfaction points. */
  purchasable: boolean;
  /** Shown in the Simology panel. */
  simology: boolean;
  /** Sections the editor should reveal for this type. */
  sections: TraitSectionId[];
  /** False when the exporter cannot yet produce a loadable resource. */
  exportable: boolean;
  blurb: string;
}

export type TraitSectionId =
  | "identity"
  | "eligibility"
  | "effects"
  | "acquisition"
  | "conflicts"
  | "reactions"
  | "strings"
  | "appearance"
  | "validation"
  | "preview"
  | "advanced";

const BASE_SECTIONS: TraitSectionId[] = [
  "identity",
  "eligibility",
  "effects",
  "acquisition",
  "conflicts",
  "reactions",
  "strings",
  "validation",
  "preview",
  "advanced",
];

const withAppearance = [...BASE_SECTIONS.slice(0, 7), "appearance" as const, ...BASE_SECTIONS.slice(7)];

export const TRAIT_TYPES: TraitTypeSpec[] = [
  {
    id: "personality",
    label: "Personality",
    gameTraitType: "PERSONALITY",
    visibleByDefault: true,
    cas: true,
    usesCategory: true,
    purchasable: false,
    simology: true,
    sections: BASE_SECTIONS,
    exportable: true,
    blurb: "Chosen in CAS, counts against the Sim's personality trait slots.",
  },
  {
    id: "reward",
    label: "Reward",
    gameTraitType: "GAMEPLAY",
    visibleByDefault: true,
    cas: false,
    usesCategory: false,
    purchasable: true,
    simology: true,
    sections: BASE_SECTIONS,
    exportable: true,
    blurb: "Bought from the reward store with satisfaction points.",
  },
  {
    id: "aspiration_reward",
    label: "Aspiration reward",
    gameTraitType: "ASPIRATION",
    visibleByDefault: true,
    cas: false,
    usesCategory: false,
    purchasable: false,
    simology: true,
    sections: BASE_SECTIONS,
    exportable: true,
    blurb: "Awarded on completing an aspiration.",
  },
  {
    id: "hidden",
    label: "Hidden",
    gameTraitType: "HIDDEN",
    visibleByDefault: false,
    cas: false,
    usesCategory: false,
    purchasable: false,
    simology: false,
    sections: BASE_SECTIONS,
    exportable: true,
    blurb: "Invisible bookkeeping trait — drives autonomy and affordances silently.",
  },
  {
    id: "gameplay",
    label: "Gameplay",
    gameTraitType: "GAMEPLAY",
    visibleByDefault: true,
    cas: false,
    usesCategory: false,
    purchasable: false,
    simology: true,
    sections: BASE_SECTIONS,
    exportable: true,
    blurb: "Granted by gameplay systems rather than chosen by the player.",
  },
  {
    id: "relationship",
    label: "Relationship",
    gameTraitType: "GAMEPLAY",
    visibleByDefault: true,
    cas: false,
    usesCategory: false,
    purchasable: false,
    simology: true,
    sections: BASE_SECTIONS,
    exportable: true,
    blurb: "Changes how this Sim relates to others.",
  },
  {
    id: "lifestyle",
    label: "Lifestyle",
    gameTraitType: "GAMEPLAY",
    visibleByDefault: true,
    cas: false,
    usesCategory: false,
    purchasable: false,
    simology: true,
    sections: BASE_SECTIONS,
    exportable: true,
    blurb: "Earned by repeated behaviour (Snowy Escape style).",
  },
  {
    id: "preference",
    label: "Preference",
    gameTraitType: "GAMEPLAY",
    visibleByDefault: true,
    cas: false,
    usesCategory: false,
    purchasable: false,
    simology: true,
    sections: BASE_SECTIONS,
    exportable: true,
    blurb: "Likes and dislikes style preference trait.",
  },
  {
    id: "occult",
    label: "Occult",
    gameTraitType: "GAMEPLAY",
    visibleByDefault: true,
    cas: false,
    usesCategory: false,
    purchasable: false,
    simology: true,
    sections: withAppearance,
    exportable: true,
    blurb: "Marks an occult life state. Can carry appearance effects.",
  },
  {
    id: "ghost",
    label: "Ghost",
    gameTraitType: "HIDDEN",
    visibleByDefault: false,
    cas: false,
    usesCategory: false,
    purchasable: false,
    simology: false,
    sections: withAppearance,
    exportable: true,
    blurb: "Ghost state trait. Usually paired with a death type.",
  },
  {
    id: "death",
    label: "Death",
    gameTraitType: "HIDDEN",
    visibleByDefault: false,
    cas: false,
    usesCategory: false,
    purchasable: false,
    simology: false,
    sections: BASE_SECTIONS,
    exportable: true,
    blurb: "Cause-of-death marker used by ghost and urn systems.",
  },
  {
    id: "temporary",
    label: "Temporary",
    gameTraitType: "HIDDEN",
    visibleByDefault: false,
    cas: false,
    usesCategory: false,
    purchasable: false,
    simology: false,
    sections: BASE_SECTIONS,
    exportable: true,
    blurb: "Short-lived trait removed by loot or a timer.",
  },
  {
    id: "custom",
    label: "Custom / advanced",
    gameTraitType: "GAMEPLAY",
    visibleByDefault: true,
    cas: false,
    usesCategory: false,
    purchasable: false,
    simology: true,
    sections: withAppearance,
    exportable: true,
    blurb: "Everything unlocked. You own the correctness of the result.",
  },
];

export const traitTypeSpec = (id: TraitTypeId): TraitTypeSpec =>
  TRAIT_TYPES.find((t) => t.id === id) ?? TRAIT_TYPES[0]!;

export const TRAIT_CATEGORIES = [
  "Emotional",
  "Hobby",
  "Lifestyle",
  "Social",
  "Toddler",
  "Infant",
  "Custom",
] as const;
export type TraitCategoryId = (typeof TRAIT_CATEGORIES)[number];

export type VisibilityId =
  | "auto"
  | "visible"
  | "hidden"
  | "simology-only"
  | "cas-only"
  | "reward-store-only"
  | "custom-ui";

export const VISIBILITY_OPTIONS: { id: VisibilityId; label: string }[] = [
  { id: "auto", label: "Automatic (from trait type)" },
  { id: "visible", label: "Visible everywhere" },
  { id: "hidden", label: "Hidden" },
  { id: "simology-only", label: "Visible in Simology only" },
  { id: "cas-only", label: "Visible in CAS only" },
  { id: "reward-store-only", label: "Visible in reward store only" },
  { id: "custom-ui", label: "Visible through custom interface" },
];

/* ----------------------------------------------------------- eligibility -- */

export const AGES = [
  { id: "infant", label: "Infant", test: "INFANT" },
  { id: "toddler", label: "Toddler", test: "TODDLER" },
  { id: "child", label: "Child", test: "CHILD" },
  { id: "teen", label: "Teen", test: "TEEN" },
  { id: "youngAdult", label: "Young Adult", test: "YOUNGADULT" },
  { id: "adult", label: "Adult", test: "ADULT" },
  { id: "elder", label: "Elder", test: "ELDER" },
] as const;
export type AgeId = (typeof AGES)[number]["id"];

export const SPECIES = [
  { id: "human", label: "Human Sim", pack: "BaseGame", test: "HUMAN" },
  { id: "dog", label: "Dog", pack: "EP04", test: "DOG" },
  { id: "smallDog", label: "Small Dog", pack: "EP04", test: "SMALLDOG" },
  { id: "cat", label: "Cat", pack: "EP04", test: "CAT" },
  { id: "fox", label: "Fox", pack: "EP11", test: "FOX" },
  { id: "horse", label: "Horse", pack: "EP14", test: "HORSE" },
] as const;
export type SpeciesId = (typeof SPECIES)[number]["id"];

export const OCCULTS = [
  { id: "human", label: "Human only", pack: "BaseGame", test: "HUMAN" },
  { id: "vampire", label: "Vampire", pack: "GP04", test: "VAMPIRE" },
  { id: "spellcaster", label: "Spellcaster", pack: "EP08", test: "WITCH" },
  { id: "mermaid", label: "Mermaid", pack: "EP05", test: "MERMAID" },
  { id: "werewolf", label: "Werewolf", pack: "GP12", test: "WEREWOLF" },
  { id: "alien", label: "Alien", pack: "EP01", test: "ALIEN" },
  { id: "ghost", label: "Ghost", pack: "BaseGame", test: "GHOST" },
  { id: "servo", label: "Servo", pack: "EP09", test: "ROBOT" },
  { id: "plantsim", label: "PlantSim", pack: "BaseGame", test: "PLANT_SIM" },
  { id: "fairy", label: "Custom occult", pack: "Custom", test: "CUSTOM" },
] as const;
export type OccultId = (typeof OCCULTS)[number]["id"];

export type GenderRule =
  | "none"
  | "masculine-frame"
  | "feminine-frame"
  | "male"
  | "female"
  | "custom";

export interface TraitEligibility {
  ages: AgeId[];
  species: SpeciesId[];
  occultMode: "any" | "include" | "exclude";
  occults: OccultId[];
  gender: GenderRule;
  customGenderTest?: string;
  /** Manually declared extra packs on top of the auto-detected ones. */
  extraPacks: string[];
  /** Creator claim; validated against real references. */
  claimsBaseGame: boolean;
}

/* --------------------------------------------------------------- effects -- */

export type EffectKind =
  | "buff"
  | "motive"
  | "skill"
  | "statistic"
  | "autonomy"
  | "interaction-unlock"
  | "interaction-restriction"
  | "loot"
  | "relationship"
  | "emotional"
  | "broadcaster"
  | "appearance";

export const EFFECT_LABEL: Record<EffectKind, string> = {
  buff: "Trait buff",
  motive: "Motive modifier",
  skill: "Skill modifier",
  statistic: "Statistic modifier",
  autonomy: "Autonomy modifier",
  "interaction-unlock": "Interaction unlock",
  "interaction-restriction": "Interaction restriction",
  loot: "Loot action",
  relationship: "Relationship effect",
  emotional: "Emotional effect",
  broadcaster: "Broadcaster / proximity",
  appearance: "Appearance / CAS effect",
};

export interface EffectBase {
  id: string;
  kind: EffectKind;
  enabled: boolean;
  label: string;
  /** Effect-level age narrowing; empty = inherit the trait's ages. */
  ages: AgeId[];
  species: SpeciesId[];
  /** Human readable gate; compiled into a test set stub on export. */
  condition: string;
  notes?: string;
}

export interface BuffEffect extends EffectBase {
  kind: "buff";
  ref: ResourceRef | null;
  /** Persistent hidden trait buff vs. a conditional visible moodlet. */
  mode: "persistent-hidden" | "conditional" | "visible";
  mood: string;
  moodWeight: number;
  /** Hours; 0 = permanent while the trait is held. */
  durationHours: number;
}

export interface MotiveEffect extends EffectBase {
  kind: "motive";
  ref: ResourceRef | null;
  operation: "decay-multiplier" | "gain-multiplier" | "add" | "set-max" | "set-min";
  value: number;
  min?: number;
  max?: number;
}

export interface SkillEffect extends EffectBase {
  kind: "skill";
  ref: ResourceRef | null;
  gainMultiplier: number;
  decayMultiplier: number;
  minLevel?: number;
  maxLevel?: number;
}

export interface StatisticEffect extends EffectBase {
  kind: "statistic";
  ref: ResourceRef | null;
  operation: "add" | "multiply" | "set" | "clamp";
  value: number;
  min?: number;
  max?: number;
}

export interface AutonomyEffect extends EffectBase {
  kind: "autonomy";
  ref: ResourceRef | null;
  mode: "encourage" | "discourage" | "block" | "advertise";
  scoreMultiplier: number;
  scoreBonus: number;
  targetFilter: string;
  locationFilter: string;
  timeFilter: string;
  situationFilter: string;
}

export interface InteractionUnlockEffect extends EffectBase {
  kind: "interaction-unlock";
  ref: ResourceRef | null;
  target: "sim" | "object" | "phone" | "computer" | "mailbox" | "terrain" | "pie-menu";
  requiresInjection: boolean;
  pieMenuCategory: string;
}

export interface InteractionRestrictionEffect extends EffectBase {
  kind: "interaction-restriction";
  ref: ResourceRef | null;
  rule:
    | "satisfy-test"
    | "fail-test"
    | "unlock"
    | "hide"
    | "disable"
    | "change-outcome"
    | "modify-speed"
    | "modify-success"
    | "alternate-loot";
  value: number;
  alternateRef?: ResourceRef | null;
}

export type LootTrigger =
  | "trait-added"
  | "trait-removed"
  | "sim-init"
  | "zone-load"
  | "interaction-complete"
  | "broadcaster"
  | "custom-event";

export interface LootEffect extends EffectBase {
  kind: "loot";
  ref: ResourceRef | null;
  trigger: LootTrigger;
  action:
    | "add-buff"
    | "remove-buff"
    | "add-trait"
    | "remove-trait"
    | "modify-statistic"
    | "modify-relationship"
    | "give-object"
    | "remove-object"
    | "notification"
    | "unlock-interaction"
    | "tested-outcome"
    | "run-loot-list";
  targetRef?: ResourceRef | null;
  amount: number;
}

export interface RelationshipEffect extends EffectBase {
  kind: "relationship";
  track:
    | "friendship-gain"
    | "friendship-loss"
    | "romance-gain"
    | "romance-loss"
    | "decay"
    | "sentiment"
    | "social-compatibility"
    | "relationship-bit";
  multiplier: number;
  ref: ResourceRef | null;
}

export interface EmotionalEffect extends EffectBase {
  kind: "emotional";
  emotion: string;
  intensity: number;
  permanent: boolean;
  autonomyShift: number;
}

export interface BroadcasterEffect extends EffectBase {
  kind: "broadcaster";
  radius: number;
  targetFilter: string;
  buffRef: ResourceRef | null;
  lootRef: ResourceRef | null;
  requiresLineOfSight: boolean;
  relationshipRequirement: string;
  venueFilter: string;
  periodMinutes: number;
}

export interface AppearanceEffect extends EffectBase {
  kind: "appearance";
  feature: "cas-part" | "overlay" | "walkstyle" | "voice" | "vfx" | "animation";
  ref: ResourceRef | null;
  value: string;
}

export type TraitEffect =
  | BuffEffect
  | MotiveEffect
  | SkillEffect
  | StatisticEffect
  | AutonomyEffect
  | InteractionUnlockEffect
  | InteractionRestrictionEffect
  | LootEffect
  | RelationshipEffect
  | EmotionalEffect
  | BroadcasterEffect
  | AppearanceEffect;

/** The resource kind a given effect's primary reference must be. */
export const EFFECT_EXPECTS: Partial<Record<EffectKind, ResourceKind>> = {
  buff: "Buff",
  motive: "Motive",
  skill: "Skill",
  statistic: "Statistic",
  autonomy: "Interaction",
  "interaction-unlock": "Interaction",
  "interaction-restriction": "Interaction",
  loot: "Loot",
  relationship: "Statistic",
  broadcaster: "Broadcaster",
  appearance: "CasPart",
};

/* ----------------------------------------------------------- acquisition -- */

export type AcquisitionMethod =
  | "cas"
  | "reward-store"
  | "aspiration"
  | "career"
  | "interaction"
  | "event"
  | "loot"
  | "cheat"
  | "automatic-test"
  | "custom-system"
  | "hidden-only";

export const ACQUISITION_LABEL: Record<AcquisitionMethod, string> = {
  cas: "Selected in CAS",
  "reward-store": "Purchased from reward store",
  aspiration: "Awarded by aspiration",
  career: "Awarded by career",
  interaction: "Awarded by interaction",
  event: "Awarded by event",
  loot: "Awarded by loot",
  cheat: "Added by cheat",
  "automatic-test": "Added automatically through tests",
  "custom-system": "Added through custom system",
  "hidden-only": "Hidden / internal only",
};

export interface RewardStoreConfig {
  cost: number;
  name: string;
  description: string;
  icon: string;
  displayOrder: number;
  tests: string;
  mutuallyExclusive: ResourceRef[];
  hiddenUntilUnlocked: boolean;
}

export interface CasConfig {
  category: TraitCategoryId;
  displayOrder: number;
  conflicts: ResourceRef[];
  requires: ResourceRef[];
  maxSelectionBehavior: "counts-toward-limit" | "free-slot";
  randomGeneration: boolean;
  townieGeneration: boolean;
  storyProgression: boolean;
}

export interface RemovalConfig {
  retraitingPotion: boolean;
  byLoot: boolean;
  byInteraction: boolean;
  neverRemovable: boolean;
  runLootOnRemove: ResourceRef | null;
  removeConnectedBuffs: boolean;
  statisticPolicy: "preserve" | "reset";
}

export interface TraitAcquisition {
  methods: AcquisitionMethod[];
  rewardStore: RewardStoreConfig;
  cas: CasConfig;
  removal: RemovalConfig;
  /** Refs to the aspiration / career / interaction that grants the trait. */
  grantedBy: ResourceRef[];
}

/* ------------------------------------------------- conflicts & requirements */

export type ConflictBehavior =
  | "cannot-coexist"
  | "remove-old"
  | "prevent-new"
  | "warn-only"
  | "suppress-effects";

export interface TraitConflict {
  id: string;
  ref: ResourceRef | null;
  /** Alternative to a concrete ref: a category or tag match. */
  matchKind: "trait" | "category" | "tag";
  matchValue: string;
  behavior: ConflictBehavior;
}

export type RequirementKind =
  | "must-have-trait"
  | "must-not-have-trait"
  | "any-of-group"
  | "all-of-group"
  | "skill-level"
  | "age"
  | "occult"
  | "career"
  | "aspiration"
  | "relationship"
  | "statistic-threshold"
  | "custom-test-set";

export interface TraitRequirement {
  id: string;
  kind: RequirementKind;
  refs: ResourceRef[];
  value: string;
  threshold: number;
  /** When set, this requirement is emitted as a reusable test set. */
  reusableTestSetName?: string;
}

/* -------------------------------------------------------------- reactions -- */

export interface TraitReaction {
  id: string;
  label: string;
  trigger:
    | "trait"
    | "buff"
    | "emotion"
    | "interaction"
    | "object"
    | "career"
    | "occult"
    | "event"
    | "nearby-sim"
    | "environment";
  triggerRef: ResourceRef | null;
  triggerValue: string;
  actor: "self" | "target" | "both" | "nearby";
  target: string;
  conditions: string;
  cooldownHours: number;
  frequency: "always" | "often" | "sometimes" | "rare";
  priority: number;
  outcomes: {
    animation: boolean;
    buffRef: ResourceRef | null;
    lootRef: ResourceRef | null;
    notification: boolean;
    relationshipDelta: number;
    pushInteractionRef: ResourceRef | null;
    thoughtBalloon: boolean;
    vfx: boolean;
  };
}

/* ------------------------------------------------------------- compatibility */

export interface CompatibilityRow {
  id: string;
  otherRef: ResourceRef | null;
  otherLabel: string;
  result: "strong-negative" | "negative" | "neutral" | "positive" | "strong-positive";
}

/* ---------------------------------------------------------------- the doc -- */

export const TRAIT_DOC_VERSION = 3 as const;

export interface TraitIds {
  /** Immutable canonical project id. Never regenerated. */
  uuid: string;
  /** Creator namespace, e.g. "NeshaMods". */
  namespace: string;
  /** Machine name without the namespace, e.g. "trait_FashionCritic". */
  internalName: string;
  /** Manual overrides (Advanced Mode only). Empty = derived. */
  manualTuningInstance?: string;
  manualSimDataInstance?: string;
  /** Set once the trait has been exported successfully. */
  lastBuiltAt?: number;
  lastBuiltInstance?: string;
  /** Marked by the creator after testing the package in-game. */
  testedInGame?: boolean;
}

export interface TraitStrings {
  displayName: LocalizedText;
  description: LocalizedText;
  acquisitionNotification: LocalizedText;
  removalNotification: LocalizedText;
  rewardStoreDescription: LocalizedText;
  conflictWarning: LocalizedText;
  unlockMessage: LocalizedText;
  /** Free-form extras (effect reasons, buff reasons, tooltips). */
  extra: LocalizedText[];
}

export interface TraitDoc {
  version: typeof TRAIT_DOC_VERSION;
  ids: TraitIds;

  displayName: string;
  description: string;
  icon: string;
  traitType: TraitTypeId;
  category: TraitCategoryId;
  visibility: VisibilityId;

  eligibility: TraitEligibility;
  effects: TraitEffect[];
  acquisition: TraitAcquisition;
  conflicts: TraitConflict[];
  requirements: TraitRequirement[];
  reactions: TraitReaction[];
  compatibility: CompatibilityRow[];
  strings: TraitStrings;

  createdAt: number;
  updatedAt: number;
}

/* ------------------------------------------------------------- factories -- */

export const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

const text = (field: string, value = ""): LocalizedText => ({ field, text: value, key: "" });

export function blankStrings(): TraitStrings {
  return {
    displayName: text("display_name"),
    description: text("description"),
    acquisitionNotification: text("acquisition_notification"),
    removalNotification: text("removal_notification"),
    rewardStoreDescription: text("reward_store_description"),
    conflictWarning: text("conflict_warning"),
    unlockMessage: text("unlock_message"),
    extra: [],
  };
}

export function blankTraitDoc(init?: Partial<TraitDoc>): TraitDoc {
  const now = Date.now();
  const doc: TraitDoc = {
    version: TRAIT_DOC_VERSION,
    ids: {
      uuid: `trait_${uuid()}`,
      namespace: "MyMods",
      internalName: "trait_NewTrait",
    },
    displayName: "New Trait",
    description: "",
    icon: "",
    traitType: "personality",
    category: "Emotional",
    visibility: "auto",
    eligibility: {
      ages: ["teen", "youngAdult", "adult", "elder"],
      species: ["human"],
      occultMode: "any",
      occults: [],
      gender: "none",
      extraPacks: [],
      claimsBaseGame: true,
    },
    effects: [],
    acquisition: {
      methods: ["cas"],
      rewardStore: {
        cost: 500,
        name: "",
        description: "",
        icon: "",
        displayOrder: 0,
        tests: "",
        mutuallyExclusive: [],
        hiddenUntilUnlocked: false,
      },
      cas: {
        category: "Emotional",
        displayOrder: 0,
        conflicts: [],
        requires: [],
        maxSelectionBehavior: "counts-toward-limit",
        randomGeneration: true,
        townieGeneration: true,
        storyProgression: false,
      },
      removal: {
        retraitingPotion: true,
        byLoot: false,
        byInteraction: false,
        neverRemovable: false,
        runLootOnRemove: null,
        removeConnectedBuffs: true,
        statisticPolicy: "preserve",
      },
      grantedBy: [],
    },
    conflicts: [],
    requirements: [],
    reactions: [],
    compatibility: [],
    strings: blankStrings(),
    createdAt: now,
    updatedAt: now,
    ...init,
  };
  doc.strings.displayName.text = doc.displayName;
  doc.strings.description.text = doc.description;
  return doc;
}

/* ---------------------------------------------------------- effect makers -- */

const effectBase = (kind: EffectKind, label: string): EffectBase => ({
  id: uid("eff"),
  kind,
  enabled: true,
  label,
  ages: [],
  species: [],
  condition: "",
});

export function makeEffect(kind: EffectKind): TraitEffect {
  const base = effectBase(kind, EFFECT_LABEL[kind]);
  switch (kind) {
    case "buff":
      return { ...base, kind, ref: null, mode: "persistent-hidden", mood: "Fine", moodWeight: 1, durationHours: 0 };
    case "motive":
      return { ...base, kind, ref: null, operation: "decay-multiplier", value: 1 };
    case "skill":
      return { ...base, kind, ref: null, gainMultiplier: 1.2, decayMultiplier: 1 };
    case "statistic":
      return { ...base, kind, ref: null, operation: "add", value: 0 };
    case "autonomy":
      return {
        ...base, kind, ref: null, mode: "encourage", scoreMultiplier: 1.5, scoreBonus: 0,
        targetFilter: "", locationFilter: "", timeFilter: "", situationFilter: "",
      };
    case "interaction-unlock":
      return { ...base, kind, ref: null, target: "sim", requiresInjection: true, pieMenuCategory: "" };
    case "interaction-restriction":
      return { ...base, kind, ref: null, rule: "unlock", value: 1 };
    case "loot":
      return { ...base, kind, ref: null, trigger: "trait-added", action: "add-buff", amount: 1 };
    case "relationship":
      return { ...base, kind, ref: null, track: "friendship-gain", multiplier: 1.2 };
    case "emotional":
      return { ...base, kind, emotion: "Happy", intensity: 1, permanent: false, autonomyShift: 0 };
    case "broadcaster":
      return {
        ...base, kind, radius: 5, targetFilter: "Nearby Sims", buffRef: null, lootRef: null,
        requiresLineOfSight: false, relationshipRequirement: "", venueFilter: "", periodMinutes: 30,
      };
    case "appearance":
      return { ...base, kind, feature: "walkstyle", ref: null, value: "" };
  }
}

export function makeReaction(): TraitReaction {
  return {
    id: uid("react"),
    label: "New reaction",
    trigger: "trait",
    triggerRef: null,
    triggerValue: "",
    actor: "self",
    target: "Any Sim",
    conditions: "",
    cooldownHours: 4,
    frequency: "sometimes",
    priority: 1,
    outcomes: {
      animation: false,
      buffRef: null,
      lootRef: null,
      notification: false,
      relationshipDelta: 0,
      pushInteractionRef: null,
      thoughtBalloon: true,
      vfx: false,
    },
  };
}

export const makeConflict = (): TraitConflict => ({
  id: uid("conf"),
  ref: null,
  matchKind: "trait",
  matchValue: "",
  behavior: "cannot-coexist",
});

export const makeRequirement = (): TraitRequirement => ({
  id: uid("req"),
  kind: "must-have-trait",
  refs: [],
  value: "",
  threshold: 0,
});

export const makeCompatibility = (): CompatibilityRow => ({
  id: uid("compat"),
  otherRef: null,
  otherLabel: "",
  result: "positive",
});

/* --------------------------------------------------------------- helpers -- */

/** Sanitize a display name into a legal internal name. Never auto-applied. */
export function sanitizeInternalName(input: string, prefix = "trait_"): string {
  let s = (input || "").trim().replace(/[^A-Za-z0-9_ ]+/g, "").replace(/\s+/g, "_");
  s = s.replace(/_+/g, "_").replace(/^_|_$/g, "");
  if (!s) s = "Untitled";
  if (/^\d/.test(s)) s = `T${s}`;
  return s.startsWith(prefix) ? s : `${prefix}${s}`;
}

export const isVisible = (doc: TraitDoc): boolean => {
  if (doc.visibility === "auto") return traitTypeSpec(doc.traitType).visibleByDefault;
  return doc.visibility !== "hidden";
};

export const effectiveAges = (doc: TraitDoc, effect: TraitEffect): AgeId[] =>
  effect.ages.length ? effect.ages : doc.eligibility.ages;

/** Every reference the document holds, with a path for error reporting. */
export function collectRefs(doc: TraitDoc): { path: string; ref: ResourceRef }[] {
  const out: { path: string; ref: ResourceRef }[] = [];
  const push = (path: string, ref?: ResourceRef | null) => {
    if (ref) out.push({ path, ref });
  };
  doc.effects.forEach((e, i) => {
    const p = `effects[${i}]`;
    if ("ref" in e) push(p, e.ref as ResourceRef | null);
    if (e.kind === "broadcaster") {
      push(`${p}.buff`, e.buffRef);
      push(`${p}.loot`, e.lootRef);
    }
    if (e.kind === "loot") push(`${p}.target`, e.targetRef);
    if (e.kind === "interaction-restriction") push(`${p}.alternate`, e.alternateRef);
  });
  doc.acquisition.rewardStore.mutuallyExclusive.forEach((r, i) =>
    push(`acquisition.rewardStore.mutuallyExclusive[${i}]`, r),
  );
  doc.acquisition.cas.conflicts.forEach((r, i) => push(`acquisition.cas.conflicts[${i}]`, r));
  doc.acquisition.cas.requires.forEach((r, i) => push(`acquisition.cas.requires[${i}]`, r));
  doc.acquisition.grantedBy.forEach((r, i) => push(`acquisition.grantedBy[${i}]`, r));
  push("acquisition.removal.runLootOnRemove", doc.acquisition.removal.runLootOnRemove);
  doc.conflicts.forEach((c, i) => push(`conflicts[${i}]`, c.ref));
  doc.requirements.forEach((r, i) => r.refs.forEach((ref, j) => push(`requirements[${i}].refs[${j}]`, ref)));
  doc.reactions.forEach((r, i) => {
    push(`reactions[${i}].trigger`, r.triggerRef);
    push(`reactions[${i}].buff`, r.outcomes.buffRef);
    push(`reactions[${i}].loot`, r.outcomes.lootRef);
    push(`reactions[${i}].push`, r.outcomes.pushInteractionRef);
  });
  doc.compatibility.forEach((c, i) => push(`compatibility[${i}]`, c.otherRef));
  return out;
}
