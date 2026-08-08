/**
 * Imported tuning → builder records.
 *
 * `detect-builder` says *which* builder owns an imported mod; this module does
 * the actual extraction so the builder opens the uploaded file's real content
 * (levels, pay, schedules, buffs, milestones) instead of a blank template.
 *
 * Everything is best-effort and tolerant: EA and creator tuning use several
 * spellings for the same field, so each getter accepts a candidate list. When a
 * value genuinely is not in the file it stays empty — nothing is invented.
 */

import type { Aspiration, Career, CareerBranch, CareerLevel, Milestone, Trait } from "@/lib/types";
import type { ImportedResource, ModProject } from "./types";

/* ----------------------------- xml helpers ---------------------------- */

const attr = (xml: string, name: string): string | undefined =>
  new RegExp(`\\b${name}="([^"]*)"`).exec(xml.slice(0, 1500))?.[1];

const unescape = (v: string) =>
  v
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

/** Inner text of `<TAG n="name"> … </TAG>` handling nesting of the same tag. */
function block(xml: string, tag: string, name: string): string | undefined {
  const open = new RegExp(`<${tag}\\b[^>]*\\bn="${name}"[^>]*>`, "i");
  const m = open.exec(xml);
  if (!m) return undefined;
  if (m[0].endsWith("/>")) return "";
  let depth = 1;
  const scan = new RegExp(`<${tag}\\b[^>]*?(/?)>|</${tag}>`, "gi");
  scan.lastIndex = m.index + m[0].length;
  let hit: RegExpExecArray | null;
  while ((hit = scan.exec(xml))) {
    if (hit[0].startsWith(`</`)) {
      depth--;
      if (depth === 0) return xml.slice(m.index + m[0].length, hit.index);
    } else if (hit[1] !== "/") depth++;
  }
  return undefined;
}

/** Value of the first `<T n="one of names">value</T>`. */
function tunable(xml: string, names: string[]): string | undefined {
  for (const n of names) {
    const m = new RegExp(`<T\\b[^>]*\\bn="${n}"[^>]*>([^<]*)</T>`, "i").exec(xml);
    if (m) return unescape((m[1] ?? "").trim());
    const empty = new RegExp(`<T\\b[^>]*\\bn="${n}"[^>]*/>`, "i").exec(xml);
    if (empty) return "";
  }
  return undefined;
}

/** All plain `<T>` values inside `<L n="name">`. */
function listValues(xml: string, names: string[]): string[] {
  for (const n of names) {
    const inner = block(xml, "L", n);
    if (inner === undefined) continue;
    return [...inner.matchAll(/<T\b[^>]*>([^<]*)<\/T>/g)].map((m) => unescape((m[1] ?? "").trim())).filter(Boolean);
  }
  return [];
}

const num = (v: string | undefined): number | undefined => {
  if (!v) return undefined;
  const n = Number(v.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

/* ------------------------------ resolvers ----------------------------- */

export interface TuningIndex {
  /** instance id (decimal string) → resource. */
  byInstance: Map<string, ImportedResource>;
  /** tuning name → resource. */
  byName: Map<string, ImportedResource>;
  /** STBL hash (uppercase hex, no 0x) → localized string. */
  strings: Map<string, string>;
  resources: ImportedResource[];
}

export function indexProject(project: ModProject): TuningIndex {
  const byInstance = new Map<string, ImportedResource>();
  const byName = new Map<string, ImportedResource>();
  const strings = new Map<string, string>();
  for (const r of project.resources) {
    for (const s of r.strings ?? []) {
      strings.set(s.key.replace(/^0x/i, "").toUpperCase().padStart(8, "0"), s.value);
    }
    if (!r.text) continue;
    const id = attr(r.text, "s");
    if (id) byInstance.set(id.trim(), r);
    const n = attr(r.text, "n");
    if (n) byName.set(n.trim(), r);
  }
  return { byInstance, byName, strings, resources: project.resources };
}

/** Turns a raw tunable value into readable text (STBL hash → string). */
function text(idx: TuningIndex, raw: string | undefined): string {
  if (!raw) return "";
  const hex = /^0x[0-9a-f]+$/i.test(raw)
    ? raw.replace(/^0x/i, "").toUpperCase().padStart(8, "0")
    : /^\d{6,}$/.test(raw)
      ? Number(raw).toString(16).toUpperCase().padStart(8, "0")
      : null;
  if (hex && idx.strings.has(hex)) return idx.strings.get(hex)!;
  if (hex) return "";
  return raw;
}

const prettify = (raw: string) => {
  const last = (raw.split(":").pop() ?? raw).replace(
    /^(trait|buff|career|careertrack|career_track|careerlevel|career_level|aspiration|objective)[_-]/i,
    "",
  );
  return (last || raw).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
};

const kindOf = (r: ImportedResource): string =>
  (attr(r.text ?? "", "i") || attr(r.text ?? "", "c") || "").toLowerCase();

const displayName = (idx: TuningIndex, r: ImportedResource) =>
  text(idx, tunable(r.text ?? "", ["display_name", "career_name", "name", "title", "trait_display_name"])) ||
  prettify(attr(r.text ?? "", "n") ?? r.name ?? "Untitled");

const describe = (idx: TuningIndex, r: ImportedResource) =>
  text(
    idx,
    tunable(r.text ?? "", [
      "trait_description",
      "career_description",
      "description",
      "aspiration_description",
      "text",
    ]),
  );

const resolve = (idx: TuningIndex, ref: string) => idx.byInstance.get(ref.trim()) ?? idx.byName.get(ref.trim());

/* -------------------------------- career ------------------------------ */

const HOURS = (v: number | undefined) => {
  if (v === undefined) return undefined;
  const h = Math.floor(v) % 24;
  const m = Math.round((v - Math.floor(v)) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

function levelFrom(idx: TuningIndex, r: ImportedResource, rank: number): CareerLevel {
  const xml = r.text ?? "";
  const start = num(tunable(xml, ["start_time", "work_start", "hour"]));
  const duration = num(tunable(xml, ["hours", "duration", "work_hours"]));
  const end = start !== undefined && duration !== undefined ? (start + duration) % 24 : undefined;
  return {
    id: r.id,
    rank: num(tunable(xml, ["level", "career_level"])) ?? rank,
    title: displayName(idx, r),
    salary: num(tunable(xml, ["simoleons_per_hour", "pay", "base_pay", "simoleons"])) ?? 0,
    workStart: HOURS(start) ?? "09:00",
    workEnd: HOURS(end) ?? "17:00",
    workDays: listValues(xml, ["work_days", "days"])
      .map((d) => d.slice(0, 3).toLowerCase())
      .filter((d): d is CareerLevel["workDays"][number] =>
        ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].includes(d),
      ),
    objectives: listValues(xml, ["performance_stat", "objectives", "gig_objectives"]).map((v) =>
      text(idx, v) || prettify(v),
    ),
    perks: listValues(xml, ["promotion_reward_trait", "rewards", "loot_on_promotion"]).map(
      (v) => resolve(idx, v)?.name ?? prettify(v),
    ),
  };
}

function branchFrom(idx: TuningIndex, track: ImportedResource): CareerBranch {
  const xml = track.text ?? "";
  const levelRefs = listValues(xml, ["career_levels", "levels"]);
  const levels = levelRefs
    .map((ref, i) => {
      const res = resolve(idx, ref);
      return res ? levelFrom(idx, res, i + 1) : null;
    })
    .filter((l): l is CareerLevel => !!l)
    .sort((a, b) => a.rank - b.rank);
  return {
    id: track.id,
    name: displayName(idx, track),
    description: describe(idx, track),
    levels,
  };
}

function careersFrom(idx: TuningIndex): Partial<Career>[] {
  const tracks = idx.resources.filter((r) => /career_?track/.test(kindOf(r)));
  const careers = idx.resources.filter((r) => kindOf(r) === "career");
  const used = new Set<string>();
  const out: Partial<Career>[] = [];

  for (const c of careers) {
    const xml = c.text ?? "";
    const refs = listValues(xml, ["career_tracks", "tracks", "branches", "start_track"]);
    let branches = refs
      .map((ref) => resolve(idx, ref))
      .filter((r): r is ImportedResource => !!r)
      .map((r) => {
        used.add(r.id);
        return branchFrom(idx, r);
      });
    if (!branches.length && tracks.length) {
      branches = tracks.map((t) => {
        used.add(t.id);
        return branchFrom(idx, t);
      });
    }
    out.push({
      name: displayName(idx, c),
      description: describe(idx, c),
      internalId: attr(xml, "n") ?? undefined,
      branches,
    });
  }

  // Tracks that no career tuning claimed still open as their own career.
  for (const t of tracks) {
    if (used.has(t.id)) continue;
    const branch = branchFrom(idx, t);
    out.push({ name: branch.name, description: branch.description, internalId: attr(t.text ?? "", "n") ?? undefined, branches: [branch] });
  }
  return out;
}

/* -------------------------------- trait ------------------------------- */

function traitsFrom(idx: TuningIndex): Partial<Trait>[] {
  return idx.resources
    .filter((r) => kindOf(r) === "trait")
    .map((r) => {
      const xml = r.text ?? "";
      const buffRefs = listValues(xml, ["buffs", "buffs_add", "trait_buffs"]);
      return {
        name: displayName(idx, r),
        description: describe(idx, r),
        internalId: attr(xml, "n") ?? undefined,
        buffs: buffRefs.map((ref, i) => {
          const res = resolve(idx, ref);
          return {
            id: res?.id ?? `buff_${i}`,
            name: res ? displayName(idx, res) : prettify(ref),
            description: res ? describe(idx, res) : "",
            emotion: "fine" as const,
            weight: 1,
            durationHours: 0,
          };
        }),
        socialInteractions: listValues(xml, ["interactions", "super_affordances", "mixers"]).map(
          (v) => resolve(idx, v)?.name ?? prettify(v),
        ),
      };
    });
}

/* ----------------------------- aspiration ----------------------------- */

function aspirationsFrom(idx: TuningIndex): Partial<Aspiration>[] {
  const tracks = idx.resources.filter((r) => /aspiration_?track/.test(kindOf(r)));
  const basics = idx.resources.filter((r) => kindOf(r) === "aspiration");
  const used = new Set<string>();

  const milestoneFrom = (r: ImportedResource, order: number): Milestone => ({
    id: r.id,
    order,
    name: displayName(idx, r),
    description: describe(idx, r),
    objectives: listValues(r.text ?? "", ["objectives"]).map((ref) => {
      const res = resolve(idx, ref);
      return res ? displayName(idx, res) : prettify(ref);
    }),
  });

  const out: Partial<Aspiration>[] = tracks.map((t) => {
    const refs = listValues(t.text ?? "", ["aspirations", "milestones"]);
    const milestones = refs
      .map((ref, i) => {
        const res = resolve(idx, ref);
        if (!res) return null;
        used.add(res.id);
        return milestoneFrom(res, i);
      })
      .filter((m): m is Milestone => !!m);
    return {
      name: displayName(idx, t),
      description: describe(idx, t),
      internalId: attr(t.text ?? "", "n") ?? undefined,
      milestones,
    };
  });

  for (const a of basics) {
    if (used.has(a.id)) continue;
    out.push({
      name: displayName(idx, a),
      description: describe(idx, a),
      internalId: attr(a.text ?? "", "n") ?? undefined,
      milestones: [milestoneFrom(a, 0)],
    });
  }
  return out;
}

/* ------------------------------- public ------------------------------- */

export type ExtractedKind = "career" | "trait" | "aspiration";

/**
 * Everything of `kind` that the uploaded mod actually contains, shaped for the
 * store's create/update calls. Empty when the mod has no such tuning.
 */
export function extractBuilderRecords(
  project: ModProject,
  kind: ExtractedKind,
): (Partial<Career> | Partial<Trait> | Partial<Aspiration>)[] {
  const idx = indexProject(project);
  const list =
    kind === "career" ? careersFrom(idx) : kind === "trait" ? traitsFrom(idx) : aspirationsFrom(idx);
  return list.filter((r) => (r.name ?? "").trim().length > 0);
}
