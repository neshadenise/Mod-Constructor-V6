import { Plus, Save, Trash2, Check } from "lucide-react";
import type { BuilderRecordApi } from "@/lib/builder-record";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Record switcher shown at the top of every builder: which entry of this
 * project you're editing, plus New / Save / Delete.
 */
export function BuilderRecordBar<S>({
  rec,
  noun,
}: {
  rec: BuilderRecordApi<S>;
  /** "career", "trait", "aspiration" — used in labels and toasts. */
  noun: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {noun}s in this project
      </span>

      <select
        value={rec.currentId ?? ""}
        onChange={(e) => (e.target.value ? rec.select(e.target.value) : rec.addNew())}
        className="h-7 min-w-[180px] rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-[var(--teal)]"
      >
        {!rec.currentId && <option value="">Unsaved draft — {rec.currentName || "Untitled"}</option>}
        {rec.records.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
        {rec.currentId && rec.records.length === 0 && <option value="">Untitled</option>}
      </select>

      <span
        className={cn(
          "inline-flex items-center gap-1 text-[10.5px]",
          rec.dirty ? "text-[var(--orange)]" : "text-muted-foreground",
        )}
      >
        {rec.dirty ? (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--orange)]" /> Unsaved changes
          </>
        ) : (
          <>
            <Check className="h-3 w-3" /> Saved
          </>
        )}
      </span>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          onClick={() => {
            rec.addNew();
            toast.success(`New ${noun} started`);
          }}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-semibold hover:bg-accent"
        >
          <Plus className="h-3.5 w-3.5" /> Add new
        </button>
        <button
          onClick={() => {
            rec.save();
            toast.success(`Saved ${noun}`);
          }}
          className="inline-flex items-center gap-1 rounded-md bg-[var(--teal)] px-2 py-1 text-[11px] font-semibold text-white hover:opacity-90"
        >
          <Save className="h-3.5 w-3.5" /> Save
        </button>
        {rec.currentId && (
          <button
            onClick={() => {
              const id = rec.currentId;
              if (!id) return;
              if (!confirm(`Delete this ${noun}? This cannot be undone.`)) return;
              rec.remove(id);
              toast(`Deleted ${noun}`);
            }}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
