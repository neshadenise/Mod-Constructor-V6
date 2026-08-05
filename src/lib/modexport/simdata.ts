/**
 * SimData capability registry.
 *
 * SimData is a binary companion resource with a per-class schema. This build
 * has no SimData serializer, so builder types that require one are declared
 * non-exportable in rebuild mode rather than shipping a fake or empty
 * resource. Imported SimData is always preserved byte for byte.
 */

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
  /** A working serializer exists in this build. */
  canSerialize: boolean;
  note: string;
}

export const SIMDATA_CAPABILITY: Record<BuilderKind, SimDataCapability> = {
  career: { required: true, canSerialize: false, note: "Career tuning requires a SimData companion." },
  career_track: { required: true, canSerialize: false, note: "Career track tuning requires a SimData companion." },
  career_level: { required: true, canSerialize: false, note: "Career level tuning requires a SimData companion." },
  trait: { required: true, canSerialize: false, note: "Trait tuning requires a SimData companion." },
  buff: { required: true, canSerialize: false, note: "Buff tuning requires a SimData companion." },
  aspiration: { required: true, canSerialize: false, note: "Aspiration tuning requires a SimData companion." },
  milestone: { required: true, canSerialize: false, note: "Aspiration milestone tuning requires a SimData companion." },
  notification: { required: false, canSerialize: true, note: "Notification strings need no SimData." },
  snippet: { required: false, canSerialize: true, note: "Snippet tuning needs no SimData." },
};

export function requiresSimData(kind: BuilderKind) {
  return SIMDATA_CAPABILITY[kind]?.required ?? false;
}

export function canSerializeSimData(kind: BuilderKind) {
  return SIMDATA_CAPABILITY[kind]?.canSerialize ?? false;
}

/** Builder kinds that cannot be rebuilt into a loadable package right now. */
export function nonExportableKinds(): BuilderKind[] {
  return (Object.keys(SIMDATA_CAPABILITY) as BuilderKind[]).filter(
    (k) => requiresSimData(k) && !canSerializeSimData(k),
  );
}

/**
 * There is no SimData writer. Callers must treat this as a hard stop rather
 * than emitting a placeholder resource.
 */
export function serializeSimData(): never {
  throw new Error(
    "SIMDATA_SERIALIZATION_FAILED: this build has no SimData serializer. Imported SimData is preserved; new SimData cannot be generated.",
  );
}
