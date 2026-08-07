/**
 * Build Analytics — derived entirely from the active project.
 *
 * Sources: the build queue (`state.builds`), the persisted export history, and
 * live completeness/health computed from the project's records. No mock rows.
 */

import { useMemo } from "react";
import { BarChart3, Timer, CheckCircle2, XCircle, Package, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { analyzeProject, computeHealth, scopeProject } from "@/lib/project-analysis";
import { listExportHistory } from "@/lib/modexport/history";
import type { BuildJob } from "@/lib/types";

const DAY_MS = 86_400_000;

interface Run {
  label: string;
  at: number;
  durationMs?: number;
  ok: boolean;
  detail: string;
}

function fmtDuration(ms?: number) {
  if (!ms || ms <= 0) return "—";
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

function fmtWhen(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < DAY_MS) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 2 * DAY_MS) return "yesterday";
  return new Date(ts).toLocaleDateString();
}

function buildRun(b: BuildJob): Run {
  const duration = b.startedAt && b.finishedAt ? b.finishedAt - b.startedAt : undefined;
  return {
    label: b.label,
    at: b.finishedAt ?? b.startedAt ?? 0,
    ...(duration !== undefined ? { durationMs: duration } : {}),
    ok: b.status === "success",
    detail: b.error ? b.error : `Build · ${b.status}`,
  };
}

export function BuildAnalytics() {
  const store = useStore();
  const project = store.state.projects.find((p) => p.id === store.state.activeProjectId);

  const scope = useMemo(
    () => scopeProject(store.state, project?.id),
    [store.state, project?.id],
  );
  const health = useMemo(() => (scope ? computeHealth(scope, analyzeProject(scope)) : null), [scope]);

  const runs = useMemo<Run[]>(() => {
    if (!project) return [];
    const builds = store.state.builds
      .filter((b) => b.projectId === project.id && b.status !== "queued" && b.status !== "running")
      .map(buildRun);
    const exports = listExportHistory(project.id).map<Run>((e) => ({
      label: `${e.outputFiles[0]?.fileName ?? "Export"}${e.version ? ` v${e.version}` : ""}`,
      at: new Date(e.createdAt).getTime(),
      ok: e.errors === 0,
      detail: `Export · ${e.exportType} · ${e.warnings} warning(s)`,
    }));
    return [...builds, ...exports].sort((a, b) => b.at - a.at);
  }, [project, store.state.builds]);

  const days = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const from = start.getTime() - (6 - i) * DAY_MS;
      const inDay = runs.filter((r) => r.at >= from && r.at < from + DAY_MS);
      return {
        d: new Date(from).toLocaleDateString(undefined, { weekday: "short" }),
        builds: inDay.length,
        ok: inDay.filter((r) => r.ok).length,
      };
    });
  }, [runs]);

  const week = runs.filter((r) => r.at >= Date.now() - 7 * DAY_MS);
  const prevWeek = runs.filter((r) => r.at < Date.now() - 7 * DAY_MS && r.at >= Date.now() - 14 * DAY_MS);
  const totalBuilds = week.length;
  const okBuilds = week.filter((r) => r.ok).length;
  const successRate = totalBuilds ? Math.round((okBuilds / totalBuilds) * 100) : 0;
  const timed = week.filter((r) => r.durationMs);
  const avgDuration = timed.length
    ? fmtDuration(timed.reduce((n, r) => n + (r.durationMs ?? 0), 0) / timed.length)
    : "—";
  const trend = totalBuilds - prevWeek.length;

  const maxBuilds = Math.max(1, ...days.map((d) => d.builds));

  const modules = useMemo(() => {
    if (!scope) return [];
    const pct = (filled: number, total: number) => (total === 0 ? 0 : Math.round((filled / total) * 100));
    return [
      {
        name: "Careers",
        count: scope.careers.length,
        pct: pct(scope.careers.filter((c) => (c.branches ?? []).some((b) => (b.levels ?? []).length > 0)).length, scope.careers.length),
        color: "var(--blue)",
      },
      {
        name: "Traits",
        count: scope.traits.length,
        pct: pct(scope.traits.filter((t) => (t.buffs ?? []).length > 0).length, scope.traits.length),
        color: "var(--violet)",
      },
      {
        name: "Aspirations",
        count: scope.aspirations.length,
        pct: pct(scope.aspirations.filter((a) => (a.milestones ?? []).length > 0).length, scope.aspirations.length),
        color: "var(--teal)",
      },
      {
        name: "Notifications",
        count: scope.notifications.length,
        pct: pct(scope.notifications.filter((n) => (n.body ?? "").trim().length > 0).length, scope.notifications.length),
        color: "var(--orange)",
      },
      {
        name: "Assets",
        count: scope.assets.length,
        pct: pct(scope.assets.length - health!.missingAssetRefs, Math.max(scope.assets.length, 1)),
        color: "var(--pink)",
      },
    ];
  }, [scope, health]);

  if (!project || !scope || !health) {
    return <p className="text-sm text-muted-foreground">Open a project to see its build analytics.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--violet)] text-white shadow-sm">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {project.name}
            </div>
            <h1 className="text-xl font-bold tracking-tight">Build Analytics</h1>
          </div>
        </div>
        <div className="text-[11px] text-muted-foreground">Last 7 days</div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Builds & exports" value={String(totalBuilds)} icon={Package} color="var(--blue)" />
        <Kpi label="Success rate" value={totalBuilds ? `${successRate}%` : "—"} icon={CheckCircle2} color="var(--green)" />
        <Kpi label="Avg duration" value={avgDuration} icon={Timer} color="var(--teal)" />
        <Kpi label="Failed" value={String(totalBuilds - okBuilds)} icon={XCircle} color="var(--red)" />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <section className="col-span-12 rounded-xl border border-border bg-card p-5 card-elevated lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Runs by day</h2>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[11px]",
                trend >= 0 ? "text-[var(--green)]" : "text-[var(--orange)]",
              )}
            >
              {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend >= 0 ? "+" : ""}
              {trend} vs previous week
            </span>
          </div>
          <div className="flex h-52 items-end gap-3">
            {days.map((d, i) => {
              const h = (d.builds / maxBuilds) * 100;
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex h-full w-full items-end justify-center">
                    <div className="w-full rounded-t-md bg-[var(--blue)]/20" style={{ height: `${h}%` }}>
                      <div
                        className="w-full rounded-t-md bg-[var(--blue)]"
                        style={{ height: d.builds ? `${(d.ok / d.builds) * 100}%` : "0%" }}
                      />
                    </div>
                  </div>
                  <div className="text-[10px] font-semibold text-muted-foreground">{d.d}</div>
                  <div className="text-[10px] tabular-nums text-muted-foreground">{d.builds}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-[var(--blue)]" /> Succeeded
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-[var(--blue)]/20" /> Failed
            </span>
          </div>
        </section>

        <section className="col-span-12 rounded-xl border border-border bg-card p-5 card-elevated lg:col-span-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Module completeness</h2>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              overall {health.completeness}%
            </span>
          </div>
          <div className="space-y-3">
            {modules.map((m) => (
              <div key={m.name}>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="font-medium">
                    {m.name}
                    <span className="ml-1.5 text-muted-foreground">{m.count}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">{m.pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${m.pct}%`, backgroundColor: m.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="col-span-12 rounded-xl border border-border bg-card p-5 card-elevated">
          <h2 className="mb-3 text-sm font-semibold">Recent builds & exports</h2>
          {runs.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              Nothing has been built or exported for {project.name} yet.
            </p>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-background/60 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Run</th>
                    <th className="px-3 py-2 text-left font-semibold">Detail</th>
                    <th className="px-3 py-2 text-left font-semibold">Duration</th>
                    <th className="px-3 py-2 text-left font-semibold">Status</th>
                    <th className="px-3 py-2 text-left font-semibold">When</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.slice(0, 12).map((r, i) => (
                    <tr key={i} className="border-t border-border/70">
                      <td className="px-3 py-2 font-medium">{r.label}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.detail}</td>
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">{fmtDuration(r.durationMs)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold",
                            r.ok
                              ? "border-[var(--green)]/40 bg-[var(--green)]/10 text-[var(--green)]"
                              : "border-[var(--red)]/40 bg-[var(--red)]/10 text-[var(--red)]",
                          )}
                        >
                          {r.ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {r.ok ? "Success" : "Failed"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{fmtWhen(r.at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 card-elevated">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
