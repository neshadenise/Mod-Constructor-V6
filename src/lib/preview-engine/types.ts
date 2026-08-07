/**
 * In-Game UI Preview Engine — data contracts.
 *
 * The Sims 4 does not have one "notification" surface: the game uses distinct
 * presentation patterns depending on whether it is *informing*, *asking* or
 * making the player *choose*. Each pattern is its own preview template with its
 * own relevant fields, while sharing reusable assets (Sim portraits, career
 * icons, branch covers, strings and outcome data).
 */

export type PreviewKind =
  | "tns"
  | "chance-card"
  | "sequence"
  | "phone-call"
  | "dialog"
  | "confirm"
  | "picker"
  | "sim-picker"
  | "reward-picker"
  | "branch-select"
  | "invitation"
  | "tutorial"
  | "milestone"
  | "situation"
  | "story-question"
  | "promotion"
  | "demotion";

/** Visual severity / semantic style of an information surface. */
export type PreviewStyle =
  | "neutral"
  | "positive"
  | "negative"
  | "warning"
  | "critical"
  | "career"
  | "relationship"
  | "event"
  | "reward"
  | "discovery";

export const PREVIEW_STYLES: PreviewStyle[] = [
  "neutral",
  "positive",
  "negative",
  "warning",
  "critical",
  "career",
  "relationship",
  "event",
  "reward",
  "discovery",
];

export const STYLE_META: Record<PreviewStyle, { label: string; color: string; emoji: string }> = {
  neutral: { label: "Information", color: "blue", emoji: "ℹ️" },
  positive: { label: "Success", color: "green", emoji: "✅" },
  negative: { label: "Failure", color: "red", emoji: "⚠️" },
  warning: { label: "Warning", color: "orange", emoji: "⚠️" },
  critical: { label: "Critical", color: "red", emoji: "🚨" },
  career: { label: "Career", color: "blue", emoji: "💼" },
  relationship: { label: "Relationship", color: "pink", emoji: "💗" },
  event: { label: "Event", color: "violet", emoji: "🎉" },
  reward: { label: "Reward", color: "teal", emoji: "🎁" },
  discovery: { label: "Discovery", color: "violet", emoji: "🔍" },
};

/** Result of picking a choice (fixed, or rolled against a success chance). */
export interface PreviewOutcome {
  /** Work / school performance delta, in points. */
  performance?: number;
  /** Moodlet (buff) applied by this outcome. */
  moodlet?: string;
  /** Follow-up TNS text shown after the choice resolves. */
  notification?: string;
  style?: PreviewStyle;
  /** Extra rewards / consequences, one per line. */
  rewards?: string[];
  /** Chain into another node of the sequence. */
  nextNodeId?: string;
}

export interface PreviewChoice {
  id: string;
  label: string;
  /** Hidden hint shown to the creator only. */
  hint?: string;
  outcomeMode: "fixed" | "random";
  /** 0–100, used when outcomeMode is "random". */
  successChance: number;
  success: PreviewOutcome;
  failure: PreviewOutcome;
  /** Hide unless a condition is met (free text, documentation only). */
  condition?: string;
}

/** A node inside a chained / multi-step sequence. */
export interface PreviewNode {
  id: string;
  /** Which surface this step renders as. */
  kind: Extract<PreviewKind, "tns" | "chance-card" | "phone-call" | "dialog" | "picker" | "branch-select">;
  title: string;
  body: string;
  style: PreviewStyle;
  choices: PreviewChoice[];
}

/** An entry inside a picker dialog. */
export interface PreviewOption {
  id: string;
  label: string;
  description?: string;
  image?: string;
  emoji?: string;
  value?: string;
}

export interface PreviewDoc {
  id: string;
  projectId: string;
  kind: PreviewKind;
  /** Creator-facing name in the library. */
  name: string;

  /* shared presentation */
  title: string;
  body: string;
  style: PreviewStyle;
  icon?: string;
  image?: string;
  /** Sim portrait override (data URL / asset URL). */
  portrait?: string;
  portraitName?: string;

  /* trigger metadata (chance cards, calls, career events) */
  careerId?: string;
  careerName?: string;
  careerLevel?: number;
  triggerChance?: number;

  /* choice based */
  choices?: PreviewChoice[];

  /* sequences */
  nodes?: PreviewNode[];
  startNodeId?: string;

  /* phone calls */
  callerRole?: string;
  callerName?: string;

  /* pickers */
  pickerType?: "Sim" | "Object" | "Career" | "Gig" | "Location" | "Custom Entry";
  selectionMode?: "single" | "multiple";
  minSelections?: number;
  maxSelections?: number;
  confirmLabel?: string;
  cancelLabel?: string;
  options?: PreviewOption[];

  /* promotion / demotion */
  fromLevel?: number;
  toLevel?: number;
  fromTitle?: string;
  toTitle?: string;
  pay?: string;
  schedule?: string;
  bonus?: string;
  unlocks?: string[];
  interactions?: string[];
  uniform?: string;

  /* branch selection */
  branchIds?: string[];

  /* dialogs */
  buttons?: string[];

  updatedAt: number;
}

export const uid = (p = "pv") => `${p}_${Math.random().toString(36).slice(2, 9)}`;

export const blankOutcome = (): PreviewOutcome => ({
  performance: 0,
  moodlet: "",
  notification: "",
  style: "neutral",
  rewards: [],
});

export const blankChoice = (label = "New response"): PreviewChoice => ({
  id: uid("ch"),
  label,
  outcomeMode: "random",
  successChance: 60,
  success: { ...blankOutcome(), style: "positive" },
  failure: { ...blankOutcome(), style: "negative" },
});
