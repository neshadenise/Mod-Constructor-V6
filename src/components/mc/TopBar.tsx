import { Bell, HelpCircle, Search, Moon, Sun, Save, ChevronRight, Wifi, WifiOff, RefreshCw, Cloud, Wrench } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";
import { useAdvanced } from "@/lib/advanced-mode";
import { Input } from "@/components/ui/input";
import { SECTION_LABEL, type SectionId } from "./sections";
import { cn } from "@/lib/utils";

export function TopBar({ active }: { active: SectionId }) {
  const { theme, toggle } = useTheme();
  const { advanced, toggle: toggleAdvanced } = useAdvanced();
  const [online, setOnline] = useState(false);
  const [checking, setChecking] = useState(false);

  const checkUpdates = () => {
    if (checking) return;
    setChecking(true);
    setOnline(true);
    toast.message("Contacting lot51.cc…", { description: "Checking for framework updates." });
    setTimeout(() => {
      setChecking(false);
      toast.success("Up to date", {
        description: "Lot51 Core Library v1.108.318 · no updates available.",
      });
    }, 1600);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/85 px-6 backdrop-blur-md">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{SECTION_LABEL[active]}</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-semibold">Epic Careers Overhaul</span>
        <span className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--green)]/30 bg-[var(--green)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--green)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" /> Building
        </span>
        <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          <Save className="h-3 w-3" /> Autosaved · 12s ago
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => {
            toggleAdvanced();
            toast(advanced ? "Simple mode" : "Advanced mode enabled", {
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

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search mods, traits, careers…"
            className="h-9 w-56 pl-8 text-xs"
          />
        </div>

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

        <IconBtn>
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--orange)]" />
        </IconBtn>
        <IconBtn>
          <HelpCircle className="h-4 w-4" />
        </IconBtn>
        <button
          onClick={toggle}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground/80 transition-colors hover:bg-accent"
          aria-label="Toggle theme"
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
        <div className="ml-1 flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[var(--violet)] to-[var(--blue)] text-[10px] font-bold text-white">
            AK
          </div>
          <div className="text-xs leading-tight">
            <div className="font-semibold">Alex Kern</div>
            <div className="text-[10px] text-muted-foreground">Lead Modder</div>
          </div>
        </div>
      </div>
    </header>
  );
}

function IconBtn({ children }: { children: React.ReactNode }) {
  return (
    <button className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground/70 transition-colors hover:bg-accent hover:text-foreground">
      {children}
    </button>
  );
}
