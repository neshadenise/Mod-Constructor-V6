import {
  type BrowseQuery,
  type CommunityFlags,
  type CommunityItem,
  type ModerationStatus,
  type Page,
  type QuotaInfo,
  type UploadInput,
  CommunityServiceNotConfigured,
} from "./types";

/**
 * Backend-agnostic Community Library contract.
 *
 * The Lovable web app ships a NullAdapter (returned when Lovable Cloud is
 * off). Codex desktop can drop in its own implementation — for example a
 * SupabaseAdapter reading Supabase credentials from a settings file — and
 * reuse every subview without changes.
 */
export interface CommunityAdapter {
  /** true when the backend is wired up. When false the UI must not simulate. */
  isConfigured(): boolean;

  /** Read the admin-set upload kill switch + optional reason. */
  getFlags(): Promise<CommunityFlags>;

  /** Paginated list of *approved* items only. */
  list(query: BrowseQuery): Promise<Page<CommunityItem>>;

  /** Current user's items across every status. */
  getMine(): Promise<CommunityItem[]>;

  /** Current user's quota usage. */
  getQuota(): Promise<QuotaInfo>;

  /** Upload a new item. Always lands as `pending` (never public until moderated). */
  upload(input: UploadInput): Promise<CommunityItem>;

  /** Fetch a resource blob for import. */
  download(id: string): Promise<Blob>;

  // ---- admin only ----
  isAdmin?(): Promise<boolean>;
  setUploadsEnabled?(enabled: boolean, reason?: string): Promise<void>;
  listPending?(): Promise<CommunityItem[]>;
  moderate?(id: string, status: ModerationStatus, note?: string): Promise<void>;
}

/**
 * Adapter used when the community backend is not configured. Every
 * mutating method throws CommunityServiceNotConfigured — the UI reads
 * `isConfigured() === false` first and shows the "not configured" card,
 * so these should not fire in normal use.
 */
export class NullCommunityAdapter implements CommunityAdapter {
  isConfigured() {
    return false;
  }
  async getFlags(): Promise<CommunityFlags> {
    return { uploadsEnabled: false, reason: "Community service not configured" };
  }
  async list(): Promise<Page<CommunityItem>> {
    return { items: [], page: 1, pageSize: 0, total: 0 };
  }
  async getMine(): Promise<CommunityItem[]> {
    return [];
  }
  async getQuota(): Promise<QuotaInfo> {
    return { used: 0, limit: 0, remaining: 0 };
  }
  async upload(): Promise<CommunityItem> {
    throw new CommunityServiceNotConfigured();
  }
  async download(): Promise<Blob> {
    throw new CommunityServiceNotConfigured();
  }
}

let currentAdapter: CommunityAdapter = new NullCommunityAdapter();

/** Replaced at runtime by Codex desktop or by Layer 2 when Cloud is enabled. */
export function setCommunityAdapter(adapter: CommunityAdapter) {
  currentAdapter = adapter;
}

export function getCommunityAdapter(): CommunityAdapter {
  return currentAdapter;
}
