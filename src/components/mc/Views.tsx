import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  FolderPlus,
  Pencil,
  Trash2,
  Package,
  Radar,
  Apple,
  MonitorCog,
  Clock,
  Calendar,
  Users,
  Bell,
  MapPin,
  MessageSquare,
  Shield,
  Image as ImageIcon,
  Zap,
  ChevronRight,
  ChevronDown,
  Copy,
  GripVertical,
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
import { ImageField } from "./ImageField";
import {
  useAppHost,
  PROVIDER_LABEL,
  PROVIDER_DESCRIPTION,
  type ImageProvider,
} from "@/lib/app-host";
import { MCP_TOOL_DEFS } from "@/lib/mcp-tools";
import { downloadBundle, loadBundle, emptyBundle } from "@/lib/project-store";
import { useStore, downloadBundle as downloadStoreBundle } from "@/lib/store";
import {
  defaultEngineCapabilities,
  ENGINE_STATE_LABEL,
  ENGINE_STATE_TOOLTIP,
  type EngineCapabilities,
  type EngineState,
} from "@/lib/engine-capabilities";
import { ProjectExplorer } from "./views/ProjectExplorer";
import { AssetManager } from "./views/AssetManager";
import { IconLibraryView } from "./views/IconLibraryView";

import { ReferenceViewer } from "./views/ReferenceViewer";
import { ValidationCenter } from "./views/ValidationCenter";
import { TemplatesGallery } from "./views/TemplatesGallery";
import { SnippetsLibrary } from "./views/SnippetsLibrary";
import { DependencyGraph } from "./views/DependencyGraph";
import { ActivityTimeline } from "./views/ActivityTimeline";
import { BuildAnalytics } from "./views/BuildAnalytics";
import { UpdateCenter } from "./views/UpdateCenter";

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

const STATUS_META: Record<import("@/lib/types").ProjectStatus, { label: string; c: string }> = {
  "draft": { label: "Draft", c: "orange" },
  "in-progress": { label: "In Progress", c: "blue" },
  "complete": { label: "Complete", c: "green" },
  "tested": { label: "Tested", c: "teal" },
  "released": { label: "Released", c: "violet" },
};

const STATUS_ORDER: import("@/lib/types").ProjectStatus[] = ["draft", "in-progress", "complete", "tested", "released"];

function StatusPill({ status }: { status: import("@/lib/types").ProjectStatus }) {
  const m = STATUS_META[status];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{
        color: `var(--${m.c})`,
        backgroundColor: `color-mix(in oklab, var(--${m.c}) 14%, transparent)`,
      }}
    >
      {m.label}
    </span>
  );
}

function ProjectDetailDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const store = useStore();
  const project = store.state.projects.find((p) => p.id === projectId) ?? null;
  const [versionDraft, setVersionDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");

  // Sync draft when opening for a different project.
  useEffect(() => {
    if (project) {
      setVersionDraft(project.version);
      setNotesDraft("");
    }
  }, [project?.id, open]);

  if (!project) return null;

  const bumpVersion = () => {
    const v = versionDraft.trim();
    if (!v) {
      toast.error("Version cannot be empty.");
      return;
    }
    if (v === project.version) {
      toast("Version unchanged.");
      return;
    }
    store.setProjectVersion(project.id, v, notesDraft.trim() || undefined);
    setNotesDraft("");
    toast.success(`Bumped to v${v}. Mark complete when ready.`);
  };

  const setStatus = (status: import("@/lib/types").ProjectStatus) => {
    store.setProjectStatus(project.id, status, notesDraft.trim() || undefined);
    setNotesDraft("");
    toast.success(`v${project.version} → ${STATUS_META[status].label}`);
  };

  const nextIsMilestone = project.status === "draft" || project.status === "in-progress";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            {project.name}
            {project.isDemo && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                Demo
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</div>
            <StatusPill status={project.status} />
          </div>

          <div className="grid grid-cols-5 gap-1">
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={cn(
                  "rounded-md border border-border px-2 py-1.5 text-[10px] font-semibold uppercase transition",
                  s === project.status ? "bg-accent" : "hover:bg-accent/60",
                )}
                style={s === project.status ? { color: `var(--${STATUS_META[s].c})` } : undefined}
              >
                {STATUS_META[s].label}
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-card/50 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Version</div>
            <div className="mt-2 flex items-center gap-2">
              <Input
                value={versionDraft}
                onChange={(e) => setVersionDraft(e.target.value)}
                placeholder="1.0.0"
                className="h-8 max-w-[140px] text-xs"
              />
              <div className="text-[11px] text-muted-foreground">
                Current: <span className="font-semibold text-foreground">v{project.version}</span>
              </div>
              <div className="ml-auto">
                <PrimaryBtn icon={Save} onClick={bumpVersion}>Save version</PrimaryBtn>
              </div>
            </div>
            <Textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Optional notes for this version / status change (added to changelog)…"
              className="mt-2 h-16 text-xs"
            />
            <div className="mt-1 text-[10px] text-muted-foreground">
              Bumping the version resets status to <b>In Progress</b>. Mark the new version <b>Complete</b> when ready — a changelog entry is added automatically. Later mark it <b>Tested</b> once QA passes.
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card/50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Changelog</div>
              <div className="text-[10px] text-muted-foreground">{project.changelog.length} entries</div>
            </div>
            {project.changelog.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground">
                No entries yet. Marking a version <b>Complete</b> will add one automatically.
              </div>
            ) : (
              <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {project.changelog.map((c) => (
                  <li key={c.id} className="rounded-md border border-border/60 bg-background/60 p-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold tabular-nums">v{c.version}</span>
                      <StatusPill status={c.status} />
                      {c.auto && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                          Auto
                        </span>
                      )}
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-[11px] text-muted-foreground">{c.notes}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {nextIsMilestone && (
            <div className="rounded-md border border-[var(--blue)]/30 bg-[var(--blue)]/8 p-2 text-[11px]">
              Tip: every new version should be marked <b>Complete</b> before it can be <b>Tested</b> or <b>Released</b>.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProjectsView() {
  const store = useStore();
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | import("@/lib/types").ProjectStatus>("all");
  const [detailId, setDetailId] = useState<string | null>(null);

  const projects = store.state.projects;

  const fmtTime = (t: number) => {
    const diff = Date.now() - t;
    if (diff < 60_000) return "just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.mcbundle.json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const project = store.importBundle(parsed);
        toast.success(`Imported "${project.name}"`);
      } catch (e) {
        toast.error(`Import failed: ${String((e as Error)?.message ?? e)}`);
      }
    };
    input.click();
  };

  const handleNew = () => {
    const p = store.createProject();
    toast.success(`Created "${p.name}"`);
  };

  const filtered = projects.filter((p) =>
    (!filter || p.name.toLowerCase().includes(filter.toLowerCase()))
    && (statusFilter === "all" || p.status === statusFilter)
  );

  return (
    <div className="space-y-4">
      <PageHeader
        icon={FolderKanban}
        subtitle="Local Workspace"
        title="Projects"
        accent="blue"
        actions={
          <>
            <GhostBtn icon={Upload} onClick={handleImport}>Import</GhostBtn>
            <PrimaryBtn icon={Plus} onClick={handleNew}>
              New Project
            </PrimaryBtn>
          </>
        }
      />

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter projects…"
            className="h-8 pl-8 text-xs"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs"
        >
          <option value="all">All statuses</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
      </div>

      <Card>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="pb-2 pl-2">Name</th>
              <th className="pb-2">Version</th>
              <th className="pb-2">Author</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  No projects match. Click <span className="font-semibold">New Project</span> to create one.
                </td>
              </tr>
            )}
            {filtered.map((p) => {
              const active = store.state.activeProjectId === p.id;
              return (
                <tr
                  key={p.id}
                  className="cursor-pointer border-t border-border/60 hover:bg-accent/40"
                  onClick={() => {
                    store.setActiveProject(p.id);
                    toast(`Switched to "${p.name}"`);
                  }}
                >
                  <td className="py-2 pl-2">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-1 rounded" style={{ backgroundColor: `var(--${STATUS_META[p.status].c})` }} />
                      <span className="font-semibold">{p.name}</span>
                      {active && (
                        <span className="rounded-full bg-[var(--teal)]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-[var(--teal)]">
                          Active
                        </span>
                      )}
                      {p.isDemo && (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground">
                          Demo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 font-mono text-[11px] tabular-nums text-muted-foreground">v{p.version}</td>
                  <td className="py-2 text-muted-foreground">{p.author}</td>
                  <td className="py-2"><StatusPill status={p.status} /></td>
                  <td className="py-2 text-muted-foreground">{fmtTime(p.updatedAt)}</td>
                  <td className="py-2 pr-2 text-right">
                    <button
                      className="rounded p-1 hover:bg-accent"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailId(p.id);
                      }}
                      title="Manage status & changelog"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="rounded p-1 hover:bg-accent"
                      onClick={(e) => {
                        e.stopPropagation();
                        const copy = store.duplicateProject(p.id);
                        if (copy) toast.success(`Duplicated as "${copy.name}"`);
                      }}
                      title="Duplicate"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className={cn(
                        "rounded p-1 hover:bg-accent",
                        p.isDemo && "cursor-not-allowed opacity-40 hover:bg-transparent",
                      )}
                      disabled={p.isDemo}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (p.isDemo) return;
                        if (window.confirm(`Delete "${p.name}"?`)) {
                          store.deleteProject(p.id);
                          toast.success(`Deleted "${p.name}"`);
                        }
                      }}
                      title={p.isDemo ? "Demo project is protected" : "Delete"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <ProjectDetailDialog
        projectId={detailId}
        open={detailId !== null}
        onOpenChange={(v) => { if (!v) setDetailId(null); }}
      />
    </div>
  );
}


/* ---------- Career Builder (V5-aligned) ---------- */

const CAREER_TYPES = [
  { id: "FullTime", label: "Full Time", desc: "Standard career with daily shifts" },
  { id: "PartTime", label: "Part Time", desc: "Reduced hours, teen-friendly" },
  { id: "Volunteer", label: "Volunteer / Afterschool", desc: "Unpaid or activity-based" },
];

const AGES = ["Child", "Teen", "YoungAdult", "Adult", "Elder"] as const;
type Age = (typeof AGES)[number];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

// V5 message overrides (subset of ~35, gated behind Advanced)
const MESSAGE_KEYS = [
  "EndGreat", "EndGood", "EndOK", "EndBad", "EndBoss",
  "Promoted", "Demoted", "Fired", "Quit",
  "WorkFromHome", "TakeVacationDay", "PaidTimeOffDepleted",
  "JoinCareer", "RetireInvitation", "PerformanceLow",
  "ChanceCardTitle", "ChanceCardText", "ChanceCardGood", "ChanceCardBad",
] as const;

type Emotion = "Angry" | "Bored" | "Dazed" | "Embarrassed" | "Sad" | "Tense" | "Uncomfortable";
const EMOTIONS: Emotion[] = ["Angry", "Bored", "Dazed", "Embarrassed", "Sad", "Tense", "Uncomfortable"];

type Rank = {
  lvl: number;
  title: string;
  description: string;
  simoleonsPerHour: number;
  beginHour: number;
  beginMinute: number;
  durationHours: number;
  days: boolean[]; // 7
  uniform: string;
  performanceForPromotion: number;
  objectiveSet: string;
  promotionReward: string;
  invertedEmotions: Record<Emotion, boolean>;
};

type Assignment = {
  id: string;
  name: string;
  levelMin: number;
  levelMax: number;
  weight: number;
  isFirst: boolean;
  conditions: string;
};

type CareerEventItem = {
  id: string;
  name: string;
  situation: string;
  zoneDirector: string;
  venue: string;
  noMedalText: string;
  bronzeText: string;
  silverText: string;
  goldText: string;
  showEndOfDayReport: boolean;
  endOfDayTitle: string;
  endOfDayText: string;
  lootOnStart: string;
  lootOnEnd: string;
};

type Branch = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: "blue" | "violet" | "teal" | "green" | "orange";
  emoji: string;
  ranks: Rank[];
  assignments: Assignment[];
  events: CareerEventItem[];
  children: Branch[];
};

const mkRank = (lvl: number, title: string, pay: number, req = "—"): Rank => ({
  lvl,
  title,
  description: req,
  simoleonsPerHour: pay,
  beginHour: 9,
  beginMinute: 0,
  durationHours: 8,
  days: [false, true, true, true, true, true, false],
  uniform: "",
  performanceForPromotion: 100,
  objectiveSet: "",
  promotionReward: "",
  invertedEmotions: {
    Angry: false, Bored: false, Dazed: false, Embarrassed: false, Sad: false, Tense: false, Uncomfortable: false,
  },
});

const INITIAL_BRANCHES: Branch[] = [
  {
    id: "b_astro",
    name: "Astronaut",
    description: "Chart deep-space routes and command the fleet.",
    icon: "",
    color: "blue",
    emoji: "🚀",
    ranks: [
      mkRank(1, "Junior Cadet", 52, "—"),
      mkRank(2, "Navigator", 102, "Logic 3"),
      mkRank(3, "Space Ranger", 205, "Logic 5 · Fitness 3"),
      mkRank(4, "Commander", 360, "Logic 7 · Fitness 5"),
      mkRank(5, "Admiral", 535, "Logic 9 · Fitness 7"),
    ],
    assignments: [
      { id: "a1", name: "Analyze star charts", levelMin: 1, levelMax: 3, weight: 1, isFirst: true, conditions: "Has telescope" },
      { id: "a2", name: "Simulate re-entry", levelMin: 3, levelMax: 5, weight: 2, isFirst: false, conditions: "Fitness ≥ 4" },
    ],
    events: [
      {
        id: "e1", name: "First Launch",
        situation: "career_astro_launch",
        zoneDirector: "zd_launchpad",
        venue: "Science Facility",
        noMedalText: "The launch was a disaster!",
        bronzeText: "Barely made orbit.",
        silverText: "A clean launch.",
        goldText: "Historic flight!",
        showEndOfDayReport: true,
        endOfDayTitle: "Launch Report",
        endOfDayText: "Your first mission returned {medal} results.",
        lootOnStart: "loot_confidence_up",
        lootOnEnd: "loot_reward_medal",
      },
    ],
    children: [],
  },
  {
    id: "b_smuggler",
    name: "Interstellar Smuggler",
    description: "Move contraband through hostile sectors.",
    icon: "",
    color: "violet",
    emoji: "🛰️",
    ranks: [
      mkRank(1, "Dock Runner", 47, "—"),
      mkRank(2, "Cargo Hauler", 97, "Mischief 2"),
      mkRank(3, "Fixer", 192, "Mischief 5"),
      mkRank(4, "Kingpin", 362, "Mischief 7 · Charisma 4"),
      mkRank(5, "Ghost Captain", 575, "Mischief 9 · Charisma 6"),
    ],
    assignments: [],
    events: [],
    children: [],
  },
];

/* --- small helpers used by builder --- */

function NumField({
  label,
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-8 text-xs"
        />
        {suffix && <span className="text-[10px] text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
        checked
          ? "border-[var(--blue)]/40 bg-[var(--blue)]/10 text-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-accent/40",
      )}
    >
      <span
        className={cn(
          "flex h-3 w-3 items-center justify-center rounded-sm border",
          checked ? "border-[var(--blue)] bg-[var(--blue)] text-white" : "border-muted-foreground/40",
        )}
      >
        {checked && <CheckCircle2 className="h-2.5 w-2.5" strokeWidth={3} />}
      </span>
      {label}
    </button>
  );
}

function Section({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
  badge,
}: {
  title: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-xl border border-border bg-card card-elevated">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        <span className="text-sm font-semibold">{title}</span>
        {badge && (
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {badge}
          </span>
        )}
      </button>
      {open && <div className="border-t border-border p-4">{children}</div>}
    </section>
  );
}

function CareerBuilder() {
  const { advanced } = useAdvanced();

  // Career-level state
  const [name, setName] = useState("Interstellar Navigator");
  const [description, setDescription] = useState(
    "Chart deep-space routes and command the fleet. Requires strong Logic and Fitness.",
  );
  const [category, setCategory] = useState("Technical");
  const [careerType, setCareerType] = useState("FullTime");
  const [icon, setIcon] = useState("");
  const [image, setImage] = useState("");
  const [ages, setAges] = useState<Record<Age, boolean>>({
    Child: false, Teen: false, YoungAdult: true, Adult: true, Elder: true,
  });

  // Company names
  const [companyNames, setCompanyNames] = useState<string[]>([
    "The {label} Company", "Galactic {label} Corp",
  ]);

  // PTO
  const [ptoEnabled, setPtoEnabled] = useState(true);
  const [ptoInitial, setPtoInitial] = useState(3);
  const [ptoLabel, setPtoLabel] = useState("Take Vacation Day ({label})");

  // Availability conditions
  const [availabilityConditions, setAvailabilityConditions] = useState<string[]>([
    "Sim is not Elder — Optional",
  ]);

  // Message overrides
  const [messages, setMessages] = useState<Record<string, { enabled: boolean; text: string }>>(
    () =>
      Object.fromEntries(
        MESSAGE_KEYS.map((k) => [k, { enabled: false, text: "" }]),
      ) as Record<string, { enabled: boolean; text: string }>,
  );

  // Branches (tracks)
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [branchId, setBranchId] = useState(branches[0].id);
  const branch = branches.find((b) => b.id === branchId) ?? branches[0];

  // Sub-tab
  const [tab, setTab] = useState<
    "identity" | "levels" | "assignments" | "events" | "messages" | "advanced"
  >("identity");

  const updateBranch = (id: string, patch: Partial<Branch>) =>
    setBranches((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const updateRank = (rankLvl: number, patch: Partial<Rank>) =>
    updateBranch(branch.id, {
      ranks: branch.ranks.map((r) => (r.lvl === rankLvl ? { ...r, ...patch } : r)),
    });

  const addRank = () => {
    const nextLvl = branch.ranks.length ? Math.max(...branch.ranks.map((r) => r.lvl)) + 1 : 1;
    updateBranch(branch.id, {
      ranks: [...branch.ranks, mkRank(nextLvl, `Rank ${nextLvl}`, 100)],
    });
    toast.success(`Added rank ${nextLvl}`);
  };

  const removeRank = (lvl: number) => {
    updateBranch(branch.id, { ranks: branch.ranks.filter((r) => r.lvl !== lvl) });
  };

  const addBranch = () => {
    const id = `b_${Date.now()}`;
    setBranches((prev) => [
      ...prev,
      {
        id,
        name: `New Branch ${prev.length + 1}`,
        description: "",
        icon: "",
        color: "teal",
        emoji: "✨",
        ranks: [mkRank(1, "Rank 1", 50)],
        assignments: [],
        events: [],
        children: [],
      },
    ]);
    setBranchId(id);
    toast.success("New branch scaffolded");
  };

  const previewData: CareerPreviewData = {
    name,
    description,
    track: branch.name,
    salary: String(branch.ranks[branch.ranks.length - 1]?.simoleonsPerHour ?? 0),
    hours: branch.ranks[0]
      ? `${String(branch.ranks[0].beginHour).padStart(2, "0")}:00 → ${String(
          (branch.ranks[0].beginHour + branch.ranks[0].durationHours) % 24,
        ).padStart(2, "0")}:00`
      : "—",
    days: branch.ranks[0] ? branch.ranks[0].days.map((d, i) => (d ? DAYS[i] : "")).filter(Boolean).join(" · ") : "—",
    emoji: branch.emoji,
    color: branch.color,
    activeBranch: branch.name,
    branches: branches.map((b) => ({
      key: b.id,
      name: b.name,
      description: b.description,
      color: b.color,
      emoji: b.emoji,
      ranks: b.ranks.map((r) => ({
        lvl: r.lvl,
        title: r.title,
        req: r.description || "—",
        pay: String(r.simoleonsPerHour * r.durationHours),
      })),
      perks: b.ranks
        .filter((r) => r.promotionReward)
        .map((r) => ({ name: r.promotionReward, tier: r.lvl })),
    })),
  };

  const tabs: { id: typeof tab; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; advanced?: boolean }[] = [
    { id: "identity", label: "Identity", icon: Briefcase },
    { id: "levels", label: "Levels", icon: ListChecks },
    { id: "assignments", label: "Work From Home", icon: Boxes, advanced: true },
    { id: "events", label: "Career Events", icon: Calendar, advanced: true },
    { id: "messages", label: "Messages", icon: MessageSquare, advanced: true },
    { id: "advanced", label: "Advanced", icon: Sliders, advanced: true },
  ];

  const editor = (
    <div className="space-y-4">
      <PageHeader
        icon={Briefcase}
        subtitle="Builder · V5 aligned"
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
          Simple mode — Identity and Levels are shown. Turn on Advanced in the top bar for messages, events, and work-from-home assignments.
        </div>
      )}

      {/* Branch tab strip */}
      <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 p-1">
        {branches.map((b) => (
          <button
            key={b.id}
            onClick={() => setBranchId(b.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] font-semibold transition-all",
              b.id === branch.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span>{b.emoji}</span>
            {b.name}
          </button>
        ))}
        <button
          onClick={addBranch}
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent/60"
        >
          <Plus className="h-3 w-3" /> New branch
        </button>
      </div>

      {/* Sub-tab bar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border">
        {tabs
          .filter((t) => !t.advanced || advanced)
          .map((t) => {
            const Ic = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-[11.5px] font-semibold transition-colors",
                  tab === t.id
                    ? "border-[var(--blue)] text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Ic className="h-3.5 w-3.5" />
                {t.label}
                {t.advanced && (
                  <span className="rounded bg-muted px-1 py-0.5 text-[9px] font-bold text-muted-foreground">
                    ADV
                  </span>
                )}
              </button>
            );
          })}
      </div>

      {/* --- IDENTITY --- */}
      {tab === "identity" && (
        <div className="space-y-3">
          <Card title="Career Identity">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Career Name" value={name} onChange={setName} />
              <Field label="Category" value={category} onChange={setCategory} hint="Technical · Culinary · Athletic…" />
              {advanced && (
                <Field label="Internal ID" value="career_interstellar_navigator" hint="Snake_case, must be unique" />
              )}
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Career Type
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CAREER_TYPES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCareerType(c.id)}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
                        careerType === c.id
                          ? "border-[var(--blue)] bg-[var(--blue)]/10 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:bg-accent/40",
                      )}
                      title={c.desc}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-20 resize-none text-xs"
                />
              </div>
            </div>
          </Card>

          <Card title="Icon & Image">
            <div className="grid grid-cols-2 gap-3">
              <ImageField
                label="Icon"
                value={icon}
                onChange={setIcon}
                slot="icon"
                hint="Small (32×32) — sidebar / phone"
                context={{ subject: `${name || "career"} icon`, style: "flat, game UI" }}
              />
              <ImageField
                label="Image"
                value={image}
                onChange={setImage}
                slot="image"
                hint="Large — join-career splash"
                context={{ subject: `${name || "career"} splash`, style: "cinematic" }}
              />
            </div>
          </Card>

          <Card title="Age Availability" action={
            <CopyToMenu what="age availability" label="Copy to…" />
          }>
            <div className="flex flex-wrap gap-1.5">
              {AGES.map((a) => (
                <Toggle
                  key={a}
                  checked={ages[a]}
                  onChange={(v) => setAges({ ...ages, [a]: v })}
                  label={a === "YoungAdult" ? "Young Adult" : a}
                />
              ))}
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">
              Life stages allowed to take this career.
            </div>
          </Card>

          <Card title="Paid Time Off">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Enabled
                </label>
                <Toggle checked={ptoEnabled} onChange={setPtoEnabled} label={ptoEnabled ? "PTO on" : "PTO off"} />
              </div>
              {ptoEnabled && (
                <>
                  <NumField label="Initial PTO Days" value={ptoInitial} onChange={setPtoInitial} min={0} max={30} />
                  <Field label="Interaction Name" value={ptoLabel} onChange={setPtoLabel} hint="{label} = career name" />
                </>
              )}
            </div>
          </Card>

          <Card
            title="Company Names"
            action={
              <button
                onClick={() => setCompanyNames([...companyNames, "New {label} Co"])}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            }
          >
            <ul className="space-y-1.5">
              {companyNames.map((c, i) => (
                <li key={i} className="flex items-center gap-2">
                  <GripVertical className="h-3 w-3 text-muted-foreground" />
                  <Input
                    value={c}
                    onChange={(e) => {
                      const cp = [...companyNames];
                      cp[i] = e.target.value;
                      setCompanyNames(cp);
                    }}
                    className="h-7 text-xs"
                  />
                  <button
                    onClick={() => setCompanyNames(companyNames.filter((_, j) => j !== i))}
                    className="rounded p-1 hover:bg-accent"
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card
            title={`Branch Details · ${branch.name}`}
            action={<CopyToMenu what={`${branch.name} branch`} label="Copy branch to…" />}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Branch Name" value={branch.name} onChange={(v) => updateBranch(branch.id, { name: v })} />
              <Field label="Emoji" value={branch.emoji} onChange={(v) => updateBranch(branch.id, { emoji: v })} />
              <div className="col-span-2">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Branch Description
                </label>
                <Textarea
                  value={branch.description}
                  onChange={(e) => updateBranch(branch.id, { description: e.target.value })}
                  className="h-16 resize-none text-xs"
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* --- LEVELS --- */}
      {tab === "levels" && (
        <div className="space-y-3">
          <Card
            title={`Promotion Track · ${branch.name}`}
            action={
              <div className="flex items-center gap-1.5">
                <CopyToMenu what={`${branch.name} ranks`} label="Copy ranks to…" />
                <button
                  onClick={addRank}
                  className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent"
                >
                  <Plus className="h-3 w-3" /> Add Rank
                </button>
              </div>
            }
          >
            <div className="space-y-2">
              {branch.ranks.map((r) => (
                <RankRow
                  key={r.lvl}
                  rank={r}
                  advanced={advanced}
                  onChange={(patch) => updateRank(r.lvl, patch)}
                  onRemove={() => removeRank(r.lvl)}
                />
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* --- ASSIGNMENTS (WFH) --- */}
      {tab === "assignments" && advanced && (
        <div className="space-y-3">
          <Card
            title="Work From Home Assignments"
            action={
              <button
                onClick={() =>
                  updateBranch(branch.id, {
                    assignments: [
                      ...branch.assignments,
                      {
                        id: `a_${Date.now()}`,
                        name: "New assignment",
                        levelMin: 1,
                        levelMax: branch.ranks.length,
                        weight: 1,
                        isFirst: false,
                        conditions: "",
                      },
                    ],
                  })
                }
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent"
              >
                <Plus className="h-3 w-3" /> Add Assignment
              </button>
            }
          >
            {branch.assignments.length === 0 ? (
              <div className="text-[11px] text-muted-foreground">
                No assignments — Sims won't have WFH tasks in this branch.
              </div>
            ) : (
              <div className="space-y-2">
                {branch.assignments.map((a) => (
                  <div key={a.id} className="grid grid-cols-12 gap-2 rounded-md border border-border bg-background/60 p-2.5">
                    <div className="col-span-4">
                      <Field
                        label="Name"
                        value={a.name}
                        onChange={(v) =>
                          updateBranch(branch.id, {
                            assignments: branch.assignments.map((x) => (x.id === a.id ? { ...x, name: v } : x)),
                          })
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <NumField
                        label="Min Lvl"
                        value={a.levelMin}
                        onChange={(v) =>
                          updateBranch(branch.id, {
                            assignments: branch.assignments.map((x) => (x.id === a.id ? { ...x, levelMin: v } : x)),
                          })
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <NumField
                        label="Max Lvl"
                        value={a.levelMax}
                        onChange={(v) =>
                          updateBranch(branch.id, {
                            assignments: branch.assignments.map((x) => (x.id === a.id ? { ...x, levelMax: v } : x)),
                          })
                        }
                      />
                    </div>
                    <div className="col-span-1">
                      <NumField
                        label="Weight"
                        value={a.weight}
                        onChange={(v) =>
                          updateBranch(branch.id, {
                            assignments: branch.assignments.map((x) => (x.id === a.id ? { ...x, weight: v } : x)),
                          })
                        }
                      />
                    </div>
                    <div className="col-span-2 flex flex-col justify-end gap-1">
                      <Toggle
                        checked={a.isFirst}
                        onChange={(v) =>
                          updateBranch(branch.id, {
                            assignments: branch.assignments.map((x) => (x.id === a.id ? { ...x, isFirst: v } : x)),
                          })
                        }
                        label="First"
                      />
                    </div>
                    <div className="col-span-1 flex items-end justify-end">
                      <button
                        onClick={() =>
                          updateBranch(branch.id, {
                            assignments: branch.assignments.filter((x) => x.id !== a.id),
                          })
                        }
                        className="rounded p-1 hover:bg-accent"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="col-span-12">
                      <Field
                        label="Conditions"
                        value={a.conditions}
                        onChange={(v) =>
                          updateBranch(branch.id, {
                            assignments: branch.assignments.map((x) => (x.id === a.id ? { ...x, conditions: v } : x)),
                          })
                        }
                        hint="Comma-separated test conditions"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* --- EVENTS --- */}
      {tab === "events" && advanced && (
        <div className="space-y-3">
          <Card
            title="Career Events"
            action={
              <button
                onClick={() =>
                  updateBranch(branch.id, {
                    events: [
                      ...branch.events,
                      {
                        id: `e_${Date.now()}`,
                        name: "New Event",
                        situation: "",
                        zoneDirector: "",
                        venue: "",
                        noMedalText: "That was bad!",
                        bronzeText: "OK.",
                        silverText: "Good!",
                        goldText: "Great!",
                        showEndOfDayReport: false,
                        endOfDayTitle: "",
                        endOfDayText: "",
                        lootOnStart: "",
                        lootOnEnd: "",
                      },
                    ],
                  })
                }
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent"
              >
                <Plus className="h-3 w-3" /> Add Event
              </button>
            }
          >
            {branch.events.length === 0 ? (
              <div className="text-[11px] text-muted-foreground">
                No custom career events. Sims will use base-game events.
              </div>
            ) : (
              <div className="space-y-3">
                {branch.events.map((ev) => (
                  <EventEditor
                    key={ev.id}
                    event={ev}
                    onChange={(patch) =>
                      updateBranch(branch.id, {
                        events: branch.events.map((x) => (x.id === ev.id ? { ...x, ...patch } : x)),
                      })
                    }
                    onRemove={() =>
                      updateBranch(branch.id, { events: branch.events.filter((x) => x.id !== ev.id) })
                    }
                  />
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* --- MESSAGES --- */}
      {tab === "messages" && advanced && (
        <div className="space-y-3">
          <Card title="Message Overrides">
            <div className="mb-2 text-[11px] text-muted-foreground">
              Toggle a message to override its default game text. Disabled messages fall back to the base text for the selected career type.
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {MESSAGE_KEYS.map((k) => {
                const m = messages[k];
                return (
                  <div key={k} className="grid grid-cols-12 gap-2 rounded-md border border-border bg-background/60 px-2.5 py-2">
                    <div className="col-span-3 flex items-center gap-2">
                      <Toggle
                        checked={m.enabled}
                        onChange={(v) => setMessages({ ...messages, [k]: { ...m, enabled: v } })}
                        label={m.enabled ? "On" : "Off"}
                      />
                      <span className="font-mono text-[11px]">{k}</span>
                    </div>
                    <div className="col-span-9">
                      <Input
                        disabled={!m.enabled}
                        value={m.text}
                        onChange={(e) => setMessages({ ...messages, [k]: { ...m, text: e.target.value } })}
                        placeholder={`Default: ${k} message text…`}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* --- ADVANCED --- */}
      {tab === "advanced" && advanced && (
        <div className="space-y-3">
          <Card title="Availability Conditions" action={
            <button
              onClick={() => setAvailabilityConditions([...availabilityConditions, "New condition"])}
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          }>
            <ul className="space-y-1.5">
              {availabilityConditions.map((c, i) => (
                <li key={i} className="flex items-center gap-2">
                  <ShieldCheck className="h-3 w-3 text-[var(--teal)]" />
                  <Input
                    value={c}
                    onChange={(e) => {
                      const cp = [...availabilityConditions];
                      cp[i] = e.target.value;
                      setAvailabilityConditions(cp);
                    }}
                    className="h-7 text-xs"
                  />
                  <button
                    onClick={() => setAvailabilityConditions(availabilityConditions.filter((_, j) => j !== i))}
                    className="rounded p-1 hover:bg-accent"
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Performance Statistic">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Statistic Name" value="job_performance" />
              <NumField label="Min" value={-100} onChange={() => {}} />
              <NumField label="Max" value={100} onChange={() => {}} />
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">
              Auto-created backing statistic for job performance (V5 default).
            </div>
          </Card>

          <Card title="XML Output">
            <pre className="max-h-64 overflow-auto rounded-md border border-border bg-[color-mix(in_oklab,var(--foreground)_4%,var(--card))] p-3 font-mono text-[10.5px] leading-relaxed text-foreground/85">
{`<Career id="0xA112E8" name="career_interstellar_navigator" type="${careerType}">
  <Ages>${AGES.filter((a) => ages[a]).join(",")}</Ages>
  <PTO enabled="${ptoEnabled}" initial="${ptoInitial}" />
  <Track name="${branch.name}">
${branch.ranks
  .map(
    (r) =>
      `    <Level lvl="${r.lvl}" title="${r.title}" pay="${r.simoleonsPerHour}" begin="${String(
        r.beginHour,
      ).padStart(2, "0")}:${String(r.beginMinute).padStart(2, "0")}" duration="${r.durationHours}" />`,
  )
  .join("\n")}
  </Track>
</Career>`}
            </pre>
          </Card>
        </div>
      )}
    </div>
  );

  return <PreviewSplit editor={editor} preview={<CareerPreview data={previewData} />} />;
}

/* --- Rank editor row --- */

function RankRow({
  rank,
  advanced,
  onChange,
  onRemove,
}: {
  rank: Rank;
  advanced: boolean;
  onChange: (patch: Partial<Rank>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-md border border-border bg-background/60">
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--blue)]/15 text-[10px] font-bold text-[var(--blue)]">
          {rank.lvl}
        </span>
        <Input
          value={rank.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="h-7 flex-1 text-xs font-medium"
        />
        <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
          §
          <Input
            type="number"
            value={rank.simoleonsPerHour}
            onChange={(e) => onChange({ simoleonsPerHour: Number(e.target.value) })}
            className="h-7 w-16 text-xs"
          />
          /hr
        </div>
        <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <Input
            type="number"
            value={rank.beginHour}
            onChange={(e) => onChange({ beginHour: Number(e.target.value) })}
            className="h-7 w-12 text-xs"
          />
          +
          <Input
            type="number"
            value={rank.durationHours}
            onChange={(e) => onChange({ durationHours: Number(e.target.value) })}
            className="h-7 w-12 text-xs"
          />
          h
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center rounded p-1 hover:bg-accent"
          title="More"
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <CopyToMenu what={`rank "${rank.title}"`} compact />
        <button onClick={onRemove} className="rounded p-1 hover:bg-accent" title="Remove">
          <Trash2 className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
      {expanded && (
        <div className="space-y-3 border-t border-border p-3">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Requirements / Description
            </label>
            <Input
              value={rank.description}
              onChange={(e) => onChange({ description: e.target.value })}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Work Days
            </label>
            <div className="flex flex-wrap gap-1">
              {DAYS.map((d, i) => (
                <Toggle
                  key={d}
                  checked={rank.days[i]}
                  onChange={(v) => {
                    const days = [...rank.days];
                    days[i] = v;
                    onChange({ days });
                  }}
                  label={d}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <NumField
              label="Begin Minute"
              value={rank.beginMinute}
              onChange={(v) => onChange({ beginMinute: v })}
              min={0}
              max={59}
            />
            <NumField
              label="Perf. for Promotion"
              value={rank.performanceForPromotion}
              onChange={(v) => onChange({ performanceForPromotion: v })}
              min={-100}
              max={100}
            />
            <Field
              label="Uniform"
              value={rank.uniform}
              onChange={(v) => onChange({ uniform: v })}
              hint="Outfit reference"
            />
            <Field
              label="Promotion Reward"
              value={rank.promotionReward}
              onChange={(v) => onChange({ promotionReward: v })}
              hint="Buff, moodlet, or object"
            />
            <Field
              label="Objective / Aspiration"
              value={rank.objectiveSet}
              onChange={(v) => onChange({ objectiveSet: v })}
              hint="Attached objective set"
            />
          </div>
          {advanced && (
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Inverted Emotions
              </label>
              <div className="flex flex-wrap gap-1">
                {EMOTIONS.map((em) => (
                  <Toggle
                    key={em}
                    checked={rank.invertedEmotions[em]}
                    onChange={(v) =>
                      onChange({ invertedEmotions: { ...rank.invertedEmotions, [em]: v } })
                    }
                    label={em}
                  />
                ))}
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                Invert how these emotions affect performance at this level.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* --- Event editor --- */

function EventEditor({
  event,
  onChange,
  onRemove,
}: {
  event: CareerEventItem;
  onChange: (patch: Partial<CareerEventItem>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-md border border-border bg-background/60 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-[var(--violet)]" />
        <Input
          value={event.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="h-7 flex-1 text-xs font-semibold"
        />
        <button onClick={onRemove} className="rounded p-1 hover:bg-accent">
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Situation" value={event.situation} onChange={(v) => onChange({ situation: v })} />
        <Field label="Zone Director" value={event.zoneDirector} onChange={(v) => onChange({ zoneDirector: v })} />
        <Field label="Venue" value={event.venue} onChange={(v) => onChange({ venue: v })} />
        <Field label="No Medal" value={event.noMedalText} onChange={(v) => onChange({ noMedalText: v })} />
        <Field label="Bronze" value={event.bronzeText} onChange={(v) => onChange({ bronzeText: v })} />
        <Field label="Silver" value={event.silverText} onChange={(v) => onChange({ silverText: v })} />
        <Field label="Gold" value={event.goldText} onChange={(v) => onChange({ goldText: v })} />
        <Field label="Loot on Start" value={event.lootOnStart} onChange={(v) => onChange({ lootOnStart: v })} />
        <Field label="Loot on End" value={event.lootOnEnd} onChange={(v) => onChange({ lootOnEnd: v })} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Toggle
          checked={event.showEndOfDayReport}
          onChange={(v) => onChange({ showEndOfDayReport: v })}
          label="End-of-Day Report"
        />
      </div>
      {event.showEndOfDayReport && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Field label="Report Title" value={event.endOfDayTitle} onChange={(v) => onChange({ endOfDayTitle: v })} />
          <Field label="Report Text" value={event.endOfDayText} onChange={(v) => onChange({ endOfDayText: v })} />
        </div>
      )}
    </div>
  );
}

/* ---------- Trait Builder (Zerbu V5 aligned) ---------- */

const TRAIT_TYPES = ["Personality", "Gameplay", "Hidden", "Aspiration", "Phase"] as const;
type TraitType = (typeof TRAIT_TYPES)[number];
const TRAIT_CATEGORIES = ["Emotional", "Hobby", "Lifestyle", "Social"] as const;
type TraitCategory = (typeof TRAIT_CATEGORIES)[number];

const TRAIT_AGES = [
  { id: "infant", label: "Infant" },
  { id: "toddler", label: "Toddler" },
  { id: "child", label: "Child" },
  { id: "teen", label: "Teen" },
  { id: "youngAdult", label: "Young Adult" },
  { id: "adult", label: "Adult" },
  { id: "elder", label: "Elder" },
] as const;
type AgeId = (typeof TRAIT_AGES)[number]["id"];

const EMOTIONS_V5 = [
  "Happy", "Angry", "Bored", "Confident", "Embarrassed", "Energized",
  "Fine", "Flirty", "Focused", "Inspired", "Playful", "Sad",
  "Stressed", "Uncomfortable", "Scared",
] as const;
type EmotionV5 = (typeof EMOTIONS_V5)[number];

const VOICE_EFFECTS = ["None", "Robotic", "Ghost", "Alien", "Muffled", "Underwater", "Whisper"];

type TraitBuff = {
  id: string;
  name: string;
  description: string;
  emotion: EmotionV5;
  weight: number;
  duration: string;
  hasEmotion: boolean;
  color: string;
  icon: string;
};

type TraitTab =
  | "identity"
  | "buffs"
  | "special"
  | "modifiers"
  | "social"
  | "advanced";

const EMOTION_COLOR: Record<EmotionV5, string> = {
  Happy: "green", Angry: "red", Bored: "gray", Confident: "amber",
  Embarrassed: "pink", Energized: "yellow", Fine: "blue", Flirty: "pink",
  Focused: "blue", Inspired: "violet", Playful: "orange", Sad: "blue",
  Stressed: "red", Uncomfortable: "gray", Scared: "violet",
};

const EMOTION_ICON: Record<EmotionV5, string> = {
  Happy: "😊", Angry: "😠", Bored: "😐", Confident: "😎",
  Embarrassed: "😳", Energized: "⚡", Fine: "🙂", Flirty: "😘",
  Focused: "🎯", Inspired: "💡", Playful: "😄", Sad: "😢",
  Stressed: "😰", Uncomfortable: "😖", Scared: "😱",
};

function TraitBuilder() {
  const { advanced } = useAdvanced();
  const [tab, setTab] = useState<TraitTab>("identity");

  const [name, setName] = useState("Lucid Dreamer");
  const [description, setDescription] = useState(
    "This Sim experiences vivid dreams that grant temporary skill boosts on waking.",
  );
  const [icon, setIcon] = useState("ic_trait_lucid.png");
  const [traitType, setTraitType] = useState<TraitType>("Personality");
  const [category, setCategory] = useState<TraitCategory>("Emotional");
  const [ages, setAges] = useState<Record<AgeId, boolean>>({
    infant: false, toddler: false, child: true, teen: true,
    youngAdult: true, adult: true, elder: true,
  });

  const [buffs, setBuffs] = useState<TraitBuff[]>([
    { id: "b1", name: "Well-Rested Focus", description: "Sharp after a good dream.", emotion: "Focused", weight: 2, duration: "6h", hasEmotion: true, color: "blue", icon: "🎯" },
    { id: "b2", name: "Dream Recall", description: "Struck by a vivid memory.", emotion: "Inspired", weight: 1, duration: "3h", hasEmotion: true, color: "violet", icon: "💭" },
    { id: "b3", name: "Foggy Morning", description: "Slow to shake the dream.", emotion: "Uncomfortable", weight: 1, duration: "2h", hasEmotion: true, color: "gray", icon: "🌫️" },
  ]);
  const [selectedBuffId, setSelectedBuffId] = useState<string>("b1");
  const selectedBuff = buffs.find((b) => b.id === selectedBuffId) ?? buffs[0];

  const [blockAging, setBlockAging] = useState<Record<AgeId, boolean>>({
    infant: false, toddler: false, child: false, teen: false,
    youngAdult: false, adult: false, elder: false,
  });
  const [blockedEmotions, setBlockedEmotions] = useState<EmotionV5[]>([]);
  const [hideRelationships, setHideRelationships] = useState(false);
  const [immuneToDeath, setImmuneToDeath] = useState(false);
  const [isNonPersisted, setIsNonPersisted] = useState(false);
  const [isNPCOnly, setIsNPCOnly] = useState(false);
  const [isGlobalTrait, setIsGlobalTrait] = useState(false);
  const [traitOrigin, setTraitOrigin] = useState("Earned through vivid dreaming.");
  const [voiceEffect, setVoiceEffect] = useState("None");

  const [skillMults, setSkillMults] = useState([
    { skill: "Logic", mult: 1.15 },
    { skill: "Wellness", mult: 1.10 },
  ]);
  const [needMults, setNeedMults] = useState([{ need: "Energy Decay", mult: 0.85 }]);
  const [relMults, setRelMults] = useState([{ track: "Friendship (gain)", mult: 1.05 }]);
  const [commodities, setCommodities] = useState([{ commodity: "Autonomy: Sleep", weight: 1.5 }]);

  const [whimSet, setWhimSet] = useState("Whims_LucidDreamer");
  const [socialInteractions, setSocialInteractions] = useState(["Share Dream Story", "Ask About Nightmares"]);
  const [buffReplacements, setBuffReplacements] = useState([{ from: "Buff_Tired", to: "Buff_Focused_Lucid" }]);
  const [proximityBuffs, setProximityBuffs] = useState(["Buff_LucidAmbience"]);

  const [lootActionSets, setLootActionSets] = useState(["Loot_TraitAdd_LucidWelcome"]);
  const [blacklist, setBlacklist] = useState(["Insomniac", "Hot-Headed"]);
  const [whitelist, setWhitelist] = useState<string[]>([]);

  const previewData: TraitPreviewData = {
    name,
    description,
    category,
    emoji: "✨",
    color: "violet",
    buffs: buffs.map((b) => ({
      name: b.name,
      mood: `${b.emotion} +${b.weight}`,
      duration: b.duration,
      color: EMOTION_COLOR[b.emotion] ?? "blue",
      icon: b.icon || EMOTION_ICON[b.emotion],
      description: b.description || `Triggered by ${name}.`,
    })),
    effects: [
      traitType === "Personality" ? `Category: ${category}` : `Type: ${traitType}`,
      hideRelationships ? "Hides relationship panel entries" : "Standard relationship visibility",
      immuneToDeath ? "Sim cannot die from most causes" : "",
      isGlobalTrait ? "Applies globally to all matching Sims" : "",
    ].filter(Boolean),
    autonomy: traitOrigin,
  };

  const tabs: { id: TraitTab; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; advanced?: boolean }[] = [
    { id: "identity", label: "Identity", icon: Sparkles },
    { id: "buffs", label: "Buffs & Moodlets", icon: Bell },
    { id: "special", label: "Special Cases", icon: Shield, advanced: true },
    { id: "modifiers", label: "Modifiers", icon: Sliders, advanced: true },
    { id: "social", label: "Social & Whims", icon: Users, advanced: true },
    { id: "advanced", label: "Advanced", icon: FileCode2, advanced: true },
  ];

  const toggleAge = (id: AgeId) => setAges((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleBlockAge = (id: AgeId) => setBlockAging((prev) => ({ ...prev, [id]: !prev[id] }));

  const editor = (
    <div className="space-y-4">
      <PageHeader
        icon={Sparkles}
        subtitle="Builder · V5 aligned"
        title="Trait Builder"
        accent="violet"
        actions={
          <>
            <GhostBtn icon={Wand2} onClick={() => toast("Applied Lucid Dreamer template")}>Template</GhostBtn>
            <GhostBtn icon={Save} onClick={() => toast.success("Trait saved")}>Save Draft</GhostBtn>
            <PrimaryBtn icon={Play} onClick={() => toast.success("Trait compiled → lucid_dreamer.package")}>
              Compile
            </PrimaryBtn>
          </>
        }
      />

      {!advanced && (
        <div className="rounded-lg border border-[var(--violet)]/25 bg-[var(--violet)]/5 px-3 py-2 text-[11px] text-muted-foreground">
          Simple mode — Identity and Buffs are shown. Turn on Advanced in the top bar for special cases, modifiers, social interactions, and raw tuning.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1 border-b border-border">
        {tabs
          .filter((t) => !t.advanced || advanced)
          .map((t) => {
            const Ic = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-[11.5px] font-semibold transition-colors",
                  tab === t.id
                    ? "border-[var(--violet)] text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Ic className="h-3.5 w-3.5" />
                {t.label}
                {t.advanced && (
                  <span className="rounded bg-muted px-1 py-0.5 text-[9px] font-bold text-muted-foreground">
                    ADV
                  </span>
                )}
              </button>
            );
          })}
      </div>

      {tab === "identity" && (
        <div className="space-y-4">
          <Card title="Trait Identity">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Trait Name" value={name} onChange={setName} />
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Trait Type
                </label>
                <select
                  value={traitType}
                  onChange={(e) => setTraitType(e.target.value as TraitType)}
                  className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                >
                  {TRAIT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  Personality shows in CAS; Hidden is set by gameplay only.
                </div>
              </div>
              {traitType === "Personality" && (
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TraitCategory)}
                    className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                  >
                    {TRAIT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="col-span-2">
                <ImageField
                  label="Trait Icon"
                  value={icon}
                  onChange={setIcon}
                  slot="icon"
                  hint="Small square icon shown in CAS and tooltips"
                  context={{ subject: `${name || "trait"} icon`, style: "flat, game UI" }}
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-16 resize-none text-xs"
                />
              </div>
            </div>
          </Card>

          <Card title="Available For (Ages)">
            <div className="flex flex-wrap gap-1.5">
              {TRAIT_AGES.map((a) => (
                <button
                  key={a.id}
                  onClick={() => toggleAge(a.id)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                    ages[a.id]
                      ? "border-[var(--violet)] bg-[var(--violet)]/10 text-foreground"
                      : "border-border bg-muted/40 text-muted-foreground hover:bg-accent",
                  )}
                >
                  {ages[a.id] ? "✓ " : ""}{a.label}
                </button>
              ))}
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">
              Uncheck an age to hide the trait from that life stage.
            </div>
          </Card>
        </div>
      )}

      {tab === "buffs" && (
        <Card
          title="Buffs & Moodlets"
          action={<CopyToMenu what="all buffs" label="Copy buffs to…" disallowBranches />}
        >
          <div className="mb-2 flex flex-wrap gap-1">
            {buffs.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBuffId(b.id)}
                className={cn(
                  "rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors",
                  b.id === selectedBuffId
                    ? "border-[var(--violet)] bg-[var(--violet)]/10"
                    : "border-border bg-muted/40 text-muted-foreground hover:bg-accent",
                )}
              >
                {b.icon} {b.name || "Untitled"}
              </button>
            ))}
            <button
              onClick={() => {
                const id = `b${Date.now()}`;
                setBuffs((p) => [
                  ...p,
                  { id, name: "New Buff", description: "", emotion: "Happy", weight: 1, duration: "2h", hasEmotion: true, color: "green", icon: "🙂" },
                ]);
                setSelectedBuffId(id);
              }}
              className="rounded-md border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent"
            >
              <Plus className="mr-1 inline h-3 w-3" /> Add Buff
            </button>
          </div>

          {selectedBuff && (
            <div className="space-y-3 rounded-md border border-border bg-background/60 p-3">
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Buff Name"
                  value={selectedBuff.name}
                  onChange={(v) => setBuffs((p) => p.map((b) => b.id === selectedBuff.id ? { ...b, name: v } : b))}
                />
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Emotion
                  </label>
                  <select
                    value={selectedBuff.emotion}
                    onChange={(e) => setBuffs((p) => p.map((b) => b.id === selectedBuff.id ? { ...b, emotion: e.target.value as EmotionV5, color: EMOTION_COLOR[e.target.value as EmotionV5] } : b))}
                    className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                  >
                    {EMOTIONS_V5.map((em) => (
                      <option key={em} value={em}>{EMOTION_ICON[em]} {em}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Emotion Weight
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={selectedBuff.weight}
                    onChange={(e) => setBuffs((p) => p.map((b) => b.id === selectedBuff.id ? { ...b, weight: Number(e.target.value) || 1 } : b))}
                    className="h-8 text-xs"
                  />
                </div>
                <Field
                  label="Duration"
                  value={selectedBuff.duration}
                  onChange={(v) => setBuffs((p) => p.map((b) => b.id === selectedBuff.id ? { ...b, duration: v } : b))}
                  hint="e.g. 4h, 240 min, permanent"
                />
                <div className="col-span-2">
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Description
                  </label>
                  <Textarea
                    value={selectedBuff.description}
                    onChange={(e) => setBuffs((p) => p.map((b) => b.id === selectedBuff.id ? { ...b, description: e.target.value } : b))}
                    className="h-14 resize-none text-xs"
                  />
                </div>
                <label className="col-span-2 inline-flex items-center gap-2 text-[11.5px]">
                  <input
                    type="checkbox"
                    checked={selectedBuff.hasEmotion}
                    onChange={(e) => setBuffs((p) => p.map((b) => b.id === selectedBuff.id ? { ...b, hasEmotion: e.target.checked } : b))}
                  />
                  Visible in the Moodlets panel
                  <span className="text-muted-foreground">(uncheck for silent buffs)</span>
                </label>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    const remaining = buffs.filter((b) => b.id !== selectedBuff.id);
                    setBuffs(remaining);
                    setSelectedBuffId(remaining[0]?.id ?? "");
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10.5px] text-muted-foreground hover:bg-destructive hover:text-white"
                >
                  <Trash2 className="h-3 w-3" /> Delete buff
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {tab === "special" && advanced && (
        <div className="space-y-4">
          <Card title="Behavior Flags">
            <div className="grid grid-cols-2 gap-2 text-[11.5px]">
              <FlagToggle checked={hideRelationships} onChange={setHideRelationships} label="Hide from Relationships panel" />
              <FlagToggle checked={immuneToDeath} onChange={setImmuneToDeath} label="Immune to death" />
              <FlagToggle checked={isNonPersisted} onChange={setIsNonPersisted} label="Non-persisted (temporary)" />
              <FlagToggle checked={isNPCOnly} onChange={setIsNPCOnly} label="NPC-only" />
              <FlagToggle checked={isGlobalTrait} onChange={setIsGlobalTrait} label="Global trait (all matching Sims)" />
            </div>
          </Card>

          <Card title="Aging & Voice">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Block Aging From</div>
            <div className="flex flex-wrap gap-1.5">
              {TRAIT_AGES.map((a) => (
                <button
                  key={a.id}
                  onClick={() => toggleBlockAge(a.id)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                    blockAging[a.id]
                      ? "border-[var(--red)] bg-[var(--red)]/10 text-foreground"
                      : "border-border bg-muted/40 text-muted-foreground hover:bg-accent",
                  )}
                >
                  {blockAging[a.id] ? "⏸ " : ""}{a.label}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Voice Effect
                </label>
                <select
                  value={voiceEffect}
                  onChange={(e) => setVoiceEffect(e.target.value)}
                  className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                >
                  {VOICE_EFFECTS.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <Field label="Trait Origin" value={traitOrigin} onChange={setTraitOrigin} hint="Shown as the 'how did I get this trait?' text." />
            </div>
          </Card>

          <Card title="Blocked Emotions">
            <div className="flex flex-wrap gap-1.5">
              {EMOTIONS_V5.map((em) => {
                const on = blockedEmotions.includes(em);
                return (
                  <button
                    key={em}
                    onClick={() => setBlockedEmotions((p) => on ? p.filter((x) => x !== em) : [...p, em])}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10.5px] font-semibold transition-colors",
                      on
                        ? "border-[var(--red)] bg-[var(--red)]/10 text-foreground"
                        : "border-border bg-muted/40 text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {on ? "⊘ " : ""}{EMOTION_ICON[em]} {em}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">
              Sims with this trait cannot enter selected emotions.
            </div>
          </Card>
        </div>
      )}

      {tab === "modifiers" && advanced && (
        <div className="space-y-4">
          <MultiplierList title="Skill Multipliers" hint="Multiplies skill gain rate while active." rows={skillMults} keyLabel="Skill" keyField="skill" onChange={setSkillMults} />
          <MultiplierList title="Need Modifiers" hint="Values <1 slow decay, >1 speed it up." rows={needMults} keyLabel="Need" keyField="need" onChange={setNeedMults} />
          <MultiplierList title="Relationship Track Multipliers" hint="Applied to relationship gains/losses." rows={relMults} keyLabel="Track" keyField="track" onChange={setRelMults} />
          <Card title="Autonomy Commodities">
            <div className="mb-2 text-[10px] text-muted-foreground">Higher weight → more likely to run related interactions autonomously.</div>
            <ul className="space-y-1.5">
              {commodities.map((c, i) => (
                <li key={i} className="grid grid-cols-[1fr_6rem_auto] gap-2">
                  <Input
                    value={c.commodity}
                    onChange={(e) => setCommodities((p) => p.map((x, xi) => xi === i ? { ...x, commodity: e.target.value } : x))}
                    className="h-7 text-xs"
                  />
                  <Input
                    type="number"
                    step="0.05"
                    value={c.weight}
                    onChange={(e) => setCommodities((p) => p.map((x, xi) => xi === i ? { ...x, weight: Number(e.target.value) || 0 } : x))}
                    className="h-7 text-xs"
                  />
                  <button
                    onClick={() => setCommodities((p) => p.filter((_, xi) => xi !== i))}
                    className="rounded-md border border-border px-2 text-muted-foreground hover:bg-accent"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setCommodities((p) => [...p, { commodity: "New Commodity", weight: 1 }])}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-1.5 text-[11px] text-muted-foreground hover:bg-accent"
            >
              <Plus className="h-3 w-3" /> Add Commodity
            </button>
          </Card>
        </div>
      )}

      {tab === "social" && advanced && (
        <div className="space-y-4">
          <Card title="Whim Set">
            <Field label="Whim Set Reference" value={whimSet} onChange={setWhimSet} hint="Whim set used when this trait is active." />
          </Card>

          <Card title="Social Interactions">
            <ul className="space-y-1">
              {socialInteractions.map((si, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Input
                    value={si}
                    onChange={(e) => setSocialInteractions((p) => p.map((x, xi) => xi === i ? e.target.value : x))}
                    className="h-7 text-xs"
                  />
                  <button
                    onClick={() => setSocialInteractions((p) => p.filter((_, xi) => xi !== i))}
                    className="rounded-md border border-border p-1 text-muted-foreground hover:bg-accent"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setSocialInteractions((p) => [...p, "New Interaction"])}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-1.5 text-[11px] text-muted-foreground hover:bg-accent"
            >
              <Plus className="h-3 w-3" /> Add Interaction
            </button>
          </Card>

          <Card title="Buff Replacements">
            <div className="mb-2 text-[10px] text-muted-foreground">Replace the "from" buff with the "to" buff while trait is active.</div>
            <ul className="space-y-1.5">
              {buffReplacements.map((r, i) => (
                <li key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Input
                    value={r.from}
                    placeholder="Original buff"
                    onChange={(e) => setBuffReplacements((p) => p.map((x, xi) => xi === i ? { ...x, from: e.target.value } : x))}
                    className="h-7 text-xs"
                  />
                  <Input
                    value={r.to}
                    placeholder="Replacement buff"
                    onChange={(e) => setBuffReplacements((p) => p.map((x, xi) => xi === i ? { ...x, to: e.target.value } : x))}
                    className="h-7 text-xs"
                  />
                  <button
                    onClick={() => setBuffReplacements((p) => p.filter((_, xi) => xi !== i))}
                    className="rounded-md border border-border p-1 text-muted-foreground hover:bg-accent"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setBuffReplacements((p) => [...p, { from: "", to: "" }])}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-1.5 text-[11px] text-muted-foreground hover:bg-accent"
            >
              <Plus className="h-3 w-3" /> Add Replacement
            </button>
          </Card>

          <Card title="Proximity Buffs">
            <div className="mb-2 text-[10px] text-muted-foreground">Granted to nearby Sims while this Sim is present.</div>
            <ChipList items={proximityBuffs} onChange={setProximityBuffs} placeholder="Buff reference" />
          </Card>
        </div>
      )}

      {tab === "advanced" && advanced && (
        <div className="space-y-4">
          <Card title="Setup Actions (Loot on Trait Add)">
            <ChipList items={lootActionSets} onChange={setLootActionSets} placeholder="Loot Action Set reference" />
          </Card>

          <Card title="Conflicting Traits (Blacklist)">
            <ChipList items={blacklist} onChange={setBlacklist} placeholder="Trait name" />
            <div className="mt-1 text-[10px] text-muted-foreground">
              Sims cannot receive this trait if they already have any listed trait.
            </div>
          </Card>

          <Card title="Required Traits (Whitelist)">
            <ChipList items={whitelist} onChange={setWhitelist} placeholder="Trait name" />
            <div className="mt-1 text-[10px] text-muted-foreground">
              Only Sims with a listed trait can receive this one.
            </div>
          </Card>

          <Card title="XML Manifest Preview" action={<GhostBtn icon={Copy} onClick={() => toast("XML copied")}>Copy</GhostBtn>}>
            <pre className="max-h-64 overflow-auto rounded-md bg-muted/40 p-3 text-[10.5px] leading-relaxed">
{`<Trait n="${name.replace(/\s+/g, "_")}"
  type="${traitType}"${traitType === "Personality" ? `
  category="TraitGroup_${category}"` : ""}
  ages="${TRAIT_AGES.filter((a) => ages[a.id]).map((a) => a.label).join(",")}"
  hide_relationships="${hideRelationships}"
  can_die="${!immuneToDeath}"
  persistable="${!isNonPersisted}"
  npc_only="${isNPCOnly}"
  global="${isGlobalTrait}"
  voice_effect="${voiceEffect}">
  <buffs count="${buffs.length}" />
  <block_aging count="${TRAIT_AGES.filter((a) => blockAging[a.id]).length}" />
  <blocked_emotions count="${blockedEmotions.length}" />
  <skill_multipliers count="${skillMults.length}" />
  <social_interactions count="${socialInteractions.length}" />
  <buff_replacements count="${buffReplacements.length}" />
  <blacklist_traits count="${blacklist.length}" />
</Trait>`}
            </pre>
          </Card>
        </div>
      )}
    </div>
  );

  return <PreviewSplit editor={editor} preview={<TraitPreview data={previewData} />} />;
}

/* ---------- Trait Builder helpers ---------- */

function FlagToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background/60 px-2 py-1.5 hover:bg-accent/40">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function ChipList({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <span key={it + i} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10.5px]">
            {it}
            <button
              onClick={() => onChange(items.filter((_, xi) => xi !== i))}
              className="text-muted-foreground hover:text-destructive"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              onChange([...items, draft.trim()]);
              setDraft("");
            }
          }}
          className="h-7 text-xs"
        />
        <button
          onClick={() => { if (draft.trim()) { onChange([...items, draft.trim()]); setDraft(""); } }}
          className="rounded-md border border-border px-2 text-[11px] hover:bg-accent"
        >
          Add
        </button>
      </div>
    </div>
  );
}

type MultiplierRow = Record<string, string | number>;
function MultiplierList<T extends MultiplierRow>({
  title,
  hint,
  rows,
  keyLabel,
  keyField,
  onChange,
}: {
  title: string;
  hint?: string;
  rows: T[];
  keyLabel: string;
  keyField: keyof T & string;
  onChange: (rows: T[]) => void;
}) {
  return (
    <Card title={title}>
      {hint && <div className="mb-2 text-[10px] text-muted-foreground">{hint}</div>}
      <div className="grid grid-cols-[1fr_6rem_auto] gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>{keyLabel}</span>
        <span>Multiplier</span>
        <span />
      </div>
      <ul className="mt-1 space-y-1.5">
        {rows.map((r, i) => (
          <li key={i} className="grid grid-cols-[1fr_6rem_auto] gap-2">
            <Input
              value={String(r[keyField])}
              onChange={(e) => onChange(rows.map((x, xi) => xi === i ? { ...x, [keyField]: e.target.value } as T : x))}
              className="h-7 text-xs"
            />
            <Input
              type="number"
              step="0.05"
              value={Number(r.mult)}
              onChange={(e) => onChange(rows.map((x, xi) => xi === i ? { ...x, mult: Number(e.target.value) || 0 } as T : x))}
              className="h-7 text-xs"
            />
            <button
              onClick={() => onChange(rows.filter((_, xi) => xi !== i))}
              className="rounded-md border border-border px-2 text-muted-foreground hover:bg-accent"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>
      <button
        onClick={() => onChange([...rows, { [keyField]: "New", mult: 1 } as unknown as T])}
        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-1.5 text-[11px] text-muted-foreground hover:bg-accent"
      >
        <Plus className="h-3 w-3" /> Add
      </button>
    </Card>
  );
}

/* ---------- Aspiration Builder ---------- */

function AspirationBuilder() {
  const [name, setName] = useState("Trailblazer");
  const [category, setCategory] = useState("Adventure");
  const [rewardTrait, setRewardTrait] = useState("Explorer's Instinct");
  const [description, setDescription] = useState(
    "Chart the unknown and become a legend across the map.",
  );
  const [tiers, setTiers] = useState([
    { t: "I", title: "Curious Wanderer", goals: ["Visit 3 lots", "Meet 5 sims"], done: true },
    { t: "II", title: "Field Journalist", goals: ["Collect 10 artifacts", "Write 2 field notes"], done: true },
    { t: "III", title: "Named Explorer", goals: ["Discover secret area", "Level Fitness to 6"], done: false },
    { t: "IV", title: "Legendary Trailblazer", goals: ["Complete 3 expeditions"], done: false },
  ]);

  const previewData: AspirationPreviewData = {
    name,
    category,
    emoji: "🎯",
    color: "teal",
    rewardTrait,
    description,
    tiers: tiers.map((tier, i) => ({
      tier: tier.t,
      title: tier.title,
      objectives: tier.goals.map((g, gi) => ({ label: g, done: tier.done || (i === 2 && gi === 0) })),
      progress: tier.done ? 1 : i === 2 ? 0.4 : 0,
    })),
  };

  const editor = (
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
      <Card title="Aspiration">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" value={name} onChange={setName} />
          <Field label="Category" value={category} onChange={setCategory} />
          <Field label="Bonus Trait" value={rewardTrait} onChange={setRewardTrait} />
          <Field label="Icon" value="ic_asp_trailblazer.png" />
        </div>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-3 h-16 resize-none text-xs"
        />
      </Card>

      <Card title="Tiers" action={<CopyToMenu what="all tiers & rewards" label="Copy tiers to…" disallowBranches />}>
        <ol className="space-y-2">
          {tiers.map((tier, i) => (
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
                <Input
                  value={tier.title}
                  onChange={(e) =>
                    setTiers((prev) => prev.map((x, xi) => (xi === i ? { ...x, title: e.target.value } : x)))
                  }
                  className="h-7 flex-1 text-xs font-semibold"
                />
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
  );

  return <PreviewSplit editor={editor} preview={<AspirationPreview data={previewData} />} />;
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

/* ---------- Assets (with renameable folders) ---------- */

type AssetFile = { name: string; size: string; kind: string };
type AssetFolder = { id: string; name: string; files: AssetFile[] };

const INITIAL_FOLDERS: AssetFolder[] = [
  {
    id: "f_icons",
    name: "Icons",
    files: [
      { name: "ic_trait_lucid.png", size: "12 KB", kind: "Icon" },
      { name: "ic_asp_trailblazer.png", size: "16 KB", kind: "Icon" },
      { name: "moodlet_dream.png", size: "9 KB", kind: "Icon" },
    ],
  },
  {
    id: "f_textures",
    name: "Textures",
    files: [
      { name: "career_astro_bg.dds", size: "1.4 MB", kind: "Texture" },
      { name: "loading_astro.dds", size: "2.1 MB", kind: "Texture" },
    ],
  },
  {
    id: "f_strings",
    name: "Strings",
    files: [{ name: "en_US.stbl", size: "8 KB", kind: "Strings" }],
  },
];

function AssetsView() {
  const [folders, setFolders] = useState<AssetFolder[]>(INITIAL_FOLDERS);
  const [activeId, setActiveId] = useState<string>(INITIAL_FOLDERS[0].id);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const active = folders.find((f) => f.id === activeId) ?? folders[0];

  function addFolder() {
    const id = `f_${Date.now()}`;
    const name = `New Folder ${folders.length + 1}`;
    setFolders((prev) => [...prev, { id, name, files: [] }]);
    setActiveId(id);
    setRenameId(id);
    setDraft(name);
    toast.success("Folder created");
  }

  function commitRename() {
    if (!renameId) return;
    setFolders((prev) =>
      prev.map((f) => (f.id === renameId ? { ...f, name: draft.trim() || f.name } : f)),
    );
    setRenameId(null);
    toast.success("Folder renamed");
  }

  function deleteFolder(id: string) {
    if (folders.length === 1) {
      toast.error("Keep at least one folder");
      return;
    }
    setFolders((prev) => prev.filter((f) => f.id !== id));
    if (activeId === id) setActiveId(folders[0].id);
    toast.success("Folder removed");
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Boxes}
        subtitle="Pipeline"
        title="Assets"
        accent="orange"
        actions={
          <>
            <GhostBtn icon={FolderPlus} onClick={addFolder}>New Folder</GhostBtn>
            <GhostBtn icon={Download}>Export</GhostBtn>
            <PrimaryBtn icon={Upload} onClick={() => toast.success(`2 files imported into ${active.name}`)}>
              Import
            </PrimaryBtn>
          </>
        }
      />

      <div className="grid grid-cols-[220px_1fr] gap-4">
        {/* Folder tree */}
        <Card title="Folders" className="p-2">
          <ul className="space-y-0.5">
            {folders.map((f) => (
              <li key={f.id} className="group">
                {renameId === f.id ? (
                  <div className="flex items-center gap-1 px-1">
                    <FolderOpen className="h-3.5 w-3.5 text-[var(--orange)]" />
                    <Input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") setRenameId(null);
                      }}
                      className="h-7 text-xs"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveId(f.id)}
                    onDoubleClick={() => {
                      setRenameId(f.id);
                      setDraft(f.name);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs",
                      activeId === f.id
                        ? "bg-accent font-semibold"
                        : "hover:bg-accent/60",
                    )}
                  >
                    <FolderOpen
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        activeId === f.id ? "text-[var(--orange)]" : "text-muted-foreground",
                      )}
                    />
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {f.files.length}
                    </span>
                    <span className="hidden gap-0.5 group-hover:flex">
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="Rename folder"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameId(f.id);
                          setDraft(f.name);
                        }}
                        className="rounded p-0.5 hover:bg-background"
                      >
                        <Pencil className="h-3 w-3" />
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="Delete folder"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFolder(f.id);
                        }}
                        className="rounded p-0.5 hover:bg-background"
                      >
                        <Trash2 className="h-3 w-3 text-[var(--red)]" />
                      </span>
                    </span>
                  </button>
                )}
              </li>
            ))}
          </ul>
          <button
            onClick={addFolder}
            className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border py-1.5 text-[11px] text-muted-foreground hover:bg-accent/40"
          >
            <FolderPlus className="h-3 w-3" /> Add folder
          </button>
          <div className="mt-2 border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
            Double-click a folder to rename.
          </div>
        </Card>

        {/* Files in active folder */}
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-[var(--orange)]" />
              <span className="font-semibold">{active.name}</span>
              <span className="text-muted-foreground">· {active.files.length} files</span>
            </div>
            <GhostBtn
              icon={Pencil}
              onClick={() => {
                setRenameId(active.id);
                setDraft(active.name);
              }}
            >
              Rename
            </GhostBtn>
          </div>

          {active.files.length === 0 ? (
            <Card className="p-10 text-center text-xs text-muted-foreground">
              This folder is empty. Drop files or use Import.
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {active.files.map((f) => (
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
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Package Exporter (bundle multiple items) ---------- */

type ExportItem = {
  id: string;
  kind: "Career" | "Trait" | "Aspiration" | "Tuning";
  name: string;
  version: string;
  c: string;
};

const EXPORT_ITEMS: ExportItem[] = [
  { id: "e1", kind: "Career", name: "Astronaut Overhaul", version: "2.4.1", c: "blue" },
  { id: "e2", kind: "Career", name: "Marine Biologist", version: "0.4.0", c: "green" },
  { id: "e3", kind: "Trait", name: "Lucid Dreamer", version: "1.2.0", c: "violet" },
  { id: "e4", kind: "Trait", name: "Storm Chaser", version: "0.9.0", c: "orange" },
  { id: "e5", kind: "Aspiration", name: "Trailblazer", version: "1.0.0", c: "teal" },
  { id: "e6", kind: "Aspiration", name: "Deep Sea Legend", version: "0.5.0", c: "blue" },
  { id: "e7", kind: "Tuning", name: "Weathercore Patch", version: "0.9.2", c: "orange" },
];

function ExporterView() {
  const [packageName, setPackageName] = useState("my_mod_bundle");
  const [creator, setCreator] = useState("YourName");
  const [version, setVersion] = useState("1.0.0");
  const [selected, setSelected] = useState<Set<string>>(new Set(["e1", "e3", "e5"]));
  const [bundleMode, setBundleMode] = useState<"single" | "split">("single");
  const [includeAssets, setIncludeAssets] = useState(true);
  const [compressing, setCompressing] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const groups: ExportItem["kind"][] = ["Career", "Trait", "Aspiration", "Tuning"];
  const counts = groups.reduce(
    (acc, k) => {
      acc[k] = EXPORT_ITEMS.filter((i) => i.kind === k && selected.has(i.id)).length;
      return acc;
    },
    {} as Record<ExportItem["kind"], number>,
  );
  const totalSelected = selected.size;

  function build() {
    if (totalSelected === 0) {
      toast.error("Select at least one item to export");
      return;
    }
    setCompressing(true);
    const label =
      bundleMode === "single"
        ? `${packageName}.package (${totalSelected} items)`
        : `${totalSelected} .package files`;
    toast(`Building ${label}…`);
    setTimeout(() => {
      setCompressing(false);
      toast.success(`Built ${label}`);
    }, 1600);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Package}
        subtitle="Pipeline"
        title="Package Exporter"
        accent="violet"
        actions={
          <>
            <GhostBtn icon={FileCode2}>Preview Manifest</GhostBtn>
            <PrimaryBtn icon={Download} onClick={build}>
              {compressing ? "Building…" : "Build Package"}
            </PrimaryBtn>
          </>
        }
      />

      <div className="grid grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4">
          <Card
            title="Contents"
            action={
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{totalSelected} selected</span>
                <button
                  onClick={() => setSelected(new Set(EXPORT_ITEMS.map((i) => i.id)))}
                  className="rounded px-1.5 py-0.5 hover:bg-accent"
                >
                  Select all
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="rounded px-1.5 py-0.5 hover:bg-accent"
                >
                  Clear
                </button>
              </div>
            }
          >
            <p className="mb-3 text-[11px] text-muted-foreground">
              Combine multiple careers, traits, aspirations, or tuning items into a single{" "}
              <span className="font-mono">.package</span>. Uncheck anything you don't want in the
              build.
            </p>
            <div className="space-y-4">
              {groups.map((k) => {
                const items = EXPORT_ITEMS.filter((i) => i.kind === k);
                if (items.length === 0) return null;
                return (
                  <div key={k}>
                    <div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <span>{k}s</span>
                      <span className="rounded-full bg-accent px-1.5 py-0.5 tabular-nums">
                        {counts[k]}/{items.length}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {items.map((it) => {
                        const on = selected.has(it.id);
                        return (
                          <li
                            key={it.id}
                            className={cn(
                              "flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs transition-colors",
                              on
                                ? "border-[var(--blue)]/50 bg-[var(--blue)]/5"
                                : "border-border bg-background/60 hover:bg-accent/40",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => toggle(it.id)}
                              className="h-3.5 w-3.5 accent-[var(--blue)]"
                            />
                            <div
                              className="h-5 w-1 rounded"
                              style={{ backgroundColor: `var(--${it.c})` }}
                            />
                            <span className="flex-1 font-semibold">{it.name}</span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              v{it.version}
                            </span>
                            <span
                              className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
                              style={{
                                color: `var(--${it.c})`,
                                backgroundColor: `color-mix(in oklab, var(--${it.c}) 12%, transparent)`,
                              }}
                            >
                              {it.kind}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Package Info">
            <div className="space-y-3">
              <Field label="Package Name" value={packageName} onChange={setPackageName} />
              <Field label="Creator" value={creator} onChange={setCreator} />
              <Field label="Version" value={version} onChange={setVersion} />
            </div>
          </Card>

          <Card title="Bundle Mode">
            <div className="space-y-2 text-xs">
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-md border p-2.5",
                  bundleMode === "single"
                    ? "border-[var(--blue)]/60 bg-[var(--blue)]/5"
                    : "border-border hover:bg-accent/40",
                )}
              >
                <input
                  type="radio"
                  checked={bundleMode === "single"}
                  onChange={() => setBundleMode("single")}
                  className="mt-0.5 accent-[var(--blue)]"
                />
                <div>
                  <div className="font-semibold">Single .package</div>
                  <div className="text-[10.5px] text-muted-foreground">
                    Combine everything into one file — easiest for players.
                  </div>
                </div>
              </label>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-md border p-2.5",
                  bundleMode === "split"
                    ? "border-[var(--blue)]/60 bg-[var(--blue)]/5"
                    : "border-border hover:bg-accent/40",
                )}
              >
                <input
                  type="radio"
                  checked={bundleMode === "split"}
                  onChange={() => setBundleMode("split")}
                  className="mt-0.5 accent-[var(--blue)]"
                />
                <div>
                  <div className="font-semibold">One per item</div>
                  <div className="text-[10.5px] text-muted-foreground">
                    Separate .package files — players can pick and choose.
                  </div>
                </div>
              </label>
            </div>
          </Card>

          <Card title="Options">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={includeAssets}
                onChange={(e) => setIncludeAssets(e.target.checked)}
                className="accent-[var(--blue)]"
              />
              Include linked assets & strings
            </label>
          </Card>

          <Card title="Output">
            <div className="rounded-md bg-background/60 p-2.5 font-mono text-[10.5px]">
              {bundleMode === "single" ? (
                <div>
                  📦 <span className="font-semibold">{packageName || "bundle"}.package</span>
                  <div className="mt-0.5 pl-4 text-muted-foreground">
                    {totalSelected} items · v{version || "1.0.0"}
                  </div>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {EXPORT_ITEMS.filter((i) => selected.has(i.id)).map((i) => (
                    <div key={i.id}>
                      📦{" "}
                      <span className="font-semibold">
                        {creator.toLowerCase()}_{i.name.toLowerCase().replace(/\s+/g, "_")}.package
                      </span>
                    </div>
                  ))}
                  {totalSelected === 0 && (
                    <div className="text-muted-foreground">Nothing selected.</div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
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
  const host = useAppHost();
  return (
    <div className="space-y-4">
      <PageHeader icon={SettingsIcon} subtitle="Application" title="Settings" accent="violet" />

      <HostModeCard />

      <EngineCapabilitiesCard />

      <ImageProviderCard />

      {host.isChatGPT && <McpToolsCard />}

      <DemoDataCard />

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
            <SettingToggle label="Check for updates at launch" defaultOn />
            <SettingToggle label="Notify me about new templates" defaultOn />
            <SettingToggle label="Auto-download minor patches" />
            <SettingToggle label="Share anonymous crash reports" />
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
            <SettingToggle label="Autosave every 30s" defaultOn />
            <SettingToggle label="Confirm before compiling" defaultOn />
            {advanced && <SettingToggle label="Enable node canvas snapping" defaultOn />}
            {advanced && <SettingToggle label="Show hex IDs" />}
            {advanced && <SettingToggle label="Validate on save" defaultOn />}
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
            <Row k="Version" v="6.0.0" />
            <Row k="Host" v={host.isChatGPT ? "ChatGPT App" : "Standalone Desktop"} />
            <Row k="Platforms" v="Windows · macOS" />
            <Row k="License" v="Personal · Non-commercial" />
            {advanced && <Row k="Framework" v=".NET 8 · Tauri (planned)" />}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------- Host / provider / MCP cards ---------- */

function HostModeCard() {
  const host = useAppHost();
  return (
    <Card
      title="Runtime Host"
      action={
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            host.isChatGPT
              ? "bg-[var(--green)]/15 text-[var(--green)]"
              : "bg-[var(--blue)]/15 text-[var(--blue)]",
          )}
        >
          {host.isChatGPT ? "ChatGPT App" : "Desktop"}
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div
          className={cn(
            "rounded-lg border p-3",
            host.isChatGPT ? "border-[var(--green)]/50 bg-[var(--green)]/5" : "border-border bg-card",
          )}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-[var(--green)]" />
            ChatGPT App mode
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Runs embedded inside ChatGPT via the OpenAI Apps SDK. Native ChatGPT
            assistance and image generation are available. No OpenAI API key is
            requested or stored.
          </p>
        </div>
        <div
          className={cn(
            "rounded-lg border p-3",
            host.isDesktop ? "border-[var(--blue)]/50 bg-[var(--blue)]/5" : "border-border bg-card",
          )}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MonitorCog className="h-4 w-4 text-[var(--blue)]" />
            Desktop mode
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Standalone Windows/macOS build. Local tools, manual uploads, and
            separately configured generation providers. A ChatGPT subscription
            cannot be consumed from the desktop app.
          </p>
        </div>
      </div>
      <p className="mt-3 rounded-md bg-muted/40 px-2.5 py-2 text-[11px] text-muted-foreground">
        Projects created in either host use the same Portable Bundle
        (<span className="font-mono">.mcbundle.json</span>) format — export from
        ChatGPT and open in Desktop, or vice versa.
      </p>
    </Card>
  );
}

function ImageProviderCard() {
  const host = useAppHost();
  // Render the built-in "coming later" ChatGPT tile alongside the
  // currently-available providers, even though it is not selectable.
  const tiles: ImageProvider[] = [...host.availableImageProviders, "chatgpt"];
  return (
    <Card
      title="Image Generation Provider"
      action={
        <span className="text-[11px] text-muted-foreground">
          Powers "Generate icon" actions in builder fields.
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((p) => {
          const active = host.imageProvider === p;
          // ChatGPT is never active: the standalone/web build cannot
          // consume a user's ChatGPT subscription.
          const disabled = p === "chatgpt";
          return (
            <button
              key={p}
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                host.setImageProvider(p);
                toast.success(`Provider · ${PROVIDER_LABEL[p]}`);
              }}
              className={cn(
                "rounded-lg border p-3 text-left transition-all",
                active
                  ? "border-[var(--blue)] bg-[var(--blue)]/8 shadow-sm"
                  : "border-border bg-card hover:border-foreground/20",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>{PROVIDER_LABEL[p]}</span>
                {p === "chatgpt" && (
                  <span className="rounded-full bg-[var(--orange)]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--orange)]">
                    Coming later
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{PROVIDER_DESCRIPTION[p]}</p>
              {disabled && (
                <p className="mt-1 text-[10px] italic text-muted-foreground">
                  This app cannot consume a user's ChatGPT subscription. Placeholder for a future integration.
                </p>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function EngineCapabilitiesCard() {
  const caps: EngineCapabilities = defaultEngineCapabilities;
  const rows: { key: keyof EngineCapabilities; label: string }[] = [
    { key: "compilePackage", label: "Compile Sims 4 .package" },
    { key: "installToModsFolder", label: "Install into Mods folder" },
    { key: "detectSimsInstall", label: "Detect Sims 4 install" },
    { key: "readGameFiles", label: "Read live game files" },
    { key: "produceProductionXml", label: "Produce production XML" },
    { key: "nativeFilePicker", label: "Native file/folder picker" },
    { key: "fetchThirdPartyTuning", label: "Fetch lot51.cc / Core Library updates" },
    { key: "chatgptImageGeneration", label: "ChatGPT image generation" },
  ];
  const color = (s: EngineState) =>
    s === "available"
      ? "bg-[var(--green)]/15 text-[var(--green)]"
      : s === "not-connected"
      ? "bg-[var(--orange)]/15 text-[var(--orange)]"
      : s === "coming-later"
      ? "bg-[var(--violet)]/15 text-[var(--violet)]"
      : "bg-muted text-muted-foreground";
  return (
    <Card
      title="Engine Integrations"
      action={
        <span className="text-[11px] text-muted-foreground">
          Wired by Codex in the desktop build.
        </span>
      }
    >
      <p className="mb-3 text-xs text-muted-foreground">
        These actions need the real Mod Architect engine or an external
        service. In this preview they show explicit states and any button
        that depends on them is disabled with a matching tooltip.
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {rows.map((r) => {
          const s = caps[r.key];
          return (
            <div key={r.key} className="rounded-md border border-border bg-muted/30 p-2" title={ENGINE_STATE_TOOLTIP[s]}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{r.label}</span>
                <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", color(s))}>
                  {ENGINE_STATE_LABEL[s]}
                </span>
              </div>
              <p className="mt-1 text-[10.5px] text-muted-foreground">{ENGINE_STATE_TOOLTIP[s]}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function DemoDataCard() {
  const store = useStore();
  const [confirm, setConfirm] = useState(false);
  return (
    <Card
      title="Demo Data"
      action={
        <span className="text-[11px] text-muted-foreground">
          Storage · {store.adapter.label}
        </span>
      }
    >
      <p className="text-xs text-muted-foreground">
        The prototype persists projects, careers, traits, assets, templates,
        snippets, validation dismissals and preferences to the storage
        adapter above. Export a portable bundle any time or reset everything
        to a blank slate.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <GhostBtn
          icon={Download}
          onClick={() => {
            const bundle = store.exportBundle();
            downloadStoreBundle(bundle);
            toast.success(`Exported "${bundle.project.name}"`);
          }}
        >
          Export Bundle
        </GhostBtn>
        <GhostBtn
          icon={Upload}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "application/json,.mcbundle.json";
            input.onchange = async () => {
              const file = input.files?.[0];
              if (!file) return;
              try {
                const text = await file.text();
                const parsed = JSON.parse(text);
                const project = store.importBundle(parsed);
                toast.success(`Imported "${project.name}"`);
              } catch (e) {
                toast.error(`Import failed: ${String((e as Error)?.message ?? e)}`);
              }
            };
            input.click();
          }}
        >
          Import Bundle
        </GhostBtn>
        {!confirm ? (
          <button
            onClick={() => setConfirm(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--red)]/40 bg-background px-2.5 py-1 text-[11px] font-semibold text-[var(--red)] hover:bg-[var(--red)]/10"
          >
            <Trash2 className="h-3 w-3" />
            Reset Demo Data
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-md border border-[var(--red)]/40 bg-[var(--red)]/5 px-2 py-1 text-[11px]">
            <span className="font-semibold text-[var(--red)]">Delete everything?</span>
            <button
              onClick={async () => {
                await store.resetDemoData();
                setConfirm(false);
                toast.success("Demo data cleared");
              }}
              className="rounded bg-[var(--red)] px-2 py-0.5 font-semibold text-white"
            >
              Yes, reset
            </button>
            <button
              onClick={() => setConfirm(false)}
              className="rounded border border-border px-2 py-0.5 font-semibold"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}


function McpToolsCard() {
  const groups: Record<string, typeof MCP_TOOL_DEFS[number][]> = {};
  for (const t of MCP_TOOL_DEFS) {
    (groups[t.category] ||= []).push(t);
  }
  return (
    <Card
      title="MCP Tools exposed to ChatGPT"
      action={
        <span className="rounded-full bg-[var(--green)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--green)]">
          {MCP_TOOL_DEFS.length} tools
        </span>
      }
    >
      <p className="mb-3 text-xs text-muted-foreground">
        When running as a ChatGPT App, Mod Constructor publishes these tools so
        ChatGPT can help you author projects. Authentication is inherited from
        the ChatGPT session — this app never sees passwords or tokens.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(groups).map(([cat, tools]) => (
          <div key={cat} className="rounded-md border border-border bg-muted/30 p-2">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {cat}
            </div>
            <ul className="space-y-1 text-[11px]">
              {tools.map((t) => (
                <li key={t.name}>
                  <span className="font-mono text-[10.5px] font-semibold text-foreground">{t.name}</span>
                  <span className="ml-1 text-muted-foreground">— {t.description}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}


function SettingToggle({ label, defaultOn }: { label: string; defaultOn?: boolean }) {
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
  if (active === "explorer") return <div className="mx-auto max-w-[1600px] p-6"><ProjectExplorer /></div>;
  if (active === "reference") return <div className="mx-auto max-w-[1600px] p-6"><ReferenceViewer /></div>;
  if (active === "career") return <div className="mx-auto max-w-[1600px] p-6"><CareerBuilder /></div>;
  if (active === "trait") return <div className="mx-auto max-w-[1600px] p-6"><TraitBuilder /></div>;
  if (active === "aspiration") return <div className="mx-auto max-w-[1600px] p-6"><AspirationBuilder /></div>;
  if (active === "notifications") return <div className="mx-auto max-w-[1600px] p-6"><NotificationLibrary /></div>;
  if (active === "tuning") return <div className="mx-auto max-w-[1600px] p-6"><TuningEditor /></div>;
  if (active === "icons") return <div className="mx-auto max-w-[1600px] p-6"><IconLibraryView /></div>;
  if (active === "assets") return <div className="mx-auto max-w-[1600px] p-6"><AssetManager /></div>;
  if (active === "exporter") return <div className="mx-auto max-w-[1600px] p-6"><ExporterView /></div>;

  if (active === "validation") return <div className="mx-auto max-w-[1600px] p-6"><ValidationCenter /></div>;
  if (active === "queue") return <div className="mx-auto max-w-[1600px] p-6"><QueueView /></div>;
  if (active === "templates") return <div className="mx-auto max-w-[1600px] p-6"><TemplatesGallery /></div>;
  if (active === "snippets") return <div className="mx-auto max-w-[1600px] p-6"><SnippetsLibrary /></div>;
  if (active === "graph") return <div className="mx-auto max-w-[1600px] p-6"><DependencyGraph /></div>;
  if (active === "timeline") return <div className="mx-auto max-w-[1600px] p-6"><ActivityTimeline /></div>;
  if (active === "analytics") return <div className="mx-auto max-w-[1600px] p-6"><BuildAnalytics /></div>;
  if (active === "updates") return <div className="mx-auto max-w-[1600px] p-6"><UpdateCenter /></div>;
  if (active === "settings") return <div className="mx-auto max-w-[1600px] p-6"><SettingsView /></div>;
  return null;
}
