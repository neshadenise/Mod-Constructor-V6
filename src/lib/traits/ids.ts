/**
 * Trait identity service.
 *
 * The creator types names; this module owns every number. Tuning names,
 * instance ids and the SimData pair are all derived deterministically from
 * `namespace + internalName`, so an unchanged trait always rebuilds to the
 * same keys. Nothing here is called during routine saving — keys are computed
 * on demand for display, validation and export.
 */

import {
  GROUP_DEFAULT,
  ResourceIdService,
  TYPE_SIMDATA,
  TYPE_TUNING,
  fnv1a32,
  fnv1a64,
  hex32,
  hex64,
  localizationKey,
  withHighBit,
} from "@/lib/modexport/ids";
import type { ResourceKey } from "@/lib/modimport/types";
import type { LocalizedText, TraitDoc, TraitStrings } from "./schema";

export interface TraitKeys {
  /** "NeshaMods:trait_FashionCritic" */
  tuningName: string;
  /** Seed string fed into the hash — surfaced in Advanced Mode. */
  hashInput: string;
  tuning: ResourceKey;
  simData: ResourceKey;
  /** Decimal form of the tuning instance (what tuning XML references use). */
  tuningDecimal: string;
  simDataDecimal: string;
  /** 32-bit FNV of the tuning name, the classic trait/SimData pairing hash. */
  fnv32: string;
  manual: { tuning: boolean; simData: boolean };
}

export function tuningNameFor(namespace: string, internalName: string): string {
  const ns = (namespace || "MyMods").trim().replace(/[^A-Za-z0-9_.]/g, "");
  const name = (internalName || "trait_Untitled").trim();
  return `${ns}:${name}`;
}

/**
 * Trait tuning and its SimData companion must agree. Both are derived from one
 * seed so the pair can never drift apart.
 */
export function computeTraitKeys(doc: TraitDoc, ids?: ResourceIdService): TraitKeys {
  const service = ids ?? new ResourceIdService();
  const tuningName = tuningNameFor(doc.ids.namespace, doc.ids.internalName);
  const hashInput = `${doc.ids.namespace}:trait:${doc.ids.internalName}`;

  const tuning = service.generateResourceKey({
    namespace: doc.ids.namespace,
    kind: "trait",
    name: doc.ids.internalName,
    type: TYPE_TUNING,
    group: GROUP_DEFAULT,
    highBit: true,
    ...(doc.ids.manualTuningInstance ? { manualInstance: doc.ids.manualTuningInstance } : {}),
  });

  // SimData shares the tuning instance — that is what makes them a pair.
  const simData: ResourceKey = {
    type: TYPE_SIMDATA,
    group: GROUP_DEFAULT,
    instance: doc.ids.manualSimDataInstance
      ? doc.ids.manualSimDataInstance.toUpperCase().padStart(16, "0")
      : tuning.instance,
  };

  return {
    tuningName,
    hashInput,
    tuning,
    simData,
    tuningDecimal: BigInt(`0x${tuning.instance}`).toString(10),
    simDataDecimal: BigInt(`0x${simData.instance}`).toString(10),
    fnv32: hex32(fnv1a32(tuningName)),
    manual: {
      tuning: Boolean(doc.ids.manualTuningInstance),
      simData: Boolean(doc.ids.manualSimDataInstance),
    },
  };
}

/** Preview of the keys a rename/regeneration would produce, without applying. */
export function previewKeys(namespace: string, internalName: string) {
  const seed = `${namespace}:trait:${internalName}`;
  const instance = hex64(withHighBit(fnv1a64(seed)));
  return {
    seed,
    instance,
    decimal: BigInt(`0x${instance}`).toString(10),
    tuningName: tuningNameFor(namespace, internalName),
  };
}

/**
 * Assign stable STBL keys to every string field that has text but no key yet.
 * Existing keys are never touched, so rewording keeps translations intact.
 */
export function ensureStringKeys(doc: TraitDoc): TraitStrings {
  const assign = (t: LocalizedText): LocalizedText =>
    t.key
      ? t
      : { ...t, key: localizationKey(doc.ids.namespace, "trait", doc.ids.internalName, t.field) };

  const s = doc.strings;
  return {
    displayName: assign(s.displayName),
    description: assign(s.description),
    acquisitionNotification: assign(s.acquisitionNotification),
    removalNotification: assign(s.removalNotification),
    rewardStoreDescription: assign(s.rewardStoreDescription),
    conflictWarning: assign(s.conflictWarning),
    unlockMessage: assign(s.unlockMessage),
    extra: s.extra.map(assign),
  };
}

export const ALL_STRING_FIELDS = (s: TraitStrings): LocalizedText[] => [
  s.displayName,
  s.description,
  s.acquisitionNotification,
  s.removalNotification,
  s.rewardStoreDescription,
  s.conflictWarning,
  s.unlockMessage,
  ...s.extra,
];

/** Where each string field is used, for the "usage" column in the UI. */
export const STRING_USAGE: Record<string, string[]> = {
  display_name: ["Trait tuning display_name", "CAS", "Simology", "Reward store"],
  description: ["Trait tuning trait_description", "CAS tooltip", "Simology"],
  acquisition_notification: ["Loot on trait added"],
  removal_notification: ["Loot on trait removed"],
  reward_store_description: ["Reward store entry"],
  conflict_warning: ["CAS conflict dialog"],
  unlock_message: ["Unlock notification"],
};

/** Keys referenced nowhere — safe to drop. */
export function orphanStrings(doc: TraitDoc): LocalizedText[] {
  const used = new Set<string>();
  if (doc.strings.displayName.text) used.add("display_name");
  if (doc.strings.description.text) used.add("description");
  if (doc.acquisition.methods.includes("reward-store")) used.add("reward_store_description");
  if (doc.effects.some((e) => e.kind === "loot" && e.trigger === "trait-added"))
    used.add("acquisition_notification");
  if (doc.effects.some((e) => e.kind === "loot" && e.trigger === "trait-removed"))
    used.add("removal_notification");
  if (doc.conflicts.length) used.add("conflict_warning");
  return ALL_STRING_FIELDS(doc.strings).filter(
    (t) => t.key && t.text && !used.has(t.field) && !t.field.startsWith("extra_"),
  );
}

/** Duplicate STBL keys inside one trait (should be impossible; checked anyway). */
export function duplicateStringKeys(doc: TraitDoc): string[] {
  const seen = new Map<string, number>();
  for (const t of ALL_STRING_FIELDS(doc.strings)) {
    if (!t.key) continue;
    seen.set(t.key, (seen.get(t.key) ?? 0) + 1);
  }
  return [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k);
}

export { hex32, hex64 };
