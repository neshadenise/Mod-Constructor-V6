import { useMemo, useState } from "react";
import { Network, Briefcase, Sparkles, Target, Bell, Package, Boxes } from "lucide-react";
import { cn } from "@/lib/utils";

type NodeKind = "career" | "trait" | "aspiration" | "notification" | "asset" | "package";

type GNode = {
  id: string;
  label: string;
  kind: NodeKind;
  x: number;
  y: number;
};

type GEdge = { from: string; to: string };

const NODES: GNode[] = [
  { id: "pkg", label: "epic_careers.package", kind: "package", x: 480, y: 60 },
  { id: "c1", label: "Marine Biologist", kind: "career", x: 220, y: 200 },
  { id: "c2", label: "Reef Guardian", kind: "career", x: 480, y: 200 },
  { id: "c3", label: "Deep-Sea Engineer", kind: "career", x: 740, y: 200 },
  { id: "t1", label: "Ocean Lover", kind: "trait", x: 140, y: 360 },
  { id: "t2", label: "Analytical", kind: "trait", x: 340, y: 360 },
  { id: "as1", label: "Peak Diver", kind: "aspiration", x: 560, y: 360 },
  { id: "n1", label: "Promotion Toast", kind: "notification", x: 760, y: 360 },
  { id: "a1", label: "diver_uniform.png", kind: "asset", x: 220, y: 500 },
  { id: "a2", label: "reef_icon.png", kind: "asset", x: 480, y: 500 },
  { id: "a3", label: "engineer_icon.png", kind: "asset", x: 740, y: 500 },
];

const EDGES: GEdge[] = [
  { from: "pkg", to: "c1" },
  { from: "pkg", to: "c2" },
  { from: "pkg", to: "c3" },
  { from: "c1", to: "t1" },
  { from: "c1", to: "t2" },
  { from: "c2", to: "as1" },
  { from: "c1", to: "n1" },
  { from: "c2", to: "n1" },
  { from: "c3", to: "n1" },
  { from: "c1", to: "a1" },
  { from: "c2", to: "a2" },
  { from: "c3", to: "a3" },
];

const META: Record<NodeKind, { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string; label: string }> = {
  career: { icon: Briefcase, color: "var(--blue)", label: "Career" },
  trait: { icon: Sparkles, color: "var(--violet)", label: "Trait" },
  aspiration: { icon: Target, color: "var(--teal)", label: "Aspiration" },
  notification: { icon: Bell, color: "var(--orange)", label: "Notification" },
  asset: { icon: Boxes, color: "var(--pink)", label: "Asset" },
  package: { icon: Package, color: "var(--green)", label: "Package" },
};

export function DependencyGraph() {
  const [selected, setSelected] = useState<string | null>("c1");

  const connected = useMemo(() => {
    if (!selected) return new Set<string>();
    const s = new Set<string>([selected]);
    EDGES.forEach((e) => {
      if (e.from === selected) s.add(e.to);
      if (e.to === selected) s.add(e.from);
    });
    return s;
  }, [selected]);

  const activeNode = NODES.find((n) => n.id === selected) ?? null;
  const activeMeta = activeNode ? META[activeNode.kind] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--teal)] text-white shadow-sm">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Workspace
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

      <div className="grid grid-cols-12 gap-4">
        <section className="col-span-12 rounded-xl border border-border bg-card p-2 card-elevated lg:col-span-9">
          <div className="overflow-hidden rounded-lg grid-canvas" style={{ height: 620 }}>
            <svg viewBox="0 0 900 600" className="h-full w-full">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0,0 L10,5 L0,10 z" fill="currentColor" className="text-muted-foreground" />
                </marker>
              </defs>
              {EDGES.map((e, i) => {
                const a = NODES.find((n) => n.id === e.from)!;
                const b = NODES.find((n) => n.id === e.to)!;
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
              {NODES.map((n) => {
                const m = META[n.kind];
                const dim = selected && !connected.has(n.id);
                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x}, ${n.y})`}
                    onClick={() => setSelected(n.id)}
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

              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Depends on
                </div>
                <ul className="space-y-1 text-xs">
                  {EDGES.filter((e) => e.from === activeNode.id).map((e, i) => {
                    const n = NODES.find((x) => x.id === e.to)!;
                    const m = META[n.kind];
                    return (
                      <li key={i} className="flex items-center gap-1.5 rounded border border-border/70 bg-background/40 px-2 py-1">
                        <m.icon className="h-3 w-3" style={{ color: m.color }} />
                        {n.label}
                      </li>
                    );
                  })}
                  {EDGES.filter((e) => e.from === activeNode.id).length === 0 && (
                    <li className="text-[11px] text-muted-foreground">None</li>
                  )}
                </ul>
              </div>

              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Used by
                </div>
                <ul className="space-y-1 text-xs">
                  {EDGES.filter((e) => e.to === activeNode.id).map((e, i) => {
                    const n = NODES.find((x) => x.id === e.from)!;
                    const m = META[n.kind];
                    return (
                      <li key={i} className="flex items-center gap-1.5 rounded border border-border/70 bg-background/40 px-2 py-1">
                        <m.icon className="h-3 w-3" style={{ color: m.color }} />
                        {n.label}
                      </li>
                    );
                  })}
                  {EDGES.filter((e) => e.to === activeNode.id).length === 0 && (
                    <li className="text-[11px] text-muted-foreground">None</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
