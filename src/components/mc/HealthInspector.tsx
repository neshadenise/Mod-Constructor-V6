/**
 * Project Health UI.
 *
 * - `useHealthReport()` — live weighted health for the active project.
 * - `ProjectHealthCard` — the dashboard breakdown card.
 * - `HealthInspectorHost` — the global Health Report dialog (mounted once).
 * - `openHealthInspector()` — open it from anywhere (sidebar, palette).
 *
 * Every finding is clickable and navigates straight to the thing to fix.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowRight, CheckCircle2, FlaskConical, FolderTree,
  Languages, Lightbulb, Package, Puzzle, XCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore, useActiveProject } from "@/lib/store";
import { analyzeProject, scopeProject } from "@/lib/project-analysis";
import {
  computeProjectHealth, emptyHealthReport,
  type HealthFinding, type HealthReport,
} from "@/lib/project-health";
import { useAppNavigation } from "@/lib/navigation";
import { requestRevealRecord } from "@/lib/builder-record";
import { cn } from "@/lib/utils";

/* ------------------------------- data ---------------------------------- */

export function useHealthReport(): HealthReport {
  const store = useStore();
  const project = useActiveProject();
  const scope = useMemo(
    () => scopeProject(store.state, project?.id),
    [store.state, project?.id],
  );
  return useMemo(() => {
    if (!scope) return emptyHealthReport();
    const report = computeProjectHealth({
      scope,
      issues: analyzeProject(scope),
      builds: store.state.builds,
    });
    // The analyzer and the health rules can describe the same problem twice.
    const seen = new Set<string>();
    report.findings = report.findings.filter((f) => {
      const key = f.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return report;
  }, [scope, store.state.builds]);
}

/* ----------------------------- global open ------------------------------ */

const OPEN_EVENT = "mc:open-health-inspector";

export function openHealthInspector() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/* ------------------------------- pieces --------------------------------- */

function GradeDot({ report }: { report: HealthReport }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ background: report.color }}
      aria-hidden
    />
  );
}

const READOUT_ICONS = {
  errors: XCircle,
  warnings: AlertTriangle,
  assets: Package,
  compatibility: Puzzle,
  testing: FlaskConical,
  localization: Languages,
  organization: FolderTree,
} as const;

/** The "Project Health" breakdown card. Clicking it opens the Health Report. */
export function ProjectHealthCard({ className }: { className?: string }) {
  const report = useHealthReport();
  const project = useActiveProject();
  const r = report.readouts;

  const rows: { key: keyof typeof READOUT_ICONS; label: string; value: string; tone?: string }[] = [
    { key: "errors", label: "Errors", value: String(r.errors), tone: r.errors ? "var(--red, #ef4444)" : "var(--green)" },
    { key: "warnings", label: "Warnings", value: String(r.warnings), tone: r.warnings ? "var(--orange)" : "var(--green)" },
    { key: "assets", label: "Assets", value: `${r.assetsPct}%` },
    { key: "compatibility", label: "Compatibility", value: `${r.compatibilityPct}%` },
    { key: "testing", label: "Testing", value: r.testing === "passed" ? "Passed" : r.testing === "failed" ? "Failed" : "Untested",
      tone: r.testing === "passed" ? "var(--green)" : r.testing === "failed" ? "var(--red, #ef4444)" : undefined },
    { key: "localization", label: "Localization", value: `${r.localizationPct}%` },
    { key: "organization", label: "Organization", value: r.organization },
  ];

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 card-elevated", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Project Health
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums" style={{ color: report.color }}>
              {report.score}
              <span className="text-base font-semibold">%</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: report.color }}>
              <GradeDot report={report} />
              {report.gradeLabel}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {project
              ? report.exportSafe
                ? "Nothing blocks an export right now."
                : `${report.counts.critical} issue${report.counts.critical === 1 ? "" : "s"} would break this package.`
              : "Select a project to score it."}
          </p>
        </div>
        <Activity className="h-4 w-4 shrink-0" style={{ color: report.color }} />
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full transition-all" style={{ width: `${report.score}%`, background: report.color }} />
      </div>

      <div className="mt-3 space-y-1.5">
        {rows.map((row) => {
          const Icon = READOUT_ICONS[row.key];
          return (
            <div key={row.key} className="flex items-center gap-2 text-[11px]">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{row.label}</span>
              <span className="ml-auto font-semibold tabular-nums" style={{ color: row.tone }}>
                {row.value}
              </span>
            </div>
          );
        })}
      </div>

      <button
        onClick={openHealthInspector}
        disabled={!project}
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
      >
        Open Health Report <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ------------------------------ inspector -------------------------------- */

const GROUPS = [
  { severity: "critical" as const, label: "Critical", icon: XCircle, color: "var(--red, #ef4444)",
    blurb: "These stop the package from loading or working correctly." },
  { severity: "warning" as const, label: "Warnings", icon: AlertTriangle, color: "var(--orange)",
    blurb: "Worth fixing before release, but the mod will still load." },
  { severity: "suggestion" as const, label: "Suggestions", icon: Lightbulb, color: "var(--blue)",
    blurb: "Optional polish. These barely affect your score." },
];

function FindingRow({ finding, onGo }: { finding: HealthFinding; onGo: (f: HealthFinding) => void }) {
  return (
    <button
      onClick={() => onGo(finding)}
      className="group flex w-full items-start gap-2 rounded-md border border-transparent px-2 py-1.5 text-left hover:border-border hover:bg-accent"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">{finding.title}</div>
        {finding.fix && (
          <div className="mt-0.5 text-[11px] text-muted-foreground">{finding.fix}</div>
        )}
      </div>
      <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

export function HealthInspectorHost() {
  const [open, setOpen] = useState(false);
  const report = useHealthReport();
  const { navigate } = useAppNavigation();

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, []);

  const go = useCallback(
    (f: HealthFinding) => {
      setOpen(false);
      navigate(f.section);
      if (f.record) requestRevealRecord(f.record.kind, f.record.id);
    },
    [navigate],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            Health Report
            <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: report.color }}>
              <GradeDot report={report} />
              {report.score}% · {report.gradeLabel}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {report.categories.map((c) => (
            <div key={c.id} className="rounded-md border border-border bg-muted/30 p-2" title={c.measures}>
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>{c.label}</span>
                <span className="tabular-nums">{Math.round(c.weight * 100)}%</span>
              </div>
              <div className="mt-0.5 text-sm font-bold tabular-nums">{c.score}</div>
              <div className="truncate text-[10px] text-muted-foreground">{c.summary}</div>
            </div>
          ))}
        </div>

        <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
          {GROUPS.map((g) => {
            const items = report.findings.filter((f) => f.severity === g.severity);
            if (!items.length) return null;
            const Icon = g.icon;
            return (
              <section key={g.severity}>
                <div className="flex items-center gap-1.5 border-b border-border pb-1">
                  <Icon className="h-3.5 w-3.5" style={{ color: g.color }} />
                  <span className="text-xs font-semibold" style={{ color: g.color }}>
                    {g.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">· {items.length}</span>
                  <span className="ml-auto hidden text-[10px] text-muted-foreground sm:block">{g.blurb}</span>
                </div>
                <div className="mt-1 space-y-0.5">
                  {items.map((f) => (
                    <FindingRow key={f.id} finding={f} onGo={go} />
                  ))}
                </div>
              </section>
            );
          })}

          {report.findings.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CheckCircle2 className="h-6 w-6" style={{ color: "var(--green)" }} />
              <p className="text-sm font-medium">Nothing to fix</p>
              <p className="text-[11px] text-muted-foreground">
                No errors, no missing resources, and the last export verified.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
