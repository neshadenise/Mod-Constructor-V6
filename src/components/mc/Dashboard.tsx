import { useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  PlayCircle,
  Pause,
  Plus,
  Upload,
  FileCode2,
  GitBranch,
  Zap,
  Terminal,
  Clock,
  ArrowUpRight,
  Layers3,
  Sparkles,
  Briefcase,
  Target,
  RotateCcw,
  X,
} from "lucide-react";
import { Canvas } from "./Canvas";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAdvanced } from "@/lib/advanced-mode";
import { useStore, useActiveProject } from "@/lib/store";
import { useAppNavigation } from "@/lib/navigation";
import { ProjectHealthCard } from "@/components/mc/HealthInspector";
import { useBuildEngine } from "@/lib/build-engine";
import {
  scopeProject,
  analyzeProject,
  computeHealth,
  computeDependencies,
  BUILD_STEPS,
  stepStateFor,
  type ProjectScope,
  type DerivedIssue,
} from "@/lib/project-analysis";
import type { ProjectStatus } from "@/lib/types";
import { toast } from "sonner";
import { useImportPackage } from "./ImportPackageDialog";

/* ------------------------------------------------------------------ *
 * Shared live context for the dashboard
 * ------------------------------------------------------------------ */

function useDashboardData() {
  const store = useStore();
  const project = useActiveProject();
  const scope = useMemo(
    () => scopeProject(store.state, project?.id),
    [store.state, project?.id],
  );
  const issues = useMemo(() => (scope ? analyzeProject(scope) : []), [scope]);
  const health = useMemo(
    () => (scope ? computeHealth(scope, issues) : null),
    [scope, issues],
  );
  const builds = useMemo(
    () => store.state.builds.filter((b) => !project || b.projectId === project.id),
    [store.state.builds, project],
  );
  const activeBuild = builds.find((b) => b.status === "running")
    ?? builds.find((b) => b.status === "queued")
    ?? builds[0];
  return { store, project, scope, issues, health, builds, activeBuild };
}

/* ------------------------------------------------------------------ *
 * Dashboard shell
 * ------------------------------------------------------------------ */

export function Dashboard() {
  const { advanced } = useAdvanced();
  const { store, project, scope, issues, health, builds, activeBuild } = useDashboardData();
  const { navigate } = useAppNavigation();

  const importer = useImportPackage();

  useBuildEngine();

  const inFlight = builds.filter((b) => b.status === "running" || b.status === "queued").length;


  function newMod() {
    const p = store.createProject({ name: "Untitled Mod" });
    store.setActiveProject(p.id);
    toast.success(`Created "${p.name}"`, { description: "Now scoped across every builder." });
    navigate("projects");
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-6">
      {importer.dialog}

      <div className="flex items-end justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Studio Dashboard
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {project ? project.name : "No project selected"}{" "}
            <span className="font-medium text-muted-foreground">
              {inFlight > 0
                ? `· ${inFlight} build${inFlight === 1 ? "" : "s"} in flight`
                : project
                  ? `· ${health?.recordCount ?? 0} records · v${project.version}`
                  : "· open Projects to pick one"}
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => importer.openImport()}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            <Upload className="h-3.5 w-3.5" /> Import
          </button>
          <button
            onClick={newMod}
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> New Mod
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <CurrentProject />
        <ProjectHealthCard className="col-span-6" />
      </div>


      <div className="grid grid-cols-12 gap-4">
        <QuickActions />
        <RecentTemplates />
        <BuildQueue />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12">
          <SectionCard
            title="Constructor Canvas"
            subtitle={
              scope
                ? `${scope.careers.length} careers · ${scope.traits.length} traits · ${scope.aspirations.length} aspirations`
                : "How the parts of your mod fit together"
            }
            icon={Layers3}
            accent="blue"
          >
            <Canvas />
          </SectionCard>
        </div>
      </div>

      <footer className="pt-2 text-center text-[11px] text-muted-foreground">
        Mod Constructor V6 · Desktop Edition · {advanced ? "Advanced mode" : "Simple mode"}
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  accent,
  action,
  onAction,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  accent: "blue" | "teal" | "green" | "orange" | "violet";
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-4 card-elevated", className)}>
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md text-white"
            style={{ backgroundColor: `var(--${accent})` }}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">{title}</div>
            {subtitle && <div className="text-[11px] text-muted-foreground">{subtitle}</div>}
          </div>
        </div>
        {action && (
          <button
            onClick={onAction}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent"
          >
            {action} <ArrowUpRight className="h-3 w-3" />
          </button>
        )}
      </header>
      {children}
    </section>
  );
}

const STATUS_META: Record<ProjectStatus, { label: string; c: string }> = {
  "draft": { label: "Draft", c: "orange" },
  "in-progress": { label: "In Progress", c: "blue" },
  "complete": { label: "Complete", c: "green" },
  "tested": { label: "Tested", c: "teal" },
  "released": { label: "Released", c: "violet" },
};
const STATUS_ORDER: ProjectStatus[] = ["draft", "in-progress", "complete", "tested", "released"];

function CurrentProject() {
  const store = useStore();
  const project = useActiveProject();
  const { navigate } = useAppNavigation();

  if (!project) {
    return (
      <section className="col-span-6 rounded-xl border border-dashed border-border bg-card p-5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Current Project
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          No project selected. Open <b>Projects</b> and pick one — every builder will scope to it.
        </div>
        <button
          onClick={() => navigate("projects")}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-90"
        >
          Open Projects <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </section>
    );
  }

  const meta = STATUS_META[project.status] ?? STATUS_META["draft"];
  const careers = store.state.careers.filter((c) => c.projectId === project.id).length;
  const traits = store.state.traits.filter((t) => t.projectId === project.id).length;
  const aspirations = store.state.aspirations.filter((a) => a.projectId === project.id).length;
  const assets = store.state.assets.filter((a) => a.projectId === project.id).length;

  return (
    <section className="col-span-6 relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card via-card to-[color-mix(in_oklab,var(--blue)_8%,var(--card))] p-5 card-elevated">
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[var(--teal)]/20 blur-3xl" />
      <div className="absolute -bottom-24 -right-8 h-56 w-56 rounded-full bg-[var(--violet)]/15 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--blue)]">
              Current Project
            </div>
            <h2 className="mt-1 truncate text-xl font-bold tracking-tight">{project.name}</h2>
            <div className="mt-1 text-xs text-muted-foreground">
              v{project.version} · {careers} careers · {traits} traits · {aspirations} aspirations
              {project.isDemo && (
                <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide">
                  Demo
                </span>
              )}
            </div>
          </div>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{
              color: `var(--${meta.c})`,
              backgroundColor: `color-mix(in oklab, var(--${meta.c}) 14%, transparent)`,
              border: `1px solid color-mix(in oklab, var(--${meta.c}) 30%, transparent)`,
            }}
          >
            {meta.label}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-3">
          {[
            { label: "Careers", val: careers, icon: Briefcase, c: "blue", to: "career" as const },
            { label: "Traits", val: traits, icon: Sparkles, c: "violet", to: "trait" as const },
            { label: "Aspirations", val: aspirations, icon: Target, c: "teal", to: "aspiration" as const },
            { label: "Assets", val: assets, icon: FileCode2, c: "orange", to: "assets" as const },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.label}
                onClick={() => navigate(s.to)}
                className="rounded-lg border border-border bg-background/60 p-2.5 text-left transition hover:border-foreground/20 hover:shadow-sm"
              >
                <Icon className="h-3.5 w-3.5" style={{ color: `var(--${s.c})` }} />
                <div className="mt-1.5 text-lg font-bold tabular-nums leading-none">{s.val}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</div>
          {STATUS_ORDER.map((s) => {
            const isActive = s === project.status;
            const m = STATUS_META[s];
            return (
              <button
                key={s}
                onClick={() => {
                  store.setProjectStatus(project.id, s);
                  toast.success(`v${project.version} → ${m.label}`);
                }}
                className={cn(
                  "rounded-md border px-2 py-1 text-[10px] font-semibold uppercase transition",
                  isActive ? "border-transparent" : "border-border hover:bg-accent",
                )}
                style={isActive ? {
                  color: `var(--${m.c})`,
                  backgroundColor: `color-mix(in oklab, var(--${m.c}) 14%, transparent)`,
                } : undefined}
              >
                {m.label}
              </button>
            );
          })}
          <div className="ml-auto text-[11px] text-muted-foreground">
            Last edit · {new Date(project.updatedAt).toISOString().slice(11, 16)} UTC
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickActions() {
  const store = useStore();
  const project = useActiveProject();
  const { navigate } = useAppNavigation();

  function requireProject(): string | null {
    if (!project) {
      toast.error("Select or create a project first");
      navigate("projects");
      return null;
    }
    return project.id;
  }

  const actions = [
    {
      label: "New Career", icon: Briefcase, c: "blue",
      run: () => {
        const id = requireProject();
        if (!id) return;
        const rec = store.createCareer({ projectId: id, name: "New Career" });
        toast.success(`Added "${rec.name}"`);
        navigate("career");
      },
    },
    {
      label: "New Trait", icon: Sparkles, c: "violet",
      run: () => {
        const id = requireProject();
        if (!id) return;
        const rec = store.createTrait({ projectId: id, name: "New Trait" });
        toast.success(`Added "${rec.name}"`);
        navigate("trait");
      },
    },
    {
      label: "New Aspiration", icon: Target, c: "teal",
      run: () => {
        const id = requireProject();
        if (!id) return;
        const rec = store.createAspiration({ projectId: id, name: "New Aspiration" });
        toast.success(`Added "${rec.name}"`);
        navigate("aspiration");
      },
    },
    {
      label: "Import Package", icon: Upload, c: "orange",
      run: () => navigate("exporter"),
    },
    {
      label: "Compile Now", icon: Zap, c: "green",
      run: () => {
        const id = requireProject();
        if (!id || !project) return;
        const label = `${slug(project.name)}.package`;
        store.enqueueBuild(label, id);
        toast.success(`Queued build · ${label}`);
      },
    },
    {
      label: "Validate All", icon: CheckCircle2, c: "blue",
      run: () => {
        const id = requireProject();
        if (!id) return;
        const scope = scopeProject(store.state, id);
        const found = scope ? analyzeProject(scope) : [];
        store.clearValidation();
        for (const i of found) store.addValidationIssue(i);
        const errors = found.filter((f) => f.severity === "error").length;
        if (found.length === 0) toast.success("No issues found");
        else if (errors > 0) toast.error(`${found.length} issues · ${errors} errors`);
        else toast.warning(`${found.length} issues found`);
      },
    },
  ];

  return (
    <SectionCard title="Quick Actions" icon={Zap} accent="orange" className="col-span-4">
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={a.run}
              className="group flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-left text-xs font-medium transition-all hover:border-foreground/20 hover:shadow-sm"
            >
              <div
                className="flex h-7 w-7 items-center justify-center rounded-md transition-transform group-hover:scale-105"
                style={{ backgroundColor: `color-mix(in oklab, var(--${a.c}) 15%, transparent)` }}
              >
                <Icon className="h-3.5 w-3.5" style={{ color: `var(--${a.c})` }} />
              </div>
              {a.label}
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}

const KIND_COLOR: Record<string, string> = {
  Career: "blue",
  Trait: "violet",
  Aspiration: "teal",
  Notification: "green",
};

function RecentTemplates() {
  const store = useStore();
  const project = useActiveProject();
  const { navigate } = useAppNavigation();

  const items = useMemo(
    () => [...store.state.templates].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4),
    [store.state.templates],
  );

  function apply(id: string) {
    const t = store.state.templates.find((x) => x.id === id);
    if (!t) return;
    if (!project) {
      toast.error("Select or create a project first");
      navigate("projects");
      return;
    }
    if (!t.payload) {
      toast.error("This template has no starter contents");
      navigate("templates");
      return;
    }
    const p = t.payload as { name?: string } & Record<string, unknown>;
    const base = { ...p, projectId: project.id, name: p.name ?? t.name };
    try {
      switch (t.kind) {
        case "Career": store.createCareer(base as never); break;
        case "Trait": store.createTrait(base as never); break;
        case "Aspiration": store.createAspiration(base as never); break;
        case "Notification": store.createNotificationTemplate(base as never); break;
      }
      toast.success(`Added "${base.name}" from template`);
    } catch {
      toast.error("Could not scaffold from this template");
    }
  }

  return (
    <SectionCard
      title="Recent Mod Templates"
      subtitle={`${store.state.templates.length} available`}
      icon={Layers3}
      accent="violet"
      action="Browse all"
      onAction={() => navigate("templates")}
      className="col-span-4"
    >
      {items.length === 0 ? (
        <Empty text="No templates yet. Save one from any builder." />
      ) : (
        <ul className="space-y-1.5">
          {items.map((it) => (
            <li key={it.id}>
              <button
                onClick={() => apply(it.id)}
                className="flex w-full items-center gap-2.5 rounded-md border border-transparent px-2 py-1.5 text-left hover:border-border hover:bg-accent/40"
              >
                <div
                  className="h-8 w-1 rounded-full"
                  style={{ backgroundColor: `var(--${KIND_COLOR[it.kind] ?? "blue"})` }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold">{it.kind}: {it.name}</div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    {it.source === "user-created" ? "Yours" : "Built-in"} · {it.difficulty} · {it.tested}
                  </div>
                </div>
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function BuildQueue() {
  const { store, builds } = useDashboardData();
  const { navigate } = useAppNavigation();
  const rows = builds.slice(0, 4);

  const color = (s: string) =>
    s === "running" ? "blue" : s === "queued" ? "orange" : s === "success" ? "green" : "destructive";

  return (
    <SectionCard
      title="Build Queue"
      subtitle={`${builds.length} job${builds.length === 1 ? "" : "s"}`}
      icon={Clock}
      accent="teal"
      action="Manage"
      onAction={() => navigate("queue")}
      className="col-span-4"
    >
      {rows.length === 0 ? (
        <Empty text="Nothing queued. Use Compile Now to start a build." />
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => {
            const c = color(r.status);
            return (
              <li key={r.id} className="rounded-md border border-border bg-background/60 p-2.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-mono font-medium">{r.label}</span>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize"
                    style={{
                      color: `var(--${c})`,
                      backgroundColor: `color-mix(in oklab, var(--${c}) 12%, transparent)`,
                    }}
                  >
                    {r.status === "running" && <PlayCircle className="h-2.5 w-2.5" />}
                    {r.status === "queued" && <Pause className="h-2.5 w-2.5" />}
                    {r.status === "success" && <CheckCircle2 className="h-2.5 w-2.5" />}
                    {r.status}
                  </span>
                  {(r.status === "running" || r.status === "queued") ? (
                    <button
                      title="Cancel"
                      onClick={() => { store.cancelBuild(r.id); toast("Build cancelled"); }}
                      className="rounded p-0.5 text-muted-foreground hover:bg-accent"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : (
                    <button
                      title="Retry"
                      onClick={() => { store.retryBuild(r.id); toast("Build re-queued"); }}
                      className="rounded p-0.5 text-muted-foreground hover:bg-accent"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${r.progress}%`, backgroundColor: `var(--${c})` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

const SEV_META = {
  error: { icon: XCircle, c: "destructive" },
  warning: { icon: AlertTriangle, c: "orange" },
  info: { icon: Info, c: "blue" },
} as const;

export function ValidationResults({ issues }: { issues: DerivedIssue[] }) {
  const store = useStore();
  const project = useActiveProject();
  const { navigate } = useAppNavigation();
  const [nonce, setNonce] = useState(0);
  const shown = issues.slice(0, 6);
  const errors = issues.filter((i) => i.severity === "error").length;

  return (
    <SectionCard
      title="Validation Results"
      subtitle={`${issues.length} issue${issues.length === 1 ? "" : "s"} · ${errors} error${errors === 1 ? "" : "s"}`}
      icon={CheckCircle2}
      accent="green"
      action="Re-run"
      onAction={() => {
        if (!project) { toast.error("Select a project first"); return; }
        store.clearValidation();
        for (const i of issues) store.addValidationIssue(i);
        setNonce((n) => n + 1);
        toast.success(issues.length ? `${issues.length} issues recorded` : "No issues found");
      }}
    >
      {issues.length === 0 ? (
        <Empty text={project ? "All checks passed." : "Select a project to validate."} />
      ) : (
        <ul key={nonce} className="space-y-1.5 text-xs">
          {shown.map((it, i) => {
            const meta = SEV_META[it.severity];
            const Icon = meta.icon;
            return (
              <li key={i} className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-accent/40">
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: `var(--${meta.c})` }} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{it.message}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {it.scope}{it.field ? ` · ${it.field}` : ""}
                  </div>
                </div>
              </li>
            );
          })}
          {issues.length > shown.length && (
            <li>
              <button
                onClick={() => navigate("validation")}
                className="w-full rounded-md px-2 py-1.5 text-left text-[11px] font-medium text-muted-foreground hover:bg-accent/40"
              >
                +{issues.length - shown.length} more in Validation Center
              </button>
            </li>
          )}
        </ul>
      )}
    </SectionCard>
  );
}

export function DependencyChecker({ scope }: { scope: ProjectScope | null }) {
  const deps = useMemo(() => (scope ? computeDependencies(scope) : []), [scope]);

  return (
    <SectionCard
      title="Dependency Checker"
      subtitle={`${deps.length} checks`}
      icon={GitBranch}
      accent="blue"
    >
      {deps.length === 0 ? (
        <Empty text="Select a project to scan dependencies." />
      ) : (
        <ul className="space-y-1.5">
          {deps.map((d) => {
            const color = d.status === "ok" ? "green" : d.status === "warn" ? "orange" : "destructive";
            return (
              <li key={d.name} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent/40">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: `var(--${color})`, boxShadow: `0 0 8px var(--${color})` }}
                />
                <span className="font-medium">{d.name}</span>
                <span className="ml-auto truncate font-mono text-[10px] text-muted-foreground">{d.detail}</span>
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                  style={{
                    color: `var(--${color})`,
                    backgroundColor: `color-mix(in oklab, var(--${color}) 12%, transparent)`,
                  }}
                >
                  {d.status}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

export function BuildLog() {
  const { store, activeBuild } = useDashboardData();
  const lines = activeBuild?.log ?? [];

  return (
    <SectionCard
      title="Build Log"
      subtitle={activeBuild ? `${activeBuild.status} · ${activeBuild.label}` : "No active build"}
      icon={Terminal}
      accent="violet"
      action="Clear"
      onAction={() => { store.clearBuilds(); toast("Finished builds cleared"); }}
    >
      <div className="max-h-56 overflow-auto rounded-md border border-border bg-[color-mix(in_oklab,var(--foreground)_4%,var(--card))] p-3 font-mono text-[11px] leading-relaxed">
        {lines.length === 0 ? (
          <div className="text-muted-foreground">Waiting for a build…</div>
        ) : (
          lines.map((l, i) => <LogLine key={i} line={l} />)
        )}
        {activeBuild?.status === "running" && (
          <div className="mt-1 flex items-center gap-1 text-muted-foreground">
            <span className="inline-block h-3 w-1.5 animate-pulse bg-[var(--teal)]" /> streaming…
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function LogLine({ line }: { line: string }) {
  const m = /^(\S+)\s+\[(\w+)\]\s+(.*)$/.exec(line);
  if (!m) return <div className="text-foreground/85">{line}</div>;
  const [, t, tag, msg] = m;
  const c = tag === "OK" ? "green" : tag === "WARN" ? "orange" : tag === "STEP" ? "violet" : tag === "ERROR" ? "destructive" : "blue";
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground">{t}</span>
      <span className="font-bold" style={{ color: `var(--${c})` }}>[{tag}]</span>
      <span className="text-foreground/85">{msg}</span>
    </div>
  );
}

export function ProgressRing() {
  const { store, project, activeBuild } = useDashboardData();
  const pct = activeBuild?.progress ?? 0;
  const r = 52;
  const c = 2 * Math.PI * r;
  const status = activeBuild?.status ?? "idle";
  const elapsed = activeBuild?.startedAt
    ? ((activeBuild.finishedAt ?? Date.now()) - activeBuild.startedAt) / 1000
    : 0;

  return (
    <section className="rounded-xl border border-border bg-card p-4 card-elevated">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Build Progress</div>
          <div className="text-[11px] text-muted-foreground">{activeBuild?.label ?? "No build yet"}</div>
        </div>
        {activeBuild ? (
          <span className="rounded-md bg-[var(--orange)]/10 px-2 py-1 text-[10px] font-semibold uppercase text-[var(--orange)]">
            {status}
          </span>
        ) : (
          <button
            onClick={() => {
              if (!project) { toast.error("Select a project first"); return; }
              store.enqueueBuild(`${slug(project.name)}.package`, project.id);
              toast.success("Build queued");
            }}
            className="rounded-md bg-foreground px-2 py-1 text-[10px] font-semibold uppercase text-background hover:opacity-90"
          >
            Build
          </button>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="relative h-32 w-32">
          <svg className="h-full w-full -rotate-90">
            <circle cx="64" cy="64" r={r} strokeWidth="10" className="fill-none stroke-muted" />
            <circle
              cx="64" cy="64" r={r}
              strokeWidth="10"
              strokeLinecap="round"
              className="fill-none transition-[stroke-dashoffset] duration-500"
              stroke="url(#pgrad)"
              strokeDasharray={c}
              strokeDashoffset={c - (pct / 100) * c}
            />
            <defs>
              <linearGradient id="pgrad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--teal)" />
                <stop offset="100%" stopColor="var(--blue)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-3xl font-bold tabular-nums tracking-tight">{Math.round(pct)}%</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {status === "running" ? "Compiling" : status}
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-1.5 text-xs">
          <MiniStat label="Elapsed" val={`${elapsed.toFixed(1)}s`} />
          <MiniStat label="Step" val={activeBuild ? BUILD_STEPS[Math.min(BUILD_STEPS.length - 1, Math.floor(pct / (100 / BUILD_STEPS.length)))] : "—"} />
          <MiniStat label="Log lines" val={String(activeBuild?.log.length ?? 0)} />
          <MiniStat label="Queue" val={String(store.state.builds.filter((b) => b.status === "queued").length)} />
        </div>
      </div>
    </section>
  );
}

function MiniStat({ label, val }: { label: string; val: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-muted/60 px-2 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-mono font-semibold tabular-nums">{val}</span>
    </div>
  );
}

export function BuildSteps({ progress, status }: { progress: number; status?: string }) {
  return (
    <SectionCard title="Build Steps" icon={PlayCircle} accent="teal">
      <ol className="space-y-1">
        {BUILD_STEPS.map((name, i) => {
          const state = status && status !== "running" && status !== "queued"
            ? (status === "success" ? "done" : "wait")
            : stepStateFor(progress, i);
          return (
            <li key={name} className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 text-xs">
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                  state === "done" && "bg-[var(--green)] text-white",
                  state === "run" && "bg-[var(--blue)] text-white animate-pulse",
                  state === "wait" && "border border-border bg-muted text-muted-foreground",
                )}
              >
                {state === "done" ? "✓" : i + 1}
              </div>
              <span className={cn("flex-1 font-medium", state === "wait" && "text-muted-foreground")}>{name}</span>
              {state === "run" && (
                <span className="text-[10px] font-semibold uppercase text-[var(--blue)]">Active</span>
              )}
            </li>
          );
        })}
      </ol>
    </SectionCard>
  );
}

export function ModMetadata() {
  const store = useStore();
  const project = useActiveProject();
  const { navigate } = useAppNavigation();
  const [tagDraft, setTagDraft] = useState("");

  if (!project) {
    return (
      <SectionCard title="Mod Metadata" icon={FileCode2} accent="orange">
        <Empty text="Select a project to edit its metadata." />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Mod Metadata"
      subtitle="Saved as you type"
      icon={FileCode2}
      accent="orange"
      action="Details"
      onAction={() => navigate("projects")}
    >
      <div className="grid grid-cols-2 gap-2.5 text-xs">
        <Field label="Name" value={project.name} onChange={(v) => store.updateProject(project.id, { name: v })} />
        <Field
          label="Version"
          value={project.version}
          onChange={(v) => store.setProjectVersion(project.id, v)}
        />
        <Field label="Author" value={project.author} onChange={(v) => store.updateProject(project.id, { author: v })} />
        <Field label="Status" value={STATUS_META[project.status]?.label ?? project.status} readOnly />
        <div className="col-span-2">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Description
          </label>
          <Textarea
            value={project.description}
            onChange={(e) => store.updateProject(project.id, { description: e.target.value })}
            className="h-16 resize-none text-xs"
            placeholder="What does this mod do?"
          />
        </div>
        <div className="col-span-2 flex flex-wrap items-center gap-1.5">
          {project.tags.map((t) => (
            <button
              key={t}
              title="Remove tag"
              onClick={() => store.updateProject(project.id, { tags: project.tags.filter((x) => x !== t) })}
              className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:border-destructive/40 hover:text-foreground"
            >
              #{t} ×
            </button>
          ))}
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && tagDraft.trim()) {
                const t = tagDraft.trim().replace(/^#/, "");
                if (!project.tags.includes(t)) store.updateProject(project.id, { tags: [...project.tags, t] });
                setTagDraft("");
              }
            }}
            placeholder="add tag ⏎"
            className="w-24 rounded-full border border-dashed border-border bg-transparent px-2 py-0.5 text-[10px] outline-none focus:border-foreground/30"
          />
        </div>
      </div>
    </SectionCard>
  );
}

function Field({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <Input
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-8 text-xs"
      />
    </div>
  );
}


function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-[11px] text-muted-foreground">
      {text}
    </div>
  );
}

function slug(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "project";
}


/* ------------------------------------------------------------------ *
 * Self-contained cards for the related pages (moved off the Dashboard)
 * ------------------------------------------------------------------ */

export function ValidationResultsCard() {
  const { issues } = useDashboardData();
  return <ValidationResults issues={issues} />;
}

export function DependencyCheckerCard() {
  const { scope } = useDashboardData();
  return <DependencyChecker scope={scope} />;
}

export function BuildProgressCard() {
  const { activeBuild } = useDashboardData();
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ProgressRing />
      <BuildSteps progress={activeBuild?.progress ?? 0} status={activeBuild?.status} />
    </div>
  );
}

export function ModMetadataCard() {
  return <ModMetadata />;
}
