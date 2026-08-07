/**
 * Career cover artwork — shared data contracts.
 *
 * A cover is stored as an immutable *original* image plus a transform that
 * describes how it is fitted into the 1024×512 master frame. Every display
 * size is derived from the fitted master so framing is identical everywhere.
 */

export const COVER_ASPECT = 2; // 1024 × 512
export const COVER_MASTER_WIDTH = 1024;
export const COVER_MASTER_HEIGHT = 512;

/** Display sizes generated automatically from the fitted master. */
export const COVER_SIZES = [
  { key: "builder", label: "Builder Preview", width: 1024, height: 512 },
  { key: "selection", label: "Career Selection UI", width: 512, height: 256 },
  { key: "thumb", label: "Thumbnail", width: 256, height: 128 },
  { key: "small", label: "Small Preview", width: 128, height: 64 },
] as const;

export type CoverSizeKey = (typeof COVER_SIZES)[number]["key"];

/** How the original image is positioned inside the cover frame. */
export interface CoverTransform {
  /** 1 = fill the frame exactly. >1 zooms in. */
  zoom: number;
  /** −1…1 pan, relative to the overflow available at the current zoom. */
  offsetX: number;
  offsetY: number;
  /** Degrees. */
  rotate: number;
  /** True while the crop is being driven by the auto-fit / smart-crop pass. */
  auto: boolean;
}

export const DEFAULT_TRANSFORM: CoverTransform = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  rotate: 0,
  auto: true,
};

export type CoverSource = "ai" | "upload";

export interface CoverAsset {
  id: string;
  source: CoverSource;
  /** Untouched import — every derivative is re-rendered from this. */
  original: string;
  /** Natural size of the original. */
  originalWidth: number;
  originalHeight: number;
  transform: CoverTransform;
  /** Fitted 1024×512 PNG data URL. */
  master: string;
  /** Downscaled copies keyed by size. */
  derivatives: Partial<Record<CoverSizeKey, string>>;
  /** Prompt used when source === "ai". */
  prompt?: string;
  provider?: string;
  createdAt: number;
}

/** Career + branch covers for one career document. */
export interface CoverSet {
  /** Career-level cover. */
  career?: CoverAsset;
  /** Branch overrides, keyed by branch id. */
  branches: Record<string, CoverAsset>;
  /** Replaced covers, newest first — kept until the user clears them. */
  history: CoverAsset[];
}

export const emptyCoverSet = (): CoverSet => ({ branches: {}, history: [] });

/** Resolve the cover shown for a branch, inheriting the career cover. */
export function resolveCover(set: CoverSet | undefined, branchId?: string | null) {
  if (!set) return undefined;
  if (branchId && set.branches[branchId]) return set.branches[branchId];
  return set.career;
}
