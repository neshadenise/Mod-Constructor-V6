import { useState } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  Briefcase,
  Sparkles,
  Target,
  SlidersHorizontal,
  Package,
  ShieldCheck,
  ListChecks,
  Settings,
  HardDrive,
  Boxes,
} from "lucide-react";

const nav = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Projects", icon: FolderKanban },
  { label: "Career Builder", icon: Briefcase },
  { label: "Trait Builder", icon: Sparkles },
  { label: "Aspiration Builder", icon: Target },
  { label: "Tuning", icon: SlidersHorizontal },
  { label: "Assets", icon: Package },
  { label: "Validation", icon: ShieldCheck },
  { label: "Build Queue", icon: ListChecks },
  { label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const [active, setActive] = useState("Dashboard");


  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-info text-primary-foreground shadow-lg shadow-primary/20">
          <Boxes className="h-5 w-5" strokeWidth={2.4} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-tight">Mod Constructor</div>
          <div className="text-[11px] font-medium text-muted-foreground">Version 6 · Desktop</div>
        </div>
      </div>

      <div className="mx-4 mb-2 h-px bg-border" />

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4 scroll-thin">
        <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Workspace
        </div>
        {nav.map((item) => {
          const isActive = active === item.label;
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => setActive(item.label)}
              className={[
                "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium outline-none transition",
                "focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-primary-soft text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              ].join(" ")}
            >
              <Icon
                className={[
                  "h-4 w-4 shrink-0 transition",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                ].join(" ")}
                strokeWidth={2}
              />
              <span className="truncate">{item.label}</span>
              {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </nav>

      {/* Storage card */}
      <div className="m-3 rounded-xl border border-border bg-gradient-to-b from-surface to-surface-2 p-4">
        <div className="flex items-center gap-2 text-xs font-medium">
          <HardDrive className="h-3.5 w-3.5 text-primary" />
          Workspace Storage
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-sm font-semibold">152.4 GB</span>
          <span className="text-[11px] text-muted-foreground">of 500 GB</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-info"
            style={{ width: "30.5%" }}
          />
        </div>
        <button className="mt-3 w-full rounded-md bg-foreground py-1.5 text-[11px] font-semibold text-background transition hover:opacity-90">
          Upgrade Plan
        </button>
        <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>v6.0.0</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-1.5 py-0.5 font-medium text-info">
            <span className="h-1 w-1 rounded-full bg-info" /> What's New
          </span>
        </div>
      </div>
    </aside>
  );
}
