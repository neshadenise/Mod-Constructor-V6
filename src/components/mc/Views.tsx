import { useState } from "react";
import {
  Briefcase,
  Sparkles,
  Target,
  Sliders,
  Boxes,
  ShieldCheck,
  ListChecks,
  Settings as SettingsIcon,
  FolderKanban,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Upload,
  FileCode2,
  Save,
  Wand2,
  FolderSearch,
  FolderOpen,
  Radar,
  Apple,
  MonitorCog,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAdvanced } from "@/lib/advanced-mode";
import { CopyToMenu } from "./CopyToMenu";
import type { SectionId } from "./sections";
import { PreviewSplit } from "./preview/PreviewShell";
import { CareerPreview, type CareerPreviewData } from "./preview/CareerPreview";
import { TraitPreview, type TraitPreviewData } from "./preview/TraitPreview";
import { AspirationPreview, type AspirationPreviewData } from "./preview/AspirationPreview";
import { NotificationLibrary } from "./preview/NotificationLibrary";

/* ---------- Shared shell for builder pages ---------- */

function PageHeader({
  icon: Icon,
  title,
  subtitle,
  accent,
  actions,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  subtitle: string;
  accent: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-4">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-sm"
          style={{ backgroundColor: `var(--${accent})` }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {subtitle}
          </div>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

function Card({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-4 card-elevated", className)}>
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between">
          {title && <div className="text-sm font-semibold">{title}</div>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <Input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-8 text-xs"
      />
      {hint && <div className="mt-1 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function PrimaryBtn({
  icon: Icon,
  children,
  onClick,
}: {
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md bg-[var(--blue)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
    >
      {Icon && <Icon className="h-3.5 w-3.5" />} {children}
    </button>
  );
}
function GhostBtn({
  icon: Icon,
  children,
  onClick,
}: {
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
    >
      {Icon && <Icon className="h-3.5 w-3.5" />} {children}
    </button>
  );
}

/* ---------- Projects ---------- */

const PROJECTS = [
  { name: "Epic Careers Overhaul", ver: "2.4.1-beta", type: "Career", updated: "2m ago", status: "Building", c: "blue" },
  { name: "Lucid Dreamer Traits", ver: "1.2.0", type: "Trait", updated: "1h ago", status: "Draft", c: "violet" },
  { name: "Trailblazer Aspirations", ver: "1.0.0", type: "Aspiration", updated: "yesterday", status: "Validated", c: "teal" },
  { name: "Marine Biologist Career", ver: "0.4.0", type: "Career", updated: "3d ago", status: "Draft", c: "green" },
  { name: "Weathercore Overhaul", ver: "0.9.2", type: "Tuning", updated: "1w ago", status: "Archived", c: "orange" },
];

function ProjectsView() {
  return (
    <div className="space-y-4">
      <PageHeader
        icon={FolderKanban}
        subtitle="Local Workspace"
        title="Projects"
        accent="blue"
        actions={
          <>
            <GhostBtn icon={Upload}>Import</GhostBtn>
            <PrimaryBtn icon={Plus} onClick={() => toast.success("New project draft created")}>
              New Project
            </PrimaryBtn>
          </>
        }
      />

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Filter projects…" className="h-8 pl-8 text-xs" />
        </div>
        <GhostBtn icon={Filter}>All Types</GhostBtn>
        <GhostBtn icon={Filter}>All Status</GhostBtn>
      </div>

      <Card>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="pb-2 pl-2">Name</th>
              <th className="pb-2">Type</th>
              <th className="pb-2">Version</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {PROJECTS.map((p) => (
              <tr key={p.name} className="border-t border-border/60 hover:bg-accent/40">
                <td className="py-2 pl-2">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-1 rounded" style={{ backgroundColor: `var(--${p.c})` }} />
                    <span className="font-semibold">{p.name}</span>
                  </div>
                </td>
                <td className="py-2 text-muted-foreground">{p.type}</td>
                <td className="py-2 font-mono">{p.ver}</td>
                <td className="py-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                    style={{
                      color: `var(--${p.c})`,
                      backgroundColor: `color-mix(in oklab, var(--${p.c}) 12%, transparent)`,
                    }}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="py-2 text-muted-foreground">{p.updated}</td>
                <td className="py-2 pr-2 text-right">
                  <button className="rounded p-1 hover:bg-accent">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ---------- Career Builder ---------- */

const CAREER_BRANCHES: Record<
  string,
  {
    ranks: { lvl: number; title: string; pay: string; req: string }[];
    perks: { name: string; tier: number }[];
  }
> = {
  Astronaut: {
    ranks: [
      { lvl: 1, title: "Junior Cadet", pay: "§420", req: "—" },
      { lvl: 2, title: "Navigator", pay: "§820", req: "Logic 3" },
      { lvl: 3, title: "Space Ranger", pay: "§1,640", req: "Logic 5 · Fitness 3" },
      { lvl: 4, title: "Commander", pay: "§2,880", req: "Logic 7 · Fitness 5" },
      { lvl: 5, title: "Admiral", pay: "§4,280", req: "Logic 9 · Fitness 7" },
    ],
    perks: [
      { name: "+2 Logic per work hour", tier: 1 },
      { name: "Unlock Cosmic Insight moodlet", tier: 3 },
      { name: "Free Rocket Ship at Rank 5", tier: 5 },
    ],
  },
  "Interstellar Smuggler": {
    ranks: [
      { lvl: 1, title: "Dock Runner", pay: "§380", req: "—" },
      { lvl: 2, title: "Cargo Hauler", pay: "§780", req: "Mischief 2" },
      { lvl: 3, title: "Fixer", pay: "§1,540", req: "Mischief 5" },
      { lvl: 4, title: "Kingpin", pay: "§2,900", req: "Mischief 7 · Charisma 4" },
      { lvl: 5, title: "Ghost Captain", pay: "§4,600", req: "Mischief 9 · Charisma 6" },
    ],
    perks: [
      { name: "+1 Mischief per shift", tier: 1 },
      { name: "Contraband cache moodlet", tier: 3 },
      { name: "Cloaked cargo ship at Rank 5", tier: 5 },
    ],
  },
};

function CareerBuilder() {
  const { advanced } = useAdvanced();
  const [name, setName] = useState("Interstellar Navigator");
  const [track, setTrack] = useState("Astronaut");
  const [salary, setSalary] = useState("4280");
  const [branch, setBranch] = useState<keyof typeof CAREER_BRANCHES>("Astronaut");
  const data = CAREER_BRANCHES[branch];

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Briefcase}
        subtitle="Builder"
        title="Career Builder"
        accent="blue"
        actions={
          <>
            <GhostBtn icon={Wand2} onClick={() => toast("Applied Astronaut template")}>Template</GhostBtn>
            <GhostBtn icon={Save} onClick={() => toast.success("Career draft saved")}>Save Draft</GhostBtn>
            <PrimaryBtn icon={Play} onClick={() => toast.success("Career compiled → epic_careers.package")}>
              Compile
            </PrimaryBtn>
          </>
        }
      />

      {!advanced && (
        <div className="rounded-lg border border-[var(--blue)]/25 bg-[var(--blue)]/5 px-3 py-2 text-[11px] text-muted-foreground">
          Fill out the name, salary, and rank titles. Everything else is handled for you — enable Advanced mode if you want to edit IDs or raw XML.
        </div>
      )}

      {/* Branch tab strip */}
      <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 p-1">
        {(Object.keys(CAREER_BRANCHES) as (keyof typeof CAREER_BRANCHES)[]).map((b) => (
          <button
            key={b}
            onClick={() => setBranch(b)}
            className={cn(
              "rounded-md px-2.5 py-1 text-[11.5px] font-semibold transition-all",
              b === branch
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {b}
          </button>
        ))}
        <button
          onClick={() => toast("New branch scaffolded")}
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent/60"
        >
          <Plus className="h-3 w-3" /> New branch
        </button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card title="Career Identity" className="col-span-7">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Career Name" value={name} onChange={setName} />
            <Field label="Track" value={track} onChange={setTrack} hint="Astronaut · Business · Culinary…" />
            {advanced && (
              <Field label="Internal ID" value="career_interstellar_navigator" hint="Snake_case, must be unique" />
            )}
            <Field label="Category" value="Technical" />
            <div>
              <Field label="Base Salary (§)" value={salary} onChange={setSalary} />
              <div className="mt-1 flex justify-end">
                <CopyToMenu what="salary & hours" label="Copy salary & hours to…" />
              </div>
            </div>
            <Field label="Work Hours" value="09:00 → 17:00" />
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </label>
              <Textarea
                defaultValue="Chart deep-space routes and command the fleet. Requires strong Logic and Fitness."
                className="h-20 resize-none text-xs"
              />
            </div>
          </div>
        </Card>

        <Card
          title={`Promotion Track · ${branch}`}
          className="col-span-5"
          action={<CopyToMenu what={`${branch} branch`} label="Copy branch to…" />}
        >
          <ol className="space-y-1.5 text-xs">
            {data.ranks.map((r) => (
              <li
                key={r.lvl}
                className="group flex items-center gap-2 rounded-md border border-border bg-background/60 px-2.5 py-1.5"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--blue)]/15 text-[10px] font-bold text-[var(--blue)]">
                  {r.lvl}
                </span>
                <span className="flex-1 font-medium">{r.title}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{r.req}</span>
                <span className="font-mono font-semibold">{r.pay}</span>
                <span className="opacity-0 transition-opacity group-hover:opacity-100">
                  <CopyToMenu what={`rank "${r.title}"`} compact />
                </span>
              </li>
            ))}
          </ol>
          <button className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-1.5 text-[11px] text-muted-foreground hover:bg-accent">
            <Plus className="h-3 w-3" /> Add Rank
          </button>
        </Card>

        <Card
          title="Perks & Rewards"
          className={advanced ? "col-span-6" : "col-span-12"}
          action={<CopyToMenu what="all perks" label="Copy all perks to…" />}
        >
          <ul className="space-y-1.5 text-xs">
            {data.perks.map((p) => (
              <li key={p.name} className="group flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[var(--violet)]" />
                <span className="flex-1">{p.name}</span>
                <span className="rounded bg-background px-1.5 py-0.5 font-mono text-[10px]">Tier {p.tier}</span>
                <span className="opacity-0 transition-opacity group-hover:opacity-100">
                  <CopyToMenu what={`perk "${p.name}"`} compact />
                </span>
              </li>
            ))}
          </ul>
        </Card>


        {advanced && (
          <Card title="XML Output" className="col-span-6">
            <pre className="max-h-56 overflow-auto rounded-md border border-border bg-[color-mix(in_oklab,var(--foreground)_4%,var(--card))] p-3 font-mono text-[10.5px] leading-relaxed text-foreground/85">
{`<Career id="0xA112E8" name="career_interstellar_navigator">
  <Track>Astronaut</Track>
  <Salary>4280</Salary>
  <Hours start="09:00" end="17:00" />
  <Ranks count="5">
    <Rank level="1" title="Junior Cadet" pay="420" />
    <Rank level="5" title="Admiral" pay="4280" req="Logic 9, Fitness 7" />
  </Ranks>
</Career>`}
            </pre>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ---------- Trait Builder ---------- */

function TraitBuilder() {
  const { advanced } = useAdvanced();
  return (
    <div className="space-y-4">
      <PageHeader
        icon={Sparkles}
        subtitle="Builder"
        title="Trait Builder"
        accent="violet"
        actions={
          <>
            <GhostBtn icon={Wand2}>Template</GhostBtn>
            <GhostBtn icon={Save} onClick={() => toast.success("Trait saved")}>Save Draft</GhostBtn>
            <PrimaryBtn icon={Play} onClick={() => toast.success("Trait compiled")}>Compile</PrimaryBtn>
          </>
        }
      />
      <div className="grid grid-cols-12 gap-4">
        <Card title="Trait Definition" className="col-span-7">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Trait Name" value="Lucid Dreamer" />
            <Field label="Category" value="Emotional" />
            {advanced && <Field label="Internal ID" value="trait_lucid_dreamer" />}
            {advanced && <Field label="Icon Reference" value="ic_trait_lucid.png" />}
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </label>
              <Textarea
                defaultValue="This Sim experiences vivid dreams that grant temporary skill boosts on waking."
                className="h-16 resize-none text-xs"
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Conflicts With
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Insomniac", "Hot-Headed", "Gloomy"].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium"
                >
                  ⊘ {t}
                </span>
              ))}
              <button className="rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-accent">
                + Add
              </button>
            </div>
          </div>
        </Card>

        <Card
          title="Buffs & Moodlets"
          className="col-span-5"
          action={<CopyToMenu what="all buffs" label="Copy buffs to…" disallowBranches />}
        >
          <ul className="space-y-1.5 text-xs">
            {[
              { name: "Well-Rested Focus", dur: "6h", mood: "Focused +2", c: "blue" },
              { name: "Dream Recall", dur: "3h", mood: "Inspired +1", c: "violet" },
              { name: "Foggy Morning", dur: "2h", mood: "Tense +1", c: "orange" },
            ].map((b) => (
              <li key={b.name} className="rounded-md border border-border bg-background/60 p-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{b.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{b.dur}</span>
                </div>
                <div className="mt-0.5 text-[10.5px]" style={{ color: `var(--${b.c})` }}>
                  {b.mood}
                </div>
              </li>
            ))}
          </ul>
          <button className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-1.5 text-[11px] text-muted-foreground hover:bg-accent">
            <Plus className="h-3 w-3" /> Add Buff
          </button>
        </Card>
      </div>
    </div>
  );
}

/* ---------- Aspiration Builder ---------- */

function AspirationBuilder() {
  return (
    <div className="space-y-4">
      <PageHeader
        icon={Target}
        subtitle="Builder"
        title="Aspiration Builder"
        accent="teal"
        actions={
          <>
            <GhostBtn icon={Save}>Save</GhostBtn>
            <PrimaryBtn icon={Play}>Compile</PrimaryBtn>
          </>
        }
      />
      <div className="grid grid-cols-12 gap-4">
        <Card title="Aspiration" className="col-span-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" value="Trailblazer" />
            <Field label="Category" value="Adventure" />
            <Field label="Bonus Trait" value="Explorer's Instinct" />
            <Field label="Icon" value="ic_asp_trailblazer.png" />
          </div>
          <Textarea
            defaultValue="Chart the unknown and become a legend across the map."
            className="mt-3 h-16 resize-none text-xs"
          />
        </Card>

        <Card
          title="Tiers"
          className="col-span-7"
          action={<CopyToMenu what="all tiers & rewards" label="Copy tiers to…" disallowBranches />}
        >
          <ol className="space-y-2">
            {[
              { t: "I", title: "Curious Wanderer", goals: ["Visit 3 lots", "Meet 5 sims"], done: true },
              { t: "II", title: "Field Journalist", goals: ["Collect 10 artifacts", "Write 2 field notes"], done: true },
              { t: "III", title: "Named Explorer", goals: ["Discover secret area", "Level Fitness to 6"], done: false },
              { t: "IV", title: "Legendary Trailblazer", goals: ["Complete 3 expeditions"], done: false },
            ].map((tier) => (
              <li key={tier.t} className="group rounded-md border border-border bg-background/60 p-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                      tier.done ? "bg-[var(--green)] text-white" : "border border-border text-muted-foreground",
                    )}
                  >
                    {tier.t}
                  </span>
                  <span className="flex-1 font-semibold text-xs">{tier.title}</span>
                  <span className="opacity-0 transition-opacity group-hover:opacity-100">
                    <CopyToMenu what={`tier ${tier.t} reward`} compact disallowBranches />
                  </span>
                </div>
                <ul className="mt-1 ml-8 space-y-0.5 text-[11px] text-muted-foreground">
                  {tier.goals.map((g) => (
                    <li key={g}>• {g}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}

/* ---------- Tuning Editor ---------- */

function TuningEditor() {
  return (
    <div className="space-y-4">
      <PageHeader
        icon={Sliders}
        subtitle="Low-level"
        title="Tuning Editor"
        accent="orange"
        actions={
          <>
            <GhostBtn icon={FileCode2}>Format</GhostBtn>
            <PrimaryBtn icon={Save} onClick={() => toast.success("Tuning saved")}>Save</PrimaryBtn>
          </>
        }
      />
      <div className="grid grid-cols-12 gap-4">
        <Card title="Files" className="col-span-3">
          <ul className="space-y-0.5 text-xs">
            {[
              "career_astro.xml",
              "career_marinebio.xml",
              "trait_lucid.xml",
              "asp_trailblazer.xml",
              "manifest.json",
              "en_US.stbl",
            ].map((f, i) => (
              <li
                key={f}
                className={cn(
                  "flex items-center gap-2 rounded px-2 py-1 hover:bg-accent",
                  i === 0 && "bg-accent font-semibold",
                )}
              >
                <FileCode2 className="h-3 w-3 text-muted-foreground" />
                {f}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="career_astro.xml" className="col-span-9">
          <pre className="max-h-[520px] overflow-auto rounded-md border border-border bg-[color-mix(in_oklab,var(--foreground)_4%,var(--card))] p-3 font-mono text-[11px] leading-relaxed">
{`<?xml version="1.0" encoding="utf-8"?>
<I c="Career" i="career" m="careers.career" n="career_interstellar_navigator" s="0xA112E8">
  <L n="career_track">
    <U>
      <T n="track_title">0x0000A001</T>
      <L n="ranks">
        <U>
          <T n="level">1</T>
          <T n="title">Junior Cadet</T>
          <T n="pay_per_hour">52</T>
        </U>
        <U>
          <T n="level">5</T>
          <T n="title">Admiral</T>
          <T n="pay_per_hour">535</T>
        </U>
      </L>
    </U>
  </L>
  <T n="category">Technical</T>
</I>`}
          </pre>
        </Card>
      </div>
    </div>
  );
}

/* ---------- Assets ---------- */

function AssetsView() {
  const files = [
    { name: "ic_trait_lucid.png", size: "12 KB", kind: "Icon" },
    { name: "ic_asp_trailblazer.png", size: "16 KB", kind: "Icon" },
    { name: "career_astro_bg.dds", size: "1.4 MB", kind: "Texture" },
    { name: "en_US.stbl", size: "8 KB", kind: "Strings" },
    { name: "moodlet_dream.png", size: "9 KB", kind: "Icon" },
    { name: "loading_astro.dds", size: "2.1 MB", kind: "Texture" },
  ];
  return (
    <div className="space-y-4">
      <PageHeader
        icon={Boxes}
        subtitle="Pipeline"
        title="Assets"
        accent="orange"
        actions={
          <>
            <GhostBtn icon={Download}>Export</GhostBtn>
            <PrimaryBtn icon={Upload} onClick={() => toast.success("2 files imported")}>Import</PrimaryBtn>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {files.map((f) => (
          <div
            key={f.name}
            className="rounded-lg border border-border bg-card p-3 card-elevated hover:border-foreground/20"
          >
            <div className="mb-2 flex h-24 items-center justify-center rounded-md bg-gradient-to-br from-[var(--blue)]/10 to-[var(--violet)]/10">
              <Boxes className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="truncate text-xs font-semibold">{f.name}</div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{f.kind}</span>
              <span className="font-mono">{f.size}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Validation ---------- */

function ValidationView() {
  const [running, setRunning] = useState(false);
  const items = [
    { level: "ok", msg: "All tuning IDs unique", src: "tuning/*.xml", icon: CheckCircle2, c: "green" },
    { level: "ok", msg: "Manifest schema valid", src: "manifest.json", icon: CheckCircle2, c: "green" },
    { level: "warn", msg: "Missing STBL for 3 strings", src: "strings/en_US.stbl", icon: AlertTriangle, c: "orange" },
    { level: "warn", msg: "Icon dimensions non-power-of-two", src: "ic_asp_trailblazer.png", icon: AlertTriangle, c: "orange" },
    { level: "err", msg: "Ref chain broken: 0xA112E8", src: "career_astro.xml", icon: XCircle, c: "destructive" },
  ];
  return (
    <div className="space-y-4">
      <PageHeader
        icon={ShieldCheck}
        subtitle="Pipeline"
        title="Validation"
        accent="green"
        actions={
          <PrimaryBtn
            icon={Play}
            onClick={() => {
              setRunning(true);
              toast("Running validation…");
              setTimeout(() => {
                setRunning(false);
                toast.success("Validation complete · 1 error, 2 warnings");
              }, 1500);
            }}
          >
            {running ? "Running…" : "Run All Checks"}
          </PrimaryBtn>
        }
      />
      <Card title="Latest Results" action={<span className="text-[11px] text-muted-foreground">5 checks</span>}>
        <ul className="divide-y divide-border text-xs">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <li key={i} className="flex items-start gap-3 py-2">
                <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: `var(--${it.c})` }} />
                <div className="flex-1">
                  <div className="font-medium">{it.msg}</div>
                  <div className="font-mono text-[10.5px] text-muted-foreground">{it.src}</div>
                </div>
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                  style={{
                    color: `var(--${it.c})`,
                    backgroundColor: `color-mix(in oklab, var(--${it.c}) 12%, transparent)`,
                  }}
                >
                  {it.level}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

/* ---------- Queue ---------- */

function QueueView() {
  const rows = [
    { name: "epic_careers.package", stage: "Compiling", pct: 65, c: "blue", state: "run" },
    { name: "lucid_traits.package", stage: "Queued", pct: 0, c: "orange", state: "wait" },
    { name: "trailblazer_asp.package", stage: "Validated", pct: 100, c: "green", state: "done" },
    { name: "marine_biologist.package", stage: "Draft", pct: 0, c: "violet", state: "wait" },
  ];
  return (
    <div className="space-y-4">
      <PageHeader
        icon={ListChecks}
        subtitle="Pipeline"
        title="Build Queue"
        accent="teal"
        actions={
          <>
            <GhostBtn icon={Pause}>Pause All</GhostBtn>
            <PrimaryBtn icon={Play} onClick={() => toast.success("Queue started")}>Run Queue</PrimaryBtn>
          </>
        }
      />
      <Card>
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.name} className="rounded-md border border-border bg-background/60 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="truncate font-mono font-medium">{r.name}</span>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{
                    color: `var(--${r.c})`,
                    backgroundColor: `color-mix(in oklab, var(--${r.c}) 12%, transparent)`,
                  }}
                >
                  {r.stage}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${r.pct}%`, backgroundColor: `var(--${r.c})` }}
                />
              </div>
              <div className="mt-1 text-[10.5px] text-muted-foreground">{r.pct}%</div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ---------- OS detection + path helpers ---------- */

type OS = "windows" | "mac" | "other";

function detectOs(): OS {
  if (typeof navigator === "undefined") return "other";
  const p = (navigator.platform || "") + " " + (navigator.userAgent || "");
  if (/Mac|Darwin/i.test(p)) return "mac";
  if (/Win/i.test(p)) return "windows";
  return "other";
}

const DEFAULT_PATHS: Record<OS, { game: string; mods: string }> = {
  windows: {
    game: "C:\\Program Files\\Electronic Arts\\The Sims 4",
    mods: "%USERPROFILE%\\Documents\\Electronic Arts\\The Sims 4\\Mods",
  },
  mac: {
    game: "/Applications/The Sims 4.app",
    mods: "~/Documents/Electronic Arts/The Sims 4/Mods",
  },
  other: {
    game: "/Applications/The Sims 4.app",
    mods: "~/Documents/Electronic Arts/The Sims 4/Mods",
  },
};

function OsBadge() {
  const os = detectOs();
  const label = os === "mac" ? "macOS" : os === "windows" ? "Windows" : "Cross-platform";
  const Icon = os === "mac" ? Apple : MonitorCog;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function PathField({
  label,
  value,
  onChange,
  hint,
  onBrowse,
  onAutoDetect,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  onBrowse: () => void;
  onAutoDetect: () => void;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        <span className="normal-case tracking-normal text-[10px] text-muted-foreground/70">
          Windows & macOS paths supported
        </span>
      </label>
      <div className="flex items-stretch gap-1.5">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 flex-1 font-mono text-[11px]"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={onBrowse}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 text-[11px] font-medium hover:bg-accent/60"
          title="Browse for folder"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Browse…
        </button>
        <button
          type="button"
          onClick={onAutoDetect}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 text-[11px] font-medium hover:bg-accent/60"
          title="Search common install locations"
        >
          <Radar className="h-3.5 w-3.5" />
          Auto-detect
        </button>
      </div>
      {hint && <div className="mt-1 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

/**
 * Web preview cannot open a native file dialog for a specific folder — but the
 * real desktop shell (Electron/Tauri) does. We simulate the desktop behavior:
 * - Browse… uses the browser's directory picker when available, else prompts.
 * - Auto-detect scans a list of common install paths for the current OS.
 */
async function pickDirectory(fallback: string): Promise<string | null> {
  // File System Access API (Chromium desktop). Not available on Safari/Firefox.
  const anyWin = window as unknown as {
    showDirectoryPicker?: () => Promise<{ name: string }>;
  };
  if (typeof anyWin.showDirectoryPicker === "function") {
    try {
      const handle = await anyWin.showDirectoryPicker();
      return handle.name ? `…/${handle.name}` : fallback;
    } catch {
      return null;
    }
  }
  const entered = window.prompt("Enter folder path:", fallback);
  return entered && entered.trim() ? entered.trim() : null;
}

function InstallPaths() {
  const os = detectOs();
  const defaults = DEFAULT_PATHS[os];
  const [game, setGame] = useState(defaults.game);
  const [mods, setMods] = useState(defaults.mods);
  const [scanning, setScanning] = useState<null | "game" | "mods">(null);

  const scanCommon = (kind: "game" | "mods") => {
    setScanning(kind);
    const found = kind === "game" ? DEFAULT_PATHS[os].game : DEFAULT_PATHS[os].mods;
    setTimeout(() => {
      if (kind === "game") setGame(found);
      else setMods(found);
      setScanning(null);
      toast.success(
        `Found ${kind === "game" ? "game" : "Mods"} folder`,
        { description: found },
      );
    }, 700);
  };

  const browse = async (kind: "game" | "mods") => {
    const current = kind === "game" ? game : mods;
    const picked = await pickDirectory(current);
    if (!picked) return;
    if (kind === "game") setGame(picked);
    else setMods(picked);
    toast.success(`${kind === "game" ? "Game" : "Mods"} folder set`, { description: picked });
  };

  return (
    <div className="space-y-3">
      <PathField
        label="Game Path"
        value={game}
        onChange={setGame}
        onBrowse={() => browse("game")}
        onAutoDetect={() => scanCommon("game")}
        hint={
          scanning === "game"
            ? "Scanning common install locations…"
            : os === "mac"
              ? "Typically /Applications/The Sims 4.app"
              : os === "windows"
                ? "Typically C:\\Program Files\\Electronic Arts\\The Sims 4"
                : "Point to your Sims 4 install folder"
        }
      />
      <PathField
        label="Mods Folder"
        value={mods}
        onChange={setMods}
        onBrowse={() => browse("mods")}
        onAutoDetect={() => scanCommon("mods")}
        hint={
          scanning === "mods"
            ? "Scanning Documents for Mods folder…"
            : os === "mac"
              ? "~/Documents/Electronic Arts/The Sims 4/Mods"
              : "Documents › Electronic Arts › The Sims 4 › Mods"
        }
      />
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            scanCommon("game");
            setTimeout(() => scanCommon("mods"), 750);
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-semibold hover:bg-accent/60"
        >
          <FolderSearch className="h-3.5 w-3.5" />
          Search for both
        </button>
        <span className="text-[10px] text-muted-foreground">
          Detected version <span className="font-mono text-foreground">1.108.318</span> · offline
        </span>
      </div>
    </div>
  );
}

/* ---------- Settings ---------- */


function SettingsView() {
  const { advanced, toggle: toggleAdvanced } = useAdvanced();
  return (
    <div className="space-y-4">
      <PageHeader icon={SettingsIcon} subtitle="Application" title="Settings" accent="violet" />

      <Card
        title="Interface Mode"
        action={
          <span className="text-[11px] text-muted-foreground">
            Controls what appears in the sidebar and builders.
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => advanced && toggleAdvanced()}
            className={cn(
              "rounded-lg border p-3 text-left transition-all",
              !advanced
                ? "border-[var(--blue)] bg-[var(--blue)]/8 shadow-sm"
                : "border-border bg-card hover:border-foreground/20",
            )}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--blue)]/15 text-[var(--blue)]">✓</span>
              Simple
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Recommended. Guided builders, plain-English fields, one-click compile. No code required.
            </p>
          </button>
          <button
            onClick={() => !advanced && toggleAdvanced()}
            className={cn(
              "rounded-lg border p-3 text-left transition-all",
              advanced
                ? "border-[var(--orange)] bg-[var(--orange)]/8 shadow-sm"
                : "border-border bg-card hover:border-foreground/20",
            )}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--orange)]/15 text-[var(--orange)]">⚙</span>
              Advanced
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Adds the Tuning Editor, Validation panel, XML output, internal IDs, and the build log.
            </p>
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-12 gap-4">
        <Card
          title="Sims 4 Installation"
          className="col-span-6"
          action={<OsBadge />}
        >
          <InstallPaths />
        </Card>

        <Card title="lot51.cc Sync" className="col-span-6">
          <p className="text-xs text-muted-foreground">
            Mod Constructor runs entirely offline. Enable this to occasionally reach out to
            <span className="mx-1 font-mono">lot51.cc</span> for framework and Core Library
            updates. No project data leaves your machine.
          </p>
          <div className="mt-3 space-y-2 text-xs">
            <Toggle label="Check for updates at launch" defaultOn />
            <Toggle label="Notify me about new templates" defaultOn />
            <Toggle label="Auto-download minor patches" />
            <Toggle label="Share anonymous crash reports" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <GhostBtn icon={Download} onClick={() => toast.success("lot51 Core Library up to date")}>
              Check Now
            </GhostBtn>
            <span className="text-[11px] text-muted-foreground">Last checked · 2 days ago</span>
          </div>
        </Card>

        <Card title="Editor" className="col-span-6">
          <div className="space-y-2 text-xs">
            <Toggle label="Autosave every 30s" defaultOn />
            <Toggle label="Confirm before compiling" defaultOn />
            {advanced && <Toggle label="Enable node canvas snapping" defaultOn />}
            {advanced && <Toggle label="Show hex IDs" />}
            {advanced && <Toggle label="Validate on save" defaultOn />}
            {!advanced && (
              <p className="rounded-md bg-muted/40 px-2 py-1.5 text-[11px] text-muted-foreground">
                More editor toggles appear when Advanced mode is on.
              </p>
            )}
          </div>
        </Card>

        <Card title="About" className="col-span-6">
          <div className="space-y-1.5 text-xs">
            <Row k="Application" v="Mod Constructor V6" />
            <Row k="Version" v="6.0.0 (offline build)" />
            <Row k="Runtime Mode" v="Local · no telemetry" />
            <Row k="License" v="Personal · Non-commercial" />
            {advanced && <Row k="Framework" v=".NET 8 · WPF portable" />}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Toggle({ label, defaultOn }: { label: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent/50">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => setOn(!on)}
        className={cn(
          "relative h-4 w-8 rounded-full transition-colors",
          on ? "bg-[var(--blue)]" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all",
            on ? "left-4" : "left-0.5",
          )}
        />
      </button>
    </label>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono font-semibold">{v}</span>
    </div>
  );
}

/* ---------- Router ---------- */

export function SectionView({
  active,
  DashboardEl,
}: {
  active: SectionId;
  DashboardEl: React.ReactNode;
}) {
  if (active === "dashboard") return <>{DashboardEl}</>;
  if (active === "projects") return <div className="mx-auto max-w-[1600px] p-6"><ProjectsView /></div>;
  if (active === "career") return <div className="mx-auto max-w-[1600px] p-6"><CareerBuilder /></div>;
  if (active === "trait") return <div className="mx-auto max-w-[1600px] p-6"><TraitBuilder /></div>;
  if (active === "aspiration") return <div className="mx-auto max-w-[1600px] p-6"><AspirationBuilder /></div>;
  if (active === "tuning") return <div className="mx-auto max-w-[1600px] p-6"><TuningEditor /></div>;
  if (active === "assets") return <div className="mx-auto max-w-[1600px] p-6"><AssetsView /></div>;
  if (active === "validation") return <div className="mx-auto max-w-[1600px] p-6"><ValidationView /></div>;
  if (active === "queue") return <div className="mx-auto max-w-[1600px] p-6"><QueueView /></div>;
  if (active === "settings") return <div className="mx-auto max-w-[1600px] p-6"><SettingsView /></div>;
  return null;
}
