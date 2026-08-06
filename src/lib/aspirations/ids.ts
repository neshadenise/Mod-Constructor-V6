/**
 * Aspiration identity service.
 *
 * The creator types names; this module owns every number. Tuning names,
 * instance ids, milestone/objective child ids and localisation keys are all
 * derived deterministically from `namespace + internalName`, so an unchanged
 * aspiration always rebuilds to identical keys.
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
import type { AspirationDoc, AspirationStrings, LocalizedText } from "./schema";

export interface AspirationKeys {
  /** "NeshaMods:aspiration_MasterFashionCritic" */
  tuningName: string;
  /** Seed string fed into the hash — surfaced in Advanced Mode. */
  hashInput: string;
  tuning: ResourceKey;
  simData: ResourceKey;
  tuningDecimal: string;
  simDataDecimal: string;
  fnv32: string;
  manual: { tuning: boolean; simData: boolean };
  /** Deterministic child keys for milestones and their objectives. */
  milestones: {
    id: string;
    uuid: string;
    tuningName: string;
    key: ResourceKey;
    decimal: string;
    objectives: { id: string; uuid: string; tuningName: string; key: ResourceKey; decimal: string }[];
  }[];

}

export function tuningNameFor(namespace: string, internalName: string): string {
  const ns = (namespace || "MyMods").trim().replace(/[^A-Za-z0-9_.]/g, "");
  const name = (internalName || "aspiration_Untitled").trim();
  return `${ns}:${name}`;
}

const childKey = (service: ResourceIdService, namespace: string, kind: string, name: string) => {
  const key = service.generateResourceKey({
    namespace,
    kind,
    name,
    type: TYPE_TUNING,
    group: GROUP_DEFAULT,
    highBit: true,
  });
  return { key, decimal: BigInt(`0x${key.instance}`).toString(10) };
};

export function computeAspirationKeys(doc: AspirationDoc, ids?: ResourceIdService): AspirationKeys {
  const service = ids ?? new ResourceIdService();
  const ns = doc.ids.namespace;
  const tuningName = tuningNameFor(ns, doc.ids.internalName);
  const hashInput = `${ns}:aspiration:${doc.ids.internalName}`;

  const tuning = service.generateResourceKey({
    namespace: ns,
    kind: "aspiration",
    name: doc.ids.internalName,
    type: TYPE_TUNING,
    group: GROUP_DEFAULT,
    highBit: true,
    ...(doc.ids.manualTuningInstance ? { manualInstance: doc.ids.manualTuningInstance } : {}),
  });

  const simData: ResourceKey = {
    type: TYPE_SIMDATA,
    group: GROUP_DEFAULT,
    instance: doc.ids.manualSimDataInstance
      ? doc.ids.manualSimDataInstance.toUpperCase().padStart(16, "0")
      : tuning.instance,
  };

  const milestones = doc.milestones.map((m, i) => {
    const msName = m.internalName
      ? m.internalName.replace(/[^A-Za-z0-9_]/g, "_")
      : `${doc.ids.internalName}_milestone_${i + 1}`;
    const { key, decimal } = childKey(service, ns, "aspiration_milestone", msName);
    return {
      id: m.id,
      uuid: m.uuid,
      tuningName: tuningNameFor(ns, msName),
      key,
      decimal,
      objectives: m.objectives.map((o, j) => {
        const objName = o.internalName
          ? o.internalName.replace(/[^A-Za-z0-9_]/g, "_")
          : `${msName}_objective_${j + 1}`;
        const ck = childKey(service, ns, "aspiration_objective", objName);
        return {
          id: o.id,
          uuid: o.uuid,
          tuningName: tuningNameFor(ns, objName),
          key: ck.key,
          decimal: ck.decimal,
        };
      }),
    };
  });


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
    milestones,
  };
}

/** Preview of the keys a rename/regeneration would produce, without applying. */
export function previewKeys(namespace: string, internalName: string) {
  const seed = `${namespace}:aspiration:${internalName}`;
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
export function ensureStringKeys(doc: AspirationDoc): AspirationStrings {
  const assign = (t: LocalizedText): LocalizedText =>
    t.key
      ? t
      : {
          ...t,
          key: localizationKey(doc.ids.namespace, "aspiration", doc.ids.internalName, t.field),
        };

  const s = doc.strings;
  return {
    displayName: assign(s.displayName),
    description: assign(s.description),
    tooltip: assign(s.tooltip),
    completionNotification: assign(s.completionNotification),
    rewardNotification: assign(s.rewardNotification),
    journalText: assign(s.journalText),
    extra: s.extra.map(assign),
  };
}

export const ALL_STRING_FIELDS = (s: AspirationStrings): LocalizedText[] => [
  s.displayName,
  s.description,
  s.tooltip,
  s.completionNotification,
  s.rewardNotification,
  s.journalText,
  ...s.extra,
];

/** Where each string field is used, for the "usage" column in the UI. */
export const STRING_USAGE: Record<string, string[]> = {
  display_name: ["Aspiration tuning display_name", "CAS picker", "Simology"],
  description: ["Aspiration tuning description", "CAS tooltip"],
  tooltip: ["Aspiration panel tooltip"],
  completion_notification: ["Completion notification"],
  reward_notification: ["Reward trait notification"],
  journal_text: ["Sim journal entry"],
};

/** Keys referenced nowhere — safe to drop. */
export function orphanStrings(doc: AspirationDoc): LocalizedText[] {
  const used = new Set<string>(["display_name", "description", "tooltip"]);
  if (doc.milestones.length) used.add("completion_notification");
  if (doc.rewardTrait) used.add("reward_notification");
  if (doc.strings.journalText.text.trim()) used.add("journal_text");
  return ALL_STRING_FIELDS(doc.strings).filter(
    (t) => t.key && t.text && !used.has(t.field) && !t.field.startsWith("extra_"),
  );
}

/** Duplicate STBL keys inside one aspiration (should be impossible; checked anyway). */
export function duplicateStringKeys(doc: AspirationDoc): string[] {
  const seen = new Map<string, number>();
  for (const t of ALL_STRING_FIELDS(doc.strings)) {
    if (!t.key) continue;
    seen.set(t.key, (seen.get(t.key) ?? 0) + 1);
  }
  return [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k);
}

export { hex32, hex64 };
