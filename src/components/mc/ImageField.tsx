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
import { Image as ImageIcon, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { IconPicker } from "./icons/IconPicker";
import { IconArt } from "./icons/IconArt";
import { findBuiltin, type IconRef } from "@/lib/icon-library";
import { findCustomIcon } from "@/lib/custom-icons";

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
  if (v.startsWith("gen:")) return { kind: "generated", id: v.slice(4) };
  if (v.startsWith("proj:")) return { kind: "project", id: v.slice(5) };
  if (v.startsWith("upload:")) return { kind: "project", id: v.slice(7) };
  return null;
}

function serialize(ref: IconRef): string {
  if (ref.kind === "builtin") return `def:${ref.id}`;
  if (ref.kind === "generated") return `gen:${ref.id}`;
  return `proj:${ref.id}`;
}

export function ImageField({
  label,
  value,
  onChange,
  hint,
  slot = "image",
  context,
}: ImageFieldProps) {
  const [open, setOpen] = useState(false);
  const [aiTab, setAiTab] = useState(false);
  const ref = parseRef(value);
  const builtin = ref?.kind === "builtin" ? findBuiltin(ref.id) : undefined;
  const custom = ref?.kind === "generated" ? findCustomIcon(ref.id) : undefined;
  const hasArt = Boolean(builtin || custom);

  const openPicker = (ai: boolean) => {
    setAiTab(ai);
    setOpen(true);
  };

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
          {custom ? (
            <img src={custom.dataUrl} alt={custom.name} className="h-full w-full object-contain" />
          ) : builtin ? (
            <IconArt icon={builtin} size={40} />
          ) : (
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1 text-[11px] text-muted-foreground">
          <div className="truncate font-medium text-foreground">
            {custom?.name ?? builtin?.name ?? value ?? "No icon selected"}
          </div>
          {hint && <div className="truncate text-[10px]">{hint}</div>}
          {builtin && (
            <div className="text-[10px] text-muted-foreground">
              Default Library · <span className="font-mono">{builtin.id}</span>
            </div>
          )}
          {custom && (
            <div className="text-[10px] text-muted-foreground">
              {custom.source === "ai" ? "AI generated" : "Uploaded"} · My Icons
            </div>
          )}
        </div>
        <button
          onClick={() => openPicker(true)}
          title="Generate this icon with AI"
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--teal)]/40 bg-[var(--teal)]/10 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--teal)] hover:bg-[var(--teal)]/20"
        >
          <Wand2 className="h-3 w-3" />
          AI
        </button>
        <button
          onClick={() => openPicker(false)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold hover:bg-accent"
        >
          <Sparkles className="h-3 w-3 text-[var(--teal)]" />
          {hasArt || value ? "Change" : "Choose icon"}
        </button>
        {(hasArt || value) && (
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
        initialTab={aiTab ? "ai" : "library"}
        suggestion={context?.subject}
        title={`Choose ${slot === "icon" ? "icon" : "image"} for ${label}`}
        onPick={(next) => onChange(serialize(next))}
      />
    </div>
  );
}

