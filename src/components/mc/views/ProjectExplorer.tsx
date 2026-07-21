import { useMemo, useState } from "react";
import {
  FolderTree,
  Search,
  ChevronRight,
  ChevronDown,
  Briefcase,
  Sparkles,
  Target,
  Bell,
  Boxes,
  FileCode2,
  Star,
  Filter,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Circle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useStore } from "@/lib/store";

type Status = "draft" | "validated" | "building" | "error";
type Kind = "career" | "trait" | "aspiration" | "notification" | "asset" | "tuning";

type Node = {
  id: string;
  name: string;
  kind?: Kind;
  status?: Status;
  updated?: string;
  favorite?: boolean;
  children?: Node[];
};

function fmtAgo(t: number): string {
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}


const KIND_META: Record<Kind, { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string; label: string }> = {
  career: { icon: Briefcase, color: "var(--blue)", label: "Career" },
  trait: { icon: Sparkles, color: "var(--violet)", label: "Trait" },
  aspiration: { icon: Target, color: "var(--teal)", label: "Aspiration" },
  notification: { icon: Bell, color: "var(--orange)", label: "Notification" },
  asset: { icon: Boxes, color: "var(--pink)", label: "Asset" },
  tuning: { icon: FileCode2, color: "var(--green)", label: "Tuning" },
};

const STATUS_META: Record<Status, { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string; label: string }> = {
  draft: { icon: Circle, color: "var(--muted-foreground)", label: "Draft" },
  validated: { icon: CheckCircle2, color: "var(--green)", label: "Validated" },
  building: { icon: Clock, color: "var(--blue)", label: "Building" },
  error: { icon: AlertTriangle, color: "var(--red)", label: "Error" },
};

type FilterKey = "all" | Kind;
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "career", label: "Careers" },
  { key: "trait", label: "Traits" },
  { key: "aspiration", label: "Aspirations" },
  { key: "notification", label: "Notifications" },
  { key: "asset", label: "Assets" },
  { key: "tuning", label: "Tuning" },
];

function matches(node: Node, query: string, filter: FilterKey): boolean {
  const q = query.trim().toLowerCase();
  const kindOk = filter === "all" || node.kind === filter;
  const nameOk = !q || node.name.toLowerCase().includes(q);
  if (node.children) {
    // project is included if any child matches
    return node.children.some((c) => matches(c, query, filter));
  }
  return kindOk && nameOk;
}

function TreeRow({
  node,
  depth,
  selected,
  onSelect,
  expanded,
  onToggle,
  query,
  filter,
}: {
  node: Node;
  depth: number;
  selected: string | null;
  onSelect: (id: string) => void;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  query: string;
  filter: FilterKey;
}) {
  const isOpen = expanded[node.id] ?? true;
  const hasChildren = !!node.children?.length;
  const kindMeta = node.kind ? KIND_META[node.kind] : null;
  const KindIcon = kindMeta?.icon;
  const statusMeta = node.status ? STATUS_META[node.status] : null;

  return (
    <>
      <button
        onClick={() => (hasChildren ? onToggle(node.id) : onSelect(node.id))}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs transition-colors",
          selected === node.id
            ? "bg-accent text-foreground"
            : "text-foreground/85 hover:bg-accent/60",
        )}
        style={{ paddingLeft: 6 + depth * 12 }}
      >
        {hasChildren ? (
          isOpen ? (
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-3" />
        )}
        {KindIcon ? (
          <KindIcon className="h-3.5 w-3.5 shrink-0" style={{ color: kindMeta!.color }} />
        ) : (
          <FolderTree className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate font-medium">{node.name}</span>
        {node.favorite && <Star className="h-3 w-3 shrink-0 fill-[var(--orange)] text-[var(--orange)]" />}
        <span className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {node.updated}
          {statusMeta && (
            <span
              className="inline-flex h-2 w-2 rounded-full"
              style={{ backgroundColor: statusMeta.color }}
              title={statusMeta.label}
            />
          )}
        </span>
      </button>
      {hasChildren && isOpen && (
        <div>
          {node.children!.filter((c) => matches(c, query, filter)).map((c) => (
            <TreeRow
              key={c.id}
              node={c}
              depth={depth + 1}
              selected={selected}
              onSelect={onSelect}
              expanded={expanded}
              onToggle={onToggle}
              query={query}
              filter={filter}
            />
          ))}
        </div>
      )}
    </>
  );
}

function findNode(tree: Node[], id: string | null): Node | null {
  if (!id) return null;
  const stack = [...tree];
  while (stack.length) {
    const n = stack.pop()!;
    if (n.id === id) return n;
    if (n.children) stack.push(...n.children);
  }
  return null;
}

export function ProjectExplorer() {
  const store = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const tree: Node[] = useMemo(() => {
    const s = store.state;
    return s.projects.map((p) => {
      const children: Node[] = [
        ...s.careers.filter((c) => c.projectId === p.id).map<Node>((c) => ({
          id: c.id, name: c.name, kind: "career", status: "draft", updated: fmtAgo(p.updatedAt),
        })),
        ...s.traits.filter((t) => t.projectId === p.id).map<Node>((t) => ({
          id: t.id, name: t.name, kind: "trait", status: "draft", updated: fmtAgo(p.updatedAt),
        })),
        ...s.aspirations.filter((a) => a.projectId === p.id).map<Node>((a) => ({
          id: a.id, name: a.name, kind: "aspiration", status: "draft", updated: fmtAgo(p.updatedAt),
        })),
        ...s.notifications.filter((n) => n.projectId === p.id).map<Node>((n) => ({
          id: n.id, name: n.name, kind: "notification", status: "draft", updated: fmtAgo(p.updatedAt),
        })),
        ...s.assets.filter((a) => a.projectId === p.id).map<Node>((a) => ({
          id: a.id, name: a.name, kind: "asset", updated: fmtAgo(p.updatedAt),
        })),
      ];
      return {
        id: p.id,
        name: p.name,
        updated: fmtAgo(p.updatedAt),
        favorite: p.favorite,
        children,
      };
    });
  }, [store.state]);

  const filtered = useMemo(
    () => tree.filter((p) => matches(p, query, filter)),
    [tree, query, filter],
  );

  const active = findNode(tree, selected);
  const activeKind = active?.kind ? KIND_META[active.kind] : null;
  const activeStatus = active?.status ? STATUS_META[active.status] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--blue)] text-white shadow-sm">
            <FolderTree className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Workspace
            </div>
            <h1 className="text-xl font-bold tracking-tight">Project Explorer</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const p = store.createProject();
              setSelected(p.id);
              setExpanded((s) => ({ ...s, [p.id]: true }));
              toast.success(`Created "${p.name}"`);
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--blue)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> New Project
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Tree pane */}
        <section className="col-span-12 rounded-xl border border-border bg-card p-3 card-elevated lg:col-span-5 xl:col-span-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects & items..."
                className="h-8 pl-7 text-xs"
              />
            </div>
            <button
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-accent"
              onClick={() => setFilter("all")}
              title="Reset filters"
            >
              <Filter className="h-3 w-3" />
            </button>
          </div>

          <div className="mb-3 flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors",
                  filter === f.key
                    ? "border-[var(--blue)] bg-[var(--blue)]/10 text-[var(--blue)]"
                    : "border-border bg-background text-muted-foreground hover:bg-accent",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="max-h-[540px] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                No matches. Try a different search or filter.
              </div>
            ) : (
              filtered.map((p) => (
                <TreeRow
                  key={p.id}
                  node={p}
                  depth={0}
                  selected={selected}
                  onSelect={setSelected}
                  expanded={expanded}
                  onToggle={(id) => setExpanded((s) => ({ ...s, [id]: !(s[id] ?? true) }))}
                  query={query}
                  filter={filter}
                />
              ))
            )}
          </div>
        </section>

        {/* Detail pane */}
        <section className="col-span-12 rounded-xl border border-border bg-card p-5 card-elevated lg:col-span-7 xl:col-span-8">
          {!active ? (
            <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
              Select an item to inspect it.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {activeKind ? (
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-lg text-white shadow-sm"
                      style={{ backgroundColor: activeKind.color }}
                    >
                      <activeKind.icon className="h-5 w-5" />
                    </div>
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <FolderTree className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {activeKind?.label ?? "Project"}
                    </div>
                    <h2 className="text-lg font-bold tracking-tight">{active.name}</h2>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      Updated {active.updated ?? "recently"}
                    </div>
                  </div>
                </div>
                {activeStatus && (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                    style={{ borderColor: activeStatus.color, color: activeStatus.color }}
                  >
                    <activeStatus.icon className="h-3 w-3" /> {activeStatus.label}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  { k: "Fields", v: "24" },
                  { k: "Assets", v: "6" },
                  { k: "Warnings", v: "1" },
                  { k: "Refs", v: "3" },
                ].map((s) => (
                  <div key={s.k} className="rounded-lg border border-border bg-background/50 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {s.k}
                    </div>
                    <div className="mt-1 text-lg font-bold tabular-nums">{s.v}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent Activity
                </div>
                <ul className="space-y-1 text-xs">
                  {[
                    { t: "2m ago", m: "Auto-saved rank tuning" },
                    { t: "12m ago", m: "Renamed level 4 → 'Reef Analyst'" },
                    { t: "1h ago", m: "Linked salary curve to shared preset" },
                    { t: "yesterday", m: "Imported icon from Assets/Careers" },
                  ].map((r, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-md border border-border/70 bg-background/40 px-2.5 py-1.5"
                    >
                      <span>{r.m}</span>
                      <span className="text-[10px] text-muted-foreground">{r.t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => toast.success(`Opening ${active.name}...`)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[var(--blue)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
                >
                  Open in Builder
                </button>
                <button
                  onClick={() => toast("Duplicated", { description: active.name + " (copy)" })}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => toast("Added to build queue")}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  Queue Build
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
