/**
 * Dependency Graph — a real map of the active project.
 *
 * Nodes and edges are derived from the project's own records: the output
 * package, its careers / traits / aspirations / notifications, and the assets
 * those records reference. Selecting a node shows its true dependencies.
 */

import { useMemo, useState } from "react";
import { Network, Briefcase, Sparkles, Target, Bell, Package, Boxes } from "lucide-react";
import { CompatibilityTile } from "@/components/mc/HealthMetrics";
import { DependencyCheckerCard } from "@/components/mc/Dashboard";
import { useStore } from "@/lib/store";
import { scopeProject } from "@/lib/project-analysis";

type NodeKind = "career" | "trait" | "aspiration" | "notification" | "asset" | "package";

type GNode = { id: string; label: string; kind: NodeKind; x: number; y: number };
type GEdge = { from: string; to: string };

const META: Record<NodeKind, { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string; label: string }> = {
  career: { icon: Briefcase, color: "var(--blue)", label: "Career" },
  trait: { icon: Sparkles, color: "var(--violet)", label: "Trait" },
  aspiration: { icon: Target, color: "var(--teal)", label: "Aspiration" },
  notification: { icon: Bell, color: "var(--orange)", label: "Notification" },
  asset: { icon: Boxes, color: "var(--pink)", label: "Asset" },
  package: { icon: Package, color: "var(--green)", label: "Package" },
};

const WIDTH = 900;

/** Lays a row of nodes out evenly across the canvas at a given height. */
function row<T>(items: T[], y: number, make: (item: T, x: number, y: number) => GNode): GNode[] {
  const n = items.length;
  return items.map((item, i) => make(item, ((i + 1) / (n + 1)) * WIDTH, y));
}

export function DependencyGraph() {
  const store = useStore();
  const project = store.state.projects.find((p) => p.id === store.state.activeProjectId);
  const scope = useMemo(() => scopeProject(store.state, project?.id), [store.state, project?.id]);

  const { nodes, edges } = useMemo(() => {
    if (!scope) return { nodes: [] as GNode[], edges: [] as GEdge[] };
    const { careers, traits, aspirations, notifications, assets } = scope;

    const nodes: GNode[] = [
      { id: "pkg", label: `${scope.project.name}.package`, kind: "package", x: WIDTH / 2, y: 50 },
    ];
    const edges: GEdge[] = [];

    const contentRows: GNode[] = [
      ...row(careers, 180, (c, x, y) => ({ id: `career:${c.id}`, label: c.name, kind: "career", x, y })),
    ];
    nodes.push(...contentRows);

    const mid = [
      ...row(traits, 320, (t, x, y) => ({ id: `trait:${t.id}`, label: t.name, kind: "trait", x, y })),
    ];
    const asp = row(aspirations, 320, (a, x, y) => ({
      id: `aspiration:${a.id}`,
      label: a.name,
      kind: "aspiration",
      x,
      y: y + 70,
    }));
    const notes = row(notifications, 460, (n, x, y) => ({
      id: `notification:${n.id}`,
      label: n.name,
      kind: "notification",
      x,
      y,
    }));
    nodes.push(...mid, ...asp, ...notes);

    const usedAssetIds = new Set(
      [...careers, ...traits, ...aspirations, ...notifications]
        .map((r) => r.iconAssetId)
        .filter(Boolean) as string[],
    );
    const usedAssets = assets.filter((a) => usedAssetIds.has(a.id));
    nodes.push(
      ...row(usedAssets, 560, (a, x, y) => ({ id: `asset:${a.id}`, label: a.name, kind: "asset", x, y })),
    );

    // Package owns every top-level record.
    for (const n of [...contentRows, ...mid, ...asp, ...notes]) edges.push({ from: "pkg", to: n.id });

    // Records depend on the icon asset they reference.
    for (const r of [...careers, ...traits, ...aspirations, ...notifications]) {
      if (r.iconAssetId && usedAssetIds.has(r.iconAssetId)) {
        const kind: NodeKind = "careerType" in r ? "career" : "buffs" in r ? "trait" : "milestones" in r ? "aspiration" : "notification";
        edges.push({ from: `${kind}:${r.id}`, to: `asset:${r.iconAssetId}` });
      }
    }

    // Careers depend on the reward trait each branch grants.
    for (const c of careers)
      for (const b of c.branches ?? [])
        if (b.rewardTraitId && traits.some((t) => t.id === b.rewardTraitId))
          edges.push({ from: `career:${c.id}`, to: `trait:${b.rewardTraitId}` });

    // Aspirations depend on their reward trait.
    for (const a of aspirations)
      if (a.rewardTraitId && traits.some((t) => t.id === a.rewardTraitId))
        edges.push({ from: `aspiration:${a.id}`, to: `trait:${a.rewardTraitId}` });

    return { nodes, edges };
  }, [scope]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = nodes.find((n) => n.id === selectedId) ? selectedId : null;

  const connected = useMemo(() => {
    if (!selected) return new Set<string>();
    const s = new Set<string>([selected]);
    edges.forEach((e) => {
      if (e.from === selected) s.add(e.to);
      if (e.to === selected) s.add(e.from);
    });
    return s;
  }, [selected, edges]);

  const activeNode = nodes.find((n) => n.id === selected) ?? null;
  const activeMeta = activeNode ? META[activeNode.kind] : null;

  if (!project || !scope) {
    return <p className="text-sm text-muted-foreground">Open a project to see its dependency graph.</p>;
  }

  const contentCount = nodes.length - 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--teal)] text-white shadow-sm">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {project.name}
            </div>
            <h1 className="text-xl font-bold tracking-tight">Dependency Graph</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(META).map(([k, m]) => {
            const Icon = m.icon;
            return (
              <span key={k} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Icon className="h-3 w-3" style={{ color: m.color }} />
                {m.label}
              </span>
            );
          })}
        </div>
      </div>

      <CompatibilityTile />

      <DependencyCheckerCard />

      <div className="grid grid-cols-12 gap-4">
        <section className="col-span-12 rounded-xl border border-border bg-card p-2 card-elevated lg:col-span-9">
          <div className="overflow-hidden rounded-lg grid-canvas" style={{ height: 620 }}>
            {contentCount === 0 ? (
              <div className="flex h-full items-center justify-center px-8 text-center text-xs text-muted-foreground">
                {project.name} has no content yet. Create a career, trait or aspiration and it will appear here
                with its real dependencies.
              </div>
            ) : (
              <svg viewBox="0 0 900 620" className="h-full w-full">
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M0,0 L10,5 L0,10 z" fill="currentColor" className="text-muted-foreground" />
                  </marker>
                </defs>
                {edges.map((e, i) => {
                  const a = nodes.find((n) => n.id === e.from);
                  const b = nodes.find((n) => n.id === e.to);
                  if (!a || !b) return null;
                  const highlighted = !selected || (connected.has(a.id) && connected.has(b.id));
                  return (
                    <line
                      key={i}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={highlighted ? "var(--blue)" : "currentColor"}
                      strokeOpacity={highlighted ? 0.5 : 0.15}
                      strokeWidth={highlighted ? 1.8 : 1}
                      markerEnd="url(#arrow)"
                      className="text-muted-foreground"
                    />
                  );
                })}
                {nodes.map((n) => {
                  const m = META[n.kind];
                  const dim = selected && !connected.has(n.id);
                  return (
                    <g
                      key={n.id}
                      transform={`translate(${n.x}, ${n.y})`}
                      onClick={() => setSelectedId(n.id === selected ? null : n.id)}
                      style={{ cursor: "pointer", opacity: dim ? 0.35 : 1 }}
                    >
                      <rect
                        x={-72}
                        y={-22}
                        width={144}
                        height={44}
                        rx={10}
                        fill="var(--card)"
                        stroke={selected === n.id ? m.color : "var(--border)"}
                        strokeWidth={selected === n.id ? 2 : 1}
                      />
                      <circle cx={-52} cy={0} r={9} fill={m.color} />
                      <text x={-32} y={4} className="fill-foreground" fontSize={11} fontWeight={600}>
                        {n.label.length > 18 ? n.label.slice(0, 17) + "…" : n.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </section>

        <aside className="col-span-12 rounded-xl border border-border bg-card p-4 card-elevated lg:col-span-3">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Inspector
          </div>
          {!activeNode || !activeMeta ? (
            <div className="text-xs text-muted-foreground">Click a node to inspect its dependencies.</div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: activeMeta.color }}
                >
                  <activeMeta.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {activeMeta.label}
                  </div>
                  <div className="text-sm font-bold">{activeNode.label}</div>
                </div>
              </div>

              <Relations title="Depends on" ids={edges.filter((e) => e.from === activeNode.id).map((e) => e.to)} nodes={nodes} />
              <Relations title="Used by" ids={edges.filter((e) => e.to === activeNode.id).map((e) => e.from)} nodes={nodes} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Relations({ title, ids, nodes }: { title: string; ids: string[]; nodes: GNode[] }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <ul className="space-y-1 text-xs">
        {ids.map((id, i) => {
          const n = nodes.find((x) => x.id === id);
          if (!n) return null;
          const m = META[n.kind];
          return (
            <li key={i} className="flex items-center gap-1.5 rounded border border-border/70 bg-background/40 px-2 py-1">
              <m.icon className="h-3 w-3" style={{ color: m.color }} />
              {n.label}
            </li>
          );
        })}
        {ids.length === 0 && <li className="text-[11px] text-muted-foreground">None</li>}
      </ul>
    </div>
  );
}
