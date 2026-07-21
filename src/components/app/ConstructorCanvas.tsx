import type { CanvasNode, CanvasEdge, NodeType } from "@/lib/mock-data";
import { Briefcase, Sparkles, Target, MessageSquare, GitBranch, Layers, MousePointer2, Move, ZoomIn, ZoomOut, Grid3x3, Plus } from "lucide-react";

const NODE_STYLES: Record<NodeType, { icon: any; accent: string; label: string }> = {
  career: { icon: Layers, accent: "info", label: "Career" },
  job: { icon: Briefcase, accent: "primary", label: "Job" },
  trait: { icon: Sparkles, accent: "violet", label: "Trait" },
  aspiration: { icon: Target, accent: "warning", label: "Aspiration" },
  interaction: { icon: MessageSquare, accent: "success", label: "Interaction" },
  logic: { icon: GitBranch, accent: "destructive", label: "Logic" },
};

const NODE_W = 190;
const NODE_H = 78;

interface Props {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConstructorCanvas({ nodes, edges, selectedId, onSelect }: Props) {
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const categories: { type: NodeType }[] = [
    { type: "career" },
    { type: "job" },
    { type: "trait" },
    { type: "aspiration" },
    { type: "interaction" },
    { type: "logic" },
  ];

  return (
    <div className="surface-card flex h-[520px] flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-surface-2/60 px-3 py-2">
        <div className="flex items-center gap-1">
          <ToolBtn icon={MousePointer2} active title="Select" />
          <ToolBtn icon={Move} title="Pan" />
          <div className="mx-1 h-5 w-px bg-border" />
          <ToolBtn icon={ZoomOut} title="Zoom out" />
          <span className="px-1.5 font-mono text-[11px] text-muted-foreground">100%</span>
          <ToolBtn icon={ZoomIn} title="Zoom in" />
          <div className="mx-1 h-5 w-px bg-border" />
          <ToolBtn icon={Grid3x3} title="Grid" active />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">Constructor Canvas</span>
          <button className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground shadow-sm transition hover:opacity-90">
            <Plus className="h-3 w-3" /> Add Node
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Module palette */}
        <div className="w-40 shrink-0 border-r border-border bg-surface-2/40 p-2">
          <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Modules
          </div>
          <div className="space-y-1">
            {categories.map(({ type }) => {
              const style = NODE_STYLES[type];
              const Icon = style.icon;
              return (
                <div
                  key={type}
                  className="group flex cursor-grab items-center gap-2 rounded-md border border-transparent bg-surface px-2 py-1.5 text-xs font-medium transition hover:border-border hover:shadow-sm active:cursor-grabbing"
                >
                  <span
                    className="grid h-6 w-6 place-items-center rounded"
                    style={{ backgroundColor: `color-mix(in oklab, var(--color-${style.accent}) 15%, transparent)` }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: `var(--color-${style.accent})` }} />
                  </span>
                  <span className="truncate">{style.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Canvas */}
        <div className="relative min-w-0 flex-1 overflow-hidden grid-canvas bg-surface/50">
          {/* Edges */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            {edges.map((e, i) => {
              const a = nodeMap[e.from];
              const b = nodeMap[e.to];
              if (!a || !b) return null;
              const x1 = a.x + NODE_W;
              const y1 = a.y + NODE_H / 2;
              const x2 = b.x;
              const y2 = b.y + NODE_H / 2;
              const mx = (x1 + x2) / 2;
              return (
                <path
                  key={i}
                  d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth={1.5}
                  strokeOpacity={0.55}
                  strokeDasharray="0"
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((n) => {
            const style = NODE_STYLES[n.type];
            const Icon = style.icon;
            const selected = selectedId === n.id;
            return (
              <button
                key={n.id}
                onClick={() => onSelect(n.id)}
                className={[
                  "group absolute rounded-xl border bg-node p-3 text-left shadow-sm transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/40"
                    : "border-node-border hover:-translate-y-0.5 hover:shadow-md",
                ].join(" ")}
                style={{ left: n.x, top: n.y, width: NODE_W, height: NODE_H }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="grid h-6 w-6 place-items-center rounded-md"
                    style={{ backgroundColor: `color-mix(in oklab, var(--color-${style.accent}) 18%, transparent)` }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: `var(--color-${style.accent})` }} />
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {n.title}
                  </span>
                </div>
                <div className="mt-1.5 truncate text-sm font-semibold">{n.subtitle}</div>
                {/* Connection dots */}
                <span className="absolute left-0 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary bg-background" />
                <span className="absolute right-0 top-1/2 h-2 w-2 translate-x-1/2 -translate-y-1/2 rounded-full border border-primary bg-background" />
              </button>
            );
          })}

          {/* Legend */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md border border-border bg-surface/90 px-2 py-1 text-[10px] font-medium text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Connected node graph · drag to arrange
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ icon: Icon, active, title }: { icon: any; active?: boolean; title: string }) {
  return (
    <button
      title={title}
      className={[
        "grid h-7 w-7 place-items-center rounded-md transition",
        active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      ].join(" ")}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
