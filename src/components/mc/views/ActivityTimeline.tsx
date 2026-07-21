import { useMemo, useState } from "react";
import {
  History,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Package,
  Pencil,
  Play,
  Upload,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type EventKind = "edit" | "build" | "validate" | "export" | "import";

type Event = {
  id: string;
  kind: EventKind;
  at: string;
  bucket: "Today" | "Yesterday" | "This week" | "Earlier";
  actor: string;
  project: string;
  summary: string;
  ok?: boolean;
};

const EVENTS: Event[] = [
  { id: "e1", kind: "edit", at: "10:42", bucket: "Today", actor: "You", project: "Epic Careers", summary: "Adjusted salary curve on Marine Biologist rank 4" },
  { id: "e2", kind: "validate", at: "10:38", bucket: "Today", actor: "System", project: "Epic Careers", summary: "Validation: 0 errors, 2 warnings", ok: true },
  { id: "e3", kind: "build", at: "10:35", bucket: "Today", actor: "You", project: "Epic Careers", summary: "Package build reached 65%" },
  { id: "e4", kind: "edit", at: "09:58", bucket: "Today", actor: "You", project: "Lucid Dreamer Traits", summary: "Renamed 'Dreamweaver' → 'Dream Architect'" },
  { id: "e5", kind: "export", at: "16:12", bucket: "Yesterday", actor: "You", project: "Trailblazer", summary: "Exported .package to /Mods/", ok: true },
  { id: "e6", kind: "validate", at: "15:44", bucket: "Yesterday", actor: "System", project: "Lucid Dreamer Traits", summary: "1 error auto-fixed on Sleepwalker" },
  { id: "e7", kind: "import", at: "Mon", bucket: "This week", actor: "You", project: "Weathercore", summary: "Imported climate_hot.xml from Assets" },
  { id: "e8", kind: "build", at: "Mon", bucket: "This week", actor: "You", project: "Weathercore", summary: "Draft build stored for review" },
  { id: "e9", kind: "edit", at: "1w ago", bucket: "Earlier", actor: "You", project: "Marine Biologist", summary: "Created new project from template" },
];

const META: Record<EventKind, { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string; label: string }> = {
  edit: { icon: Pencil, color: "var(--blue)", label: "Edit" },
  build: { icon: Play, color: "var(--teal)", label: "Build" },
  validate: { icon: CheckCircle2, color: "var(--green)", label: "Validate" },
  export: { icon: Package, color: "var(--violet)", label: "Export" },
  import: { icon: Upload, color: "var(--orange)", label: "Import" },
};

const KIND_FILTERS: ("all" | EventKind)[] = ["all", "edit", "build", "validate", "export", "import"];

export function ActivityTimeline() {
  const [kind, setKind] = useState<"all" | EventKind>("all");

  const groups = useMemo(() => {
    const shown = EVENTS.filter((e) => kind === "all" || e.kind === kind);
    const map: Record<string, Event[]> = {};
    shown.forEach((e) => {
      map[e.bucket] = map[e.bucket] ?? [];
      map[e.bucket].push(e);
    });
    return map;
  }, [kind]);

  const buckets: Event["bucket"][] = ["Today", "Yesterday", "This week", "Earlier"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--blue)] text-white shadow-sm">
            <History className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Workspace
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
        <div className="relative pl-6">
          <div className="absolute left-2 top-0 bottom-0 w-px bg-border" aria-hidden />

          {buckets.map((b) => {
            const items = groups[b];
            if (!items || items.length === 0) return null;
            return (
              <div key={b} className="mb-5">
                <div className="mb-2 -ml-6 flex items-center gap-2">
                  <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border border-border">
                    {b}
                  </span>
                </div>
                <ul className="space-y-2">
                  {items.map((e) => {
                    const m = META[e.kind];
                    const Icon = m.icon;
                    return (
                      <li key={e.id} className="relative">
                        <span
                          className="absolute -left-[18px] top-2 flex h-3 w-3 items-center justify-center rounded-full"
                          style={{ backgroundColor: m.color }}
                        />
                        <div className="rounded-lg border border-border bg-background/40 p-3 transition-colors hover:bg-accent/40">
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5" style={{ color: m.color }} />
                            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: m.color }}>
                              {m.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <span className="text-[11px] text-muted-foreground">{e.project}</span>
                            <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">{e.at}</span>
                          </div>
                          <div className="mt-0.5 text-xs">{e.summary}</div>
                          <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>by {e.actor}</span>
                            {(e.kind === "edit" || e.kind === "build") && (
                              <button
                                onClick={() => toast.success("Reverted to this point")}
                                className="inline-flex items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 hover:bg-accent"
                              >
                                <Undo2 className="h-2.5 w-2.5" /> Revert
                              </button>
                            )}
                            {e.ok === false && (
                              <span className="inline-flex items-center gap-0.5 text-[var(--orange)]">
                                <AlertTriangle className="h-2.5 w-2.5" /> attention
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
