/**
 * STBL (localisation) generation and merging.
 *
 * Keys are deterministic FNV-1a 32 hashes of `namespace:kind:name:field`, so a
 * string keeps the same key across every export. Imported entries are never
 * regenerated: they are merged, and removals only happen when the user
 * explicitly deletes an entry.
 */

import { writeStbl } from "@/lib/modimport/export";
import type { StblEntry } from "@/lib/modimport/resource-types";

export type LocaleCode =
  | "en-US" | "zh-CN" | "zh-TW" | "cs-CZ" | "da-DK" | "nl-NL" | "fi-FI" | "fr-FR"
  | "de-DE" | "it-IT" | "ja-JP" | "ko-KR" | "nb-NO" | "pl-PL" | "pt-BR" | "ru-RU"
  | "es-ES" | "sv-SE";

/** Sims 4 STBL locale prefix (first byte of the instance id). */
export const LOCALE_PREFIX: Record<LocaleCode, string> = {
  "en-US": "00", "zh-CN": "01", "zh-TW": "02", "cs-CZ": "03", "da-DK": "04",
  "nl-NL": "05", "fi-FI": "06", "fr-FR": "07", "de-DE": "08", "it-IT": "09",
  "ja-JP": "0A", "ko-KR": "0B", "nb-NO": "0C", "pl-PL": "0D", "pt-BR": "0E",
  "ru-RU": "0F", "es-ES": "10", "sv-SE": "11",
};

export const FALLBACK_LOCALE: LocaleCode = "en-US";

export interface LocalizationEntry {
  id: string;
  key: string;
  locale: LocaleCode;
  value: string;
  source: "imported" | "generated" | "user";
  state: "unchanged" | "modified" | "created" | "deleted";
}

export interface StblIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  key?: string;
}

/**
 * Builds the STBL instance id for a locale. The instance keeps its low bytes so
 * different locales of the same table stay related.
 */
export function stblInstance(baseInstance: string, locale: LocaleCode): string {
  const prefix = LOCALE_PREFIX[locale] ?? "00";
  return (prefix + baseInstance.toUpperCase().padStart(16, "0").slice(2)).toUpperCase();
}

/**
 * Merges generated/edited entries into an imported table.
 * Untouched imported rows are preserved verbatim and keep their order.
 */
export function mergeLocalization(
  imported: StblEntry[],
  changes: LocalizationEntry[],
): { entries: StblEntry[]; issues: StblIssue[] } {
  const issues: StblIssue[] = [];
  const order: string[] = [];
  const map = new Map<string, string>();

  for (const row of imported) {
    const key = row.key.toUpperCase();
    if (!map.has(key)) order.push(key);
    map.set(key, row.value);
  }

  for (const change of changes) {
    const key = change.key.toUpperCase();
    if (change.state === "deleted") {
      map.delete(key);
      continue;
    }
    if (!map.has(key)) order.push(key);
    map.set(key, change.value);
    if (!change.value.trim())
      issues.push({ severity: "warning", code: "STBL_EMPTY_STRING", message: `String ${key} is empty.`, key });
  }

  const entries = order.filter((k) => map.has(k)).map((k) => ({ key: k, value: map.get(k)! }));
  const seen = new Set<string>();
  for (const e of entries) {
    if (seen.has(e.key))
      issues.push({ severity: "error", code: "STBL_DUPLICATE_KEY", message: `Duplicate string key ${e.key}.`, key: e.key });
    seen.add(e.key);
  }
  return { entries, issues };
}

/** Verifies every localisation key referenced by tuning exists in the table. */
export function checkReferences(referenced: string[], entries: StblEntry[]): StblIssue[] {
  const have = new Set(entries.map((e) => e.key.toUpperCase()));
  const issues: StblIssue[] = [];
  for (const ref of new Set(referenced.map((r) => r.toUpperCase()))) {
    if (!have.has(ref))
      issues.push({
        severity: "error",
        code: "STBL_REFERENCE_MISSING",
        message: `Tuning references string ${ref} but no localisation entry exists.`,
        key: ref,
      });
  }
  const referencedSet = new Set(referenced.map((r) => r.toUpperCase()));
  for (const e of entries) {
    if (!referencedSet.has(e.key.toUpperCase()))
      issues.push({
        severity: "warning",
        code: "STBL_ORPHANED_KEY",
        message: `String ${e.key} is not referenced by any tuning resource.`,
        key: e.key,
      });
  }
  return issues;
}

export function serializeStbl(entries: StblEntry[]): Uint8Array {
  return writeStbl(entries);
}
