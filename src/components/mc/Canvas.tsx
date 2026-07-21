import { useState } from "react";
import { Briefcase, Sparkles, Target, Package, Sliders, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

type NodeDef = {
  id: string;
  label: string;
  sub: string;
  x: number;
  y: number;
  icon: typeof Briefcase;
  color: string;
};

const nodes: NodeDef[] = [
  { id: "root", label: "Career Root", sub: "epic_careers", x: 60, y: 130, icon: Briefcase, color: "var(--blue)" },
  { id: "trait", label: "Trait Bundle", sub: "6 traits", x: 300, y: 40, icon: Sparkles, color: "var(--violet)" },
  { id: "asp", label: "Aspiration", sub: "Master Architect", x: 300, y: 220, icon: Target, color: "var(--teal)" },
  { id: "tune", label: "Tuning XML", sub: "142 files", x: 560, y: 130, icon: Sliders, color: "var(--orange)" },
  { id: "pkg", label: "Package", sub: "epic_careers.package", x: 800, y: 130, icon: Package, color: "var(--green)" },
];

const edges: [string, string][] = [
  ["root", "trait"],
  ["root", "asp"],
  ["trait", "tune"],
  ["asp", "tune"],
  ["tune", "pkg"],
];

export function Canvas() {
  const [selected, setSelected] = useState("tune");
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <div className="relative h-[440px] overflow-hidden rounded-xl border border-border bg-muted/40 dotted-grid">
      <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-lg border border-border bg-card/90 p-1 shadow-sm backdrop-blur">
        {["Select", "Node", "Edge", "Group"].map((t, i) => (
          <button
            key={t}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              i === 0 ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-lg border border-border bg-card/90 px-2.5 py-1.5 text-[11px] font-medium shadow-sm backdrop-blur">
        <Layers className="h-3.5 w-3.5 text-[var(--blue)]" />
        Constructor Canvas · 5 nodes · 5 edges
      </div>

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 960 440" preserveAspectRatio="none">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" className="text-[var(--blue)]" />
          </marker>
        </defs>
        {edges.map(([a, b]) => {
          const n1 = byId[a],
            n2 = byId[b];
          const x1 = n1.x + 90,
            y1 = n1.y + 32,
            x2 = n2.x,
            y2 = n2.y + 32;
          const mx = (x1 + x2) / 2;
          return (
            <path
              key={`${a}-${b}`}
              d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
              className="fill-none stroke-[var(--blue)]/50"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              markerEnd="url(#arrow)"
            />
          );
        })}
      </svg>

      {nodes.map((n) => {
        const Icon = n.icon;
        const isSel = selected === n.id;
        return (
          <button
            key={n.id}
            onClick={() => setSelected(n.id)}
            style={{ left: n.x, top: n.y }}
            className={cn(
              "absolute flex w-[180px] items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 text-left shadow-sm transition-all",
              isSel
                ? "border-[var(--teal)] shadow-[0_0_0_3px_color-mix(in_oklab,var(--teal)_25%,transparent)]"
                : "border-border hover:border-foreground/20",
            )}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white shadow-sm"
              style={{ backgroundColor: n.color }}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-xs font-semibold">{n.label}</div>
              <div className="truncate text-[10px] text-muted-foreground">{n.sub}</div>
            </div>
          </button>
        );
      })}

      <div className="absolute bottom-3 right-3 h-20 w-32 rounded-md border border-border bg-card/80 p-1.5 shadow-sm backdrop-blur">
        <div className="relative h-full w-full rounded bg-muted">
          {nodes.map((n) => (
            <div
              key={n.id}
              className="absolute h-1.5 w-3 rounded-sm"
              style={{ left: `${(n.x / 960) * 100}%`, top: `${(n.y / 440) * 100}%`, backgroundColor: n.color }}
            />
          ))}
          <div className="absolute inset-2 rounded border border-[var(--blue)]/60" />
        </div>
      </div>
    </div>
  );
}
