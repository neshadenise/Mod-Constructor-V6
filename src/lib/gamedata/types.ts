/** Shared types for the game-data reference system. */

/** Where a reference entry came from — shown as a provenance badge in pickers. */
export type GameRefSource = "builtin" | "lot51" | "local" | "custom";

export type GameRefKind =
  | "buff"
  | "trait"
  | "career"
  | "career_track"
  | "aspiration"
  | "statistic"
  | "interaction"
  | "loot"
  | "string"
  | "other";

/** A single resolvable game reference (an instance ID with a human name). */
export interface GameRef {
  /** Decimal instance id as a string (IDs exceed Number.MAX_SAFE_INTEGER). */
  id: string;
  name: string;
  kind: GameRefKind;
  /** Python module, e.g. "buffs.buff". */
  module?: string;
  className?: string;
  source: GameRefSource;
  /** Localized text, for string references. */
  value?: string;
  /** Hex form, mostly used for STBL keys. */
  hex?: string;
}

/* ---------- TDESC ---------- */

export interface TdescField {
  name: string;
  /** Tunable type, e.g. "bool", "int", "aspiration". */
  type: string;
  /** Tunable class, e.g. "Tunable", "TunableList", "TunableReference". */
  className: string;
  default?: string;
  description?: string;
  display?: string;
  group?: string;
  /** Enum lookup key into the enum table, e.g. "careers-career_tuning.ActiveCareerType". */
  enumSource?: string;
  deprecated?: boolean;
  /** Nested fields for lists/variants/tuple tunables. */
  children?: TdescField[];
}

export interface TdescClass {
  /** Class name, e.g. "Career". */
  className: string;
  /** TDESC file path used to fetch it, e.g. "Careers/Descriptions/Career.tdesc". */
  path: string;
  module?: string;
  description?: string;
  fields: TdescField[];
  version: string;
  fetchedAt: string;
}

export interface TdescVersionInfo {
  currentVersion: string;
  versions: { value: string; releaseDate?: string }[];
}

export interface TdescCacheMeta {
  version: string | null;
  classCount: number;
  enumCount: number;
  updatedAt: string | null;
  /** True when data came from the bundled offline snapshot rather than a sync. */
  bundled: boolean;
}

/* ---------- Validation ---------- */

export type TdescIssueLevel = "error" | "warning";

export interface TdescIssue {
  level: TdescIssueLevel;
  field: string;
  message: string;
}
