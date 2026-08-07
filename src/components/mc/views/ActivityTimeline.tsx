/**
 * Activity Timeline — real, project-scoped history.
 *
 * Every entry comes from `state.activity`, which the store appends to on each
 * create / update / delete / build / export / import. Nothing here is mocked.
 */

import { useMemo, useState } from "react";
import { History, Filter, CheckCircle2, Package, Pencil, Play, Upload, Trash2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useNavigation } from "@/lib/navigation";
import type { ActivityEvent } from "@/lib/types";

type Kind = ActivityEvent["kind"];

const META: Record<Kind, { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string; label: string }> = {
  create: { icon: CheckCircle2, color: "var(--green)", label: "Create" },
  update: { icon: Pencil, color: "var(--blue)", label: "Edit" },
  delete: { icon: Trash2, color: "var(--red)", label: "Delete" },
  build: { icon: Play, color: "var(--teal)", label: "Build" },
  export: { icon: Package, color: "var(--violet)", label: "Export" },
  import: { icon: Upload, color: "var(--orange)", label: "Import" },
};

const KIND_FILTERS: ("all" | Kind)[] = ["all", "create", "update", "delete", "build", "export", "import"];

const BUCKETS = ["Today", "Yesterday", "This week", "Earlier"] as const;
type Bucket = (typeof BUCKETS)[number];

function bucketOf(ts: number): Bucket {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const dayMs = 86_400_000;
  if (ts >= start.getTime()) return "Today";
  if (ts >= start.getTime() - dayMs) return "Yesterday";
  if (ts >= start.getTime() - 6 * dayMs) return "This week";
  return "Earlier";
}

function timeOf(ts: number, bucket: Bucket): string {
  const d = new Date(ts);
  if (bucket === "Today" || bucket === "Yesterday")
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  if (bucket === "This week") return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString();
}

/** Which builder view an entity type opens in. */
const ROUTE_FOR: Partial<Record<ActivityEvent["entityType"], string>> = {
  career: "careers",
  trait: "traits",
  aspiration: "aspirations",
  asset: "assets",
  project: "projects",
  template: "templates",
  snippet: "snippets",
};

export function ActivityTimeline() {
  const store = useStore();
  const nav = useNavigation();
  const [kind, setKind] = useState<"all" | Kind>("all");

  const projectId = store.state.activeProjectId;
  const project = store.state.projects.find((p) => p.id === projectId);

  const groups = useMemo(() => {
    const shown = store.state.activity
      .filter((e) => (projectId ? e.projectId === projectId : true))
      .filter((e) => kind === "all" || e.kind === kind);
    const map = {} as Record<Bucket, ActivityEvent[]>;
    for (const e of shown) {
      const b = bucketOf(e.createdAt);
      (map[b] = map[b] ?? []).push(e);
    }
    return map;
  }, [store.state.activity, projectId, kind]);

  const total = BUCKETS.reduce((n, b) => n + (groups[b]?.length ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--blue)] text-white shadow-sm">
            <History className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {project ? project.name : "Workspace"}
            </div>
            <h1 className="text-xl font-bold tracking-tight">Activity Timeline</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Filter className="mr-1 h-3 w-3 text-muted-foreground" />
          {KIND_FILTERS.map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize transition-colors",
                kind === k
                  ? "border-[var(--blue)] bg-[var(--blue)]/10 text-[var(--blue)]"
                  : "border-border bg-background text-muted-foreground hover:bg-accent",
              )}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 card-elevated">
        {total === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground">
            {project
              ? `No ${kind === "all" ? "" : kind + " "}activity recorded for ${project.name} yet. Edits, builds and exports appear here as you work.`
              : "Open a project to see its activity."}
          </div>
        ) : (
          <div className="relative pl-6">
            <div className="absolute left-2 top-0 bottom-0 w-px bg-border" aria-hidden />

            {BUCKETS.map((b) => {
              const items = groups[b];
              if (!items || items.length === 0) return null;
              return (
                <div key={b} className="mb-5">
                  <div className="mb-2 -ml-6 flex items-center gap-2">
                    <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {b}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {items.map((e) => {
                      const m = META[e.kind];
                      const Icon = m.icon;
                      const route = e.kind !== "delete" ? ROUTE_FOR[e.entityType] : undefined;
                      return (
                        <li key={e.id} className="relative">
                          <span
                            className="absolute -left-[18px] top-2 flex h-3 w-3 items-center justify-center rounded-full"
                            style={{ backgroundColor: m.color }}
                          />
                          <div className="rounded-lg border border-border bg-background/40 p-3 transition-colors hover:bg-accent/40">
                            <div className="flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5" style={{ color: m.color }} />
                              <span
                                className="text-[10px] font-semibold uppercase tracking-wider"
                                style={{ color: m.color }}
                              >
                                {m.label}
                              </span>
                              <span className="text-[10px] text-muted-foreground">·</span>
                              <span className="text-[11px] capitalize text-muted-foreground">{e.entityType}</span>
                              <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                                {timeOf(e.createdAt, b)}
                              </span>
                            </div>
                            <div className="mt-0.5 text-xs">{e.summary}</div>
                            {route && (
                              <div className="mt-1.5">
                                <button
                                  onClick={() => {
                                    if (e.entityId) store.markRecent(e.entityId);
                                    nav.go(route);
                                  }}
                                  className="inline-flex items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] hover:bg-accent"
                                >
                                  Open <ArrowRight className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
