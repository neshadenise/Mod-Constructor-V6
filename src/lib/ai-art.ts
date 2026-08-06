/**
 * AI art helpers.
 *
 * Two prompt presets keep generated art on-style:
 *   • icon  — square, Sims-style glossy rounded plumbob-adjacent icon art
 *   • cover — 16:9 career/aspiration cover art
 *
 * Everything runs through the /api/generate-image server route so no key
 * ever reaches the browser.
 */

export const TS4_ICON_STYLE =
  "The Sims 4 style game UI icon, cartoon vector artwork: one single centered symbolic subject " +
  "fitting entirely inside a square frame with even padding on all sides, fully transparent " +
  "background (alpha, no backdrop, no circle, no card, no shadow plate), icon only. " +
  "Simlish-style abstract sigil language only — absolutely no words, no letters, no numbers, " +
  "no real-world text, no watermark, no signature. Glossy cartoon shading, soft rim light, " +
  "clean saturated palette with teal/green plumbob accents, rounded friendly shapes, thick " +
  "smooth outlines, crisp and readable at small sizes, symmetrical square composition";

export const TS4_COVER_STYLE =
  "Sims 4 style career cover art: stylized 3D life-simulation render, cheerful cartoon " +
  "realism, soft global illumination, shallow depth of field, vibrant but natural palette, " +
  "in-world scene of the career in action, wide cinematic framing, no text, no logos, " +
  "no watermark, no UI elements";

export function iconPrompt(subject: string) {
  return `${subject.trim() || "generic gameplay"} — ${TS4_ICON_STYLE}.`;
}

export function coverPrompt(subject: string) {
  return `${subject.trim() || "a career workplace scene"} — ${TS4_COVER_STYLE}.`;
}

export async function generateArt(prompt: string): Promise<string> {
  const res = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const json = (await res.json().catch(() => ({}))) as { dataUrl?: string; error?: string };
  if (!res.ok || !json.dataUrl) throw new Error(json.error || `Generation failed (${res.status})`);
  return json.dataUrl;
}

/**
 * Crop + downscale an image file to a target aspect ratio (center crop).
 * Returns a PNG data URL, or null when the browser can't decode the file.
 */
export async function cropToAspect(
  file: File | Blob,
  aspect: number,
  maxWidth = 1024,
): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode-failed"));
      el.src = url;
    });

    const srcAspect = img.width / img.height;
    let sx = 0;
    let sy = 0;
    let sw = img.width;
    let sh = img.height;
    if (srcAspect > aspect) {
      sw = img.height * aspect;
      sx = (img.width - sw) / 2;
    } else {
      sh = img.width / aspect;
      sy = (img.height - sh) / 2;
    }

    const outW = Math.min(maxWidth, Math.round(sw));
    const outH = Math.round(outW / aspect);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
