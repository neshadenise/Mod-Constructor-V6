import { useMemo, useState } from "react";
import {
  LayoutTemplate,
  Search,
  Sparkles,
  Briefcase,
  Target,
  Bell,
  Plus,
  Trash2,
  ShieldCheck,
  Package,
  CheckCircle2,
  CircleDashed,
  Lock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useAppNavigation } from "@/lib/navigation";
import { setBuilderSeed } from "@/lib/builder-seed";
import {
  BUILT_IN_TEMPLATES,
  BUILT_IN_UPDATED_AT,
  type CareerPayload,
  type TraitPayload,
  type AspirationPayload,
  type NotificationPayload,
} from "@/lib/builtin-templates";
import type {
  Template,
  TemplateKind,
  TemplateSource,
  TemplateDifficulty,
} from "@/lib/types";

type Kind = TemplateKind;

const META: Record<Kind, { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string }> = {
  Career: { icon: Briefcase, color: "var(--blue)" },
  Trait: { icon: Sparkles, color: "var(--violet)" },
  Aspiration: { icon: Target, color: "var(--teal)" },
  Notification: { icon: Bell, color: "var(--orange)" },
};

const FILTERS: ("All" | Kind)[] = ["All", "Career", "Trait", "Aspiration", "Notification"];
const KINDS: Kind[] = ["Career", "Trait", "Aspiration", "Notification"];

const SOURCE_LABEL: Record<TemplateSource, string> = {
  "built-in-original": "Built-in original",
  "user-created": "User-created",
  imported: "Imported",
  "community-submission": "Community submission",
  "licensed-third-party": "Licensed third-party",
};

type GalleryTemplate = Template & { updatedLabel: string };

function toGallery(t: Template): GalleryTemplate {
  return {
    ...t,
    updatedLabel:
      t.builtIn
        ? BUILT_IN_UPDATED_AT
        : new Date(t.updatedAt).toISOString().slice(0, 10),
  };
}

const now = () => Date.now();

export function TemplatesGallery() {
  const store = useStore();
  const { navigate } = useAppNavigation();
  const { state } = store;
  const activeProjectId = state.activeProjectId;

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | Kind>("All");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    kind: "Career" as Kind,
    summary: "",
    difficulty: "beginner" as TemplateDifficulty,
  });

  const builtIns: Template[] = useMemo(
    () =>
      BUILT_IN_TEMPLATES.map((t) => ({
        ...t,
        createdAt: 0,
        updatedAt: 0,
      })),
    [],
  );

  const all: GalleryTemplate[] = useMemo(() => {
    return [...state.templates, ...builtIns].map(toGallery);
  }, [state.templates, builtIns]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((t) => {
      if (filter !== "All" && t.kind !== filter) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        (t.includes ?? []).some((i) => i.toLowerCase().includes(q))
      );
    });
  }, [all, query, filter]);

  function saveUserTemplate() {
    const name = form.name.trim();
    if (!name) {
      toast.error("Template name is required");
      return;
    }
    store.saveTemplate({
      name,
      kind: form.kind,
      summary: form.summary.trim() || "User-saved starter template.",
      source: "user-created",
      difficulty: form.difficulty,
      requiredPacks: [],
      includes: [],
      targetGameVersion: "1.108+",
      tested: "untested",
      payload: null,
    });
    setForm({ name: "", kind: "Career", summary: "", difficulty: "beginner" });
    setOpen(false);
    toast.success(`Saved template "${name}"`);
  }

  function removeUserTemplate(id: string) {
    store.deleteTemplate(id);
    toast.success("Template removed");
  }

  function useTemplate(t: GalleryTemplate) {
    if (!activeProjectId) {
      toast.error("Select or create a project first");
      return;
    }
    if (!t.payload) {
      toast.error("This template has no starter contents to scaffold");
      return;
    }
    try {
      switch (t.kind) {
        case "Career": {
          const p = t.payload as CareerPayload;
          const rec = store.createCareer({ ...p, projectId: activeProjectId, name: p.name });
          setBuilderSeed("career", p, rec.id);
          navigate("career");
          toast.success(`Opened "${rec.name}" in the Career Builder`);
          break;
        }
        case "Trait": {
          const p = t.payload as TraitPayload;
          const rec = store.createTrait({ ...p, projectId: activeProjectId, name: p.name });
          setBuilderSeed("trait", p, rec.id);
          navigate("trait");
          toast.success(`Opened "${rec.name}" in the Trait Builder`);
          break;
        }
        case "Aspiration": {
          const p = t.payload as AspirationPayload;
          const rec = store.createAspiration({ ...p, projectId: activeProjectId, name: p.name });
          setBuilderSeed("aspiration", p, rec.id);
          navigate("aspiration");
          toast.success(`Opened "${rec.name}" in the Aspiration Builder`);
          break;
        }
        case "Notification": {
          const p = t.payload as NotificationPayload;
          const rec = store.createNotificationTemplate({ ...p, projectId: activeProjectId, name: p.name });
          setBuilderSeed("notification", p, rec.id);
          navigate("notifications");
          toast.success(`Opened "${rec.name}" in the Notification Library`);
          break;
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not scaffold from this template");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--violet)] text-white shadow-sm">
            <LayoutTemplate className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Starters
            </div>
            <h1 className="text-xl font-bold tracking-tight">Templates</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-muted-foreground">
            {shown.length} of {all.length}
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-1.5 rounded-md bg-[var(--violet)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90">
                <Plus className="h-3.5 w-3.5" />
                New Template
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save a new user template</DialogTitle>
                <DialogDescription>
                  User-created templates are stored locally alongside the built-in
                  originals. Built-in templates are read-only.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. My Signature Career"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Type</Label>
                    <div className="flex flex-wrap gap-1">
                      {KINDS.map((k) => (
                        <button
                          key={k}
                          onClick={() => setForm({ ...form, kind: k })}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                            form.kind === k
                              ? "border-[var(--violet)] bg-[var(--violet)]/10 text-[var(--violet)]"
                              : "border-border bg-background text-muted-foreground hover:bg-accent",
                          )}
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Difficulty</Label>
                    <div className="flex flex-wrap gap-1">
                      {(["beginner", "intermediate", "advanced"] as TemplateDifficulty[]).map((d) => (
                        <button
                          key={d}
                          onClick={() => setForm({ ...form, difficulty: d })}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors",
                            form.difficulty === d
                              ? "border-[var(--violet)] bg-[var(--violet)]/10 text-[var(--violet)]"
                              : "border-border bg-background text-muted-foreground hover:bg-accent",
                          )}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Summary</Label>
                  <Textarea
                    value={form.summary}
                    onChange={(e) => setForm({ ...form, summary: e.target.value })}
                    placeholder="Short description of what this template scaffolds."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={saveUserTemplate}
                  className="rounded-md bg-[var(--violet)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
                >
                  Save Template
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates..."
            className="h-9 pl-7 text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                filter === f
                  ? "border-[var(--violet)] bg-[var(--violet)]/10 text-[var(--violet)]"
                  : "border-border bg-background text-muted-foreground hover:bg-accent",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
        Built-in templates are original starter structures included with Mod
        Constructor. They are read-only and carry no outside attribution. Use
        Template creates a real, editable copy inside your active project.
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((t) => {
          const meta = META[t.kind];
          const Icon = meta.icon;
          const isBuiltIn = !!t.builtIn;
          const isUser = t.source === "user-created";
          return (
            <article
              key={t.id}
              className="flex flex-col rounded-xl border border-border bg-card p-4 card-elevated transition-shadow hover:shadow-md"
            >
              <header className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: meta.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t.kind}
                    </div>
                    <h3 className="text-sm font-bold leading-tight">{t.name}</h3>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  {isBuiltIn && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--teal)]/40 bg-[var(--teal)]/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-[var(--teal)]"
                      title="Built-in original — included with Mod Constructor"
                    >
                      <Lock className="h-2.5 w-2.5" />
                      Built-in
                    </span>
                  )}
                  {isUser && (
                    <span className="rounded-full border border-[var(--violet)]/40 bg-[var(--violet)]/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-[var(--violet)]">
                      Yours
                    </span>
                  )}
                </div>
              </header>

              <p className="mt-2 text-xs text-muted-foreground">{t.summary}</p>

              {isBuiltIn && (
                <div className="mt-2 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--teal)]">
                  Original starter template · Included with Mod Constructor
                </div>
              )}

              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                <dt className="text-muted-foreground">Type</dt>
                <dd className="text-right font-medium">{t.kind}</dd>
                <dt className="text-muted-foreground">Difficulty</dt>
                <dd className="text-right font-medium capitalize">{t.difficulty}</dd>
                <dt className="text-muted-foreground">Target game</dt>
                <dd className="text-right font-medium tabular-nums">{t.targetGameVersion}</dd>
                <dt className="text-muted-foreground">Tested</dt>
                <dd className="text-right font-medium capitalize inline-flex items-center justify-end gap-1">
                  {t.tested === "untested" ? (
                    <CircleDashed className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3 text-[var(--teal)]" />
                  )}
                  {t.tested}
                </dd>
                <dt className="text-muted-foreground">Updated</dt>
                <dd className="text-right font-medium tabular-nums">{t.updatedLabel}</dd>
              </dl>

              {t.requiredPacks.length > 0 && (
                <div className="mt-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Required packs
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {t.requiredPacks.map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                      >
                        <Package className="h-2.5 w-2.5" />
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {t.includes.length > 0 && (
                <div className="mt-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Includes
                  </div>
                  <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                    {t.includes.map((inc, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <span className="h-1 w-1 rounded-full bg-muted-foreground/60" />
                        {inc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  {SOURCE_LABEL[t.source]}
                </span>
              </div>

              {t.license && (
                <div className="mt-2 rounded-md border border-border bg-muted/40 p-2 text-[10.5px] leading-snug">
                  <div className="font-semibold">Attribution</div>
                  <div className="text-muted-foreground">
                    {t.license.creator} · {t.license.license}
                    {t.license.sourceUrl ? ` · ${t.license.sourceUrl}` : ""}
                  </div>
                  <div className="mt-0.5 text-muted-foreground">
                    Redistribution: {t.license.redistributionAllowed ? "allowed" : "not allowed"} ·
                    Modification: {t.license.modificationAllowed ? "allowed" : "not allowed"}
                  </div>
                </div>
              )}

              <div className="mt-auto flex items-center justify-end gap-1 border-t border-border pt-3">
                {isUser && (
                  <button
                    onClick={() => removeUserTemplate(t.id)}
                    title="Delete template"
                    className="inline-flex items-center justify-center rounded-md border border-border bg-background p-1.5 text-muted-foreground hover:bg-accent hover:text-[var(--red)]"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
                <button
                  onClick={() => useTemplate(t)}
                  disabled={!t.payload || !activeProjectId}
                  title={
                    !activeProjectId
                      ? "Select a project first"
                      : !t.payload
                        ? "Template has no starter contents"
                        : "Scaffold a copy in the active project"
                  }
                  className="inline-flex items-center gap-1.5 rounded-md bg-[var(--blue)] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Use Template
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
