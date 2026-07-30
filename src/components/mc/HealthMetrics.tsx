import { useMemo } from "react";
import { Activity, GitBranch, Package } from "lucide-react";
import { useStore, useActiveProject } from "@/lib/store";
import {
  scopeProject,
  analyzeProject,
  computeHealth,
  type HealthMetrics,
} from "@/lib/project-analysis";

/** Live health metrics for the active project (null when nothing is selected). */
export function useProjectHealth(): HealthMetrics | null {
  const store = useStore();
  const project = useActiveProject();
  const scope = useMemo(
    () => scopeProject(store.state, project?.id),
    [store.state, project?.id],
  );
  return useMemo(() => {
    if (!scope) return null;
    return computeHealth(scope, analyzeProject(scope));
  }, [scope]);
}

const ACCENTS = {
  green: "var(--green)",
  blue: "var(--blue)",
  orange: "var(--orange)",
} as const;

export function MetricTile({
  title,
  value,
  sub,
  accent,
  icon: Icon,
}: {
  title: string;
  value: number;
  sub: string;
  accent: keyof typeof ACCENTS;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
  const color = ACCENTS[accent];
  return (
    <div className="rounded-xl border border-border bg-card p-4 card-elevated">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </div>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="mt-1.5 text-3xl font-bold tabular-nums" style={{ color }}>
        {value}
        <span className="text-base font-semibold">%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

/** Build Health — lives on the Validation Center. */
export function BuildHealthTile() {
  const health = useProjectHealth();
  return (
    <MetricTile
      title="Build Health"
      value={health?.buildHealth ?? 0}
      accent="green"
      icon={Activity}
      sub={health ? `${health.errors} errors · ${health.warnings} warnings` : "No project selected"}
    />
  );
}

/** Compatibility — lives on the Dependency Graph. */
export function CompatibilityTile() {
  const health = useProjectHealth();
  return (
    <MetricTile
      title="Compatibility"
      value={health?.compatibility ?? 0}
      accent="blue"
      icon={GitBranch}
      sub={health ? `${health.missingAssetRefs} broken asset refs` : "No project selected"}
    />
  );
}

/** Package Completeness — lives on the Package Exporter. */
export function CompletenessTile() {
  const health = useProjectHealth();
  return (
    <MetricTile
      title="Package Completeness"
      value={health?.completeness ?? 0}
      accent="orange"
      icon={Package}
      sub={health ? `${health.recordCount} records scanned` : "No project selected"}
    />
  );
}
