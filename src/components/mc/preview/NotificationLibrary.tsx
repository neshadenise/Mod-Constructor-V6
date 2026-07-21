import { useMemo, useState } from "react";
import { Bell, Search, Copy, Check, Plus, Trash2, Pencil, BookOpen, FolderKanban } from "lucide-react";
import { NotificationPopup, type NotificationKind } from "./GameUI";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import type { NotificationTemplate } from "@/lib/types";

type DefaultSample = {
  kind: NotificationKind;
  title: string;
  body: string;
  action?: string;
  tag: string;
};

/** Built-in read-only defaults available to every project. */
const DEFAULTS: DefaultSample[] = [
  { kind: "success", tag: "Success", title: "Mod compiled", body: "Your mod compiled without errors and is ready to install.", action: "Open output folder" },
  { kind: "warning", tag: "Warning", title: "Missing icon", body: "One rank has no icon assigned — a placeholder will be used.", action: "Fix now" },
  { kind: "error", tag: "Error", title: "Duplicate ID", body: "Trait ID 'trait_lucid_dreamer' already exists in another project.", action: "View conflict" },
  { kind: "info", tag: "Info", title: "New framework update", body: "lot51 core framework 2.36 is available.", action: "Update" },
  { kind: "promotion", tag: "Promotion", title: "Promoted to Admiral", body: "Your Sim reached the top of the Astronaut career.", action: "View career" },
  { kind: "reward", tag: "Reward", title: "Reward unlocked", body: "Signature Space Suit added to your household inventory.", action: "Equip" },
  { kind: "relationship", tag: "Relationship", title: "Best Friends", body: "Ada and Kai reached the Best Friends milestone.", action: "View bond" },
  { kind: "buff", tag: "Buff", title: "Well-Rested Focus", body: "+2 Focused for 6 hours after a good night's sleep.", action: "Details" },
  { kind: "trait", tag: "Trait", title: "Trait added: Lucid Dreamer", body: "This Sim experiences vivid dreams that grant temporary skill boosts.", action: "Learn more" },
  { kind: "career", tag: "Career", title: "Shift starting", body: "Your Interstellar Navigator shift starts in 30 minutes.", action: "Go to work" },
  { kind: "aging", tag: "Aging", title: "Birthday tomorrow", body: "Ada will age up into Adult tomorrow.", action: "Plan party" },
];

const KIND_OPTIONS: NotificationKind[] = [
  "success", "warning", "error", "info",
  "promotion", "reward", "relationship",
  "buff", "trait", "career", "aging",
];

const FILTERS = ["All", ...Array.from(new Set(DEFAULTS.map((s) => s.tag)))] as const;

export function NotificationLibrary() {
  const store = useStore();
  const activeProject = store.state.projects.find((p) => p.id === store.state.activeProjectId);
  const projectTemplates = useMemo(
    () => store.state.notifications.filter((n) => n.projectId === activeProject?.id),
    [store.state.notifications, activeProject?.id],
  );

  const [tab, setTab] = useState<"project" | "defaults">("project");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [editing, setEditing] = useState<NotificationTemplate | null>(null);
  const [creating, setCreating] = useState(false);

  const filteredDefaults = DEFAULTS.filter(
    (s) =>
      (filter === "All" || s.tag === filter) &&
      (q === "" ||
        s.title.toLowerCase().includes(q.toLowerCase()) ||
        s.body.toLowerCase().includes(q.toLowerCase())),
  );

  const filteredProject = projectTemplates.filter(
    (t) =>
      q === "" ||
      t.title.toLowerCase().includes(q.toLowerCase()) ||
      t.body.toLowerCase().includes(q.toLowerCase()) ||
      t.name.toLowerCase().includes(q.toLowerCase()),
  );

  const saveDefaultToProject = (s: DefaultSample) => {
    if (!activeProject) {
      toast.error("Select a project first");
      return;
    }
    store.createNotificationTemplate({
      projectId: activeProject.id,
      name: s.title,
      title: s.title,
      body: s.body,
      visual: "toast",
      previewKind: s.kind,
      actions: s.action ? [{ label: s.action, kind: "primary" }] : [],
    });
    toast.success(`Added to ${activeProject.name}`);
    setTab("project");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--pink)] text-white shadow-sm">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {activeProject ? `Project · ${activeProject.name}` : "No project selected"}
            </div>
            <h1 className="text-xl font-bold tracking-tight">Notifications</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={!activeProject}
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--blue)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> New Template
          </button>
        </div>
      </div>

      {!activeProject && (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-xs text-muted-foreground">
          Select or create a project in the Projects view to manage notification templates.
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <TabBtn active={tab === "project"} onClick={() => setTab("project")} icon={<FolderKanban className="h-3.5 w-3.5" />}>
          Project templates
          <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] tabular-nums">{projectTemplates.length}</span>
        </TabBtn>
        <TabBtn active={tab === "defaults"} onClick={() => setTab("defaults")} icon={<BookOpen className="h-3.5 w-3.5" />}>
          Defaults
          <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] tabular-nums">{DEFAULTS.length}</span>
        </TabBtn>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search notifications…"
            className="h-8 w-64 rounded-md border border-border bg-background pl-7 pr-2 text-xs outline-none focus:border-[var(--blue)]"
          />
        </div>
        {tab === "defaults" && (
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  filter === f
                    ? "bg-[var(--blue)] text-white shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      {tab === "project" ? (
        filteredProject.length === 0 ? (
          <EmptyState
            hasProject={!!activeProject}
            onNew={() => setCreating(true)}
            onBrowseDefaults={() => setTab("defaults")}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredProject.map((t) => (
              <div key={t.id} className="group relative rounded-xl border border-border bg-card p-3 card-elevated">
                <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>{t.name}</span>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => setEditing(t)}
                      className="rounded-md border border-border bg-background p-1 hover:bg-accent"
                      title="Edit"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => {
                        store.deleteNotificationTemplate(t.id);
                        toast.success("Template deleted");
                      }}
                      className="rounded-md border border-border bg-background p-1 text-[var(--red)] hover:bg-accent"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="rounded-lg bg-[oklch(0.98_0.01_230)] p-3 [[data-preview-theme='dark']_&]:bg-[oklch(0.22_0.04_260)]">
                  <NotificationPopup
                    kind={(t.previewKind as NotificationKind) ?? "info"}
                    title={t.title}
                    body={t.body}
                    action={t.actions[0]?.label}
                  />
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredDefaults.map((s) => {
            const id = s.tag + s.title;
            return (
              <div key={id} className="group relative rounded-xl border border-border bg-card p-3 card-elevated">
                <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>{s.tag}</span>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => saveDefaultToProject(s)}
                      disabled={!activeProject}
                      className="flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 disabled:opacity-40"
                      title="Save to project"
                    >
                      <Plus className="h-3 w-3" /> Save
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(JSON.stringify(s, null, 2)).catch(() => {});
                        setCopied(id);
                        setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600);
                        toast.success("Template copied");
                      }}
                      className="flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5"
                    >
                      {copied === id ? <Check className="h-3 w-3 text-[var(--green)]" /> : <Copy className="h-3 w-3" />}
                      {copied === id ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
                <div className="rounded-lg bg-[oklch(0.98_0.01_230)] p-3 [[data-preview-theme='dark']_&]:bg-[oklch(0.22_0.04_260)]">
                  <NotificationPopup kind={s.kind} title={s.title} body={s.body} action={s.action} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(creating || editing) && activeProject && (
        <TemplateDialog
          initial={editing ?? undefined}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSubmit={(v) => {
            if (editing) {
              store.updateNotificationTemplate(editing.id, v);
              toast.success("Template updated");
            } else {
              store.createNotificationTemplate({
                projectId: activeProject.id,
                name: v.name!,
                title: v.title!,
                body: v.body!,
                visual: v.visual!,
                previewKind: v.previewKind,
                actions: v.actions ?? [],
              });
              toast.success(`Template added to ${activeProject.name}`);
            }
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function TabBtn({
  active, onClick, icon, children,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors",
        active
          ? "border-[var(--blue)] text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function EmptyState({
  hasProject, onNew, onBrowseDefaults,
}: { hasProject: boolean; onNew: () => void; onBrowseDefaults: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-10 text-center">
      <Bell className="h-8 w-8 text-muted-foreground" />
      <div className="text-sm font-semibold">No notification templates yet</div>
      <div className="text-xs text-muted-foreground">
        Create a new one from scratch, or copy from the built-in defaults.
      </div>
      <div className="mt-2 flex gap-2">
        <button
          disabled={!hasProject}
          onClick={onNew}
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--blue)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> New Template
        </button>
        <button
          onClick={onBrowseDefaults}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
        >
          <BookOpen className="h-3.5 w-3.5" /> Browse defaults
        </button>
      </div>
    </div>
  );
}

function TemplateDialog({
  initial, onClose, onSubmit,
}: {
  initial?: NotificationTemplate;
  onClose: () => void;
  onSubmit: (v: Partial<NotificationTemplate>) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [previewKind, setPreviewKind] = useState<NotificationKind>((initial?.previewKind as NotificationKind) ?? "info");
  const [actionLabel, setActionLabel] = useState(initial?.actions[0]?.label ?? "");

  const canSubmit = name.trim() && title.trim() && body.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-tight">
            {initial ? "Edit template" : "New notification template"}
          </h2>
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
        </div>

        <div className="space-y-3">
          <Field label="Name (internal)">
            <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} placeholder="promotion_reached_top" />
          </Field>
          <Field label="Style">
            <select value={previewKind} onChange={(e) => setPreviewKind(e.target.value as NotificationKind)} className={fieldClass}>
              {KIND_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </Field>
          <Field label="Title (shown in-game)">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} placeholder="Promoted to Admiral" />
          </Field>
          <Field label="Body">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} className={cn(fieldClass, "min-h-[72px] resize-y")} placeholder="Your Sim reached the top of the Astronaut career." />
          </Field>
          <Field label="Action label (optional)">
            <input value={actionLabel} onChange={(e) => setActionLabel(e.target.value)} className={fieldClass} placeholder="View career" />
          </Field>

          <div className="rounded-lg border border-border bg-[oklch(0.98_0.01_230)] p-3 [[data-preview-theme='dark']_&]:bg-[oklch(0.22_0.04_260)]">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Live preview</div>
            <NotificationPopup
              kind={previewKind}
              title={title || "Title"}
              body={body || "Body copy will appear here."}
              action={actionLabel || undefined}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent">Cancel</button>
          <button
            disabled={!canSubmit}
            onClick={() => onSubmit({
              name: name.trim(),
              title: title.trim(),
              body: body.trim(),
              visual: "toast",
              previewKind,
              actions: actionLabel.trim() ? [{ label: actionLabel.trim(), kind: "primary" }] : [],
            })}
            className="rounded-md bg-[var(--blue)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
          >
            {initial ? "Save changes" : "Create template"}
          </button>
        </div>
      </div>
    </div>
  );
}

const fieldClass =
  "h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-[var(--blue)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
