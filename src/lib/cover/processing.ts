/**
 * Cover image processing — auto-fit, subject-aware crop, high quality resize.
 *
 * Everything runs in the browser on a canvas. Downscaling uses repeated
 * halving (a good Lanczos stand-in) so 128×64 thumbnails stay crisp instead of
 * aliasing. Aspect ratio is never distorted: images are scaled to *fill* the
 * frame and the overflow is cropped.
 */
import {
  COVER_ASPECT,
  COVER_MASTER_HEIGHT,
  COVER_MASTER_WIDTH,
  COVER_SIZES,
  DEFAULT_TRANSFORM,
  type CoverAsset,
  type CoverSizeKey,
  type CoverSource,
  type CoverTransform,
} from "./types";

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not decode that image"));
    el.src = src;
  });
}

export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("Could not read that file"));
    fr.readAsDataURL(file);
  });
}

/* ------------------------------ smart crop ------------------------------ */

/**
 * Subject-aware horizontal/vertical bias.
 *
 * Samples the image at low resolution and scores each cell by local contrast
 * (edge energy) plus a skin-tone bonus — faces and characters carry far more
 * high-frequency detail than backdrops, so the energy centroid lands on the
 * Sims rather than on an empty wall. The result is blended with the frame
 * centre so a crop never swings wildly to one edge.
 */
export function detectSubjectBias(img: HTMLImageElement): { x: number; y: number } {
  try {
    const W = 64;
    const H = Math.max(1, Math.round((W * img.height) / img.width));
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { x: 0.5, y: 0.5 };
    ctx.drawImage(img, 0, 0, W, H);
    const { data } = ctx.getImageData(0, 0, W, H);
    const lum = new Float32Array(W * H);
    const skin = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      lum[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      skin[i] = r > 95 && g > 40 && b > 20 && mx - mn > 15 && r > g && g > b ? 1 : 0;
    }

    let sx = 0;
    let sy = 0;
    let total = 0;
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        const gx = Math.abs(lum[i - 1] - lum[i + 1]);
        const gy = Math.abs(lum[i - W] - lum[i + W]);
        const w = gx + gy + skin[i] * 120;
        sx += x * w;
        sy += y * w;
        total += w;
      }
    }
    if (total <= 0) return { x: 0.5, y: 0.5 };
    const cx = sx / total / (W - 1);
    // Faces sit above the energy centroid — bias the vertical anchor upward a
    // touch so heads survive the crop.
    const cy = Math.max(0, sy / total / (H - 1) - 0.06);
    // Blend 60/40 toward centre so nothing important slides off frame.
    return { x: 0.5 + (cx - 0.5) * 0.6, y: 0.5 + (cy - 0.5) * 0.6 };
  } catch {
    return { x: 0.5, y: 0.5 };
  }
}

/** Auto-fit transform: fill the frame, crop the overflow around the subject. */
export function autoFitTransform(img: HTMLImageElement): CoverTransform {
  const bias = detectSubjectBias(img);
  return {
    ...DEFAULT_TRANSFORM,
    auto: true,
    // −1…1 pan expressed relative to the available overflow.
    offsetX: clamp((0.5 - bias.x) * 2, -1, 1),
    offsetY: clamp((0.5 - bias.y) * 2, -1, 1),
  };
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/* ------------------------------- rendering ------------------------------ */

/** Render the original into the cover frame at an arbitrary width. */
export function renderCover(
  img: HTMLImageElement,
  transform: CoverTransform,
  width = COVER_MASTER_WIDTH,
): string {
  const height = Math.round(width / COVER_ASPECT);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, width, height);

  const rad = (transform.rotate * Math.PI) / 180;
  // Cover-fit scale, expanded so rotation never reveals empty corners.
  const rotExpand = Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad)) / COVER_ASPECT;
  const base = Math.max(width / img.width, height / img.height) * rotExpand;
  const scale = base * Math.max(1, transform.zoom);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const overflowX = Math.max(0, dw - width) / 2;
  const overflowY = Math.max(0, dh - height) / 2;

  ctx.save();
  ctx.translate(width / 2 + transform.offsetX * overflowX, height / 2 + transform.offsetY * overflowY);
  ctx.rotate(rad);
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
  return canvas.toDataURL("image/png");
}

/** High-quality stepped downscale of the fitted master. */
export async function downscale(masterDataUrl: string, width: number): Promise<string> {
  const img = await loadImage(masterDataUrl);
  let curW = img.width;
  let curH = img.height;
  let src: CanvasImageSource = img;

  while (curW / 2 > width) {
    const half = document.createElement("canvas");
    half.width = Math.max(1, Math.round(curW / 2));
    half.height = Math.max(1, Math.round(curH / 2));
    const hctx = half.getContext("2d");
    if (!hctx) break;
    hctx.imageSmoothingEnabled = true;
    hctx.imageSmoothingQuality = "high";
    hctx.drawImage(src, 0, 0, half.width, half.height);
    src = half;
    curW = half.width;
    curH = half.height;
  }

  const out = document.createElement("canvas");
  out.width = width;
  out.height = Math.round(width / COVER_ASPECT);
  const octx = out.getContext("2d");
  if (!octx) return masterDataUrl;
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(src, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}

export async function buildDerivatives(
  master: string,
): Promise<Partial<Record<CoverSizeKey, string>>> {
  const out: Partial<Record<CoverSizeKey, string>> = {};
  for (const size of COVER_SIZES) {
    out[size.key] =
      size.width === COVER_MASTER_WIDTH ? master : await downscale(master, size.width);
  }
  return out;
}

/* ------------------------------ asset build ----------------------------- */

const uid = () => `cov_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

/** Build a complete cover asset (fitted master + every derivative). */
export async function buildCoverAsset(input: {
  original: string;
  source: CoverSource;
  transform?: CoverTransform;
  prompt?: string;
  provider?: string;
  id?: string;
}): Promise<CoverAsset> {
  const img = await loadImage(input.original);
  const transform = input.transform ?? autoFitTransform(img);
  const master = renderCover(img, transform, COVER_MASTER_WIDTH);
  const derivatives = await buildDerivatives(master);
  return {
    id: input.id ?? uid(),
    source: input.source,
    original: input.original,
    originalWidth: img.width,
    originalHeight: img.height,
    transform,
    master,
    derivatives,
    prompt: input.prompt,
    provider: input.provider,
    createdAt: Date.now(),
  };
}

/** Re-render an existing asset after the user pans / zooms / rotates. */
export async function refitCoverAsset(
  asset: CoverAsset,
  transform: CoverTransform,
): Promise<CoverAsset> {
  return buildCoverAsset({
    original: asset.original,
    source: asset.source,
    transform,
    prompt: asset.prompt,
    provider: asset.provider,
    id: asset.id,
  });
}

export { COVER_MASTER_HEIGHT, COVER_MASTER_WIDTH };
