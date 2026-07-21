# Community Library — Beta (Supabase Free)

## Current state (verified)

- No `src/integrations/supabase/` — **Lovable Cloud is not enabled yet**.
- No `communityUploadsEnabled` flag anywhere; `TemplatesGallery` already understands `community-submission` as a template source.
- All project data today lives in `store.tsx` (localStorage).

## Approach

Ship in **two clean layers** so the frontend + service adapter can land immediately (per your rule: "if Supabase is not connected yet, build the complete frontend and service interfaces but show `Community service not configured`; do not simulate uploads"). Then, if you say the word, enable Lovable Cloud (Supabase Free under the hood — no paid upgrade) and wire the backend.

### Layer 1 — Frontend + service adapter (no backend yet)

New workspace section under **Library** in the sidebar:

- Label: `Community Library — Beta`
- Notice banner at top of every subview:
  > Community features depend on available free cloud capacity. Uploads may be temporarily paused while browsing and local projects remain available.
- When adapter reports `configured: false`, subviews render a single centered card **"Community service not configured"** — no simulated data, no fake uploads/ratings/downloads/creators/reviews.

Subviews:
1. **Browse** — search + filter by kind (Career / Trait / Aspiration / Buff / Notification / Snippet / Project bundle). Paginated (20/page). Lists only `approved` items. Loads compressed thumbnail preview (never full image).
2. **My uploads** — user's own items across all statuses (draft, pending, approved, rejected, hidden). Shows quota usage: `X / 10 uploads used`.
3. **Upload** — form with kind picker, name, description, tags, single preview image, resource file. Enforces client-side validation (see limits). Disabled entirely when `communityUploadsEnabled=false` (shows moderator-set reason).
4. **Admin** (only for users with `admin` role, once auth is wired) — global `communityUploadsEnabled` toggle + moderation queue (pending → approve / reject / hide).

**Service adapter** at `src/lib/community/adapter.ts` — a TypeScript interface used by every subview:

```ts
export interface CommunityAdapter {
  isConfigured(): boolean;
  getFlags(): Promise<{ uploadsEnabled: boolean; reason?: string }>;
  list(q: BrowseQuery): Promise<Page<CommunityItem>>;
  getMine(): Promise<CommunityItem[]>;
  upload(input: UploadInput): Promise<CommunityItem>;   // rejects when disabled or quota hit
  download(id: string): Promise<Blob>;
  // admin-only
  setUploadsEnabled?(enabled: boolean, reason?: string): Promise<void>;
  moderate?(id: string, status: ModerationStatus): Promise<void>;
}
```

Two implementations:
- `NullAdapter` — used when Cloud is off. `isConfigured() = false`, every other method throws `CommunityServiceNotConfigured`.
- `SupabaseAdapter` — implemented in Layer 2. Codex desktop can import the same file and pass its own Supabase creds; no UI code changes needed.

**Client-side upload safeguards (both layers):**
- Resource file: max **2 MB**; MIME must be `application/json` (Mod Constructor bundle/template/snippet). Reject everything else — no `.package`, `.ts4script`, `.zip`, video, executable.
- Preview image: max **500 KB**, one only, accepted `image/webp`, `image/jpeg`, `image/png`.
- Browser-side WebP compression of previews before upload via `<canvas>` + `toBlob('image/webp', 0.8)`, downscaled to 512×512 max. Only ship the compressed blob.
- JSON validation: parse + shape-check every resource file against the corresponding Mod Constructor type before allowing upload.
- Quota gate: **max 10 community uploads per user** (counted in DB by Layer 2; adapter surfaces `quotaRemaining`).
- Errors shown inline; no infinite retry — one automatic retry on transient network error, then a clear failure toast.

**No comments · no DMs · no follows · no activity feed · no AI moderation.** Not built, not stubbed.

### Layer 2 — Supabase Free backend (opt-in, follow-up)

Enabled only after you confirm. Uses Lovable Cloud (Supabase Free) — no paid plan is enabled and none can be triggered automatically.

Schema (migration):
- `community_flags(key text primary key, value jsonb, updated_at)` — seeded with `{ uploads_enabled: true }`.
- `community_items(id, owner_id → auth.users, kind, name, description, tags text[], preview_path, resource_path, size_bytes, status enum('draft','pending','approved','rejected','hidden'), created_at, updated_at, moderated_by, moderation_note)`.
- `user_roles(user_id, role app_role)` + `has_role()` security-definer function per platform standard.
- Full GRANT block for every new table.

RLS:
- Anyone (`anon` + `authenticated`) can SELECT `community_items` **only** where `status = 'approved'`.
- Authenticated users can SELECT their own rows in any status; can INSERT with `status IN ('draft','pending')` and `owner_id = auth.uid()`; can UPDATE/DELETE only their own draft/pending rows.
- Admins (via `has_role`) can UPDATE status/moderation fields and toggle `community_flags`.
- Quota enforced by a `BEFORE INSERT` trigger counting rows for `owner_id`.

Storage:
- Two **private** buckets: `community-resources` (2 MB cap) and `community-previews` (500 KB cap). Objects served via short-lived signed URLs; approved-item previews signed by a `createServerFn`. No public bucket = no free-tier bandwidth surprises.

Server functions (`createServerFn` — no Edge Functions):
- `communityList`, `communityGetMine`, `communityUpload` (validates size/MIME/quota + inserts row + returns signed upload URLs), `communityDownload`, `communitySetFlag`, `communityModerate`. All read `process.env.SUPABASE_URL` etc. inside the handler; admin ops verify role with `context.supabase` before importing `supabaseAdmin`.

Auth:
- Enable email/password + Google (Lovable-managed OAuth). Sign-in required only for uploading/managing; browsing approved items works signed-out.

New uploads always land as `pending`. They are invisible to everyone except the owner and admins until an admin approves.

## What ships in this turn

**Layer 1 only** — the full UI + adapter interface + `NullAdapter`, mounted in the sidebar under Library. Every upload path is disabled with the "not configured" card. No fake data anywhere.

I'll stop before Layer 2 and ask you to confirm enabling Lovable Cloud (Supabase Free) — because that's the only step that provisions cloud resources, and you asked me never to silently upgrade or enable a paid plan.

## Free-tier guardrails encoded in the plan

- Private buckets + signed URLs (no bandwidth-heavy public egress).
- Hard 2 MB / 500 KB / 1-image / 10-uploads limits, enforced client-side AND server-side (RLS + trigger).
- `communityUploadsEnabled` kill switch stops new writes without affecting reads.
- Paginated list, thumbnail-only previews in browse view.
- No AI, no video, no ZIP, no `.package`, no executables — MIME-checked client- and server-side.
- Never auto-retry beyond one attempt; surface storage errors verbatim.

## Out of scope (explicit non-goals)

Comments, DMs, follows, activity feed, AI moderation, ratings, downloads counter, reviews, `.package` / `.ts4script` / ZIP uploads, video, multi-image galleries.
