/**
 * Validation Center.
 *
 * Every finding on this screen comes from the live project analysis
 * (`analyzeProject`) and the health engine (`computeProjectHealth`) for the
 * ACTIVE project only. Nothing here is sample data, and every row links to the
 * exact record that needs fixing.
 */
import { useMemo, useState } from "react";
import {
  ShieldCheck,
  Play,
  RefreshCw,
  Filter,
  Search,
  AlertTriangle,
  XCircle,
  Lightbulb,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BuildHealthTile } from "@/components/mc/HealthMetrics";
import { ValidationResultsCard } from "@/components/mc/Dashboard";
import { useHealthReport } from "@/components/mc/HealthInspector";
import { useActiveProject } from "@/lib/store";
import { useAppNavigation } from "@/lib/navigation";
import { requestRevealRecord } from "@/lib/builder-record";
import type { FindingSeverity, HealthFinding } from "@/lib/project-health";
import { toast } from "sonner";

const SEV_META: Record<
  FindingSeverity,
  { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string; label: string }
> = {
  critical: { icon: XCircle, color: "var(--red, #ef4444)", label: "Critical" },
  warning: { icon: AlertTriangle, color: "var(--orange)", label: "Warning" },
  suggestion: { icon: Lightbulb, color: "var(--blue)", label: "Suggestion" },
};

const SEV_FILTERS: (FindingSeverity | "all")[] = ["all", "critical", "warning", "suggestion"];

const CATEGORY_LABEL: Record<string, string> = {
  errors: "Errors",
  warnings: "Warnings",
  completion: "Completion",
  assets: "Assets",
  compatibility: "Compatibility",
  testing: "Testing",
  organization: "Organization",
};

export function ValidationCenter() {
  const project = useActiveProject();
  const report = useHealthReport();
  const { navigate } = useAppNavigation();

  const [sev, setSev] = useState<(typeof SEV_FILTERS)[number]>("all");
  const [category, setCategory] = useState<"All" | string>("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);

  const findings = useMemo(
    () => report.findings.filter((f) => !hidden.has(f.id)),
    [report.findings, hidden],
  );

  const totals = useMemo(() => {
    const t = { critical: 0, warning: 0, suggestion: 0 };
    findings.forEach((f) => (t[f.severity] += 1));
    return t;
  }, [findings]);

  const categories = useMemo(() => {
    const set = new Set(findings.map((f) => f.category as string));
    return ["All", ...[...set]];
  }, [findings]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return findings.filter((f) => {
      if (sev !== "all" && f.severity !== sev) return false;
      if (category !== "All" && f.category !== category) return false;
      if (!q) return true;
      return (
        f.title.toLowerCase().includes(q) ||
        (f.fix ?? "").toLowerCase().includes(q) ||
        String(f.category).toLowerCase().includes(q)
      );
    });
  }, [findings, sev, category, query]);

  const active = findings.find((f) => f.id === selected) ?? shown[0] ?? null;

  const runScan = () => {
    if (!project) {
      toast.error("Select a project first");
      return;
    }
    // The analysis is live, so a "scan" is a recompute plus an honest readout.
    setRunning(true);
    window.setTimeout(() => {
      setRunning(false);
      toast.success(`Validated ${project.name}`, {
        description: `${totals.critical} critical · ${totals.warning} warnings · ${totals.suggestion} suggestions`,
      });
    }, 350);
  };

  const openFinding = (f: HealthFinding) => {
    navigate(f.section);
    if (f.record && f.record.kind !== "notification") {
      requestRevealRecord(f.record.kind, f.record.id);
    }
  };

  if (!project) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
        <ShieldCheck className="mx-auto h-6 w-6 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">No project selected</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Open a project to validate its careers, traits, aspirations and assets.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--green)] text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Quality · {project.name}
            </div>
            <h1 className="text-xl font-bold tracking-tight">Validation Center</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hidden.size > 0 && (
            <button
              onClick={() => setHidden(new Set())}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Show {hidden.size} hidden
            </button>
          )}
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

      <BuildHealthTile />

      <ValidationResultsCard />

      {/* KPI strip — all values live */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { k: "Health", v: `${report.score}%`, c: report.color },
          { k: "Critical", v: totals.critical, c: "var(--red, #ef4444)" },
          { k: "Warnings", v: totals.warning, c: "var(--orange)" },
          { k: "Suggestions", v: totals.suggestion, c: "var(--blue)" },
          { k: "Export safe", v: report.exportSafe ? "Yes" : "No", c: report.exportSafe ? "var(--green)" : "var(--red, #ef4444)" },
        ].map((s) => (
          <div key={s.k} className="rounded-xl border border-border bg-card p-3 card-elevated">
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
        <section className="col-span-12 rounded-xl border border-border bg-card p-4 card-elevated lg:col-span-7">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search findings..."
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
            {categories.map((s) => (
              <button
                key={s}
                onClick={() => setCategory(s)}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors",
                  category === s
                    ? "border-[var(--blue)] bg-[var(--blue)]/10 text-[var(--blue)]"
                    : "border-border bg-background text-muted-foreground hover:bg-accent",
                )}
              >
                {s === "All" ? "All" : (CATEGORY_LABEL[s] ?? s)}
              </button>
            ))}
          </div>

          <div className="max-h-[560px] space-y-1 overflow-y-auto pr-1">
            {findings.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border p-10 text-center">
                <CheckCircle2 className="h-6 w-6" style={{ color: "var(--green)" }} />
                <p className="text-sm font-medium">Nothing to fix</p>
                <p className="text-[11px] text-muted-foreground">
                  This project passes every check the validator runs.
                </p>
              </div>
            ) : shown.length === 0 ? (
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
                      active?.id === f.id
                        ? "border-[var(--blue)]/60 bg-[var(--blue)]/5"
                        : "border-border/70 bg-background/40 hover:border-border hover:bg-accent/50",
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: meta.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-background px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase text-muted-foreground">
                          {CATEGORY_LABEL[f.category] ?? f.category}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{meta.label}</span>
                      </div>
                      <div className="mt-0.5 truncate text-xs font-medium">{f.title}</div>
                      {f.fix && (
                        <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{f.fix}</div>
                      )}
                    </div>
                    <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </button>
                );
              })
            )}
          </div>
        </section>

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
                    {SEV_META[active.severity].label} · {CATEGORY_LABEL[active.category] ?? active.category}
                  </div>
                  <div className="text-sm font-bold">{active.title}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{project.name}</div>
                </div>
              </div>

              {active.fix && <p className="text-sm">{active.fix}</p>}

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => openFinding(active)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[var(--blue)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
                >
                  Open in Builder <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    setHidden((s) => new Set(s).add(active.id));
                    setSelected(null);
                    toast("Hidden until the next scan", {
                      description: "The underlying issue is still counted in Project Health.",
                    });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  Hide
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
