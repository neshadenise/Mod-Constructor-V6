/**
 * Projects screen — create, select, edit, delete, and open projects in the
 * Mod Builder. Deliberately simple: no file explorer, no resource management.
 */

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Copy,
  FolderKanban,
  ImagePlus,
  Plus,
  Save,
  Search,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useStore } from "@/lib/store";
import { useAppNavigation } from "@/lib/navigation";
import type { Project, ProjectStatus } from "@/lib/types";
import type { SectionId } from "@/components/mc/sections";
import { cn } from "@/lib/utils";

const STATUS_META: Record<ProjectStatus, { label: string; c: string }> = {
  draft: { label: "Draft", c: "muted" },
  "in-progress": { label: "In Progress", c: "blue" },
  complete: { label: "Complete", c: "teal" },
  tested: { label: "Tested", c: "green" },
  released: { label: "Released", c: "violet" },
};

export const PROJECT_TYPES = [
  "Career Mod",
  "Trait Mod",
  "Aspiration Mod",
  "Gameplay Tweak",
  "Mixed Pack",
  "Other",
];

/** Builder section a project type opens into. */
function builderFor(p: Project): SectionId {
  const has = (n: number) => n > 0;
  if (has(p.careerIds.length)) return "career";
  if (has(p.traitIds.length)) return "trait";
  if (has(p.aspirationIds.length)) return "aspiration";
  switch (p.projectType) {
    case "Trait Mod":
      return "trait";
    case "Aspiration Mod":
      return "aspiration";
    case "Career Mod":
      return "career";
    default:
      return "dashboard";
  }
}

function fmtDate(t: number) {
  return new Date(t).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Initials({ project, size = 40 }: { project: Project; size?: number }) {
  if (project.imageUrl) {
    return (
      <img
        src={project.imageUrl}
        alt={`${project.name} cover`}
        className="shrink-0 rounded-md object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = project.name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-md bg-primary/15 text-xs font-bold text-primary"
      style={{ width: size, height: size }}
    >
      {initials || "P"}
    </div>
  );
}

export function ProjectsScreen() {
  const store = useStore();
  const { navigate } = useAppNavigation();
  const projects = store.state.projects;
  const activeId = store.state.activeProjectId;

  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>(activeId ?? projects[0]?.id);
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);

  const selected = projects.find((p) => p.id === selectedId);

  // Keep a valid selection when projects change.
  useEffect(() => {
    if (!selected && projects.length) setSelectedId(activeId ?? projects[0]!.id);
  }, [projects, selected, activeId]);

  /* -------------------------- editable draft -------------------------- */
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    author: "",
    version: "",
    projectType: "",
    imageUrl: "",
  });

  useEffect(() => {
    if (!selected) return;
    setDraft({
      name: selected.name,
      description: selected.description ?? "",
      author: selected.author ?? "",
      version: selected.version ?? "",
      projectType: selected.projectType ?? "",
      imageUrl: selected.imageUrl ?? "",
    });
  }, [selected?.id, selected?.updatedAt]);

  const dirty = useMemo(() => {
    if (!selected) return false;
    return (
      draft.name !== selected.name ||
      draft.description !== (selected.description ?? "") ||
      draft.author !== (selected.author ?? "") ||
      draft.version !== (selected.version ?? "") ||
      draft.projectType !== (selected.projectType ?? "") ||
      draft.imageUrl !== (selected.imageUrl ?? "")
    );
  }, [draft, selected]);

  const save = () => {
    if (!selected) return;
    if (!draft.name.trim()) {
      toast.error("Project name cannot be empty.");
      return;
    }
    store.updateProject(selected.id, {
      name: draft.name.trim(),
      description: draft.description,
      author: draft.author.trim(),
      version: draft.version.trim() || "0.1.0",
      projectType: draft.projectType || undefined,
      imageUrl: draft.imageUrl.trim() || undefined,
    });
    toast.success("Project details saved.");
  };

  const openInBuilder = (p: Project) => {
    if (dirty && selected?.id === p.id) save(); // save pending edits before switching
    store.setActiveProject(p.id);
    toast.success(`Active project: ${p.name}`);
    navigate(builderFor(p));
  };

  const filtered = projects.filter(
    (p) =>
      !filter ||
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      (p.author ?? "").toLowerCase().includes(filter.toLowerCase()),
  );

  const pickImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setDraft((d) => ({ ...d, imageUrl: String(reader.result) }));
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
          <FolderKanban className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Projects</h2>
          <p className="text-[11px] text-muted-foreground">
            {projects.length} saved project{projects.length === 1 ? "" : "s"} · select one and open it in the Mod Builder
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects…"
              className="h-8 w-56 pl-8 text-xs"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            onClick={() => {
              const p = store.createProject();
              setSelectedId(p.id);
              toast.success(`Created "${p.name}"`);
            }}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New Project
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* ------------------------------ list ------------------------------ */}
        <div className="grid gap-3 xl:grid-cols-2">
          {filtered.length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed border-border p-10 text-center text-xs text-muted-foreground">
              No projects yet. Click <span className="font-semibold">New Project</span> to create one.
            </div>
          )}
          {filtered.map((p) => {
            const isActive = activeId === p.id;
            const isSelected = selectedId === p.id;
            return (
              <article
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={cn(
                  "cursor-pointer rounded-lg border bg-card/60 p-3 transition",
                  isSelected ? "border-primary ring-1 ring-primary/40" : "border-border hover:bg-accent/40",
                )}
              >
                <div className="flex items-start gap-3">
                  <Initials project={p} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="truncate text-sm font-semibold">{p.name}</h3>
                      {isActive && (
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
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                      {p.description?.trim() || "No description yet."}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" /> {p.author?.trim() || "Unknown creator"}
                      </span>
                      <span>{p.projectType || "Untyped"}</span>
                      <span className="font-mono">v{p.version}</span>
                      <span
                        className="rounded px-1 py-px font-semibold uppercase"
                        style={{
                          color: `var(--${STATUS_META[p.status].c})`,
                          backgroundColor: `color-mix(in oklab, var(--${STATUS_META[p.status].c}) 14%, transparent)`,
                        }}
                      >
                        {STATUS_META[p.status].label}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">Last edited {fmtDate(p.updatedAt)}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5">
                  <Button size="sm" className="h-7 text-[11px]" onClick={(e) => { e.stopPropagation(); openInBuilder(p); }}>
                    Open in Builder <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    title="Duplicate"
                    onClick={(e) => {
                      e.stopPropagation();
                      const copy = store.duplicateProject(p.id);
                      if (copy) { setSelectedId(copy.id); toast.success(`Duplicated as "${copy.name}"`); }
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-destructive"
                    title="Delete project"
                    onClick={(e) => { e.stopPropagation(); setPendingDelete(p); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>

        {/* ----------------------------- details ---------------------------- */}
        <aside className="rounded-lg border border-border bg-card/60 p-4">
          {!selected ? (
            <p className="text-xs text-muted-foreground">Select a project to edit its details.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Initials project={selected} size={32} />
                <div className="min-w-0">
                  <h3 className="truncate text-xs font-semibold uppercase tracking-wide">Project details</h3>
                  <p className="truncate text-[10px] text-muted-foreground">Last edited {fmtDate(selected.updatedAt)}</p>
                </div>
              </div>

              <label className="block text-[11px]">
                <span className="mb-1 block text-muted-foreground">Project name</span>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="h-8 text-xs" />
              </label>

              <label className="block text-[11px]">
                <span className="mb-1 block text-muted-foreground">Bio / description</span>
                <Textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  className="h-20 text-xs"
                  placeholder="What does this mod do?"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block text-[11px]">
                  <span className="mb-1 block text-muted-foreground">Creator</span>
                  <Input value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} className="h-8 text-xs" />
                </label>
                <label className="block text-[11px]">
                  <span className="mb-1 block text-muted-foreground">Version</span>
                  <Input value={draft.version} onChange={(e) => setDraft({ ...draft, version: e.target.value })} className="h-8 font-mono text-xs" placeholder="1.0.0" />
                </label>
              </div>

              <label className="block text-[11px]">
                <span className="mb-1 block text-muted-foreground">Project type</span>
                <select
                  value={draft.projectType}
                  onChange={(e) => setDraft({ ...draft, projectType: e.target.value })}
                  className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                >
                  <option value="">Untyped</option>
                  {PROJECT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>

              <div className="text-[11px]">
                <span className="mb-1 block text-muted-foreground">Project image (optional)</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={pickImage}>
                    <ImagePlus className="mr-1 h-3.5 w-3.5" /> Choose image
                  </Button>
                  {draft.imageUrl && (
                    <Button size="sm" variant="ghost" className="h-8 text-[11px]" onClick={() => setDraft({ ...draft, imageUrl: "" })}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-border pt-3">
                <Button size="sm" onClick={save} disabled={!dirty}>
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Save Changes
                </Button>
                <Button size="sm" variant="outline" onClick={() => openInBuilder(selected)}>
                  Open in Builder
                </Button>
                {dirty && <span className="text-[10px] text-amber-500">Unsaved changes</span>}
              </div>
            </div>
          )}
        </aside>
      </div>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(v) => { if (!v) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{pendingDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the project and everything saved under it — careers, traits, aspirations and assets.
              {pendingDelete?.isDemo && " You can restore the demo project later from Settings → Demo Data."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingDelete) return;
                store.deleteProject(pendingDelete.id);
                if (selectedId === pendingDelete.id) setSelectedId(undefined);
                toast.success(`Deleted "${pendingDelete.name}"`);
                setPendingDelete(null);
              }}
            >
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ProjectsScreen;
