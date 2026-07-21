import { useMemo, useState } from "react";
import {
  PreviewToolbar,
  PreviewSurface,
  usePreviewToolbar,
  type Scenario,
} from "./PreviewShell";
import {
  CareerCard,
  PromotionWindow,
  BranchWindow,
  ChanceCard,
  NotificationPopup,
  IconFrame,
  RewardList,
  PerformanceMeter,
} from "./GameUI";
import { cn } from "@/lib/utils";

export type CareerPreviewData = {
  name: string;
  description: string;
  track: string;
  salary: string;
  hours: string;
  days: string;
  emoji?: string;
  color?: string;
  branches: {
    key: string;
    name: string;
    description: string;
    color?: string;
    emoji?: string;
    ranks: { lvl: number; title: string; req: string; pay: string }[];
    perks: { name: string; tier: number }[];
  }[];
  activeBranch: string;
};

const CAREER_TABS = [
  "Career Panel",
  "Join Career",
  "Promotion",
  "Demotion",
  "Branch Selection",
  "Work Notification",
  "Chance Card",
  "Retirement",
  "Career Reward",
  "Performance Review",
  "Missed Work",
] as const;

function scenarioLevel(s: Scenario, maxRank: number): number {
  switch (s) {
    case "level-1":
      return 1;
    case "level-5":
      return Math.min(5, maxRank);
    case "max-career":
      return maxRank;
    case "promotion-day":
      return Math.min(3, maxRank);
    case "retirement":
      return maxRank;
    default:
      return Math.min(3, maxRank);
  }
}
function scenarioPerformance(s: Scenario): number {
  if (s === "excellent") return 0.94;
  if (s === "poor") return 0.18;
  if (s === "promotion-day") return 0.99;
  if (s === "vacation") return 0.5;
  return 0.62;
}

export function CareerPreview({ data }: { data: CareerPreviewData }) {
  const toolbar = usePreviewToolbar({
    previewType: CAREER_TABS[0],
    types: [...CAREER_TABS],
  });
  const [selectedBranchKey, setSelectedBranchKey] = useState(data.activeBranch);

  const branch =
    data.branches.find((b) => b.key === data.activeBranch) ?? data.branches[0];
  const branchForBranchTab =
    data.branches.find((b) => b.key === selectedBranchKey) ?? branch;

  const name = data.name || "Untitled Career";
  const description = data.description || "No Description";
  const salary = data.salary || "0";
  const hours = data.hours || "09:00 → 17:00";
  const emoji = data.emoji || "💼";
  const color = data.color || "blue";

  const level = useMemo(
    () => scenarioLevel(toolbar.scenario, branch.ranks.length || 10),
    [toolbar.scenario, branch.ranks.length],
  );
  const currentRank =
    branch.ranks.find((r) => r.lvl === level) ??
    branch.ranks[branch.ranks.length - 1] ?? {
      lvl: 1,
      title: "Trainee",
      req: "—",
      pay: salary,
    };
  const nextRank =
    branch.ranks.find((r) => r.lvl === level + 1) ?? null;
  const performance = scenarioPerformance(toolbar.scenario);

  return (
    <div>
      <PreviewToolbar state={toolbar} accent="blue" title="Career Live Preview" />
      <PreviewSurface state={toolbar}>
        {toolbar.previewType === "Career Panel" && (
          <CareerCard
            name={name}
            description={description}
            level={currentRank.lvl}
            levelTitle={currentRank.title || "Unnamed Rank"}
            pay={currentRank.pay || salary}
            hours={hours}
            days={data.days || "Mon – Fri"}
            performance={performance}
            emoji={emoji}
            color={color}
            requirements={
              nextRank
                ? [
                    { label: `Reach ${nextRank.req || "—"}`, met: performance > 0.75 },
                    { label: `Level ${currentRank.lvl} performance ≥ 75%`, met: performance > 0.75 },
                    { label: "No missed shifts this week", met: toolbar.scenario !== "poor" },
                  ]
                : [{ label: "Top of career reached", met: true }]
            }
            rewards={branch.perks.slice(0, 4).map((p) => ({
              label: p.name || "Unknown Reward",
              kind: "perk",
            }))}
          />
        )}

        {toolbar.previewType === "Join Career" && (
          <JoinCareerPanel
            name={name}
            description={description}
            emoji={emoji}
            color={color}
            salary={salary}
            hours={hours}
            days={data.days || "Mon – Fri"}
            perks={branch.perks.slice(0, 3).map((p) => p.name || "Unknown Reward")}
          />
        )}

        {(toolbar.previewType === "Promotion" ||
          toolbar.previewType === "Demotion") && (
          <PromotionWindow
            name={name}
            emoji={emoji}
            color={color}
            demotion={toolbar.previewType === "Demotion"}
            fromLevel={Math.max(1, currentRank.lvl - (toolbar.previewType === "Demotion" ? -1 : 1))}
            toLevel={currentRank.lvl}
            fromTitle={
              (branch.ranks.find(
                (r) =>
                  r.lvl ===
                  Math.max(1, currentRank.lvl - (toolbar.previewType === "Demotion" ? -1 : 1)),
              )?.title ?? "Trainee") || "Trainee"
            }
            toTitle={currentRank.title || "Unnamed Rank"}
            newPay={currentRank.pay || salary}
            description={
              toolbar.previewType === "Demotion"
                ? `Your performance has slipped. You've been moved back a step in the ${name} track.`
                : description
            }
            unlockedRewards={branch.perks
              .slice(0, 2)
              .map((p) => ({ label: p.name || "Unknown Reward", kind: "perk" }))}
            unlockedInteractions={[
              "Discuss Work",
              "Brag About Promotion",
              "Bring Home Overtime",
            ]}
          />
        )}

        {toolbar.previewType === "Branch Selection" && (
          <BranchWindow
            active={selectedBranchKey}
            onSelect={setSelectedBranchKey}
            branches={data.branches.map((b) => ({
              key: b.key,
              name: b.name || "Untitled Branch",
              description: b.description || "No Description",
              color: b.color,
              emoji: b.emoji,
              futureLevels: b.ranks.slice(0, 5).map((r) => ({
                level: r.lvl,
                title: r.title || "Unnamed Rank",
                pay: r.pay || salary,
              })),
              requirements: [
                { label: `Level ${currentRank.lvl} in ${name}`, met: true },
                { label: `Skill: ${b.ranks[0]?.req || "—"}`, met: performance > 0.6 },
              ],
            }))}
          />
        )}

        {toolbar.previewType === "Work Notification" && (
          <div className="space-y-2">
            <NotificationPopup
              kind="career"
              title="Time to head to work!"
              body={`Your shift as ${currentRank.title || "Employee"} starts in 30 minutes at ${hours.split(" → ")[0]}.`}
              action="Go to Work"
            />
            <NotificationPopup
              kind="warning"
              title="Running late"
              body="Your Sim is 15 minutes late. Performance will drop if this continues."
              action="Rush to Work"
            />
            <NotificationPopup
              kind="reward"
              title="Vacation approved"
              body="Take a day off — performance is preserved."
            />
          </div>
        )}

        {toolbar.previewType === "Chance Card" && (
          <ChanceCard
            title={`A moment at ${name}`}
            story={`A colleague asks for your help on a risky project. It could impress the boss — or backfire.`}
            color={color}
            choices={[
              {
                label: "Take the risk",
                icon: "⚡",
                outcome: "+2 performance, promotion faster",
                tone: "good",
              },
              {
                label: "Play it safe",
                icon: "🛡️",
                outcome: "No change to performance",
                tone: "neutral",
              },
              {
                label: "Refuse coldly",
                icon: "❄️",
                outcome: "−1 performance, colleague upset",
                tone: "bad",
              },
            ]}
          />
        )}

        {toolbar.previewType === "Retirement" && (
          <RetirementPanel
            name={name}
            emoji={emoji}
            color={color}
            years={12}
            pension={String(Math.round(Number(salary || 0) * 0.6))}
            rewards={branch.perks
              .slice(0, 3)
              .map((p) => ({ label: p.name || "Unknown Reward", kind: "perk" as const }))}
          />
        )}

        {toolbar.previewType === "Career Reward" && (
          <div className="space-y-2">
            <div className="rounded-xl bg-gradient-to-br from-[var(--violet)] to-[var(--blue)] p-4 text-white">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] opacity-85">
                Career Reward Unlocked
              </div>
              <div className="mt-1 flex items-center gap-3">
                <IconFrame emoji="🏆" color="teal" size={48} />
                <div>
                  <div className="text-[15px] font-black">{branch.perks[0]?.name || "Unknown Reward"}</div>
                  <div className="text-[11px] opacity-85">
                    Unlocked for reaching {currentRank.title || "this level"}
                  </div>
                </div>
              </div>
            </div>
            <RewardList
              items={branch.perks.slice(0, 4).map((p) => ({
                label: p.name || "Unknown Reward",
                kind: "perk",
              }))}
            />
          </div>
        )}

        {toolbar.previewType === "Performance Review" && (
          <div className="space-y-2">
            <div className="rounded-xl border border-black/5 bg-white/85 p-3.5 [[data-preview-theme='dark']_&]:border-white/10 [[data-preview-theme='dark']_&]:bg-white/[0.06]">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] opacity-60">
                Weekly Performance Review
              </div>
              <div className="mt-1 text-[14px] font-bold">
                {currentRank.title || "Employee"} · {name}
              </div>
              <div className="mt-2">
                <PerformanceMeter
                  value={performance}
                  tone={performance > 0.75 ? "good" : performance < 0.35 ? "bad" : undefined}
                />
              </div>
              <ul className="mt-3 space-y-1 text-[11.5px]">
                <li>
                  <span className="font-semibold">On time:</span>{" "}
                  {toolbar.scenario === "poor" ? "2 of 5 shifts" : "5 of 5 shifts"}
                </li>
                <li>
                  <span className="font-semibold">Skill progression:</span> +
                  {toolbar.scenario === "excellent" ? 3 : 1} this week
                </li>
                <li>
                  <span className="font-semibold">Coworker mood:</span>{" "}
                  {toolbar.scenario === "excellent" ? "Inspired" : "Content"}
                </li>
              </ul>
            </div>
          </div>
        )}

        {toolbar.previewType === "Missed Work" && (
          <NotificationPopup
            kind="error"
            title="Missed shift"
            body={`Your Sim missed today's ${currentRank.title || "shift"}. Performance dropped significantly and pay was withheld.`}
            action="View Performance"
          />
        )}

        {toolbar.previewType === "Career Panel" ||
        toolbar.previewType === "Performance Review" ? (
          <div className="mt-3 rounded-lg border border-dashed border-black/10 p-2 text-center text-[10.5px] opacity-60 [[data-preview-theme='dark']_&]:border-white/10">
            Preview reflects <span className="font-semibold">{toolbar.scenario}</span> scenario · edits update instantly
          </div>
        ) : null}
      </PreviewSurface>
    </div>
  );
}

function JoinCareerPanel({
  name,
  description,
  emoji,
  color,
  salary,
  hours,
  days,
  perks,
}: {
  name: string;
  description: string;
  emoji: string;
  color: string;
  salary: string;
  hours: string;
  days: string;
  perks: string[];
}) {
  return (
    <div className="rounded-xl border border-black/5 bg-white/85 p-0 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.5)] [[data-preview-theme='dark']_&]:border-white/10 [[data-preview-theme='dark']_&]:bg-white/[0.06]">
      <div
        className="flex items-center gap-3 rounded-t-xl p-4 text-white"
        style={{
          background: `linear-gradient(135deg, var(--${color}), color-mix(in oklab, var(--${color}) 55%, black))`,
        }}
      >
        <IconFrame emoji={emoji} color="teal" size={56} />
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-85">
            Career Opportunity
          </div>
          <div className="text-[17px] font-black leading-tight">{name}</div>
        </div>
      </div>
      <div className="p-4">
        <p className="text-[12px] leading-snug opacity-85">{description}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <MiniStat label="Starting §" value={`§${salary}`} />
          <MiniStat label="Hours" value={hours} />
          <MiniStat label="Days" value={days} />
        </div>
        {perks.length > 0 && (
          <div className="mt-3">
            <div className="mb-1 text-[9.5px] font-bold uppercase tracking-[0.14em] opacity-60">
              Career Perks
            </div>
            <ul className="space-y-1 text-[11.5px]">
              {perks.map((p) => (
                <li key={p} className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: `var(--${color})` }} />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <button className="flex-1 rounded-lg bg-black/5 py-2 text-[12px] font-bold [[data-preview-theme='dark']_&]:bg-white/10">
            Not now
          </button>
          <button
            className={cn(
              "flex-1 rounded-lg py-2 text-[12px] font-black text-white shadow-sm",
            )}
            style={{ background: `linear-gradient(135deg, var(--${color}), var(--violet))` }}
          >
            Accept Career
          </button>
        </div>
      </div>
    </div>
  );
}

function RetirementPanel({
  name,
  emoji,
  color,
  years,
  pension,
  rewards,
}: {
  name: string;
  emoji: string;
  color: string;
  years: number;
  pension: string;
  rewards: { label: string; kind: "perk" }[];
}) {
  return (
    <div className="rounded-xl border border-black/5 bg-white/85 p-4 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.5)] [[data-preview-theme='dark']_&]:border-white/10 [[data-preview-theme='dark']_&]:bg-white/[0.06]">
      <div className="flex items-center gap-3">
        <IconFrame emoji={emoji} color={color} size={48} />
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] opacity-60">
            Retirement
          </div>
          <div className="text-[15px] font-bold">{name}</div>
        </div>
      </div>
      <p className="mt-2 text-[12px] leading-snug opacity-85">
        After {years} devoted years, your Sim retires from {name}. Enjoy a lifetime of leisure —
        and a comfortable pension.
      </p>
      <div className="mt-3 flex items-center justify-between rounded-lg bg-black/[0.04] px-3 py-2 [[data-preview-theme='dark']_&]:bg-white/8">
        <span className="text-[11px] font-semibold uppercase tracking-wider opacity-70">
          Weekly pension
        </span>
        <span className="text-[16px] font-black" style={{ color: "var(--green)" }}>
          §{pension}
        </span>
      </div>
      {rewards.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-[9.5px] font-bold uppercase tracking-[0.14em] opacity-60">
            Career Legacy Rewards
          </div>
          <RewardList items={rewards} />
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/[0.04] p-2 [[data-preview-theme='dark']_&]:bg-white/8">
      <div className="text-[9.5px] font-bold uppercase tracking-wider opacity-60">{label}</div>
      <div className="mt-0.5 text-[12.5px] font-black">{value}</div>
    </div>
  );
}
