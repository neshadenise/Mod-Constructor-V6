/**
 * Objective identity.
 *
 * The creator owns the names; this module owns every number. Tuning names,
 * instance ids and STBL keys derive deterministically from
 * `namespace + internalName`, so an untouched objective rebuilds to byte-identical
 * keys. Supporting resources (tracker statistic, listener, loot, STBL) each use
 * the hash width and resource type that their own format requires — they are
 * not all the same.
 */

import {
  GROUP_DEFAULT,
  TYPE_SIMDATA,
  TYPE_STBL,
  TYPE_TUNING,
  fnv1a32,
  fnv1a64,
  hex32,
  hex64,
  withHighBit,
} from "@/lib/modexport/ids";
import type { ObjectiveDoc } from "./schema";

export interface GeneratedKey {
  label: string;
  tuningName: string;
  /** Resource type this key belongs to — objectives are not all one type. */
  type: string;
  group: string;
  decimal: string;
  hex: string;
  /** 32 for STBL-style keys, 64 for tuning instances. */
  hashWidth: 32 | 64;
}

export interface ObjectiveKeys {
  tuningName: string;
  hashInput: string;
  objective: GeneratedKey;
  simData: GeneratedKey;
  /** Only minted when the progress mode needs a persistent tracker. */
  tracker?: GeneratedKey;
  /** Only minted when the objective is event-driven. */
  listener?: GeneratedKey;
  loot?: GeneratedKey;
  strings: { field: string; key: string }[];
}

export function tuningNameFor(namespace: string, internalName: string): string {
  const ns = (namespace || "MyMods").trim().replace(/[^A-Za-z0-9_.]/g, "");
  const name = (internalName || "Objective_Untitled").trim();
  return `${ns}:${name}`;
}

function key64(label: string, tuningName: string, type: string): GeneratedKey {
  const value = withHighBit(fnv1a64(tuningName));
  return {
    label,
    tuningName,
    type,
    group: GROUP_DEFAULT,
    decimal: value.toString(10),
    hex: hex64(value),
    hashWidth: 64,
  };
}

function key32(label: string, seed: string, type: string): GeneratedKey {
  const value = fnv1a32(seed);
  return {
    label,
    tuningName: seed,
    type,
    group: GROUP_DEFAULT,
    decimal: String(value >>> 0),
    hex: hex32(value),
    hashWidth: 32,
  };
}

/** True when the progress mode has to persist a value between sessions. */
export function needsTracker(doc: ObjectiveDoc): boolean {
  return ["counter", "accumulated", "duration", "unique_targets", "collection", "percentage", "hidden_state"].includes(
    doc.progress.mode,
  );
}

/** True when the objective is driven by a game event rather than a poll. */
export function needsListener(doc: ObjectiveDoc): boolean {
  return doc.progress.evaluation === "on_event" || doc.progress.evaluation === "continuous";
}

export function computeObjectiveKeys(doc: ObjectiveDoc): ObjectiveKeys {
  const tuningName = tuningNameFor(doc.namespace, doc.internalName);
  const objective = key64("Objective tuning", tuningName, TYPE_TUNING);

  // A manually pinned id wins — regeneration is always an explicit action.
  if (doc.ids.manual && doc.ids.tuningDecimal) {
    objective.decimal = doc.ids.tuningDecimal;
    objective.hex = doc.ids.tuningHex;
  }

  const keys: ObjectiveKeys = {
    tuningName,
    hashInput: tuningName,
    objective,
    simData: key64("SimData", `${tuningName}:simdata`, TYPE_SIMDATA),
    strings: (["name", "shortLabel", "description"] as const).map((field) => ({
      field,
      key: key32(field, `${tuningName}:${field}`, TYPE_STBL).hex,
    })),
  };

  if (needsTracker(doc)) keys.tracker = key64("Progress tracker statistic", `${tuningName}:tracker`, TYPE_TUNING);
  if (needsListener(doc)) keys.listener = key64("Event listener", `${tuningName}:listener`, TYPE_TUNING);
  if (doc.completion.some((c) => c.kind === "execute_loot" || c.kind === "grant_reward"))
    keys.loot = key64("Completion loot", `${tuningName}:loot`, TYPE_TUNING);

  return keys;
}

/** Every generated key as a flat list, for the identity panel and collision checks. */
export function allKeys(keys: ObjectiveKeys): GeneratedKey[] {
  return [keys.objective, keys.simData, keys.tracker, keys.listener, keys.loot].filter(
    (k): k is GeneratedKey => !!k,
  );
}

export interface Collision {
  decimal: string;
  label: string;
  otherObjective: string;
}

/** Instance-id collisions across the project's objectives. */
export function findCollisions(doc: ObjectiveDoc, others: ObjectiveDoc[]): Collision[] {
  const mine = allKeys(computeObjectiveKeys(doc));
  const out: Collision[] = [];
  for (const other of others) {
    if (other.uuid === doc.uuid) continue;
    const theirs = allKeys(computeObjectiveKeys(other));
    for (const k of mine) {
      const hit = theirs.find((t) => t.decimal === k.decimal);
      if (hit) out.push({ decimal: k.decimal, label: k.label, otherObjective: other.displayName });
    }
  }
  return out;
}

/**
 * Deliberate regeneration. Returns the new ids plus the parents that must be
 * updated in the same transaction, so nothing is left pointing at a dead id.
 */
export function regenerateIds(doc: ObjectiveDoc): {
  doc: ObjectiveDoc;
  affectedParents: string[];
} {
  const salt = Date.now().toString(36);
  const value = withHighBit(fnv1a64(`${tuningNameFor(doc.namespace, doc.internalName)}:${salt}`));
  return {
    doc: {
      ...doc,
      ids: {
        tuningDecimal: value.toString(10),
        tuningHex: hex64(value),
        manual: true,
        lastGeneratedAt: Date.now(),
      },
      updatedAt: Date.now(),
    },
    affectedParents: doc.parents.map((p) => p.parentLabel),
  };
}
