/**
 * Pack Mechanics data contracts.
 *
 * Four module kinds — Club (Get Together), Royalty/Nobility, Legacy/Dynasty,
 * and generic Pack-Specific Mechanics — all persisted through the central
 * store (src/lib/store.tsx) as `PackModule` records on the active project.
 *
 * Everything here is *structured project data*: it is designed to be lowered
 * later into Sims 4 tuning XML, SimData, STBL, Python and .package resources.
 * Nothing in this file is presentational. References between resources are
 * always stored as stable UUIDs (`ResourceRef.refId`) or explicit tuning IDs,
 * never as display names.
 */

import type { ID, Timestamp } from "@/lib/types";

/* ------------------------------------------------------------------ *
 * Shared primitives
 * ------------------------------------------------------------------ */

/** Where a referenced resource comes from. Display names are never the key. */
export type ResourceRefSource =
  | "ea-tuning"        // shipped EA tuning
  | "project"          // another resource in this project (refId = record UUID)
  | "new"              // placeholder for a resource to be generated at build
  | "tuning-id"        // manual decimal/hex tuning ID
  | "instance-id"      // manual instance ID
  | "imported-xml"     // user-imported XML resource
  | "imported-package" // resource inside an imported .package
  | "none";

export type ResourceRefKind =
  | "trait" | "buff" | "interaction" | "statistic" | "commodity" | "career"
  | "aspiration" | "notification" | "dialogue" | "venue" | "lot-trait"
  | "relationship-bit" | "sim-filter" | "situation" | "situation-job"
  | "loot" | "test-set" | "object" | "cas-part" | "outfit" | "icon" | "any";

export interface ResourceRef {
  id: ID;
  kind: ResourceRefKind;
  source: ResourceRefSource;
  /** Stable UUID of a project resource (source = "project"/"new"). */
  refId?: ID;
  /** Manual tuning / instance identifier (source = "tuning-id"/"instance-id"). */
  tuningId?: string;
  /** Cached label for display only — never used for linking. */
  label?: string;
  notes?: string;
}

export function emptyRef(kind: ResourceRefKind = "any"): ResourceRef {
  return { id: rid(), kind, source: "none" };
}

/** Localized, STBL-backed player-facing string. */
export interface LocalizedString {
  id: ID;
  /** STBL string key, e.g. "MC6_CLUB_NAME". */
  key: string;
  /** FNV hash, auto-generated from the key. */
  hash: string;
  /** Default English source text. */
  text: string;
  /** Additional language code -> translation. */
  translations: Record<string, string>;
}

export function emptyLoc(key = "", text = ""): LocalizedString {
  return { id: rid(), key, hash: key ? fnv32(key) : "", text, translations: {} };
}

/* ---------------------------- Conditions -------------------------- */

export type ConditionSubject =
  | "age" | "gender" | "trait" | "career" | "career-level" | "skill" | "skill-level"
  | "aspiration" | "relationship-status" | "family-relationship" | "occult"
  | "degree" | "household-funds" | "fame" | "reputation" | "world" | "neighborhood"
  | "lot-type" | "species" | "pregnancy" | "custom-trait" | "custom-career"
  | "custom-statistic" | "tuning-id" | "pack-installed" | "time-of-day"
  | "day-of-week" | "chance" | "household" | "object" | "zone" | "relationship-bit";

export type ConditionOperator =
  | "is" | "is-not" | "gte" | "lte" | "gt" | "lt" | "between" | "contains" | "has" | "has-not";

export interface ConditionLeaf {
  id: ID;
  type: "leaf";
  subject: ConditionSubject;
  operator: ConditionOperator;
  value: string;
  /** Second bound for the "between" operator. */
  value2?: string;
  /** Optional linked resource (trait/career/statistic references). */
  ref?: ResourceRef;
  /** 0-100 weighting for weighted / chance tests. */
  weight?: number;
  negate?: boolean;
}

export type ConditionLogic = "and" | "or" | "not" | "min-match";

export interface ConditionGroup {
  id: ID;
  type: "group";
  logic: ConditionLogic;
  /** Used when logic = "min-match". */
  minMatch?: number;
  children: ConditionNode[];
}

export type ConditionNode = ConditionLeaf | ConditionGroup;

export function emptyConditionGroup(logic: ConditionLogic = "and"): ConditionGroup {
  return { id: rid(), type: "group", logic, minMatch: 1, children: [] };
}

export function emptyConditionLeaf(): ConditionLeaf {
  return { id: rid(), type: "leaf", subject: "trait", operator: "has", value: "", ref: emptyRef("trait") };
}

/* ------------------------- Notifications -------------------------- */

export type NotifyStyle =
  | "none" | "standard" | "urgent" | "sim" | "phone"
  | "dialog" | "dialog-multi" | "dialog-yes-no" | "dialog-picker";

export interface NotifySpec {
  id: ID;
  style: NotifyStyle;
  title: LocalizedString;
  body: LocalizedString;
  acceptText: LocalizedString;
  cancelText: LocalizedString;
  iconRef: ResourceRef;
  simPortrait: boolean;
  objectThumbnail: boolean;
  soundRef: ResourceRef;
}

export function emptyNotify(prefix = "MC6"): NotifySpec {
  return {
    id: rid(),
    style: "standard",
    title: emptyLoc(`${prefix}_TITLE`),
    body: emptyLoc(`${prefix}_BODY`),
    acceptText: emptyLoc(`${prefix}_ACCEPT`, "OK"),
    cancelText: emptyLoc(`${prefix}_CANCEL`, "Cancel"),
    iconRef: emptyRef("icon"),
    simPortrait: true,
    objectThumbnail: false,
    soundRef: emptyRef("any"),
  };
}

/* ---------------------------- Loot -------------------------------- */

export type LootKind =
  | "buff" | "trait" | "statistic" | "commodity" | "relationship" | "money"
  | "skill" | "career" | "notification" | "situation" | "custom";

export interface LootAction {
  id: ID;
  kind: LootKind;
  ref: ResourceRef;
  amount: number;
  target: "actor" | "target" | "household" | "club" | "all-members" | "family";
  notes: string;
}

export function emptyLoot(): LootAction {
  return { id: rid(), kind: "buff", ref: emptyRef("buff"), amount: 0, target: "actor", notes: "" };
}

/* ------------------------- Build support -------------------------- */

/** How far a module has been lowered towards a real .package. */
export interface BuildSupport {
  uiConfig: boolean;
  projectData: boolean;
  xmlGenerator: boolean;
  simDataGenerator: boolean;
  stblGenerator: boolean;
  pythonGenerator: boolean;
  packageWriter: boolean;
}

/** Truthful defaults — only UI + structured data exist today. */
export const CURRENT_BUILD_SUPPORT: BuildSupport = {
  uiConfig: true,
  projectData: true,
  xmlGenerator: false,
  simDataGenerator: false,
  stblGenerator: false,
  pythonGenerator: false,
  packageWriter: false,
};

/* ------------------------------------------------------------------ *
 * 1. Club module
 * ------------------------------------------------------------------ */

export interface ClubActivity {
  id: ID;
  stance: "encouraged" | "banned";
  name: string;
  interactionRef: ResourceRef;
  category: string;
  targetType: string;
  locationRestriction: string;
  timeRestriction: string;
  participantRestriction: string;
  clubPoints: number;
  autonomyWeight: number;
  cooldownMinutes: number;
  required: ConditionGroup;
  excluded: ConditionGroup;
  tooltip: LocalizedString;
  notification: NotifySpec;
}

export interface ClubPerk {
  id: ID;
  name: string;
  description: LocalizedString;
  iconRef: ResourceRef;
  pointCost: number;
  requiredRankId?: ID;
  requiredPerkId?: ID;
  exclusivePerkIds: ID[];
  grantRef: ResourceRef;         // trait or buff granted
  commodityModifier: number;
  skillGainModifier: number;
  careerModifier: number;
  relationshipModifier: number;
  autonomyModifier: number;
  unlockedInteractions: ResourceRef[];
  clubSizeIncrease: number;
  pointGainMultiplier: number;
  customEffectRef: ResourceRef;
}

export interface ClubRank {
  id: ID;
  name: string;
  description: LocalizedString;
  iconRef: ResourceRef;
  requiredPoints: number;
  permissions: string[];
  perkIds: ID[];
  allowedRoleIds: ID[];
  relationshipRequirement: number;
  autoPromote: boolean;
  autoPromoteConditions: ConditionGroup;
}

export interface ClubRole {
  id: ID;
  name: string;
  description: LocalizedString;
  permissions: string[];
  behaviorModifiers: string[];
  maxHolders: number;
}

export type UniformSlot = "everyday" | "formal" | "athletic" | "swimwear" | "career";

export interface ClubUniform {
  id: ID;
  slot: UniformSlot;
  frame: "any" | "masculine" | "feminine";
  ageGates: string[];
  outfitTags: string[];
  casPartRefs: ResourceRef[];
  outfitTuningRef: ResourceRef;
}

export interface ClubGathering {
  id: ID;
  name: string;
  venueRef: ResourceRef;
  schedule: string;
  durationHours: number;
  minMembers: number;
  goals: string[];
  rewards: LootAction[];
  notification: NotifySpec;
}

export interface ClubModuleData {
  internalName: string;
  displayName: LocalizedString;
  description: LocalizedString;
  requiredPack: string;
  iconRef: ResourceRef;
  color: string;
  minMembers: number;
  maxMembers: number;
  startingPoints: number;
  appearsInClubPicker: boolean;
  npcAutonomousJoin: boolean;
  playerEditable: boolean;

  membership: ConditionGroup;
  activities: ClubActivity[];
  perks: ClubPerk[];
  ranks: ClubRank[];
  roles: ClubRole[];
  uniforms: ClubUniform[];
  gatherings: ClubGathering[];

  hangoutRefs: ResourceRef[];
  autonomyRules: { id: ID; name: string; weight: number; conditions: ConditionGroup }[];
  relationshipModifiers: { id: ID; bitRef: ResourceRef; amount: number; scope: string }[];
  leadershipRules: { id: ID; name: string; conditions: ConditionGroup; notes: string }[];
  invitationRules: { id: ID; name: string; conditions: ConditionGroup; notes: string }[];
  gatheringBehavior: { id: ID; name: string; weight: number; notes: string }[];
}

/* ------------------------------------------------------------------ *
 * 2. Royalty module
 * ------------------------------------------------------------------ */

export interface RoyalTitle {
  id: ID;
  masculineName: LocalizedString;
  feminineName: LocalizedString;
  neutralName: LocalizedString;
  description: LocalizedString;
  iconRef: ResourceRef;
  traitRef: ResourceRef;
  buffRef: ResourceRef;
  hiddenTraitRef: ResourceRef;
  rankPriority: number;
  prestige: number;
  parentTitleId?: ID;
  requiredBloodline: string;
  requiredRelationship: string;
  requiredStatistic: { ref: ResourceRef; min: number };
  allowedAges: string[];
  allowedGenders: string[];
  allowedOccults: string[];
  allowedHouseholds: string[];
  maxHolders: number;
  hereditary: boolean;
  revocable: boolean;
  affectsAutonomy: boolean;
  changesGreetings: boolean;
  unlocksInteractions: boolean;
  changesCareerAccess: boolean;
  affectsReputation: boolean;
}

export type SuccessionMode =
  | "absolute-primogeniture" | "male-preference" | "female-preference"
  | "male-only" | "female-only" | "ultimogeniture" | "seniority"
  | "elective" | "appointment" | "trial" | "marriage" | "custom-weighted";

export interface SuccessionRule {
  id: ID;
  name: string;
  mode: SuccessionMode;
  priority: number;
  eligibility: ConditionGroup;
  exclusions: ConditionGroup;
  weight: number;
  notes: string;
}

export interface CourtRole {
  id: ID;
  name: string;
  careerRef: ResourceRef;
  traitRef: ResourceRef;
  buffRef: ResourceRef;
  requiredTitleId?: ID;
  requiredRelationship: string;
  schedule: string;
  salary: number;
  responsibilities: string[];
  allowedInteractions: ResourceRef[];
  forbiddenInteractions: ResourceRef[];
  autonomyRules: string;
  promotion: ConditionGroup;
  dismissal: ConditionGroup;
}

export interface RoyalInteraction {
  id: ID;
  name: string;
  ref: ResourceRef;
  actorTitleId?: ID;
  targetTitleId?: ID;
  conditions: ConditionGroup;
  loot: LootAction[];
  notification: NotifySpec;
}

export interface RoyalEvent {
  id: ID;
  name: string;
  kind: string;
  triggers: ConditionGroup;
  participants: string[];
  venueRef: ResourceRef;
  requiredRoleIds: ID[];
  loot: LootAction[];
  notification: NotifySpec;
  prestigeChange: number;
  relationshipChange: number;
  followUpEventIds: ID[];
}

export interface MarriageRules {
  eligibility: ConditionGroup;
  political: boolean;
  arranged: boolean;
  morganatic: boolean;
  consortTitleId?: ID;
  spouseInheritsTitle: boolean;
  approvalRequired: boolean;
  divorcePenalty: number;
  widowTitleId?: ID;
  multipleSpouses: boolean;
  householdTransfer: boolean;
  dynastyNameChange: boolean;
}

export interface RoyaltyModuleData {
  systemName: string;
  displayName: LocalizedString;
  description: LocalizedString;
  requiredPacks: string[];
  optionalMods: string[];
  iconRef: ResourceRef;
  defaultRoyalHousehold: string;
  royalResidenceLot: string;
  courtVenueRef: ResourceRef;
  prestigeStatRef: ResourceRef;
  hereditary: boolean;
  multipleFamilies: boolean;
  npcKingdoms: boolean;

  titles: RoyalTitle[];
  succession: SuccessionRule[];
  marriage: MarriageRules;
  courtRoles: CourtRole[];
  interactions: RoyalInteraction[];
  events: RoyalEvent[];
}

/* ------------------------------------------------------------------ *
 * 3. Legacy module
 * ------------------------------------------------------------------ */

export interface GenerationRule {
  id: ID;
  number: number;
  name: string;
  theme: string;
  description: LocalizedString;
  requiredTraits: ResourceRef[];
  forbiddenTraits: ResourceRef[];
  requiredAspiration: ResourceRef;
  requiredCareer: ResourceRef;
  requiredSkills: { id: ID; ref: ResourceRef; level: number }[];
  marriageRules: string;
  childRequirement: number;
  occultRequirement: string;
  lotRequirement: string;
  worldRequirement: string;
  wealthRequirement: number;
  goals: { id: ID; text: string; points: number }[];
  failConditions: ConditionGroup;
  completionRewards: LootAction[];
  completionTraitRef: ResourceRef;
  completionBuffRef: ResourceRef;
  unlockables: string[];
  notification: NotifySpec;
}

export type HeirMode =
  | "oldest" | "youngest" | "firstborn-gender" | "highest-skill"
  | "highest-relationship" | "highest-score" | "player" | "random"
  | "trait-based" | "career-based" | "occult-based" | "challenge" | "weighted";

export interface HeirRule {
  id: ID;
  mode: HeirMode;
  priority: number;
  parameter: string;
  conditions: ConditionGroup;
  isBackup: boolean;
}

export interface BloodlineTier {
  id: ID;
  name: string;
  strength: number;
  buffRefs: ResourceRef[];
  notes: string;
}

export interface Bloodline {
  id: ID;
  name: string;
  description: LocalizedString;
  iconRef: ResourceRef;
  hidden: boolean;
  founder: string;
  inheritanceChance: number;
  maternalChance: number;
  paternalChance: number;
  adoptionInherits: boolean;
  marriageInherits: boolean;
  occultRules: string;
  generationDecay: number;
  tiers: BloodlineTier[];
  buffRefs: ResourceRef[];
  skillEffects: string;
  motiveEffects: string;
  autonomyEffects: string;
  relationshipEffects: string;
  careerEffects: string;
  pregnancyEffects: string;
  fertilityEffects: string;
  lifespanEffects: string;
  interactionRefs: ResourceRef[];
  visualEffects: string;
  statisticRefs: ResourceRef[];
}

export interface ScoreRule {
  id: ID;
  event: string;
  points: number;
  multiplier: number;
  perGenerationCap: number;
  scope: "sim" | "household" | "dynasty";
  hidden: boolean;
  conditions: ConditionGroup;
}

export interface LegacyEventRule {
  id: ID;
  kind: string;
  triggers: ConditionGroup;
  loot: LootAction[];
  notification: NotifySpec;
}

export interface FamilyNode {
  id: ID;
  name: string;
  generation: number;
  parentIds: ID[];
  spouseIds: ID[];
  formerSpouseIds: ID[];
  adoptiveParentIds: ID[];
  stepRelationIds: ID[];
  siblingIds: ID[];
  halfSiblingIds: ID[];
  branch: string;
  titleId?: ID;
  isHeir: boolean;
  isFounder: boolean;
  bloodlineIds: ID[];
  legacyScore: number;
  deceased: boolean;
}

export interface LegacyModuleData {
  legacyName: string;
  dynastyName: string;
  founder: string;
  description: LocalizedString;
  iconRef: ResourceRef;
  crestRef: ResourceRef;
  motto: LocalizedString;
  startingGeneration: number;
  maxGenerations: number;
  activeHousehold: string;
  homeLot: string;
  requiredPacks: string[];
  optionalMods: string[];

  generations: GenerationRule[];
  heirRules: HeirRule[];
  bloodlines: Bloodline[];
  scoring: ScoreRule[];
  events: LegacyEventRule[];
  familyTree: FamilyNode[];
}

/* ------------------------------------------------------------------ *
 * 4. Generic pack mechanic module
 * ------------------------------------------------------------------ */

export type PackTier = "base-game" | "expansion" | "game-pack" | "stuff-pack" | "kit" | "custom" | "external-mod";

export interface PackMechanicRule {
  id: ID;
  name: string;
  category: string;
  description: LocalizedString;
  conditions: ConditionGroup;
  loot: LootAction[];
  notification: NotifySpec;
  /** Free-form typed values keyed by the mechanic template's field list. */
  fields: Record<string, string | number | boolean>;
  refs: ResourceRef[];
  enabled: boolean;
}

export interface PackMechanicModuleData {
  packTier: PackTier;
  packKey: string;              // e.g. "EP02" / "get-together"
  packLabel: string;
  mechanicCategory: string;     // e.g. "Festivals"
  requiredResourceTypes: string[];
  requiredTuningRefs: ResourceRef[];
  optionalDependencies: string[];
  compatibilityNotes: string;
  patchVersion: string;
  conflictWarnings: string;
  rules: PackMechanicRule[];
}

/* ------------------------------------------------------------------ *
 * Module envelope
 * ------------------------------------------------------------------ */

export type PackModuleKind = "club" | "royalty" | "legacy" | "pack";

export type PackModuleData =
  | ClubModuleData
  | RoyaltyModuleData
  | LegacyModuleData
  | PackMechanicModuleData;

export interface PackModule {
  id: ID;
  projectId: ID;
  kind: PackModuleKind;
  name: string;
  summary: string;
  requiredPack: string;
  status: "draft" | "in-progress" | "complete";
  buildSupport: BuildSupport;
  data: PackModuleData;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

export function rid(): ID {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** 32-bit FNV-1a — the hash family Sims 4 STBL keys use. */
export function fnv32(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `0x${h.toString(16).toUpperCase().padStart(8, "0")}`;
}

export function makeStblKey(prefix: string, name: string): string {
  const slug = name.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
  return `MC6_${prefix.toUpperCase()}_${slug || "STRING"}`;
}
