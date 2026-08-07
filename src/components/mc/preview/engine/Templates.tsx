/**
 * In-Game UI Preview Engine — renderers.
 *
 * One template per Sims 4 UI pattern. Every template is interactive where the
 * real game is interactive: choices can be clicked, outcomes roll against the
 * configured success chance, and results chain into the next node.
 */

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  IconFrame,
  PreviewCard,
  SimPortrait,
  DEFAULT_SIM_PORTRAIT,
  SECOND_SIM_PORTRAIT,
} from "../GameUI";
import {
  STYLE_META,
  type PreviewChoice,
  type PreviewDoc,
  type PreviewNode,
  type PreviewOutcome,
  type PreviewStyle,
} from "@/lib/preview-engine/types";
import {
  Phone,
  PhoneOff,
  Check,
  X,
  Trophy,
  TrendingDown,
  TrendingUp,
  Dices,
  RotateCcw,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export interface PreviewBranch {
  key: string;
  name: string;
  description: string;
  emoji?: string;
  color?: string;
  cover?: string;
  levels?: { level: number; title: string; pay: string }[];
}

export interface RenderContext {
  branches: PreviewBranch[];
  cover?: string;
}

const styleColor = (s: PreviewStyle | undefined) => STYLE_META[s ?? "neutral"].color;

function StyleTag({ style }: { style?: PreviewStyle }) {
  const meta = STYLE_META[style ?? "neutral"];
  return (
    <span
      className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white"
      style={{ backgroundColor: `var(--${meta.color})` }}
    >
      {meta.label}
    </span>
  );
}

function GameButton({
  children,
  onClick,
  tone = "default",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "default" | "primary" | "ghost";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-lg px-3 py-1.5 text-[11.5px] font-bold transition-all disabled:opacity-50",
        tone === "primary" &&
          "bg-[var(--blue)] text-white shadow-sm hover:brightness-110",
        tone === "default" &&
          "border border-black/10 bg-white/70 hover:bg-black/[0.04] [[data-preview-theme='dark']_&]:border-white/15 [[data-preview-theme='dark']_&]:bg-white/10 [[data-preview-theme='dark']_&]:hover:bg-white/15",
        tone === "ghost" && "opacity-70 hover:opacity-100",
      )}
    >
      {children}
    </button>
  );
}

/** ---------- shared: choice list + resolved outcome ---------- */

function OutcomeCard({ outcome, rolled }: { outcome: PreviewOutcome; rolled?: string }) {
  const color = styleColor(outcome.style);
  return (
    <div
      className="mt-3 rounded-xl border p-3"
      style={{ borderColor: `color-mix(in oklab, var(--${color}) 45%, transparent)`, background: `color-mix(in oklab, var(--${color}) 10%, transparent)` }}
    >
      <div className="flex items-center gap-1.5">
        <StyleTag style={outcome.style} />
        {rolled && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold opacity-70">
            <Dices className="h-3 w-3" />
            {rolled}
          </span>
        )}
      </div>
      {outcome.notification && (
        <p className="mt-1.5 text-[12px] leading-snug">{outcome.notification}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {typeof outcome.performance === "number" && outcome.performance !== 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-[10.5px] font-bold [[data-preview-theme='dark']_&]:bg-white/10">
            {outcome.performance > 0 ? (
              <TrendingUp className="h-3 w-3" style={{ color: "var(--green)" }} />
            ) : (
              <TrendingDown className="h-3 w-3" style={{ color: "var(--red)" }} />
            )}
            Work Performance {outcome.performance > 0 ? "+" : ""}
            {outcome.performance}
          </span>
        )}
        {outcome.moodlet && (
          <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-[10.5px] font-bold [[data-preview-theme='dark']_&]:bg-white/10">
            <Sparkles className="h-3 w-3" style={{ color: "var(--violet)" }} />
            {outcome.moodlet}
          </span>
        )}
        {(outcome.rewards ?? []).filter(Boolean).map((r) => (
          <span
            key={r}
            className="rounded-full bg-black/5 px-2 py-0.5 text-[10.5px] font-semibold [[data-preview-theme='dark']_&]:bg-white/10"
          >
            {r}
          </span>
        ))}
      </div>
    </div>
  );
}

interface ResolvedPick {
  choice: PreviewChoice;
  outcome: PreviewOutcome;
  rolled?: string;
}

function resolveChoice(choice: PreviewChoice): ResolvedPick {
  if (choice.outcomeMode === "fixed") return { choice, outcome: choice.success };
  const roll = Math.floor(Math.random() * 100) + 1;
  const won = roll <= (choice.successChance ?? 50);
  return {
    choice,
    outcome: won ? choice.success : choice.failure,
    rolled: `rolled ${roll} vs ${choice.successChance ?? 50}% → ${won ? "success" : "failure"}`,
  };
}

function ChoiceButtons({
  choices,
  onPick,
}: {
  choices: PreviewChoice[];
  onPick: (c: PreviewChoice) => void;
}) {
  return (
    <div className="mt-3 space-y-1.5">
      {choices.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onPick(c)}
          className="flex w-full items-center gap-2 rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-left text-[12px] font-semibold transition-all hover:border-[var(--blue)] hover:bg-[var(--blue)]/8 [[data-preview-theme='dark']_&]:border-white/15 [[data-preview-theme='dark']_&]:bg-white/[0.07]"
        >
          <span className="min-w-0 flex-1 truncate">{c.label || "Untitled response"}</span>
          {c.outcomeMode === "random" && (
            <span className="shrink-0 rounded-full bg-black/5 px-1.5 py-0.5 text-[9.5px] font-bold opacity-70 [[data-preview-theme='dark']_&]:bg-white/10">
              {c.successChance}%
            </span>
          )}
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      ))}
    </div>
  );
}

/** ---------- templates ---------- */

function TnsTemplate({ doc }: { doc: PreviewDoc }) {
  const color = styleColor(doc.style);
  return (
    <div className="w-full max-w-[380px]">
      <div className="overflow-hidden rounded-xl border border-black/5 bg-white shadow-[0_16px_40px_-24px_rgba(15,23,42,0.6)] [[data-preview-theme='dark']_&]:border-white/10 [[data-preview-theme='dark']_&]:bg-white/[0.08]">
        <div className="h-1" style={{ background: `var(--${color})` }} />
        {doc.image && (
          <img src={doc.image} alt="" className="h-24 w-full object-cover" />
        )}
        <div className="flex items-start gap-2.5 p-3">
          {doc.portrait !== "none" && (
            <SimPortrait
              size={44}
              showMeta={false}
              src={doc.portrait || DEFAULT_SIM_PORTRAIT}
              name={doc.portraitName || "Sim"}
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <StyleTag style={doc.style} />
              {doc.icon && <span className="text-[13px]">{doc.icon}</span>}
            </div>
            <div className="mt-1 text-[13px] font-bold leading-tight">{doc.title || "Untitled"}</div>
            <p className="mt-0.5 text-[11.5px] leading-relaxed opacity-80">{doc.body}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(doc.buttons ?? []).filter(Boolean).map((b) => (
                <GameButton key={b}>{b}</GameButton>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChanceCardTemplate({
  doc,
  node,
  onNext,
}: {
  doc: PreviewDoc;
  node?: PreviewNode;
  onNext?: (nodeId?: string) => void;
}) {
  const title = node?.title ?? doc.title;
  const body = node?.body ?? doc.body;
  const style = node?.style ?? doc.style;
  const choices = node?.choices ?? doc.choices ?? [];
  const [pick, setPick] = useState<ResolvedPick | null>(null);

  return (
    <PreviewCard className="w-full max-w-[460px] p-0">
      <div
        className="flex items-center gap-2 px-4 py-2.5 text-white"
        style={{ background: `linear-gradient(135deg, var(--${styleColor(style)}), color-mix(in oklab, var(--${styleColor(style)}) 55%, black))` }}
      >
        <span className="text-[16px]">🎴</span>
        <div className="min-w-0">
          <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] opacity-85">
            Chance Card
          </div>
          <div className="truncate text-[14px] font-black leading-tight">{title || "Untitled card"}</div>
        </div>
      </div>
      <div className="p-4">
        {doc.image && (
          <img src={doc.image} alt="" className="mb-3 h-28 w-full rounded-lg object-cover" />
        )}
        <div className="flex items-start gap-3">
          <SimPortrait size={52} showMeta={false} src={doc.portrait || DEFAULT_SIM_PORTRAIT} />
          <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed opacity-90">{body}</p>
        </div>

        {(doc.careerName || doc.careerLevel || doc.triggerChance) && (
          <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold opacity-70">
            {doc.careerName && <span className="rounded-full bg-black/5 px-2 py-0.5 [[data-preview-theme='dark']_&]:bg-white/10">{doc.careerName}</span>}
            {doc.careerLevel ? <span className="rounded-full bg-black/5 px-2 py-0.5 [[data-preview-theme='dark']_&]:bg-white/10">Level {doc.careerLevel}</span> : null}
            {doc.triggerChance ? <span className="rounded-full bg-black/5 px-2 py-0.5 [[data-preview-theme='dark']_&]:bg-white/10">{doc.triggerChance}% chance</span> : null}
          </div>
        )}

        {!pick ? (
          <ChoiceButtons choices={choices} onPick={(c) => setPick(resolveChoice(c))} />
        ) : (
          <>
            <div className="mt-3 rounded-lg bg-black/[0.04] px-3 py-1.5 text-[11.5px] font-bold [[data-preview-theme='dark']_&]:bg-white/8">
              ▸ {pick.choice.label}
            </div>
            <OutcomeCard outcome={pick.outcome} rolled={pick.rolled} />
            <div className="mt-3 flex items-center gap-2">
              <GameButton tone="ghost" onClick={() => setPick(null)}>
                <span className="inline-flex items-center gap-1">
                  <RotateCcw className="h-3 w-3" /> Replay
                </span>
              </GameButton>
              {onNext && (
                <GameButton tone="primary" onClick={() => onNext(pick.outcome.nextNodeId)}>
                  {pick.outcome.nextNodeId ? "Continue" : "End sequence"}
                </GameButton>
              )}
            </div>
          </>
        )}
      </div>
    </PreviewCard>
  );
}

function PhoneCallTemplate({
  doc,
  node,
  onNext,
}: {
  doc: PreviewDoc;
  node?: PreviewNode;
  onNext?: (nodeId?: string) => void;
}) {
  const choices = node?.choices ?? doc.choices ?? [];
  const body = node?.body ?? doc.body;
  const title = node?.title ?? doc.title;
  const [pick, setPick] = useState<ResolvedPick | null>(null);
  const caller = doc.callerName || doc.callerRole || "Unknown Caller";

  return (
    <PreviewCard className="w-full max-w-[400px] p-0">
      <div className="flex items-center gap-3 border-b border-black/5 px-4 py-3 [[data-preview-theme='dark']_&]:border-white/10">
        <span className="relative">
          <SimPortrait size={48} showMeta={false} src={doc.portrait || SECOND_SIM_PORTRAIT} />
          <span
            className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full text-white"
            style={{ background: "var(--green)" }}
          >
            <Phone className="h-2.5 w-2.5" />
          </span>
        </span>
        <div className="min-w-0">
          <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] opacity-60">
            Incoming call · {doc.callerRole ?? "Sim"}
          </div>
          <div className="truncate text-[14px] font-black leading-tight">{caller}</div>
          <div className="truncate text-[10.5px] opacity-70">{title}</div>
        </div>
      </div>
      <div className="p-4">
        <div className="relative rounded-xl rounded-tl-sm border border-black/5 bg-black/[0.03] px-3 py-2 text-[12.5px] leading-relaxed [[data-preview-theme='dark']_&]:border-white/10 [[data-preview-theme='dark']_&]:bg-white/[0.07]">
          “{body}”
        </div>
        {!pick ? (
          <ChoiceButtons choices={choices} onPick={(c) => setPick(resolveChoice(c))} />
        ) : (
          <>
            <div className="mt-3 rounded-xl rounded-tr-sm bg-[var(--blue)]/12 px-3 py-2 text-[12px] font-semibold">
              “{pick.choice.label}”
            </div>
            <OutcomeCard outcome={pick.outcome} rolled={pick.rolled} />
            <div className="mt-3 flex items-center gap-2">
              <GameButton tone="ghost" onClick={() => setPick(null)}>
                <span className="inline-flex items-center gap-1">
                  <PhoneOff className="h-3 w-3" /> Replay call
                </span>
              </GameButton>
              {onNext && (
                <GameButton tone="primary" onClick={() => onNext(pick.outcome.nextNodeId)}>
                  {pick.outcome.nextNodeId ? "Continue" : "End sequence"}
                </GameButton>
              )}
            </div>
          </>
        )}
      </div>
    </PreviewCard>
  );
}

function DialogTemplate({
  doc,
  node,
  onNext,
  confirm = false,
}: {
  doc: PreviewDoc;
  node?: PreviewNode;
  onNext?: (nodeId?: string) => void;
  confirm?: boolean;
}) {
  const [clicked, setClicked] = useState<string | null>(null);
  const buttons = confirm
    ? (doc.buttons?.length ? doc.buttons : ["Yes", "No"])
    : (doc.buttons?.length ? doc.buttons : ["OK"]);
  const choices = node?.choices ?? [];
  return (
    <PreviewCard className="w-full max-w-[420px] p-0">
      {doc.image && <img src={doc.image} alt="" className="h-28 w-full object-cover" />}
      <div className="p-4 text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          {doc.icon ? (
            <span className="text-[22px]">{doc.icon}</span>
          ) : (
            <IconFrame emoji={STYLE_META[doc.style].emoji} color={styleColor(doc.style)} size={38} />
          )}
        </div>
        <div className="text-[14px] font-black">{node?.title ?? doc.title}</div>
        <p className="mx-auto mt-1.5 max-w-[320px] text-[12px] leading-relaxed opacity-85">
          {node?.body ?? doc.body}
        </p>
        {doc.portrait && doc.portrait !== "none" && (
          <div className="mt-3 flex justify-center">
            <SimPortrait size={54} showMeta={false} src={doc.portrait} />
          </div>
        )}
        {choices.length > 0 ? (
          <ChoiceButtons
            choices={choices}
            onPick={(c) => {
              const r = resolveChoice(c);
              setClicked(c.label);
              onNext?.(r.outcome.nextNodeId);
            }}
          />
        ) : (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {buttons.filter(Boolean).map((b, i) => (
              <GameButton key={b} tone={i === 0 ? "primary" : "default"} onClick={() => setClicked(b)}>
                {confirm && i === 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <Check className="h-3 w-3" /> {b}
                  </span>
                ) : confirm ? (
                  <span className="inline-flex items-center gap-1">
                    <X className="h-3 w-3" /> {b}
                  </span>
                ) : (
                  b
                )}
              </GameButton>
            ))}
          </div>
        )}
        {clicked && (
          <div className="mt-3 text-[10.5px] font-semibold opacity-60">Player chose “{clicked}”</div>
        )}
      </div>
    </PreviewCard>
  );
}

function PickerTemplate({
  doc,
  variant,
}: {
  doc: PreviewDoc;
  variant: "list" | "sims" | "rewards";
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const multiple = doc.selectionMode === "multiple";
  const max = doc.maxSelections ?? (multiple ? 99 : 1);
  const min = doc.minSelections ?? 0;
  const options = doc.options ?? [];

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (!multiple) return [id];
      if (prev.length >= max) return prev;
      return [...prev, id];
    });
  };

  return (
    <PreviewCard className="w-full max-w-[480px] p-0">
      <div className="border-b border-black/5 px-4 py-3 [[data-preview-theme='dark']_&]:border-white/10">
        <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] opacity-60">
          {doc.pickerType ?? "Custom Entry"} Picker · {multiple ? `Select ${min}–${max}` : "Select one"}
        </div>
        <div className="text-[14px] font-black leading-tight">{doc.title}</div>
        {doc.body && <p className="mt-0.5 text-[11.5px] opacity-75">{doc.body}</p>}
      </div>

      <div className={cn("max-h-[300px] overflow-auto p-3", variant === "sims" && "grid grid-cols-3 gap-2", variant === "rewards" && "grid grid-cols-2 gap-2", variant === "list" && "space-y-1.5")}>
        {options.map((o, i) => {
          const on = selected.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.id)}
              className={cn(
                "rounded-lg border p-2 text-left transition-all",
                on
                  ? "border-[var(--blue)] bg-[var(--blue)]/10 shadow-sm"
                  : "border-black/10 hover:bg-black/[0.03] [[data-preview-theme='dark']_&]:border-white/12 [[data-preview-theme='dark']_&]:hover:bg-white/5",
                variant === "sims" && "flex flex-col items-center gap-1.5 text-center",
                variant !== "sims" && "flex items-center gap-2.5",
              )}
            >
              {variant === "sims" ? (
                <SimPortrait
                  size={52}
                  showMeta={false}
                  src={o.image || (i % 2 === 0 ? DEFAULT_SIM_PORTRAIT : SECOND_SIM_PORTRAIT)}
                />
              ) : o.image ? (
                <img src={o.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
              ) : (
                <IconFrame emoji={o.emoji} label={o.label} color={on ? "blue" : "teal"} size={38} />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-bold">{o.label}</span>
                {o.description && (
                  <span className="block truncate text-[10.5px] opacity-70">{o.description}</span>
                )}
                {o.value && (
                  <span className="mt-0.5 inline-block rounded-full bg-black/5 px-1.5 text-[10px] font-bold [[data-preview-theme='dark']_&]:bg-white/10">
                    {o.value}
                  </span>
                )}
              </span>
              {on && variant !== "sims" && <Check className="h-4 w-4 shrink-0" style={{ color: "var(--blue)" }} />}
            </button>
          );
        })}
        {options.length === 0 && (
          <div className="p-4 text-center text-[11.5px] opacity-60">No entries yet.</div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-black/5 px-4 py-2.5 [[data-preview-theme='dark']_&]:border-white/10">
        <span className="text-[10.5px] font-semibold opacity-60">
          {selected.length} selected
        </span>
        <div className="flex gap-2">
          <GameButton onClick={() => setSelected([])}>{doc.cancelLabel || "Cancel"}</GameButton>
          <GameButton tone="primary" disabled={selected.length < min}>
            {doc.confirmLabel || "Confirm"}
          </GameButton>
        </div>
      </div>
    </PreviewCard>
  );
}

function BranchSelectTemplate({ doc, ctx }: { doc: PreviewDoc; ctx: RenderContext }) {
  const pool = ctx.branches.length
    ? ctx.branches
    : [
        { key: "a", name: "Branch A", description: "Add branches in the Career Builder.", emoji: "🅰️" },
        { key: "b", name: "Branch B", description: "Add branches in the Career Builder.", emoji: "🅱️" },
      ];
  const shown = doc.branchIds?.length ? pool.filter((b) => doc.branchIds!.includes(b.key)) : pool;
  const list = shown.length ? shown : pool;
  const [active, setActive] = useState(list[0]?.key);
  const current = list.find((b) => b.key === active) ?? list[0];

  return (
    <PreviewCard className="w-full max-w-[560px] p-0">
      <div className="border-b border-black/5 px-4 py-3 text-center [[data-preview-theme='dark']_&]:border-white/10">
        <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] opacity-60">
          {doc.careerName || "Career"} · Level {doc.careerLevel ?? 6}
        </div>
        <div className="text-[15px] font-black">{doc.title || "Choose Your Path"}</div>
        {doc.body && <p className="mt-0.5 text-[11.5px] opacity-75">{doc.body}</p>}
      </div>

      <div className="grid gap-2.5 p-3" style={{ gridTemplateColumns: `repeat(${Math.min(list.length, 3)}, minmax(0,1fr))` }}>
        {list.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={() => setActive(b.key)}
            className={cn(
              "overflow-hidden rounded-xl border text-left transition-all",
              b.key === active
                ? "border-[var(--blue)] shadow-[0_10px_30px_-18px_var(--blue)]"
                : "border-black/10 opacity-80 hover:opacity-100 [[data-preview-theme='dark']_&]:border-white/12",
            )}
          >
            <div className="relative bg-black/5" style={{ aspectRatio: "2 / 1" }}>
              {b.cover || ctx.cover ? (
                <img src={b.cover || ctx.cover} alt={`${b.name} cover`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <IconFrame emoji={b.emoji} label={b.name} color={b.color ?? "blue"} size={40} />
                </div>
              )}
              <span className="absolute bottom-1 left-1">
                <IconFrame emoji={b.emoji} label={b.name} color={b.color ?? "blue"} size={26} glass />
              </span>
            </div>
            <div className="p-2">
              <div className="truncate text-[12.5px] font-black">{b.name}</div>
              <p className="line-clamp-2 text-[10.5px] leading-snug opacity-75">{b.description}</p>
            </div>
          </button>
        ))}
      </div>

      {current?.levels?.length ? (
        <div className="px-4 pb-2">
          <div className="mb-1 text-[9.5px] font-bold uppercase tracking-[0.18em] opacity-60">
            {current.name} · future path
          </div>
          <ul className="space-y-1">
            {current.levels.slice(0, 5).map((l) => (
              <li
                key={l.level}
                className="flex items-center gap-2 rounded-md bg-black/[0.04] px-2 py-1 text-[11px] [[data-preview-theme='dark']_&]:bg-white/8"
              >
                <span className="w-5 text-center font-black opacity-60">{l.level}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{l.title}</span>
                <span className="font-bold" style={{ color: "var(--green)" }}>§{l.pay}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex justify-end border-t border-black/5 px-4 py-2.5 [[data-preview-theme='dark']_&]:border-white/10">
        <GameButton tone="primary">{doc.confirmLabel || "Choose branch"}</GameButton>
      </div>
    </PreviewCard>
  );
}

function PromotionTemplate({ doc, ctx, demotion }: { doc: PreviewDoc; ctx: RenderContext; demotion?: boolean }) {
  const cover = doc.image || ctx.cover;
  const color = demotion ? "orange" : styleColor(doc.style);
  return (
    <PreviewCard className="w-full max-w-[440px] overflow-hidden p-0">
      {cover && <img src={cover} alt="" className="h-32 w-full object-cover" />}
      <div
        className="flex items-center gap-3 p-4 text-white"
        style={{ background: `linear-gradient(135deg, var(--${color}), color-mix(in oklab, var(--${color}) 50%, black))` }}
      >
        <SimPortrait size={48} showMeta={false} src={doc.portrait || DEFAULT_SIM_PORTRAIT} />
        <div className="min-w-0">
          <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] opacity-85">
            {demotion ? "You've been demoted" : "You've been promoted!"}
          </div>
          <div className="truncate text-[15px] font-black leading-tight">{doc.toTitle}</div>
          <div className="truncate text-[10.5px] opacity-85">
            {doc.careerName} · Level {doc.fromLevel} {doc.fromTitle} → Level {doc.toLevel}
          </div>
        </div>
        {demotion ? (
          <TrendingDown className="ml-auto h-7 w-7 opacity-60" />
        ) : (
          <Trophy className="ml-auto h-7 w-7 opacity-60" />
        )}
      </div>
      <div className="p-4">
        <p className="text-[12px] leading-snug opacity-85">{doc.body}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { k: "Hourly", v: `§${doc.pay ?? "0"}` },
            { k: "Schedule", v: doc.schedule ?? "—" },
            { k: demotion ? "Lost" : "Bonus", v: doc.bonus ?? "—" },
          ].map((s) => (
            <div key={s.k} className="rounded-lg bg-black/[0.04] p-2 [[data-preview-theme='dark']_&]:bg-white/8">
              <div className="text-[9px] font-bold uppercase tracking-wider opacity-60">{s.k}</div>
              <div className="truncate text-[11.5px] font-black">{s.v}</div>
            </div>
          ))}
        </div>
        {doc.uniform && (
          <div className="mt-2 rounded-lg bg-black/[0.04] px-3 py-1.5 text-[11px] [[data-preview-theme='dark']_&]:bg-white/8">
            <span className="font-bold opacity-60">New uniform · </span>
            {doc.uniform}
          </div>
        )}
        {[
          { label: demotion ? "Lost rewards" : "Unlocked", items: doc.unlocks ?? [] },
          { label: "New interactions", items: doc.interactions ?? [] },
        ]
          .filter((g) => g.items.filter(Boolean).length)
          .map((g) => (
            <div key={g.label} className="mt-3">
              <div className="mb-1 text-[9.5px] font-bold uppercase tracking-[0.18em] opacity-60">
                {g.label}
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {g.items.filter(Boolean).map((i) => (
                  <li
                    key={i}
                    className="rounded-full bg-black/5 px-2 py-0.5 text-[10.5px] font-semibold [[data-preview-theme='dark']_&]:bg-white/10"
                  >
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </div>
    </PreviewCard>
  );
}

function MilestoneTemplate({ doc }: { doc: PreviewDoc }) {
  const color = styleColor(doc.style);
  return (
    <PreviewCard className="w-full max-w-[400px] overflow-hidden p-0 text-center">
      <div
        className="relative flex flex-col items-center gap-2 p-5 text-white"
        style={{ background: `linear-gradient(160deg, var(--${color}), color-mix(in oklab, var(--${color}) 45%, black))` }}
      >
        {doc.image ? (
          <img src={doc.image} alt="" className="h-24 w-24 rounded-2xl object-cover shadow-lg" />
        ) : (
          <span className="text-[46px] leading-none">{doc.icon || "🏆"}</span>
        )}
        <div className="text-[9.5px] font-bold uppercase tracking-[0.22em] opacity-85">Milestone</div>
        <div className="text-[17px] font-black leading-tight">{doc.title}</div>
      </div>
      <div className="p-4">
        <p className="text-[12px] leading-relaxed opacity-85">{doc.body}</p>
        {(doc.unlocks ?? []).filter(Boolean).length > 0 && (
          <ul className="mt-3 flex flex-wrap justify-center gap-1.5">
            {(doc.unlocks ?? []).filter(Boolean).map((u) => (
              <li
                key={u}
                className="rounded-full bg-black/5 px-2 py-0.5 text-[10.5px] font-semibold [[data-preview-theme='dark']_&]:bg-white/10"
              >
                🎁 {u}
              </li>
            ))}
          </ul>
        )}
      </div>
    </PreviewCard>
  );
}

function TutorialTemplate({ doc }: { doc: PreviewDoc }) {
  return (
    <PreviewCard className="w-full max-w-[400px] overflow-hidden p-0">
      {doc.image ? (
        <img src={doc.image} alt="" className="h-28 w-full object-cover" />
      ) : (
        <div
          className="flex h-24 items-center justify-center text-[40px]"
          style={{ background: "linear-gradient(135deg, var(--blue)/20, transparent)" }}
        >
          {doc.icon || "💡"}
        </div>
      )}
      <div className="p-4">
        <div className="text-[14px] font-black">{doc.title}</div>
        <p className="mt-1 text-[12px] leading-relaxed opacity-85">{doc.body}</p>
        <div className="mt-3 flex justify-end">
          <GameButton tone="primary">{doc.buttons?.[0] || "Got it"}</GameButton>
        </div>
      </div>
    </PreviewCard>
  );
}

function SituationTemplate({ doc }: { doc: PreviewDoc }) {
  return (
    <PreviewCard className="w-full max-w-[460px] p-0">
      <div className="border-b border-black/5 px-4 py-3 [[data-preview-theme='dark']_&]:border-white/10">
        <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] opacity-60">Event Setup</div>
        <div className="text-[15px] font-black">{doc.title}</div>
        <p className="mt-0.5 text-[11.5px] opacity-75">{doc.body}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3">
        <div className="rounded-lg bg-black/[0.04] p-2 [[data-preview-theme='dark']_&]:bg-white/8">
          <div className="text-[9px] font-bold uppercase tracking-wider opacity-60">Host</div>
          <div className="text-[12px] font-bold">{doc.callerName || "—"}</div>
        </div>
        <div className="rounded-lg bg-black/[0.04] p-2 [[data-preview-theme='dark']_&]:bg-white/8">
          <div className="text-[9px] font-bold uppercase tracking-wider opacity-60">Location</div>
          <div className="text-[12px] font-bold">{doc.careerName || "—"}</div>
        </div>
      </div>
      <div className="space-y-1.5 px-3 pb-3">
        <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] opacity-60">Roles</div>
        {(doc.options ?? []).map((o) => (
          <div
            key={o.id}
            className="flex items-center gap-2 rounded-lg border border-black/10 p-2 [[data-preview-theme='dark']_&]:border-white/12"
          >
            <IconFrame emoji={o.emoji || "👤"} label={o.label} color="violet" size={32} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-bold">{o.label}</div>
              <div className="truncate text-[10.5px] opacity-70">{o.description}</div>
            </div>
            <GameButton>Assign</GameButton>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 border-t border-black/5 px-4 py-2.5 [[data-preview-theme='dark']_&]:border-white/10">
        <GameButton>{doc.cancelLabel || "Cancel"}</GameButton>
        <GameButton tone="primary">{doc.confirmLabel || "Start Event"}</GameButton>
      </div>
    </PreviewCard>
  );
}

function StoryQuestionTemplate({ doc }: { doc: PreviewDoc }) {
  const [pick, setPick] = useState<ResolvedPick | null>(null);
  return (
    <PreviewCard className="w-full max-w-[420px]">
      <div className="flex items-start gap-3">
        <SimPortrait size={54} showMeta={false} src={doc.portrait || SECOND_SIM_PORTRAIT} />
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-black">{doc.portraitName || "Sim"}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60">{doc.title}</div>
          <div className="mt-1.5 rounded-xl rounded-tl-sm bg-black/[0.04] px-3 py-2 text-[12.5px] leading-relaxed [[data-preview-theme='dark']_&]:bg-white/8">
            {doc.body}
          </div>
        </div>
      </div>
      {!pick ? (
        <ChoiceButtons choices={doc.choices ?? []} onPick={(c) => setPick(resolveChoice(c))} />
      ) : (
        <>
          <div className="mt-3 ml-auto w-fit rounded-xl rounded-tr-sm bg-[var(--blue)]/12 px-3 py-2 text-[12px] font-semibold">
            {pick.choice.label}
          </div>
          <OutcomeCard outcome={pick.outcome} rolled={pick.rolled} />
          <div className="mt-3">
            <GameButton tone="ghost" onClick={() => setPick(null)}>
              <span className="inline-flex items-center gap-1">
                <RotateCcw className="h-3 w-3" /> Replay
              </span>
            </GameButton>
          </div>
        </>
      )}
    </PreviewCard>
  );
}

/** ---------- sequence runtime ---------- */

function SequenceTemplate({ doc, ctx }: { doc: PreviewDoc; ctx: RenderContext }) {
  const nodes = doc.nodes ?? [];
  const [currentId, setCurrentId] = useState<string | undefined>(
    doc.startNodeId ?? nodes[0]?.id,
  );
  const [trail, setTrail] = useState<string[]>([]);
  const node = useMemo(() => nodes.find((n) => n.id === currentId), [nodes, currentId]);

  const go = (nextId?: string) => {
    if (!nextId) {
      setCurrentId(undefined);
      return;
    }
    setTrail((t) => [...t, currentId ?? ""]);
    setCurrentId(nextId);
  };
  const restart = () => {
    setTrail([]);
    setCurrentId(doc.startNodeId ?? nodes[0]?.id);
  };

  return (
    <div className="w-full max-w-[520px]">
      <div className="mb-2 flex items-center gap-2 text-[10.5px] font-semibold opacity-70">
        <span className="rounded-full bg-black/5 px-2 py-0.5 [[data-preview-theme='dark']_&]:bg-white/10">
          Step {trail.length + 1} / {nodes.length || 1}
        </span>
        <span className="truncate">{doc.title}</span>
        <button
          type="button"
          onClick={restart}
          className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-black/5 [[data-preview-theme='dark']_&]:hover:bg-white/10"
        >
          <RotateCcw className="h-3 w-3" /> Restart
        </button>
      </div>
      {!node ? (
        <PreviewCard className="text-center">
          <div className="text-[13px] font-black">Sequence complete</div>
          <p className="mt-1 text-[11.5px] opacity-75">
            The player reached the end of this adventure.
          </p>
          <div className="mt-3">
            <GameButton tone="primary" onClick={restart}>
              Play again
            </GameButton>
          </div>
        </PreviewCard>
      ) : node.kind === "phone-call" ? (
        <PhoneCallTemplate key={node.id} doc={doc} node={node} onNext={go} />
      ) : node.kind === "dialog" ? (
        <DialogTemplate key={node.id} doc={doc} node={node} onNext={go} />
      ) : node.kind === "tns" ? (
        <div>
          <TnsTemplate doc={{ ...doc, title: node.title, body: node.body, style: node.style }} />
          <div className="mt-2">
            <GameButton tone="primary" onClick={() => go(node.choices[0]?.success.nextNodeId)}>
              Continue
            </GameButton>
          </div>
        </div>
      ) : node.kind === "branch-select" ? (
        <BranchSelectTemplate doc={{ ...doc, title: node.title, body: node.body }} ctx={ctx} />
      ) : node.kind === "picker" ? (
        <PickerTemplate doc={{ ...doc, title: node.title, body: node.body }} variant="list" />
      ) : (
        <ChanceCardTemplate key={node.id} doc={doc} node={node} onNext={go} />
      )}
    </div>
  );
}

/** ---------- dispatcher ---------- */

export function PreviewRenderer({
  doc,
  ctx = { branches: [] },
}: {
  doc: PreviewDoc;
  ctx?: RenderContext;
}) {
  switch (doc.kind) {
    case "tns":
      return <TnsTemplate doc={doc} />;
    case "chance-card":
      return <ChanceCardTemplate doc={doc} />;
    case "sequence":
      return <SequenceTemplate doc={doc} ctx={ctx} />;
    case "phone-call":
      return <PhoneCallTemplate doc={doc} />;
    case "invitation":
      return <PhoneCallTemplate doc={doc} />;
    case "dialog":
      return <DialogTemplate doc={doc} />;
    case "confirm":
      return <DialogTemplate doc={doc} confirm />;
    case "picker":
      return <PickerTemplate doc={doc} variant="list" />;
    case "sim-picker":
      return <PickerTemplate doc={doc} variant="sims" />;
    case "reward-picker":
      return <PickerTemplate doc={doc} variant="rewards" />;
    case "branch-select":
      return <BranchSelectTemplate doc={doc} ctx={ctx} />;
    case "promotion":
      return <PromotionTemplate doc={doc} ctx={ctx} />;
    case "demotion":
      return <PromotionTemplate doc={doc} ctx={ctx} demotion />;
    case "milestone":
      return <MilestoneTemplate doc={doc} />;
    case "tutorial":
      return <TutorialTemplate doc={doc} />;
    case "situation":
      return <SituationTemplate doc={doc} />;
    case "story-question":
      return <StoryQuestionTemplate doc={doc} />;
    default:
      return <TnsTemplate doc={doc} />;
  }
}
