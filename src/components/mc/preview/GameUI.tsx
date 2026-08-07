import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import defaultSim from "@/assets/default-sim.png.asset.json";
import {
  Sparkles,
  Star,
  Clock,
  Calendar,
  TrendingUp,
  Check,
  X,
  Gift,
  Zap,
  Heart,
  AlertTriangle,
  Info,
  CircleCheck,
  Trophy,
  Baby,
  Coins,
  Briefcase,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";

/** ---------- Icon frame: rounded, gradient bg, letter fallback ---------- */
export function IconFrame({
  label,
  color = "blue",
  size = 44,
  emoji,
  glass = false,
}: {
  label?: string;
  color?: string;
  size?: number;
  emoji?: string;
  glass?: boolean;
}) {
  const initials = label ? label.slice(0, 2).toUpperCase() : "?";
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-md",
        glass && "backdrop-blur",
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, var(--${color}), color-mix(in oklab, var(--${color}) 60%, black))`,
        fontSize: size * 0.36,
      }}
      aria-hidden
    >
      {emoji ?? initials}
      <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20" />
    </div>
  );
}

/** ---------- Sim portrait (default dialogue sim) ---------- */
export function SimPortrait({
  name = "Ada Nova",
  age = "Young Adult",
  size = 56,
  src = defaultSim.url,
  showMeta = true,
}: {
  name?: string;
  age?: string;
  size?: number;
  src?: string;
  showMeta?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="relative shrink-0 overflow-hidden rounded-full ring-2 ring-white/60"
        style={{
          width: size,
          height: size,
          background: "linear-gradient(160deg, oklch(0.88 0.05 200), oklch(0.78 0.06 190))",
        }}
      >
        <img
          src={src}
          alt={`${name} portrait`}
          loading="lazy"
          className="h-full w-full object-cover"
          style={{ objectPosition: "52% 22%", transform: "scale(1.25)" }}
        />
      </div>
      {showMeta && (
        <div>
          <div className="text-[13px] font-bold leading-tight">{name}</div>
          <div className="text-[10.5px] opacity-70">{age}</div>
        </div>
      )}
    </div>
  );
}

/** ---------- Dialogue bubble with sim portrait ---------- */
export function SimDialogue({
  name = "Ada Nova",
  text,
  choices,
  portrait = defaultSim.url,
}: {
  name?: string;
  text: string;
  choices?: string[];
  portrait?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <SimPortrait name={name} size={48} src={portrait} showMeta={false} />
      <div className="relative min-w-0 flex-1 rounded-xl border border-black/5 bg-white px-3 py-2 shadow-[0_10px_28px_-18px_rgba(15,23,42,0.5)] [[data-preview-theme='dark']_&]:border-white/10 [[data-preview-theme='dark']_&]:bg-white/[0.08]">
        <span className="absolute -left-1.5 top-4 h-3 w-3 rotate-45 border-b border-l border-black/5 bg-white [[data-preview-theme='dark']_&]:border-white/10 [[data-preview-theme='dark']_&]:bg-white/[0.08]" />
        <div className="text-[11px] font-bold uppercase tracking-wider opacity-60">{name}</div>
        <p className="mt-0.5 text-[12.5px] leading-relaxed">{text}</p>
        {choices && choices.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {choices.map((c) => (
              <button
                key={c}
                className="rounded-md bg-black/5 px-2 py-1 text-[10.5px] font-semibold transition-colors hover:bg-black/10 [[data-preview-theme='dark']_&]:bg-white/10 [[data-preview-theme='dark']_&]:hover:bg-white/15"
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


/** ---------- Preview card wrapper ---------- */
export function PreviewCard({
  children,
  className,
  glass = false,
}: {
  children: ReactNode;
  className?: string;
  glass?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-black/5 bg-white/85 p-3.5 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.5)]",
        "[[data-preview-theme='dark']_&]:border-white/10 [[data-preview-theme='dark']_&]:bg-white/[0.06] [[data-preview-theme='dark']_&]:text-white",
        glass && "backdrop-blur",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** ---------- Performance meter ---------- */
export function PerformanceMeter({
  value = 0.62,
  label = "Performance",
  tone,
}: {
  value?: number;
  label?: string;
  tone?: "good" | "bad";
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const color = tone === "bad" ? "var(--red,#e05252)" : tone === "good" ? "var(--green)" : "var(--teal)";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-wider opacity-70">
        <span>{label}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/10 [[data-preview-theme='dark']_&]:bg-white/10">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, color-mix(in oklab, ${color} 60%, white))` }}
        />
      </div>
    </div>
  );
}

/** ---------- Requirement list (with met/unmet) ---------- */
export function RequirementList({
  items,
}: {
  items: { label: string; met?: boolean }[];
}) {
  return (
    <ul className="space-y-1">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-2 text-[12px]">
          <span
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded-full text-white",
              it.met ? "bg-[var(--green)]" : "bg-black/15 [[data-preview-theme='dark']_&]:bg-white/15",
            )}
          >
            {it.met ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
          </span>
          <span className={cn(!it.met && "opacity-70")}>{it.label}</span>
        </li>
      ))}
    </ul>
  );
}

/** ---------- Reward list ---------- */
export function RewardList({
  items,
}: {
  items: { label: string; kind?: "trait" | "perk" | "item" | "money" }[];
}) {
  const iconFor: Record<string, ReactNode> = {
    trait: <Sparkles className="h-3 w-3" />,
    perk: <Star className="h-3 w-3" />,
    item: <Gift className="h-3 w-3" />,
    money: <Coins className="h-3 w-3" />,
  };
  return (
    <ul className="grid grid-cols-1 gap-1.5">
      {items.map((it) => (
        <li
          key={it.label}
          className="flex items-center gap-2 rounded-md bg-black/5 px-2 py-1.5 text-[11.5px] [[data-preview-theme='dark']_&]:bg-white/8"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-[var(--violet)] to-[var(--blue)] text-white shadow-sm">
            {iconFor[it.kind ?? "perk"]}
          </span>
          <span className="font-medium">{it.label}</span>
        </li>
      ))}
    </ul>
  );
}

/** ---------- Tooltip preview ---------- */
export function TooltipPreview({
  title,
  body,
  tag,
  color = "blue",
}: {
  title: string;
  body: string;
  tag?: string;
  color?: string;
}) {
  return (
    <div className="relative inline-block max-w-[300px] rounded-lg border border-black/10 bg-[oklch(0.98_0.01_230)] p-2.5 shadow-lg [[data-preview-theme='dark']_&]:border-white/10 [[data-preview-theme='dark']_&]:bg-[oklch(0.28_0.04_260)]">
      <div className="mb-1 flex items-center gap-2">
        {tag && (
          <span
            className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white"
            style={{ backgroundColor: `var(--${color})` }}
          >
            {tag}
          </span>
        )}
        <span className="text-[12px] font-bold">{title}</span>
      </div>
      <p className="text-[11px] leading-relaxed opacity-80">{body}</p>
      <span
        className="absolute -bottom-1.5 left-6 h-3 w-3 rotate-45 border-b border-r border-black/10 bg-[oklch(0.98_0.01_230)] [[data-preview-theme='dark']_&]:border-white/10 [[data-preview-theme='dark']_&]:bg-[oklch(0.28_0.04_260)]"
      />
    </div>
  );
}

/** ---------- Notification popup ---------- */
export type NotificationKind =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "promotion"
  | "reward"
  | "relationship"
  | "buff"
  | "trait"
  | "career"
  | "aging";

const NOTIF_META: Record<
  NotificationKind,
  { color: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string }
> = {
  success: { color: "green", icon: CircleCheck, label: "Success" },
  warning: { color: "orange", icon: AlertTriangle, label: "Warning" },
  error: { color: "red", icon: X, label: "Error" },
  info: { color: "blue", icon: Info, label: "Info" },
  promotion: { color: "violet", icon: TrendingUp, label: "Promotion" },
  reward: { color: "teal", icon: Gift, label: "Reward" },
  relationship: { color: "pink", icon: Heart, label: "Relationship" },
  buff: { color: "blue", icon: Zap, label: "Buff" },
  trait: { color: "violet", icon: Sparkles, label: "Trait" },
  career: { color: "blue", icon: Briefcase, label: "Career" },
  aging: { color: "orange", icon: Baby, label: "Aging" },
};

export function NotificationPopup({
  kind,
  title,
  body,
  action,
  compact = false,
}: {
  kind: NotificationKind;
  title: string;
  body: string;
  action?: string;
  compact?: boolean;
}) {
  const meta = NOTIF_META[kind];
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border border-black/5 bg-white p-2.5 shadow-[0_10px_28px_-18px_rgba(15,23,42,0.5)]",
        "[[data-preview-theme='dark']_&]:border-white/10 [[data-preview-theme='dark']_&]:bg-white/[0.08]",
      )}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
        style={{
          background: `linear-gradient(135deg, var(--${meta.color}), color-mix(in oklab, var(--${meta.color}) 55%, black))`,
        }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white"
            style={{ backgroundColor: `var(--${meta.color})` }}
          >
            {meta.label}
          </span>
          <span className="truncate text-[12.5px] font-bold">{title}</span>
        </div>
        {!compact && <p className="mt-0.5 text-[11.5px] leading-relaxed opacity-80">{body}</p>}
        {action && (
          <button
            className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-black/5 px-2 py-1 text-[10.5px] font-semibold transition-colors hover:bg-black/10 [[data-preview-theme='dark']_&]:bg-white/10 [[data-preview-theme='dark']_&]:hover:bg-white/15"
          >
            {action}
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

/** ---------- Career panel ---------- */
export function CareerCard({
  name,
  description,
  level,
  levelTitle,
  pay,
  hours,
  days,
  performance,
  color = "blue",
  emoji = "🚀",
  requirements,
  rewards,
  cover,
}: {
  name: string;
  description: string;
  level: number;
  levelTitle: string;
  pay: string;
  hours: string;
  days: string;
  performance: number;
  color?: string;
  emoji?: string;
  requirements: { label: string; met?: boolean }[];
  rewards: { label: string; kind?: "trait" | "perk" | "item" | "money" }[];
  /** 2:1 promotional cover art for the career / active branch. */
  cover?: string;
}) {
  return (
    <PreviewCard>
      {cover && (
        <div className="mb-3 overflow-hidden rounded-lg" style={{ aspectRatio: "2 / 1" }}>
          <img src={cover} alt={`${name} cover`} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="flex items-start gap-3">

        <IconFrame emoji={emoji} color={color} size={54} label={name} />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold leading-tight">{name}</div>
          <div className="text-[10.5px] font-semibold uppercase tracking-wider opacity-60">
            Level {level} · {levelTitle}
          </div>
          <p className="mt-1 line-clamp-2 text-[11.5px] leading-snug opacity-80">{description}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat icon={Coins} label="Hourly" value={`§${pay}`} />
        <Stat icon={Clock} label="Hours" value={hours} />
        <Stat icon={Calendar} label="Days" value={days} />
      </div>

      <div className="mt-3">
        <PerformanceMeter value={performance} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <SectionLabel>Requirements</SectionLabel>
          <RequirementList items={requirements} />
        </div>
        <div>
          <SectionLabel>Rewards</SectionLabel>
          <RewardList items={rewards} />
        </div>
      </div>
    </PreviewCard>
  );
}

/** ---------- Promotion window ---------- */
export function PromotionWindow({
  name,
  color = "blue",
  emoji = "🚀",
  fromLevel,
  toLevel,
  fromTitle,
  toTitle,
  newPay,
  description,
  unlockedRewards,
  unlockedInteractions,
  demotion = false,
}: {
  name: string;
  color?: string;
  emoji?: string;
  fromLevel: number;
  toLevel: number;
  fromTitle: string;
  toTitle: string;
  newPay: string;
  description: string;
  unlockedRewards: { label: string; kind?: "trait" | "perk" | "item" | "money" }[];
  unlockedInteractions: string[];
  demotion?: boolean;
}) {
  return (
    <PreviewCard className="relative overflow-hidden p-0">
      <div
        className="relative flex items-center gap-3 p-4 text-white"
        style={{
          background: demotion
            ? `linear-gradient(135deg, var(--orange), color-mix(in oklab, var(--orange) 55%, black))`
            : `linear-gradient(135deg, var(--${color}), var(--violet))`,
        }}
      >
        <IconFrame emoji={emoji} color="teal" size={52} />
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-85">
            {demotion ? "You've been demoted" : "You've been promoted!"}
          </div>
          <div className="text-[16px] font-black leading-tight">{name}</div>
          <div className="text-[11px] opacity-85">
            Level {fromLevel} {fromTitle} → Level {toLevel} {toTitle}
          </div>
        </div>
        <Trophy className="ml-auto h-8 w-8 opacity-60" />
      </div>
      <div className="p-3.5">
        <p className="text-[12px] leading-snug opacity-85">{description}</p>
        <div className="mt-3 flex items-center justify-between rounded-lg bg-black/[0.04] px-3 py-2 [[data-preview-theme='dark']_&]:bg-white/8">
          <span className="text-[11px] font-semibold uppercase tracking-wider opacity-70">
            New hourly pay
          </span>
          <span className="text-[18px] font-black" style={{ color: `var(--${demotion ? "orange" : "green"})` }}>
            §{newPay}
          </span>
        </div>
        {unlockedRewards.length > 0 && (
          <div className="mt-3">
            <SectionLabel>Unlocked Rewards</SectionLabel>
            <RewardList items={unlockedRewards} />
          </div>
        )}
        {unlockedInteractions.length > 0 && (
          <div className="mt-3">
            <SectionLabel>New Interactions</SectionLabel>
            <ul className="flex flex-wrap gap-1.5">
              {unlockedInteractions.map((i) => (
                <li
                  key={i}
                  className="rounded-full bg-black/5 px-2 py-0.5 text-[10.5px] font-semibold [[data-preview-theme='dark']_&]:bg-white/10"
                >
                  {i}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </PreviewCard>
  );
}

/** ---------- Branch window ---------- */
export function BranchWindow({
  branches,
  active,
  onSelect,
}: {
  branches: {
    key: string;
    name: string;
    description: string;
    color?: string;
    emoji?: string;
    futureLevels: { level: number; title: string; pay: string }[];
    requirements: { label: string; met?: boolean }[];
  }[];
  active: string;
  onSelect: (key: string) => void;
}) {
  const b = branches.find((x) => x.key === active) ?? branches[0];
  return (
    <PreviewCard>
      <div className="mb-3 text-center">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] opacity-60">
          Choose Your Path
        </div>
        <div className="text-[14px] font-bold">Career Branch</div>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {branches.map((br) => (
          <button
            key={br.key}
            onClick={() => onSelect(br.key)}
            className={cn(
              "flex items-center gap-2 rounded-lg border p-2 text-left transition-all",
              br.key === active
                ? "border-[var(--blue)] bg-[var(--blue)]/8 shadow-sm"
                : "border-black/10 hover:bg-black/[0.03] [[data-preview-theme='dark']_&]:border-white/10 [[data-preview-theme='dark']_&]:hover:bg-white/5",
            )}
          >
            <IconFrame emoji={br.emoji} color={br.color ?? "blue"} size={36} label={br.name} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-bold">{br.name}</span>
              <span className="block truncate text-[10.5px] opacity-70">{br.description}</span>
            </span>
          </button>
        ))}
      </div>
      <div>
        <SectionLabel>Future Salary Progression</SectionLabel>
        <ul className="space-y-1">
          {b.futureLevels.map((f) => (
            <li
              key={f.level}
              className="flex items-center gap-2 rounded-md bg-black/[0.04] px-2 py-1 text-[11.5px] [[data-preview-theme='dark']_&]:bg-white/8"
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: `var(--${b.color ?? "blue"})` }}
              >
                {f.level}
              </span>
              <span className="flex-1 font-medium">{f.title}</span>
              <span className="font-mono font-bold" style={{ color: `var(--green)` }}>
                §{f.pay}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-3">
        <SectionLabel>Requirements</SectionLabel>
        <RequirementList items={b.requirements} />
      </div>
    </PreviewCard>
  );
}

/** ---------- Chance card ---------- */
export function ChanceCard({
  title,
  story,
  choices,
  color = "violet",
}: {
  title: string;
  story: string;
  choices: { label: string; icon?: string; outcome: string; tone?: "good" | "bad" | "neutral" }[];
  color?: string;
}) {
  return (
    <PreviewCard className="overflow-hidden p-0">
      <div
        className="flex items-center gap-2 px-3 py-2 text-white"
        style={{ background: `linear-gradient(135deg, var(--${color}), var(--blue))` }}
      >
        <AlertTriangle className="h-4 w-4" />
        <span className="text-[11px] font-bold uppercase tracking-wider">Chance Card</span>
      </div>
      <div className="p-3.5">
        <div className="text-[13px] font-bold">{title}</div>
        <p className="mt-1 text-[11.5px] leading-relaxed opacity-85">{story}</p>
        <div className="mt-3 space-y-1.5">
          {choices.map((c) => (
            <button
              key={c.label}
              className="group flex w-full items-start gap-2 rounded-lg border border-black/10 p-2 text-left transition-colors hover:border-[var(--blue)] hover:bg-[var(--blue)]/8 [[data-preview-theme='dark']_&]:border-white/10"
            >
              <span className="text-lg leading-none">{c.icon ?? "→"}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-bold">{c.label}</span>
                <span
                  className="block text-[10.5px] opacity-70 group-hover:opacity-90"
                  style={{
                    color:
                      c.tone === "good"
                        ? "var(--green)"
                        : c.tone === "bad"
                        ? "var(--orange)"
                        : undefined,
                  }}
                >
                  Possible outcome: {c.outcome}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </PreviewCard>
  );
}

/** ---------- Trait card (CAS style) ---------- */
export function TraitCard({
  name,
  description,
  category,
  color = "violet",
  emoji = "✨",
  moodlets,
  effects,
  autonomy,
}: {
  name: string;
  description: string;
  category: string;
  color?: string;
  emoji?: string;
  moodlets: { label: string; mood: string; tone?: string }[];
  effects: string[];
  autonomy: string;
}) {
  return (
    <PreviewCard>
      <div className="flex items-center gap-3">
        <IconFrame emoji={emoji} color={color} size={54} label={name} />
        <div>
          <div className="text-[10.5px] font-semibold uppercase tracking-wider opacity-60">
            {category} Trait
          </div>
          <div className="text-[15px] font-bold leading-tight">{name}</div>
        </div>
      </div>
      <p className="mt-2 text-[12px] leading-snug opacity-85">{description}</p>

      <div className="mt-3">
        <SectionLabel>Example Moodlets</SectionLabel>
        <ul className="space-y-1">
          {moodlets.map((m) => (
            <li
              key={m.label}
              className="flex items-center justify-between rounded-md bg-black/[0.04] px-2 py-1 text-[11.5px] [[data-preview-theme='dark']_&]:bg-white/8"
            >
              <span className="font-semibold">{m.label}</span>
              <span className="text-[10.5px] font-medium" style={{ color: `var(--${m.tone ?? "blue"})` }}>
                {m.mood}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3">
        <SectionLabel>Gameplay Effects</SectionLabel>
        <ul className="space-y-0.5 text-[11.5px] opacity-85">
          {effects.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      </div>

      <div className="mt-3 rounded-md bg-black/[0.04] p-2 text-[11px] opacity-85 [[data-preview-theme='dark']_&]:bg-white/8">
        <span className="font-bold">Autonomy:</span> {autonomy}
      </div>
    </PreviewCard>
  );
}

/** ---------- Buff card ---------- */
export function BuffCard({
  name,
  description,
  mood,
  moodColor = "blue",
  duration,
  strength = 2,
  stack = 1,
  icon = "😌",
}: {
  name: string;
  description: string;
  mood: string;
  moodColor?: string;
  duration: string;
  strength?: number;
  stack?: number;
  icon?: string;
}) {
  return (
    <PreviewCard>
      <div className="flex items-start gap-3">
        <div className="relative">
          <IconFrame emoji={icon} color={moodColor} size={48} label={name} />
          {stack > 1 && (
            <span
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-white ring-2 ring-white [[data-preview-theme='dark']_&]:ring-[oklch(0.22_0.04_260)]"
              style={{ backgroundColor: `var(--${moodColor})` }}
            >
              ×{stack}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] font-bold">{name}</span>
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white"
              style={{ backgroundColor: `var(--${moodColor})` }}
            >
              {mood} {"+".repeat(Math.max(1, strength))}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[10.5px] opacity-60">
            <Clock className="h-3 w-3" /> {duration}
          </div>
          <p className="mt-1.5 text-[11.5px] leading-snug opacity-85">{description}</p>
        </div>
      </div>
    </PreviewCard>
  );
}

/** ---------- Aspiration card ---------- */
export function AspirationCard({
  name,
  category,
  emoji = "🎯",
  color = "teal",
  milestones,
  rewardTrait,
}: {
  name: string;
  category: string;
  emoji?: string;
  color?: string;
  milestones: {
    tier: string;
    title: string;
    objectives: { label: string; done?: boolean }[];
    progress?: number;
  }[];
  rewardTrait: string;
}) {
  return (
    <PreviewCard>
      <div className="flex items-center gap-3">
        <IconFrame emoji={emoji} color={color} size={54} label={name} />
        <div>
          <div className="text-[10.5px] font-semibold uppercase tracking-wider opacity-60">
            {category} Aspiration
          </div>
          <div className="text-[15px] font-bold leading-tight">{name}</div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {milestones.map((m) => (
          <div key={m.tier} className="rounded-md border border-black/10 bg-black/[0.02] p-2 [[data-preview-theme='dark']_&]:border-white/10 [[data-preview-theme='dark']_&]:bg-white/5">
            <div className="mb-1 flex items-center gap-2">
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: `var(--${color})` }}
              >
                {m.tier}
              </span>
              <span className="flex-1 text-[12px] font-bold">{m.title}</span>
              {typeof m.progress === "number" && (
                <span className="text-[10px] font-mono opacity-70">{Math.round(m.progress * 100)}%</span>
              )}
            </div>
            <ul className="space-y-0.5">
              {m.objectives.map((o) => (
                <li key={o.label} className="flex items-center gap-1.5 text-[11px]">
                  <span
                    className={cn(
                      "flex h-3.5 w-3.5 items-center justify-center rounded-sm text-white",
                      o.done ? "bg-[var(--green)]" : "bg-black/15 [[data-preview-theme='dark']_&]:bg-white/15",
                    )}
                  >
                    {o.done && <Check className="h-2.5 w-2.5" />}
                  </span>
                  <span className={cn(!o.done && "opacity-70")}>{o.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div
        className="mt-3 flex items-center gap-2 rounded-lg p-2 text-white"
        style={{ background: `linear-gradient(135deg, var(--${color}), var(--violet))` }}
      >
        <Trophy className="h-4 w-4" />
        <div>
          <div className="text-[9.5px] font-bold uppercase tracking-wider opacity-85">
            Completion Reward Trait
          </div>
          <div className="text-[12px] font-bold">{rewardTrait}</div>
        </div>
      </div>
    </PreviewCard>
  );
}

/** ---------- Pie menu ---------- */
export function PieMenu({
  interactions,
  target = "Ada Nova",
}: {
  interactions: { label: string; icon?: string; color?: string; weight?: number }[];
  target?: string;
}) {
  return (
    <PreviewCard>
      <div className="text-[10.5px] font-bold uppercase tracking-wider opacity-60">
        Interact with · <span style={{ color: "var(--blue)" }}>{target}</span>
      </div>
      <ul className="mt-2 grid grid-cols-1 gap-1">
        {interactions.map((i) => (
          <li
            key={i.label}
            className="group flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 transition-colors hover:border-[var(--blue)] hover:bg-[var(--blue)]/6"
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-white"
              style={{
                background: `linear-gradient(135deg, var(--${i.color ?? "blue"}), color-mix(in oklab, var(--${i.color ?? "blue"}) 55%, black))`,
              }}
            >
              {i.icon ?? "•"}
            </span>
            <span className="flex-1 text-[12px] font-semibold">{i.label}</span>
            {typeof i.weight === "number" && (
              <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[9.5px] font-mono [[data-preview-theme='dark']_&]:bg-white/10">
                w {i.weight}
              </span>
            )}
          </li>
        ))}
      </ul>
    </PreviewCard>
  );
}

/** ---------- Object catalog card ---------- */
export function ObjectCatalogCard({
  name,
  description,
  price,
  category,
  footprint,
  emoji = "🪑",
  color = "orange",
}: {
  name: string;
  description: string;
  price: string;
  category: string;
  footprint: string;
  emoji?: string;
  color?: string;
}) {
  return (
    <PreviewCard>
      <div
        className="mb-2 flex h-32 items-center justify-center rounded-lg text-5xl"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.94 0.02 230), oklch(0.88 0.04 230))",
        }}
      >
        {emoji}
        <ImageIcon className="absolute h-0 w-0 opacity-0" />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-wider opacity-60">
            {category}
          </div>
          <div className="text-[13.5px] font-bold">{name}</div>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-black text-white"
          style={{ backgroundColor: `var(--${color})` }}
        >
          §{price}
        </span>
      </div>
      <p className="mt-1.5 text-[11.5px] leading-snug opacity-85">{description}</p>
      <div className="mt-2 flex items-center gap-2 text-[10.5px] opacity-70">
        <span className="rounded bg-black/5 px-1.5 py-0.5 [[data-preview-theme='dark']_&]:bg-white/10">
          Footprint {footprint}
        </span>
        <span className="rounded bg-black/5 px-1.5 py-0.5 [[data-preview-theme='dark']_&]:bg-white/10">
          Placeable
        </span>
      </div>
    </PreviewCard>
  );
}

/* ---------- helpers ---------- */
function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-black/[0.04] p-2 [[data-preview-theme='dark']_&]:bg-white/8">
      <div className="flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider opacity-60">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-0.5 text-[12.5px] font-black">{value}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-1 text-[9.5px] font-bold uppercase tracking-[0.14em] opacity-60">
      {children}
    </div>
  );
}
