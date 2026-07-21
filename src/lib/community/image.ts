import { COMMUNITY_LIMITS } from "./types";

/**
 * Downscale and re-encode a user-picked image to WebP in the browser.
 * Guarantees the returned blob is <= COMMUNITY_LIMITS.maxPreviewBytes and
 * within COMMUNITY_LIMITS.previewMaxDimension on the long edge.
 *
 * Returns null if the browser cannot decode the image (unsupported format,
 * corrupt file, etc.) so the caller can surface a clear error instead of
 * uploading garbage.
 */
export async function compressPreview(file: File | Blob): Promise<Blob | null> {
  if (typeof window === "undefined") return null;

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode-failed"));
      el.src = url;
    });

    const maxEdge = COMMUNITY_LIMITS.previewMaxDimension;
    let { width, height } = img;
    if (width > maxEdge || height > maxEdge) {
      const scale = maxEdge / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);

    // Step quality down until we fit under the size cap.
    for (const quality of [0.82, 0.7, 0.6, 0.5, 0.4]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", quality),
      );
      if (blob && blob.size <= COMMUNITY_LIMITS.maxPreviewBytes) return blob;
    }
    return null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
