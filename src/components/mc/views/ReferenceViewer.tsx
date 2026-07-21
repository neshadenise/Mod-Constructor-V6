import { useMemo, useState } from "react";
import { BookOpen, Search, ExternalLink, Copy, Bookmark } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Entry = {
  id: string;
  category: "Career" | "Trait" | "Aspiration" | "Tuning" | "Buff" | "General";
  title: string;
  summary: string;
  fields?: { name: string; type: string; desc: string }[];
  example?: string;
  v5Ref?: string;
};

const ENTRIES: Entry[] = [
  {
    id: "career-identity",
    category: "Career",
    title: "Career Identity",
    summary: "Top-level metadata for a custom career: display name, type, PTO, age availability, and company variants.",
    fields: [
      { name: "career_type", type: "enum", desc: "Full-time, Part-time, Active, Freelance." },
      { name: "age_availability", type: "flags", desc: "Which life stages can join (Teen, YA, Adult, Elder)." },
      { name: "pto_days", type: "int", desc: "Paid time-off allotment per season." },
      { name: "company_names", type: "list<string>", desc: "Rotates the flavor company name on career notifications." },
    ],
    example: `<career name="Marine Biologist">
  <type>FullTime</type>
  <age>YA,Adult,Elder</age>
  <pto_days>5</pto_days>
</career>`,
    v5Ref: "career/Identity.md",
  },
  {
    id: "career-ranks",
    category: "Career",
    title: "Ranks & Levels",
    summary: "Each rank sets salary, hours, day-of-week schedule, uniform, and per-rank objectives.",
    fields: [
      { name: "level", type: "int", desc: "1-based rank number." },
      { name: "salary_per_hour", type: "float", desc: "Base hourly pay for this rank." },
      { name: "start_time", type: "hh:mm", desc: "Shift start; use 'None' for gig-style ranks." },
      { name: "work_days", type: "flags", desc: "Mon..Sun mask for scheduled days." },
      { name: "uniform_male / uniform_female", type: "asset", desc: "Optional CAS uniforms." },
    ],
    v5Ref: "career/Levels.md",
  },
  {
    id: "career-events",
    category: "Career",
    title: "Work-From-Home Events",
    summary: "Interactive at-home events that trigger during the shift, similar to Freelancer gigs.",
    fields: [
      { name: "event_id", type: "string", desc: "Unique identifier for the event." },
      { name: "duration", type: "min", desc: "Length in minutes." },
      { name: "outcomes", type: "list", desc: "Weighted outcome nodes (bonus, mood, promotion progress)." },
    ],
    v5Ref: "career/Events.md",
  },
  {
    id: "career-messages",
    category: "Career",
    title: "Message Overrides",
    summary: "Replace default game strings for promotion, demotion, missed shift, PTO, tone, etc.",
    fields: [
      { name: "message_id", type: "enum", desc: "One of 19 supported override slots." },
      { name: "text", type: "localized", desc: "Localized STBL entry replacing the default." },
    ],
    v5Ref: "career/Messages.md",
  },
  {
    id: "trait-identity",
    category: "Trait",
    title: "Trait Identity",
    summary: "Trait metadata: type, age gate, category, conflicts, and icon.",
    fields: [
      { name: "trait_type", type: "enum", desc: "Personality, Gameplay, Bonus, Reward." },
      { name: "age_availability", type: "flags", desc: "Age stages that can select this trait." },
      { name: "conflicting_traits", type: "list<ref>", desc: "Traits that cannot coexist with this one." },
    ],
    v5Ref: "trait/Identity.md",
  },
  {
    id: "trait-buffs",
    category: "Trait",
    title: "Trait Buffs",
    summary: "Persistent or triggered emotional buffs the trait applies to the sim.",
    fields: [
      { name: "emotion", type: "enum", desc: "One of 15 emotions (Happy, Confident, Focused, ...)." },
      { name: "weight", type: "int", desc: "Emotional weight added while active." },
      { name: "duration", type: "min", desc: "0 for permanent while trait is held." },
      { name: "visible", type: "bool", desc: "Whether the buff appears in the sim's mood panel." },
    ],
    v5Ref: "trait/Buffs.md",
  },
  {
    id: "trait-modifiers",
    category: "Trait",
    title: "Modifiers & Autonomy",
    summary: "Skill gain rates, need decay multipliers, and autonomy score adjustments.",
    fields: [
      { name: "skill_gain", type: "map<skill,float>", desc: "Multiplier per skill (1.0 = baseline)." },
      { name: "need_decay", type: "map<need,float>", desc: "Decay multipliers." },
      { name: "autonomy_score", type: "map<interaction,int>", desc: "Boost/penalty per interaction category." },
    ],
    v5Ref: "trait/Modifiers.md",
  },
  {
    id: "aspiration-track",
    category: "Aspiration",
    title: "Aspiration Track",
    summary: "Ordered set of milestones, each with objectives and a completion reward.",
    fields: [
      { name: "milestones", type: "list", desc: "Ordered progression of milestones." },
      { name: "reward_trait", type: "ref", desc: "Trait granted on final completion." },
    ],
    v5Ref: "aspiration/Track.md",
  },
  {
    id: "notif-popup",
    category: "General",
    title: "Notification Popup",
    summary: "Reusable notification template driven by tokens ({sim}, {career}, {salary}).",
    fields: [
      { name: "icon", type: "asset", desc: "Icon rendered on the toast." },
      { name: "tone", type: "enum", desc: "Neutral, Positive, Warning, Error." },
      { name: "duration_s", type: "int", desc: "Auto-dismiss after N seconds; 0 = persistent." },
    ],
  },
  {
    id: "tuning-refs",
    category: "Tuning",
    title: "Cross-references & IDs",
    summary: "How V5 resolves IDs across tuning files, S4S / S4PE bridges, and STBL references.",
    fields: [
      { name: "instance_id", type: "hex", desc: "64-bit instance ID (auto-generated)." },
      { name: "resource_group", type: "hex", desc: "Group ID; must match package group." },
    ],
    v5Ref: "tuning/References.md",
  },
];

const CATEGORIES = ["All", "Career", "Trait", "Aspiration", "Notification", "Tuning", "General"] as const;
type Category = (typeof CATEGORIES)[number];

export function ReferenceViewer() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const [selectedId, setSelectedId] = useState<string>(ENTRIES[0].id);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ENTRIES.filter((e) => {
      if (category !== "All" && !e.category.startsWith(category.replace("Notification", "Notification")) && e.category !== category) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        e.fields?.some((f) => f.name.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q))
      );
    });
  }, [query, category]);

  const active = ENTRIES.find((e) => e.id === selectedId) ?? results[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--teal)] text-white shadow-sm">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Documentation
            </div>
            <h1 className="text-xl font-bold tracking-tight">Reference Viewer</h1>
          </div>
        </div>
        <a
          href="https://github.com/Zerbu/Mod-Constructor-5"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          <ExternalLink className="h-3.5 w-3.5" /> V5 Repository
        </a>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <aside className="col-span-12 rounded-xl border border-border bg-card p-3 card-elevated md:col-span-4 lg:col-span-3">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search fields, terms..."
              className="h-8 pl-7 text-xs"
            />
          </div>
          <div className="mb-3 flex flex-wrap gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors",
                  category === c
                    ? "border-[var(--teal)] bg-[var(--teal)]/10 text-[var(--teal)]"
                    : "border-border bg-background text-muted-foreground hover:bg-accent",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="max-h-[540px] space-y-0.5 overflow-y-auto pr-1">
            {results.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                className={cn(
                  "flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left transition-colors",
                  selectedId === e.id ? "bg-accent text-foreground" : "hover:bg-accent/60",
                )}
              >
                <span className="text-xs font-semibold">{e.title}</span>
                <span className="text-[10px] text-muted-foreground">{e.category}</span>
              </button>
            ))}
            {results.length === 0 && (
              <div className="rounded-md border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground">
                No matches.
              </div>
            )}
          </div>
        </aside>

        <section className="col-span-12 rounded-xl border border-border bg-card p-5 card-elevated md:col-span-8 lg:col-span-9">
          {!active ? (
            <div className="text-xs text-muted-foreground">Select an entry.</div>
          ) : (
            <article className="space-y-5">
              <header className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {active.category}
                  </div>
                  <h2 className="text-lg font-bold tracking-tight">{active.title}</h2>
                  <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{active.summary}</p>
                </div>
                <button
                  onClick={() => toast.success("Bookmarked")}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium hover:bg-accent"
                >
                  <Bookmark className="h-3 w-3" /> Save
                </button>
              </header>

              {active.fields && (
                <div>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Fields
                  </div>
                  <div className="overflow-hidden rounded-md border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-background/60 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-semibold">Name</th>
                          <th className="px-2 py-1.5 text-left font-semibold">Type</th>
                          <th className="px-2 py-1.5 text-left font-semibold">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {active.fields.map((f) => (
                          <tr key={f.name} className="border-t border-border/70">
                            <td className="px-2 py-1.5 font-mono text-[11px] font-semibold text-[var(--blue)]">
                              {f.name}
                            </td>
                            <td className="px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
                              {f.type}
                            </td>
                            <td className="px-2 py-1.5 text-muted-foreground">{f.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {active.example && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Example
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(active.example ?? "");
                        toast.success("Copied");
                      }}
                      className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-[10px] font-medium hover:bg-accent"
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                  </div>
                  <pre className="overflow-x-auto rounded-md border border-border bg-background/70 p-3 font-mono text-[11px] leading-relaxed">
                    {active.example}
                  </pre>
                </div>
              )}

              {active.v5Ref && (
                <div className="rounded-md border border-dashed border-border bg-background/40 px-3 py-2 text-[11px] text-muted-foreground">
                  V5 reference:{" "}
                  <span className="font-mono text-foreground">docs/{active.v5Ref}</span>
                </div>
              )}
            </article>
          )}
        </section>
      </div>
    </div>
  );
}
