import { BarChart3, TrendingUp, Timer, CheckCircle2, XCircle, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = [
  { d: "Mon", builds: 4, ok: 3 },
  { d: "Tue", builds: 6, ok: 6 },
  { d: "Wed", builds: 3, ok: 2 },
  { d: "Thu", builds: 8, ok: 7 },
  { d: "Fri", builds: 5, ok: 5 },
  { d: "Sat", builds: 2, ok: 2 },
  { d: "Sun", builds: 7, ok: 6 },
];

const MODULES = [
  { name: "Careers", pct: 84, color: "var(--blue)" },
  { name: "Traits", pct: 62, color: "var(--violet)" },
  { name: "Aspirations", pct: 45, color: "var(--teal)" },
  { name: "Notifications", pct: 70, color: "var(--orange)" },
  { name: "Assets", pct: 91, color: "var(--pink)" },
];

const HISTORY = [
  { label: "Marine Biologist v0.4.0", dur: "1m 12s", ok: true, when: "2m ago" },
  { label: "Lucid Dreamer v1.2.0", dur: "48s", ok: true, when: "1h ago" },
  { label: "Reef Guardian v0.2.0", dur: "1m 42s", ok: false, when: "3h ago" },
  { label: "Weathercore v0.9.2", dur: "2m 08s", ok: true, when: "yesterday" },
  { label: "Trailblazer v1.0.0", dur: "55s", ok: true, when: "yesterday" },
  { label: "Epic Careers rc1", dur: "3m 04s", ok: false, when: "2d ago" },
];

export function BuildAnalytics() {
  const maxBuilds = Math.max(...DAYS.map((d) => d.builds));
  const totalBuilds = DAYS.reduce((s, d) => s + d.builds, 0);
  const okBuilds = DAYS.reduce((s, d) => s + d.ok, 0);
  const successRate = Math.round((okBuilds / totalBuilds) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--violet)] text-white shadow-sm">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Insights
            </div>
            <h1 className="text-xl font-bold tracking-tight">Build Analytics</h1>
          </div>
        </div>
        <div className="text-[11px] text-muted-foreground">Last 7 days</div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Builds" value={totalBuilds.toString()} icon={Package} color="var(--blue)" />
        <Kpi label="Success rate" value={`${successRate}%`} icon={CheckCircle2} color="var(--green)" />
        <Kpi label="Avg duration" value="1m 24s" icon={Timer} color="var(--teal)" />
        <Kpi label="Failed" value={(totalBuilds - okBuilds).toString()} icon={XCircle} color="var(--red)" />
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Weekly bar chart */}
        <section className="col-span-12 rounded-xl border border-border bg-card p-5 card-elevated lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Builds by day</h2>
            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--green)]">
              <TrendingUp className="h-3 w-3" /> +18% vs last week
            </span>
          </div>
          <div className="flex h-52 items-end gap-3">
            {DAYS.map((d) => {
              const h = (d.builds / maxBuilds) * 100;
              const okH = (d.ok / d.builds) * h;
              return (
                <div key={d.d} className="flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex h-full w-full items-end justify-center">
                    <div
                      className="w-full rounded-t-md bg-[var(--blue)]/20"
                      style={{ height: `${h}%` }}
                    >
                      <div
                        className="w-full rounded-t-md bg-[var(--blue)]"
                        style={{ height: `${(okH / h) * 100}%` }}
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
              <span className="h-2 w-2 rounded-sm bg-[var(--blue)]/20" /> Failed / retried
            </span>
          </div>
        </section>

        {/* Module coverage */}
        <section className="col-span-12 rounded-xl border border-border bg-card p-5 card-elevated lg:col-span-5">
          <h2 className="mb-4 text-sm font-semibold">Module completeness</h2>
          <div className="space-y-3">
            {MODULES.map((m) => (
              <div key={m.name}>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="font-medium">{m.name}</span>
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

        {/* Recent builds */}
        <section className="col-span-12 rounded-xl border border-border bg-card p-5 card-elevated">
          <h2 className="mb-3 text-sm font-semibold">Recent builds</h2>
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-background/60 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Build</th>
                  <th className="px-3 py-2 text-left font-semibold">Duration</th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                  <th className="px-3 py-2 text-left font-semibold">When</th>
                </tr>
              </thead>
              <tbody>
                {HISTORY.map((h, i) => (
                  <tr key={i} className="border-t border-border/70">
                    <td className="px-3 py-2 font-medium">{h.label}</td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{h.dur}</td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold",
                          h.ok
                            ? "border-[var(--green)]/40 bg-[var(--green)]/10 text-[var(--green)]"
                            : "border-[var(--red)]/40 bg-[var(--red)]/10 text-[var(--red)]",
                        )}
                      >
                        {h.ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {h.ok ? "Success" : "Failed"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{h.when}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
