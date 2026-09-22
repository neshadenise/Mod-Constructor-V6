/**
 * Builder → record projection.
 *
 * Every builder edits a rich, UI-shaped draft (CareerDraft, TraitDoc,
 * AspirationDoc). That draft round-trips through `builderState`, which is
 * opaque to everything else — the exporter never reads it.
 *
 * This module is the one place that lowers a draft onto the canonical typed
 * fields of `Career` / `Trait` / `Aspiration` in `src/lib/types.ts`, which is
 * what `modexport/serializers.ts` validates and compiles. Without it a career
 * authored entirely in the builder exports as an empty shell.
 *
 * Rules:
 *  - nothing is invented: a field the creator never filled in stays empty so
 *    validation can flag it, rather than shipping plausible-looking junk;
 *  - projection is pure and total — it never throws on a partial draft.
 */

import type {
  AgeGate,
  Aspiration,
  Buff,
  Career,
  CareerBranch,
  CareerLevel,
  CareerMessage,
  EmotionalWeight,
  Milestone,
  Trait,
  TraitCategory,
} from "@/lib/types";

/* ------------------------------------------------------------------ util */

const DAY_ORDER = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
type DayKey = (typeof DAY_ORDER)[number];

/** Stable machine name from a display name; empty in, empty out. */
export function slugId(name: string, prefix: string): string {
  const slug = String(name ?? "")
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug ? `${prefix}_${slug}` : "";
}

const clampHour = (n: number) => ((Math.round(Number(n) || 0) % 24) + 24) % 24;
const hhmm = (h: number, m = 0) =>
  `${String(clampHour(h)).padStart(2, "0")}:${String(Math.max(0, Math.min(59, Math.round(Number(m) || 0)))).padStart(2, "0")}`;

/* ---------------------------------------------------------------- career */

/** The subset of the Career Builder draft that carries exportable data. */
export interface CareerDraftShape {
  name?: string;
  description?: string;
  category?: string;
  careerType?: string;
  icon?: string;
  coverImage?: string;
  ages?: Record<string, boolean>;
  messages?: Record<string, { enabled: boolean; text: string }>;
  branches?: CareerDraftBranch[];
}

export interface CareerDraftBranch {
  id?: string;
  name?: string;
  description?: string;
  ranks?: CareerDraftRank[];
  children?: CareerDraftBranch[];
}

export interface CareerDraftRank {
  lvl?: number;
  title?: string;
  description?: string;
  simoleonsPerHour?: number;
  beginHour?: number;
  beginMinute?: number;
  durationHours?: number;
  days?: boolean[];
  uniform?: string;
  objectiveSet?: string;
  promotionReward?: string;
}

/** Editor age keys ("YoungAdult") → canonical gates ("young-adult"). */
const AGE_KEY_TO_GATE: Record<string, AgeGate> = {
  Teen: "teen",
  teen: "teen",
  YoungAdult: "young-adult",
  youngAdult: "young-adult",
  Adult: "adult",
  adult: "adult",
  Elder: "elder",
  elder: "elder",
};

function gatesFrom(record: Record<string, boolean> | undefined): AgeGate[] {
  const out: AgeGate[] = [];
  for (const [key, on] of Object.entries(record ?? {})) {
    const gate = AGE_KEY_TO_GATE[key];
    if (on && gate && !out.includes(gate)) out.push(gate);
  }
  return out;
}

function gatesFromList(ages: readonly string[] | undefined): AgeGate[] {
  const out: AgeGate[] = [];
  for (const a of ages ?? []) {
    const gate = AGE_KEY_TO_GATE[a];
    if (gate && !out.includes(gate)) out.push(gate);
  }
  return out;
}

function projectLevels(branchId: string, ranks: CareerDraftRank[] | undefined): CareerLevel[] {
  return (ranks ?? []).map((r, i) => {
    const begin = clampHour(r.beginHour ?? 9);
    const duration = Math.max(0, Number(r.durationHours) || 0);
    const days: DayKey[] = DAY_ORDER.filter((_, idx) => (r.days ?? [])[idx] === true);
    const objectives = [r.objectiveSet, r.description]
      .map((s) => String(s ?? "").trim())
      .filter((s) => s.length > 0 && s !== "—");
    const perks = String(r.promotionReward ?? "").trim();
    return {
      id: `${branchId}_lvl${r.lvl ?? i + 1}`,
      rank: Number(r.lvl) || i + 1,
      title: String(r.title ?? "").trim(),
      salary: Math.max(0, Math.round(Number(r.simoleonsPerHour) || 0)),
      workStart: hhmm(begin, r.beginMinute ?? 0),
      workEnd: hhmm(begin + duration, r.beginMinute ?? 0),
      workDays: days,
      uniformMasculine: r.uniform ? String(r.uniform) : undefined,
      objectives,
      perks: perks ? [perks] : [],
    } satisfies CareerLevel;
  });
}

/** Flatten the branch tree — nested tracks become peer branches. */
function flattenBranches(
  nodes: CareerDraftBranch[] | undefined,
  acc: CareerBranch[] = [],
  prefix = "",
): CareerBranch[] {
  (nodes ?? []).forEach((b, i) => {
    const id = String(b.id ?? `${prefix}b${i + 1}`);
    acc.push({
      id,
      name: String(b.name ?? "").trim(),
      description: String(b.description ?? "").trim(),
      levels: projectLevels(id, b.ranks),
    });
    if (b.children?.length) flattenBranches(b.children, acc, `${id}_`);
  });
  return acc;
}

export function projectCareerDraft(draft: CareerDraftShape): Partial<Career> {
  const name = String(draft.name ?? "").trim();
  const messageOverrides: CareerMessage[] = Object.entries(draft.messages ?? {})
    .filter(([, v]) => v?.enabled && String(v.text ?? "").trim())
    .map(([key, v]) => ({ key, text: String(v.text).trim() }));

  return {
    name,
    internalId: slugId(name, "career"),
    description: String(draft.description ?? "").trim(),
    category: String(draft.category ?? "").trim(),
    careerType: String(draft.careerType ?? "").trim() || "FullTime",
    ageGates: gatesFrom(draft.ages),
    coverImage: draft.coverImage,
    branches: flattenBranches(draft.branches),
    messageOverrides,
  } as Partial<Career>;
}

/* ----------------------------------------------------------------- trait */

const TRAIT_CATEGORY_MAP: Record<string, TraitCategory> = {
  Emotional: "personality",
  Social: "personality",
  Hobby: "lifestyle",
  Lifestyle: "lifestyle",
  Toddler: "gameplay",
  Infant: "gameplay",
  Custom: "gameplay",
};

const EMOTIONS: EmotionalWeight[] = [
  "flirty", "happy", "sad", "angry", "confident", "focused", "playful",
  "uncomfortable", "bored", "energized", "inspired", "dazed", "embarrassed",
  "asleep", "fine",
];

function toEmotion(mood: unknown): EmotionalWeight {
  const m = String(mood ?? "").toLowerCase().trim();
  return (EMOTIONS.find((e) => e === m) ?? "fine") as EmotionalWeight;
}

/** The subset of TraitDoc the canonical record needs. */
export interface TraitDocShape {
  displayName?: string;
  description?: string;
  category?: string;
  icon?: string;
  ids?: { internalName?: string };
  eligibility?: { ages?: string[] };
  effects?: {
    id?: string;
    kind?: string;
    enabled?: boolean;
    label?: string;
    mood?: string;
    moodWeight?: number;
    durationHours?: number;
    condition?: string;
  }[];
}

export function projectTraitDoc(doc: TraitDocShape): Partial<Trait> {
  const name = String(doc.displayName ?? "").trim();
  const buffs: Buff[] = (doc.effects ?? [])
    .filter((e) => e.kind === "buff" && e.enabled !== false)
    .map((e, i) => ({
      id: String(e.id ?? `buff_${i + 1}`),
      name: String(e.label ?? "").trim(),
      description: String(e.condition ?? "").trim(),
      emotion: toEmotion(e.mood),
      weight: Math.max(0, Number(e.moodWeight) || 0),
      durationHours: Math.max(0, Number(e.durationHours) || 0),
    }));

  const unlocks = (doc.effects ?? [])
    .filter((e) => e.kind === "interaction-unlock" && e.enabled !== false)
    .map((e) => String(e.label ?? "").trim())
    .filter(Boolean);

  return {
    name,
    internalId: String(doc.ids?.internalName ?? "").trim() || slugId(name, "trait"),
    description: String(doc.description ?? "").trim(),
    category: TRAIT_CATEGORY_MAP[String(doc.category)] ?? "gameplay",
    ageGates: gatesFromList(doc.eligibility?.ages),
    buffs,
    socialInteractions: unlocks,
  } as Partial<Trait>;
}

/* ------------------------------------------------------------ aspiration */

/** The subset of AspirationDoc the canonical record needs. */
export interface AspirationDocShape {
  displayName?: string;
  description?: string;
  category?: string;
  ids?: { internalName?: string };
  milestones?: {
    id?: string;
    uuid?: string;
    title?: string;
    description?: string;
    order?: number;
    objectives?: { label?: string; description?: string }[];
  }[];
}

export function projectAspirationDoc(doc: AspirationDocShape): Partial<Aspiration> {
  const name = String(doc.displayName ?? "").trim();
  const milestones: Milestone[] = (doc.milestones ?? []).map((m, i) => ({
    id: String(m.uuid ?? m.id ?? `milestone_${i + 1}`),
    order: Number(m.order ?? i) || i,
    name: String(m.title ?? "").trim(),
    description: String(m.description ?? "").trim(),
    objectives: (m.objectives ?? [])
      .map((o) => String(o.label ?? o.description ?? "").trim())
      .filter(Boolean),
  }));

  return {
    name,
    internalId: String(doc.ids?.internalName ?? "").trim() || slugId(name, "aspiration"),
    description: String(doc.description ?? "").trim(),
    category: String(doc.category ?? "").trim(),
    milestones,
  } as Partial<Aspiration>;
}

/* ---------------------------------------------- legacy V5 trait draft --- */

/** The V5-parity trait editor keeps its own draft shape. */
export interface TraitDraftV5Shape {
  name?: string;
  description?: string;
  category?: string;
  ages?: Record<string, boolean>;
  blockAging?: Record<string, boolean>;
  blockedEmotions?: string[];
  voiceEffect?: string;
  socialInteractions?: string[];
  commodities?: { commodity: string; weight: number }[];
  buffReplacements?: { from: string; to: string }[];
  buffs?: {
    id?: string;
    name?: string;
    description?: string;
    emotion?: string;
    weight?: number;
    duration?: string;
    rules?: unknown[];
  }[];
}

/** "4h" → 4, "Permanent" → 1000 (the sentinel the V5 editor round-trips). */
function parseDuration(d: unknown): number {
  const s = String(d ?? "").trim();
  if (/^perm/i.test(s)) return 1000;
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function projectTraitDraftV5(draft: TraitDraftV5Shape): Partial<Trait> {
  const name = String(draft.name ?? "").trim();
  return {
    name,
    internalId: slugId(name, "trait"),
    description: String(draft.description ?? "").trim(),
    category: TRAIT_CATEGORY_MAP[String(draft.category)] ?? "personality",
    ageGates: gatesFrom(draft.ages),
    buffs: (draft.buffs ?? []).map((b, i) => ({
      id: String(b.id ?? `b${i + 1}`),
      name: String(b.name ?? "").trim(),
      description: String(b.description ?? "").trim(),
      emotion: toEmotion(b.emotion),
      weight: Math.max(0, Number(b.weight) || 0),
      durationHours: parseDuration(b.duration),
      rules: (b.rules ?? []) as Buff["rules"],
    })),
    socialInteractions: (draft.socialInteractions ?? []).map(String).filter(Boolean),
    commodityWeights: draft.commodities ?? [],
    buffReplacements: draft.buffReplacements ?? [],
    blockedAges: gatesFrom(draft.blockAging),
    voiceEffect: draft.voiceEffect && draft.voiceEffect !== "None" ? draft.voiceEffect : undefined,
  } as Partial<Trait>;
}
