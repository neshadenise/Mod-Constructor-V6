/**
 * Legacy → current trait document migration.
 *
 * Older builds stored a flat editor draft in `Trait.builderState`. Those
 * drafts still open: everything the old editor knew about is mapped onto the
 * new schema, and anything it never had starts empty rather than fabricated.
 */

import type { Trait } from "@/lib/types";
import {
  TRAIT_DOC_VERSION,
  blankTraitDoc,
  makeEffect,
  sanitizeInternalName,
  uid,
  type AgeId,
  type BuffEffect,
  type EmotionalEffect,
  type SkillEffect,
  type StatisticEffect,
  type TraitCategoryId,
  type TraitDoc,
  type TraitEffect,
  type TraitTypeId,
} from "./schema";

const AGE_KEYS: AgeId[] = ["infant", "toddler", "child", "teen", "youngAdult", "adult", "elder"];

const LEGACY_TYPE: Record<string, TraitTypeId> = {
  Personality: "personality",
  Gameplay: "gameplay",
  Hidden: "hidden",
  Aspiration: "aspiration_reward",
  Phase: "temporary",
  personality: "personality",
  gameplay: "gameplay",
  lifestyle: "lifestyle",
  bonus: "reward",
};

const LEGACY_CATEGORY = (v: unknown): TraitCategoryId => {
  const s = String(v ?? "Emotional");
  return (["Emotional", "Hobby", "Lifestyle", "Social", "Toddler", "Infant", "Custom"] as const).includes(
    s as TraitCategoryId,
  )
    ? (s as TraitCategoryId)
    : "Emotional";
};

const parseDuration = (v: unknown): number => {
  const s = String(v ?? "");
  if (/permanent/i.test(s)) return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

function isNewDoc(v: unknown): v is TraitDoc {
  return (
    !!v &&
    typeof v === "object" &&
    "version" in (v as Record<string, unknown>) &&
    typeof (v as { version?: unknown }).version === "number" &&
    "ids" in (v as Record<string, unknown>)
  );
}

/** Upgrade whatever is stored on a trait record into a current TraitDoc. */
export function migrateTraitDoc(rec: Trait): TraitDoc {
  const raw = rec.builderState as unknown;

  if (isNewDoc(raw)) {
    const doc = raw as TraitDoc;
    // Forward-compatible top-up for docs written by an older minor version.
    return {
      ...blankTraitDoc(),
      ...doc,
      version: TRAIT_DOC_VERSION,
      ids: { ...blankTraitDoc().ids, ...doc.ids, uuid: doc.ids.uuid || `trait_${rec.id}` },
      eligibility: { ...blankTraitDoc().eligibility, ...doc.eligibility },
      acquisition: {
        ...blankTraitDoc().acquisition,
        ...doc.acquisition,
        rewardStore: { ...blankTraitDoc().acquisition.rewardStore, ...doc.acquisition?.rewardStore },
        cas: { ...blankTraitDoc().acquisition.cas, ...doc.acquisition?.cas },
        removal: { ...blankTraitDoc().acquisition.removal, ...doc.acquisition?.removal },
      },
      strings: { ...blankTraitDoc().strings, ...doc.strings },
      effects: doc.effects ?? [],
      conflicts: doc.conflicts ?? [],
      requirements: doc.requirements ?? [],
      reactions: doc.reactions ?? [],
      compatibility: doc.compatibility ?? [],
    };
  }

  const legacy = (raw ?? {}) as Record<string, unknown>;
  const doc = blankTraitDoc();

  doc.ids.uuid = `trait_${rec.id}`;
  doc.displayName = String(legacy["name"] ?? rec.name ?? "Untitled Trait");
  doc.description = String(legacy["description"] ?? rec.description ?? "");
  doc.icon = String(legacy["icon"] ?? "");
  doc.ids.internalName = rec.internalId
    ? sanitizeInternalName(String(rec.internalId))
    : sanitizeInternalName(doc.displayName);
  doc.traitType = LEGACY_TYPE[String(legacy["traitType"] ?? rec.category ?? "Personality")] ?? "personality";
  doc.category = LEGACY_CATEGORY(legacy["category"]);
  doc.acquisition.cas.category = doc.category;

  const ages = legacy["ages"] as Record<string, boolean> | undefined;
  if (ages) doc.eligibility.ages = AGE_KEYS.filter((a) => ages[a]);
  else if (rec.ageGates?.length) {
    const map: Record<string, AgeId> = {
      teen: "teen",
      "young-adult": "youngAdult",
      adult: "adult",
      elder: "elder",
    };
    doc.eligibility.ages = rec.ageGates.map((g) => map[g]).filter(Boolean) as AgeId[];
  }

  const effects: TraitEffect[] = [];

  const legacyBuffs = (legacy["buffs"] as Record<string, unknown>[] | undefined) ?? [];
  const buffSource: Record<string, unknown>[] = legacyBuffs.length
    ? legacyBuffs
    : (rec.buffs ?? []).map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        emotion: b.emotion,
        weight: b.weight,
        duration: `${b.durationHours ?? 0}h`,
      }));

  for (const b of buffSource) {
    const e = makeEffect("buff") as BuffEffect;
    e.label = String(b["name"] ?? "Trait buff");
    e.mood = String(b["emotion"] ?? "Fine");
    e.moodWeight = Number(b["weight"] ?? 1);
    e.durationHours = parseDuration(b["duration"]);
    e.mode = e.durationHours === 0 ? "persistent-hidden" : "conditional";
    e.condition = String(
      ((b["rules"] as Record<string, unknown>[] | undefined) ?? [])
        .map((r) => r["condition"])
        .filter(Boolean)
        .join("; "),
    );
    e.notes = String(b["description"] ?? "");
    effects.push(e);
  }

  for (const m of (legacy["skillMults"] as Record<string, unknown>[] | undefined) ?? []) {
    const e = makeEffect("skill") as SkillEffect;
    e.label = `${String(m["skill"])} skill`;
    e.gainMultiplier = Number(m["mult"] ?? 1);
    effects.push(e);
  }

  for (const m of (legacy["needMults"] as Record<string, unknown>[] | undefined) ?? []) {
    const e = makeEffect("motive") as unknown as { label: string; value: number } & TraitEffect;
    e.label = String(m["need"] ?? "Motive");
    (e as unknown as { value: number }).value = Number(m["mult"] ?? 1);
    effects.push(e);
  }

  const commodities =
    (legacy["commodities"] as Record<string, unknown>[] | undefined) ??
    (rec.commodityWeights ?? []).map((c) => ({ commodity: c.commodity, weight: c.weight }));
  for (const c of commodities) {
    const e = makeEffect("statistic") as StatisticEffect;
    e.label = String(c["commodity"] ?? "Commodity");
    e.operation = "multiply";
    e.value = Number(c["weight"] ?? 1);
    effects.push(e);
  }

  for (const emo of (legacy["blockedEmotions"] as string[] | undefined) ?? []) {
    const e = makeEffect("emotional") as EmotionalEffect;
    e.label = `Blocks ${emo}`;
    e.emotion = emo;
    e.intensity = 0;
    e.condition = "Blocked emotion (legacy import)";
    effects.push(e);
  }

  doc.effects = effects;
  doc.strings.displayName.text = doc.displayName;
  doc.strings.description.text = doc.description;
  doc.acquisition.methods = doc.traitType === "hidden" ? ["hidden-only"] : ["cas"];
  doc.createdAt = rec.createdAt ?? Date.now();
  doc.updatedAt = rec.updatedAt ?? Date.now();

  const social = (legacy["socialInteractions"] as string[] | undefined) ?? rec.socialInteractions ?? [];
  for (const s of social) {
    const e = makeEffect("interaction-unlock");
    e.id = uid("eff");
    e.label = String(s);
    e.notes = "Imported from the previous builder — link a real interaction resource.";
    doc.effects.push(e);
  }

  return doc;
}
