import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CloudOff,
  Download,
  Info,
  Lock,
  Search,
  Upload,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  getCommunityAdapter,
} from "@/lib/community/adapter";
import {
  COMMUNITY_KIND_LABEL,
  COMMUNITY_KINDS,
  COMMUNITY_LIMITS,
  type BrowseQuery,
  type CommunityFlags,
  type CommunityItem,
  type CommunityKind,
  type ModerationStatus,
  type Page,
  type QuotaInfo,
  CommunityValidationError,
} from "@/lib/community/types";
import { compressPreview, formatBytes } from "@/lib/community/image";
import { validatePreview, validateResource } from "@/lib/community/validate";

const NOTICE =
  "Community features depend on available free cloud capacity. Uploads may be temporarily paused while browsing and local projects remain available.";

function NotConfiguredCard() {
  return (
    <div className="flex min-h-[420px] items-center justify-center">
      <div className="max-w-md rounded-xl border border-dashed border-border/70 bg-card/60 p-8 text-center shadow-sm">
        <CloudOff className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <div className="text-lg font-semibold">Community service not configured</div>
        <p className="mt-2 text-sm text-muted-foreground">
          The Community Library backend is not enabled in this build. Local projects,
          templates and snippets continue to work normally.
        </p>
      </div>
    </div>
  );
}

function BetaNotice() {
  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-[color:var(--blue)]/25 bg-[color:var(--blue)]/5 px-3.5 py-2.5">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--blue)]" />
      <div className="text-xs leading-relaxed text-foreground/85">{NOTICE}</div>
    </div>
  );
}

function StatusPill({ status }: { status: ModerationStatus }) {
  const map: Record<ModerationStatus, string> = {
    draft: "bg-muted text-muted-foreground",
    pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    approved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    rejected: "bg-red-500/15 text-red-600 dark:text-red-400",
    hidden: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        map[status],
      )}
    >
      {status}
    </span>
  );
}

function ItemCard({
  item,
  onDownload,
}: {
  item: CommunityItem;
  onDownload?: (item: CommunityItem) => void;
}) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card/70 shadow-sm transition-all hover:border-[color:var(--teal)]/50 hover:shadow-md">
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-muted/60 to-muted/30">
        {item.previewUrl ? (
          // Thumbnail-only; full-res never loaded in browse view.
          <img
            src={item.previewUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No preview
          </div>
        )}
        <div className="absolute left-2 top-2 rounded-md bg-background/85 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/80 backdrop-blur">
          {COMMUNITY_KIND_LABEL[item.kind]}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-sm font-semibold">{item.name}</div>
          <StatusPill status={item.status} />
        </div>
        {item.description && (
          <div className="line-clamp-2 text-xs text-muted-foreground">
            {item.description}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between pt-1">
          <div className="text-[10px] text-muted-foreground/80">
            {formatBytes(item.resourceSize)}
          </div>
          {onDownload && (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 gap-1.5 text-xs"
              onClick={() => onDownload(item)}
            >
              <Download className="h-3 w-3" />
              Import
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Browse ----------
function BrowseTab() {
  const adapter = getCommunityAdapter();
  const configured = adapter.isConfigured();

  const [kind, setKind] = useState<CommunityKind | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<CommunityItem> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const q: BrowseQuery = { kind, search: search.trim() || undefined, page };
    adapter
      .list(q)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load results");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [adapter, configured, kind, search, page]);

  if (!configured) return <NotConfiguredCard />;

  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / Math.max(1, data.pageSize)))
    : 1;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search approved uploads"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={kind}
          onValueChange={(v) => {
            setKind(v as CommunityKind | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All kinds</SelectItem>
            {COMMUNITY_KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {COMMUNITY_KIND_LABEL[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          <AlertTriangle className="h-3.5 w-3.5" /> {error}
        </div>
      )}

      {loading && (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
      )}

      {!loading && data && data.items.length === 0 && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          No approved uploads match this filter yet.
        </div>
      )}

      {!loading && data && data.items.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.items.map((it) => (
              <ItemCard
                key={it.id}
                item={it}
                onDownload={async (item) => {
                  try {
                    await adapter.download(item.id);
                    toast.success("Imported into local library");
                  } catch (e) {
                    toast.error(
                      e instanceof Error ? e.message : "Download failed",
                    );
                  }
                }}
              />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <div>
              Page {data.page} of {totalPages} · {data.total} approved item
              {data.total === 1 ? "" : "s"}
            </div>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------- My uploads ----------
function MineTab() {
  const adapter = getCommunityAdapter();
  const configured = adapter.isConfigured();
  const [items, setItems] = useState<CommunityItem[] | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    Promise.all([adapter.getMine(), adapter.getQuota()])
      .then(([mine, q]) => {
        if (cancelled) return;
        setItems(mine);
        setQuota(q);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [adapter, configured]);

  if (!configured) return <NotConfiguredCard />;

  return (
    <div>
      {quota && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-border/70 bg-card/70 px-3.5 py-2.5 text-sm">
          <div>
            <div className="font-semibold">Your uploads</div>
            <div className="text-xs text-muted-foreground">
              {quota.used} / {quota.limit} used · {quota.remaining} remaining on the
              free tier
            </div>
          </div>
          <Badge variant={quota.remaining > 0 ? "secondary" : "destructive"}>
            {quota.remaining > 0 ? "Slots available" : "Quota full"}
          </Badge>
        </div>
      )}

      {items === null && (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
      )}
      {items && items.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          You haven&rsquo;t uploaded anything yet.
        </div>
      )}
      {items && items.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <ItemCard key={it.id} item={it} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Upload ----------
function UploadTab() {
  const adapter = getCommunityAdapter();
  const configured = adapter.isConfigured();
  const [flags, setFlags] = useState<CommunityFlags | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);

  const [kind, setKind] = useState<CommunityKind>("career");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [compressedPreview, setCompressedPreview] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const resourceRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!configured) return;
    Promise.all([adapter.getFlags(), adapter.getQuota()])
      .then(([f, q]) => {
        setFlags(f);
        setQuota(q);
      })
      .catch(() => setFlags({ uploadsEnabled: false, reason: "Unable to read flags" }));
  }, [adapter, configured]);

  useEffect(() => {
    if (!compressedPreview) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(compressedPreview);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [compressedPreview]);

  if (!configured) return <NotConfiguredCard />;

  const disabled =
    !flags?.uploadsEnabled || (quota && quota.remaining <= 0) || busy;

  const disabledReason = !flags?.uploadsEnabled
    ? flags?.reason || "Community uploads are currently paused."
    : quota && quota.remaining <= 0
      ? "You have reached the 10-upload community limit."
      : null;

  async function handleResourcePick(file: File | null) {
    setResourceFile(null);
    setError(null);
    if (!file) return;
    try {
      await validateResource(file, kind);
      setResourceFile(file);
    } catch (e) {
      setError(
        e instanceof CommunityValidationError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Invalid file",
      );
    }
  }

  async function handlePreviewPick(file: File | null) {
    setPreviewFile(null);
    setCompressedPreview(null);
    setError(null);
    if (!file) return;
    try {
      validatePreview(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid preview");
      return;
    }
    const compressed = await compressPreview(file);
    if (!compressed) {
      setError(
        "Preview could not be compressed under 500 KB. Try a smaller image.",
      );
      return;
    }
    setPreviewFile(file);
    setCompressedPreview(compressed);
  }

  async function handleSubmit() {
    setError(null);
    if (!resourceFile) {
      setError("Please select a resource file to upload.");
      return;
    }
    if (!name.trim()) {
      setError("Please provide a name.");
      return;
    }
    setBusy(true);
    try {
      await adapter.upload({
        kind,
        name: name.trim(),
        description: description.trim(),
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 8),
        resource: resourceFile,
        preview: compressedPreview ?? undefined,
      });
      toast.success(
        "Upload submitted — an admin will review it before it appears publicly.",
      );
      setName("");
      setDescription("");
      setTags("");
      setResourceFile(null);
      setPreviewFile(null);
      setCompressedPreview(null);
      if (resourceRef.current) resourceRef.current.value = "";
      if (previewRef.current) previewRef.current.value = "";
      // Refresh quota — one retry only, no infinite loop.
      adapter.getQuota().then(setQuota).catch(() => {});
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl">
      {disabledReason && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <div className="font-semibold">Uploads paused</div>
            <div className="mt-0.5">{disabledReason}</div>
          </div>
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-border/70 bg-card/70 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Kind</label>
            <Select
              value={kind}
              onValueChange={(v) => setKind(v as CommunityKind)}
              disabled={disabled ?? false}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMUNITY_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {COMMUNITY_KIND_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Name</label>
            <Input
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 80))}
              placeholder="e.g. Detective Career"
              disabled={disabled ?? false}
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">
            Description
          </label>
          <Textarea
            className="mt-1 min-h-[80px]"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            placeholder="Short description shown on the browse card."
            disabled={disabled ?? false}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">
            Tags (comma separated, up to 8)
          </label>
          <Input
            className="mt-1"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. sci-fi, active, adult"
            disabled={disabled ?? false}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              Resource file <span className="text-foreground/60">(JSON, max 2 MB)</span>
            </label>
            <input
              ref={resourceRef}
              type="file"
              accept="application/json,.json"
              className="mt-1 block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-secondary-foreground"
              onChange={(e) => handleResourcePick(e.target.files?.[0] ?? null)}
              disabled={disabled ?? false}
            />
            {resourceFile && (
              <div className="mt-1 text-[11px] text-muted-foreground">
                {resourceFile.name} · {formatBytes(resourceFile.size)}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              Preview image <span className="text-foreground/60">(1 image, max 500 KB)</span>
            </label>
            <input
              ref={previewRef}
              type="file"
              accept="image/webp,image/jpeg,image/png"
              className="mt-1 block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-secondary-foreground"
              onChange={(e) => handlePreviewPick(e.target.files?.[0] ?? null)}
              disabled={disabled ?? false}
            />
            {previewUrl && compressedPreview && (
              <div className="mt-1 flex items-center gap-2">
                <img
                  src={previewUrl}
                  alt=""
                  className="h-10 w-10 rounded-md object-cover"
                />
                <div className="text-[11px] text-muted-foreground">
                  Compressed to WebP · {formatBytes(compressedPreview.size)}
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div>{error}</div>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="text-[11px] text-muted-foreground">
            Uploads land as <span className="font-semibold">pending</span> and are
            invisible to other users until an admin approves them.
          </div>
          <Button onClick={handleSubmit} disabled={disabled ?? false} className="gap-1.5">
            <UploadCloud className="h-4 w-4" />
            {busy ? "Uploading…" : "Submit for review"}
          </Button>
        </div>
      </div>

      <div className="mt-4 text-[11px] text-muted-foreground">
        Free-tier limits: 2 MB resource · 500 KB preview · 1 preview image · 10 uploads
        per user. No <code>.package</code>, <code>.ts4script</code>, ZIP, video or
        executable files.
      </div>
    </div>
  );
}

// ---------- Admin ----------
function AdminTab() {
  const adapter = getCommunityAdapter();
  const configured = adapter.isConfigured();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [flags, setFlags] = useState<CommunityFlags | null>(null);
  const [pending, setPending] = useState<CommunityItem[] | null>(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    (async () => {
      const admin = adapter.isAdmin ? await adapter.isAdmin() : false;
      if (cancelled) return;
      setIsAdmin(admin);
      if (!admin) return;
      const [f, list] = await Promise.all([
        adapter.getFlags(),
        adapter.listPending?.() ?? Promise.resolve([]),
      ]);
      if (cancelled) return;
      setFlags(f);
      setReason(f.reason ?? "");
      setPending(list);
    })().catch(() => !cancelled && setIsAdmin(false));
    return () => {
      cancelled = true;
    };
  }, [adapter, configured]);

  if (!configured) return <NotConfiguredCard />;
  if (isAdmin === null) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Checking…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        This section is only available to administrators.
      </div>
    );
  }

  async function toggleUploads(v: boolean) {
    if (!adapter.setUploadsEnabled) return;
    try {
      await adapter.setUploadsEnabled(v, reason.trim() || undefined);
      setFlags({ uploadsEnabled: v, reason: reason.trim() || undefined });
      toast.success(v ? "Uploads enabled." : "Uploads paused.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update flag");
    }
  }

  async function moderate(id: string, status: ModerationStatus) {
    if (!adapter.moderate) return;
    setBusyId(id);
    try {
      await adapter.moderate(id, status);
      setPending((cur) => (cur ? cur.filter((c) => c.id !== id) : cur));
      toast.success(`Marked ${status}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Moderation failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/70 bg-card/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Global upload switch</div>
            <div className="text-xs text-muted-foreground">
              When off, users may still browse and import approved resources.
            </div>
          </div>
          <Button
            variant={flags?.uploadsEnabled ? "destructive" : "default"}
            onClick={() => toggleUploads(!flags?.uploadsEnabled)}
          >
            {flags?.uploadsEnabled ? "Pause uploads" : "Enable uploads"}
          </Button>
        </div>
        <div className="mt-3">
          <label className="text-xs font-semibold text-muted-foreground">
            Reason shown to users when paused
          </label>
          <Input
            className="mt-1"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 160))}
            placeholder="e.g. Approaching free-tier storage cap; will resume next month."
          />
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold">Pending review</div>
        {pending === null && (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        )}
        {pending && pending.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/70 py-8 text-center text-sm text-muted-foreground">
            The moderation queue is empty.
          </div>
        )}
        {pending && pending.length > 0 && (
          <div className="space-y-2">
            {pending.map((it) => (
              <div
                key={it.id}
                className="flex items-center gap-3 rounded-lg border border-border/70 bg-card/60 p-3"
              >
                <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                  {it.previewUrl ? (
                    <img
                      src={it.previewUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{it.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {COMMUNITY_KIND_LABEL[it.kind]} · {formatBytes(it.resourceSize)}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyId === it.id}
                    onClick={() => moderate(it.id, "approved")}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === it.id}
                    onClick={() => moderate(it.id, "rejected")}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === it.id}
                    onClick={() => moderate(it.id, "hidden")}
                  >
                    Hide
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CommunityLibrary() {
  const adapter = getCommunityAdapter();
  const configured = adapter.isConfigured();
  const showAdmin = useMemo(() => configured && !!adapter.isAdmin, [adapter, configured]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Community Library</h1>
        <Badge variant="secondary" className="uppercase tracking-wider">
          Beta
        </Badge>
      </div>
      <BetaNotice />

      <Tabs defaultValue="browse">
        <TabsList>
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="mine">My uploads</TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="mr-1 h-3.5 w-3.5" />
            Upload
          </TabsTrigger>
          {showAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>
        <TabsContent value="browse" className="mt-4">
          <BrowseTab />
        </TabsContent>
        <TabsContent value="mine" className="mt-4">
          <MineTab />
        </TabsContent>
        <TabsContent value="upload" className="mt-4">
          <UploadTab />
        </TabsContent>
        {showAdmin && (
          <TabsContent value="admin" className="mt-4">
            <AdminTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
