import { useMemo, useState } from "react";
import { LayoutTemplate, Search, Star, Download, Sparkles, Briefcase, Target, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Kind = "Career" | "Trait" | "Aspiration" | "Notification";

type Template = {
  id: string;
  name: string;
  kind: Kind;
  author: string;
  installs: number;
  rating: number;
  updated: string;
  official?: boolean;
  summary: string;
};

const TEMPLATES: Template[] = [
  { id: "t1", name: "Freelance Studio Pack", kind: "Career", author: "Lot 51", installs: 4210, rating: 4.9, updated: "3d ago", official: true, summary: "Gig-based freelancer with three tone-selectable clients." },
  { id: "t2", name: "Military Command Track", kind: "Career", author: "Zerbu", installs: 3184, rating: 4.7, updated: "1w ago", summary: "10-rank hierarchical career with uniforms and PTO." },
  { id: "t3", name: "Aquatic Rescue", kind: "Career", author: "Community", installs: 1108, rating: 4.4, updated: "2w ago", summary: "Marine specialist career with lifeguard sub-branch." },
  { id: "t4", name: "Introvert Deluxe", kind: "Trait", author: "Lot 51", installs: 6720, rating: 4.8, updated: "5d ago", official: true, summary: "Personality trait with 6 buffs and social autonomy tuning." },
  { id: "t5", name: "Night Owl", kind: "Trait", author: "Community", installs: 2401, rating: 4.6, updated: "1w ago", summary: "Circadian trait with energy decay overrides." },
  { id: "t6", name: "Peak Climber Aspiration", kind: "Aspiration", author: "Zerbu", installs: 1592, rating: 4.5, updated: "2w ago", summary: "5-milestone aspiration ending in a fitness reward trait." },
  { id: "t7", name: "Promotion Toast Kit", kind: "Notification", author: "Lot 51", installs: 8930, rating: 4.9, updated: "1d ago", official: true, summary: "Set of 6 notification templates for career events." },
];

const META: Record<Kind, { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string }> = {
  Career: { icon: Briefcase, color: "var(--blue)" },
  Trait: { icon: Sparkles, color: "var(--violet)" },
  Aspiration: { icon: Target, color: "var(--teal)" },
  Notification: { icon: Bell, color: "var(--orange)" },
};

const FILTERS: ("All" | Kind)[] = ["All", "Career", "Trait", "Aspiration", "Notification"];

export function TemplatesGallery() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | Kind>("All");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TEMPLATES.filter((t) => {
      if (filter !== "All" && t.kind !== filter) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q) || t.summary.toLowerCase().includes(q) || t.author.toLowerCase().includes(q);
    });
  }, [query, filter]);

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
        <div className="text-[11px] text-muted-foreground">
          {shown.length} of {TEMPLATES.length}
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((t) => {
          const meta = META[t.kind];
          const Icon = meta.icon;
          return (
            <article
              key={t.id}
              className="rounded-xl border border-border bg-card p-4 card-elevated transition-shadow hover:shadow-md"
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
                {t.official && (
                  <span className="rounded-full border border-[var(--teal)]/40 bg-[var(--teal)]/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-[var(--teal)]">
                    Official
                  </span>
                )}
              </header>

              <p className="mt-2 text-xs text-muted-foreground">{t.summary}</p>

              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>by {t.author}</span>
                <span className="tabular-nums">{t.updated}</span>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Star className="h-3 w-3 fill-[var(--orange)] text-[var(--orange)]" />
                    {t.rating}
                  </span>
                  <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground">
                    <Download className="h-3 w-3" />
                    {t.installs.toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={() => toast.success(`Scaffolded "${t.name}"`)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[var(--blue)] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm hover:opacity-90"
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
