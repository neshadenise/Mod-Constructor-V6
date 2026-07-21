import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const MOCK_BRANCHES = [
  "Astronaut → Space Ranger",
  "Astronaut → Interstellar Smuggler",
  "Business → Investor",
  "Culinary → Chef",
];

export const MOCK_SECTIONS = [
  "Trait Builder",
  "Aspiration Builder",
  "Tuning Editor",
];

export const MOCK_PROJECTS = [
  "Epic Careers Pack",
  "Cozy Life Mod",
  "Sci-Fi Overhaul",
];

type Props = {
  label?: string;
  what: string; // e.g. "salary & hours"
  compact?: boolean; // icon-only
  className?: string;
  disallowBranches?: boolean;
};

export function CopyToMenu({ label, what, compact, className, disallowBranches }: Props) {
  const [open, setOpen] = useState(false);
  const [picks, setPicks] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setPicks((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const confirm = () => {
    if (picks.size === 0) {
      toast.error("Pick at least one destination");
      return;
    }
    const dests = Array.from(picks).map((k) => k.split("::")[1]).join(", ");
    toast.success(`Copied ${what}`, { description: `→ ${dests}` });
    setPicks(new Set());
    setOpen(false);
  };

  const Group = ({ title, items, kind }: { title: string; items: string[]; kind: string }) => (
    <div className="mb-2">
      <div className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <ul className="space-y-0.5">
        {items.map((it) => {
          const key = `${kind}::${it}`;
          const checked = picks.has(key);
          return (
            <li key={key}>
              <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-accent/60">
                <Checkbox checked={checked} onCheckedChange={() => toggle(key)} />
                <span className="flex-1">{it}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 rounded-md border border-border bg-card text-[11px] font-medium hover:bg-accent/60",
            compact ? "h-6 w-6 justify-center border-transparent bg-transparent hover:bg-accent" : "px-2 py-1",
            className,
          )}
          title={`Copy ${what} to…`}
        >
          <Copy className="h-3.5 w-3.5" />
          {!compact && (label ?? "Copy to…")}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <div className="mb-2 border-b border-border pb-1.5 text-[11px] font-semibold">
          Copy {what} to…
        </div>
        {!disallowBranches && <Group title="Branches in this career" items={MOCK_BRANCHES} kind="branch" />}
        <Group title="Other sections" items={MOCK_SECTIONS} kind="section" />
        <Group title="Recent projects" items={MOCK_PROJECTS} kind="project" />
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
          <span className="text-[10.5px] text-muted-foreground">
            {picks.size} selected
          </span>
          <button
            type="button"
            onClick={confirm}
            className="inline-flex items-center gap-1 rounded-md bg-[var(--blue)] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm hover:opacity-90"
          >
            <Check className="h-3 w-3" /> Copy
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
