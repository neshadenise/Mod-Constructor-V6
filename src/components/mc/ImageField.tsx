/**
 * ImageField — reusable icon/image field.
 *
 * Every icon field in the app routes through this component. Clicking
 * "Choose icon" opens the universal IconPicker (Default Library /
 * Project Assets / Upload). Live previews update immediately.
 *
 * The stored value is a string reference so the surrounding schema
 * doesn't change: built-in icons are stored as `def:<id>`, project
 * assets as `proj:<name>`, uploads as `upload:<filename>`. Everything
 * else in the codebase still reads a plain string.
 */
import { useState } from "react";
import { Image as ImageIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { IconPicker } from "./icons/IconPicker";
import { IconArt } from "./icons/IconArt";
import { findBuiltin, type IconRef } from "@/lib/icon-library";

export interface ImageFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  slot?: "icon" | "image";
  context?: { subject?: string; style?: string };
}

/** Parse a stored string reference into a picker IconRef. */
function parseRef(v: string): IconRef | null {
  if (!v) return null;
  if (v.startsWith("def:")) return { kind: "builtin", id: v.slice(4) };
  if (v.startsWith("proj:")) return { kind: "project", id: v.slice(5) };
  if (v.startsWith("upload:")) return { kind: "project", id: v.slice(7) };
  return null;
}

function serialize(ref: IconRef): string {
  if (ref.kind === "builtin") return `def:${ref.id}`;
  return `proj:${ref.id}`;
}

export function ImageField({ label, value, onChange, hint, slot = "image" }: ImageFieldProps) {
  const [open, setOpen] = useState(false);
  const ref = parseRef(value);
  const builtin = ref?.kind === "builtin" ? findBuiltin(ref.id) : undefined;

  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 p-3">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card",
          )}
        >
          {builtin ? (
            <IconArt icon={builtin} size={40} />
          ) : (
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1 text-[11px] text-muted-foreground">
          <div className="truncate font-medium text-foreground">
            {builtin ? builtin.name : value || "No icon selected"}
          </div>
          {hint && <div className="truncate text-[10px]">{hint}</div>}
          {builtin && (
            <div className="text-[10px] text-muted-foreground">
              Default Library · <span className="font-mono">{builtin.id}</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold hover:bg-accent"
        >
          <Sparkles className="h-3 w-3 text-[var(--teal)]" />
          {builtin || value ? "Change" : "Choose icon"}
        </button>
        {(builtin || value) && (
          <button
            onClick={() => {
              onChange("");
              toast.message(`${label} cleared`);
            }}
            className="rounded-md border border-border bg-card px-2 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-accent"
          >
            Clear
          </button>
        )}
      </div>

      <IconPicker
        open={open}
        onClose={() => setOpen(false)}
        value={ref ?? undefined}
        title={`Choose ${slot === "icon" ? "icon" : "image"} for ${label}`}
        onPick={(next) => onChange(serialize(next))}
      />
    </div>
  );
}
