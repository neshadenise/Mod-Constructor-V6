import { Bell, HelpCircle, Moon, Search, Sun, CircleDot } from "lucide-react";
import { useTheme } from "@/lib/theme";

export function TopBar() {
  const { theme, toggle } = useTheme();
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-surface/80 px-5 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
        </span>
        <span className="text-xs font-semibold text-foreground">Project Status:</span>
        <span className="text-xs font-medium text-success">Active</span>
        <span className="mx-2 h-4 w-px bg-border" />
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CircleDot className="h-3 w-3" /> Autosaved 2m ago
        </span>
      </div>

      <div className="mx-auto w-full max-w-xl">
        <div className="group flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/40">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search projects, traits, careers, tunings…"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-background text-foreground transition hover:bg-muted hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring"
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-warning" />}
        </button>
        <button className="relative grid h-9 w-9 place-items-center rounded-lg border border-border bg-background transition hover:bg-muted">
          <Bell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
            3
          </span>
        </button>
        <button className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-background transition hover:bg-muted">
          <HelpCircle className="h-4 w-4" />
        </button>
        <div className="ml-2 flex items-center gap-2 rounded-lg border border-border bg-background py-1 pl-1 pr-3">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-violet to-primary text-[11px] font-bold text-primary-foreground">
            MC
          </div>
          <div className="hidden leading-tight sm:block">
            <div className="text-xs font-semibold">Mod Creator</div>
            <div className="text-[10px] text-muted-foreground">Pro tier</div>
          </div>
        </div>
      </div>
    </header>
  );
}
