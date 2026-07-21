// Shared Community Library types. Kept framework-free so Codex desktop
// can reuse the same adapter contract with a different backend.

export type CommunityKind =
  | "career"
  | "trait"
  | "aspiration"
  | "buff"
  | "notification"
  | "snippet"
  | "project";

export const COMMUNITY_KINDS: CommunityKind[] = [
  "career",
  "trait",
  "aspiration",
  "buff",
  "notification",
  "snippet",
  "project",
];

export const COMMUNITY_KIND_LABEL: Record<CommunityKind, string> = {
  career: "Career template",
  trait: "Trait template",
  aspiration: "Aspiration template",
  buff: "Buff template",
  notification: "Notification template",
  snippet: "Snippet",
  project: "Project bundle",
};

export type ModerationStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "hidden";

export const MODERATION_STATUSES: ModerationStatus[] = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "hidden",
];

// Free-tier hard limits. Mirrored server-side by RLS + storage bucket caps
// when the Supabase adapter is enabled.
export const COMMUNITY_LIMITS = {
  maxResourceBytes: 2 * 1024 * 1024, // 2 MB
  maxPreviewBytes: 500 * 1024, // 500 KB
  maxPreviewsPerUpload: 1,
  maxUploadsPerUser: 10,
  acceptedResourceMime: ["application/json"] as const,
  acceptedPreviewMime: ["image/webp", "image/jpeg", "image/png"] as const,
  previewMaxDimension: 512, // downscale to this square before upload
  pageSize: 20,
} as const;

export interface CommunityItem {
  id: string;
  kind: CommunityKind;
  name: string;
  description: string;
  tags: string[];
  ownerId: string;
  ownerName?: string;
  previewUrl?: string; // signed thumbnail URL when available
  resourceSize: number;
  status: ModerationStatus;
  createdAt: string;
  updatedAt: string;
  moderationNote?: string;
}

export interface BrowseQuery {
  kind?: CommunityKind | "all";
  search?: string;
  page?: number; // 1-indexed
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface UploadInput {
  kind: CommunityKind;
  name: string;
  description: string;
  tags: string[];
  resource: Blob; // validated JSON blob, <= 2 MB
  preview?: Blob; // compressed WebP/JPEG/PNG, <= 500 KB
}

export interface CommunityFlags {
  uploadsEnabled: boolean;
  reason?: string;
}

export interface QuotaInfo {
  used: number;
  limit: number;
  remaining: number;
}

export class CommunityServiceNotConfigured extends Error {
  constructor() {
    super("Community service not configured");
    this.name = "CommunityServiceNotConfigured";
  }
}

export class CommunityUploadsDisabled extends Error {
  constructor(reason?: string) {
    super(reason || "Community uploads are currently disabled");
    this.name = "CommunityUploadsDisabled";
  }
}

export class CommunityQuotaExceeded extends Error {
  constructor(limit: number) {
    super(`Upload quota reached (${limit} per user)`);
    this.name = "CommunityQuotaExceeded";
  }
}

export class CommunityValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommunityValidationError";
  }
}
