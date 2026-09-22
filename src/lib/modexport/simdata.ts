/**
 * SimData capability registry.
 *
 * SimData is a binary companion resource with a per-class schema. This build
 * never invents a schema: it either clones a real SimData of the same class
 * (from an imported mod, or from the built-in template set published with
 * The Sims 4 Mod Constructor 5) and re-keys it, or — for CareerTrack, which
 * has no fixed-size template — writes the documented layout byte for byte.
 * Imported SimData is always preserved verbatim.
 */

import { hasSimDataTemplate } from "./simdata-templates";

export type BuilderKind =
  | "career"
  | "career_level"
  | "career_track"
  | "trait"
  | "buff"
  | "aspiration"
  | "milestone"
  | "notification"
  | "snippet";

export interface SimDataCapability {
  /** The game refuses to load the tuning without a SimData companion. */
  required: boolean;
  note: string;
}

export const SIMDATA_CAPABILITY: Record<BuilderKind, SimDataCapability> = {
  career: { required: true, note: "Career tuning requires a SimData companion." },
  career_track: { required: true, note: "Career track tuning requires a SimData companion." },
  career_level: { required: true, note: "Career level tuning requires a SimData companion." },
  trait: { required: true, note: "Trait tuning requires a SimData companion." },
  buff: { required: true, note: "Buff tuning requires a SimData companion." },
  aspiration: { required: true, note: "Aspiration tuning requires a SimData companion." },
  milestone: { required: true, note: "Aspiration milestone tuning requires a SimData companion." },
  notification: { required: false, note: "Notification strings need no SimData." },
  snippet: { required: false, note: "Snippet tuning needs no SimData." },
};

export function requiresSimData(kind: BuilderKind) {
  return SIMDATA_CAPABILITY[kind]?.required ?? false;
}

/** True when this build can produce a companion without an imported donor. */
export function canSerializeSimData(kind: BuilderKind) {
  if (!requiresSimData(kind)) return true;
  return kind === "career_track" || hasSimDataTemplate(kind);
}

/** Builder kinds that cannot be rebuilt into a loadable package right now. */
export function nonExportableKinds(): BuilderKind[] {
  return (Object.keys(SIMDATA_CAPABILITY) as BuilderKind[]).filter(
    (k) => requiresSimData(k) && !canSerializeSimData(k),
  );
}

