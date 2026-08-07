import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Briefcase,
  Sparkles,
  Target,
  Package,
  Layers,
  Info,
  FolderOpen,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdvanced } from "@/lib/advanced-mode";
import { useStore, useActiveProject } from "@/lib/store";

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */

type NodeKind = "project" | "career" | "trait" | "aspiration" | "package";

type CanvasNode = {
  id: string;
  kind: NodeKind;
  label: string;
  sub: string;
  x: number;
  y: number;
};

type Edge = { from: string; to: string };

const NODE_W = 180;
const NODE_H = 52;
const CANVAS_H = 440;

const KIND_META: Record<NodeKind, { icon: typeof Briefcase; color: string }> = {
  project: { icon: FolderOpen, color: "var(--blue)" },
  career: { icon: Briefcase, color: "var(--blue)" },
  trait: { icon: Sparkles, color: "var(--violet)" },
  aspiration: { icon: Target, color: "var(--teal)" },
  package: { icon: Package, color: "var(--green)" },
};

const layoutKey = (projectId: string) => `mc.canvas.layout.${projectId}`;
const edgeKey = (projectId: string) => `mc.canvas.edges.${projectId}`;

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — layout just won't persist */
  }
}

/* ------------------------------------------------------------------ */
/* Canvas                                                              */
/* ------------------------------------------------------------------ */

export function Canvas() {
  const { advanced } = useAdvanced();
  const store = useStore();
  const project = useActiveProject();
  const projectId = project?.id;

  const wrapRef = useRef<HTMLDivElement>(null);

  /* ---- Nodes derived from the ACTIVE project only ------------------ */
  const derived = useMemo<CanvasNode[]>(() => {
    if (!projectId) return [];
    const careers = store.state.careers.filter((c) => c.projectId === projectId);
    const traits = store.state.traits.filter((t) => t.projectId === projectId);
    const aspirations = store.state.aspirations.filter((a) => a.projectId === projectId);

    const out: CanvasNode[] = [
      {
        id: "project",
        kind: "project",
        label: project?.name ?? "Project",
        sub: `v${project?.version ?? "0.1.0"}`,
        x: 40,
        y: CANVAS_H / 2 - NODE_H / 2,
      },
    ];

    const columns: { items: CanvasNode[]; x: number }[] = [];
    const mk = (kind: NodeKind, id: string, label: string, sub: string): CanvasNode => ({
      id: `${kind}:${id}`,
      kind,
      label,
      sub,
      x: 0,
      y: 0,
    });

    const middle = [
      ...careers.map((c) => mk("career", c.id, c.name || "Untitled career", "Career")),
      ...traits.map((t) => mk("trait", t.id, t.name || "Untitled trait", "Trait")),
      ...aspirations.map((a) => mk("aspiration", a.id, a.name || "Untitled aspiration", "Aspiration")),
    ];
    columns.push({ items: middle, x: 330 });

    middle.forEach((n, i) => {
      const gap = Math.min(78, (CANVAS_H - 60) / Math.max(middle.length, 1));
      n.x = 330;
      n.y = 34 + i * gap;
    });

    out.push(...middle);
    out.push({
      id: "package",
      kind: "package",
      label: "Package",
      sub: `${project?.name?.toLowerCase().replace(/\s+/g, "_") ?? "mod"}.package`,
      x: 660,
      y: CANVAS_H / 2 - NODE_H / 2,
    });
    return out;
  }, [projectId, project?.name, project?.version, store.state.careers, store.state.traits, store.state.aspirations]);

  const defaultEdges = useMemo<Edge[]>(
    () =>
      derived
        .filter((n) => n.kind !== "project" && n.kind !== "package")
        .flatMap((n) => [
          { from: "project", to: n.id },
          { from: n.id, to: "package" },
        ]),
    [derived],
  );

  /* ---- Persisted positions + edges (per project) ------------------- */
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setPositions({});
      setEdges([]);
      return;
    }
    setPositions(readJson<Record<string, { x: number; y: number }>>(layoutKey(projectId)) ?? {});
    setEdges(readJson<Edge[]>(edgeKey(projectId)) ?? defaultEdges);
    setSelected(null);
    // Only re-hydrate when the project changes, not on every derive pass.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  /* Keep edges valid when records are added or deleted. */
  useEffect(() => {
    if (!projectId) return;
    const ids = new Set(derived.map((n) => n.id));
    setEdges((prev) => {
      const kept = prev.filter((e) => ids.has(e.from) && ids.has(e.to));
      const known = new Set(kept.map((e) => `${e.from}->${e.to}`));
      const touched = new Set(kept.flatMap((e) => [e.from, e.to]));
      // Newly created records join the graph with their default wiring.
      const added = defaultEdges.filter(
        (e) => !known.has(`${e.from}->${e.to}`) && !touched.has(e.from === "project" ? e.to : e.from),
      );
      const next = [...kept, ...added];
      return next.length === prev.length && added.length === 0 ? prev : next;
    });
  }, [derived, defaultEdges, projectId]);

  const nodes = useMemo(
    () => derived.map((n) => ({ ...n, ...(positions[n.id] ?? {}) })),
    [derived, positions],
  );
  const byId = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);

  const persistPositions = useCallback(
    (next: Record<string, { x: number; y: number }>) => {
      if (projectId) writeJson(layoutKey(projectId), next);
    },
    [projectId],
  );
  const persistEdges = useCallback(
    (next: Edge[]) => {
      if (projectId) writeJson(edgeKey(projectId), next);
    },
    [projectId],
  );

  /* ---- Dragging a node --------------------------------------------- */
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const onNodePointerDown = (e: React.PointerEvent, n: CanvasNode) => {
    if ((e.target as HTMLElement).dataset.port) return;
    e.preventDefault();
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { id: n.id, dx: e.clientX - rect.left - n.x, dy: e.clientY - rect.top - n.y };
    setSelected(n.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onNodePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!drag || !rect) return;
    const x = Math.max(0, Math.min(rect.width - NODE_W, e.clientX - rect.left - drag.dx));
    const y = Math.max(0, Math.min(rect.height - NODE_H, e.clientY - rect.top - drag.dy));
    setPositions((prev) => ({ ...prev, [drag.id]: { x, y } }));
  };

  const endDrag = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setPositions((prev) => {
      persistPositions(prev);
      return prev;
    });
  };

  /* ---- Linking (drag from a node's output port) --------------------- */
  const [link, setLink] = useState<{ from: string; x: number; y: number } | null>(null);
  const linkRef = useRef<string | null>(null);

  const onPortPointerDown = (e: React.PointerEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    linkRef.current = id;
    setLink({ from: id, x: e.clientX - rect.left, y: e.clientY - rect.top });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPortPointerMove = (e: React.PointerEvent) => {
    if (!linkRef.current) return;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setLink({ from: linkRef.current, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const onPortPointerUp = (e: React.PointerEvent) => {
    const from = linkRef.current;
    linkRef.current = null;
    setLink(null);
    if (!from) return;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const target = nodes.find(
      (n) => px >= n.x && px <= n.x + NODE_W && py >= n.y && py <= n.y + NODE_H && n.id !== from,
    );
    if (!target) return;
    setEdges((prev) => {
      if (prev.some((ed) => ed.from === from && ed.to === target.id)) return prev;
      const next = [...prev, { from, to: target.id }];
      persistEdges(next);
      return next;
    });
  };

  const removeEdge = (edge: Edge) => {
    setEdges((prev) => {
      const next = prev.filter((e) => !(e.from === edge.from && e.to === edge.to));
      persistEdges(next);
      return next;
    });
  };

  const resetLayout = () => {
    setPositions({});
    setEdges(defaultEdges);
    if (projectId) {
      writeJson(layoutKey(projectId), {});
      writeJson(edgeKey(projectId), defaultEdges);
    }
  };

  const edgePath = (a: CanvasNode, b: CanvasNode) => {
    const x1 = a.x + NODE_W;
    const y1 = a.y + NODE_H / 2;
    const x2 = b.x;
    const y2 = b.y + NODE_H / 2;
    const mx = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  };

  /* ---- Render ------------------------------------------------------- */
  if (!projectId) {
    return (
      <div className="flex h-[440px] items-center justify-center rounded-xl border border-border bg-muted/40 text-sm text-muted-foreground dotted-grid">
        Open a project to see its constructor graph.
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="relative h-[440px] touch-none overflow-hidden rounded-xl border border-border bg-muted/40 dotted-grid"
      onPointerMove={(e) => {
        onNodePointerMove(e);
        onPortPointerMove(e);
      }}
      onPointerUp={(e) => {
        endDrag();
        onPortPointerUp(e);
      }}
    >
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-lg border border-border bg-card/90 px-2.5 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
        <Info className="h-3.5 w-3.5 text-[var(--blue)]" />
        <span>Drag cards to move · drag the right dot onto another card to connect</span>
        <button
          onClick={resetLayout}
          className="ml-1 flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 font-medium text-foreground transition-colors hover:bg-accent"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      </div>

      <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-lg border border-border bg-card/90 px-2.5 py-1.5 text-[11px] font-medium shadow-sm backdrop-blur">
        <Layers className="h-3.5 w-3.5 text-[var(--blue)]" />
        {advanced
          ? `${project?.name} · ${nodes.length} nodes · ${edges.length} edges`
          : `${project?.name} at a glance`}
      </div>

      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" className="text-[var(--blue)]" />
          </marker>
        </defs>
        {edges.map((e) => {
          const a = byId[e.from];
          const b = byId[e.to];
          if (!a || !b) return null;
          return (
            <g key={`${e.from}->${e.to}`} className="pointer-events-auto">
              <path
                d={edgePath(a, b)}
                className="cursor-pointer fill-none stroke-transparent"
                strokeWidth={14}
                onClick={() => removeEdge(e)}
              >
                <title>Click to disconnect</title>
              </path>
              <path
                d={edgePath(a, b)}
                className="pointer-events-none fill-none stroke-[var(--blue)]/50"
                strokeWidth={1.5}
                markerEnd="url(#arrow)"
              />
            </g>
          );
        })}
        {link && byId[link.from] && (
          <path
            d={`M ${byId[link.from].x + NODE_W} ${byId[link.from].y + NODE_H / 2} L ${link.x} ${link.y}`}
            className="fill-none stroke-[var(--teal)]"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
        )}
      </svg>

      {nodes.map((n) => {
        const meta = KIND_META[n.kind];
        const Icon = meta.icon;
        const isSel = selected === n.id;
        return (
          <div
            key={n.id}
            onPointerDown={(e) => onNodePointerDown(e, n)}
            style={{ left: n.x, top: n.y, width: NODE_W, height: NODE_H }}
            className={cn(
              "absolute flex cursor-grab select-none items-center gap-2.5 rounded-lg border bg-card px-3 text-left shadow-sm transition-colors active:cursor-grabbing",
              isSel
                ? "border-[var(--teal)] shadow-[0_0_0_3px_color-mix(in_oklab,var(--teal)_25%,transparent)]"
                : "border-border hover:border-foreground/20",
            )}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white shadow-sm"
              style={{ backgroundColor: meta.color }}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-xs font-semibold">{n.label}</div>
              <div className="truncate text-[10px] text-muted-foreground">{n.sub}</div>
            </div>
            {/* input port */}
            <span className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-border bg-card" />
            {/* output port — drag from here */}
            <span
              data-port="out"
              title="Drag to another card to connect"
              onPointerDown={(e) => onPortPointerDown(e, n.id)}
              className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 cursor-crosshair rounded-full border border-[var(--teal)] bg-card hover:bg-[var(--teal)]"
            />
          </div>
        );
      })}

      {selected && (
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-lg border border-border bg-card/90 px-2.5 py-1.5 text-[11px] shadow-sm backdrop-blur">
          <span className="font-medium">{byId[selected]?.label}</span>
          <span className="text-muted-foreground">
            {edges.filter((e) => e.from === selected || e.to === selected).length} connections
          </span>
          <button
            onClick={() => {
              setEdges((prev) => {
                const next = prev.filter((e) => e.from !== selected && e.to !== selected);
                persistEdges(next);
                return next;
              });
            }}
            className="flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 transition-colors hover:bg-accent"
          >
            <Trash2 className="h-3 w-3" /> Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
