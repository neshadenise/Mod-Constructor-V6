import {
  COMMUNITY_LIMITS,
  CommunityValidationError,
  type CommunityKind,
} from "./types";

/**
 * Client-side gate: reject anything that can't legally be a Mod Constructor
 * template/snippet/bundle before it ever touches the network.
 *
 * Server-side, the same shape is enforced by RLS + a size-checking trigger
 * so a hand-crafted request cannot bypass this.
 */
export async function validateResource(
  file: File | Blob,
  kind: CommunityKind,
): Promise<unknown> {
  // Size gate first — cheap, hard block.
  if (file.size > COMMUNITY_LIMITS.maxResourceBytes) {
    throw new CommunityValidationError(
      `Resource is ${(file.size / 1024 / 1024).toFixed(2)} MB — the free-tier limit is 2 MB.`,
    );
  }

  // MIME gate. Some browsers report empty type for drag-drop; permit that
  // and rely on the parse below to catch garbage.
  const mime = file.type || "application/json";
  if (
    file.type &&
    !COMMUNITY_LIMITS.acceptedResourceMime.includes(
      mime as (typeof COMMUNITY_LIMITS.acceptedResourceMime)[number],
    )
  ) {
    throw new CommunityValidationError(
      "Only Mod Constructor JSON templates, snippets and project bundles are accepted.",
    );
  }

  // Extension gate — block the formats the spec calls out explicitly.
  const name = "name" in file ? (file as File).name.toLowerCase() : "";
  if (
    name.endsWith(".package") ||
    name.endsWith(".ts4script") ||
    name.endsWith(".zip") ||
    name.endsWith(".exe") ||
    name.endsWith(".dmg") ||
    name.endsWith(".mp4") ||
    name.endsWith(".mov")
  ) {
    throw new CommunityValidationError(
      "This file type is not supported. Upload the Mod Constructor JSON export instead.",
    );
  }

  // Parse JSON.
  let parsed: unknown;
  try {
    const text = await file.text();
    parsed = JSON.parse(text);
  } catch {
    throw new CommunityValidationError("File is not valid JSON.");
  }

  // Shape check — every kind requires at minimum an object with a name.
  if (!parsed || typeof parsed !== "object") {
    throw new CommunityValidationError("JSON root must be an object.");
  }
  const obj = parsed as Record<string, unknown>;

  const requireKey = (k: string) => {
    if (!(k in obj)) {
      throw new CommunityValidationError(
        `Missing required field "${k}" for a ${kind} export.`,
      );
    }
  };

  switch (kind) {
    case "career":
      requireKey("name");
      requireKey("internalId");
      requireKey("branches");
      break;
    case "trait":
      requireKey("name");
      requireKey("internalId");
      break;
    case "aspiration":
      requireKey("name");
      requireKey("internalId");
      break;
    case "buff":
      requireKey("name");
      break;
    case "notification":
      requireKey("name");
      requireKey("title");
      break;
    case "snippet":
      requireKey("name");
      requireKey("body");
      break;
    case "project":
      requireKey("name");
      requireKey("version");
      break;
  }

  return parsed;
}

export function validatePreview(file: File | Blob): void {
  if (file.size > COMMUNITY_LIMITS.maxPreviewBytes) {
    throw new CommunityValidationError(
      `Preview image is ${(file.size / 1024).toFixed(0)} KB — the limit is 500 KB.`,
    );
  }
  const mime = file.type;
  if (
    mime &&
    !COMMUNITY_LIMITS.acceptedPreviewMime.includes(
      mime as (typeof COMMUNITY_LIMITS.acceptedPreviewMime)[number],
    )
  ) {
    throw new CommunityValidationError(
      "Preview must be WebP, JPEG or PNG.",
    );
  }
}
