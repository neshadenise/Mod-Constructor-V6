/**
 * Mod grouping engine.
 *
 * Decides which uploaded files belong to the same mod. Extensions are never the
 * only signal: archive/folder provenance, normalized base names, creator
 * prefixes, script namespaces and tuning module references all contribute, and
 * every decision carries its reasons so the review screen can explain itself.
 */

import type { Confidence } from "./types";

/** Suffixes that mark a companion file rather than a different mod. */
export const COMPANION_SUFFIXES = [
  "package",
  "packages",
  "script",
  "scripts",
  "tuning",
  "core",
  "main",
  "resources",
  "resource",
  "strings",
  "english",
  "localization",
  "locale",
  "injector",
  "optional",
  "required",
  "addon",
  "base",
  "data",
];

/** Words too generic to group on by themselves. */
export const GENERIC_TOKENS = new Set([
  "mod",
  "mods",
  "sims",
  "sims4",
  "ts4",
  ...COMPANION_SUFFIXES,
]);

export function normalizeName(fileName: string): string {
  return fileName
    .replace(/\.(package|ts4script|zip|py|pyc|xml|json|txt|md|cfg|ini|png|jpg|jpeg|webp)$/i, "")
    .replace(/[\s._-]+/g, " ")
    .trim()
    .toLowerCase();
}

/** Normalized name with trailing companion suffixes removed. */
export function baseName(fileName: string): string {
  let name = normalizeName(fileName);
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of COMPANION_SUFFIXES) {
      if (name.endsWith(` ${suffix}`)) {
        name = name.slice(0, -(suffix.length + 1)).trim();
        changed = true;
      }
    }
    const versioned = /^(.*?)[ ]v?\d+(\.\d+)*$/.exec(name);
    if (versioned?.[1] && versioned[1].length > 2) {
      name = versioned[1].trim();
      changed = true;
    }
  }
  return name;
}

export function tokens(fileName: string): string[] {
  return baseName(fileName).split(" ").filter(Boolean);
}

/** First token is treated as a creator/namespace prefix when it repeats. */
export function creatorPrefix(fileName: string): string | undefined {
  const t = tokens(fileName);
  return t.length > 1 && !GENERIC_TOKENS.has(t[0]!) ? t[0] : undefined;
}

export interface GroupCandidate {
  id: string;
  fileName: string;
  relativePath: string;
  /** Directory of the file inside the upload, "" for root. */
  folder: string;
  fromArchive?: string;
  fileType: string;
  namespaces?: string[];
  /** Module paths referenced by tuning inside a package. */
  tuningModules?: string[];
  creatorHint?: string;
  manifestName?: string;
  version?: string;
  checksum: string;
}

export interface GroupSignal {
  weight: number;
  reason: string;
}

/** Signals that two candidates belong to the same mod. */
export function pairSignals(a: GroupCandidate, b: GroupCandidate): GroupSignal[] {
  const out: GroupSignal[] = [];
  const push = (weight: number, reason: string) => out.push({ weight, reason });

  const baseA = baseName(a.fileName);
  const baseB = baseName(b.fileName);
  const meaningful = (s: string) => s.split(" ").some((t) => !GENERIC_TOKENS.has(t) && t.length > 2);

  if (baseA && baseA === baseB && meaningful(baseA)) push(60, "Matching normalized filenames");
  else if (baseA && baseB && meaningful(baseA) && (baseA.startsWith(baseB) || baseB.startsWith(baseA)))
    push(35, "One filename is a companion variant of the other");

  if (a.fromArchive && a.fromArchive === b.fromArchive) push(30, "Contained in the same archive");
  if (a.folder && a.folder === b.folder) push(25, "Uploaded from the same folder");

  const ca = a.creatorHint ?? creatorPrefix(a.fileName);
  const cb = b.creatorHint ?? creatorPrefix(b.fileName);
  if (ca && ca === cb && !GENERIC_TOKENS.has(ca)) push(15, `Matching creator prefix "${ca}"`);

  if (a.manifestName && a.manifestName === b.manifestName) push(30, "Matching manifest name");
  if (a.version && a.version === b.version) push(8, `Matching version ${a.version}`);

  const nsA = new Set(a.namespaces ?? []);
  const modsB = b.tuningModules ?? [];
  const nsB = new Set(b.namespaces ?? []);
  const modsA = a.tuningModules ?? [];
  const nsHit =
    modsB.some((m) => nsA.has(m.split(".")[0]!)) || modsA.some((m) => nsB.has(m.split(".")[0]!));
  if (nsHit) push(55, "Script namespace matches tuning module references");

  if (a.checksum === b.checksum && a.fileName !== b.fileName)
    push(0, "Identical file contents (duplicate, not evidence of one mod)");

  return out;
}

export function scoreToConfidence(score: number): Confidence {
  if (score >= 85) return "confirmed";
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  return "low";
}

export interface ProposedGroup {
  key: string;
  name: string;
  members: GroupCandidate[];
  reasons: string[];
  score: number;
  confidence: Confidence;
}

const titleCase = (s: string) =>
  s
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ") || "Imported Mod";

/**
 * Union-find grouping over pairwise signals. Weak-only links (score below the
 * medium threshold) never merge automatically — those files stay separate and
 * are surfaced for review instead.
 */
export function groupCandidates(candidates: GroupCandidate[]): ProposedGroup[] {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const p = parent.get(x) ?? x;
    if (p === x) return x;
    const root = find(p);
    parent.set(x, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };
  candidates.forEach((c) => parent.set(c.id, c.id));

  const pairReasons = new Map<string, { score: number; reasons: string[] }>();
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i]!;
      const b = candidates[j]!;
      const signals = pairSignals(a, b);
      const score = signals.reduce((s, x) => s + x.weight, 0);
      if (score >= 35) {
        union(a.id, b.id);
        const key = `${find(a.id)}`;
        const entry = pairReasons.get(key) ?? { score: 0, reasons: [] };
        entry.score = Math.max(entry.score, score);
        for (const s of signals) if (s.weight > 0 && !entry.reasons.includes(s.reason)) entry.reasons.push(s.reason);
        pairReasons.set(key, entry);
      }
    }
  }

  const byRoot = new Map<string, GroupCandidate[]>();
  for (const c of candidates) {
    const root = find(c.id);
    byRoot.set(root, [...(byRoot.get(root) ?? []), c]);
  }

  return [...byRoot.entries()].map(([root, members]) => {
    const info = pairReasons.get(root);
    const single = members.length === 1;
    const named =
      members.find((m) => m.manifestName)?.manifestName ??
      titleCase(baseName(members.find((m) => m.fileType === "package")?.fileName ?? members[0]!.fileName));
    const reasons = single
      ? ["Only file in its group — no companion files detected"]
      : (info?.reasons ?? ["Grouped by shared upload location"]);
    const score = single ? 100 : (info?.score ?? 35);
    return {
      key: root,
      name: named,
      members,
      reasons,
      score,
      confidence: single ? "high" : scoreToConfidence(score),
    };
  });
}
