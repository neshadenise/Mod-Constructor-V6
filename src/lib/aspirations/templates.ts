/**
 * Aspiration templates.
 *
 * A template is either:
 *
 *  - `ready`  — creating from it produces a complete, editable, validation-clean
 *               document: identity text, icon, milestones with descriptions and
 *               icons, objectives with supported test sets and verified game
 *               references, a completion notification and a completion reward.
 *               A `ready` template that expects a reward trait also carries the
 *               spec for that trait, which the builder creates in the project
 *               and links by stable id.
 *
 *  - `draft`  — the shape is useful but it cannot be completed without input
 *               only the creator has (their own interaction, collection, career
 *               or occult ability). Drafts are labelled "Requires configuration"
 *               in the gallery and stay export-blocked until those references
 *               are filled in.
 *
 * Every game reference below comes from the hand-verified built-in id registry
 * (`src/lib/gamedata/builtin-ids.ts`). Nothing here invents a tuning id.
 */

import type { ResourceRef } from "@/lib/traits/schema";
import type { GoalParamValue, ObjectiveTypeId } from "./goals";
import {
  blankAspirationDoc,
  makeMilestone,
  makeObjective,
  sanitizeInternalName,
  type AspirationCategoryId,
  type AspirationDoc,
  type AspirationTypeId,
  type DifficultyId,
} from "./schema";
import { makeRewardCard } from "./gameplay";

export type TemplateStatus = "ready" | "draft";

export interface TemplateObjective {
  label: string;
  description?: string;
  type: ObjectiveTypeId;
  params?: Record<string, GoalParamValue>;
  refs?: Record<string, ResourceRef>;
  count?: number;
}

export interface TemplateMilestone {
  title: string;
  description: string;
  icon: string;
  points: number;
  notification?: string;
  objectives: TemplateObjective[];
}

export interface TemplateRewardTrait {
  name: string;
  description: string;
  icon: string;
}

export interface AspirationTemplate {
  id: string;
  label: string;
  blurb: string;
  category: AspirationCategoryId;
  type: AspirationTypeId;
  difficulty: DifficultyId;
  status: TemplateStatus;
  /** Why a draft cannot be completed automatically. Shown in the gallery. */
  requiresConfiguration?: string[];
  icon: string;
  description: string;
  notes: string;
  completionNotification: string;
  completionPoints: number;
  rewardTrait?: TemplateRewardTrait;
  milestones: TemplateMilestone[];
}

/* ------------------------------------------------------------ helpers -- */

/** Verified base-game skill statistics (see builtin-ids.ts). */
const SKILL_IDS = {
  logic: ["16705", "Skill_Logic", "Logic"],
  writing: ["16695", "Skill_Writing", "Writing"],
  programming: ["16702", "Skill_Programming", "Programming"],
  photography: ["16720", "Skill_Photography", "Photography"],
  painting: ["16699", "Skill_Painting", "Painting"],
  guitar: ["16694", "Skill_Guitar", "Guitar"],
  piano: ["16701", "Skill_Piano", "Piano"],
  violin: ["16698", "Skill_Violin", "Violin"],
  fitness: ["16693", "Skill_Fitness", "Fitness"],
  dancing: ["16719", "Skill_Dancing", "Dancing"],
  cooking: ["16665", "Skill_Cooking", "Cooking"],
  gourmet: ["16704", "Skill_Gourmet_Cooking", "Gourmet Cooking"],
  mischief: ["16706", "Skill_Mischief", "Mischief"],
  comedy: ["16700", "Skill_Comedy", "Comedy"],
  charisma: ["16659", "Skill_Charisma", "Charisma"],
  handiness: ["16673", "Skill_Handiness", "Handiness"],
  gaming: ["16703", "Skill_Video_Gaming", "Video Gaming"],
} as const;

type SkillId = keyof typeof SKILL_IDS;

const skillRef = (id: SkillId): ResourceRef => {
  const [tuningId, tuningName, label] = SKILL_IDS[id];
  return {
    source: "game",
    resourceKind: "Skill",
    expectedType: "Skill",
    label,
    tuningName,
    tuningId,
    pack: "BaseGame",
  };
};

/** Verified base-game careers (see builtin-ids.ts). */
const CAREER_IDS = {
  business: ["34116", "career_Adult_Business", "Business"],
  culinary: ["34118", "career_Adult_Culinary", "Culinary"],
  painter: ["34120", "career_Adult_Painter", "Painter"],
  writer: ["34123", "career_Adult_Writer", "Writer"],
} as const;

type CareerId = keyof typeof CAREER_IDS;

const careerRef = (id: CareerId): ResourceRef => {
  const [tuningId, tuningName, label] = CAREER_IDS[id];
  return {
    source: "game",
    resourceKind: "Career",
    expectedType: "Career",
    label,
    tuningName,
    tuningId,
    pack: "BaseGame",
  };
};

const skillGoal = (
  skill: SkillId,
  level: number,
  label?: string,
  description?: string,
): TemplateObjective => ({
  label: label ?? `Reach ${SKILL_IDS[skill][2]} level ${level}`,
  description: description ?? `Raise the ${SKILL_IDS[skill][2]} skill to level ${level}.`,
  type: "skill",
  refs: { skill: skillRef(skill) },
  params: { targetLevel: level, minimumLevel: 0, maximumLevel: 0 },
  count: level,
});

const relationshipGoal = (
  label: string,
  description: string,
  kind: "friendship" | "romance",
  value: number,
  simCount = 1,
): TemplateObjective => ({
  label,
  description,
  type: "relationship",
  params: { relationshipType: kind, value, simCount, target: "" },
  count: simCount,
});

const careerGoal = (
  career: CareerId,
  level: number,
  label: string,
  description: string,
): TemplateObjective => ({
  label,
  description,
  type: "career",
  refs: { career: careerRef(career) },
  params: { level, promotionRequired: false },
  count: level,
});

/* ---------------------------------------------------------- templates -- */

export const ASPIRATION_TEMPLATES: AspirationTemplate[] = [
  {
    id: "knowledge",
    label: "Knowledge",
    blurb: "Skill mastery with escalating study goals.",
    category: "Knowledge",
    type: "primary",
    difficulty: "normal",
    status: "ready",
    icon: "def.skill.logic",
    description:
      "This Sim lives to understand things. They read, tinker and study until every subject in reach has given up its secrets.",
    notes:
      "Ready template. All goals use verified base-game skill statistics, so it validates and exports without edits.",
    completionNotification:
      "Your Sim has become a Renowned Scholar. Nothing in this world is beyond their understanding.",
    completionPoints: 2000,
    rewardTrait: {
      name: "Quick Learner",
      description: "Skills build faster for this Sim — curiosity keeps paying off.",
      icon: "def.trait.genius",
    },
    milestones: [
      {
        title: "Curious Mind",
        description: "Start reading and thinking properly for the first time.",
        icon: "def.skill.logic",
        points: 400,
        notification: "Your Sim's curiosity is turning into a habit.",
        objectives: [skillGoal("logic", 2), skillGoal("writing", 2)],
      },
      {
        title: "Dedicated Student",
        description: "Study becomes a routine rather than a mood.",
        icon: "def.skill.programming",
        points: 600,
        notification: "Study time is paying off.",
        objectives: [skillGoal("logic", 5), skillGoal("programming", 3)],
      },
      {
        title: "Field Expert",
        description: "Deep knowledge in a chosen field, backed by real practice.",
        icon: "def.skill.photography",
        points: 800,
        notification: "Your Sim is now an expert in their field.",
        objectives: [skillGoal("logic", 8), skillGoal("photography", 4)],
      },
      {
        title: "Renowned Scholar",
        description: "Mastery, and the reputation that comes with it.",
        icon: "def.trait.genius",
        points: 1200,
        notification: "Your Sim is a Renowned Scholar.",
        objectives: [skillGoal("logic", 10), skillGoal("writing", 7)],
      },
    ],
  },
  {
    id: "creative",
    label: "Creative",
    blurb: "Make, refine and be known for your work.",
    category: "Creativity",
    type: "primary",
    difficulty: "normal",
    status: "ready",
    icon: "def.skill.painting",
    description:
      "This Sim needs to make things. Canvas, strings or keys — the medium changes, the compulsion does not.",
    notes: "Ready template. Uses verified base-game creative skills only.",
    completionNotification: "Your Sim is a celebrated creator — their work speaks for itself.",
    completionPoints: 2000,
    rewardTrait: {
      name: "Muse Touched",
      description: "Inspiration comes easily and lingers longer for this Sim.",
      icon: "def.trait.creative",
    },
    milestones: [
      {
        title: "First Sketches",
        description: "Rough, eager, and finally getting something onto the canvas.",
        icon: "def.skill.painting",
        points: 400,
        notification: "The first works are done — rough, but real.",
        objectives: [skillGoal("painting", 3), skillGoal("guitar", 2)],
      },
      {
        title: "Working Artist",
        description: "The craft holds up under a real workload.",
        icon: "def.skill.piano",
        points: 600,
        notification: "Your Sim's work is getting good.",
        objectives: [skillGoal("painting", 6), skillGoal("piano", 4)],
      },
      {
        title: "Gallery Name",
        description: "Recognisable work with a recognisable hand behind it.",
        icon: "def.skill.violin",
        points: 900,
        notification: "People know your Sim's work on sight.",
        objectives: [skillGoal("painting", 9), skillGoal("violin", 5)],
      },
      {
        title: "Celebrated Creator",
        description: "Mastery of the medium.",
        icon: "def.trait.creative",
        points: 1200,
        notification: "Your Sim is a celebrated creator.",
        objectives: [skillGoal("painting", 10)],
      },
    ],
  },
  {
    id: "athletic",
    label: "Athletic",
    blurb: "Fitness progression with physical challenges.",
    category: "Athletic",
    type: "primary",
    difficulty: "hard",
    status: "ready",
    icon: "def.skill.fitness",
    description: "This Sim measures a good day in sets, reps and distance covered.",
    notes: "Ready template. Fitness and Dancing are verified base-game skills.",
    completionNotification: "Peak condition reached — your Sim is in the best shape of their life.",
    completionPoints: 2000,
    rewardTrait: {
      name: "Iron Constitution",
      description: "This Sim tires slowly and recovers fast.",
      icon: "def.trait.activepersona",
    },
    milestones: [
      {
        title: "Warming Up",
        description: "The first weeks of actually turning up.",
        icon: "def.skill.fitness",
        points: 400,
        notification: "Your Sim is building a routine.",
        objectives: [skillGoal("fitness", 3)],
      },
      {
        title: "Serious Training",
        description: "Training with structure and intent.",
        icon: "def.skill.dancing",
        points: 700,
        notification: "Training is getting serious.",
        objectives: [skillGoal("fitness", 6), skillGoal("dancing", 4)],
      },
      {
        title: "Peak Condition",
        description: "Everything the body can be pushed to.",
        icon: "def.trait.activepersona",
        points: 1200,
        notification: "Your Sim has reached peak condition.",
        objectives: [skillGoal("fitness", 10)],
      },
    ],
  },
  {
    id: "food",
    label: "Food",
    blurb: "Cooking mastery from grilled cheese upward.",
    category: "Food",
    type: "primary",
    difficulty: "normal",
    status: "ready",
    icon: "def.skill.cooking",
    description: "The kitchen is this Sim's whole world, and everyone else eats well because of it.",
    notes: "Ready template. Cooking and Gourmet Cooking are verified base-game skills.",
    completionNotification: "Your Sim is a master chef — the kitchen belongs to them.",
    completionPoints: 2000,
    rewardTrait: {
      name: "Kitchen Instinct",
      description: "This Sim cooks faster and rarely ruins a dish.",
      icon: "def.trait.foodie",
    },
    milestones: [
      {
        title: "Home Cook",
        description: "Reliable everyday meals, made properly.",
        icon: "def.skill.cooking",
        points: 400,
        notification: "Dinner at your Sim's place is worth turning up for.",
        objectives: [skillGoal("cooking", 3)],
      },
      {
        title: "Kitchen Confident",
        description: "Harder techniques, and the nerve to try them.",
        icon: "def.skill.baking",
        points: 700,
        notification: "Your Sim is confident in the kitchen.",
        objectives: [skillGoal("cooking", 6), skillGoal("gourmet", 4)],
      },
      {
        title: "Master Chef",
        description: "Gourmet standard, every service.",
        icon: "def.trait.foodie",
        points: 1200,
        notification: "Your Sim is a master chef.",
        objectives: [skillGoal("gourmet", 10)],
      },
    ],
  },
  {
    id: "romance",
    label: "Romance",
    blurb: "Charisma and relationship-driven goals.",
    category: "Romance",
    type: "primary",
    difficulty: "normal",
    status: "ready",
    icon: "def.trait.romantic",
    description: "This Sim is happiest mid-flirt, and never short of someone to charm.",
    notes: "Ready template. Charisma skill plus relationship value goals — no external references.",
    completionNotification: "Your Sim's romantic reputation precedes them everywhere.",
    completionPoints: 2000,
    rewardTrait: {
      name: "Effortless Charm",
      description: "Romantic interactions land more easily for this Sim.",
      icon: "def.trait.flirt",
    },
    milestones: [
      {
        title: "First Flirt",
        description: "Learning that charm is a skill like any other.",
        icon: "def.skill.charisma",
        points: 400,
        notification: "Your Sim is finding their confidence.",
        objectives: [
          skillGoal("charisma", 3),
          relationshipGoal(
            "Build romance with one Sim",
            "Reach a romance level of 30 with any Sim.",
            "romance",
            30,
            1,
          ),
        ],
      },
      {
        title: "Sweetheart",
        description: "Real attachment, not just practice.",
        icon: "def.trait.romantic",
        points: 700,
        notification: "Your Sim's romance is going well.",
        objectives: [
          relationshipGoal(
            "Two strong romances",
            "Reach a romance level of 50 with two Sims.",
            "romance",
            50,
            2,
          ),
        ],
      },
      {
        title: "Serial Romantic",
        description: "A reputation built on charm.",
        icon: "def.trait.flirt",
        points: 1200,
        notification: "Your Sim is a serial romantic.",
        objectives: [
          skillGoal("charisma", 8),
          relationshipGoal(
            "Three strong romances",
            "Reach a romance level of 60 with three Sims.",
            "romance",
            60,
            3,
          ),
        ],
      },
    ],
  },
  {
    id: "popularity",
    label: "Popularity",
    blurb: "Social reach and reputation.",
    category: "Popularity",
    type: "primary",
    difficulty: "normal",
    status: "ready",
    icon: "def.trait.outgoing",
    description: "A full room is where this Sim comes alive, and they intend to fill a lot of rooms.",
    notes: "Ready template. Charisma and Comedy skills plus friendship goals.",
    completionNotification: "Your Sim is a local icon — everyone knows their name.",
    completionPoints: 2000,
    rewardTrait: {
      name: "Well Connected",
      description: "Friendships build faster and decay slower for this Sim.",
      icon: "def.trait.charismatic",
    },
    milestones: [
      {
        title: "Making Friends",
        description: "The first circle of real friends.",
        icon: "def.skill.charisma",
        points: 400,
        notification: "Your Sim is making friends.",
        objectives: [
          skillGoal("charisma", 3),
          relationshipGoal(
            "Befriend three Sims",
            "Reach a friendship level of 40 with three Sims.",
            "friendship",
            40,
            3,
          ),
        ],
      },
      {
        title: "Well Known",
        description: "A name people recognise across the neighbourhood.",
        icon: "def.skill.comedy",
        points: 700,
        notification: "Your Sim is getting well known.",
        objectives: [
          skillGoal("comedy", 5),
          relationshipGoal(
            "Befriend ten Sims",
            "Reach a friendship level of 40 with ten Sims.",
            "friendship",
            40,
            10,
          ),
        ],
      },
      {
        title: "Local Icon",
        description: "Reputation without effort.",
        icon: "def.trait.outgoing",
        points: 1200,
        notification: "Your Sim is a local icon.",
        objectives: [
          skillGoal("charisma", 9),
          relationshipGoal(
            "Befriend twenty Sims",
            "Reach a friendship level of 40 with twenty Sims.",
            "friendship",
            40,
            20,
          ),
        ],
      },
    ],
  },
  {
    id: "family",
    label: "Family",
    blurb: "Household milestones across generations.",
    category: "Family",
    type: "primary",
    difficulty: "normal",
    status: "ready",
    icon: "def.trait.family",
    description: "Everything this Sim builds, they build for the people under their roof.",
    notes: "Ready template. Relationship goals only — nothing outside the base game is referenced.",
    completionNotification: "Your Sim's family legacy is secure.",
    completionPoints: 2000,
    rewardTrait: {
      name: "Family Anchor",
      description: "Family relationships hold strong for this Sim, even at a distance.",
      icon: "def.trait.parent",
    },
    milestones: [
      {
        title: "New Beginnings",
        description: "Building the relationship the household will rest on.",
        icon: "def.trait.romantic",
        points: 400,
        notification: "Your Sim is building a home.",
        objectives: [
          relationshipGoal(
            "A committed partner",
            "Reach a romance level of 70 with one Sim.",
            "romance",
            70,
            1,
          ),
        ],
      },
      {
        title: "Growing Household",
        description: "More people, more noise, more to hold together.",
        icon: "def.trait.family",
        points: 700,
        notification: "The household is growing.",
        objectives: [
          relationshipGoal(
            "Close to three household Sims",
            "Reach a friendship level of 70 with three Sims.",
            "friendship",
            70,
            3,
          ),
        ],
      },
      {
        title: "Family Legacy",
        description: "A family that holds together without being held together.",
        icon: "def.trait.parent",
        points: 1200,
        notification: "Your Sim's family legacy is set.",
        objectives: [
          relationshipGoal(
            "Close to five family Sims",
            "Reach a friendship level of 80 with five Sims.",
            "friendship",
            80,
            5,
          ),
        ],
      },
    ],
  },
  {
    id: "fortune",
    label: "Fortune",
    blurb: "Career-driven wealth accumulation.",
    category: "Fortune",
    type: "primary",
    difficulty: "hard",
    status: "ready",
    icon: "def.trait.materialistic",
    description: "Money is the scoreboard, and this Sim intends to win on it.",
    notes:
      "Ready template. Career goals point at verified base-game careers — swap them for your own career once you have one.",
    completionNotification: "Your Sim is filthy rich, and intends to stay that way.",
    completionPoints: 2000,
    rewardTrait: {
      name: "Shrewd",
      description: "This Sim gets more out of every Simoleon they earn.",
      icon: "def.trait.materialistic",
    },
    milestones: [
      {
        title: "First Simoleons",
        description: "Getting a foot on the ladder.",
        icon: "def.trait.ambitious",
        points: 400,
        notification: "Your Sim has started earning properly.",
        objectives: [careerGoal("business", 3, "Reach Business level 3", "Get promoted to level 3 of the Business career.")],
      },
      {
        title: "Comfortable",
        description: "Enough money that money stops being the problem.",
        icon: "def.trait.materialistic",
        points: 800,
        notification: "Your Sim is comfortable now.",
        objectives: [
          careerGoal("business", 7, "Reach Business level 7", "Get promoted to level 7 of the Business career."),
          skillGoal("charisma", 6),
        ],
      },
      {
        title: "Filthy Rich",
        description: "The top of the ladder, and the view from it.",
        icon: "def.reward.trophy",
        points: 1400,
        notification: "Your Sim is filthy rich.",
        objectives: [careerGoal("business", 10, "Reach Business level 10", "Reach the top of the Business career.")],
      },
    ],
  },
  {
    id: "deviance",
    label: "Deviance",
    blurb: "Mischief-driven misbehaviour.",
    category: "Deviance",
    type: "primary",
    difficulty: "hard",
    status: "ready",
    icon: "def.trait.evil",
    description: "This Sim is not malicious exactly. They just cannot leave a situation alone.",
    notes: "Ready template. Mischief and Comedy are verified base-game skills.",
    completionNotification: "Your Sim is a certified public menace.",
    completionPoints: 2000,
    rewardTrait: {
      name: "Unbothered",
      description: "Consequences bounce off this Sim more easily than they should.",
      icon: "def.trait.mean",
    },
    milestones: [
      {
        title: "Petty Trouble",
        description: "Small pranks, big grin.",
        icon: "def.trait.mean",
        points: 400,
        notification: "Your Sim is causing trouble.",
        objectives: [skillGoal("mischief", 3)],
      },
      {
        title: "Known Nuisance",
        description: "A reputation, and not a good one.",
        icon: "def.skill.comedy",
        points: 700,
        notification: "Your Sim is a known nuisance.",
        objectives: [skillGoal("mischief", 6), skillGoal("comedy", 4)],
      },
      {
        title: "Public Menace",
        description: "Mastery of mischief.",
        icon: "def.trait.evil",
        points: 1200,
        notification: "Your Sim is a public menace.",
        objectives: [skillGoal("mischief", 10)],
      },
    ],
  },
  {
    id: "hidden",
    label: "Hidden Gameplay",
    blurb: "Silent background tracking.",
    category: "Lifestyle",
    type: "hidden",
    difficulty: "normal",
    status: "ready",
    icon: "def.skill.programming",
    description: "Tracks progress quietly in the background. Never shown in the aspiration picker.",
    notes: "Ready template. Hidden aspirations need no icon or reward trait, but both are set anyway.",
    completionNotification: "Background tracking complete.",
    completionPoints: 500,
    milestones: [
      {
        title: "Tracked Progress",
        description: "A single silent goal used to drive other systems.",
        icon: "def.skill.programming",
        points: 500,
        notification: "Tracked goal complete.",
        objectives: [skillGoal("handiness", 5)],
      },
    ],
  },
  {
    id: "nature",
    label: "Nature",
    blurb: "Gardening, collecting and the outdoors.",
    category: "Nature",
    type: "primary",
    difficulty: "easy",
    status: "draft",
    requiresConfiguration: [
      "Pick the Gardening skill in each skill goal — its instance id is not in the offline registry.",
      "Attach a collection resource to the collecting goal.",
      "Choose a reward trait, or create one in the Trait Builder and link it here.",
    ],
    icon: "def.skill.gardening",
    description: "Plants, harvests and long afternoons outdoors.",
    notes: "Draft template: the Gardening skill and the collection goal need references you supply.",
    completionNotification: "Your Sim is the guardian of the grove.",
    completionPoints: 1500,
    milestones: [
      {
        title: "Green Thumb",
        description: "First plants in the ground.",
        icon: "def.skill.gardening",
        points: 400,
        objectives: [
          { label: "Reach Gardening level 3", type: "skill", params: { targetLevel: 3 } },
        ],
      },
      {
        title: "Harvest Season",
        description: "A garden that actually feeds the household.",
        icon: "def.skill.gardening",
        points: 700,
        objectives: [
          { label: "Reach Gardening level 6", type: "skill", params: { targetLevel: 6 } },
          { label: "Complete a collection", type: "collection", params: { pieces: 10 } },
        ],
      },
    ],
  },
  {
    id: "occult",
    label: "Occult",
    blurb: "Occult-gated progression track.",
    category: "Occult",
    type: "occult",
    difficulty: "expert",
    status: "draft",
    requiresConfiguration: [
      "Name the occult life state each goal tests for.",
      "Point the ability goals at your own interactions or statistics.",
      "Choose or create the reward trait this aspiration grants.",
    ],
    icon: "def.trait.witch",
    description: "A full aspiration gated behind an occult life state.",
    notes: "Draft template: occult abilities are pack-specific and are not in the offline registry.",
    completionNotification: "Your Sim has mastered their nature.",
    completionPoints: 2000,
    milestones: [
      {
        title: "Awakening",
        description: "Discovering what they have become.",
        icon: "def.trait.witch",
        points: 500,
        objectives: [{ label: "Discover your nature", type: "occult", params: { mustBe: true } }],
      },
      {
        title: "Ancient Power",
        description: "Full command of the life state.",
        icon: "def.trait.vampire",
        points: 1500,
        objectives: [{ label: "Master every ability", type: "occult", params: { mustBe: true } }],
      },
    ],
  },
  {
    id: "career",
    label: "Career",
    blurb: "Attached to a career track.",
    category: "Career",
    type: "career",
    difficulty: "normal",
    status: "draft",
    requiresConfiguration: [
      "Select the career this aspiration follows in each career goal — most creators use their own custom career here.",
    ],
    icon: "def.career.business",
    description: "Progression goals attached to a career track.",
    notes: "Draft template: it is meant to be pointed at your own career.",
    completionNotification: "Your Sim has reached the top of their career.",
    completionPoints: 1500,
    milestones: [
      {
        title: "Getting Hired",
        description: "The first rungs of the ladder.",
        icon: "def.career.business",
        points: 400,
        objectives: [{ label: "Reach level 3", type: "career", params: { level: 3 } }],
      },
      {
        title: "Top of the Ladder",
        description: "The final promotion.",
        icon: "def.reward.trophy",
        points: 1200,
        objectives: [{ label: "Reach the final level", type: "career", params: { level: 10 } }],
      },
    ],
  },
  {
    id: "university",
    label: "University",
    blurb: "Degree-style academic track.",
    category: "University",
    type: "university",
    difficulty: "hard",
    status: "draft",
    requiresConfiguration: [
      "Discover University resources (degrees, classes, assignments) are not in the offline registry — attach them yourself.",
    ],
    icon: "def.career.professor",
    description: "A degree-style academic track.",
    notes: "Draft template: requires Discover University references you supply.",
    completionNotification: "Your Sim has graduated with honours.",
    completionPoints: 1500,
    milestones: [
      {
        title: "Enrolled",
        description: "Term one.",
        icon: "def.career.professor",
        points: 400,
        objectives: [
          { label: "Complete three assignments", type: "interaction", params: { times: 3 } },
        ],
      },
      {
        title: "Graduate",
        description: "Degree in hand.",
        icon: "def.reward.trophy",
        points: 1200,
        objectives: [{ label: "Graduate with honours", type: "event", params: { count: 1 } }],
      },
    ],
  },
  {
    id: "business",
    label: "Business",
    blurb: "Own and grow a venture.",
    category: "Business",
    type: "primary",
    difficulty: "hard",
    status: "draft",
    requiresConfiguration: [
      "Retail and business statistics are pack resources — attach the ones your build targets.",
      "Choose or create the reward trait this aspiration grants.",
    ],
    icon: "def.career.retail",
    description: "Build a venture from the first sale to a full retail empire.",
    notes: "Draft template: retail statistics are not in the offline registry.",
    completionNotification: "Your Sim runs a retail empire.",
    completionPoints: 2000,
    milestones: [
      {
        title: "Opening Day",
        description: "Doors open, first sale rung up.",
        icon: "def.career.retail",
        points: 400,
        objectives: [{ label: "Make your first sale", type: "statistic", params: { target: 1 } }],
      },
      {
        title: "Retail Empire",
        description: "Five-star operation.",
        icon: "def.reward.trophy",
        points: 1400,
        objectives: [{ label: "Reach a 5-star rating", type: "statistic", params: { target: 5 } }],
      },
    ],
  },
  {
    id: "challenge",
    label: "Challenge",
    blurb: "Long-form self-imposed challenge.",
    category: "Lifestyle",
    type: "challenge",
    difficulty: "legendary",
    status: "draft",
    requiresConfiguration: [
      "Describe the challenge rules as real goals — the placeholder steps cannot be tested by the game.",
      "Choose or create the reward trait this challenge grants.",
    ],
    icon: "def.reward.trophy",
    description: "A long-form self-imposed challenge spanning generations.",
    notes: "Draft template: challenge rules are personal and cannot be generated.",
    completionNotification: "Your Sim survived the challenge.",
    completionPoints: 3000,
    milestones: [
      {
        title: "The Grind",
        description: "The long middle of the challenge.",
        icon: "def.reward.trophy",
        points: 1000,
        objectives: [{ label: "Complete 10 challenge steps", type: "custom", params: {} }],
      },
    ],
  },
  {
    id: "tutorial",
    label: "Tutorial",
    blurb: "Short guided teaching sequence.",
    category: "Lifestyle",
    type: "tutorial",
    difficulty: "very-easy",
    status: "draft",
    requiresConfiguration: [
      "Point the tutorial goals at the interaction or object your mod is teaching.",
    ],
    icon: "def.skill.handiness",
    description: "A short guided sequence that teaches one mechanic.",
    notes: "Draft template: the thing being taught is yours, so the goals cannot be pre-filled.",
    completionNotification: "Tutorial complete.",
    completionPoints: 200,
    milestones: [
      {
        title: "Learn the Basics",
        description: "One guided run through the new mechanic.",
        icon: "def.skill.handiness",
        points: 200,
        objectives: [{ label: "Use the new interaction once", type: "interaction", params: { times: 1 } }],
      },
    ],
  },
  {
    id: "custom",
    label: "Custom",
    blurb: "Empty structure — you own every field.",
    category: "Custom",
    type: "custom",
    difficulty: "normal",
    status: "draft",
    requiresConfiguration: ["Everything: this template deliberately starts empty."],
    icon: "",
    description: "",
    notes: "",
    completionNotification: "",
    completionPoints: 0,
    milestones: [],
  },
];

export const templateById = (id: string): AspirationTemplate | undefined =>
  ASPIRATION_TEMPLATES.find((t) => t.id === id);

export const isReadyTemplate = (t: AspirationTemplate) => t.status === "ready";

export const templateObjectiveCount = (t: AspirationTemplate) =>
  t.milestones.reduce((n, m) => n + m.objectives.length, 0);

/* ---------------------------------------------------- document builder -- */

export interface TemplateDocOptions {
  /** Record id of the reward trait created for this aspiration, when applicable. */
  rewardTraitId?: string;
  rewardTraitName?: string;
}

/** Build a fresh document from a template. Never mutates the template. */
export function docFromTemplate(
  t: AspirationTemplate,
  namespace: string,
  opts: TemplateDocOptions = {},
): AspirationDoc {
  const displayName = t.id === "custom" ? "New Aspiration" : `${t.label} Aspiration`;
  const ns = namespace || "MyMods";

  const doc = blankAspirationDoc({
    displayName,
    aspirationType: t.type,
    category: t.category,
    difficulty: t.difficulty,
    icon: t.icon,
    description: t.description,
    summary: t.blurb,
    notes: t.notes,
    milestones: t.milestones.map((m, i) => {
      const ms = makeMilestone(i, m.title);
      ms.description = m.description;
      ms.icon = m.icon;
      ms.points = m.points;
      ms.strings = { ...ms.strings, notification: m.notification ?? "" };
      ms.objectives = m.objectives.map((o) => {
        const obj = makeObjective(o.label, o.type);
        obj.description = o.description ?? "";
        obj.params = { ...obj.params, ...(o.params ?? {}) };
        obj.refs = { ...obj.refs, ...(o.refs ?? {}) };
        if (o.count) obj.count = o.count;
        return obj;
      });
      return ms;
    }),
  });

  doc.ids.namespace = ns;
  doc.ids.internalName = sanitizeInternalName(displayName);
  doc.strings.displayName.text = displayName;
  doc.strings.description.text = t.description;
  doc.strings.completionNotification.text = t.completionNotification;

  if (t.rewardTrait && opts.rewardTraitId) {
    doc.rewardTrait = {
      source: "project",
      projectResourceId: opts.rewardTraitId,
      resourceKind: "Trait",
      expectedType: "Trait",
      label: opts.rewardTraitName ?? t.rewardTrait.name,
      tuningName: `${ns}:trait_${sanitizeInternalName(t.rewardTrait.name, "").replace(/^_/, "")}`,
      tuningId: "resolved-at-build",
    };
  }

  if (t.completionPoints > 0 && t.milestones.length) {
    const card = makeRewardCard("satisfaction", "aspiration", "", 0);
    card.name = "Completion reward";
    card.trigger = "completed";
    card.params = { ...card.params, points: t.completionPoints, notify: true };
    doc.gameplay = { ...doc.gameplay, rewards: [...doc.gameplay.rewards, card] };
  }

  return doc;
}
