/**
 * Built-in original templates shipped with Mod Constructor V6.
 *
 * These are ORIGINAL starter structures owned by this project. They are
 * read-only, not attributed to any outside creator, and carry no
 * fabricated download counts or ratings. Each template's `payload`
 * describes a real record body that the Templates workspace uses to
 * scaffold a project-scoped record via the central store.
 */

import type {
  Template,
  Career,
  CareerBranch,
  CareerLevel,
  Trait,
  Buff,
  Aspiration,
  Milestone,
  NotificationTemplate,
} from "./types";

export type CareerPayload = Omit<
  Career,
  "id" | "projectId" | "createdAt" | "updatedAt"
>;
export type TraitPayload = Omit<
  Trait,
  "id" | "projectId" | "createdAt" | "updatedAt"
>;
export type AspirationPayload = Omit<
  Aspiration,
  "id" | "projectId" | "createdAt" | "updatedAt"
>;
export type NotificationPayload = Omit<
  NotificationTemplate,
  "id" | "projectId" | "createdAt" | "updatedAt"
>;

/** Shared constants so we don't fabricate specifics per template. */
const TARGET_GAME_VERSION = "1.108+";
const BUILT_IN_UPDATED = "2026-07-21";

const genLevels = (count: number, baseSalary = 180): CareerLevel[] =>
  Array.from({ length: count }).map((_, i) => ({
    id: `lvl_${i + 1}`,
    rank: i + 1,
    title: `Level ${i + 1}`,
    salary: baseSalary + i * 90,
    workStart: "09:00",
    workEnd: "17:00",
    workDays: ["mon", "tue", "wed", "thu", "fri"],
    objectives: ["Complete daily task"],
    perks: [],
  }));

const branch = (
  id: string,
  name: string,
  description: string,
  levels: CareerLevel[],
): CareerBranch => ({ id, name, description, levels });

/* -------------------------- Career payloads -------------------------- */

const basic10LevelCareer: CareerPayload = {
  name: "Basic Career",
  internalId: "career_basic_10",
  description: "Ten-level linear career with standard weekday hours.",
  careerType: "standard",
  ageGates: ["young-adult", "adult"],
  branches: [branch("main", "Main Track", "Linear 10-level progression", genLevels(10))],
  messageOverrides: [],
  workFromHomeEvents: [],
};

const branchingCareer: CareerPayload = {
  name: "Branching Career",
  internalId: "career_branching",
  description: "Five shared levels, then two specialization branches.",
  careerType: "standard",
  ageGates: ["young-adult", "adult"],
  branches: [
    branch("shared", "Shared Track", "Levels 1–5 shared", genLevels(5)),
    branch("branch_a", "Specialization A", "Levels 6–10", genLevels(5, 720)),
    branch("branch_b", "Specialization B", "Levels 6–10", genLevels(5, 720)),
  ],
  messageOverrides: [],
  workFromHomeEvents: [],
};

const semiActiveCareer: CareerPayload = {
  name: "Semi-Active Career",
  internalId: "career_semi_active",
  description: "Rabbithole career with occasional on-lot active work events.",
  careerType: "active",
  ageGates: ["young-adult", "adult"],
  branches: [branch("main", "Main Track", "10 ranks", genLevels(10, 210))],
  messageOverrides: [],
  workFromHomeEvents: [
    { id: "wfh1", name: "Deliverable due", weight: 1, outcomes: ["Meet deadline"] },
  ],
};

const wfhCareer: CareerPayload = {
  name: "Work-From-Home Career",
  internalId: "career_wfh",
  description: "Fully remote career with a WFH event pool.",
  careerType: "freelance",
  ageGates: ["young-adult", "adult"],
  branches: [branch("main", "Main Track", "10 ranks", genLevels(10, 160))],
  messageOverrides: [],
  workFromHomeEvents: [
    { id: "wfh1", name: "Client call", weight: 2, outcomes: ["Impress client", "Reschedule"] },
    { id: "wfh2", name: "Focus block", weight: 3, outcomes: ["Deep work"] },
    { id: "wfh3", name: "Async review", weight: 1, outcomes: ["Ship draft"] },
  ],
};

/* -------------------------- Trait payloads --------------------------- */

const simplePersonalityTrait: TraitPayload = {
  name: "Personality Trait",
  internalId: "trait_personality",
  description: "Basic personality trait with a single happy buff.",
  category: "personality",
  ageGates: ["teen", "young-adult", "adult", "elder"],
  buffs: [
    {
      id: "b1",
      name: "Feeling Like Myself",
      description: "This Sim feels comfortable being themselves.",
      emotion: "happy",
      weight: 1,
      durationHours: 4,
    },
  ] as Buff[],
  socialInteractions: [],
  buffReplacements: [],
  commodityWeights: [],
  blockedAges: [],
  blockedEmotions: [],
};

const hiddenGameplayTrait: TraitPayload = {
  name: "Hidden Gameplay Trait",
  internalId: "trait_hidden_gameplay",
  description:
    "Non-selectable trait used to drive gameplay effects. Not shown in CAS.",
  category: "gameplay",
  ageGates: ["young-adult", "adult", "elder"],
  buffs: [],
  socialInteractions: [],
  buffReplacements: [],
  commodityWeights: [{ commodity: "motive_fun", weight: 1.1 }],
  blockedAges: [],
  blockedEmotions: [],
};

const rewardTrait: TraitPayload = {
  name: "Reward Trait",
  internalId: "trait_reward",
  description:
    "Awarded on aspiration completion; grants a persistent confident buff.",
  category: "bonus",
  ageGates: ["young-adult", "adult", "elder"],
  buffs: [
    {
      id: "b1",
      name: "Sense of Accomplishment",
      description: "Earned through hard work.",
      emotion: "confident",
      weight: 1,
      durationHours: 8,
    },
  ] as Buff[],
  socialInteractions: [],
  buffReplacements: [],
  commodityWeights: [],
  blockedAges: [],
  blockedEmotions: [],
};

/* -------------------------- Buff-only "traits" ----------------------- */
/* Buffs are attached to traits in this data model; we ship two trait
   payloads that carry a single temporary or permanent buff so the user
   has a starter surface to edit. */

const temporaryBuffCarrier: TraitPayload = {
  name: "Temporary Buff Carrier",
  internalId: "trait_temp_buff",
  description: "Carrier trait for a short-lived buff (~4h).",
  category: "gameplay",
  ageGates: ["young-adult", "adult", "elder"],
  buffs: [
    {
      id: "b1",
      name: "Short Boost",
      description: "A brief mood lift.",
      emotion: "energized",
      weight: 1,
      durationHours: 4,
    },
  ] as Buff[],
  socialInteractions: [],
  buffReplacements: [],
  commodityWeights: [],
  blockedAges: [],
  blockedEmotions: [],
};

const permanentBuffCarrier: TraitPayload = {
  name: "Permanent Buff Carrier",
  internalId: "trait_perm_buff",
  description: "Carrier trait for a persistent buff that does not decay.",
  category: "gameplay",
  ageGates: ["young-adult", "adult", "elder"],
  buffs: [
    {
      id: "b1",
      name: "Steady Presence",
      description: "A quiet, constant feeling.",
      emotion: "fine",
      weight: 1,
      durationHours: 9999,
    },
  ] as Buff[],
  socialInteractions: [],
  buffReplacements: [],
  commodityWeights: [],
  blockedAges: [],
  blockedEmotions: [],
};

/* -------------------------- Aspiration payloads ---------------------- */

const milestones = (names: string[]): Milestone[] =>
  names.map((name, i) => ({
    id: `m${i + 1}`,
    order: i + 1,
    name,
    description: "",
    objectives: ["Objective 1", "Objective 2"],
  }));

const fourMilestoneAspiration: AspirationPayload = {
  name: "Four-Milestone Aspiration",
  internalId: "asp_four_milestone",
  description: "Classic four-milestone aspiration structure.",
  category: "Creative",
  milestones: milestones(["Beginning", "Progress", "Growth", "Mastery"]),
};

const skillBasedAspiration: AspirationPayload = {
  name: "Skill-Based Aspiration",
  internalId: "asp_skill_based",
  description: "Milestones gated on Sim skill levels.",
  category: "Knowledge",
  milestones: milestones([
    "Reach Skill Level 2",
    "Reach Skill Level 5",
    "Reach Skill Level 8",
    "Reach Skill Level 10",
  ]),
};

const relationshipBasedAspiration: AspirationPayload = {
  name: "Relationship-Based Aspiration",
  internalId: "asp_relationship",
  description: "Milestones gated on friendships and romance.",
  category: "Love",
  milestones: milestones([
    "Make 3 Friends",
    "Reach Good Friends",
    "First Romance",
    "Committed Partner",
  ]),
};

/* -------------------------- Notification payloads -------------------- */

const basicNotification: NotificationPayload = {
  name: "Basic Notification",
  visual: "toast",
  title: "Notice",
  body: "Something happened in your Sim's day.",
  previewKind: "info",
  actions: [{ label: "OK", kind: "primary" }],
};

const promotionNotification: NotificationPayload = {
  name: "Promotion Notification",
  visual: "modal",
  title: "You've been promoted!",
  body: "Great work at the office paid off. Enjoy the raise.",
  previewKind: "promotion",
  actions: [
    { label: "Celebrate", kind: "primary" },
    { label: "Dismiss", kind: "dismiss" },
  ],
};

const failureNotification: NotificationPayload = {
  name: "Failure Notification",
  visual: "toast",
  title: "That didn't go well",
  body: "Your Sim failed the task. Try again after a break.",
  previewKind: "error",
  actions: [{ label: "OK", kind: "dismiss" }],
};

/* -------------------------- Built-in template list ------------------- */

type BuiltIn = Omit<Template, "createdAt" | "updatedAt">;

export const BUILT_IN_TEMPLATES: BuiltIn[] = [
  // Careers
  {
    id: "builtin_career_basic10",
    name: "Basic 10-Level Career",
    kind: "Career",
    summary: "Ten-level linear career with weekday hours and standard pay curve.",
    source: "built-in-original",
    builtIn: true,
    difficulty: "beginner",
    requiredPacks: ["Base Game"],
    includes: ["1 branch", "10 levels", "Standard schedule"],
    targetGameVersion: TARGET_GAME_VERSION,
    tested: "tested",
    payload: basic10LevelCareer,
  },
  {
    id: "builtin_career_branching",
    name: "Branching Career",
    kind: "Career",
    summary: "Five shared levels then two specialization branches.",
    source: "built-in-original",
    builtIn: true,
    difficulty: "intermediate",
    requiredPacks: ["Base Game"],
    includes: ["3 branches", "15 levels total", "Branch split at 5"],
    targetGameVersion: TARGET_GAME_VERSION,
    tested: "tested",
    payload: branchingCareer,
  },
  {
    id: "builtin_career_semi_active",
    name: "Semi-Active Career",
    kind: "Career",
    summary: "Rabbithole career with occasional on-lot active work events.",
    source: "built-in-original",
    builtIn: true,
    difficulty: "advanced",
    requiredPacks: ["Base Game"],
    includes: ["10 levels", "1 active event", "Standard schedule"],
    targetGameVersion: TARGET_GAME_VERSION,
    tested: "untested",
    payload: semiActiveCareer,
  },
  {
    id: "builtin_career_wfh",
    name: "Work-from-Home Career",
    kind: "Career",
    summary: "Fully remote career with a work-from-home event pool.",
    source: "built-in-original",
    builtIn: true,
    difficulty: "intermediate",
    requiredPacks: ["Base Game"],
    includes: ["10 levels", "3 WFH events", "Freelance schedule"],
    targetGameVersion: TARGET_GAME_VERSION,
    tested: "tested",
    payload: wfhCareer,
  },
  // Traits
  {
    id: "builtin_trait_simple_personality",
    name: "Simple Personality Trait",
    kind: "Trait",
    summary: "CAS-selectable personality trait with a single happy buff.",
    source: "built-in-original",
    builtIn: true,
    difficulty: "beginner",
    requiredPacks: ["Base Game"],
    includes: ["1 buff", "All ages ≥ Teen"],
    targetGameVersion: TARGET_GAME_VERSION,
    tested: "tested",
    payload: simplePersonalityTrait,
  },
  {
    id: "builtin_trait_hidden_gameplay",
    name: "Hidden Gameplay Trait",
    kind: "Trait",
    summary: "Non-CAS gameplay trait used to drive tuning effects.",
    source: "built-in-original",
    builtIn: true,
    difficulty: "advanced",
    requiredPacks: ["Base Game"],
    includes: ["No buffs", "Commodity weight modifier"],
    targetGameVersion: TARGET_GAME_VERSION,
    tested: "untested",
    payload: hiddenGameplayTrait,
  },
  {
    id: "builtin_trait_reward",
    name: "Reward Trait",
    kind: "Trait",
    summary: "Reward trait awarded on aspiration completion.",
    source: "built-in-original",
    builtIn: true,
    difficulty: "beginner",
    requiredPacks: ["Base Game"],
    includes: ["1 persistent buff", "Bonus category"],
    targetGameVersion: TARGET_GAME_VERSION,
    tested: "tested",
    payload: rewardTrait,
  },
  {
    id: "builtin_trait_temp_buff",
    name: "Temporary Buff",
    kind: "Trait",
    summary: "Carrier trait shipping a short-lived (~4h) buff.",
    source: "built-in-original",
    builtIn: true,
    difficulty: "beginner",
    requiredPacks: ["Base Game"],
    includes: ["1 buff", "4 hour duration"],
    targetGameVersion: TARGET_GAME_VERSION,
    tested: "tested",
    payload: temporaryBuffCarrier,
  },
  {
    id: "builtin_trait_perm_buff",
    name: "Permanent Buff",
    kind: "Trait",
    summary: "Carrier trait shipping a persistent, non-decaying buff.",
    source: "built-in-original",
    builtIn: true,
    difficulty: "intermediate",
    requiredPacks: ["Base Game"],
    includes: ["1 permanent buff"],
    targetGameVersion: TARGET_GAME_VERSION,
    tested: "tested",
    payload: permanentBuffCarrier,
  },
  // Aspirations
  {
    id: "builtin_asp_four_milestone",
    name: "Four-Milestone Aspiration",
    kind: "Aspiration",
    summary: "Classic four-milestone aspiration structure.",
    source: "built-in-original",
    builtIn: true,
    difficulty: "beginner",
    requiredPacks: ["Base Game"],
    includes: ["4 milestones", "2 objectives each"],
    targetGameVersion: TARGET_GAME_VERSION,
    tested: "tested",
    payload: fourMilestoneAspiration,
  },
  {
    id: "builtin_asp_skill_based",
    name: "Skill-Based Aspiration",
    kind: "Aspiration",
    summary: "Milestones gated on climbing a single Sim skill.",
    source: "built-in-original",
    builtIn: true,
    difficulty: "beginner",
    requiredPacks: ["Base Game"],
    includes: ["4 milestones", "Skill 2/5/8/10"],
    targetGameVersion: TARGET_GAME_VERSION,
    tested: "tested",
    payload: skillBasedAspiration,
  },
  {
    id: "builtin_asp_relationship",
    name: "Relationship-Based Aspiration",
    kind: "Aspiration",
    summary: "Milestones gated on friendships and romance.",
    source: "built-in-original",
    builtIn: true,
    difficulty: "intermediate",
    requiredPacks: ["Base Game"],
    includes: ["4 milestones", "Friendship + romance"],
    targetGameVersion: TARGET_GAME_VERSION,
    tested: "tested",
    payload: relationshipBasedAspiration,
  },
  // Notifications
  {
    id: "builtin_notif_basic",
    name: "Basic Notification",
    kind: "Notification",
    summary: "Neutral in-game toast for informational events.",
    source: "built-in-original",
    builtIn: true,
    difficulty: "beginner",
    requiredPacks: ["Base Game"],
    includes: ["Toast visual", "1 action"],
    targetGameVersion: TARGET_GAME_VERSION,
    tested: "tested",
    payload: basicNotification,
  },
  {
    id: "builtin_notif_promotion",
    name: "Promotion Notification",
    kind: "Notification",
    summary: "Celebration modal for career promotion events.",
    source: "built-in-original",
    builtIn: true,
    difficulty: "beginner",
    requiredPacks: ["Base Game"],
    includes: ["Modal visual", "2 actions"],
    targetGameVersion: TARGET_GAME_VERSION,
    tested: "tested",
    payload: promotionNotification,
  },
  {
    id: "builtin_notif_failure",
    name: "Failure Notification",
    kind: "Notification",
    summary: "Toast surfaced when a scripted action fails.",
    source: "built-in-original",
    builtIn: true,
    difficulty: "beginner",
    requiredPacks: ["Base Game"],
    includes: ["Toast visual", "Dismiss action"],
    targetGameVersion: TARGET_GAME_VERSION,
    tested: "tested",
    payload: failureNotification,
  },
];

export const BUILT_IN_UPDATED_AT = BUILT_IN_UPDATED;
