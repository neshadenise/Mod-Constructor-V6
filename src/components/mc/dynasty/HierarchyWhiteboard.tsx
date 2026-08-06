/**
 * Hierarchy whiteboard.
 *
 * Roles are positions, not people, and connections describe authority — who
 * reports to whom, who may promote, who succeeds whom. Drag to arrange,
 * shift-drag from a node to wire a connection, wheel to zoom.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crown, Link2, Plus, StickyNote, Trash2, Users, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, Btn, Field, NumberInput, SelectInput, TextArea, TextInput, Toggle } from "@/components/mc/trait/primitives";
import {
  APPOINTMENT_METHODS, APPOINTMENT_METHOD_LABEL, CONNECTION_TYPES, CONNECTION_TYPE_LABEL,
  LEADERSHIP_KINDS, NODE_KINDS, NODE_KIND_LABEL, blankConnection, blankRole, did,
  sanitizeInternalName,
  type Connection, type DynastyDoc, type NodeKind, type RoleNode,
} from "@/lib/dynasty/schema";

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.2;

const KIND_TONE: Record<string, string> = {
  founder: "border-amber-400/60 bg-amber-400/10",
  supreme_leader: "border-primary/60 bg-primary/10",
  co_leader: "border-primary/40 bg-primary/5",
  heir: "border-cyan-400/50 bg-cyan-400/10",
  council: "border-violet-400/50 bg-violet-400/10",
  outcast: "border-red-400/50 bg-red-400/10",
  former_member: "border-red-400/30 bg-red-400/5",
  rival: "border-red-400/40 bg-red-400/5",
  ally: "border-emerald-400/40 bg-emerald-400/5",
};

interface Props {
  doc: DynastyDoc;
  onChange: (next: DynastyDoc) => void;
  /** Findings keyed by role uuid, so problem nodes glow. */
  problemRoleIds?: Set<string>;
  selectedId?: string;
  onSelect?: (id: string | undefined) => void;
}

export function HierarchyWhiteboard({ doc, onChange, problemRoleIds, selectedId, onSelect }: Props) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(0.85);
  const [offset, setOffset] = useState({ x: 40, y: 20 });
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [panning, setPanning] = useState<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [wire, setWire] = useState<{ from: string; x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<string | undefined>(selectedId);
  const [selectedConn, setSelectedConn] = useState<string | undefined>();

  useEffect(() => setSelected(selectedId), [selectedId]);

  const roles = doc.hierarchy.roles;
  const grid = doc.hierarchy.snapToGrid ? Math.max(4, doc.hierarchy.gridSize) : 1;
  const snap = (v: number) => Math.round(v / grid) * grid;

  const setHierarchy = useCallback(
    (patch: Partial<DynastyDoc["hierarchy"]>) =>
      onChange({ ...doc, hierarchy: { ...doc.hierarchy, ...patch } }),
    [doc, onChange],
  );

  const updateRole = useCallback(
    (uuid: string, patch: Partial<RoleNode>) =>
      setHierarchy({ roles: doc.hierarchy.roles.map((r) => (r.uuid === uuid ? { ...r, ...patch } : r)) }),
    [doc.hierarchy.roles, setHierarchy],
  );

  const updateConn = useCallback(
    (uuid: string, patch: Partial<Connection>) =>
      setHierarchy({
        connections: doc.hierarchy.connections.map((c) => (c.uuid === uuid ? { ...c, ...patch } : c)),
      }),
    [doc.hierarchy.connections, setHierarchy],
  );

  /* ------------------------------------------------------------ zooming --- */
  // React's onWheel is passive, so preventDefault only works on a native
  // listener. The handler lives in a ref so the effect never goes stale.
  const wheelRef = useRef<(e: WheelEvent) => void>(() => {});
  wheelRef.current = (e: WheelEvent) => {
    const el = surfaceRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * Math.exp(-dy * 0.0015)));
    const k = next / zoom;
    setOffset({ x: px - (px - offset.x) * k, y: py - (py - offset.y) * k });
    setZoom(next);
  };

  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelRef.current(e);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = (factor: number) => {
    const el = surfaceRef.current;
    const rect = el?.getBoundingClientRect();
    const px = (rect?.width ?? 800) / 2;
    const py = (rect?.height ?? 500) / 2;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
    const k = next / zoom;
    setOffset({ x: px - (px - offset.x) * k, y: py - (py - offset.y) * k });
    setZoom(next);
  };

  /* ---------------------------------------------------------- pointering -- */
  const toBoard = (clientX: number, clientY: number) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    const px = clientX - (rect?.left ?? 0);
    const py = clientY - (rect?.top ?? 0);
    return { x: (px - offset.x) / zoom, y: (py - offset.y) / zoom };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (drag) {
      const p = toBoard(e.clientX, e.clientY);
      updateRole(drag.id, { x: snap(p.x - drag.dx), y: snap(p.y - drag.dy) });
    } else if (panning) {
      setOffset({ x: panning.ox + (e.clientX - panning.x), y: panning.oy + (e.clientY - panning.y) });
    } else if (wire) {
      const p = toBoard(e.clientX, e.clientY);
      setWire({ ...wire, x: p.x, y: p.y });
    }
  };

  const endWire = (targetId?: string) => {
    if (wire && targetId && targetId !== wire.from) {
      const exists = doc.hierarchy.connections.some(
        (c) => c.from === wire.from && c.to === targetId && c.type === "reports_to",
      );
      if (!exists)
        setHierarchy({ connections: [...doc.hierarchy.connections, blankConnection(wire.from, targetId)] });
    }
    setWire(null);
  };

  const onPointerUp = () => {
    setDrag(null);
    setPanning(null);
    if (wire) setWire(null);
  };

  /* ------------------------------------------------------------- actions -- */
  const addRole = (kind: NodeKind = "standard_member") => {
    const level = kind === "founder" ? 0 : LEADERSHIP_KINDS.includes(kind) ? 1 : 3;
    const role = blankRole({
      kind,
      displayName: NODE_KIND_LABEL[kind],
      internalName: sanitizeInternalName(`Role_${doc.identity.internalName}_${NODE_KIND_LABEL[kind]}`),
      hierarchyLevel: level,
      rank: level === 0 ? 100 : LEADERSHIP_KINDS.includes(kind) ? 90 : 10,
      unique: kind === "founder" || kind === "supreme_leader",
      successionEligible: kind === "heir" || kind === "co_leader",
      x: snap(160 + roles.length * 40),
      y: snap(120 + level * 170),
    });
    setHierarchy({ roles: [...roles, role] });
    setSelected(role.uuid);
    onSelect?.(role.uuid);
  };

  const removeRole = (uuid: string) => {
    setHierarchy({
      roles: roles.filter((r) => r.uuid !== uuid),
      connections: doc.hierarchy.connections.filter((c) => c.from !== uuid && c.to !== uuid),
    });
    if (selected === uuid) setSelected(undefined);
  };

  const addNote = () =>
    setHierarchy({
      notes: [...doc.hierarchy.notes, { uuid: did("note"), text: "Note", x: 80, y: 40, color: "amber" }],
    });

  const selectedRole = roles.find((r) => r.uuid === selected);
  const conn = doc.hierarchy.connections.find((c) => c.uuid === selectedConn);

  const bounds = useMemo(() => {
    const xs = roles.map((r) => r.x);
    const ys = roles.map((r) => r.y);
    return {
      w: Math.max(1400, ...xs.map((x) => x + 400)),
      h: Math.max(800, ...ys.map((y) => y + 320)),
    };
  }, [roles]);

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="overflow-hidden rounded-xl border border-border bg-card/40">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-background/60 px-2.5 py-2">
          <Btn icon={Crown} onClick={() => addRole("supreme_leader")}>Leader</Btn>
          <Btn icon={Users} onClick={() => addRole("standard_member")}>Role</Btn>
          <Btn icon={Plus} onClick={() => addRole("heir")}>Heir</Btn>
          <Btn icon={StickyNote} onClick={addNote}>Note</Btn>
          <span className="mx-1 h-4 w-px bg-border" />
          <Btn icon={ZoomOut} onClick={() => zoomBy(1 / 1.2)} title="Zoom out" />
          <span className="w-11 text-center text-[11px] tabular-nums text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Btn icon={ZoomIn} onClick={() => zoomBy(1.2)} title="Zoom in" />
          <Btn onClick={() => { setZoom(0.85); setOffset({ x: 40, y: 20 }); }}>Reset view</Btn>
          <span className="ml-auto text-[10.5px] text-muted-foreground">
            Shift-drag a node edge to connect · drag empty space to pan
          </span>
        </div>

        <div
          ref={surfaceRef}
          className="relative h-[560px] cursor-grab touch-none overflow-hidden bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] [background-size:22px_22px]"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) {
              setPanning({ x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y });
              setSelected(undefined);
              setSelectedConn(undefined);
              onSelect?.(undefined);
            }
          }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, width: bounds.w, height: bounds.h }}
          >
            <svg className="pointer-events-none absolute inset-0" width={bounds.w} height={bounds.h}>
              <defs>
                <marker id="dyn-arrow" markerWidth="9" markerHeight="9" refX="8" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="currentColor" />
                </marker>
              </defs>
              {doc.hierarchy.connections.filter((c) => c.showInTree).map((c) => {
                const a = roles.find((r) => r.uuid === c.from);
                const b = roles.find((r) => r.uuid === c.to);
                if (!a || !b) return null;
                const x1 = a.x + 100, y1 = a.y + 56, x2 = b.x + 100, y2 = b.y + 4;
                const mid = (y1 + y2) / 2;
                return (
                  <g key={c.uuid} className={cn("text-muted-foreground", selectedConn === c.uuid && "text-primary")}>
                    <path
                      d={`M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={selectedConn === c.uuid ? 2.4 : 1.4}
                      strokeDasharray={c.isDemotionPath ? "5 4" : undefined}
                      markerEnd={c.directed ? "url(#dyn-arrow)" : undefined}
                    />
                    <text
                      x={(x1 + x2) / 2}
                      y={mid - 4}
                      textAnchor="middle"
                      className="pointer-events-auto cursor-pointer fill-current text-[10px]"
                      onClick={() => { setSelectedConn(c.uuid); setSelected(undefined); }}
                    >
                      {c.label || CONNECTION_TYPE_LABEL[c.type]}
                    </text>
                  </g>
                );
              })}
              {wire && (() => {
                const a = roles.find((r) => r.uuid === wire.from);
                if (!a) return null;
                return (
                  <line
                    x1={a.x + 100} y1={a.y + 56} x2={wire.x} y2={wire.y}
                    stroke="currentColor" strokeWidth={1.6} strokeDasharray="4 4"
                    className="text-primary"
                  />
                );
              })()}
            </svg>

            {doc.hierarchy.notes.map((n) => (
              <div
                key={n.uuid}
                className="absolute w-[160px] rounded-md border border-amber-400/40 bg-amber-400/10 p-2 text-[11px]"
                style={{ left: n.x, top: n.y }}
              >
                <textarea
                  value={n.text}
                  onChange={(e) =>
                    setHierarchy({
                      notes: doc.hierarchy.notes.map((x) => (x.uuid === n.uuid ? { ...x, text: e.target.value } : x)),
                    })
                  }
                  className="w-full resize-none bg-transparent text-[11px] outline-none"
                  rows={3}
                />
              </div>
            ))}

            {roles.map((r) => (
              <div
                key={r.uuid}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  const p = toBoard(e.clientX, e.clientY);
                  if (e.shiftKey) setWire({ from: r.uuid, x: p.x, y: p.y });
                  else setDrag({ id: r.uuid, dx: p.x - r.x, dy: p.y - r.y });
                  setSelected(r.uuid);
                  setSelectedConn(undefined);
                  onSelect?.(r.uuid);
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  endWire(r.uuid);
                  setDrag(null);
                }}
                className={cn(
                  "absolute w-[200px] cursor-move rounded-lg border p-2.5 shadow-sm transition-shadow",
                  KIND_TONE[r.kind] ?? "border-border bg-card",
                  selected === r.uuid && "ring-2 ring-primary",
                  problemRoleIds?.has(r.uuid) && "ring-2 ring-red-500/70",
                )}
                style={{ left: r.x, top: r.y }}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <span className="truncate text-[12px] font-semibold">{r.displayName}</span>
                  {r.unique && <Badge tone="accent">1</Badge>}
                </div>
                <div className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
                  {NODE_KIND_LABEL[r.kind]} · rank {r.rank}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {r.successionEligible && <Badge tone="ok">succeeds</Badge>}
                  {r.votingRights && <Badge>votes</Badge>}
                  {r.secret && <Badge tone="warn">secret</Badge>}
                  {r.maxSims > 0 && <Badge>max {r.maxSims}</Badge>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------- inspector */}
      <div className="space-y-3 rounded-xl border border-border bg-card/60 p-3">
        {selectedRole ? (
          <RoleInspector
            role={selectedRole}
            onChange={(patch) => updateRole(selectedRole.uuid, patch)}
            onDelete={() => removeRole(selectedRole.uuid)}
          />
        ) : conn ? (
          <ConnectionInspector
            conn={conn}
            roles={roles}
            onChange={(patch) => updateConn(conn.uuid, patch)}
            onDelete={() => {
              setHierarchy({ connections: doc.hierarchy.connections.filter((c) => c.uuid !== conn.uuid) });
              setSelectedConn(undefined);
            }}
          />
        ) : (
          <div className="space-y-2 text-[11.5px] text-muted-foreground">
            <p className="font-semibold text-foreground">Nothing selected</p>
            <p>
              Roles are positions, not Sims. A position can sit empty, and the same Sim can hold a
              position without any bloodline claim.
            </p>
            <div className="pt-2">
              <Toggle
                checked={doc.hierarchy.snapToGrid}
                onChange={(v) => setHierarchy({ snapToGrid: v })}
                label="Snap to grid"
                hint={`${doc.hierarchy.gridSize}px spacing`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RoleInspector({
  role, onChange, onDelete,
}: {
  role: RoleNode;
  onChange: (patch: Partial<RoleNode>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="text-[12px] font-semibold">Role</h4>
        <Btn icon={Trash2} variant="danger" onClick={onDelete} title="Delete role" />
      </div>
      <Field label="Display name">
        <TextInput value={role.displayName} onChange={(e) => onChange({ displayName: e.target.value })} />
      </Field>
      <Field label="Internal name" hint="Used for the generated tuning id.">
        <TextInput
          value={role.internalName}
          onChange={(e) => onChange({ internalName: sanitizeInternalName(e.target.value) })}
        />
      </Field>
      <Field label="Kind">
        <SelectInput
          value={role.kind}
          onChange={(v) => onChange({ kind: v })}
          options={NODE_KINDS.map((k) => ({ value: k, label: NODE_KIND_LABEL[k] }))}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Rank"><NumberInput value={role.rank} onChange={(v) => onChange({ rank: v })} /></Field>
        <Field label="Level"><NumberInput value={role.hierarchyLevel} onChange={(v) => onChange({ hierarchyLevel: v })} /></Field>
        <Field label="Min Sims"><NumberInput value={role.minSims} min={0} onChange={(v) => onChange({ minSims: v })} /></Field>
        <Field label="Max Sims" hint="0 = unlimited">
          <NumberInput value={role.maxSims} min={0} onChange={(v) => onChange({ maxSims: v })} />
        </Field>
      </div>
      <Field label="Appointment">
        <div className="flex flex-wrap gap-1">
          {APPOINTMENT_METHODS.map((m) => {
            const on = role.appointment.includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() =>
                  onChange({
                    appointment: on ? role.appointment.filter((x) => x !== m) : [...role.appointment, m],
                  })
                }
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10.5px]",
                  on ? "border-primary/50 bg-primary/15" : "border-border text-muted-foreground",
                )}
              >
                {APPOINTMENT_METHOD_LABEL[m]}
              </button>
            );
          })}
        </div>
      </Field>
      <div className="space-y-1.5">
        <Toggle checked={role.unique} onChange={(v) => onChange({ unique: v })} label="Only one Sim may hold this" />
        <Toggle checked={role.successionEligible} onChange={(v) => onChange({ successionEligible: v })} label="Eligible to succeed leadership" />
        <Toggle checked={role.votingRights} onChange={(v) => onChange({ votingRights: v })} label="Has voting rights" />
        <Toggle checked={role.secret} onChange={(v) => onChange({ secret: v })} label="Hidden from other members" />
        <Toggle
          checked={role.requirements.familyRequired}
          onChange={(v) => onChange({ requirements: { ...role.requirements, familyRequired: v } })}
          label="Bloodline required"
          hint="Membership alone is not enough for this position."
        />
      </div>
      <Field label="Notes">
        <TextArea value={role.notes} onChange={(e) => onChange({ notes: e.target.value })} rows={2} />
      </Field>
    </div>
  );
}

function ConnectionInspector({
  conn, roles, onChange, onDelete,
}: {
  conn: Connection;
  roles: RoleNode[];
  onChange: (patch: Partial<Connection>) => void;
  onDelete: () => void;
}) {
  const name = (id: string) => roles.find((r) => r.uuid === id)?.displayName ?? "—";
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-[12px] font-semibold">
          <Link2 className="h-3.5 w-3.5" /> Connection
        </h4>
        <Btn icon={Trash2} variant="danger" onClick={onDelete} title="Delete connection" />
      </div>
      <p className="text-[11px] text-muted-foreground">
        {name(conn.from)} → {name(conn.to)}
      </p>
      <Field label="Type">
        <SelectInput
          value={conn.type}
          onChange={(v) => onChange({ type: v })}
          options={CONNECTION_TYPES.map((t) => ({ value: t, label: CONNECTION_TYPE_LABEL[t] }))}
        />
      </Field>
      <Field label="Label" hint="Shown on the board.">
        <TextInput value={conn.label} onChange={(e) => onChange({ label: e.target.value })} />
      </Field>
      <div className="space-y-1.5">
        <Toggle checked={conn.isPromotionPath} onChange={(v) => onChange({ isPromotionPath: v })} label="Promotion path" />
        <Toggle checked={conn.isDemotionPath} onChange={(v) => onChange({ isDemotionPath: v })} label="Demotion path" />
        <Toggle
          checked={conn.inheritPermissions}
          onChange={(v) => onChange({ inheritPermissions: v })}
          label="Inherit permissions from superior"
        />
        <Toggle checked={conn.visibleToPlayers} onChange={(v) => onChange({ visibleToPlayers: v })} label="Visible in game" />
      </div>
      <Field label="Succession priority" hint="Lower goes first when several roles qualify.">
        <NumberInput value={conn.successionPriority} onChange={(v) => onChange({ successionPriority: v })} />
      </Field>
    </div>
  );
}
