import * as React from "react";
import { toast } from "sonner";
import {
  BookOpen,
  Database,
  Download,
  FolderSearch,
  HardDrive,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  WifiOff,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBytes, idbApproxSize, STORE_LOCAL, STORE_TDESC } from "@/lib/gamedata/db";
import {
  clearLocalIndex,
  getLocalMeta,
  scanPackages,
  type LocalIndexMeta,
  type ScanProgress,
} from "@/lib/gamedata/index-scan";
import { lookupRefs, SOURCE_LABEL } from "@/lib/gamedata/registry";
import {
  clearTdescCache,
  getCacheMeta,
  getCachedClasses,
  getEnums,
  syncTdesc,
  type SyncProgress,
} from "@/lib/gamedata/tdesc";
import type { GameRef, GameRefKind, TdescCacheMeta, TdescClass, TdescField } from "@/lib/gamedata/types";

/* ---------------------------------------------------------------- helpers */

function useCacheSizes(deps: unknown[]) {
  const [sizes, setSizes] = React.useState({ tdesc: 0, local: 0 });
  React.useEffect(() => {
    let alive = true;
    void Promise.all([idbApproxSize(STORE_TDESC), idbApproxSize(STORE_LOCAL)]).then(([tdesc, local]) => {
      if (alive) setSizes({ tdesc, local });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return sizes;
}

function relative(iso: string | null | undefined) {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return `${Math.round(hrs / 24)} d ago`;
}

const SOURCE_TONE: Record<GameRef["source"], string> = {
  builtin: "border-primary/40 text-primary",
  local: "border-emerald-500/40 text-emerald-500",
  lot51: "border-sky-500/40 text-sky-500",
  custom: "border-amber-500/40 text-amber-500",
};

/* ------------------------------------------------------------ TDESC panel */

function FieldRow({ field, depth = 0 }: { field: TdescField; depth?: number }) {
  const [open, setOpen] = React.useState(false);
  const kids = field.children ?? [];
  return (
    <div className="border-b border-border/60 last:border-0">
      <button
        type="button"
        onClick={() => kids.length && setOpen((v) => !v)}
        className="flex w-full items-start gap-3 px-3 py-2 text-left hover:bg-muted/50"
        style={{ paddingLeft: 12 + depth * 16 }}
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <code className="text-xs font-semibold text-foreground">{field.name}</code>
            {field.deprecated ? (
              <Badge variant="outline" className="border-destructive/40 text-[10px] text-destructive">
                deprecated
              </Badge>
            ) : null}
            {field.group ? (
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{field.group}</span>
            ) : null}
          </span>
          {field.description ? (
            <span className="mt-0.5 block whitespace-pre-line text-xs text-muted-foreground">
              {field.description.slice(0, 240)}
            </span>
          ) : null}
        </span>
        <span className="shrink-0 text-right text-[11px] text-muted-foreground">
          <span className="block font-mono">{field.type || field.className}</span>
          {field.default !== undefined ? <span className="block">default {field.default}</span> : null}
          {kids.length ? <span className="block text-primary">{open ? "hide" : `${kids.length} nested`}</span> : null}
        </span>
      </button>
      {open
        ? kids.map((k, i) => <FieldRow key={`${k.name}-${i}`} field={k} depth={depth + 1} />)
        : null}
    </div>
  );
}

function TdescPanel() {
  const [meta, setMeta] = React.useState<TdescCacheMeta | null>(null);
  const [classes, setClasses] = React.useState<TdescClass[]>([]);
  const [enumCount, setEnumCount] = React.useState(0);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState("");
  const [progress, setProgress] = React.useState<SyncProgress | null>(null);
  const [busy, setBusy] = React.useState(false);
  const sizes = useCacheSizes([meta, busy]);

  const reload = React.useCallback(async () => {
    const [m, c, e] = await Promise.all([getCacheMeta(), getCachedClasses(), getEnums()]);
    setMeta(m);
    setClasses(c);
    setEnumCount(Object.keys(e).length);
    setSelected((prev) => prev ?? c[0]?.className ?? null);
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const sync = async () => {
    setBusy(true);
    setProgress({ step: "Starting…", done: 0, total: 1 });
    try {
      const next = await syncTdesc(setProgress);
      await reload();
      toast.success(`Tuning schemas updated`, {
        description: `Game version ${next.version} · ${next.classCount} classes · ${next.enumCount} enum tables cached on-device.`,
      });
    } catch (err) {
      toast.error("Could not reach Lot51", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const clear = async () => {
    await clearTdescCache();
    await reload();
    toast.success("Cached schemas cleared", { description: "Falling back to the bundled offline snapshot." });
  };

  const active = classes.find((c) => c.className === selected) ?? null;
  const visibleFields = active
    ? active.fields.filter((f) =>
        filter ? f.name.toLowerCase().includes(filter.toLowerCase()) : true,
      )
    : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-primary" />
              Tuning schemas
            </CardTitle>
            <CardDescription>
              Field names, types and defaults for every tuning class, from Lot51's TDESC reference.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Game version</dt>
                <dd className="font-mono text-foreground">{meta?.version ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last sync</dt>
                <dd className="text-foreground">{relative(meta?.updatedAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Classes</dt>
                <dd className="text-foreground">{classes.length}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Enum tables</dt>
                <dd className="text-foreground">{enumCount}</dd>
              </div>
            </dl>

            {meta?.bundled ? (
              <p className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
                <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Using the bundled offline snapshot. Sync once to get the current game version — after that it works
                offline.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Cached on-device ({formatBytes(sizes.tdesc)}). No connection needed until the next game patch.
              </p>
            )}

            {progress ? (
              <div className="space-y-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{progress.step}</p>
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button size="sm" onClick={() => void sync()} disabled={busy} className="flex-1">
                {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
                {busy ? "Syncing…" : "Sync from Lot51"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => void clear()} disabled={busy}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Classes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[320px]">
              <div className="p-2">
                {classes.map((c) => (
                  <button
                    key={c.className}
                    type="button"
                    onClick={() => setSelected(c.className)}
                    className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition ${
                      c.className === selected ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    }`}
                  >
                    <span className="block font-medium">{c.className}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {c.module ?? c.path} · {c.fields.length} fields
                    </span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Card className="min-h-[520px]">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">{active?.className ?? "Select a class"}</CardTitle>
              <CardDescription>
                {active ? active.description ?? active.path : "Pick a tuning class to inspect its fields."}
              </CardDescription>
            </div>
            {active ? (
              <div className="relative w-56">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter fields"
                  className="h-8 pl-7 text-xs"
                />
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[520px]">
            {visibleFields.length ? (
              visibleFields.map((f, i) => <FieldRow key={`${f.name}-${i}`} field={f} />)
            ) : (
              <p className="p-6 text-sm text-muted-foreground">
                {active ? "No fields match that filter." : "No class selected."}
              </p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------ Reference lookup */

const KINDS: { value: GameRefKind | "all"; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "buff", label: "Buffs & moods" },
  { value: "trait", label: "Traits" },
  { value: "career", label: "Careers" },
  { value: "aspiration", label: "Aspirations" },
  { value: "statistic", label: "Skills & stats" },
  { value: "string", label: "Game strings" },
];

function LookupPanel() {
  const [query, setQuery] = React.useState("");
  const [kind, setKind] = React.useState<GameRefKind | "all">("all");
  const [online, setOnline] = React.useState(true);
  const [refs, setRefs] = React.useState<GameRef[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const run = React.useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await lookupRefs(query, {
        ...(kind === "all" ? {} : { kind }),
        online,
      });
      setRefs(result.refs);
      setError(result.onlineError ?? null);
    } finally {
      setBusy(false);
    }
  }, [query, kind, online]);

  React.useEffect(() => {
    const t = setTimeout(() => void run(), 250);
    return () => clearTimeout(t);
  }, [run]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Search className="h-4 w-4 text-primary" />
          Find a game reference
        </CardTitle>
        <CardDescription>
          Look up real in-game IDs and text to point your tuning at. Built-ins and your indexed install work offline;
          Lot51 fills the gaps when you're connected.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or paste an ID…"
            className="h-9 min-w-[220px] flex-1"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as GameRefKind | "all")}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant={online ? "default" : "outline"}
            className="h-9"
            onClick={() => setOnline((v) => !v)}
          >
            {online ? <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> : <WifiOff className="mr-1.5 h-3.5 w-3.5" />}
            {online ? "Online lookups on" : "Offline only"}
          </Button>
        </div>

        {error ? (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-600 dark:text-amber-400">
            Lot51 lookup unavailable ({error}). Showing offline results only.
          </p>
        ) : null}

        <ScrollArea className="h-[420px] rounded-md border border-border">
          {busy && !refs.length ? (
            <p className="p-6 text-sm text-muted-foreground">Searching…</p>
          ) : refs.length ? (
            <ul className="divide-y divide-border">
              {refs.map((r) => (
                <li key={`${r.source}-${r.id}`} className="flex items-start gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{r.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      <code>{r.id}</code>
                      {r.module ? ` · ${r.module}` : ""}
                      {r.className ? `.${r.className}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-[10px] ${SOURCE_TONE[r.source]}`}>
                    {SOURCE_LABEL[r.source]}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 shrink-0 px-2 text-xs"
                    onClick={() => {
                      void navigator.clipboard?.writeText(r.id);
                      toast.success("ID copied", { description: `${r.name} · ${r.id}` });
                    }}
                  >
                    Copy ID
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">
              No matches yet. Try a name like “Happy”, “Fitness”, or a career name — or index your install on the
              Local Index tab for full coverage.
            </p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------- Local index tab */

function LocalIndexPanel() {
  const [meta, setMeta] = React.useState<LocalIndexMeta | null>(null);
  const [progress, setProgress] = React.useState<ScanProgress | null>(null);
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const sizes = useCacheSizes([meta, busy]);

  const reload = React.useCallback(async () => setMeta(await getLocalMeta()), []);
  React.useEffect(() => {
    void reload();
  }, [reload]);

  const onFiles = async (list: FileList | null) => {
    const files = Array.from(list ?? []).filter((f) => f.name.toLowerCase().endsWith(".package"));
    if (!files.length) {
      toast.error("No .package files selected");
      return;
    }
    setBusy(true);
    try {
      const next = await scanPackages(files, setProgress);
      setMeta(next);
      toast.success("Index updated", {
        description: `${next.tuningCount.toLocaleString()} tuning entries and ${next.stringCount.toLocaleString()} strings available offline.`,
      });
    } catch (err) {
      toast.error("Scan failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-4 w-4 text-primary" />
            Index your Sims 4 install
          </CardTitle>
          <CardDescription>
            Real IDs and in-game text only exist inside your own game files. Point this at your Sims 4 Data or Mods
            folder and it builds a searchable index — entirely on this device, nothing is uploaded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".package"
            className="hidden"
            onChange={(e) => void onFiles(e.target.files)}
          />
          <Button onClick={() => inputRef.current?.click()} disabled={busy} className="w-full">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderSearch className="mr-2 h-4 w-4" />}
            {busy ? "Scanning…" : "Choose .package files to index"}
          </Button>

          {progress ? (
            <div className="space-y-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.round((progress.fileIndex / Math.max(1, progress.fileCount)) * 100)}%` }}
                />
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {progress.fileIndex}/{progress.fileCount} · {progress.file} · {progress.tuning.toLocaleString()} tuning ·{" "}
                {progress.strings.toLocaleString()} strings
              </p>
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Tip: on Windows the base tuning lives in <code>…/The Sims 4/Data/Simulation/</code>; on macOS it's inside{" "}
            <code>The Sims 4.app/Contents/Data/Simulation/</code>. Scanning in batches is fine — results merge.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Current index</CardTitle>
          <CardDescription>Stored on-device and reused every session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Tuning entries</dt>
              <dd className="text-lg font-semibold">{(meta?.tuningCount ?? 0).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Strings</dt>
              <dd className="text-lg font-semibold">{(meta?.stringCount ?? 0).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Packages</dt>
              <dd className="text-lg font-semibold">{meta?.packagesScanned ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Last scan</dt>
              <dd className="text-sm">{relative(meta?.scannedAt)}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">On-device size: {formatBytes(sizes.local)}</p>

          {meta?.sources.length ? (
            <>
              <Separator />
              <ScrollArea className="h-[160px]">
                <ul className="space-y-1 pr-3 text-xs text-muted-foreground">
                  {meta.sources.map((s) => (
                    <li key={s} className="truncate font-mono">
                      {s}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </>
          ) : null}

          <Button
            variant="outline"
            size="sm"
            disabled={busy || !meta}
            onClick={async () => {
              await clearLocalIndex();
              setMeta(null);
              toast.success("Local index cleared");
            }}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Clear index
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------- container */

export function GameDataView() {
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <BookOpen className="h-5 w-5 text-primary" />
            Game Data
          </h1>
          <p className="text-sm text-muted-foreground">
            The rulebook and the reference list behind your mods: tuning schemas from Lot51, real IDs and text from
            your own install, plus a built-in starter set that always works offline.
          </p>
        </div>
        <Badge variant="outline" className="border-primary/40 text-primary">
          Offline-first
        </Badge>
      </header>

      <Tabs defaultValue="lookup">
        <TabsList>
          <TabsTrigger value="lookup">Reference lookup</TabsTrigger>
          <TabsTrigger value="schemas">Tuning schemas</TabsTrigger>
          <TabsTrigger value="local">Local index</TabsTrigger>
        </TabsList>
        <TabsContent value="lookup" className="mt-4">
          <LookupPanel />
        </TabsContent>
        <TabsContent value="schemas" className="mt-4">
          <TdescPanel />
        </TabsContent>
        <TabsContent value="local" className="mt-4">
          <LocalIndexPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default GameDataView;
