/**
 * SimData companions for generated tuning.
 *
 * The game refuses to load Trait / Buff / Career / Aspiration tuning without a
 * SimData companion of the same instance. EA's exported column set for those
 * classes is patch-specific, so this build never invents a schema. Instead it
 * reuses a real SimData of the same tuning class from the mod you imported
 * (the "donor"), re-keys it onto the generated tuning instance, and rewrites
 * the localisation keys in place so the in-game name and description match the
 * record you built. Structure stays byte-identical to a file the game already
 * loads.
 */

import { readDbpf, readDbpfResource } from "@/lib/modimport/dbpf";
import { parseTuning } from "@/lib/modimport/tuning";
import type { ModProject } from "@/lib/modimport/types";
import { isSimData, patchSimData, type SimDataPatchReport } from "./simdata-binary";
import type { BuilderKind } from "./simdata";

/** Tuning class (c="…") -> builder kind. */
const CLASS_TO_KIND: Record<string, BuilderKind> = {
  trait: "trait",
  buff: "buff",
  career: "career",
  careertrack: "career_track",
  careerlevel: "career_level",
  aspiration: "aspiration",
  aspirationbasic: "aspiration",
  aspirationassignment: "aspiration",
  objective: "milestone",
  aspirationmilestone: "milestone",
};

/** Columns that carry the display name / description, per class family. */
const NAME_COLUMNS: Record<BuilderKind, string[]> = {
  trait: ["display_name", "trait_display_name", "name"],
  buff: ["buff_name", "display_name", "name"],
  career: ["career_name", "display_name", "name"],
  career_track: ["track_name", "display_name", "name"],
  career_level: ["level_name", "display_name", "name"],
  aspiration: ["display_name", "aspiration_name", "name"],
  milestone: ["display_name", "milestone_name", "name"],
  notification: [],
  snippet: [],
};

const DESCRIPTION_COLUMNS: Record<BuilderKind, string[]> = {
  trait: ["trait_description", "description", "display_description"],
  buff: ["buff_description", "description"],
  career: ["career_description", "description"],
  career_track: ["track_description", "description"],
  career_level: ["level_description", "description"],
  aspiration: ["aspiration_description", "description"],
  milestone: ["description"],
  notification: [],
  snippet: [],
};

export interface SimDataDonor {
  kind: BuilderKind;
  bytes: Uint8Array;
  /** Where it came from, for the export log. */
  origin: string;
}

/**
 * Collects one usable SimData donor per tuning class from the imported mod.
 * SimData is paired with its tuning by sharing the same instance id.
 */
export async function buildDonorIndex(
  project: ModProject | undefined,
  originals: Map<string, Uint8Array> | undefined,
): Promise<Map<BuilderKind, SimDataDonor>> {
  const donors = new Map<BuilderKind, SimDataDonor>();
  if (!project || !originals) return donors;

  for (const component of project.components) {
    if (component.fileType !== "package") continue;
    const original = originals.get(component.id);
    if (!original) continue;

    let entries;
    try {
      entries = readDbpf(original).entries;
    } catch {
      continue;
    }

    // instance -> tuning class, from the parsed XML we already hold.
    const classByInstance = new Map<string, string>();
    for (const r of component.resources ?? []) {
      if (!r.text) continue;
      const parsed = parseTuning(r.text);
      const cls = parsed.className?.toLowerCase().replace(/[^a-z]/g, "");
      if (cls) classByInstance.set(r.key.instance.toUpperCase(), cls);
    }

    for (const entry of entries) {
      if (entry.key.type.toUpperCase() !== "545AC67A") continue;
      const cls = classByInstance.get(entry.key.instance.toUpperCase());
      const kind = cls ? CLASS_TO_KIND[cls] : undefined;
      if (!kind || donors.has(kind)) continue;
      let bytes: Uint8Array;
      try {
        bytes = await readDbpfResource(entry);
      } catch {
        continue;
      }
      if (!isSimData(bytes)) continue;
      donors.set(kind, {
        kind,
        bytes,
        origin: `${component.originalFileName} · ${entry.key.instance}`,
      });
    }
  }

  return donors;
}

export interface CompanionResult {
  bytes: Uint8Array;
  report: SimDataPatchReport;
  origin: string;
}

/**
 * Produces a SimData companion for a generated tuning record.
 *
 * Order of preference:
 *   1. a donor of the same class taken from an imported mod,
 *   2. the built-in Mod Constructor 5 template for that class,
 *   3. for CareerTrack (variable-length row), the ported writer.
 * Returns undefined only when none of those apply, so the caller can report
 * the gap rather than emit a fabricated resource.
 */
export function makeCompanion(
  donor: SimDataDonor | undefined,
  opts: {
    kind?: BuilderKind;
    nameKey?: string;
    descriptionKey?: string;
    /** Instance ids the CareerTrack SimData lists. */
    levels?: string[];
    branches?: string[];
  },
): CompanionResult | undefined {
  const kind = donor?.kind ?? opts.kind;
  if (!kind) return undefined;

  const source = donor ?? builtInDonor(kind);
  if (source) {
    const patches = [
      ...(opts.nameKey ? NAME_COLUMNS[kind].map((column) => ({ column, lockey: hexKey(opts.nameKey!) })) : []),
      ...(opts.descriptionKey
        ? DESCRIPTION_COLUMNS[kind].map((column) => ({ column, lockey: hexKey(opts.descriptionKey!) }))
        : []),
    ];
    try {
      const { bytes, report } = patchSimData(source.bytes, patches);
      return { bytes, report, origin: source.origin };
    } catch {
      /* fall through to the writer below */
    }
  }

  if (kind === "career_track") {
    const bytes = buildCareerTrackSimData({
      levels: opts.levels,
      branches: opts.branches,
      nameKey: hexKey(opts.nameKey ?? "0"),
      descriptionKey: hexKey(opts.descriptionKey ?? "0"),
    });
    return {
      bytes,
      report: { applied: [{ column: "career_name", table: "Constructor", row: 0 }], skipped: [] },
      origin: "built-in CareerTrack SimData writer",
    };
  }

  return undefined;
}

/** The template set shipped with this build, used when no import can lend one. */
function builtInDonor(kind: BuilderKind): SimDataDonor | undefined {
  const template = templateForKind(kind);
  if (!template) return undefined;
  return { kind, bytes: template.bytes, origin: `built-in ${template.name} SimData template` };
}

function hexKey(ref: string): number {
  const clean = ref.replace(/^0x/i, "");
  const n = Number.parseInt(clean, 16);
  return Number.isFinite(n) ? n >>> 0 : 0;
}

