/**
 * Universal Resource Picker.
 *
 * One picker for every field that points at another resource. It is always
 * filtered to the expected resource kind, so a buff field can never accept an
 * interaction, and it always returns a structured reference — never a number.
 */

import { useEffect, useMemo, useState } from "react";
import { Check, Link2, Loader2, Search, Star, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useStore, useActiveProject } from "@/lib/store";
import { lookupRefs, SOURCE_LABEL } from "@/lib/gamedata/registry";
import type { GameRef, GameRefKind } from "@/lib/gamedata/types";
import { listImportedProjects } from "@/lib/modexport/registry";
import { migrateTraitDoc } from "@/lib/traits/migrate";
import {
  RESOURCE_KIND_LABEL,
  type ResourceKind,
  type ResourceRef,
} from "@/lib/traits/schema";
import { Badge, Btn, TextInput } from "./primitives";

type TabId = "project" | "game" | "imported" | "community" | "recent" | "favorites";

const TABS: { id: TabId; label: string }[] = [
  { id: "project", label: "Current project" },
  { id: "game", label: "EA resources" },
  { id: "imported", label: "Imported mods" },
  { id: "community", label: "Community" },
  { id: "recent", label: "Recently used" },
  { id: "favorites", label: "Favorites" },
];

const KIND_TO_GAME: Partial<Record<ResourceKind, GameRefKind>> = {
  Buff: "buff",
  Trait: "trait",
  Career: "career",
  Aspiration: "aspiration",
  Statistic: "statistic",
  Commodity: "statistic",
  Skill: "statistic",
  Motive: "statistic",
  Interaction: "interaction",
  Loot: "loot",
  String: "string",
};

const RECENT_KEY = "mc.resourcePicker.recent";
const FAV_KEY = "mc.resourcePicker.favorites";

function readStore(key: string): ResourceRef[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "[]") as ResourceRef[];
  } catch {
    return [];
  }
}
function writeStore(key: string, refs: ResourceRef[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(refs.slice(0, 40)));
}

const refId = (r: ResourceRef) =>
  r.source === "project" ? r.projectResourceId : `${r.source}:${r.tuningName}:${r.tuningId}`;

export interface ResourcePickerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  expects: ResourceKind;
  onPick: (ref: ResourceRef) => void;
  title?: string;
}

export function ResourcePicker({ open, onOpenChange, expects, onPick, title }: ResourcePickerProps) {
  const store = useStore();
  const project = useActiveProject();
  const [tab, setTab] = useState<TabId>("project");
  const [q, setQ] = useState("");
  const [gameRefs, setGameRefs] = useState<GameRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [onlineError, setOnlineError] = useState<string | undefined>();
  const [favorites, setFavorites] = useState<ResourceRef[]>([]);
  const [recent, setRecent] = useState<ResourceRef[]>([]);

  useEffect(() => {
    if (!open) return;
    setFavorites(readStore(FAV_KEY));
    setRecent(readStore(RECENT_KEY));
  }, [open]);

  /* ---- project resources ---- */
  const projectRefs = useMemo<ResourceRef[]>(() => {
    if (!project) return [];
    const out: ResourceRef[] = [];
    const add = (
      id: string,
      label: string,
      kind: ResourceKind,
      namespace: string,
      tuning: string,
    ) => {
      out.push({
        source: "project",
        projectResourceId: id,
        resourceKind: kind,
        label,
        tuningName: `${namespace}:${tuning}`,
        tuningId: "resolved-at-build",
        expectedType: kind,
      });
    };

    for (const t of store.state.traits.filter((x) => x.projectId === project.id)) {
      const doc = migrateTraitDoc(t);
      add(doc.ids.uuid, t.name, "Trait", doc.ids.namespace, doc.ids.internalName);
      for (const e of doc.effects) {
        if (e.kind !== "buff" || !e.ref) continue;
        if (e.ref.source === "project") out.push({ ...e.ref, label: e.label });
      }
      for (const b of t.buffs ?? []) add(b.id, b.name, "Buff", doc.ids.namespace, `buff_${b.name.replace(/\W+/g, "")}`);
    }
    for (const c of store.state.careers.filter((x) => x.projectId === project.id))
      add(c.id, c.name, "Career", "Project", `career_${c.internalId || c.name.replace(/\W+/g, "")}`);
    for (const a of store.state.aspirations.filter((x) => x.projectId === project.id))
      add(a.id, a.name, "Aspiration", "Project", `aspiration_${a.internalId || a.name.replace(/\W+/g, "")}`);
    for (const n of store.state.notifications.filter((x) => x.projectId === project.id))
      add(n.id, n.name, "Notification", "Project", `notification_${n.name.replace(/\W+/g, "")}`);
    for (const a of store.state.assets.filter((x) => !x.projectId || x.projectId === project.id))
      add(a.id, a.name, "Asset", "Project", a.name.replace(/\W+/g, "_"));

    return out;
  }, [project, store.state]);

  /* ---- imported mods ---- */
  const importedRefs = useMemo<ResourceRef[]>(() => {
    const out: ResourceRef[] = [];
    for (const imp of listImportedProjects()) {
      for (const r of imp.project.resources ?? []) {
        const name = (r as { name?: string }).name ?? (r as { key?: { instance?: string } }).key?.instance ?? "resource";
        const instance = (r as { key?: { instance?: string } }).key?.instance ?? "0";
        out.push({
          source: "mod",
          resourceKind: expects,
          label: name,
          tuningName: name,
          tuningId: BigInt(`0x${instance}`).toString(10),
          creator: imp.project.creator ?? "Unknown",
          modName: imp.project.name ?? "Imported mod",
          required: true,
          expectedType: expects,
        });
      }
    }
    return out;
  }, [expects]);

  /* ---- EA lookup ---- */
  useEffect(() => {
    if (!open || tab !== "game") return;
    let cancelled = false;
    setLoading(true);
    const kind = KIND_TO_GAME[expects];
    lookupRefs(q, { ...(kind ? { kind } : {}), limit: 60 })
      .then((res) => {
        if (cancelled) return;
        setGameRefs(res.refs);
        setOnlineError(res.onlineError);
      })
      .catch((e: unknown) => !cancelled && setOnlineError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, tab, q, expects]);

  const gameAsRefs = useMemo<ResourceRef[]>(
    () =>
      gameRefs.map((g) => ({
        source: "game",
        resourceKind: expects,
        label: g.name,
        tuningName: g.className ? `${g.module ?? ""}.${g.className}` : g.name,
        tuningId: g.id,
        pack: "BaseGame",
        expectedType: expects,
      })),
    [gameRefs, expects],
  );

  const rows = useMemo(() => {
    const source =
      tab === "project"
        ? projectRefs.filter((r) => r.resourceKind === expects || expects === "Asset")
        : tab === "game"
          ? gameAsRefs
          : tab === "imported"
            ? importedRefs
            : tab === "recent"
              ? recent.filter((r) => r.expectedType === expects)
              : tab === "favorites"
                ? favorites.filter((r) => r.expectedType === expects)
                : [];
    const needle = q.trim().toLowerCase();
    if (!needle || tab === "game") return source;
    return source.filter((r) =>
      [r.label, r.tuningName, r.tuningId, r.resourceKind, (r as { pack?: string }).pack, (r as { creator?: string }).creator]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [tab, projectRefs, gameAsRefs, importedRefs, recent, favorites, q, expects]);

  const pick = (ref: ResourceRef) => {
    const next = [ref, ...recent.filter((r) => refId(r) !== refId(ref))];
    setRecent(next);
    writeStore(RECENT_KEY, next);
    onPick(ref);
    onOpenChange(false);
  };

  const toggleFav = (ref: ResourceRef) => {
    const exists = favorites.some((f) => refId(f) === refId(ref));
    const next = exists ? favorites.filter((f) => refId(f) !== refId(ref)) : [ref, ...favorites];
    setFavorites(next);
    writeStore(FAV_KEY, next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[14px]">
            <Link2 className="h-4 w-4" />
            {title ?? `Pick a ${RESOURCE_KIND_LABEL[expects]}`}
            <Badge tone="accent">filtered to {RESOURCE_KIND_LABEL[expects]}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-1 border-b border-border pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11.5px] font-semibold transition-colors",
                tab === t.id ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <TextInput
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, tuning name, decimal or hex id, pack, creator, tag…"
            className="pl-8"
          />
        </div>

        {tab === "game" && onlineError && (
          <p className="text-[10.5px] text-amber-500">
            Online lookup unavailable ({onlineError}). Built-in and locally indexed results are still shown.
          </p>
        )}
        {tab === "community" && (
          <p className="text-[11px] text-muted-foreground">
            Community Library resources appear here once they are downloaded into this workspace.
          </p>
        )}

        <div className="max-h-[46vh] space-y-1 overflow-y-auto pr-1">
          {loading && (
            <div className="flex items-center gap-2 px-2 py-3 text-[11.5px] text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
            </div>
          )}
          {!loading && rows.length === 0 && (
            <div className="px-2 py-6 text-center text-[11.5px] text-muted-foreground">
              No {RESOURCE_KIND_LABEL[expects].toLowerCase()} resources here yet.
            </div>
          )}
          {rows.map((r, i) => {
            const fav = favorites.some((f) => refId(f) === refId(r));
            const hex =
              /^\d+$/.test(r.tuningId) && r.tuningId !== "0"
                ? BigInt(r.tuningId).toString(16).toUpperCase()
                : "";
            return (
              <div
                key={`${refId(r)}-${i}`}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5"
              >
                <button
                  type="button"
                  onClick={() => pick(r)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[12px] font-semibold">{r.label || r.tuningName}</span>
                    <Badge>{RESOURCE_KIND_LABEL[r.resourceKind]}</Badge>
                    <Badge tone={r.source === "project" ? "accent" : "muted"}>
                      {r.source === "project"
                        ? "Project"
                        : r.source === "game"
                          ? SOURCE_LABEL.builtin
                          : `${r.creator} · ${r.modName}`}
                    </Badge>
                  </div>
                  <div className="truncate font-mono text-[10px] text-muted-foreground">
                    {r.tuningName}
                    {r.tuningId !== "resolved-at-build" && ` · ${r.tuningId}`}
                    {hex && ` · 0x${hex}`}
                    {"pack" in r && r.pack ? ` · ${r.pack}` : ""}
                  </div>
                </button>
                <button
                  type="button"
                  title={fav ? "Remove from favorites" : "Add to favorites"}
                  onClick={() => toggleFav(r)}
                  className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted"
                >
                  <Star className={cn("h-3.5 w-3.5", fav && "fill-amber-400 text-amber-400")} />
                </button>
                <Btn icon={Check} onClick={() => pick(r)}>
                  Use
                </Btn>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------ ref field -- */

export function RefField({
  label,
  expects,
  value,
  onChange,
  hint,
  status,
}: {
  label: string;
  expects: ResourceKind;
  value: ResourceRef | null;
  onChange: (ref: ResourceRef | null) => void;
  hint?: string;
  status?: { status: string; message?: string };
}) {
  const [open, setOpen] = useState(false);
  const bad = status && status.status !== "ok";
  return (
    <div className="space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5",
          bad ? "border-red-500/60" : "border-border",
        )}
      >
        {value ? (
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[12px] font-semibold">{value.label || value.tuningName}</span>
              <Badge tone={value.source === "project" ? "accent" : "muted"}>{value.source}</Badge>
            </div>
            <div className="truncate font-mono text-[10px] text-muted-foreground">
              {value.tuningName} · {value.tuningId}
            </div>
          </div>
        ) : (
          <span className="flex-1 text-[11.5px] text-muted-foreground">
            No {RESOURCE_KIND_LABEL[expects].toLowerCase()} connected
          </span>
        )}
        <Btn icon={Link2} onClick={() => setOpen(true)}>
          {value ? "Replace" : "Connect"}
        </Btn>
        {value && (
          <Btn icon={X} onClick={() => onChange(null)} title="Disconnect">
            {""}
          </Btn>
        )}
      </div>
      {bad && status?.message && <p className="text-[10.5px] text-red-500">{status.message}</p>}
      {!bad && hint && <p className="text-[10.5px] text-muted-foreground">{hint}</p>}
      <ResourcePicker open={open} onOpenChange={setOpen} expects={expects} onPick={onChange} />
    </div>
  );
}
