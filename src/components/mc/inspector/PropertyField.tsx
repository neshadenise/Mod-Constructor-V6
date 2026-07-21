import { useEffect, useMemo, useRef, useState } from "react";
import {
  HelpCircle,
  Copy,
  Clipboard,
  RotateCcw,
  Lock,
  Unlock,
  Star,
  StarOff,
  Files,
  X,
  ChevronDown,
  GripVertical,
  Plus,
  Palette,
  Image as ImageIcon,
  Link2,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useInspectorHistory } from "@/lib/inspector-history";

export type ValidationState =
  | { level: "ok"; message?: string }
  | { level: "warning"; message: string }
  | { level: "error"; message: string }
  | { level: "info"; message: string }
  | null;

export type PropertyOption = { value: string; label: string; description?: string };

export type BaseProps<T> = {
  id: string;
  label: string;
  subtitle?: string;
  tooltip?: string;
  example?: string;
  value: T;
  defaultValue?: T;
  onChange: (v: T) => void;
  validation?: ValidationState;
  locked?: boolean;
  favorite?: boolean;
  onFavoriteChange?: (v: boolean) => void;
  onLockChange?: (v: boolean) => void;
  onDuplicate?: () => void;
  disabled?: boolean;
  className?: string;
  /** When present, field renders only if this returns true. */
  showWhen?: () => boolean;
};

/* ---------- Field frame with all the standard controls ---------- */

function FieldFrame({
  id,
  label,
  subtitle,
  tooltip,
  example,
  validation,
  locked,
  favorite,
  onFavoriteChange,
  onLockChange,
  onCopy,
  onPaste,
  onReset,
  onDuplicate,
  children,
  recentHighlight,
  hideControls,
  className,
}: {
  id: string;
  label: string;
  subtitle?: string;
  tooltip?: string;
  example?: string;
  validation?: ValidationState;
  locked?: boolean;
  favorite?: boolean;
  onFavoriteChange?: (v: boolean) => void;
  onLockChange?: (v: boolean) => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onReset?: () => void;
  onDuplicate?: () => void;
  children: React.ReactNode;
  recentHighlight?: boolean;
  hideControls?: boolean;
  className?: string;
}) {
  const validationTint =
    validation?.level === "error"
      ? "border-[var(--red)]/60 bg-[var(--red)]/5"
      : validation?.level === "warning"
        ? "border-[var(--orange)]/60 bg-[var(--orange)]/5"
        : validation?.level === "info"
          ? "border-[var(--blue)]/60 bg-[var(--blue)]/5"
          : recentHighlight
            ? "border-[var(--teal)]/50 bg-[var(--teal)]/5"
            : "border-border bg-card";

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn("group relative rounded-lg border transition-colors", validationTint, className)}>
        <div className="flex items-start justify-between gap-2 px-3 pb-1 pt-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <label htmlFor={id} className="text-[11.5px] font-semibold uppercase tracking-wide text-foreground/80">
                {label}
              </label>
              {tooltip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground/60 hover:text-foreground" aria-label={`${label} help`}>
                      <HelpCircle className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">{tooltip}</TooltipContent>
                </Tooltip>
              )}
              {locked && <Lock className="h-3 w-3 text-muted-foreground/70" aria-label="locked" />}
              {recentHighlight && (
                <span className="rounded-full bg-[var(--teal)]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--teal)]">
                  edited
                </span>
              )}
            </div>
            {subtitle && <div className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</div>}
          </div>
          {!hideControls && (
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <IconAction label={favorite ? "Unfavorite" : "Favorite"} onClick={() => onFavoriteChange?.(!favorite)}>
                {favorite ? <Star className="h-3 w-3 fill-[var(--orange)] text-[var(--orange)]" /> : <StarOff className="h-3 w-3" />}
              </IconAction>
              {onCopy && (
                <IconAction label="Copy value" onClick={onCopy}>
                  <Copy className="h-3 w-3" />
                </IconAction>
              )}
              {onPaste && (
                <IconAction label="Paste value" onClick={onPaste}>
                  <Clipboard className="h-3 w-3" />
                </IconAction>
              )}
              {onReset && (
                <IconAction label="Reset to default" onClick={onReset}>
                  <RotateCcw className="h-3 w-3" />
                </IconAction>
              )}
              {onDuplicate && (
                <IconAction label="Duplicate field" onClick={onDuplicate}>
                  <Files className="h-3 w-3" />
                </IconAction>
              )}
              <IconAction label={locked ? "Unlock field" : "Lock field"} onClick={() => onLockChange?.(!locked)}>
                {locked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              </IconAction>
            </div>
          )}
        </div>

        <div className="px-3 pb-3">{children}</div>

        {(validation?.message || example) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 pb-2.5 text-[11px]">
            {validation?.message && (
              <span
                className={cn(
                  "font-medium",
                  validation.level === "error" && "text-[var(--red)]",
                  validation.level === "warning" && "text-[var(--orange)]",
                  validation.level === "info" && "text-[var(--blue)]",
                  validation.level === "ok" && "text-[var(--green)]",
                )}
              >
                {validation.message}
              </span>
            )}
            {example && <span className="text-muted-foreground/80">e.g. {example}</span>}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/70 hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}

/* ---------- Wrapper that wires history + clipboard + reset for every variant ---------- */

function useFieldOps<T>(id: string, label: string, value: T, defaultValue: T | undefined, onChange: (v: T) => void) {
  const { record, recentFieldIds } = useInspectorHistory();
  const commit = (next: T) => {
    if (Object.is(next, value)) return;
    record({ fieldId: id, label, previousValue: value, nextValue: next });
    onChange(next);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(value ?? ""));
      toast.success(`Copied · ${label}`);
    } catch {
      toast.error("Clipboard blocked");
    }
  };
  const paste = async () => {
    try {
      const txt = await navigator.clipboard.readText();
      commit(txt as T);
      toast.success(`Pasted · ${label}`);
    } catch {
      toast.error("Clipboard blocked");
    }
  };
  const reset = () => {
    if (defaultValue === undefined) return;
    commit(defaultValue);
    toast(`Reset · ${label}`);
  };
  return { commit, copy, paste, reset, isRecent: recentFieldIds.includes(id) };
}

/* ---------- Text ---------- */

type TextProps = BaseProps<string> & { placeholder?: string; multiline?: boolean };

export function TextField(p: TextProps) {
  if (p.showWhen && !p.showWhen()) return null;
  const { commit, copy, paste, reset, isRecent } = useFieldOps(p.id, p.label, p.value, p.defaultValue, p.onChange);
  return (
    <FieldFrame
      id={p.id}
      label={p.label}
      subtitle={p.subtitle}
      tooltip={p.tooltip}
      example={p.example}
      validation={p.validation}
      locked={p.locked}
      favorite={p.favorite}
      onFavoriteChange={p.onFavoriteChange}
      onLockChange={p.onLockChange}
      onCopy={copy}
      onPaste={paste}
      onReset={p.defaultValue !== undefined ? reset : undefined}
      onDuplicate={p.onDuplicate}
      recentHighlight={isRecent}
      className={p.className}
    >
      {p.multiline ? (
        <Textarea
          id={p.id}
          value={p.value}
          disabled={p.disabled || p.locked}
          placeholder={p.placeholder}
          onChange={(e) => commit(e.target.value)}
          className="min-h-20 resize-y bg-background text-xs"
        />
      ) : (
        <Input
          id={p.id}
          value={p.value}
          disabled={p.disabled || p.locked}
          placeholder={p.placeholder}
          onChange={(e) => commit(e.target.value)}
          className="h-9 bg-background text-xs"
        />
      )}
    </FieldFrame>
  );
}

/* ---------- Number ---------- */

type NumberProps = BaseProps<number> & { min?: number; max?: number; step?: number; suffix?: string };

export function NumberField(p: NumberProps) {
  if (p.showWhen && !p.showWhen()) return null;
  const { commit, copy, paste, reset, isRecent } = useFieldOps(p.id, p.label, p.value, p.defaultValue, p.onChange);
  return (
    <FieldFrame
      id={p.id}
      label={p.label}
      subtitle={p.subtitle}
      tooltip={p.tooltip}
      example={p.example}
      validation={p.validation}
      locked={p.locked}
      favorite={p.favorite}
      onFavoriteChange={p.onFavoriteChange}
      onLockChange={p.onLockChange}
      onCopy={copy}
      onPaste={paste}
      onReset={p.defaultValue !== undefined ? reset : undefined}
      onDuplicate={p.onDuplicate}
      recentHighlight={isRecent}
      className={p.className}
    >
      <div className="relative">
        <Input
          id={p.id}
          type="number"
          value={p.value}
          disabled={p.disabled || p.locked}
          min={p.min}
          max={p.max}
          step={p.step}
          onChange={(e) => commit(Number(e.target.value))}
          className="h-9 bg-background pr-10 text-xs tabular-nums"
        />
        {p.suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground">
            {p.suffix}
          </span>
        )}
      </div>
    </FieldFrame>
  );
}

/* ---------- Slider ---------- */

type SliderProps = BaseProps<number> & { min?: number; max?: number; step?: number };

export function SliderField(p: SliderProps) {
  if (p.showWhen && !p.showWhen()) return null;
  const { commit, copy, paste, reset, isRecent } = useFieldOps(p.id, p.label, p.value, p.defaultValue, p.onChange);
  const min = p.min ?? 0;
  const max = p.max ?? 100;
  return (
    <FieldFrame
      id={p.id}
      label={p.label}
      subtitle={p.subtitle}
      tooltip={p.tooltip}
      example={p.example}
      validation={p.validation}
      locked={p.locked}
      favorite={p.favorite}
      onFavoriteChange={p.onFavoriteChange}
      onLockChange={p.onLockChange}
      onCopy={copy}
      onPaste={paste}
      onReset={p.defaultValue !== undefined ? reset : undefined}
      onDuplicate={p.onDuplicate}
      recentHighlight={isRecent}
      className={p.className}
    >
      <div className="flex items-center gap-3">
        <input
          id={p.id}
          type="range"
          disabled={p.disabled || p.locked}
          min={min}
          max={max}
          step={p.step ?? 1}
          value={p.value}
          onChange={(e) => commit(Number(e.target.value))}
          className="h-1.5 flex-1 accent-[var(--blue)]"
        />
        <span className="w-14 text-right text-xs font-semibold tabular-nums">{p.value}</span>
      </div>
    </FieldFrame>
  );
}

/* ---------- Switch ---------- */

type SwitchProps = BaseProps<boolean>;

export function SwitchField(p: SwitchProps) {
  if (p.showWhen && !p.showWhen()) return null;
  const { commit, isRecent } = useFieldOps(p.id, p.label, p.value, p.defaultValue, p.onChange);
  return (
    <FieldFrame
      id={p.id}
      label={p.label}
      subtitle={p.subtitle}
      tooltip={p.tooltip}
      example={p.example}
      validation={p.validation}
      locked={p.locked}
      favorite={p.favorite}
      onFavoriteChange={p.onFavoriteChange}
      onLockChange={p.onLockChange}
      onReset={p.defaultValue !== undefined ? () => commit(p.defaultValue as boolean) : undefined}
      onDuplicate={p.onDuplicate}
      recentHighlight={isRecent}
      className={p.className}
    >
      <button
        role="switch"
        aria-checked={p.value}
        disabled={p.disabled || p.locked}
        onClick={() => commit(!p.value)}
        className={cn(
          "relative flex h-6 w-11 items-center rounded-full border border-border transition-colors",
          p.value ? "bg-[var(--blue)]" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute h-4 w-4 rounded-full bg-white shadow transition-all",
            p.value ? "left-6" : "left-1",
          )}
        />
      </button>
    </FieldFrame>
  );
}

/* ---------- Chips ---------- */

type ChipsProps = BaseProps<string[]> & { placeholder?: string };

export function ChipsField(p: ChipsProps) {
  if (p.showWhen && !p.showWhen()) return null;
  const [draft, setDraft] = useState("");
  const { commit, copy, paste, reset, isRecent } = useFieldOps(p.id, p.label, p.value, p.defaultValue, p.onChange);
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (p.value.includes(v)) return;
    commit([...p.value, v]);
    setDraft("");
  };
  const remove = (chip: string) => commit(p.value.filter((c) => c !== chip));
  return (
    <FieldFrame
      id={p.id}
      label={p.label}
      subtitle={p.subtitle}
      tooltip={p.tooltip}
      example={p.example}
      validation={p.validation}
      locked={p.locked}
      favorite={p.favorite}
      onFavoriteChange={p.onFavoriteChange}
      onLockChange={p.onLockChange}
      onCopy={copy}
      onPaste={paste}
      onReset={p.defaultValue !== undefined ? reset : undefined}
      onDuplicate={p.onDuplicate}
      recentHighlight={isRecent}
      className={p.className}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {p.value.map((c) => (
          <span
            key={c}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium"
          >
            {c}
            <button
              onClick={() => remove(c)}
              aria-label={`Remove ${c}`}
              className="text-muted-foreground hover:text-[var(--red)]"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          placeholder={p.placeholder ?? "Add…"}
          disabled={p.disabled || p.locked}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="min-w-24 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
        />
      </div>
    </FieldFrame>
  );
}

/* ---------- Color ---------- */

type ColorProps = BaseProps<string>;

export function ColorField(p: ColorProps) {
  if (p.showWhen && !p.showWhen()) return null;
  const { commit, copy, paste, reset, isRecent } = useFieldOps(p.id, p.label, p.value, p.defaultValue, p.onChange);
  return (
    <FieldFrame
      id={p.id}
      label={p.label}
      subtitle={p.subtitle}
      tooltip={p.tooltip}
      example={p.example}
      validation={p.validation}
      locked={p.locked}
      favorite={p.favorite}
      onFavoriteChange={p.onFavoriteChange}
      onLockChange={p.onLockChange}
      onCopy={copy}
      onPaste={paste}
      onReset={p.defaultValue !== undefined ? reset : undefined}
      onDuplicate={p.onDuplicate}
      recentHighlight={isRecent}
      className={p.className}
    >
      <div className="flex items-center gap-2">
        <label className="relative flex h-9 w-14 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-border">
          <input
            id={p.id}
            type="color"
            value={p.value}
            disabled={p.disabled || p.locked}
            onChange={(e) => commit(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <span className="pointer-events-none absolute inset-1 rounded" style={{ background: p.value }} />
          <Palette className="pointer-events-none relative h-3.5 w-3.5 text-white mix-blend-difference" />
        </label>
        <Input
          value={p.value}
          disabled={p.disabled || p.locked}
          onChange={(e) => commit(e.target.value)}
          className="h-9 flex-1 bg-background font-mono text-xs uppercase"
        />
      </div>
    </FieldFrame>
  );
}

/* ---------- Select / Multi-select ---------- */

type SelectProps = BaseProps<string> & { options: PropertyOption[]; placeholder?: string };

export function SelectField(p: SelectProps) {
  if (p.showWhen && !p.showWhen()) return null;
  const { commit, copy, paste, reset, isRecent } = useFieldOps(p.id, p.label, p.value, p.defaultValue, p.onChange);
  const [open, setOpen] = useState(false);
  const current = p.options.find((o) => o.value === p.value);
  return (
    <FieldFrame
      id={p.id}
      label={p.label}
      subtitle={p.subtitle}
      tooltip={p.tooltip}
      example={p.example}
      validation={p.validation}
      locked={p.locked}
      favorite={p.favorite}
      onFavoriteChange={p.onFavoriteChange}
      onLockChange={p.onLockChange}
      onCopy={copy}
      onPaste={paste}
      onReset={p.defaultValue !== undefined ? reset : undefined}
      onDuplicate={p.onDuplicate}
      recentHighlight={isRecent}
      className={p.className}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            disabled={p.disabled || p.locked}
            className="flex h-9 w-full items-center justify-between rounded-md border border-border bg-background px-3 text-left text-xs hover:bg-accent"
          >
            <span className={cn(!current && "text-muted-foreground")}>{current?.label ?? p.placeholder ?? "Select…"}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-1">
          <ul className="max-h-64 overflow-y-auto">
            {p.options.map((o) => (
              <li key={o.value}>
                <button
                  onClick={() => {
                    commit(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 rounded px-2 py-1.5 text-left hover:bg-accent",
                    p.value === o.value && "bg-accent",
                  )}
                >
                  <span className="text-xs font-medium">{o.label}</span>
                  {o.description && <span className="text-[11px] text-muted-foreground">{o.description}</span>}
                </button>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </FieldFrame>
  );
}

type MultiSelectProps = BaseProps<string[]> & { options: PropertyOption[]; placeholder?: string };

export function MultiSelectField(p: MultiSelectProps) {
  if (p.showWhen && !p.showWhen()) return null;
  const { commit, copy, paste, reset, isRecent } = useFieldOps(p.id, p.label, p.value, p.defaultValue, p.onChange);
  const [open, setOpen] = useState(false);
  const toggle = (v: string) => commit(p.value.includes(v) ? p.value.filter((x) => x !== v) : [...p.value, v]);
  const labels = p.value.map((v) => p.options.find((o) => o.value === v)?.label ?? v);
  return (
    <FieldFrame
      id={p.id}
      label={p.label}
      subtitle={p.subtitle}
      tooltip={p.tooltip}
      example={p.example}
      validation={p.validation}
      locked={p.locked}
      favorite={p.favorite}
      onFavoriteChange={p.onFavoriteChange}
      onLockChange={p.onLockChange}
      onCopy={copy}
      onPaste={paste}
      onReset={p.defaultValue !== undefined ? reset : undefined}
      onDuplicate={p.onDuplicate}
      recentHighlight={isRecent}
      className={p.className}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            disabled={p.disabled || p.locked}
            className="flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-left text-xs hover:bg-accent"
          >
            {labels.length === 0 ? (
              <span className="text-muted-foreground">{p.placeholder ?? "Select…"}</span>
            ) : (
              labels.map((l) => (
                <span key={l} className="rounded-full border border-border bg-card px-1.5 py-0.5 text-[10.5px]">
                  {l}
                </span>
              ))
            )}
            <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-1">
          <ul className="max-h-64 overflow-y-auto">
            {p.options.map((o) => (
              <li key={o.value}>
                <button
                  onClick={() => toggle(o.value)}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
                >
                  <span>{o.label}</span>
                  {p.value.includes(o.value) && <span className="text-[var(--blue)]">✓</span>}
                </button>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </FieldFrame>
  );
}

/* ---------- Reorderable list ---------- */

type ReorderProps = BaseProps<string[]> & { placeholder?: string };

export function ReorderableList(p: ReorderProps) {
  if (p.showWhen && !p.showWhen()) return null;
  const { commit, isRecent } = useFieldOps(p.id, p.label, p.value, p.defaultValue, p.onChange);
  const [draft, setDraft] = useState("");
  const dragIdx = useRef<number | null>(null);
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    commit([...p.value, t]);
    setDraft("");
  };
  const remove = (i: number) => commit(p.value.filter((_, idx) => idx !== i));
  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...p.value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    commit(next);
  };
  return (
    <FieldFrame
      id={p.id}
      label={p.label}
      subtitle={p.subtitle}
      tooltip={p.tooltip}
      example={p.example}
      validation={p.validation}
      locked={p.locked}
      favorite={p.favorite}
      onFavoriteChange={p.onFavoriteChange}
      onLockChange={p.onLockChange}
      onDuplicate={p.onDuplicate}
      recentHighlight={isRecent}
      className={p.className}
    >
      <ul className="flex flex-col gap-1">
        {p.value.map((v, i) => (
          <li
            key={`${v}-${i}`}
            draggable
            onDragStart={() => (dragIdx.current = i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIdx.current !== null) move(dragIdx.current, i);
              dragIdx.current = null;
            }}
            className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-xs"
          >
            <GripVertical className="h-3 w-3 shrink-0 cursor-grab text-muted-foreground" />
            <span className="flex-1 truncate">{v}</span>
            <button
              onClick={() => remove(i)}
              aria-label={`Remove ${v}`}
              className="text-muted-foreground hover:text-[var(--red)]"
            >
              <X className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-1.5 flex gap-1.5">
        <Input
          value={draft}
          disabled={p.disabled || p.locked}
          placeholder={p.placeholder ?? "Add item…"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="h-8 bg-background text-xs"
        />
        <button
          onClick={add}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-card px-2 text-[11px] font-medium hover:bg-accent"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
    </FieldFrame>
  );
}

/* ---------- Reference picker ---------- */

type ReferenceProps = BaseProps<string> & { options: PropertyOption[]; placeholder?: string };

export function ReferenceField(p: ReferenceProps) {
  if (p.showWhen && !p.showWhen()) return null;
  const { commit, copy, paste, reset, isRecent } = useFieldOps(p.id, p.label, p.value, p.defaultValue, p.onChange);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => p.options.filter((o) => (o.label + " " + (o.description ?? "")).toLowerCase().includes(q.toLowerCase())),
    [p.options, q],
  );
  const current = p.options.find((o) => o.value === p.value);
  return (
    <FieldFrame
      id={p.id}
      label={p.label}
      subtitle={p.subtitle}
      tooltip={p.tooltip}
      example={p.example}
      validation={p.validation}
      locked={p.locked}
      favorite={p.favorite}
      onFavoriteChange={p.onFavoriteChange}
      onLockChange={p.onLockChange}
      onCopy={copy}
      onPaste={paste}
      onReset={p.defaultValue !== undefined ? reset : undefined}
      onDuplicate={p.onDuplicate}
      recentHighlight={isRecent}
      className={p.className}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            disabled={p.disabled || p.locked}
            className="flex h-9 w-full items-center gap-2 rounded-md border border-border bg-background px-3 text-left text-xs hover:bg-accent"
          >
            <Link2 className="h-3.5 w-3.5 text-[var(--teal)]" />
            <span className={cn("flex-1 truncate", !current && "text-muted-foreground")}>
              {current?.label ?? p.placeholder ?? "Pick a reference…"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search references…"
            className="mb-2 h-8 text-xs"
          />
          <ul className="max-h-56 overflow-y-auto">
            {filtered.map((o) => (
              <li key={o.value}>
                <button
                  onClick={() => {
                    commit(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 rounded px-2 py-1.5 text-left hover:bg-accent",
                    p.value === o.value && "bg-accent",
                  )}
                >
                  <span className="text-xs font-medium">{o.label}</span>
                  {o.description && <span className="text-[11px] text-muted-foreground">{o.description}</span>}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-2 py-3 text-center text-xs text-muted-foreground">No matches.</li>
            )}
          </ul>
        </PopoverContent>
      </Popover>
    </FieldFrame>
  );
}

/* ---------- Asset / icon picker (thin wrapper — full pipeline lives in ImageField) ---------- */

type AssetProps = BaseProps<string> & { placeholder?: string; onOpenAssetPicker?: () => void };

export function AssetField(p: AssetProps) {
  if (p.showWhen && !p.showWhen()) return null;
  const { commit, copy, paste, reset, isRecent } = useFieldOps(p.id, p.label, p.value, p.defaultValue, p.onChange);
  return (
    <FieldFrame
      id={p.id}
      label={p.label}
      subtitle={p.subtitle}
      tooltip={p.tooltip}
      example={p.example}
      validation={p.validation}
      locked={p.locked}
      favorite={p.favorite}
      onFavoriteChange={p.onFavoriteChange}
      onLockChange={p.onLockChange}
      onCopy={copy}
      onPaste={paste}
      onReset={p.defaultValue !== undefined ? reset : undefined}
      onDuplicate={p.onDuplicate}
      recentHighlight={isRecent}
      className={p.className}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-muted">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <Input
          value={p.value}
          disabled={p.disabled || p.locked}
          placeholder={p.placeholder ?? "path/to/asset.png"}
          onChange={(e) => commit(e.target.value)}
          className="h-9 flex-1 bg-background font-mono text-xs"
        />
        <button
          onClick={p.onOpenAssetPicker}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] font-medium hover:bg-accent"
        >
          Browse
        </button>
        <button
          onClick={() => toast("AI icon generator", { description: "Opens image generation dialog" })}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-[var(--violet)]/30 bg-[var(--violet)]/10 px-2.5 text-[11px] font-medium text-[var(--violet)] hover:bg-[var(--violet)]/20"
        >
          <Sparkles className="h-3 w-3" /> AI
        </button>
      </div>
    </FieldFrame>
  );
}

/* ---------- Property section wrapper (with local search) ---------- */

export function PropertySection({
  title,
  description,
  actions,
  children,
  searchable,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  searchable?: boolean;
}) {
  const [q, setQ] = useState("");
  return (
    <section className="rounded-xl border border-border bg-card/50 p-4 shadow-sm">
      <header className="mb-3 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="mt-0.5 text-[11.5px] text-muted-foreground">{description}</p>}
        </div>
        {searchable && (
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter fields…"
            className="h-8 w-40 text-xs"
          />
        )}
        {actions}
      </header>
      <div className="grid gap-3">{q ? filterChildren(children, q) : children}</div>
    </section>
  );
}

function filterChildren(children: React.ReactNode, q: string) {
  const needle = q.toLowerCase();
  const arr = Array.isArray(children) ? children : [children];
  return arr.filter((child) => {
    if (!child || typeof child !== "object") return true;
    const props = (child as { props?: { label?: string; subtitle?: string } }).props;
    if (!props) return true;
    const hay = `${props.label ?? ""} ${props.subtitle ?? ""}`.toLowerCase();
    return hay.includes(needle);
  });
}

// re-export minimal ops so builders can also record custom history
export { useFieldOps };
