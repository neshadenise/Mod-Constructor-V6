import { useMemo, useState } from "react";
import { Code2, Search, Copy, Plus, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Snippet = {
  id: string;
  title: string;
  category: "Buff" | "Objective" | "Interaction" | "Message" | "Tuning";
  tags: string[];
  body: string;
};

const INITIAL: Snippet[] = [
  {
    id: "s1",
    title: "Confident buff (visible, 240m)",
    category: "Buff",
    tags: ["emotion", "confident"],
    body: `<buff>\n  <emotion>Confident</emotion>\n  <weight>2</weight>\n  <duration_min>240</duration_min>\n  <visible>true</visible>\n</buff>`,
  },
  {
    id: "s2",
    title: "Promotion popup override",
    category: "Message",
    tags: ["promotion", "toast"],
    body: `<message id="career_promotion">\n  <title>{sim} was promoted!</title>\n  <body>New rank: {rank}. Salary: {salary}</body>\n</message>`,
  },
  {
    id: "s3",
    title: "Skill autonomy multiplier x1.5",
    category: "Tuning",
    tags: ["autonomy", "skill"],
    body: `<autonomy_score>\n  <interaction>Skill_Fitness</interaction>\n  <score>15</score>\n</autonomy_score>`,
  },
  {
    id: "s4",
    title: "Reach level 3 objective",
    category: "Objective",
    tags: ["career", "milestone"],
    body: `<objective id="reach_level_3">\n  <goal>career.level >= 3</goal>\n  <reward>50 satisfaction</reward>\n</objective>`,
  },
  {
    id: "s5",
    title: "Social — Deep Conversation",
    category: "Interaction",
    tags: ["social", "conversation"],
    body: `<interaction>\n  <name>deep_conversation</name>\n  <required_trait>Lucid Dreamer</required_trait>\n  <duration_min>15</duration_min>\n</interaction>`,
  },
];

const CATS: ("All" | Snippet["category"])[] = ["All", "Buff", "Objective", "Interaction", "Message", "Tuning"];

export function SnippetsLibrary() {
  const [snippets, setSnippets] = useState<Snippet[]>(INITIAL);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");
  const [selected, setSelected] = useState<string>(INITIAL[0].id);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return snippets.filter((s) => {
      if (cat !== "All" && s.category !== cat) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q)) ||
        s.body.toLowerCase().includes(q)
      );
    });
  }, [snippets, query, cat]);

  const active = snippets.find((s) => s.id === selected) ?? shown[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--teal)] text-white shadow-sm">
            <Code2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Reusable
            </div>
            <h1 className="text-xl font-bold tracking-tight">Snippets Library</h1>
          </div>
        </div>
        <button
          onClick={() => {
            const id = `s${Date.now()}`;
            setSnippets((s) => [
              { id, title: "New snippet", category: "Tuning", tags: [], body: "<!-- your snippet -->" },
              ...s,
            ]);
            setSelected(id);
            toast.success("Snippet created");
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--blue)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> New Snippet
        </button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <aside className="col-span-12 rounded-xl border border-border bg-card p-3 card-elevated md:col-span-4">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search snippets..."
              className="h-8 pl-7 text-xs"
            />
          </div>
          <div className="mb-3 flex flex-wrap gap-1">
            {CATS.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors",
                  cat === c
                    ? "border-[var(--teal)] bg-[var(--teal)]/10 text-[var(--teal)]"
                    : "border-border bg-background text-muted-foreground hover:bg-accent",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="max-h-[540px] space-y-0.5 overflow-y-auto pr-1">
            {shown.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelected(s.id)}
                className={cn(
                  "flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left transition-colors",
                  selected === s.id ? "bg-accent" : "hover:bg-accent/60",
                )}
              >
                <span className="text-xs font-semibold">{s.title}</span>
                <span className="text-[10px] text-muted-foreground">{s.category}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="col-span-12 rounded-xl border border-border bg-card p-5 card-elevated md:col-span-8">
          {!active ? (
            <div className="text-xs text-muted-foreground">Select a snippet.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {active.category}
                  </div>
                  <h2 className="text-lg font-bold tracking-tight">{active.title}</h2>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {active.tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-1.5 py-0.5 text-[10px]"
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(active.body);
                    toast.success("Copied to clipboard");
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium hover:bg-accent"
                >
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </div>

              <Textarea
                value={active.body}
                onChange={(e) =>
                  setSnippets((s) => s.map((x) => (x.id === active.id ? { ...x, body: e.target.value } : x)))
                }
                className="min-h-[280px] font-mono text-[11px]"
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
