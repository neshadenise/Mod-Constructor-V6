import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PlayCircle,
  Pause,
  Plus,
  Upload,
  FileCode2,
  GitBranch,
  Package,
  Zap,
  Eye,
  Terminal,
  Clock,
  ArrowUpRight,
  Layers3,
  Sparkles,
  Briefcase,
  Target,
} from "lucide-react";
import { Canvas } from "./Canvas";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAdvanced } from "@/lib/advanced-mode";

export function Dashboard() {
  const { advanced } = useAdvanced();
  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Studio Dashboard
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Welcome back, Alex. <span className="text-muted-foreground font-medium">3 builds in flight.</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent">
            <Upload className="h-3.5 w-3.5" /> Import
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> New Mod
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <CurrentProject />
        <MetricCard title="Build Health" value={92} accent="green" icon={Activity} sub="+4% since yesterday" />
        <MetricCard title="Compatibility" value={88} accent="blue" icon={GitBranch} sub="7 mods scanned" />
        <MetricCard title="Package Completeness" value={76} accent="orange" icon={Package} sub="18 assets missing" />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <QuickActions />
        <RecentTemplates />
        <BuildQueue />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8 space-y-4">
          <SectionCard
            title="Constructor Canvas"
            subtitle={advanced ? "Drag nodes, connect flows. Selected: Tuning XML" : "How the parts of your mod fit together"}
            icon={Layers3}
            accent="blue"
            action={advanced ? "Fit to view" : undefined}
          >
            <Canvas />
          </SectionCard>

          {advanced ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <ValidationResults />
                <DependencyChecker />
              </div>
              <BuildLog />
            </>
          ) : (
            <ValidationResults />
          )}
        </div>

        <div className="col-span-4 space-y-4">
          <ProgressRing />
          <BuildSteps />
          <ModMetadata />
          <LivePreview />
        </div>
      </div>

      <footer className="pt-2 text-center text-[11px] text-muted-foreground">
        Mod Constructor V6 · Desktop Edition · {advanced ? "Advanced mode" : "Simple mode"}
      </footer>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  accent,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  accent: "blue" | "teal" | "green" | "orange" | "violet";
  action?: string;
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
          <button className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent">
            {action} <ArrowUpRight className="h-3 w-3" />
          </button>
        )}
      </header>
      {children}
    </section>
  );
}

function CurrentProject() {
  return (
    <section className="col-span-6 relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card via-card to-[color-mix(in_oklab,var(--blue)_8%,var(--card))] p-5 card-elevated">
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[var(--teal)]/20 blur-3xl" />
      <div className="absolute -bottom-24 -right-8 h-56 w-56 rounded-full bg-[var(--violet)]/15 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--blue)]">
              Current Project
            </div>
            <h2 className="mt-1 text-xl font-bold tracking-tight">Epic Careers Overhaul</h2>
            <div className="mt-1 text-xs text-muted-foreground">
              v2.4.1-beta · Sims 4 · 14 careers · 6 traits · 3 aspirations
            </div>
          </div>
          <span className="rounded-full border border-[var(--orange)]/30 bg-[var(--orange)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--orange)]">
            Beta
          </span>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-3">
          {[
            { label: "Careers", val: "14", icon: Briefcase, c: "blue" },
            { label: "Traits", val: "6", icon: Sparkles, c: "violet" },
            { label: "Aspirations", val: "3", icon: Target, c: "teal" },
            { label: "Assets", val: "142", icon: FileCode2, c: "orange" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-lg border border-border bg-background/60 p-2.5">
                <Icon className="h-3.5 w-3.5" style={{ color: `var(--${s.c})` }} />
                <div className="mt-1.5 text-lg font-bold tabular-nums leading-none">{s.val}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-md bg-[var(--blue)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90">
            <PlayCircle className="h-3.5 w-3.5" /> Continue Building
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent">
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
          <div className="ml-auto text-[11px] text-muted-foreground">
            Last edit · 2 min ago by <span className="font-medium text-foreground">Alex</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  title,
  value,
  accent,
  icon: Icon,
  sub,
}: {
  title: string;
  value: number;
  accent: "green" | "blue" | "orange";
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  sub: string;
}) {
  return (
    <div className="col-span-2 rounded-xl border border-border bg-card p-4 card-elevated">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <div
          className="flex h-6 w-6 items-center justify-center rounded-md"
          style={{ backgroundColor: `color-mix(in oklab, var(--${accent}) 15%, transparent)` }}
        >
          <Icon className="h-3 w-3" style={{ color: `var(--${accent})` }} />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-3xl font-bold tabular-nums tracking-tight">{value}</span>
        <span className="text-sm font-semibold text-muted-foreground">%</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, backgroundColor: `var(--${accent})` }}
        />
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function QuickActions() {
  const actions = [
    { label: "New Career", icon: Briefcase, c: "blue" },
    { label: "New Trait", icon: Sparkles, c: "violet" },
    { label: "New Aspiration", icon: Target, c: "teal" },
    { label: "Import Package", icon: Upload, c: "orange" },
    { label: "Compile Now", icon: Zap, c: "green" },
    { label: "Validate All", icon: CheckCircle2, c: "blue" },
  ];
  return (
    <SectionCard title="Quick Actions" icon={Zap} accent="orange" className="col-span-4">
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
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

function RecentTemplates() {
  const items = [
    { name: "Career: Astronaut Path", meta: "Blueprint · 12 tunings", c: "blue" },
    { name: "Trait: Lucid Dreamer", meta: "Buff bundle · v1.2", c: "violet" },
    { name: "Aspiration: Trailblazer", meta: "4 tiers · complete", c: "teal" },
    { name: "Career: Marine Biologist", meta: "Draft · 8 tunings", c: "green" },
  ];
  return (
    <SectionCard title="Recent Mod Templates" icon={Layers3} accent="violet" action="Browse all" className="col-span-4">
      <ul className="space-y-1.5">
        {items.map((it) => (
          <li
            key={it.name}
            className="flex items-center gap-2.5 rounded-md border border-transparent px-2 py-1.5 hover:border-border hover:bg-accent/40"
          >
            <div className="h-8 w-1 rounded-full" style={{ backgroundColor: `var(--${it.c})` }} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold">{it.name}</div>
              <div className="truncate text-[10px] text-muted-foreground">{it.meta}</div>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function BuildQueue() {
  const rows = [
    { name: "epic_careers.package", stage: "Compiling", pct: 65, c: "blue", state: "run" },
    { name: "lucid_traits.package", stage: "Queued", pct: 0, c: "orange", state: "wait" },
    { name: "trailblazer_asp.package", stage: "Validated", pct: 100, c: "green", state: "done" },
  ];
  return (
    <SectionCard title="Build Queue" icon={Clock} accent="teal" action="Manage" className="col-span-4">
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.name} className="rounded-md border border-border bg-background/60 p-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="truncate font-mono font-medium">{r.name}</span>
              <span
                className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={{
                  color: `var(--${r.c})`,
                  backgroundColor: `color-mix(in oklab, var(--${r.c}) 12%, transparent)`,
                }}
              >
                {r.state === "run" && <PlayCircle className="h-2.5 w-2.5" />}
                {r.state === "wait" && <Pause className="h-2.5 w-2.5" />}
                {r.state === "done" && <CheckCircle2 className="h-2.5 w-2.5" />}
                {r.stage}
              </span>
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full" style={{ width: `${r.pct}%`, backgroundColor: `var(--${r.c})` }} />
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function ValidationResults() {
  const items = [
    { level: "ok", msg: "All tuning IDs unique", src: "tuning/*.xml", icon: CheckCircle2, c: "green" },
    { level: "warn", msg: "Missing STBL for 3 strings", src: "strings/en_US.stbl", icon: AlertTriangle, c: "orange" },
    { level: "err", msg: "Ref chain broken: 0xA112E8", src: "career_astro.xml", icon: XCircle, c: "destructive" },
    { level: "ok", msg: "Manifest schema valid", src: "manifest.json", icon: CheckCircle2, c: "green" },
  ];
  return (
    <SectionCard title="Validation Results" subtitle="4 checks · 1 error" icon={CheckCircle2} accent="green" action="Re-run">
      <ul className="space-y-1.5 text-xs">
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <li key={i} className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-accent/40">
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: `var(--${it.c})` }} />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{it.msg}</div>
                <div className="font-mono text-[10px] text-muted-foreground">{it.src}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

function DependencyChecker() {
  const deps = [
    { name: "XML Injector", ver: "v4.13", status: "ok" },
    { name: "MC Command Center", ver: "v9.2.1", status: "ok" },
    { name: "Basemental Drugs", ver: "v12.6", status: "warn" },
    { name: "UI Cheats Extension", ver: "v1.35", status: "missing" },
  ];
  return (
    <SectionCard title="Dependency Checker" subtitle="4 mods scanned" icon={GitBranch} accent="blue" action="Refresh">
      <ul className="space-y-1.5">
        {deps.map((d) => {
          const color = d.status === "ok" ? "green" : d.status === "warn" ? "orange" : "destructive";
          return (
            <li key={d.name} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent/40">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: `var(--${color})`, boxShadow: `0 0 8px var(--${color})` }}
              />
              <span className="font-medium">{d.name}</span>
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">{d.ver}</span>
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
    </SectionCard>
  );
}

function BuildLog() {
  const lines = [
    { t: "10:42:03", tag: "INFO", msg: "Starting build for epic_careers.package", c: "blue" },
    { t: "10:42:04", tag: "STEP", msg: "Resolving 142 tuning references…", c: "violet" },
    { t: "10:42:06", tag: "OK", msg: "Trait bundle compiled (6/6)", c: "green" },
    { t: "10:42:07", tag: "WARN", msg: "STBL missing 3 keys → generating placeholders", c: "orange" },
    { t: "10:42:09", tag: "STEP", msg: "Writing DBPF · 0xCB5FDDC7", c: "violet" },
    { t: "10:42:11", tag: "INFO", msg: "Build 65% · 92MB / 141MB", c: "blue" },
  ];
  return (
    <SectionCard title="Build Log" subtitle="Live stream · epic_careers" icon={Terminal} accent="violet" action="Clear">
      <div className="rounded-md border border-border bg-[color-mix(in_oklab,var(--foreground)_4%,var(--card))] p-3 font-mono text-[11px] leading-relaxed">
        {lines.map((l, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-muted-foreground">{l.t}</span>
            <span className="font-bold" style={{ color: `var(--${l.c})` }}>
              [{l.tag}]
            </span>
            <span className="text-foreground/85">{l.msg}</span>
          </div>
        ))}
        <div className="mt-1 flex items-center gap-1 text-muted-foreground">
          <span className="inline-block h-3 w-1.5 animate-pulse bg-[var(--teal)]" /> streaming…
        </div>
      </div>
    </SectionCard>
  );
}

function ProgressRing() {
  const pct = 65;
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <section className="rounded-xl border border-border bg-card p-4 card-elevated">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Build Progress</div>
          <div className="text-[11px] text-muted-foreground">epic_careers.package</div>
        </div>
        <button className="rounded-md bg-[var(--orange)]/10 px-2 py-1 text-[10px] font-semibold uppercase text-[var(--orange)]">
          Building
        </button>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative h-32 w-32">
          <svg className="h-full w-full -rotate-90">
            <circle cx="64" cy="64" r={r} strokeWidth="10" className="fill-none stroke-muted" />
            <circle
              cx="64"
              cy="64"
              r={r}
              strokeWidth="10"
              strokeLinecap="round"
              className="fill-none"
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
            <div className="text-3xl font-bold tabular-nums tracking-tight">{pct}%</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Compiling</div>
          </div>
        </div>
        <div className="flex-1 space-y-1.5 text-xs">
          <MiniStat label="Elapsed" val="00:08.2" />
          <MiniStat label="ETA" val="00:04.4" />
          <MiniStat label="Files" val="94 / 142" />
          <MiniStat label="Size" val="92 MB" />
        </div>
      </div>
    </section>
  );
}

function MiniStat({ label, val }: { label: string; val: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted/60 px-2 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-semibold tabular-nums">{val}</span>
    </div>
  );
}

function BuildSteps() {
  const steps = [
    { name: "Parse manifest", state: "done" },
    { name: "Resolve dependencies", state: "done" },
    { name: "Compile tunings", state: "done" },
    { name: "Package DBPF", state: "run" },
    { name: "Validate output", state: "wait" },
    { name: "Sign & finalize", state: "wait" },
  ];
  return (
    <SectionCard title="Build Steps" icon={PlayCircle} accent="teal">
      <ol className="space-y-1">
        {steps.map((s, i) => (
          <li key={s.name} className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 text-xs">
            <div
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                s.state === "done" && "bg-[var(--green)] text-white",
                s.state === "run" && "bg-[var(--blue)] text-white animate-pulse",
                s.state === "wait" && "border border-border bg-muted text-muted-foreground",
              )}
            >
              {s.state === "done" ? "✓" : i + 1}
            </div>
            <span className={cn("flex-1 font-medium", s.state === "wait" && "text-muted-foreground")}>
              {s.name}
            </span>
            {s.state === "run" && (
              <span className="text-[10px] font-semibold uppercase text-[var(--blue)]">Active</span>
            )}
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}

function ModMetadata() {
  return (
    <SectionCard title="Mod Metadata" icon={FileCode2} accent="orange">
      <div className="grid grid-cols-2 gap-2.5 text-xs">
        <Field label="Name" value="Epic Careers Overhaul" />
        <Field label="Version" value="2.4.1-beta" />
        <Field label="Author" value="Alex Kern" />
        <Field label="Game" value="Sims 4" />
        <div className="col-span-2">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Description
          </label>
          <Textarea
            defaultValue="Overhauls 14 base-game careers with unique promotion tracks, custom traits, and aspiration integrations."
            className="h-16 resize-none text-xs"
          />
        </div>
        <div className="col-span-2 flex flex-wrap gap-1.5">
          {["career", "trait", "aspiration", "gameplay", "overhaul"].map((t) => (
            <span
              key={t}
              className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              #{t}
            </span>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <Input defaultValue={value} className="h-8 text-xs" />
    </div>
  );
}

function LivePreview() {
  return (
    <SectionCard title="Live Preview" subtitle="Astronaut · Rank 3" icon={Eye} accent="blue" action="Pop out">
      <div className="overflow-hidden rounded-lg border border-border bg-gradient-to-br from-[color-mix(in_oklab,var(--blue)_10%,var(--card))] to-[color-mix(in_oklab,var(--violet)_10%,var(--card))] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--blue)] text-white shadow-md">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-bold">Interstellar Navigator</div>
            <div className="text-[11px] text-muted-foreground">Astronaut Career · Space Ranger branch</div>
          </div>
        </div>
        <div className="mt-3 space-y-1.5 text-[11px]">
          <PreviewLine label="Salary" val="§4,280 / day" />
          <PreviewLine label="Hours" val="09:00 → 17:00" />
          <PreviewLine label="Perk" val="+2 Logic per work hour" />
          <PreviewLine label="Requires" val="Logic 8 · Fitness 6" />
        </div>
      </div>
    </SectionCard>
  );
}

function PreviewLine({ label, val }: { label: string; val: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-background/60 px-2 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-semibold">{val}</span>
    </div>
  );
}
