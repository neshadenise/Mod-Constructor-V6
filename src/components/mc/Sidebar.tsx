import {
  LayoutDashboard,
  FolderKanban,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdvanced } from "@/lib/advanced-mode";
import type { SectionId } from "./sections";

type Item = {
  id: SectionId;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badge?: string | null;
  group: "workspace" | "builders" | "advanced";
  advanced?: boolean;
};

export const SIDEBAR_ITEMS: Item[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "workspace" },
  { id: "projects", label: "Projects", icon: FolderKanban, badge: "12", group: "workspace" },
  { id: "career", label: "Career Builder", icon: Briefcase, group: "builders" },
  { id: "trait", label: "Trait Builder", icon: Sparkles, group: "builders" },
  { id: "aspiration", label: "Aspiration Builder", icon: Target, group: "builders" },
  { id: "notifications", label: "Notification Library", icon: Bell, group: "builders" },
  { id: "assets", label: "Assets", icon: Boxes, badge: "48", group: "builders" },
  { id: "queue", label: "Build Queue", icon: ListChecks, badge: "2", group: "builders" },
  { id: "settings", label: "Settings", icon: Settings, group: "builders" },

  // Advanced-only
  { id: "tuning", label: "Tuning Editor", icon: Sliders, group: "advanced", advanced: true },
  { id: "validation", label: "Validation", icon: ShieldCheck, badge: "3", group: "advanced", advanced: true },
];

const groups: { key: Item["group"]; label: string; advanced?: boolean }[] = [
  { key: "workspace", label: "Workspace" },
  { key: "builders", label: "Builders" },
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
                  return (
                    <button
                      key={it.id}
                      onClick={() => onSelect(it.id)}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-all",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                      )}
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
                      {it.badge && (
                        <span className="rounded-full bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-sidebar-foreground/70">
                          {it.badge}
                        </span>
                      )}
                      {isActive && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)] shadow-[0_0_8px_var(--teal)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="m-3 rounded-lg border border-sidebar-border bg-gradient-to-br from-sidebar-accent/60 to-transparent p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Engine Status
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--green)] opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--green)]" />
          </span>
          <span className="text-xs font-medium">Sims 4 · 1.108.318</span>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">S4PE bridge · local</div>
      </div>
    </aside>
  );
}
