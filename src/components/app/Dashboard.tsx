import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Upload,
  ShieldCheck,
  Package as PackageIcon,
  Play,
  Pause,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
  Lock,
  ChevronRight,
  FileCode2,
  Layers,
  Briefcase,
  Sparkles,
  Target,
  MessageSquare,
  GitBranch,
  Circle,
  Clock,
} from "lucide-react";

import { AppSidebar } from "@/components/app/AppSidebar";
import { TopBar } from "@/components/app/TopBar";
import { ConstructorCanvas } from "@/components/app/ConstructorCanvas";
import {
  initialNodes,
  initialEdges,
  templates,
  buildQueue as initialQueue,
  buildSteps,
  dependencies,
  initialLogs,
} from "@/lib/mock-data";
import projectCover from "@/assets/project-cover.jpg";
import previewWorkspace from "@/assets/preview-workspace.jpg";

const NODE_ICONS: Record<string, any> = {
  career: Layers,
  job: Briefcase,
  trait: Sparkles,
  aspiration: Target,
  interaction: MessageSquare,
  logic: GitBranch,
};

export function Dashboard() {
  const [nodes] = useState(initialNodes);
  const [selectedId, setSelectedId] = useState<string | null>("n2");
  const [logs, setLogs] = useState(initialLogs);
  const [progress, setProgress] = useState(65);
  const [running, setRunning] = useState(true);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState({ errors: 0, warnings: 2, info: 7 });

  const selected = useMemo(() => nodes.find((n) => n.id === selectedId) ?? nodes[0], [nodes, selectedId]);

  // Simulate build progress
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 99) return 99;
        return Math.min(99, p + 0.4);
      });
    }, 900);
    return () => clearInterval(t);
  }, [running]);

  const runValidation = () => {
    setValidating(true);
    toast.info("Running validation…");
    setTimeout(() => {
      setValidation({ errors: 0, warnings: 1 + Math.floor(Math.random() * 3), info: 5 + Math.floor(Math.random() * 5) });
      setLogs((l) => [
        { t: new Date().toTimeString().slice(0, 8), level: "SUCCESS", msg: "Validation completed — no errors" },
        ...l,
      ]);
      setValidating(false);
      toast.success("Validation completed");
    }, 1200);
  };

  return (
    <div className="flex h-screen min-w-[1200px] overflow-hidden bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-y-auto scroll-thin">
          <div className="mx-auto max-w-[1600px] space-y-4 p-5">
            {/* Row 1: Current project + 3 health cards + quick actions */}
            <div className="grid grid-cols-12 gap-4">
              <CurrentProjectCard />
              <div className="col-span-12 grid grid-cols-3 gap-4 xl:col-span-6">
                <HealthCard label="Build Health" value={92} tone="success" status="Excellent" />
                <HealthCard label="Compatibility" value={88} tone="info" status="Good" />
                <HealthCard label="Package Completeness" value={76} tone="violet" status="Nearly There" />
              </div>
              <QuickActions onValidate={runValidation} />
            </div>

            {/* Row 2: Templates + Build queue + Live preview */}
            <div className="grid grid-cols-12 gap-4">
              <TemplatesCard />
              <BuildQueueCard progress={progress} />
              <LivePreviewCard selected={selected} />
            </div>

            {/* Row 3: Canvas + Metadata */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 xl:col-span-8">
                <ConstructorCanvas
                  nodes={nodes}
                  edges={initialEdges}
                  selectedId={selectedId}
                  onSelect={(id) => {
                    setSelectedId(id);
                    const n = nodes.find((x) => x.id === id);
                    if (n) toast(`Selected: ${n.subtitle}`);
                  }}
                />
              </div>
              <MetadataForm selected={selected} />
            </div>

            {/* Row 4: Validation + Dependencies + Build steps + Progress */}
            <div className="grid grid-cols-12 gap-4">
              <ValidationCard v={validation} running={validating} onRun={runValidation} />
              <DependencyCard />
              <BuildStepsCard progress={progress} />
              <BuildProgressCard
                progress={progress}
                running={running}
                onToggle={() => {
                  setRunning((r) => !r);
                  toast(running ? "Build paused" : "Build resumed");
                }}
                onCancel={() => {
                  setRunning(false);
                  setProgress(0);
                  toast.error("Build cancelled");
                }}
              />
            </div>

            {/* Row 5: Build log */}
            <BuildLog logs={logs} />
          </div>
        </main>
      </div>
    </div>
  );
}

/* ---------- cards ---------- */

function CurrentProjectCard() {
  return (
    <section className="surface-card col-span-12 flex overflow-hidden xl:col-span-4">
      <div className="relative h-full w-40 shrink-0 overflow-hidden">
        <img
          src={projectCover}
          alt="Project cover"
          className="h-full w-full object-cover"
          loading="eager"
          width={1024}
          height={1024}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/40" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              Current Project
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <Lock className="h-3 w-3" /> Private
            </span>
          </div>
          <h2 className="mt-2 truncate text-lg font-bold tracking-tight">Epic Careers Overhaul</h2>
          <div className="mt-1 flex flex-wrap gap-1">
            {["Gameplay", "Career", "Balance"].map((t) => (
              <span key={t} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
            A comprehensive rework of career trees, unlock logic, and progression pacing across ten branches.
          </p>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-2 text-[10px]">
          <MetaCell label="Version" value="0.9.2" />
          <MetaCell label="Target" value="Sims 4" />
          <MetaCell label="Modified" value="2m ago" />
        </div>
      </div>
    </section>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="truncate text-xs font-semibold">{value}</div>
    </div>
  );
}

function HealthCard({
  label,
  value,
  tone,
  status,
}: {
  label: string;
  value: number;
  tone: "success" | "info" | "violet";
  status: string;
}) {
  const trend = [40, 55, 48, 62, 58, 70, 66, 78, value];
  const max = Math.max(...trend);
  return (
    <div className="surface-card p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight tabular-nums">{value}%</span>
            <span
              className="text-[11px] font-semibold"
              style={{ color: `var(--color-${tone})` }}
            >
              {status}
            </span>
          </div>
        </div>
        <RingProgress value={value} tone={tone} />
      </div>
      <svg viewBox="0 0 100 24" className="mt-3 h-6 w-full">
        <polyline
          fill="none"
          stroke={`var(--color-${tone})`}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={trend
            .map((v, i) => `${(i / (trend.length - 1)) * 100},${24 - (v / max) * 22}`)
            .join(" ")}
        />
        <polyline
          fill={`color-mix(in oklab, var(--color-${tone}) 15%, transparent)`}
          stroke="none"
          points={`0,24 ${trend
            .map((v, i) => `${(i / (trend.length - 1)) * 100},${24 - (v / max) * 22}`)
            .join(" ")} 100,24`}
        />
      </svg>
    </div>
  );
}

function RingProgress({ value, tone, size = 44 }: { value: number; tone: string; size?: number }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-muted)" strokeWidth={4} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={`var(--color-${tone})`}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (value / 100) * c}
      />
    </svg>
  );
}

function QuickActions({ onValidate }: { onValidate: () => void }) {
  const items = [
    { label: "New Project", icon: Plus, tone: "primary", cb: () => toast.success("New project scaffold created") },
    { label: "Import Package", icon: Upload, tone: "info", cb: () => toast("Import dialog opened") },
    { label: "Validate Project", icon: ShieldCheck, tone: "violet", cb: onValidate },
    { label: "Build Package", icon: PackageIcon, tone: "success", cb: () => toast.success("Build enqueued") },
  ];
  return (
    <section className="surface-card col-span-12 flex flex-col p-4 xl:col-span-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Quick Actions</div>
      <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-1">
        {items.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={a.cb}
              className="group flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-left text-xs font-semibold transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className="grid h-7 w-7 place-items-center rounded-md"
                style={{ backgroundColor: `color-mix(in oklab, var(--color-${a.tone}) 15%, transparent)` }}
              >
                <Icon className="h-3.5 w-3.5" style={{ color: `var(--color-${a.tone})` }} />
              </span>
              <span className="truncate">{a.label}</span>
              <ChevronRight className="ml-auto h-3 w-3 text-muted-foreground transition group-hover:translate-x-0.5" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TemplatesCard() {
  const [active, setActive] = useState(0);
  return (
    <section className="surface-card col-span-12 p-4 xl:col-span-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">Recent Mod Templates</h3>
          <p className="text-[11px] text-muted-foreground">Start from a battle-tested scaffold</p>
        </div>
        <button className="text-[11px] font-semibold text-primary hover:underline">Browse all</button>
      </div>
      <ul className="mt-3 divide-y divide-border">
        {templates.map((t, i) => (
          <li key={t.name}>
            <button
              onClick={() => setActive(i)}
              className={[
                "flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition",
                active === i ? "bg-primary-soft" : "hover:bg-muted",
              ].join(" ")}
            >
              <div
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md"
                style={{ backgroundColor: `color-mix(in oklab, var(--color-${t.color}) 18%, transparent)` }}
              >
                <FileCode2 className="h-4 w-4" style={{ color: `var(--color-${t.color})` }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold">{t.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {t.type} · updated {t.updated}
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function BuildQueueCard({ progress }: { progress: number }) {
  return (
    <section className="surface-card col-span-12 p-4 xl:col-span-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">Build Queue</h3>
          <p className="text-[11px] text-muted-foreground">2 items · 1 building</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-2 py-0.5 text-[10px] font-semibold text-info">
          <Loader2 className="h-3 w-3 animate-spin" /> Live
        </span>
      </div>
      <div className="mt-3 space-y-2">
        <div className="rounded-lg border border-border bg-surface-2/60 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-info animate-pulse" />
              <span className="text-xs font-semibold">Epic Careers Overhaul</span>
            </div>
            <span className="font-mono text-[11px] font-semibold text-info">{Math.round(progress)}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-info to-primary transition-[width] duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Compiling scripts…</span>
            <span>ETA 00:42</span>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-dashed border-border bg-background/40 p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">trait-expansion-addon</span>
          </div>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            Queued
          </span>
        </div>
      </div>
    </section>
  );
}

function LivePreviewCard({ selected }: { selected: { subtitle: string; title: string } }) {
  return (
    <section className="surface-card col-span-12 overflow-hidden xl:col-span-4">
      <div className="relative h-40 w-full overflow-hidden">
        <img
          src={previewWorkspace}
          alt="Live preview"
          className="h-full w-full object-cover"
          loading="lazy"
          width={1024}
          height={768}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-semibold text-foreground backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-success" /> Live Preview
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {selected.title}
            </div>
            <div className="truncate text-sm font-bold">{selected.subtitle}</div>
          </div>
          <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
            Level 7
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
          {[
            { l: "Salary", v: "§4,820" },
            { l: "Skill Req", v: "Logic 6" },
            { l: "Hours", v: "9–5" },
          ].map((s) => (
            <div key={s.l} className="rounded-md border border-border bg-surface-2/50 py-1.5">
              <div className="uppercase tracking-wider text-muted-foreground">{s.l}</div>
              <div className="font-semibold text-foreground">{s.v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MetadataForm({ selected }: { selected: { title: string; subtitle: string; type: string } }) {
  return (
    <section className="surface-card col-span-12 flex flex-col p-4 xl:col-span-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">Mod Metadata</h3>
          <p className="text-[11px] text-muted-foreground">Editing node: {selected.subtitle}</p>
        </div>
        <span
          className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase"
          style={{
            backgroundColor: "color-mix(in oklab, var(--color-primary) 15%, transparent)",
            color: "var(--color-primary)",
          }}
        >
          {selected.type ?? "node"}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <Field label="Display Name" value="Epic Careers Overhaul" />
        <Field label="Internal Name" value="epic_careers_v6" mono />
        <Field label="Author" value="Mod Creator" />
        <Field label="Version" value="0.9.2" mono />
        <Field label="Build" value="build.318" mono />
        <Field label="Target Game" value="Sims 4" />
        <div className="col-span-2">
          <Label>Description</Label>
          <textarea
            className="mt-1 h-16 w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
            defaultValue="Rework of ten career branches with new job titles, unlock logic, and pacing curves."
          />
        </div>
        <div className="col-span-2">
          <Label>Tags</Label>
          <div className="mt-1 flex flex-wrap gap-1">
            {["career", "gameplay", "balance", "logic"].map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                #{t}
              </span>
            ))}
            <button className="rounded-md border border-dashed border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-primary hover:text-primary">
              + add
            </button>
          </div>
        </div>
        <div className="col-span-2 flex items-center justify-between rounded-md border border-border bg-surface-2/50 p-2">
          <div>
            <div className="text-[11px] font-semibold">Visibility</div>
            <div className="text-[10px] text-muted-foreground">Only you can see this project</div>
          </div>
          <div className="inline-flex overflow-hidden rounded-md border border-border">
            <button className="bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">Private</button>
            <button className="px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted">
              Unlisted
            </button>
            <button className="px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted">Public</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</div>;
}
function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        defaultValue={value}
        className={[
          "mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40",
          mono ? "font-mono text-[11px]" : "text-xs",
        ].join(" ")}
      />
    </div>
  );
}

function ValidationCard({
  v,
  running,
  onRun,
}: {
  v: { errors: number; warnings: number; info: number };
  running: boolean;
  onRun: () => void;
}) {
  const ok = v.errors === 0;
  return (
    <section className="surface-card col-span-12 p-4 md:col-span-6 xl:col-span-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Validation Results</h3>
        <button
          onClick={onRun}
          disabled={running}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-semibold hover:bg-muted disabled:opacity-60"
        >
          {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
          {running ? "Running" : "Run"}
        </button>
      </div>
      <div
        className="mt-3 flex items-center gap-2 rounded-lg p-2"
        style={{
          backgroundColor: ok
            ? "color-mix(in oklab, var(--color-success) 12%, transparent)"
            : "color-mix(in oklab, var(--color-destructive) 12%, transparent)",
        }}
      >
        <CheckCircle2 className="h-5 w-5" style={{ color: ok ? "var(--color-success)" : "var(--color-destructive)" }} />
        <div>
          <div className="text-sm font-bold" style={{ color: ok ? "var(--color-success)" : "var(--color-destructive)" }}>
            {ok ? "All Good" : "Errors found"}
          </div>
          <div className="text-[10px] text-muted-foreground">Last run just now</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <StatChip icon={X} tone="destructive" value={v.errors} label="Errors" />
        <StatChip icon={AlertTriangle} tone="warning" value={v.warnings} label="Warnings" />
        <StatChip icon={Info} tone="info" value={v.info} label="Info" />
      </div>
    </section>
  );
}

function StatChip({ icon: Icon, tone, value, label }: any) {
  return (
    <div className="rounded-md border border-border bg-surface-2/50 py-2">
      <Icon className="mx-auto h-3.5 w-3.5" style={{ color: `var(--color-${tone})` }} />
      <div className="mt-1 text-sm font-bold tabular-nums">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function DependencyCard() {
  return (
    <section className="surface-card col-span-12 p-4 md:col-span-6 xl:col-span-3">
      <h3 className="text-sm font-bold">Dependency Checker</h3>
      <p className="text-[11px] text-muted-foreground">4 packages resolved</p>
      <ul className="mt-3 space-y-1.5">
        {dependencies.map((d) => {
          const satisfied = d.status === "satisfied";
          return (
            <li
              key={d.name}
              className="flex items-center justify-between rounded-md border border-border bg-surface-2/40 px-2 py-1.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                {satisfied ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold">{d.name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{d.version}</div>
                </div>
              </div>
              <span
                className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
                style={{
                  backgroundColor: satisfied
                    ? "color-mix(in oklab, var(--color-success) 15%, transparent)"
                    : "color-mix(in oklab, var(--color-muted-foreground) 15%, transparent)",
                  color: satisfied ? "var(--color-success)" : "var(--color-muted-foreground)",
                }}
              >
                {satisfied ? "OK" : "Optional"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function BuildStepsCard({ progress }: { progress: number }) {
  const steps = buildSteps.map((s, i) => {
    // final state derives from progress
    if (progress >= 99) return { ...s, state: "done" as const };
    if (i < 4) return s;
    if (i === 4) return { ...s, state: progress > 0 ? ("active" as const) : ("pending" as const) };
    return s;
  });
  return (
    <section className="surface-card col-span-12 p-4 md:col-span-6 xl:col-span-3">
      <h3 className="text-sm font-bold">Build Steps</h3>
      <p className="text-[11px] text-muted-foreground">Pipeline · 6 stages</p>
      <ol className="mt-3 space-y-2">
        {steps.map((s, i) => (
          <li key={s.name} className="flex items-center gap-2">
            <span
              className={[
                "grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold",
                s.state === "done"
                  ? "bg-success text-success-foreground"
                  : s.state === "active"
                  ? "bg-info text-info-foreground animate-pulse"
                  : "bg-muted text-muted-foreground",
              ].join(" ")}
            >
              {s.state === "done" ? "✓" : i + 1}
            </span>
            <span
              className={[
                "text-xs",
                s.state === "pending" ? "text-muted-foreground" : "font-semibold text-foreground",
              ].join(" ")}
            >
              {s.name}
            </span>
            {s.state === "active" && (
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-info">
                <Loader2 className="h-3 w-3 animate-spin" /> In progress
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function BuildProgressCard({
  progress,
  running,
  onToggle,
  onCancel,
}: {
  progress: number;
  running: boolean;
  onToggle: () => void;
  onCancel: () => void;
}) {
  const size = 120;
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const secondsElapsed = Math.round((progress / 100) * 240);
  const mm = String(Math.floor(secondsElapsed / 60)).padStart(2, "0");
  const ss = String(secondsElapsed % 60).padStart(2, "0");
  return (
    <section className="surface-card col-span-12 flex flex-col items-center p-4 md:col-span-6 xl:col-span-3">
      <div className="flex w-full items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">Building</h3>
          <p className="text-[11px] text-muted-foreground">Epic Careers Overhaul</p>
        </div>
        <span
          className={[
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
            running ? "bg-info/15 text-info" : "bg-muted text-muted-foreground",
          ].join(" ")}
        >
          <span
            className={["h-1.5 w-1.5 rounded-full", running ? "bg-info animate-pulse" : "bg-muted-foreground"].join(
              " ",
            )}
          />
          {running ? "Running" : "Paused"}
        </span>
      </div>
      <div className="relative my-3">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-muted)" strokeWidth={8} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="url(#buildGrad)"
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (progress / 100) * c}
            style={{ transition: "stroke-dashoffset 0.7s ease" }}
          />
          <defs>
            <linearGradient id="buildGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" />
              <stop offset="100%" stopColor="var(--color-info)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-2xl font-bold tabular-nums">{Math.round(progress)}%</div>
            <div className="font-mono text-[10px] text-muted-foreground">
              {mm}:{ss} elapsed
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-full gap-2">
        <button
          onClick={onToggle}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-primary py-1.5 text-xs font-bold text-primary-foreground transition hover:opacity-90"
        >
          {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {running ? "Pause" : "Resume"}
        </button>
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
        >
          <X className="h-3.5 w-3.5" /> Cancel
        </button>
      </div>
    </section>
  );
}

function BuildLog({ logs }: { logs: { t: string; level: string; msg: string }[] }) {
  const tone: Record<string, string> = {
    INFO: "info",
    WARN: "warning",
    SUCCESS: "success",
    ERROR: "destructive",
  };
  return (
    <section className="surface-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-surface-2/40 px-4 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold">Build Log</h3>
          <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {logs.length} entries
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-info" /> INFO
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-warning" /> WARN
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> SUCCESS
          </span>
        </div>
      </div>
      <div className="max-h-56 overflow-y-auto bg-background/40 font-mono text-[11px] scroll-thin">
        {logs.map((l, i) => {
          const t = tone[l.level] ?? "muted-foreground";
          return (
            <div
              key={i}
              className="flex items-start gap-3 border-b border-border/60 px-4 py-1.5 last:border-b-0 hover:bg-muted/50"
            >
              <span className="w-16 shrink-0 text-muted-foreground">{l.t}</span>
              <span
                className="w-16 shrink-0 rounded px-1.5 text-center text-[10px] font-bold"
                style={{
                  backgroundColor: `color-mix(in oklab, var(--color-${t}) 15%, transparent)`,
                  color: `var(--color-${t})`,
                }}
              >
                {l.level}
              </span>
              <span className="min-w-0 flex-1 text-foreground">{l.msg}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
