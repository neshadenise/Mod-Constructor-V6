import { Bell, HelpCircle, Search, Moon, Sun, Save, ChevronRight, Wifi, WifiOff, RefreshCw, Cloud, Wrench, Command as CommandIcon } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/lib/theme";
import { useAdvanced } from "@/lib/advanced-mode";
import { useNotifications } from "@/lib/notifications";
import { SECTION_LABEL, type SectionId } from "./sections";
import { cn } from "@/lib/utils";
import { AccountMenu } from "./AccountMenu";
import { useStore, useActiveProject } from "@/lib/store";
import { useAppNavigation } from "@/lib/navigation";

function formatAgo(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

type Props = {
  active: SectionId;
  onOpenPalette: () => void;
};

export function TopBar({ active, onOpenPalette }: Props) {
  const { theme, toggle } = useTheme();
  const { advanced, toggle: toggleAdvanced } = useAdvanced();
  const { unread, setDrawerOpen, push } = useNotifications();
  const store = useStore();
  const project = useActiveProject();
  const { navigate } = useAppNavigation();
  const [online, setOnline] = useState(false);
  const [checking, setChecking] = useState(false);

  const busy = store.state.builds.some((b) => b.status === "running" || b.status === "queued");
  const savedAgo = project
    ? formatAgo(Date.now() - project.updatedAt)
    : "—";


  const checkUpdates = () => {
    if (checking) return;
    setChecking(true);
    setOnline(true);
    push({ kind: "update", title: "Contacting lot51.cc…", description: "Checking for framework updates." });
    setTimeout(() => {
      setChecking(false);
      push({
        kind: "success",
        title: "Up to date",
        description: "Lot51 Core Library v1.108.318 · no updates available.",
      });
    }, 1600);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/85 px-6 backdrop-blur-md">
      <div className="flex min-w-0 shrink items-center gap-2 overflow-hidden whitespace-nowrap text-sm">
        <button
          onClick={() => navigate("projects")}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          title="Back to Projects"
        >
          Projects
        </button>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className={cn("max-w-[200px] truncate font-semibold", !project && "text-muted-foreground")}>
          {project ? project.name : "No Active Project"}
        </span>
        <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground 2xl:inline" />
        <span className="hidden shrink-0 text-muted-foreground 2xl:inline">{SECTION_LABEL[active]}</span>
        <span
          className="ml-2 hidden shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium lg:inline-flex"
          style={{
            color: `var(--${busy ? "orange" : "green"})`,
            backgroundColor: `color-mix(in oklab, var(--${busy ? "orange" : "green"}) 12%, transparent)`,
            border: `1px solid color-mix(in oklab, var(--${busy ? "orange" : "green"}) 30%, transparent)`,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: `var(--${busy ? "orange" : "green"})` }}
          />
          {busy ? "Building" : project ? `v${project.version}` : "Idle"}
        </span>
        <span className="ml-1 hidden shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground 2xl:inline-flex">
          <Save className="h-3 w-3" /> Saved · {savedAgo}
        </span>
      </div>


      <div className="ml-auto flex shrink-0 items-center gap-2">
        <button
          onClick={() => {
            toggleAdvanced();
            push({
              kind: "info",
              title: advanced ? "Simple mode" : "Advanced mode enabled",
              description: advanced
                ? "Advanced tools and code fields are hidden."
                : "Tuning editor, XML output, and validation are now visible.",
            });
          }}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition-colors",
            advanced
              ? "border-[var(--orange)]/40 bg-[var(--orange)]/10 text-[var(--orange)]"
              : "border-border bg-card text-muted-foreground hover:bg-accent",
          )}
          title="Toggle advanced options"
        >
          <Wrench className="h-3.5 w-3.5" />
          <span className="hidden md:inline">{advanced ? "Advanced" : "Simple"}</span>
          <span
            className={cn(
              "relative h-3 w-6 rounded-full transition-colors",
              advanced ? "bg-[var(--orange)]" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-2 w-2 rounded-full bg-white transition-all",
                advanced ? "left-3.5" : "left-0.5",
              )}
            />
          </span>
        </button>

        <button
          onClick={onOpenPalette}
          className="group flex h-9 w-64 items-center gap-2 rounded-md border border-border bg-card px-2.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Open command palette and universal search"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 truncate">Search or run a command…</span>
          <kbd className="hidden shrink-0 items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline-flex">
            <CommandIcon className="h-2.5 w-2.5" />K
          </kbd>
        </button>

        <button
          onClick={checkUpdates}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium hover:bg-accent"
          title="Check lot51.cc for framework updates"
        >
          {online ? (
            <Wifi className="h-3.5 w-3.5 text-[var(--green)]" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <Cloud className="h-3.5 w-3.5 text-[var(--blue)]" />
          <span className="hidden md:inline">lot51</span>
          <RefreshCw className={"h-3 w-3 text-muted-foreground " + (checking ? "animate-spin" : "")} />
        </button>

        <button
          onClick={() => setDrawerOpen(true)}
          className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
          aria-label={`Notifications${unread ? ` · ${unread} unread` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--orange)] px-1 text-[9px] font-bold text-white">
              {unread}
            </span>
          )}
        </button>
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Help"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
        <button
          onClick={toggle}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground/80 transition-colors hover:bg-accent"
          aria-label="Toggle theme"
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
        <AccountMenu />
      </div>
    </header>
  );
}
