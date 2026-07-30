import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  PanelRightClose,
  PanelRightOpen,
  Briefcase,
  Sparkles,
  Target,
  Bell,
  Boxes,
  Package,
  FolderKanban,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore, useActiveProject } from "@/lib/store";
import { useAppNavigation } from "@/lib/navigation";
import { useProjectHealth } from "./HealthMetrics";
import type { SectionId } from "./sections";

export const PREVIEW_WIDTH = 320;

/** Which record kind each section previews. */
type PreviewKind = "career" | "trait" | "aspiration" | "notification" | "asset" | "project";

const SECTION_KIND: Partial<Record<SectionId, PreviewKind>> = {
  career: "career",
  trait: "trait",
  aspiration: "aspiration",
  notifications: "notification",
  icons: "asset",
  assets: "asset",
};

const KIND_META: Record<PreviewKind, { label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string; to: SectionId }> = {
  career: { label: "Career", icon: Briefcase, color: "var(--blue)", to: "career" },
  trait: { label: "Trait", icon: Sparkles, color: "var(--violet)", to: "trait" },
  aspiration: { label: "Aspiration", icon: Target, color: "var(--teal)", to: "aspiration" },
  notification: { label: "Notification", icon: Bell, color: "var(--orange)", to: "notifications" },
  asset: { label: "Asset", icon: Boxes, color: "var(--pink)", to: "assets" },
  project: { label: "Project", icon: FolderKanban, color: "var(--green)", to: "projects" },
};

export function usePreviewPanel() {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("mc.preview.panel") !== "closed";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("mc.preview.panel", open ? "open" : "closed");
  }, [open]);
  return { open, setOpen };
}

export function PreviewSidebar({
  active,
  open,
  onOpenChange,
}: {
  active: SectionId;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const store = useStore();
  const project = useActiveProject();
  const health = useProjectHealth();
  const { navigate } = useAppNavigation();

  const kind: PreviewKind = SECTION_KIND[active] ?? "project";

  const records = useMemo(() => {
    const pid = project?.id;
    const scoped = <T extends { projectId?: string }>(rows: T[]) =>
      pid ? rows.filter((r) => r.projectId === pid) : [];
    if (kind === "career") return scoped(store.state.careers).map((c) => ({ id: c.id, name: c.name }));
    if (kind === "trait") return scoped(store.state.traits).map((t) => ({ id: t.id, name: t.name }));
    if (kind === "aspiration") return scoped(store.state.aspirations).map((a) => ({ id: a.id, name: a.name }));
    if (kind === "notification") return scoped(store.state.notifications).map((n) => ({ id: n.id, name: n.name }));
    if (kind === "asset") return scoped(store.state.assets).map((a) => ({ id: a.id, name: a.name }));
    return [];
  }, [kind, project?.id, store.state]);

  const [pickedId, setPickedId] = useState<string | null>(null);
  const currentId = records.some((r) => r.id === pickedId) ? pickedId! : records[0]?.id ?? null;
  useEffect(() => setPickedId(null), [kind, project?.id]);

  const meta = KIND_META[kind];
  const Icon = meta.icon;

  if (!open) {
    return (
      <button
        onClick={() => onOpenChange(true)}
        title="Show Live Preview"
        className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-lg border border-r-0 border-border bg-card px-2 py-4 text-muted-foreground shadow-sm hover:text-foreground"
      >
        <PanelRightOpen className="h-4 w-4" />
        <span className="text-[10px] font-semibold uppercase tracking-widest [writing-mode:vertical-rl]">
          Live Preview
        </span>
      </button>
    );
  }

  return (
    <aside
      className="fixed right-0 top-0 z-40 flex h-screen flex-col border-l border-border bg-card/60 backdrop-blur"
      style={{ width: PREVIEW_WIDTH }}
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-[var(--blue)]" />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Live Preview</div>
            <div className="text-[10px] text-muted-foreground">{meta.label} view</div>
          </div>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          title="Hide Live Preview"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {!project ? (
          <Empty text="Select a project to preview its content." />
        ) : (
          <>
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Project
              </div>
              <div className="mt-0.5 truncate text-sm font-bold">{project.name}</div>
              <div className="text-[11px] text-muted-foreground">
                v{project.version} · {project.status}
              </div>
            </div>

            {kind !== "project" && records.length > 1 && (
              <select
                value={currentId ?? ""}
                onChange={(e) => setPickedId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              >
                {records.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}

            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-sm"
                  style={{ background: meta.color }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">
                    {records.find((r) => r.id === currentId)?.name ?? project.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{meta.label}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <Body kind={kind} id={currentId} active={active} />
              </div>
            </div>

            {kind !== "project" && (
              <button
                onClick={() => navigate(meta.to)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
              >
                Open {meta.label} Builder <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            )}

            <div className="rounded-lg border border-border bg-card p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Snapshot
              </div>
              <div className="mt-2 space-y-1.5">
                <Line label="Records" val={String(health?.recordCount ?? 0)} />
                <Line label="Errors" val={String(health?.errors ?? 0)} />
                <Line label="Warnings" val={String(health?.warnings ?? 0)} />
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

function Body({ kind, id, active }: { kind: PreviewKind; id: string | null; active: SectionId }) {
  const store = useStore();
  const project = useActiveProject();

  if (kind === "career") {
    const c = store.state.careers.find((r) => r.id === id);
    if (!c) return <Empty text="No careers in this project yet." />;
    const branch = c.branches[0];
    const level = branch?.levels[0];
    return (
      <>
        <Line label="Type" val={`${c.careerType} career`} />
        <Line label="Rank 1" val={level?.title || "—"} />
        <Line label="Salary" val={level ? `§${level.salary.toLocaleString()} / day` : "—"} />
        <Line label="Hours" val={level ? `${level.workStart} → ${level.workEnd}` : "—"} />
        <Line label="Branches" val={String(c.branches.length)} />
        <Line label="Ages" val={c.ageGates.length ? c.ageGates.join(", ") : "none set"} />
      </>
    );
  }

  if (kind === "trait") {
    const t = store.state.traits.find((r) => r.id === id);
    if (!t) return <Empty text="No traits in this project yet." />;
    const buff = t.buffs[0];
    return (
      <>
        <Line label="Category" val={t.category} />
        <Line label="Buffs" val={String(t.buffs.length)} />
        <Line label="Emotion" val={buff?.emotion ?? "—"} />
        <Line label="Duration" val={buff ? `${buff.durationHours}h` : "—"} />
        <Line label="Ages" val={t.ageGates.length ? t.ageGates.join(", ") : "none set"} />
      </>
    );
  }

  if (kind === "aspiration") {
    const a = store.state.aspirations.find((r) => r.id === id);
    if (!a) return <Empty text="No aspirations in this project yet." />;
    return (
      <>
        <Line label="Category" val={a.category || "—"} />
        <Line label="Milestones" val={String(a.milestones.length)} />
        <Line label="Objectives" val={String(a.milestones.reduce((n, m) => n + m.objectives.length, 0))} />
        <Line label="First step" val={a.milestones[0]?.name ?? "—"} />
      </>
    );
  }

  if (kind === "notification") {
    const n = store.state.notifications.find((r) => r.id === id);
    if (!n) return <Empty text="No notifications in this project yet." />;
    return (
      <div className="space-y-2">
        <div className="rounded-md border border-border bg-gradient-to-br from-[color-mix(in_oklab,var(--orange)_12%,var(--card))] to-transparent p-2.5">
          <div className="text-[11px] font-bold">{n.title || n.name}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{n.body || "No body text yet."}</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {n.actions.map((a, i) => (
              <span
                key={i}
                className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {a.label}
              </span>
            ))}
          </div>
        </div>
        <Line label="Visual" val={String(n.visual)} />
      </div>
    );
  }

  if (kind === "asset") {
    const a = store.state.assets.find((r) => r.id === id);
    if (!a) return <Empty text="No assets in this project yet." />;
    return (
      <>
        {a.dataUrl && (
          <img
            src={a.dataUrl}
            alt={a.name}
            className="mb-2 h-24 w-full rounded-md border border-border object-contain"
          />
        )}
        <Line label="Kind" val={a.kind} />
        <Line label="Folder" val={a.folder} />
        <Line label="Size" val={`${Math.max(1, Math.round(a.sizeBytes / 1024))} KB`} />
        <Line label="Tags" val={a.tags.length ? a.tags.join(", ") : "none"} />
      </>
    );
  }

  // Project-level preview (dashboard, exporter, insights, settings...)
  const pid = project?.id;
  const count = (rows: { projectId?: string }[]) => rows.filter((r) => r.projectId === pid).length;
  return (
    <>
      <Line label="Careers" val={String(count(store.state.careers))} />
      <Line label="Traits" val={String(count(store.state.traits))} />
      <Line label="Aspirations" val={String(count(store.state.aspirations))} />
      <Line label="Notifications" val={String(count(store.state.notifications))} />
      <Line label="Assets" val={String(count(store.state.assets))} />
      {active === "exporter" && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Package className="h-3.5 w-3.5" /> Bundle contents preview
        </div>
      )}
    </>
  );
}

function Line({ label, val }: { label: string; val: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-semibold tabular-nums">{val}</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className={cn("rounded-md border border-dashed border-border p-3 text-[11px] text-muted-foreground")}>
      {text}
    </div>
  );
}
