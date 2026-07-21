import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Monitor,
  Moon,
  Sun,
  RefreshCw,
  RotateCcw,
  ExternalLink,
  GripVertical,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** Preview theme is INDEPENDENT of the app theme — it simulates in-game skin */
export type PreviewTheme = "light" | "dark";
export type DeviceScale = 100 | 125 | 150;
export type Scenario =
  | "new-save"
  | "teen"
  | "young-adult"
  | "level-1"
  | "level-5"
  | "max-career"
  | "excellent"
  | "poor"
  | "vacation"
  | "promotion-day"
  | "retirement";

export const SCENARIOS: { id: Scenario; label: string; group: string }[] = [
  { id: "new-save", label: "New Save", group: "Save State" },
  { id: "teen", label: "Teen Sim", group: "Life Stage" },
  { id: "young-adult", label: "Young Adult", group: "Life Stage" },
  { id: "level-1", label: "Level 1", group: "Progression" },
  { id: "level-5", label: "Level 5", group: "Progression" },
  { id: "max-career", label: "Max Career", group: "Progression" },
  { id: "excellent", label: "Excellent Performance", group: "Performance" },
  { id: "poor", label: "Poor Performance", group: "Performance" },
  { id: "vacation", label: "Vacation Day", group: "Event" },
  { id: "promotion-day", label: "Promotion Day", group: "Event" },
  { id: "retirement", label: "Retirement", group: "Event" },
];

export type PreviewToolbarState = {
  previewType: string;
  setPreviewType: (v: string) => void;
  scale: DeviceScale;
  setScale: (v: DeviceScale) => void;
  theme: PreviewTheme;
  setTheme: (v: PreviewTheme) => void;
  scenario: Scenario;
  setScenario: (v: Scenario) => void;
  nonce: number;
  refresh: () => void;
  reset: () => void;
};

export function usePreviewToolbar(defaults: {
  previewType: string;
  types: string[];
}): PreviewToolbarState & { types: string[] } {
  const [previewType, setPreviewType] = useState(defaults.previewType);
  const [scale, setScale] = useState<DeviceScale>(100);
  const [theme, setTheme] = useState<PreviewTheme>("light");
  const [scenario, setScenario] = useState<Scenario>("young-adult");
  const [nonce, setNonce] = useState(0);
  return {
    previewType,
    setPreviewType,
    scale,
    setScale,
    theme,
    setTheme,
    scenario,
    setScenario,
    nonce,
    refresh: () => {
      setNonce((n) => n + 1);
      toast("Preview refreshed");
    },
    reset: () => {
      setScale(100);
      setTheme("light");
      setScenario("young-adult");
      setPreviewType(defaults.previewType);
      setNonce((n) => n + 1);
      toast("Preview reset to defaults");
    },
    types: defaults.types,
  };
}

/** Split-panel layout: editor on the left, sticky live-preview on the right, drag divider */
export function PreviewSplit({
  editor,
  preview,
  minLeftPct = 30,
  minRightPct = 25,
  initialLeftPct = 55,
}: {
  editor: ReactNode;
  preview: ReactNode;
  minLeftPct?: number;
  minRightPct?: number;
  initialLeftPct?: number;
}) {
  const [leftPct, setLeftPct] = useState(initialLeftPct);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current || !wrapRef.current) return;
      const rect = wrapRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(minLeftPct, Math.min(100 - minRightPct, pct));
      setLeftPct(clamped);
    }
    function onUp() {
      if (dragging.current) {
        dragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [minLeftPct, minRightPct]);

  return (
    <div ref={wrapRef} className="flex w-full gap-0" style={{ minHeight: "calc(100vh - 220px)" }}>
      <div className="min-w-0 pr-4" style={{ width: `${leftPct}%` }}>
        {editor}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize preview panel"
        tabIndex={0}
        onMouseDown={(e) => {
          e.preventDefault();
          dragging.current = true;
          document.body.style.cursor = "col-resize";
          document.body.style.userSelect = "none";
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setLeftPct((p) => Math.max(minLeftPct, p - 2));
          if (e.key === "ArrowRight") setLeftPct((p) => Math.min(100 - minRightPct, p + 2));
        }}
        className="group relative -mx-1 flex w-2 shrink-0 cursor-col-resize items-center justify-center outline-none"
      >
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-colors group-hover:bg-[var(--blue)]/60 group-focus:bg-[var(--blue)]" />
        <GripVertical className="relative h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-[var(--blue)]" />
      </div>
      <div className="min-w-0 pl-4" style={{ width: `${100 - leftPct}%` }}>
        <div className="sticky top-4">{preview}</div>
      </div>
    </div>
  );
}

/** Toolbar rendered above the preview surface */
export function PreviewToolbar({
  state,
  accent = "blue",
  title = "Live Preview",
}: {
  state: PreviewToolbarState & { types: string[] };
  accent?: string;
  title?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-t-xl border border-b-0 border-border bg-card/80 px-2.5 py-2 backdrop-blur">
      <div className="mr-2 flex items-center gap-1.5">
        <span
          className="flex h-5 w-5 items-center justify-center rounded-md text-white shadow-sm"
          style={{ backgroundColor: `var(--${accent})` }}
        >
          <Sparkles className="h-3 w-3" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
      </div>

      <ToolbarSelect
        label="Preview"
        value={state.previewType}
        onChange={state.setPreviewType}
        options={state.types.map((t) => ({ value: t, label: t }))}
      />

      <ToolbarSelect
        label="Scenario"
        value={state.scenario}
        onChange={(v) => state.setScenario(v as Scenario)}
        options={SCENARIOS.map((s) => ({ value: s.id, label: s.label }))}
      />

      <div className="ml-auto flex items-center gap-1.5">
        <ToolbarSelect
          label="Scale"
          value={String(state.scale)}
          onChange={(v) => state.setScale(Number(v) as DeviceScale)}
          options={[
            { value: "100", label: "100%" },
            { value: "125", label: "125%" },
            { value: "150", label: "150%" },
          ]}
        />
        <div className="flex overflow-hidden rounded-md border border-border">
          <ThemeBtn active={state.theme === "light"} onClick={() => state.setTheme("light")} icon={Sun} label="Light" />
          <ThemeBtn active={state.theme === "dark"} onClick={() => state.setTheme("dark")} icon={Moon} label="Dark" />
        </div>
        <IconBtn onClick={state.refresh} title="Refresh preview">
          <RefreshCw className="h-3.5 w-3.5" />
        </IconBtn>
        <IconBtn onClick={state.reset} title="Reset preview">
          <RotateCcw className="h-3.5 w-3.5" />
        </IconBtn>
        <IconBtn onClick={() => toast("Detached preview window (simulated)")} title="Detach preview">
          <ExternalLink className="h-3.5 w-3.5" />
        </IconBtn>
      </div>
    </div>
  );
}

/** Frame that hosts the preview at the chosen scale + theme */
export function PreviewSurface({
  state,
  children,
}: {
  state: PreviewToolbarState;
  children: ReactNode;
}) {
  const bg =
    state.theme === "dark"
      ? "bg-[oklch(0.22_0.04_260)] text-white"
      : "bg-[oklch(0.98_0.01_230)] text-[oklch(0.22_0.04_260)]";
  return (
    <div className="rounded-b-xl border border-t-0 border-border bg-muted/30 p-4">
      <div className="flex justify-center overflow-auto">
        <div
          key={state.nonce}
          data-preview-theme={state.theme}
          className={cn(
            "preview-canvas relative w-full max-w-[560px] origin-top rounded-2xl border border-black/5 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] transition-all",
            bg,
          )}
          style={{
            transform: `scale(${state.scale / 100})`,
            transformOrigin: "top center",
            marginBottom: state.scale > 100 ? `${(state.scale - 100) * 6}px` : undefined,
          }}
        >
          <div className="flex items-center justify-between rounded-t-2xl border-b border-black/5 bg-black/[0.03] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-70">
            <span className="flex items-center gap-1.5">
              <Monitor className="h-3 w-3" /> In-Game Preview
            </span>
            <span>{state.scale}% · {state.theme}</span>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* --------- Toolbar primitives --------- */
function ToolbarSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-1.5 rounded-md border border-border bg-background px-1.5 py-1 text-[10.5px]">
      <span className="font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-[11px] font-medium outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ThemeBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-1 px-2 py-1 text-[10.5px] font-semibold transition-colors",
        active ? "bg-[var(--blue)]/12 text-[var(--blue)]" : "text-muted-foreground hover:bg-accent",
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

function IconBtn({
  onClick,
  children,
  title,
}: {
  onClick: () => void;
  children: ReactNode;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}
