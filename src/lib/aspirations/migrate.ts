/**
 * Legacy → current aspiration document migration.
 *
 * Older builds stored a flat editor draft in `Aspiration.builderState`, and
 * the store itself keeps a simplified milestone list. Both still open: what
 * the old shapes knew about is mapped onto the new schema, and anything they
 * never had starts empty rather than fabricated.
 */

import type { Aspiration } from "@/lib/types";
import { normalizeGameplay } from "./gameplay";
import {
  ASPIRATION_CATEGORIES,
  ASPIRATION_DOC_VERSION,
  ROMAN,
  blankAspirationDoc,
  makeMilestone,
  makeObjective,
  normalizeMilestones,

  sanitizeInternalName,
  type AspirationCategoryId,
  type AspirationDoc,
  type AspirationMilestone,
} from "./schema";

function isNewDoc(v: unknown): v is AspirationDoc {
  return (
    !!v &&
    typeof v === "object" &&
    "ids" in (v as Record<string, unknown>) &&
    "milestones" in (v as Record<string, unknown>) &&
    typeof (v as AspirationDoc).version === "number"
  );
}

const asCategory = (v: unknown): AspirationCategoryId => {
  const s = String(v ?? "");
  const hit = ASPIRATION_CATEGORIES.find((c) => c.toLowerCase() === s.toLowerCase());
  return hit ?? "Custom";
};

type LegacyTier = { t?: string; title?: string; goals?: unknown[]; done?: boolean };

function tiersToMilestones(tiers: LegacyTier[]): AspirationMilestone[] {
  return tiers.map((tier, i) => {
    const ms = makeMilestone(i, String(tier.title ?? `Milestone ${i + 1}`));
    ms.tier = String(tier.t ?? ROMAN[i] ?? i + 1);
    ms.objectives = (tier.goals ?? []).map((g) => makeObjective(String(g)));
    return ms;
  });
}

/** Always returns a valid current-schema document. */
export function migrateAspirationDoc(rec: Aspiration): AspirationDoc {
  const state = rec.builderState as unknown;
  if (isNewDoc(state)) {
    // Keep the record name authoritative — it is what the rest of the app shows.
    // Part 1 documents only knew about flat milestones: normalising fills in the
    // Part 2 fields (uuids, goal types, rewards, unlocks) without inventing data.
    return {
      ...state,
      version: ASPIRATION_DOC_VERSION,
      displayName: rec.name || state.displayName,
      milestones: normalizeMilestones(state.milestones ?? []),
      // Part 3 gameplay is normalised on load so older docs gain the empty
      // rewards/loot/notification workspaces instead of crashing the editor.
      gameplay: normalizeGameplay(state.gameplay),
    };
  }


  const legacy = (state ?? {}) as Record<string, unknown>;
  const tiers = Array.isArray(legacy["tiers"]) ? (legacy["tiers"] as LegacyTier[]) : [];

  const milestones = tiers.length
    ? tiersToMilestones(tiers)
    : (rec.milestones ?? []).map((m, i) => {
        const ms = makeMilestone(i, m.name || `Milestone ${i + 1}`);
        ms.description = m.description ?? "";
        ms.objectives = (m.objectives ?? []).map((o) => makeObjective(String(o)));
        return ms;
      });

  const name = rec.name || String(legacy["name"] ?? "Untitled Aspiration");
  const description = rec.description || String(legacy["description"] ?? "");

  const doc = blankAspirationDoc({
    version: ASPIRATION_DOC_VERSION,
    displayName: name,
    description,
    category: asCategory(rec.category ?? legacy["category"]),
    milestones,
  });

  doc.ids.internalName = rec.internalId
    ? sanitizeInternalName(rec.internalId)
    : sanitizeInternalName(name);
  doc.ids.uuid = `aspiration_${rec.id}`;
  doc.strings.displayName.text = name;
  doc.strings.description.text = description;
  doc.createdAt = rec.createdAt ?? Date.now();
  doc.updatedAt = rec.updatedAt ?? Date.now();
  return doc;
}
