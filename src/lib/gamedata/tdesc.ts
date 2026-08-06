/**
 * TDESC schema client.
 *
 * Fetches tuning schemas through our /api/public/gamedata proxy, normalizes
 * Lot51's preserve-order XML-to-JSON shape into a flat field list, and caches
 * the result in IndexedDB. After a single sync the app validates tuning
 * entirely offline.
 */

import { STORE_META, STORE_TDESC, idbAll, idbClear, idbGet, idbSet } from "./db";
import { BUNDLED_CLASSES, BUNDLED_ENUMS, SNAPSHOT_VERSION } from "./snapshot";
import type { TdescCacheMeta, TdescClass, TdescField, TdescIssue, TdescVersionInfo } from "./types";

const API = "/api/public/gamedata";
const META_KEY = "tdesc";
const ENUMS_KEY = "enums";

/* ---------- normalization ---------- */

type RawNode = Record<string, unknown> & { ":@"?: Record<string, string> };

function decodeEntities(s: string): string {
  return s
    .replace(/&#xA;/gi, "\n")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function nodeChildren(node: RawNode): RawNode[] {
  const out: RawNode[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === ":@") continue;
    if (Array.isArray(value)) out.push(...(value as RawNode[]));
  }
  return out;
}

function nodeClass(node: RawNode): string {
  const key = Object.keys(node).find((k) => k !== ":@");
  return key ?? "Tunable";
}

function toField(node: RawNode, depth: number): TdescField | null {
  const attrs = node[":@"];
  if (!attrs) return null;
  const name = attrs["name"];
  const className = attrs["class"] ?? nodeClass(node);
  if (!name && depth === 0) return null;

  const kids = depth < 3 ? nodeChildren(node).map((c) => toField(c, depth + 1)).filter(Boolean) : [];

  const field: TdescField = {
    name: name ?? `<${className}>`,
    type: attrs["type"] ?? "",
    className,
  };
  if (attrs["default"] !== undefined) field.default = attrs["default"];
  if (attrs["description"]) field.description = decodeEntities(attrs["description"]);
  if (attrs["display"]) field.display = attrs["display"];
  if (attrs["group"]) field.group = attrs["group"];
  if (attrs["static_entries"]) field.enumSource = attrs["static_entries"];
  if (attrs["Deprecated"] === "True") field.deprecated = true;
  if (kids.length) field.children = kids as TdescField[];
  return field;
}

/** Turns a raw Lot51 TDESC document into a flat, cacheable class record. */
export function normalizeTdescDoc(
  raw: unknown,
  meta: { className: string; path: string; module?: string; version: string; description?: string },
): TdescClass {
  const root = (raw as { TuningRoot?: RawNode[] } | null)?.TuningRoot ?? [];
  const instances = root.flatMap((n) => nodeChildren(n as RawNode));
  const fields = instances.map((n) => toField(n, 0)).filter((f): f is TdescField => Boolean(f));

  return {
    className: meta.className,
    path: meta.path,
    ...(meta.module ? { module: meta.module } : {}),
    ...(meta.description ? { description: meta.description } : {}),
    fields,
    version: meta.version,
    fetchedAt: new Date().toISOString(),
  };
}

/* ---------- network ---------- */

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API}/${path}`, { headers: { Accept: "application/json" } });
  const text = await res.text();
  if (!res.ok) {
    let detail = text.slice(0, 200);
    try {
      const parsed = JSON.parse(text) as { detail?: string; error?: string };
      detail = parsed.detail ?? parsed.error ?? detail;
    } catch {
      /* keep raw text */
    }
    throw new Error(`Lot51 request failed (${res.status}): ${detail}`);
  }
  return JSON.parse(text) as T;
}

export async function fetchVersions(): Promise<TdescVersionInfo> {
  const raw = await getJson<{
    current_version?: string;
    versions?: { value: string; release_date?: string }[];
  }>("tdesc/versions");
  return {
    currentVersion: raw.current_version ?? SNAPSHOT_VERSION,
    versions: (raw.versions ?? []).map((v) => ({
      value: v.value,
      ...(v.release_date ? { releaseDate: v.release_date } : {}),
    })),
  };
}

interface TdescHit {
  muid: string;
  class: string;
  module?: string;
  description?: string;
  path: string;
  version: string;
}

/** Searches the Lot51 TDESC index for classes matching a query. */
export async function searchTdescClasses(query: string, version?: string): Promise<TdescHit[]> {
  const params = new URLSearchParams({ q: query, size: "40" });
  if (version) params.set("version", version);
  const raw = await getJson<{ hits?: { hits?: { _source: TdescHit }[] } }>(
    `tdesc/search?${params.toString()}`,
  );
  const hits = (raw.hits?.hits ?? []).map((h) => h._source);
  // The index holds one document per class *per game version*; keep the newest.
  const seen = new Map<string, TdescHit>();
  for (const h of hits) if (!seen.has(h.class)) seen.set(h.class, h);
  return [...seen.values()];
}

export async function fetchTdescClass(
  hit: { class: string; path: string; module?: string; description?: string },
  version: string,
): Promise<TdescClass> {
  const params = new URLSearchParams({ path: hit.path, version });
  const raw = await getJson<unknown>(`tdesc/doc?${params.toString()}`);
  return normalizeTdescDoc(raw, {
    className: hit.class,
    path: hit.path,
    version,
    ...(hit.module ? { module: hit.module } : {}),
    ...(hit.description ? { description: hit.description } : {}),
  });
}

export async function fetchEnums(): Promise<Record<string, Record<string, string>>> {
  return getJson<Record<string, Record<string, string>>>("tdesc/enums");
}

/* ---------- cache ---------- */

export async function getCacheMeta(): Promise<TdescCacheMeta> {
  const meta = await idbGet<TdescCacheMeta>(STORE_META, META_KEY);
  if (meta) return meta;
  return {
    version: SNAPSHOT_VERSION,
    classCount: BUNDLED_CLASSES.length,
    enumCount: Object.keys(BUNDLED_ENUMS).length,
    updatedAt: null,
    bundled: true,
  };
}

export async function getCachedClasses(): Promise<TdescClass[]> {
  const cached = await idbAll<TdescClass>(STORE_TDESC);
  return cached.length ? cached : BUNDLED_CLASSES;
}

export async function getClass(className: string): Promise<TdescClass | null> {
  const cached = await idbGet<TdescClass>(STORE_TDESC, className);
  if (cached) return cached;
  return BUNDLED_CLASSES.find((c) => c.className === className) ?? null;
}

export async function getEnums(): Promise<Record<string, Record<string, string>>> {
  const cached = await idbGet<Record<string, Record<string, string>>>(STORE_META, ENUMS_KEY);
  return cached ?? BUNDLED_ENUMS;
}

/** Classes the builders actually emit — synced first so validation works fast. */
export const CORE_CLASSES = [
  "Career",
  "CareerLevel",
  "CareerTrack",
  "Trait",
  "Buff",
  "Aspiration",
  "AspirationTrack",
  "Statistic",
  "Reward",
  "LootActions",
] as const;

export interface SyncProgress {
  step: string;
  done: number;
  total: number;
}

/**
 * Downloads the current TDESC set for the core classes plus the shared enum
 * table, then stores everything on-device.
 */
export async function syncTdesc(
  onProgress?: (p: SyncProgress) => void,
  signal?: { cancelled: boolean },
): Promise<TdescCacheMeta> {
  const report = (step: string, done: number, total: number) => onProgress?.({ step, done, total });

  report("Checking game version…", 0, CORE_CLASSES.length + 2);
  const versions = await fetchVersions();
  const version = versions.currentVersion;

  const total = CORE_CLASSES.length + 2;
  let done = 1;

  report("Downloading enum tables…", done, total);
  const enums = await fetchEnums();
  await idbSet(STORE_META, ENUMS_KEY, enums);
  done += 1;

  let stored = 0;
  for (const className of CORE_CLASSES) {
    if (signal?.cancelled) break;
    report(`Downloading ${className}…`, done, total);
    try {
      const hits = await searchTdescClasses(className, version);
      const hit = hits.find((h) => h.class === className) ?? hits[0];
      if (hit) {
        const doc = await fetchTdescClass(hit, version);
        await idbSet(STORE_TDESC, doc.className, doc);
        stored += 1;
      }
    } catch (err) {
      // One missing class shouldn't abort the whole sync.
      console.warn(`TDESC sync skipped ${className}:`, err);
    }
    done += 1;
  }

  const meta: TdescCacheMeta = {
    version,
    classCount: stored,
    enumCount: Object.keys(enums).length,
    updatedAt: new Date().toISOString(),
    bundled: false,
  };
  await idbSet(STORE_META, META_KEY, meta);
  return meta;
}

export async function clearTdescCache(): Promise<void> {
  await idbClear(STORE_TDESC);
  await idbSet(STORE_META, META_KEY, {
    version: SNAPSHOT_VERSION,
    classCount: BUNDLED_CLASSES.length,
    enumCount: Object.keys(BUNDLED_ENUMS).length,
    updatedAt: null,
    bundled: true,
  } satisfies TdescCacheMeta);
}

/* ---------- validation ---------- */

/**
 * Checks a flat bag of tuning field values against a cached TDESC class.
 * Unknown fields and bad enum values are the two mistakes that actually break
 * a mod in-game, so those are what we surface.
 */
export function validateFields(
  cls: TdescClass,
  values: Record<string, unknown>,
  enums: Record<string, Record<string, string>> = {},
): TdescIssue[] {
  const issues: TdescIssue[] = [];
  const byName = new Map(cls.fields.map((f) => [f.name, f]));

  for (const [name, value] of Object.entries(values)) {
    const field = byName.get(name);
    if (!field) {
      issues.push({
        level: "warning",
        field: name,
        message: `"${name}" is not a field on ${cls.className} (TDESC ${cls.version}). The game will ignore it.`,
      });
      continue;
    }
    if (field.deprecated) {
      issues.push({
        level: "warning",
        field: name,
        message: `"${name}" is deprecated in TDESC ${cls.version}.`,
      });
    }
    if (value === undefined || value === null || value === "") continue;

    if (field.enumSource) {
      const table = enums[field.enumSource];
      const raw = String(value);
      if (table && !(raw in table) && !Object.values(table).includes(raw)) {
        issues.push({
          level: "error",
          field: name,
          message: `"${raw}" is not a valid ${field.type} value. Allowed: ${Object.keys(table).slice(0, 8).join(", ")}${
            Object.keys(table).length > 8 ? "…" : ""
          }`,
        });
      }
      continue;
    }

    if (field.type === "bool" && !/^(true|false)$/i.test(String(value))) {
      issues.push({ level: "error", field: name, message: `"${name}" must be True or False.` });
    }
    if ((field.type === "int" || field.type === "float") && Number.isNaN(Number(value))) {
      issues.push({ level: "error", field: name, message: `"${name}" must be a number.` });
    }
  }

  return issues;
}
