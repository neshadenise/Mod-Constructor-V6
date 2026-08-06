import {
  LayoutDashboard,
  FolderKanban,
  FolderTree,
  Briefcase,
  Sparkles,
  Target,
  Sliders,
  Boxes,
  ShieldCheck,
  ListChecks,
  Settings,
  Hammer,
  Wrench,
  Bell,
  Package,
  Import,
  BookOpen,
  LayoutTemplate,
  Code2,
  Network,
  History,
  BarChart3,
  Radio,
  Palette,
  Globe2,
  Plus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAdvanced } from "@/lib/advanced-mode";
import type { SectionId } from "./sections";
import { useProjectHealth } from "./HealthMetrics";
import { useStore, useActiveProject } from "@/lib/store";
import { requestNewRecord } from "@/lib/builder-record";
import { useAppHost } from "@/lib/app-host";
import { toast } from "sonner";


type Item = {
  id: SectionId;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badge?: string | null;
  /** Shows a "+" affordance that creates a new record of this kind. */
  quickNew?: "project" | "career" | "trait" | "aspiration" | "notification";
  group: "workspace" | "builders" | "library" | "insights" | "advanced";
  advanced?: boolean;
};

export const SIDEBAR_ITEMS: Item[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "workspace" },
  { id: "projects", label: "Projects", icon: FolderKanban, quickNew: "project", group: "workspace" },
  { id: "explorer", label: "Project Explorer", icon: FolderTree, group: "workspace" },
  { id: "templates", label: "Templates", icon: LayoutTemplate, group: "workspace" },
  { id: "reference", label: "Reference", icon: BookOpen, group: "workspace" },

  { id: "career", label: "Career Builder", icon: Briefcase, quickNew: "career", group: "builders" },
  { id: "trait", label: "Trait Builder", icon: Sparkles, quickNew: "trait", group: "builders" },
  { id: "aspiration", label: "Aspiration Builder", icon: Target, quickNew: "aspiration", group: "builders" },
  { id: "notifications", label: "Notification Library", icon: Bell, quickNew: "notification", group: "builders" },
  { id: "icons", label: "Icon Library", icon: Palette, group: "builders" },
  { id: "assets", label: "Project Assets", icon: Boxes, group: "builders" },
  { id: "snippets", label: "Snippets", icon: Code2, group: "builders" },

  { id: "exporter", label: "Package Exporter", icon: Package, group: "builders" },
  { id: "importer", label: "Package Importer", icon: Import, group: "builders" },
  { id: "queue", label: "Build Queue", icon: ListChecks, group: "builders" },

  { id: "community", label: "Community Library", icon: Globe2, badge: "Beta", group: "library" },

  { id: "graph", label: "Dependency Graph", icon: Network, group: "insights" },
  { id: "timeline", label: "Activity", icon: History, group: "insights" },
  { id: "analytics", label: "Build Analytics", icon: BarChart3, group: "insights" },
  { id: "updates", label: "Update Center", icon: Radio, group: "insights" },
  { id: "settings", label: "Settings", icon: Settings, group: "insights" },

  // Advanced-only
  { id: "tuning", label: "Tuning Editor", icon: Sliders, group: "advanced", advanced: true },
  { id: "validation", label: "Validation Center", icon: ShieldCheck, group: "advanced", advanced: true },
];


const groups: { key: Item["group"]; label: string; advanced?: boolean }[] = [
  { key: "workspace", label: "Workspace" },
  { key: "builders", label: "Builders" },
  { key: "library", label: "Library" },
  { key: "insights", label: "Insights" },
  { key: "advanced", label: "Advanced", advanced: true },
];

export function AppSidebar({
  active,
  onSelect,
}: {
  active: SectionId;
  onSelect: (id: SectionId) => void;
}) {
  const { advanced } = useAdvanced();
  const store = useStore();
  const project = useActiveProject();
  const pid = project?.id;

  /** Live counts — no placeholder numbers. */
  const counts: Partial<Record<SectionId, number>> = {
    projects: store.state.projects.length,
    career: store.state.careers.filter((c) => c.projectId === pid).length,
    trait: store.state.traits.filter((t) => t.projectId === pid).length,
    aspiration: store.state.aspirations.filter((a) => a.projectId === pid).length,
    notifications: store.state.notifications.filter((n) => n.projectId === pid).length,
    assets: store.state.assets.filter((a) => a.projectId === pid).length,
    icons: store.state.assets.filter((a) => a.projectId === pid && a.kind === "icon").length,
    queue: store.state.builds.filter(
      (b) => (!pid || b.projectId === pid) && (b.status === "running" || b.status === "queued"),
    ).length,
    snippets: store.state.snippets.length,
    templates: store.state.templates.length,
  };

  function quickNew(kind: NonNullable<Item["quickNew"]>, section: SectionId) {
    if (kind === "project") {
      const p = store.createProject({ name: "Untitled Mod" });
      store.setActiveProject(p.id);
      toast.success(`Created "${p.name}"`);
      onSelect("projects");
      return;
    }
    if (!pid) {
      toast("Select or create a project first.");
      onSelect("projects");
      return;
    }
    if (kind === "notification") {
      const rec = store.createNotificationTemplate({ projectId: pid, name: "New Notification" });
      toast.success(`Created "${rec.name}"`);
      onSelect(section);
      return;
    }
    onSelect(section);
    // The builder is mounted by the time this lands; it starts a blank entry.
    setTimeout(() => requestNewRecord(kind), 0);
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--teal)] to-[var(--blue)] shadow-sm">
          <Hammer className="h-4 w-4 text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">Mod Constructor</div>
          <div className="text-[10px] font-medium text-muted-foreground">
            V6 · {advanced ? "Advanced Mode" : "Simple Mode"}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {groups.map((g) => {
          if (g.advanced && !advanced) return null;
          const items = SIDEBAR_ITEMS.filter((it) => it.group === g.key);
          if (items.length === 0) return null;
          return (
            <div key={g.key} className="mb-3">
              <div className="flex items-center gap-1.5 px-2.5 pb-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">
                {g.advanced && <Wrench className="h-2.5 w-2.5 text-[var(--orange)]" />}
                {g.label}
              </div>
              <div className="flex flex-col gap-0.5">
                {items.map((it) => {
                  const Icon = it.icon;
                  const isActive = active === it.id;
                  const count = counts[it.id];
                  const badge = it.badge ?? (typeof count === "number" && count > 0 ? String(count) : null);
                  return (
                    <div
                      key={it.id}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-all",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                      )}
                    >
                    <button
                      onClick={() => onSelect(it.id)}
                      className="flex flex-1 items-center gap-2.5 text-left"
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isActive
                            ? "text-[var(--blue)]"
                            : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground",
                        )}
                      />
                      <span className="flex-1 text-left">{it.label}</span>
                    </button>
                      {badge && (
                        <span className="rounded-full bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-sidebar-foreground/70">
                          {badge}
                        </span>
                      )}
                      {it.quickNew && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            quickNew(it.quickNew!, it.id);
                          }}
                          title={`New ${it.label.replace(" Builder", "").replace(" Library", "")}`}
                          aria-label={`New ${it.label}`}
                          className="rounded p-0.5 text-sidebar-foreground/50 opacity-0 transition hover:bg-sidebar-accent hover:text-[var(--teal)] focus:opacity-100 group-hover:opacity-100"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {isActive && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)] shadow-[0_0_8px_var(--teal)]" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <ProjectHealthStrip onSelect={onSelect} advanced={advanced} />

      <WorkspaceStatus />
    </aside>
  );
}

/** Real workspace status: storage backend and hydration state. */
function WorkspaceStatus() {
  const store = useStore();
  const host = useAppHost();
  const ready = store.hydrated;
  return (
    <div className="m-3 mt-0 rounded-lg border border-sidebar-border bg-gradient-to-br from-sidebar-accent/60 to-transparent p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Workspace
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          {ready && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--green)] opacity-70" />
          )}
          <span
            className={cn(
              "relative inline-flex h-2 w-2 rounded-full",
              ready ? "bg-[var(--green)]" : "bg-[var(--orange)]",
            )}
          />
        </span>
        <span className="text-xs font-medium">
          {ready ? "Saved locally" : "Loading workspace…"}
        </span>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">
        {store.adapter.label}
        {host.isChatGPT ? " · ChatGPT app" : " · Desktop"}
      </div>
    </div>
  );
}

/**
 * Compact project-health rail. Shows the weighted grade — not a progress bar —
 * and opens the Health Report, where every finding is clickable.
 */
function ProjectHealthStrip({
  onSelect,
  advanced,
}: {
  onSelect: (id: SectionId) => void;
  advanced: boolean;
}) {
  const report = useHealthReport();
  const r = report.readouts;
  const rows: { label: string; value: string; color?: string; to: SectionId }[] = [
    {
      label: "Errors",
      value: String(r.errors),
      color: r.errors ? "var(--red, #ef4444)" : "var(--green)",
      to: advanced ? "validation" : "queue",
    },
    { label: "Warnings", value: String(r.warnings), color: r.warnings ? "var(--orange)" : "var(--green)", to: advanced ? "validation" : "queue" },
    { label: "Compatibility", value: `${r.compatibilityPct}%`, color: "var(--blue)", to: "graph" },
    {
      label: "Testing",
      value: r.testing === "passed" ? "Passed" : r.testing === "failed" ? "Failed" : "Untested",
      color: r.testing === "passed" ? "var(--green)" : r.testing === "failed" ? "var(--red, #ef4444)" : "var(--orange)",
      to: "exporter",
    },
  ];
  return (
    <div className="m-3 rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-3">
      <button onClick={openHealthInspector} className="w-full text-left" title="Open the Health Report">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Project Health
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-lg font-bold tabular-nums" style={{ color: report.color }}>
            {report.score}%
          </span>
          <span className="text-[11px] font-semibold" style={{ color: report.color }}>
            {report.gradeLabel}
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-sidebar-border">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${report.score}%`, background: report.color }}
          />
        </div>
      </button>
      <div className="mt-2 flex flex-col gap-1">
        {rows.map((row) => (
          <button
            key={row.label}
            onClick={() => onSelect(row.to)}
            className="group flex items-center justify-between text-[11px]"
            title={`Open in ${row.to}`}
          >
            <span className="text-muted-foreground group-hover:text-sidebar-foreground">
              {row.label}
            </span>
            <span className="font-semibold tabular-nums" style={{ color: row.color }}>
              {row.value}
            </span>
          </button>
        ))}
      </div>
      <button
        onClick={openHealthInspector}
        className="mt-2 w-full rounded-md border border-sidebar-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-sidebar-accent"
      >
        Health Report
      </button>
    </div>
  );
}

