/**
 * Ministry career — 5 levels, branch point after level 3.
 *
 * Shared ranks 1-3 ("Ministry Track") then three specializations that each
 * continue with ranks 4-5: Church Leadership, Hospitality Ministry, and
 * Worship & Creative Arts. Every promotion requirement uses existing EA
 * skills and interactions from official packs.
 */

import type { Career, CareerBranch, CareerLevel } from "@/lib/types";

type LevelSeed = Omit<CareerLevel, "id">;

const D = (...days: CareerLevel["workDays"]) => days;

const sharedLevels: LevelSeed[] = [
  {
    rank: 1,
    title: "Ministry Volunteer",
    salary: 18,
    workStart: "09:00",
    workEnd: "14:00",
    workDays: D("wed", "fri", "sun"),
    objectives: [
      "Charisma Level 2",
      "Cooking Level 2",
      "Perform 5 Friendly Socials",
      "Daily Task: Socialize with Sims",
    ],
    perks: [
      "You're the extra pair of hands every church needs — greeting people at the door, helping with food, cleaning up after events.",
    ],
  },
  {
    rank: 2,
    title: "Ministry Assistant",
    salary: 25,
    workStart: "09:00",
    workEnd: "15:00",
    workDays: D("tue", "wed", "fri", "sun"),
    objectives: [
      "Charisma Level 3",
      "Cooking Level 3",
      "Writing Level 2",
      "Have 3 Friends",
      "Prepare 3 Meals",
      "Daily Task: Build Relationships",
    ],
    perks: [
      "A regular place on the ministry team, learning church service and community outreach alongside experienced staff.",
    ],
  },
  {
    rank: 3,
    title: "Ministry Coordinator",
    salary: 38,
    workStart: "09:00",
    workEnd: "16:00",
    workDays: D("tue", "wed", "thu", "sun"),
    objectives: [
      "Charisma Level 5",
      "Cooking Level 4",
      "Writing Level 3",
      "Have 5 Friends",
      "Reach Good Friend status with 1 coworker",
      "Daily Task: Socialize with Coworkers",
    ],
    perks: [
      "Trusted to take responsibility instead of waiting to be told. Time to specialize.",
      "Branch point — choose Church Leadership, Hospitality Ministry, or Worship & Creative Arts.",
    ],
  },
];

const leadershipLevels: LevelSeed[] = [
  {
    rank: 4,
    title: "Associate Minister",
    salary: 58,
    workStart: "09:00",
    workEnd: "16:00",
    workDays: D("tue", "wed", "thu", "sun"),
    objectives: [
      "Charisma Level 7",
      "Research & Debate Level 4",
      "Writing Level 5",
      "Give 3 Speeches",
      "Mentor another Sim 3 Times",
      "Have 8 Friends",
      "Daily Task: Practice Speech",
    ],
    perks: [
      "Formal church leadership — support the Pastor, build congregation relationships, and speak confidently in front of others.",
    ],
  },
  {
    rank: 5,
    title: "Pastor",
    salary: 105,
    workStart: "09:00",
    workEnd: "15:00",
    workDays: D("tue", "wed", "thu", "sun"),
    objectives: [
      "Career Target: Charisma Level 10",
      "Career Target: Research & Debate Level 7",
      "Career Target: Writing Level 7",
      "Daily Task: Give Speech",
    ],
    perks: [
      "The congregation is under your leadership — primary public speaker, mentor, administrator, community leader.",
      "Gameplay: Give Speech, Practice Speech, Mentor, Give Advice, Give Pep Talk, Deep Conversation, Research, Debate",
    ],
  },
];

const hospitalityLevels: LevelSeed[] = [
  {
    rank: 4,
    title: "Hospitality Coordinator",
    salary: 48,
    workStart: "08:00",
    workEnd: "15:00",
    workDays: D("wed", "thu", "fri", "sun"),
    objectives: [
      "Cooking Level 6",
      "Gourmet Cooking Level 4",
      "Charisma Level 4",
      "Prepare 5 Excellent Meals",
      "Cook with another Sim 3 Times",
      "Daily Task: Prepare Food",
    ],
    perks: [
      "Food brings a congregation together — organize meals and make fellowship events feel welcoming.",
    ],
  },
  {
    rank: 5,
    title: "Director of Hospitality Services",
    salary: 80,
    workStart: "08:00",
    workEnd: "15:00",
    workDays: D("wed", "thu", "fri", "sun"),
    objectives: [
      "Career Target: Cooking Level 9",
      "Career Target: Gourmet Cooking Level 7",
      "Career Target: Baking Level 5",
      "Career Target: Charisma Level 6",
      "Daily Task: Cook Meals",
    ],
    perks: [
      "Oversee hospitality and food-service operations from Sunday fellowship to major church events.",
      "Gameplay: Cook, Gourmet Cooking, Bake, Cook Together, Serve Meal, Call to Meal, Clean Up, Mentor Cooking",
    ],
  },
];

const worshipLevels: LevelSeed[] = [
  {
    rank: 4,
    title: "Worship Arts Coordinator",
    salary: 50,
    workStart: "10:00",
    workEnd: "16:00",
    workDays: D("wed", "thu", "fri", "sun"),
    objectives: [
      "Singing Level 5",
      "Dancing Level 4",
      "Charisma Level 5",
      "Piano OR Guitar Level 4",
      "Perform Music 3 Times",
      "Perform a Group Dance",
      "Daily Task: Practice Singing",
    ],
    perks: [
      "Shape the creative side of worship through music, vocals, dance, and performance.",
    ],
  },
  {
    rank: 5,
    title: "Director of Worship Arts",
    salary: 84,
    workStart: "10:00",
    workEnd: "15:00",
    workDays: D("wed", "thu", "fri", "sun"),
    objectives: [
      "Career Target: Singing Level 8",
      "Career Target: Dancing Level 6",
      "Career Target: Charisma Level 7",
      "Career Target: Piano OR Guitar Level 7",
      "Daily Task: Perform Music",
    ],
    perks: [
      "Bring vocalists, musicians, dancers, and performers into a unified worship program.",
      "Gameplay: Practice Singing, Sing Songs, Play Piano, Play Guitar, Perform, Jam, Dance, Dance Together, Group Dance, Show Off Moves, Write Songs, Mentor music skills",
    ],
  },
];

export interface MinistryCareerOptions {
  projectId: string;
  /** Unique id generator (store `uid`). */
  uid: () => string;
  /** Creation timestamp. */
  stamp: number;
}

export const MINISTRY_INTERNAL_ID = "ministry";

export function makeMinistryCareer({ projectId, uid, stamp }: MinistryCareerOptions): Career {
  const toLevels = (seeds: LevelSeed[]): CareerLevel[] =>
    seeds.map((l) => ({ ...l, id: uid(), workDays: [...l.workDays] }));

  const branch = (name: string, description: string, seeds: LevelSeed[]): CareerBranch => ({
    id: uid(),
    name,
    description,
    levels: toLevels(seeds),
  });

  return {
    id: uid(),
    projectId,
    name: "Ministry",
    internalId: MINISTRY_INTERNAL_ID,
    description:
      "Full-time church ministry. Three shared levels of volunteering and coordination, then specialize after Level 3 as Church Leadership, Hospitality Ministry, or Worship & Creative Arts.",
    careerType: "standard",
    ageGates: ["young-adult", "adult", "elder"] as Career["ageGates"],
    branches: [
      branch("Ministry Track", "Shared levels 1-3 before the branch point.", sharedLevels),
      branch(
        "Church Leadership",
        "Levels 4-5 — pastoral leadership, public speaking, and church administration.",
        leadershipLevels,
      ),
      branch(
        "Hospitality Ministry",
        "Levels 4-5 — church meals, kitchen operations, and fellowship events.",
        hospitalityLevels,
      ),
      branch(
        "Worship & Creative Arts",
        "Levels 4-5 — choir, musicians, praise dance, and worship performance.",
        worshipLevels,
      ),
    ],
    messageOverrides: [
      { key: "promotion", text: "The ministry team is glad to have you — you've been promoted." },
      { key: "demotion", text: "Attendance slipped, and so did your responsibilities." },
      { key: "branchChoice", text: "Leadership, hospitality, or worship arts — where are you called?" },
      { key: "dailyReport", text: "A full day of service. The congregation noticed." },
    ],
    workFromHomeEvents: [
      { id: uid(), name: "Write this week's message", weight: 3, outcomes: ["Message lands beautifully", "Needs another draft"] },
      { id: uid(), name: "Plan the fellowship menu", weight: 2, outcomes: ["Menu approved", "Budget cut the dessert"] },
      { id: uid(), name: "Rehearse with the worship team", weight: 2, outcomes: ["Harmonies locked in", "Sound issues to fix"] },
    ],
    createdAt: stamp,
    updatedAt: stamp,
  };
}

/**
 * Template payload form — deterministic ids, no project binding. Used by the
 * Templates workspace to scaffold a Ministry career into the active project.
 */
export function ministryCareerPayload(): Omit<
  Career,
  "id" | "projectId" | "createdAt" | "updatedAt"
> {
  let n = 0;
  const seq = () => `min_${++n}`;
  const { id: _id, projectId: _p, createdAt: _c, updatedAt: _u, ...rest } =
    makeMinistryCareer({ projectId: "", uid: seq, stamp: 0 });
  return rest;
}
