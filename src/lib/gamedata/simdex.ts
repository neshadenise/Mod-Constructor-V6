/**
 * Lot51 Simdex client — online lookups for real base-game instance IDs and
 * localized strings.
 *
 * These are the two things TDESC schemas can't give us: EA's actual IDs and
 * EA's actual string text. Results are cached per query so repeat lookups
 * inside a session are instant, but Simdex is always optional — every picker
 * still works offline from built-ins and the local index.
 */

import type { GameRef, GameRefKind } from "./types";

const API = "/api/public/gamedata";

const cache = new Map<string, GameRef[]>();

function kindFromModule(module: string | undefined, className: string | undefined): GameRefKind {
  const m = `${module ?? ""}.${className ?? ""}`.toLowerCase();
  if (m.includes("buff")) return "buff";
  if (m.includes("careertrack") || m.includes("career_track")) return "career_track";
  if (m.includes("career")) return "career";
  if (m.includes("trait")) return "trait";
  if (m.includes("aspiration")) return "aspiration";
  if (m.includes("statistic") || m.includes("skill") || m.includes("commodity")) return "statistic";
  if (m.includes("interaction")) return "interaction";
  if (m.includes("loot")) return "loot";
  return "other";
}

interface RawHit {
  _source?: Record<string, unknown>;
}

function pick(src: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = src[k];
    if (typeof v === "string" && v) return v;
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

async function search(kind: "tuning" | "strings", query: string, size: number): Promise<unknown> {
  const params = new URLSearchParams({ q: query, size: String(size) });
  const res = await fetch(`${API}/search/${kind}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  const text = await res.text();
  if (!res.ok) {
    let detail = text.slice(0, 200);
    try {
      const parsed = JSON.parse(text) as { detail?: string; error?: string };
      detail = parsed.detail ?? parsed.error ?? detail;
    } catch {
      /* keep raw text */
    }
    throw new Error(`Lot51 lookup failed (${res.status}): ${detail}`);
  }
  return JSON.parse(text);
}

function hitsOf(raw: unknown): Record<string, unknown>[] {
  const root = raw as { hits?: { hits?: RawHit[] } | RawHit[]; results?: RawHit[] } | null;
  if (!root) return [];
  const list = Array.isArray(root.hits)
    ? root.hits
    : Array.isArray(root.hits?.hits)
      ? root.hits.hits
      : Array.isArray(root.results)
        ? root.results
        : [];
  return list
    .map((h) => (h && typeof h === "object" && "_source" in h ? h._source : h))
    .filter((s): s is Record<string, unknown> => Boolean(s) && typeof s === "object");
}

/** Looks up base-game tuning references (buffs, careers, traits, statistics…). */
export async function searchTuning(query: string, size = 25): Promise<GameRef[]> {
  const key = `t:${query}:${size}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const sources = hitsOf(await search("tuning", query, size));
  const refs: GameRef[] = sources
    .map((src) => {
      const id = pick(src, "instance", "instance_id", "muid", "id");
      const name = pick(src, "name", "filename", "tuning_name") ?? id ?? "unknown";
      if (!id) return null;
      const module = pick(src, "module");
      const className = pick(src, "class", "tuning_class");
      const out: GameRef = {
        id,
        name,
        kind: kindFromModule(module, className),
        source: "lot51",
      };
      if (module) out.module = module;
      if (className) out.className = className;
      return out;
    })
    .filter((r): r is GameRef => Boolean(r));

  cache.set(key, refs);
  return refs;
}

/** Looks up base-game localized strings by text or STBL key. */
export async function searchStrings(query: string, size = 25): Promise<GameRef[]> {
  const key = `s:${query}:${size}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const sources = hitsOf(await search("strings", query, size));
  const refs: GameRef[] = sources
    .map((src) => {
      const id = pick(src, "key", "hash", "instance", "id");
      const value = pick(src, "value", "text", "string");
      if (!id) return null;
      const out: GameRef = {
        id,
        name: value ?? id,
        kind: "string",
        source: "lot51",
      };
      if (value) out.value = value;
      const hex = pick(src, "hex", "key_hex");
      if (hex) out.hex = hex;
      return out;
    })
    .filter((r): r is GameRef => Boolean(r));

  cache.set(key, refs);
  return refs;
}

export function clearSimdexCache(): void {
  cache.clear();
}
