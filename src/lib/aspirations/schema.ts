/**
 * Aspiration document schema.
 *
 * One aspiration is not one tuning resource — it is a graph of aspiration
 * tuning, milestones, objectives, reward trait, loot, notifications, tests,
 * icons and localisation. This module is the single source of truth for the
 * editor-side representation of that graph.
 *
 * Rules that must never be broken:
 *  1. `ids.uuid` is permanent. Renaming, duplicating, re-hashing or exporting
 *     must never change it.
 *  2. Every link to another resource is a structured {@link ResourceRef}
 *     (shared with the Trait Builder) — never a bare numeric tuning id.
 *  3. Localisation keys are assigned once and preserved through rewording.
 *
 * Milestone/objective *editing* arrives in Part 2; the data model lives here
 * already so counts, validation and export stay honest from day one.
 */

import type { LocalizedText, ResourceRef } from "@/lib/traits/schema";
import {
  objectiveTypeSpec,
  type CompletionRule,
  type FailureCondition,
  type GoalCondition,
  type GoalParamValue,
  type GoalTimer,
  type MilestoneReward,
  type ObjectiveTypeId,
  type ProgressStyle,
  type RepeatRules,
  type UnlockCondition,
} from "./goals";

export type { LocalizedText, ResourceRef };


/* ---------------------------------------------------------------- types -- */

export type AspirationTypeId =
  | "primary"
  | "hidden"
  | "tutorial"
  | "gameplay"
  | "occult"
  | "career"
  | "university"
  | "scenario"
  | "challenge"
  | "custom";

export interface AspirationTypeSpec {
  id: AspirationTypeId;
  label: string;
  /** Shown in the aspiration picker in CAS / Simology. */
  visibleByDefault: boolean;
  /** Belongs to a CAS category group. */
  usesCategory: boolean;
  /** Expected to award a reward trait on completion. */
  expectsRewardTrait: boolean;
  /** Can be exported by the current build. */
  exportable: boolean;
  /** Value written to the tuning `aspiration_type` field. */
  gameAspirationType: string;
  hint: string;
}

export const ASPIRATION_TYPES: AspirationTypeSpec[] = [
  {
    id: "primary",
    label: "Primary Aspiration",
    visibleByDefault: true,
    usesCategory: true,
    expectsRewardTrait: true,
    exportable: true,
    gameAspirationType: "FULL_ASPIRATION",
    hint: "A full lifetime aspiration selectable in CAS and Simology.",
  },
  {
    id: "hidden",
    label: "Hidden Aspiration",
    visibleByDefault: false,
    usesCategory: false,
    expectsRewardTrait: false,
    exportable: true,
    gameAspirationType: "HIDDEN",
    hint: "Tracked silently in the background. Never appears in the aspiration picker.",
  },
  {
    id: "tutorial",
    label: "Tutorial",
    visibleByDefault: false,
    usesCategory: false,
    expectsRewardTrait: false,
    exportable: true,
    gameAspirationType: "TUTORIAL",
    hint: "Short guided sequence used to teach a mechanic.",
  },
  {
    id: "gameplay",
    label: "Gameplay",
    visibleByDefault: false,
    usesCategory: false,
    expectsRewardTrait: false,
    exportable: true,
    gameAspirationType: "GAMEPLAY",
    hint: "Driven by gameplay systems rather than chosen by the player.",
  },
  {
    id: "occult",
    label: "Occult",
    visibleByDefault: true,
    usesCategory: true,
    expectsRewardTrait: true,
    exportable: true,
    gameAspirationType: "FULL_ASPIRATION",
    hint: "A full aspiration gated behind an occult life state.",
  },
  {
    id: "career",
    label: "Career",
    visibleByDefault: false,
    usesCategory: true,
    expectsRewardTrait: false,
    exportable: true,
    gameAspirationType: "CAREER",
    hint: "Attached to a career track and progressed through work events.",
  },
  {
    id: "university",
    label: "University",
    visibleByDefault: false,
    usesCategory: true,
    expectsRewardTrait: false,
    exportable: true,
    gameAspirationType: "GAMEPLAY",
    hint: "Degree-style track tied to university gameplay.",
  },
  {
    id: "scenario",
    label: "Scenario",
    visibleByDefault: false,
    usesCategory: false,
    expectsRewardTrait: false,
    exportable: true,
    gameAspirationType: "GAMEPLAY",
    hint: "Goal set for a scenario. Not selectable by the player.",
  },
  {
    id: "challenge",
    label: "Challenge",
    visibleByDefault: true,
    usesCategory: true,
    expectsRewardTrait: true,
    exportable: true,
    gameAspirationType: "FULL_ASPIRATION",
    hint: "Long-form self-imposed challenge with hard objectives.",
  },
  {
    id: "custom",
    label: "Custom",
    visibleByDefault: true,
    usesCategory: true,
    expectsRewardTrait: false,
    exportable: true,
    gameAspirationType: "FULL_ASPIRATION",
    hint: "Anything that does not fit the presets. You own every field.",
  },
];

export const aspirationTypeSpec = (id: AspirationTypeId): AspirationTypeSpec =>
  ASPIRATION_TYPES.find((t) => t.id === id) ?? ASPIRATION_TYPES[0]!;

/* ----------------------------------------------------------- categories -- */

export const ASPIRATION_CATEGORIES = [
  "Knowledge",
  "Creativity",
  "Athletic",
  "Nature",
  "Food",
  "Fortune",
  "Family",
  "Popularity",
  "Romance",
  "Deviance",
  "Career",
  "Business",
  "Magic",
  "Occult",
  "University",
  "Lifestyle",
  "Custom",
] as const;
export type AspirationCategoryId = (typeof ASPIRATION_CATEGORIES)[number];

export const DIFFICULTIES = ["very-easy", "easy", "normal", "hard", "expert", "legendary"] as const;
export type DifficultyId = (typeof DIFFICULTIES)[number];
export const DIFFICULTY_LABEL: Record<DifficultyId, string> = {
  "very-easy": "Very Easy",
  easy: "Easy",
  normal: "Normal",
  hard: "Hard",
  expert: "Expert",
  legendary: "Legendary",
};

/* --------------------------------------------------------- availability -- */

export const AGES = ["infant", "toddler", "child", "teen", "youngAdult", "adult", "elder"] as const;
export type AgeId = (typeof AGES)[number];
export const AGE_LABEL: Record<AgeId, string> = {
  infant: "Infant",
  toddler: "Toddler",
  child: "Child",
  teen: "Teen",
  youngAdult: "Young Adult",
  adult: "Adult",
  elder: "Elder",
};

export const SPECIES = ["human", "dog", "cat", "horse"] as const;
export type SpeciesId = (typeof SPECIES)[number];
export const SPECIES_LABEL: Record<SpeciesId, string> = {
  human: "Human",
  dog: "Dog",
  cat: "Cat",
  horse: "Horse",
};

export const OCCULTS = [
  "spellcaster",
  "werewolf",
  "vampire",
  "alien",
  "ghost",
  "mermaid",
  "servo",
  "plantsim",
] as const;
export type OccultId = (typeof OCCULTS)[number];
export const OCCULT_LABEL: Record<OccultId, string> = {
  spellcaster: "Spellcaster",
  werewolf: "Werewolf",
  vampire: "Vampire",
  alien: "Alien",
  ghost: "Ghost",
  mermaid: "Mermaid",
  servo: "Servo",
  plantsim: "PlantSim",
};

export type OccultMode = "any" | "allow-only" | "exclude" | "require-one" | "require-all";
export type GenderRule =
  | "none"
  | "masculine-frame"
  | "feminine-frame"
  | "male"
  | "female"
  | "custom";

export interface AspirationAvailability {
  ages: AgeId[];
  species: SpeciesId[];
  occultMode: OccultMode;
  occults: OccultId[];
  gender: GenderRule;
  genderCustomTest: string;
  /** Packs the creator declared manually, on top of detected ones. */
  extraPacks: string[];
  /** Creator's claim; validation overrules it when DLC content is referenced. */
  claimsBaseGame: boolean;
}

/* --------------------------------------------- milestones and objectives -- */

/**
 * One objective. Everything the game needs to test, count, gate, time and
 * reward the goal lives on this object — the editor never asks the creator to
 * type a tuning id, only to pick resources and numbers.
 */
export interface AspirationObjective {
  id: string;
  /** Permanent id. Survives renames, reorders, duplication of the parent. */
  uuid: string;
  label: string;
  /** Unique machine name, e.g. "NeshaMods_Objective_Level3Painting". */
  internalName: string;
  description: string;
  type: ObjectiveTypeId;
  /** Scalar fields declared by the objective type spec. */
  params: Record<string, GoalParamValue>;
  /** Resource fields declared by the objective type spec, keyed by field id. */
  refs: Record<string, ResourceRef | null>;
  /** Legacy single reference — kept so Part 1 documents keep resolving. */
  ref: ResourceRef | null;
  /** Target value shown in the progress readout. */
  count: number;
  /** Authoring-side preview of current progress. Never exported. */
  current: number;
  progress: ProgressStyle;
  conditions: GoalCondition[];
  repeat: RepeatRules;
  timer: GoalTimer;
  hidden: boolean;
  optional: boolean;
  bonus: boolean;
  /** Objective uuids that must complete first. */
  dependsOn: string[];
  /** Children of a composite goal. */
  children: AspirationObjective[];
  notes: string;
}

export interface MilestoneStrings {
  tooltip: string;
  journal: string;
  notification: string;
}

export interface AspirationMilestone {
  id: string;
  uuid: string;
  /** Roman-ish tier label, purely presentational. */
  tier: string;
  title: string;
  internalName: string;
  description: string;
  icon: string;
  objectives: AspirationObjective[];
  /** Legacy single loot reference — superseded by `rewards`. */
  rewardRef: ResourceRef | null;
  rewards: MilestoneReward[];
  /** Satisfaction points granted on completion. */
  points: number;
  hidden: boolean;
  /** Maintained by drag and drop; manual override allowed. */
  order: number;
  unlockMode: "auto" | "conditions";
  unlocks: UnlockCondition[];
  completion: CompletionRule;
  failures: FailureCondition[];
  strings: MilestoneStrings;
  /** Editor-only tree state. */
  collapsed: boolean;
}


/* -------------------------------------------------------------- strings -- */

export interface AspirationStrings {
  displayName: LocalizedText;
  description: LocalizedText;
  tooltip: LocalizedText;
  completionNotification: LocalizedText;
  rewardNotification: LocalizedText;
  journalText: LocalizedText;
  extra: LocalizedText[];
}

/* ------------------------------------------------------------ the doc -- */

export const ASPIRATION_DOC_VERSION = 1 as const;

export interface AspirationIds {
  /** Immutable canonical project id. Never regenerated. */
  uuid: string;
  namespace: string;
  /** Machine name without the namespace, e.g. "aspiration_MasterFashionCritic". */
  internalName: string;
  manualTuningInstance?: string;
  manualSimDataInstance?: string;
  lastBuiltAt?: number;
  lastBuiltInstance?: string;
  testedInGame?: boolean;
}

export interface AspirationDoc {
  version: typeof ASPIRATION_DOC_VERSION;
  ids: AspirationIds;

  displayName: string;
  description: string;
  icon: string;
  aspirationType: AspirationTypeId;
  category: AspirationCategoryId;
  difficulty: DifficultyId;
  /** Editor-only. Never exported. */
  summary: string;
  /** Editor-only markdown notes. Never exported. */
  notes: string;
  /** Forces hidden/visible regardless of the type default. */
  visibility: "auto" | "visible" | "hidden";

  availability: AspirationAvailability;
  milestones: AspirationMilestone[];
  rewardTrait: ResourceRef | null;
  /** Extra resources the creator explicitly attached (loot, buffs, careers…). */
  connections: ResourceRef[];
  strings: AspirationStrings;

  createdAt: number;
  updatedAt: number;
}

/* ------------------------------------------------------------ factories -- */

export const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

const text = (field: string, value = ""): LocalizedText => ({ field, text: value, key: "" });

export function blankStrings(): AspirationStrings {
  return {
    displayName: text("display_name"),
    description: text("description"),
    tooltip: text("tooltip"),
    completionNotification: text("completion_notification"),
    rewardNotification: text("reward_notification"),
    journalText: text("journal_text"),
    extra: [],
  };
}

export const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export const makeObjective = (label = "New objective"): AspirationObjective => ({
  id: uid("obj"),
  label,
  ref: null,
  count: 1,
  notes: "",
});

export const makeMilestone = (index = 0, title = "New milestone"): AspirationMilestone => ({
  id: uid("ms"),
  tier: ROMAN[index] ?? String(index + 1),
  title,
  description: "",
  objectives: [],
  rewardRef: null,
  points: 500,
});

export function blankAspirationDoc(init?: Partial<AspirationDoc>): AspirationDoc {
  const now = Date.now();
  const doc: AspirationDoc = {
    version: ASPIRATION_DOC_VERSION,
    ids: {
      uuid: `aspiration_${uuid()}`,
      namespace: "MyMods",
      internalName: "aspiration_NewAspiration",
    },
    displayName: "New Aspiration",
    description: "",
    icon: "",
    aspirationType: "primary",
    category: "Knowledge",
    difficulty: "normal",
    summary: "",
    notes: "",
    visibility: "auto",
    availability: {
      ages: ["teen", "youngAdult", "adult", "elder"],
      species: ["human"],
      occultMode: "any",
      occults: [],
      gender: "none",
      genderCustomTest: "",
      extraPacks: [],
      claimsBaseGame: true,
    },
    milestones: [],
    rewardTrait: null,
    connections: [],
    strings: blankStrings(),
    createdAt: now,
    updatedAt: now,
    ...init,
  };
  doc.strings.displayName.text = doc.strings.displayName.text || doc.displayName;
  doc.strings.description.text = doc.strings.description.text || doc.description;
  return doc;
}

/* --------------------------------------------------------------- helpers -- */

/** Sanitize a display name into a legal internal name. Never auto-applied. */
export function sanitizeInternalName(input: string, prefix = "aspiration_"): string {
  let s = (input || "")
    .trim()
    .replace(/[^A-Za-z0-9_ ]+/g, "")
    .replace(/\s+/g, "_");
  s = s.replace(/_+/g, "_").replace(/^_|_$/g, "");
  if (!s) s = "Untitled";
  if (/^\d/.test(s)) s = `A${s}`;
  return s.startsWith(prefix) ? s : `${prefix}${s}`;
}

export const isVisible = (doc: AspirationDoc): boolean => {
  if (doc.visibility === "auto") return aspirationTypeSpec(doc.aspirationType).visibleByDefault;
  return doc.visibility !== "hidden";
};

export const objectiveCount = (doc: AspirationDoc): number =>
  doc.milestones.reduce((n, m) => n + m.objectives.length, 0);

/** Rough completion percentage of the *authoring* work, not gameplay. */
export function completeness(doc: AspirationDoc): number {
  const checks = [
    Boolean(doc.displayName.trim()),
    Boolean(doc.description.trim()),
    Boolean(doc.icon),
    Boolean(doc.ids.internalName.trim()),
    Boolean(doc.ids.namespace.trim()),
    doc.milestones.length > 0,
    objectiveCount(doc) > 0,
    Boolean(doc.rewardTrait) || !aspirationTypeSpec(doc.aspirationType).expectsRewardTrait,
    doc.availability.ages.length > 0,
    Boolean(doc.strings.completionNotification.text.trim()),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

/** Every reference the document holds, with a path for error reporting. */
export function collectRefs(doc: AspirationDoc): { path: string; ref: ResourceRef }[] {
  const out: { path: string; ref: ResourceRef }[] = [];
  const push = (path: string, ref?: ResourceRef | null) => {
    if (ref) out.push({ path, ref });
  };
  push("rewardTrait", doc.rewardTrait);
  doc.connections.forEach((r, i) => push(`connections[${i}]`, r));
  doc.milestones.forEach((m, i) => {
    push(`milestones[${i}].reward`, m.rewardRef);
    m.objectives.forEach((o, j) => push(`milestones[${i}].objectives[${j}]`, o.ref));
  });
  return out;
}
