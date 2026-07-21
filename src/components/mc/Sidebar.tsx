import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, badge: null },
  { id: "projects", label: "Projects", icon: FolderKanban, badge: "12" },
  { id: "career", label: "Career Builder", icon: Briefcase, badge: null },
  { id: "trait", label: "Trait Builder", icon: Sparkles, badge: null },
  { id: "aspiration", label: "Aspiration Builder", icon: Target, badge: null },
  { id: "tuning", label: "Tuning", icon: Sliders, badge: null },
  { id: "assets", label: "Assets", icon: Boxes, badge: "48" },
  { id: "validation", label: "Validation", icon: ShieldCheck, badge: "3" },
  { id: "queue", label: "Build Queue", icon: ListChecks, badge: "2" },
  { id: "settings", label: "Settings", icon: Settings, badge: null },
];

export function AppSidebar() {
  const [active, setActive] = useState("dashboard");
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--teal)] to-[var(--blue)] shadow-sm">
          <Hammer className="h-4 w-4 text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">Mod Constructor</div>
          <div className="text-[10px] font-medium text-muted-foreground">V6 · Studio Build</div>
        </div>
      </div>
      <nav className="flex flex-col gap-0.5 px-2 py-3">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.id;
          return (
            <button
              key={it.id}
              onClick={() => setActive(it.id)}
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
                  isActive ? "text-[var(--blue)]" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground",
                )}
              />
              <span className="flex-1 text-left">{it.label}</span>
              {it.badge && (
                <span className="rounded-full bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-sidebar-foreground/70">
                  {it.badge}
                </span>
              )}
              {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)] shadow-[0_0_8px_var(--teal)]" />}
            </button>
          );
        })}
      </nav>
      <div className="absolute bottom-3 left-3 right-3 rounded-lg border border-sidebar-border bg-gradient-to-br from-sidebar-accent/60 to-transparent p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Engine Status</div>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--green)] opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--green)]" />
          </span>
          <span className="text-xs font-medium">Sims 4 · 1.108.318</span>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">S4PE bridge connected</div>
      </div>
    </aside>
  );
}
