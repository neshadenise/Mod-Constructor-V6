import { useMemo, useState } from "react";
import {
  ShieldCheck,
  Play,
  RefreshCw,
  Filter,
  Search,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Info,
  Wand2,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Severity = "error" | "warning" | "info" | "ok";
type Scope = "Career" | "Trait" | "Aspiration" | "Assets" | "Package";

type Finding = {
  id: string;
  severity: Severity;
  scope: Scope;
  project: string;
  location: string;
  rule: string;
  message: string;
  fixable?: boolean;
};

const INITIAL: Finding[] = [
  {
    id: "f1",
    severity: "error",
    scope: "Career",
    project: "Epic Careers Overhaul",
    location: "Marine Biologist › Level 4 › salary",
    rule: "REQUIRED_FIELD",
    message: "Salary per hour is missing on rank 4. Career cannot promote past level 3.",
    fixable: true,
  },
  {
    id: "f2",
    severity: "error",
    scope: "Trait",
    project: "Lucid Dreamer Traits",
    location: "Dreamweaver › buffs[2].emotion",
    rule: "INVALID_ENUM",
    message: "Emotion 'Whimsy' is not a valid Sims 4 emotion value.",
    fixable: true,
  },
  {
    id: "f3",
    severity: "warning",
    scope: "Career",
    project: "Epic Careers Overhaul",
    location: "Reef Guardian › work_days",
    rule: "SCHEDULE_GAP",
    message: "Weekly schedule has 6 shifts under 4 hours. Sims may not accumulate promotion progress.",
    fixable: false,
  },
  {
    id: "f4",
    severity: "warning",
    scope: "Assets",
    project: "Lucid Dreamer Traits",
    location: "Traits/Portraits/dreamer_portrait.png",
    rule: "LARGE_ASSET",
    message: "Portrait is 128 KB. Recommended max is 96 KB for CAS thumbnails.",
    fixable: true,
  },
  {
    id: "f5",
    severity: "info",
    scope: "Package",
    project: "Trailblazer Aspirations",
    location: "manifest.json",
    rule: "STYLE",
    message: "Package name uses spaces. Consider snake_case for cross-platform paths.",
  },
  {
    id: "f6",
    severity: "ok",
    scope: "Career",
    project: "Epic Careers Overhaul",
    location: "Marine Biologist › identity",
    rule: "ALL_CLEAR",
    message: "All identity fields validated against V5 schema.",
  },
  {
    id: "f7",
    severity: "warning",
    scope: "Trait",
    project: "Lucid Dreamer Traits",
    location: "Sleepwalker › conflicts",
    rule: "REDUNDANT_CONFLICT",
    message: "Conflict list contains 'Insomniac' twice.",
    fixable: true,
  },
  {
    id: "f8",
    severity: "error",
    scope: "Assets",
    project: "Epic Careers Overhaul",
    location: "Careers/Uniforms/diver_uniform_m.png",
    rule: "MISSING_REF",
    message: "Uniform referenced by rank 3 but file is missing from asset folder.",
    fixable: false,
  },
];

const SEV_META: Record<Severity, { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string; label: string }> = {
  error: { icon: XCircle, color: "var(--red)", label: "Error" },
  warning: { icon: AlertTriangle, color: "var(--orange)", label: "Warning" },
  info: { icon: Info, color: "var(--blue)", label: "Info" },
  ok: { icon: CheckCircle2, color: "var(--green)", label: "OK" },
};

const SEV_FILTERS: (Severity | "all")[] = ["all", "error", "warning", "info", "ok"];

export function ValidationCenter() {
  const [findings, setFindings] = useState<Finding[]>(INITIAL);
  const [sev, setSev] = useState<(typeof SEV_FILTERS)[number]>("all");
  const [scope, setScope] = useState<"All" | Scope>("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>("f1");
  const [running, setRunning] = useState(false);

  const totals = useMemo(() => {
    const t = { error: 0, warning: 0, info: 0, ok: 0 };
    findings.forEach((f) => (t[f.severity] += 1));
    return t;
  }, [findings]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return findings.filter((f) => {
      if (sev !== "all" && f.severity !== sev) return false;
      if (scope !== "All" && f.scope !== scope) return false;
      if (!q) return true;
      return (
        f.message.toLowerCase().includes(q) ||
        f.rule.toLowerCase().includes(q) ||
        f.location.toLowerCase().includes(q) ||
        f.project.toLowerCase().includes(q)
      );
    });
  }, [findings, sev, scope, query]);

  const active = findings.find((f) => f.id === selected) ?? shown[0] ?? null;

  const runScan = () => {
    setRunning(true);
    toast("Running validation across workspace...");
    setTimeout(() => {
      setRunning(false);
      toast.success("Validation complete", {
        description: `${totals.error} errors · ${totals.warning} warnings · ${totals.ok} passed`,
      });
    }, 1400);
  };

  const applyFix = (id: string) => {
    setFindings((s) =>
      s.map((f) => (f.id === id ? { ...f, severity: "ok", message: "Auto-fix applied. " + f.message } : f)),
    );
    toast.success("Auto-fix applied");
  };

  const fixAll = () => {
    setFindings((s) =>
      s.map((f) =>
        f.fixable && (f.severity === "error" || f.severity === "warning")
          ? { ...f, severity: "ok", message: "Auto-fix applied. " + f.message }
          : f,
      ),
    );
    toast.success("All auto-fixes applied");
  };

  const scopes: ("All" | Scope)[] = ["All", "Career", "Trait", "Aspiration", "Assets", "Package"];
  const total = findings.length;
  const health = Math.round((totals.ok / Math.max(total, 1)) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--green)] text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Quality
            </div>
            <h1 className="text-xl font-bold tracking-tight">Validation Center</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fixAll}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            <Wand2 className="h-3.5 w-3.5" /> Fix All
          </button>
          <button
            onClick={runScan}
            disabled={running}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--green)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
          >
            {running ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {running ? "Scanning..." : "Run Full Scan"}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { k: "Health", v: `${health}%`, c: "var(--green)" },
          { k: "Errors", v: totals.error, c: "var(--red)" },
          { k: "Warnings", v: totals.warning, c: "var(--orange)" },
          { k: "Info", v: totals.info, c: "var(--blue)" },
          { k: "Passed", v: totals.ok, c: "var(--green)" },
        ].map((s) => (
          <div
            key={s.k}
            className="rounded-xl border border-border bg-card p-3 card-elevated"
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {s.k}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-2xl font-bold tabular-nums" style={{ color: s.c }}>
                {s.v}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Findings list */}
        <section className="col-span-12 rounded-xl border border-border bg-card p-4 card-elevated lg:col-span-7">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search rules, messages..."
                className="h-8 pl-7 text-xs"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {SEV_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSev(s)}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize transition-colors",
                    sev === s
                      ? "border-foreground/60 bg-accent text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-accent",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-1">
            <Filter className="mr-1 h-3 w-3 text-muted-foreground" />
            {scopes.map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors",
                  scope === s
                    ? "border-[var(--blue)] bg-[var(--blue)]/10 text-[var(--blue)]"
                    : "border-border bg-background text-muted-foreground hover:bg-accent",
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="max-h-[560px] space-y-1 overflow-y-auto pr-1">
            {shown.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                No findings match these filters.
              </div>
            ) : (
              shown.map((f) => {
                const meta = SEV_META[f.severity];
                const Icon = meta.icon;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelected(f.id)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-md border p-2.5 text-left transition-all",
                      selected === f.id
                        ? "border-[var(--blue)]/60 bg-[var(--blue)]/5"
                        : "border-border/70 bg-background/40 hover:border-border hover:bg-accent/50",
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: meta.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-background px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-muted-foreground">
                          {f.rule}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{f.scope}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="truncate text-[10px] text-muted-foreground">{f.project}</span>
                      </div>
                      <div className="mt-0.5 truncate text-xs font-medium">{f.message}</div>
                      <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                        {f.location}
                      </div>
                    </div>
                    <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Detail */}
        <aside className="col-span-12 rounded-xl border border-border bg-card p-5 card-elevated lg:col-span-5">
          {!active ? (
            <div className="text-xs text-muted-foreground">Select a finding to inspect it.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                {(() => {
                  const meta = SEV_META[active.severity];
                  const Icon = meta.icon;
                  return (
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-sm"
                      style={{ backgroundColor: meta.color }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  );
                })()}
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {SEV_META[active.severity].label} · {active.scope}
                  </div>
                  <div className="text-sm font-bold">{active.rule}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{active.project}</div>
                </div>
              </div>

              <p className="text-sm">{active.message}</p>

              <div className="rounded-md border border-border bg-background/60 p-3 font-mono text-[11px]">
                {active.location}
              </div>

              <div className="flex flex-wrap gap-2">
                {active.fixable && active.severity !== "ok" && (
                  <button
                    onClick={() => applyFix(active.id)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[var(--blue)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
                  >
                    <Wand2 className="h-3.5 w-3.5" /> Apply Auto-fix
                  </button>
                )}
                <button
                  onClick={() => toast("Opening in builder...")}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  Open in Builder
                </button>
                <button
                  onClick={() => {
                    setFindings((s) => s.filter((x) => x.id !== active.id));
                    toast("Finding dismissed");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
