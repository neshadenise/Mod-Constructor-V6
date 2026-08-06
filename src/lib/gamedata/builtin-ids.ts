/**
 * Curated built-in game reference IDs.
 *
 * Hand-verified base-game instance IDs so reference pickers work on a machine
 * that has never been online and has no Sims 4 install indexed. Small on
 * purpose: these are the references our builders reach for most often. Lot51
 * lookups and a local index both extend this set at runtime.
 */

import type { GameRef } from "./types";

function ref(id: string, name: string, kind: GameRef["kind"], module: string): GameRef {
  return { id, name, kind, module, source: "builtin" };
}

export const BUILTIN_REFS: GameRef[] = [
  // Moods — the most common mood_type targets for custom buffs.
  ref("14632", "Happy", "buff", "moods.mood"),
  ref("14634", "Sad", "buff", "moods.mood"),
  ref("14635", "Angry", "buff", "moods.mood"),
  ref("14636", "Embarrassed", "buff", "moods.mood"),
  ref("14637", "Energized", "buff", "moods.mood"),
  ref("14638", "Flirty", "buff", "moods.mood"),
  ref("14639", "Focused", "buff", "moods.mood"),
  ref("14640", "Inspired", "buff", "moods.mood"),
  ref("14641", "Playful", "buff", "moods.mood"),
  ref("14642", "Tense", "buff", "moods.mood"),
  ref("14643", "Confident", "buff", "moods.mood"),
  ref("14644", "Bored", "buff", "moods.mood"),
  ref("14645", "Uncomfortable", "buff", "moods.mood"),
  ref("14646", "Dazed", "buff", "moods.mood"),
  ref("14647", "Fine", "buff", "moods.mood"),

  // Motives — statistics used in initial_commodities and buff effects.
  ref("16652", "Hunger", "statistic", "statistics.commodity"),
  ref("16654", "Energy", "statistic", "statistics.commodity"),
  ref("16656", "Bladder", "statistic", "statistics.commodity"),
  ref("16657", "Hygiene", "statistic", "statistics.commodity"),
  ref("16655", "Fun", "statistic", "statistics.commodity"),
  ref("16653", "Social", "statistic", "statistics.commodity"),

  // Major skills — common promotion requirements.
  ref("16693", "Skill_Fitness", "statistic", "statistics.skill"),
  ref("16659", "Skill_Charisma", "statistic", "statistics.skill"),
  ref("16700", "Skill_Comedy", "statistic", "statistics.skill"),
  ref("16665", "Skill_Cooking", "statistic", "statistics.skill"),
  ref("16704", "Skill_Gourmet_Cooking", "statistic", "statistics.skill"),
  ref("16694", "Skill_Guitar", "statistic", "statistics.skill"),
  ref("16673", "Skill_Handiness", "statistic", "statistics.skill"),
  ref("16705", "Skill_Logic", "statistic", "statistics.skill"),
  ref("16706", "Skill_Mischief", "statistic", "statistics.skill"),
  ref("16699", "Skill_Painting", "statistic", "statistics.skill"),
  ref("16701", "Skill_Piano", "statistic", "statistics.skill"),
  ref("16702", "Skill_Programming", "statistic", "statistics.skill"),
  ref("16703", "Skill_Video_Gaming", "statistic", "statistics.skill"),
  ref("16698", "Skill_Violin", "statistic", "statistics.skill"),
  ref("16695", "Skill_Writing", "statistic", "statistics.skill"),
  ref("16719", "Skill_Dancing", "statistic", "statistics.skill"),
  ref("16720", "Skill_Photography", "statistic", "statistics.skill"),

  // Reference careers — useful as "model this on…" targets.
  ref("34115", "career_Adult_Astronaut", "career", "careers.career_tuning"),
  ref("34116", "career_Adult_Business", "career", "careers.career_tuning"),
  ref("34117", "career_Adult_Criminal", "career", "careers.career_tuning"),
  ref("34118", "career_Adult_Culinary", "career", "careers.career_tuning"),
  ref("34119", "career_Adult_Entertainer", "career", "careers.career_tuning"),
  ref("34120", "career_Adult_Painter", "career", "careers.career_tuning"),
  ref("34121", "career_Adult_SecretAgent", "career", "careers.career_tuning"),
  ref("34122", "career_Adult_TechGuru", "career", "careers.career_tuning"),
  ref("34123", "career_Adult_Writer", "career", "careers.career_tuning"),
];

export function searchBuiltins(query: string, kind?: GameRef["kind"]): GameRef[] {
  const q = query.trim().toLowerCase();
  return BUILTIN_REFS.filter((r) => {
    if (kind && r.kind !== kind) return false;
    if (!q) return true;
    return r.name.toLowerCase().includes(q) || r.id === q;
  });
}
