/**
 * Where each generated resource's SimData companion comes from.
 *
 * Rules this build follows, in order:
 *   1. an imported donor — a real SimData of the same tuning class taken from
 *      a mod you imported, re-keyed onto the generated instance;
 *   2. a shipped template — a real SimData file of that class from the
 *      Mod Constructor 5 template set, re-keyed the same way;
 *   3. CareerTrack only — the documented variable-length row layout, written
 *      field by field (no opaque bytes, every column named).
 *
 * If none of those apply the resource is left out of the package and the user
 * is told exactly which class to import. No SimData is ever invented.
 */

import type { BuilderKind } from "./simdata";
import { requiresSimData } from "./simdata";
import { templateForKind } from "./simdata-templates";
import type { SimDataDonor } from "./simdata-companion";

export type SimDataSourceKind = "imported" | "template" | "written" | "none";

export interface SimDataMapping {
  kind: BuilderKind;
  /** Tuning class whose SimData schema is being used. */
  className: string;
  source: SimDataSourceKind;
  /** One-line provenance for the export log. */
  label: string;
}

export const SIMDATA_CLASS: Record<BuilderKind, string> = {
  career: "Career",
  career_track: "CareerTrack",
  career_level: "CareerLevel",
  trait: "Trait",
  buff: "Buff",
  aspiration: "AspirationTrack",
  milestone: "AspirationMilestone",
  notification: "Snippet",
  snippet: "Snippet",
};

export function resolveSimDataMapping(
  kind: BuilderKind,
  donor: SimDataDonor | undefined,
): SimDataMapping {
  const className = SIMDATA_CLASS[kind];
  if (!requiresSimData(kind)) {
    return { kind, className, source: "none", label: `${className} needs no SimData companion.` };
  }
  if (donor) {
    return { kind, className, source: "imported", label: `imported ${className} SimData (${donor.origin})` };
  }
  const template = templateForKind(kind);
  if (template) {
    return { kind, className, source: "template", label: `bundled ${template.name} SimData template` };
  }
  if (kind === "career_track") {
    return { kind, className, source: "written", label: "CareerTrack row written from the documented layout" };
  }
  return { kind, className, source: "none", label: `no ${className} SimData mapping available` };
}

export function hasSimDataMapping(kind: BuilderKind, donor?: SimDataDonor): boolean {
  return resolveSimDataMapping(kind, donor).source !== "none" || !requiresSimData(kind);
}

/** Actionable instructions shown when a class has no mapping at all. */
export function simDataImportHelp(kind: BuilderKind): string {
  const className = SIMDATA_CLASS[kind];
  return (
    `Import any mod that contains a ${className} resource (Mod Importer → drop the .package). ` +
    `Its SimData is reused as the template for your ${className}, so nothing has to be invented. ` +
    `You can extract one from the game's own tuning with Sims 4 Studio and import that instead.`
  );
}
