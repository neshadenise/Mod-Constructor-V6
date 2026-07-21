import { useState } from "react";
import { Bell, Search, Copy, Check } from "lucide-react";
import { NotificationPopup, type NotificationKind } from "./GameUI";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Sample = {
  kind: NotificationKind;
  title: string;
  body: string;
  action?: string;
  tag: string;
};

const SAMPLES: Sample[] = [
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

const FILTERS = ["All", ...Array.from(new Set(SAMPLES.map((s) => s.tag)))] as const;

export function NotificationLibrary() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = SAMPLES.filter(
    (s) =>
      (filter === "All" || s.tag === filter) &&
      (q === "" ||
        s.title.toLowerCase().includes(q.toLowerCase()) ||
        s.body.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--pink)] text-white shadow-sm">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Preview Library
            </div>
            <h1 className="text-xl font-bold tracking-tight">Notification Library</h1>
          </div>
        </div>
        <div className="text-[11px] text-muted-foreground">
          {filtered.length} reusable templates
        </div>
      </div>

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
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((s) => {
          const id = s.tag + s.title;
          return (
            <div
              key={id}
              className="group relative rounded-xl border border-border bg-card p-3 card-elevated"
            >
              <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>{s.tag}</span>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(JSON.stringify(s, null, 2)).catch(() => {});
                    setCopied(id);
                    setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600);
                    toast.success("Template copied — paste into any builder");
                  }}
                  className="flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  {copied === id ? <Check className="h-3 w-3 text-[var(--green)]" /> : <Copy className="h-3 w-3" />}
                  {copied === id ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="rounded-lg bg-[oklch(0.98_0.01_230)] p-3 [[data-preview-theme='dark']_&]:bg-[oklch(0.22_0.04_260)]">
                <NotificationPopup kind={s.kind} title={s.title} body={s.body} action={s.action} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
