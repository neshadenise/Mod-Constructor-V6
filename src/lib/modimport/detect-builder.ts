/**
 * Work out which builder an imported mod belongs in.
 *
 * Detection reads the parsed tuning of an imported ModProject: the root
 * instance type (`i="trait"`), the tuning class (`c="Trait"`) and the tuning
 * name (`n="creator:trait_Foo"`). Filenames are only used as a last resort.
 *
 * Everything here is pure — the UI decides what to do with the result.
 */

import type { BuilderKind } from "@/lib/builder-record";
import type { ImportedResource, ModProject } from "./types";

export type DetectedKind = BuilderKind | "interaction" | "objective";

export interface DetectedItem {
  resourceId: string;
  /** Clean display name derived from the tuning name. */
  name: string;
  /** Raw tuning name / file name the match came from. */
  source: string;
}

export interface BuilderDetection {
  kind: DetectedKind;
  label: string;
  /** True when this builder can open the item today. */
  supported: boolean;
  items: DetectedItem[];
  reasons: string[];
}

export const DETECTED_LABEL: Record<DetectedKind, string> = {
  career: "Career Builder",
  trait: "Trait Builder",
  aspiration: "Aspiration Builder",
  interaction: "Interaction & Animation Builder",
  objective: "Objective Builder",
};

const SUPPORTED: DetectedKind[] = ["career", "trait", "aspiration"];

/** Root instance type (`i=`) → builder. */
const BY_INSTANCE_TYPE: Record<string, DetectedKind> = {
  career: "career",
  career_track: "career",
  career_level: "career",
  career_gig: "career",
  careertrack: "career",
  trait: "trait",
  buff: "trait",
  aspiration: "aspiration",
  aspiration_track: "aspiration",
  objective: "objective",
  interaction: "interaction",
  mixer: "interaction",
  super_interaction: "interaction",
  social: "interaction",
};

/** Tuning class (`c=`) → builder, for files with a generic instance type. */
const BY_CLASS: Record<string, DetectedKind> = {
  trait: "trait",
  buff: "trait",
  career: "career",
  careertrack: "career",
  careerlevel: "career",
  aspiration: "aspiration",
  aspirationbasic: "aspiration",
  aspirationtrack: "aspiration",
  objective: "objective",
  socialsuperinteraction: "interaction",
  superinteraction: "interaction",
  immediatesuperinteraction: "interaction",
  mixerinteraction: "interaction",
};

const attr = (xml: string, name: string): string | undefined =>
  new RegExp(`\\b${name}="([^"]*)"`).exec(xml.slice(0, 2000))?.[1];

function prettyName(raw: string): string {
  const last = raw.split(":").pop() ?? raw;
  const stripped = last.replace(
    /^(trait|buff|career|careertrack|career_track|aspiration|objective|interaction|si|mixer)[_-]/i,
    "",
  );
  return (stripped || last).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Classify one imported resource. Returns null when it is not a builder doc. */
export function detectResourceKind(
  resource: ImportedResource,
): { kind: DetectedKind; name: string; source: string; reason: string } | null {
  const xml = resource.text;
  const tuningName = xml ? attr(xml, "n") : undefined;
  const source = tuningName ?? resource.name ?? "";

  if (xml) {
    const i = (attr(xml, "i") ?? "").toLowerCase();
    if (BY_INSTANCE_TYPE[i]) {
      return {
        kind: BY_INSTANCE_TYPE[i],
        name: prettyName(source),
        source,
        reason: `tuning type i="${i}"`,
      };
    }
    const c = (attr(xml, "c") ?? "").toLowerCase();
    if (BY_CLASS[c]) {
      return { kind: BY_CLASS[c], name: prettyName(source), source, reason: `tuning class c="${c}"` };
    }
  }

  const hay = source.toLowerCase();
  const byName: [RegExp, DetectedKind][] = [
    [/(^|[^a-z])career/, "career"],
    [/(^|[^a-z])(trait|buff)/, "trait"],
    [/(^|[^a-z])aspiration/, "aspiration"],
    [/(^|[^a-z])objective/, "objective"],
    [/(^|[^a-z])(interaction|mixer)/, "interaction"],
  ];
  for (const [re, kind] of byName) {
    if (re.test(hay)) return { kind, name: prettyName(source), source, reason: `name "${source}"` };
  }
  return null;
}

/** Group every detectable resource of a mod by the builder that owns it. */
export function detectBuilders(project: ModProject): BuilderDetection[] {
  const groups = new Map<DetectedKind, BuilderDetection>();

  for (const resource of project.resources) {
    const hit = detectResourceKind(resource);
    if (!hit) continue;
    const existing =
      groups.get(hit.kind) ??
      ({
        kind: hit.kind,
        label: DETECTED_LABEL[hit.kind],
        supported: SUPPORTED.includes(hit.kind),
        items: [],
        reasons: [],
      } satisfies BuilderDetection);
    if (!existing.items.some((it) => it.source === hit.source)) {
      existing.items.push({ resourceId: resource.id, name: hit.name || hit.source, source: hit.source });
    }
    if (existing.reasons.length < 3 && !existing.reasons.includes(hit.reason)) {
      existing.reasons.push(hit.reason);
    }
    groups.set(hit.kind, existing);
  }

  return [...groups.values()].sort((a, b) => b.items.length - a.items.length);
}

/** The single best builder for a mod, if there is one. */
export function primaryBuilder(detections: BuilderDetection[]): BuilderDetection | null {
  const supported = detections.filter((d) => d.supported);
  return supported[0] ?? detections[0] ?? null;
}
