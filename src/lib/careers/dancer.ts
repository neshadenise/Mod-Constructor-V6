/**
 * Fully built-out 10-level Dancer career with three specialization branches:
 * Stage Dancer, TikTok Star, and Choreographer.
 *
 * Ranks 1-4 are shared ("Studio Track"); each branch continues ranks 5-10,
 * so every path is a complete 10-level progression.
 */

import type { Career, CareerBranch, CareerLevel } from "@/lib/types";

type LevelSeed = Omit<CareerLevel, "id">;

const WEEKDAYS: CareerLevel["workDays"] = ["mon", "tue", "wed", "thu", "fri"];
const NIGHTS: CareerLevel["workDays"] = ["wed", "thu", "fri", "sat", "sun"];
const FLEX: CareerLevel["workDays"] = ["mon", "tue", "thu", "fri", "sat"];

const sharedLevels: LevelSeed[] = [
  {
    rank: 1,
    title: "Studio Sweeper",
    salary: 96,
    workStart: "08:00",
    workEnd: "14:00",
    workDays: WEEKDAYS,
    objectives: ["Stretch for 1 hour", "Practice Dance for 2 hours"],
    perks: ["Free studio access", "Dance skill gain +10%"],
  },
  {
    rank: 2,
    title: "Open Class Regular",
    salary: 152,
    workStart: "08:00",
    workEnd: "15:00",
    workDays: WEEKDAYS,
    objectives: ["Reach Dance skill 3", "Dance with another Sim"],
    perks: ["Energized after class", "Discounted dance wear"],
  },
  {
    rank: 3,
    title: "Backup Dancer",
    salary: 238,
    workStart: "10:00",
    workEnd: "18:00",
    workDays: FLEX,
    objectives: ["Reach Dance skill 5", "Perform at a venue"],
    perks: ["Rehearsal uniform unlocked", "Confident on arrival"],
  },
  {
    rank: 4,
    title: "Featured Dancer",
    salary: 341,
    workStart: "11:00",
    workEnd: "19:00",
    workDays: FLEX,
    objectives: ["Reach Dance skill 6", "Nail 3 routines in a row"],
    perks: ["Choose a specialization", "Fan mail events"],
  },
];

const stageLevels: LevelSeed[] = [
  {
    rank: 5,
    title: "Company Member",
    salary: 468,
    workStart: "13:00",
    workEnd: "22:00",
    workDays: NIGHTS,
    objectives: ["Rehearse for 3 hours", "Reach Dance skill 7"],
    perks: ["Company wardrobe", "Inspired before curtain"],
  },
  {
    rank: 6,
    title: "Corps Soloist",
    salary: 612,
    workStart: "13:00",
    workEnd: "22:00",
    workDays: NIGHTS,
    objectives: ["Perform a solo", "Keep Energy above 60% at work"],
    perks: ["Stage lighting cues", "Post-show applause moodlet"],
  },
  {
    rank: 7,
    title: "Principal Understudy",
    salary: 806,
    workStart: "12:00",
    workEnd: "22:00",
    workDays: NIGHTS,
    objectives: ["Reach Dance skill 8", "Cover a lead role"],
    perks: ["Private dressing room", "Focused rehearsal buff"],
  },
  {
    rank: 8,
    title: "Principal Dancer",
    salary: 1064,
    workStart: "12:00",
    workEnd: "23:00",
    workDays: NIGHTS,
    objectives: ["Headline a production", "Sign 3 autographs"],
    perks: ["Reputation boost", "Custom stage costume"],
  },
  {
    rank: 9,
    title: "Touring Star",
    salary: 1398,
    workStart: "14:00",
    workEnd: "23:00",
    workDays: NIGHTS,
    objectives: ["Reach Dance skill 9", "Complete a tour week"],
    perks: ["Travel stipend", "Global fanbase"],
  },
  {
    rank: 10,
    title: "Prima Ballerina / Danseur",
    salary: 1840,
    workStart: "15:00",
    workEnd: "23:00",
    workDays: ["thu", "fri", "sat", "sun"],
    objectives: ["Reach Dance skill 10", "Receive a standing ovation"],
    perks: ["Name on the marquee", "Permanent Confident aura", "Legacy gala invitations"],
  },
];

const tiktokLevels: LevelSeed[] = [
  {
    rank: 5,
    title: "Trend Chaser",
    salary: 430,
    workStart: "11:00",
    workEnd: "17:00",
    workDays: ["mon", "tue", "wed", "thu", "fri"],
    objectives: ["Film 2 dance clips", "Reach Dance skill 7"],
    perks: ["Work from home", "Ring light unlocked"],
  },
  {
    rank: 6,
    title: "Micro-Influencer",
    salary: 585,
    workStart: "11:00",
    workEnd: "17:00",
    workDays: ["mon", "tue", "wed", "thu", "fri"],
    objectives: ["Post a duet", "Gain 3 followers"],
    perks: ["Brand freebies", "Playful while filming"],
  },
  {
    rank: 7,
    title: "Viral Creator",
    salary: 792,
    workStart: "12:00",
    workEnd: "18:00",
    workDays: FLEX,
    objectives: ["Land a viral clip", "Reach Dance skill 8"],
    perks: ["Sponsorship offers", "Camera skill gain +15%"],
  },
  {
    rank: 8,
    title: "Sponsored Talent",
    salary: 1035,
    workStart: "12:00",
    workEnd: "18:00",
    workDays: FLEX,
    objectives: ["Complete a brand deal", "Collab with another Sim"],
    perks: ["Monthly sponsor payout", "Free wardrobe drops"],
  },
  {
    rank: 9,
    title: "Dance Trend Setter",
    salary: 1352,
    workStart: "13:00",
    workEnd: "19:00",
    workDays: FLEX,
    objectives: ["Start a dance challenge", "Reach Dance skill 9"],
    perks: ["Trend royalties", "Inspired when filming"],
  },
  {
    rank: 10,
    title: "TikTok Star",
    salary: 1725,
    workStart: "13:00",
    workEnd: "19:00",
    workDays: ["tue", "wed", "thu", "fri"],
    objectives: ["Reach Dance skill 10", "Host a livestream event"],
    perks: ["Full remote schedule", "Celebrity recognition", "Merch line income"],
  },
];

const choreoLevels: LevelSeed[] = [
  {
    rank: 5,
    title: "Rehearsal Assistant",
    salary: 452,
    workStart: "09:00",
    workEnd: "17:00",
    workDays: WEEKDAYS,
    objectives: ["Reach Dance skill 7", "Coach a Sim"],
    perks: ["Studio key", "Focused while planning"],
  },
  {
    rank: 6,
    title: "Routine Builder",
    salary: 598,
    workStart: "09:00",
    workEnd: "17:00",
    workDays: WEEKDAYS,
    objectives: ["Write a routine", "Run a group rehearsal"],
    perks: ["Logic skill gain +10%", "Custom routine board"],
  },
  {
    rank: 7,
    title: "Company Choreographer",
    salary: 812,
    workStart: "10:00",
    workEnd: "18:00",
    workDays: WEEKDAYS,
    objectives: ["Reach Dance skill 8", "Stage a full number"],
    perks: ["Casting authority", "Inspired at the studio"],
  },
  {
    rank: 8,
    title: "Creative Director",
    salary: 1090,
    workStart: "10:00",
    workEnd: "18:00",
    workDays: WEEKDAYS,
    objectives: ["Direct a showcase", "Mentor 2 dancers"],
    perks: ["Assistant hired", "Charisma gain +15%"],
  },
  {
    rank: 9,
    title: "Show Producer",
    salary: 1436,
    workStart: "10:00",
    workEnd: "19:00",
    workDays: WEEKDAYS,
    objectives: ["Reach Dance skill 9", "Produce a sold-out show"],
    perks: ["Production budget", "Networking events"],
  },
  {
    rank: 10,
    title: "Master Choreographer",
    salary: 1910,
    workStart: "11:00",
    workEnd: "18:00",
    workDays: ["mon", "tue", "wed", "thu"],
    objectives: ["Reach Dance skill 10", "Choreograph a world tour"],
    perks: ["Sets the season's style", "Awards circuit invitations", "Legacy studio named after you"],
  },
];

export interface DancerCareerOptions {
  projectId: string;
  /** Unique id generator (store `uid`). */
  uid: () => string;
  /** Creation timestamp. */
  stamp: number;
}

export function makeDancerCareer({ projectId, uid, stamp }: DancerCareerOptions): Career {
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
    name: "Dancer",
    internalId: "dancer",
    description:
      "From sweeping the studio to selling out theaters. Train through four shared ranks, then specialize as a Stage Dancer, TikTok Star, or Choreographer.",
    careerType: "standard",
    ageGates: ["teen", "youngadult", "adult", "elder"] as Career["ageGates"],
    branches: [
      branch("Studio Track", "Shared ranks 1-4 before choosing a specialization.", sharedLevels),
      branch(
        "Stage Dancer",
        "Ranks 5-10 — company life, night performances, and principal roles.",
        stageLevels,
      ),
      branch(
        "TikTok Star",
        "Ranks 5-10 — work-from-home content creation, brand deals, and viral trends.",
        tiktokLevels,
      ),
      branch(
        "Choreographer",
        "Ranks 5-10 — build routines, direct shows, and mentor other dancers.",
        choreoLevels,
      ),
    ],
    messageOverrides: [
      { key: "promotion", text: "The routine landed. You're moving up the call sheet." },
      { key: "demotion", text: "Missed one too many rehearsals. Back to the barre." },
      { key: "branchChoice", text: "Time to choose: the stage, the camera, or the counts." },
      { key: "dailyReport", text: "Another long day of eight-counts. Your feet know it." },
    ],
    workFromHomeEvents: [
      { id: uid(), name: "Film a dance clip", weight: 3, outcomes: ["Clip goes viral", "Reshoot needed"] },
      { id: uid(), name: "Home rehearsal", weight: 2, outcomes: ["Routine locked in", "Pulled a muscle"] },
      { id: uid(), name: "Brand check-in call", weight: 1, outcomes: ["Deal extended", "Notes to address"] },
    ],
    createdAt: stamp,
    updatedAt: stamp,
  };
}
