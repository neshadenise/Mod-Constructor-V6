/**
 * Update Center — real status for the game-data sources the app depends on.
 *
 * Three sources, all live:
 *  - Lot 51 TDESC cache (IndexedDB) vs. the current version reported by Lot 51
 *  - The local game install index produced by the folder scanner
 *  - The bundled offline built-in ID registry
 */

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Download, CheckCircle2, Circle, ExternalLink, Radio, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  clearTdescCache,
  fetchVersions,
  getCacheMeta,
  syncTdesc,
  type SyncProgress,
} from "@/lib/gamedata/tdesc";
import { getLocalMeta, type LocalIndexMeta } from "@/lib/gamedata/index-scan";
import { BUILTIN_REFS } from "@/lib/gamedata/builtin-ids";
import type { TdescCacheMeta } from "@/lib/gamedata/types";
import { useAppNavigation } from "@/lib/navigation";

const AUTO_KEY = "mc:gamedata:auto-check";
const LAST_KEY = "mc:gamedata:last-check";

function relative(iso: string | null | undefined) {
  if (!iso) return "never";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "never";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export function UpdateCenter() {
  const nav = useAppNavigation();
  const [meta, setMeta] = useState<TdescCacheMeta | null>(null);
  const [local, setLocal] = useState<LocalIndexMeta | null>(null);
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [syncing, setSyncing] = useState<SyncProgress | null>(null);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [autoCheck, setAutoCheck] = useState(true);

  const refreshLocalState = useCallback(async () => {
    setMeta(await getCacheMeta());
    setLocal(await getLocalMeta());
  }, []);

  useEffect(() => {
    setAutoCheck(localStorage.getItem(AUTO_KEY) !== "off");
    setLastCheck(localStorage.getItem(LAST_KEY));
    void refreshLocalState();
  }, [refreshLocalState]);

  const check = useCallback(
    async (quiet = false) => {
      setChecking(true);
      try {
        const versions = await fetchVersions();
        setRemoteVersion(versions.currentVersion);
        setOffline(false);
        const stamp = new Date().toISOString();
        localStorage.setItem(LAST_KEY, stamp);
        setLastCheck(stamp);
        if (!quiet) {
          const current = await getCacheMeta();
          toast.success(
            current.version === versions.currentVersion && !current.bundled
              ? "Game data is up to date"
              : `Lot 51 has game version ${versions.currentVersion}`,
          );
        }
      } catch {
        setOffline(true);
        if (!quiet) toast.error("Lot 51 is unreachable — cached game data is still in use");
      } finally {
        setChecking(false);
        void refreshLocalState();
      }
    },
    [refreshLocalState],
  );

  // Auto-check once per day when enabled.
  useEffect(() => {
    if (!autoCheck) return;
    const last = localStorage.getItem(LAST_KEY);
    if (last && Date.now() - new Date(last).getTime() < 86_400_000) return;
    void check(true);
  }, [autoCheck, check]);

  const runSync = async () => {
    setSyncing({ step: "Starting…", done: 0, total: 12 });
    try {
      const next = await syncTdesc((p) => setSyncing(p));
      setMeta(next);
      setRemoteVersion(next.version);
      toast.success(`Synced ${next.classCount} tuning classes for ${next.version}`);
    } catch (e) {
      toast.error(`Sync failed: ${(e as Error).message}`);
    } finally {
      setSyncing(null);
    }
  };

  const clearCache = async () => {
    await clearTdescCache();
    await refreshLocalState();
    toast.success("Cached tuning definitions cleared — bundled snapshot restored");
  };

  const tdescStale = !meta || meta.bundled || (!!remoteVersion && meta.version !== remoteVersion);
  const updates = [tdescStale, !local].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--teal)] text-white shadow-sm">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Game Data Sources
            </div>
            <h1 className="text-xl font-bold tracking-tight">Update Center</h1>
          </div>
        </div>
        <button
          onClick={() => void check()}
          disabled={checking}
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--blue)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", checking && "animate-spin")} />
          {checking ? "Checking..." : "Check Now"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatusCard title="Connection" value={offline ? "Offline — using cache" : "Lot 51 reachable"} tone={offline ? "orange" : "green"} />
        <StatusCard
          title="Available"
          value={updates ? `${updates} source${updates > 1 ? "s" : ""} need attention` : "Everything current"}
          tone={updates ? "orange" : "green"}
        />
        <StatusCard title="Last check" value={relative(lastCheck)} tone="blue" />
      </div>

      <section className="rounded-xl border border-border bg-card p-4 card-elevated">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Sources</h2>
          <label className="inline-flex cursor-pointer items-center gap-2 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              checked={autoCheck}
              onChange={(e) => {
                setAutoCheck(e.target.checked);
                localStorage.setItem(AUTO_KEY, e.target.checked ? "on" : "off");
              }}
              className="h-3.5 w-3.5"
            />
            Auto-check daily
          </label>
        </div>

        <div className="space-y-2">
          <SourceRow
            title="Lot 51 TDESC definitions"
            stale={tdescStale}
            detail={
              meta
                ? `Cached ${meta.bundled ? "bundled snapshot" : `${meta.classCount} classes`} · version ${meta.version} · ${meta.enumCount} enum tables · updated ${relative(meta.updatedAt)}`
                : "Reading cache…"
            }
            notes={
              remoteVersion && meta && remoteVersion !== meta.version
                ? `Lot 51 now serves game version ${remoteVersion}.`
                : "Field definitions used to validate every tuning file this app writes."
            }
            action={
              syncing ? (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> {syncing.step} ({syncing.done}/{syncing.total})
                </span>
              ) : tdescStale ? (
                <button
                  onClick={() => void runSync()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[var(--blue)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
                >
                  <Download className="h-3.5 w-3.5" /> Sync
                </button>
              ) : (
                <button
                  onClick={() => void clearCache()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[11px] hover:bg-accent"
                >
                  <Trash2 className="h-3 w-3" /> Clear cache
                </button>
              )
            }
          />

          <SourceRow
            title="Local game install index"
            stale={!local}
            detail={
              local
                ? `${local.tuningCount.toLocaleString()} tuning · ${local.stringCount.toLocaleString()} strings · ${local.packagesScanned} packages · scanned ${relative(local.scannedAt)}`
                : "No local index yet — resource pickers fall back to built-ins."
            }
            notes="Scanned from your own game folder. Nothing leaves this machine."
            action={
              <button
                onClick={() => nav.navigate("gamedata")}
                className="inline-flex items-center gap-1.5 rounded-md bg-[var(--teal)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
              >
                {local ? "Rescan" : "Scan install"}
              </button>
            }
          />

          <SourceRow
            title="Offline built-in registry"
            stale={false}
            detail={`${BUILTIN_REFS.length} curated IDs bundled with the app`}
            notes="Always available, even with no network and no game install."
            action={
              <a
                href="https://lot51.cc"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-accent"
              >
                <ExternalLink className="h-3 w-3" /> Lot 51
              </a>
            }
          />
        </div>
      </section>
    </div>
  );
}

function SourceRow({
  title,
  detail,
  notes,
  stale,
  action,
}: {
  title: string;
  detail: string;
  notes: string;
  stale: boolean;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background/40 p-3 md:flex-row md:items-center">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          {stale ? (
            <span className="rounded-full border border-[var(--orange)]/40 bg-[var(--orange)]/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-[var(--orange)]">
              Action
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--green)]/40 bg-[var(--green)]/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-[var(--green)]">
              <CheckCircle2 className="h-2.5 w-2.5" /> Current
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{detail}</div>
        <div className="mt-1 text-xs text-muted-foreground">{notes}</div>
      </div>
      <div className="flex items-center gap-2">{action}</div>
    </div>
  );
}

function StatusCard({ title, value, tone }: { title: string; value: string; tone: "teal" | "blue" | "green" | "orange" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 card-elevated">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <Circle className="h-2 w-2 fill-current" style={{ color: `var(--${tone})` }} />
        <div className="text-sm font-semibold" style={{ color: `var(--${tone})` }}>
          {value}
        </div>
      </div>
    </div>
  );
}
