/**
 * Unified reference lookup.
 *
 * Merges the three sources a picker can draw from — curated built-ins, the
 * user's locally indexed install, and Lot51's online Simdex — in that order of
 * trust. Built-ins and the local index always work offline; Lot51 is tried
 * last and its failure never breaks a lookup.
 */

import { searchBuiltins } from "./builtin-ids";
import { searchLocal } from "./index-scan";
import { searchStrings, searchTuning } from "./simdex";
import type { GameRef, GameRefKind } from "./types";

export interface LookupOptions {
  kind?: GameRefKind;
  /** Set false to stay fully offline. */
  online?: boolean;
  limit?: number;
}

export interface LookupResult {
  refs: GameRef[];
  /** Set when the online lookup failed; offline results are still returned. */
  onlineError?: string;
}

export async function lookupRefs(query: string, options: LookupOptions = {}): Promise<LookupResult> {
  const { kind, online = true, limit = 60 } = options;
  const byId = new Map<string, GameRef>();

  const add = (refs: GameRef[]) => {
    for (const r of refs) if (!byId.has(r.id)) byId.set(r.id, r);
  };

  add(searchBuiltins(query, kind));
  add(await searchLocal(query, kind, limit));

  let onlineError: string | undefined;
  if (online && query.trim().length >= 2 && byId.size < limit) {
    try {
      add(kind === "string" ? await searchStrings(query) : await searchTuning(query));
    } catch (err) {
      onlineError = err instanceof Error ? err.message : String(err);
    }
  }

  return {
    refs: [...byId.values()].slice(0, limit),
    ...(onlineError ? { onlineError } : {}),
  };
}

export const SOURCE_LABEL: Record<GameRef["source"], string> = {
  builtin: "Built-in",
  local: "Your install",
  lot51: "Lot51",
  custom: "Custom",
};
