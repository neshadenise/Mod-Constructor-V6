/**
 * Shared primitives for the Trait Builder screens.
 * Small, dense, IDE-flavoured controls that all speak the design tokens.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
  id,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn("rounded-xl border border-border bg-card/60 p-4 shadow-sm", className)}
    >
      {(title || actions) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-[13px] font-semibold tracking-tight">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1", className)}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
      {error ? (
        <span className="block text-[10.5px] text-[var(--destructive,#ef4444)]">{error}</span>
      ) : hint ? (
        <span className="block text-[10.5px] text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-[12px] outline-none transition-colors focus:border-primary/60";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={cn(inputCls, "resize-y", props.className)} />;
}

export function NumberInput({
  value,
  onChange,
  step = 1,
  min,
  max,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      step={step}
      {...(min !== undefined ? { min } : {})}
      {...(max !== undefined ? { max } : {})}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className={cn(inputCls, className)}
    />
  );
}

export function SelectInput<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn(inputCls, "cursor-pointer", className)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Btn({
  children,
  onClick,
  icon: Icon,
  variant = "ghost",
  disabled,
  title,
  className,
}: {
  children?: ReactNode;
  onClick?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "ghost" | "primary" | "danger";
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "ghost" && "border border-border bg-background hover:bg-muted",
        variant === "danger" &&
          "border border-[var(--destructive,#ef4444)]/40 text-[var(--destructive,#ef4444)] hover:bg-[var(--destructive,#ef4444)]/10",
        className,
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

export function Chip({
  active,
  onClick,
  children,
  tone = "default",
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  tone?: "default" | "danger" | "warn" | "ok";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
        active
          ? "border-primary/50 bg-primary/15 text-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted",
        tone === "danger" && active && "border-[var(--destructive,#ef4444)]/50 bg-[var(--destructive,#ef4444)]/15",
      )}
    >
      {children}
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-2.5 rounded-md border border-border bg-background px-2.5 py-2 text-left transition-colors hover:bg-muted/50"
    >
      <span
        className={cn(
          "mt-0.5 flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors",
          checked ? "bg-primary" : "bg-muted-foreground/30",
        )}
      >
        <span
          className={cn(
            "h-3 w-3 rounded-full bg-background transition-transform",
            checked && "translate-x-3",
          )}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[11.5px] font-medium">{label}</span>
        {hint && <span className="block text-[10.5px] text-muted-foreground">{hint}</span>}
      </span>
    </button>
  );
}

export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "ok" | "warn" | "error" | "accent";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "ok" && "bg-emerald-500/15 text-emerald-500",
        tone === "warn" && "bg-amber-500/15 text-amber-500",
        tone === "error" && "bg-red-500/15 text-red-500",
        tone === "accent" && "bg-primary/15 text-primary",
      )}
    >
      {children}
    </span>
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-[11.5px] text-muted-foreground">
      {children}
    </div>
  );
}
