/**
 * Template registry for the In-Game UI Preview Engine.
 *
 * Every Sims 4 UI pattern declares (a) the fields the editor should expose and
 * (b) a sensible starter document. The editor is generated from this schema, so
 * selecting a different preview type reshapes the form automatically.
 */

import {
  blankChoice,
  uid,
  type PreviewDoc,
  type PreviewKind,
  type PreviewStyle,
} from "./types";

export type FieldType =
  | "text"
  | "textarea"
  | "select"
  | "number"
  | "image"
  | "style"
  | "tags"
  | "choices"
  | "options"
  | "nodes"
  | "branches"
  | "portrait";

export interface FieldDef {
  key: keyof PreviewDoc | string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
  help?: string;
  /** Layout hint: half-width field. */
  half?: boolean;
}

export interface TemplateDef {
  kind: PreviewKind;
  label: string;
  category: "Information" | "Decision" | "Communication" | "Selection" | "Career";
  blurb: string;
  choiceLabel?: string;
  fields: FieldDef[];
  defaults: () => Partial<PreviewDoc>;
}

const SHARED_HEADER: FieldDef[] = [
  { key: "title", label: "Title", type: "text", placeholder: "Headline shown in game" },
  { key: "body", label: "Body text", type: "textarea", placeholder: "What the game tells the player" },
];

const CAREER_TRIGGER: FieldDef[] = [
  { key: "careerName", label: "Career", type: "text", half: true, placeholder: "Corporate Lawyer" },
  { key: "careerLevel", label: "Level", type: "number", half: true },
  { key: "triggerChance", label: "Trigger chance %", type: "number", half: true },
];

export const TEMPLATES: TemplateDef[] = [
  {
    kind: "tns",
    label: "Notification (TNS)",
    category: "Information",
    blurb: "Live Mode top-right notification. Informs, rarely asks.",
    fields: [
      ...SHARED_HEADER,
      { key: "style", label: "Severity / style", type: "style" },
      { key: "portrait", label: "Sim portrait", type: "portrait", half: true },
      { key: "portraitName", label: "Sim name", type: "text", half: true },
      { key: "icon", label: "Icon emoji", type: "text", half: true, placeholder: "💼" },
      { key: "image", label: "Focus image", type: "image", help: "Optional object / location art." },
      { key: "buttons", label: "Action button", type: "tags", placeholder: "View career" },
    ],
    defaults: () => ({
      title: "Promotion earned",
      body: "Maya impressed the partners and moved up to Junior Associate.",
      style: "career",
      buttons: ["View career"],
    }),
  },
  {
    kind: "chance-card",
    label: "Career Chance Card",
    category: "Decision",
    blurb: "Work / school situation where the player decides. Outcomes hit performance and moodlets.",
    choiceLabel: "Choice",
    fields: [
      ...SHARED_HEADER,
      { key: "style", label: "Style", type: "style" },
      ...CAREER_TRIGGER,
      { key: "portrait", label: "Sim portrait", type: "portrait", half: true },
      { key: "image", label: "Scenario art", type: "image", half: true },
      { key: "choices", label: "Choices", type: "choices" },
    ],
    defaults: () => ({
      title: "The Missing Client Files",
      body: "Your boss realizes an important client folder has vanished — and it was last seen on your desk.",
      style: "career",
      careerName: "Corporate Lawyer",
      careerLevel: 4,
      triggerChance: 15,
      choices: [
        {
          ...blankChoice("Tell the Boss Immediately"),
          successChance: 70,
          success: {
            performance: 15,
            moodlet: "Confident",
            notification: "The boss appreciates Maya's honesty and helps her retrace the folder.",
            style: "positive",
            rewards: [],
          },
          failure: {
            performance: -10,
            moodlet: "Embarrassed",
            notification: "The folder turns up five minutes later — right where Maya left it.",
            style: "negative",
            rewards: [],
          },
        },
        {
          ...blankChoice("Quietly Search for It"),
          successChance: 55,
          success: {
            performance: 8,
            moodlet: "Focused",
            notification: "Maya finds the folder before anyone notices it was gone.",
            style: "positive",
            rewards: [],
          },
          failure: {
            performance: -15,
            moodlet: "Tense",
            notification: "The search drags on and the client meeting starts without the paperwork.",
            style: "negative",
            rewards: [],
          },
        },
      ],
    }),
  },
  {
    kind: "sequence",
    label: "Multi-Step Chance Card / Adventure",
    category: "Decision",
    blurb: "One decision leads into the next. Chain cards, calls, dialogs and pickers into a branching adventure.",
    fields: [
      { key: "title", label: "Sequence name", type: "text" },
      { key: "body", label: "Summary", type: "textarea" },
      { key: "nodes", label: "Sequence", type: "nodes" },
    ],
    defaults: () => {
      const endId = uid("nd");
      const startId = uid("nd");
      return {
        title: "Client Hates the Designs",
        body: "A rough review spirals into a second decision on the same shift.",
        style: "career" as PreviewStyle,
        startNodeId: startId,
        nodes: [
          {
            id: startId,
            kind: "chance-card" as const,
            title: "Client Hates the Designs",
            body: "The client tears into the concept boards in front of the whole team.",
            style: "career" as PreviewStyle,
            choices: [
              {
                ...blankChoice("Redo the Work"),
                successChance: 70,
                success: {
                  performance: 10,
                  moodlet: "Inspired",
                  notification: "The overnight rework lands perfectly.",
                  style: "positive" as PreviewStyle,
                  nextNodeId: endId,
                  rewards: [],
                },
                failure: {
                  performance: -8,
                  moodlet: "Stressed",
                  notification: "The second pass misses the brief too.",
                  style: "negative" as PreviewStyle,
                  rewards: [],
                },
              },
              {
                ...blankChoice("Defend the Work"),
                outcomeMode: "fixed" as const,
                success: {
                  performance: -10,
                  moodlet: "Tense",
                  notification: "The client escalates to your manager.",
                  style: "negative" as PreviewStyle,
                  rewards: [],
                },
                failure: { style: "negative" as PreviewStyle, rewards: [] },
              },
            ],
          },
          {
            id: endId,
            kind: "phone-call" as const,
            title: "The Boss Calls",
            body: "\"That save was impressive. Want the lead on the next pitch?\"",
            style: "career" as PreviewStyle,
            choices: [
              { ...blankChoice("I'm in."), outcomeMode: "fixed" as const },
              { ...blankChoice("Let someone else take it."), outcomeMode: "fixed" as const },
            ],
          },
        ],
      };
    },
  },
  {
    kind: "phone-call",
    label: "Phone Call",
    category: "Communication",
    blurb: "Another Sim contacts the active Sim. Supports any number of responses.",
    choiceLabel: "Response",
    fields: [
      {
        key: "callerRole",
        label: "Caller",
        type: "select",
        half: true,
        options: ["Specific Sim", "Coworker", "Boss", "Client", "Recruiter", "Random Sim", "Custom Role"],
      },
      { key: "callerName", label: "Caller name", type: "text", half: true },
      { key: "portrait", label: "Caller portrait", type: "portrait" },
      { key: "title", label: "Call subject", type: "text" },
      { key: "body", label: "Dialogue", type: "textarea" },
      { key: "style", label: "Style", type: "style" },
      { key: "choices", label: "Responses", type: "choices" },
    ],
    defaults: () => ({
      title: "Short-Staffed Tonight",
      body: "We're short-staffed tonight. Think you can come in?",
      style: "career",
      callerRole: "Boss",
      callerName: "Renée Okafor",
      choices: [
        { ...blankChoice("I'll be there."), outcomeMode: "fixed", success: { performance: 10, moodlet: "Energized", notification: "Maya picks up the extra shift.", style: "positive", rewards: [] } },
        { ...blankChoice("Sorry, not tonight."), outcomeMode: "fixed", success: { performance: -5, style: "negative", notification: "The boss sighs and calls the next name on the list.", rewards: [] } },
        { ...blankChoice("What's in it for me?"), outcomeMode: "random", successChance: 45, success: { performance: 5, notification: "Overtime pay, negotiated.", style: "reward", rewards: ["§250 bonus"] }, failure: { performance: -8, notification: "That was the wrong thing to ask.", style: "negative", rewards: [] } },
      ],
    }),
  },
  {
    kind: "dialog",
    label: "Standard Modal Dialog",
    category: "Decision",
    blurb: "Important question that interrupts play. 1–3 buttons.",
    fields: [
      ...SHARED_HEADER,
      { key: "style", label: "Style", type: "style" },
      { key: "portrait", label: "Portrait", type: "portrait", half: true },
      { key: "image", label: "Header art", type: "image", half: true },
      { key: "buttons", label: "Buttons", type: "tags" },
    ],
    defaults: () => ({
      title: "Accept the Transfer?",
      body: "The firm wants Maya in the Del Sol Valley office starting Monday.",
      style: "career",
      buttons: ["Accept", "Decline", "Ask for time"],
    }),
  },
  {
    kind: "confirm",
    label: "Yes / No Confirmation",
    category: "Decision",
    blurb: "Simple irreversible confirmation.",
    fields: [
      ...SHARED_HEADER,
      { key: "style", label: "Style", type: "style" },
      { key: "buttons", label: "Button labels", type: "tags" },
    ],
    defaults: () => ({
      title: "Quit this career?",
      body: "Maya will lose all progress in the Dance career, including unlocked perks.",
      style: "warning",
      buttons: ["Yes, quit", "No"],
    }),
  },
  {
    kind: "picker",
    label: "Picker Dialog",
    category: "Selection",
    blurb: "Player chooses from a scrollable list of entries.",
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "body", label: "Prompt", type: "textarea" },
      {
        key: "pickerType",
        label: "Picker type",
        type: "select",
        half: true,
        options: ["Sim", "Object", "Career", "Gig", "Location", "Custom Entry"],
      },
      { key: "selectionMode", label: "Selection", type: "select", half: true, options: ["single", "multiple"] },
      { key: "minSelections", label: "Min selections", type: "number", half: true },
      { key: "maxSelections", label: "Max selections", type: "number", half: true },
      { key: "confirmLabel", label: "Confirm button", type: "text", half: true },
      { key: "cancelLabel", label: "Cancel button", type: "text", half: true },
      { key: "options", label: "Entries", type: "options" },
    ],
    defaults: () => ({
      title: "Choose an Assignment",
      body: "Pick the case Maya takes on this week.",
      style: "career" as PreviewStyle,
      pickerType: "Custom Entry" as const,
      selectionMode: "single" as const,
      minSelections: 1,
      maxSelections: 1,
      confirmLabel: "Confirm",
      cancelLabel: "Cancel",
      options: [
        { id: uid("op"), label: "Corporate Merger", description: "High pay, terrible hours.", emoji: "📈" },
        { id: uid("op"), label: "Pro Bono Case", description: "Low pay, big reputation gain.", emoji: "⚖️" },
        { id: uid("op"), label: "Celebrity Client", description: "Unpredictable — and very public.", emoji: "🌟" },
      ],
    }),
  },
  {
    kind: "sim-picker",
    label: "Sim Picker",
    category: "Selection",
    blurb: "Portrait grid for choosing one or more Sims.",
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "body", label: "Prompt", type: "textarea" },
      { key: "selectionMode", label: "Selection", type: "select", half: true, options: ["single", "multiple"] },
      { key: "maxSelections", label: "Max selections", type: "number", half: true },
      { key: "confirmLabel", label: "Confirm button", type: "text", half: true },
      { key: "cancelLabel", label: "Cancel button", type: "text", half: true },
      { key: "options", label: "Sims", type: "options" },
    ],
    defaults: () => ({
      title: "Choose a Coworker",
      body: "Who does Maya bring to the client dinner?",
      style: "relationship" as PreviewStyle,
      pickerType: "Sim" as const,
      selectionMode: "single" as const,
      maxSelections: 1,
      confirmLabel: "Choose",
      cancelLabel: "Cancel",
      options: [
        { id: uid("op"), label: "Ada Nova", description: "Ambitious · Good friend" },
        { id: uid("op"), label: "Kai Mercer", description: "Goofball · Coworker" },
        { id: uid("op"), label: "Renée Okafor", description: "Boss · Tense" },
      ],
    }),
  },
  {
    kind: "reward-picker",
    label: "Object / Reward Picker",
    category: "Selection",
    blurb: "Icon cards for choosing a reward, item or path.",
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "body", label: "Prompt", type: "textarea" },
      { key: "confirmLabel", label: "Confirm button", type: "text", half: true },
      { key: "cancelLabel", label: "Cancel button", type: "text", half: true },
      { key: "options", label: "Rewards", type: "options" },
    ],
    defaults: () => ({
      title: "Choose Your Reward",
      body: "Pick one perk for reaching level 5.",
      style: "reward" as PreviewStyle,
      confirmLabel: "Claim",
      cancelLabel: "Later",
      options: [
        { id: uid("op"), label: "Signature Desk", description: "Boosts work performance at home.", emoji: "🪑", value: "§2,400" },
        { id: uid("op"), label: "Networking Perk", description: "Faster relationship gain with coworkers.", emoji: "🤝" },
        { id: uid("op"), label: "Cash Bonus", description: "Immediate payout.", emoji: "💰", value: "§3,000" },
      ],
    }),
  },
  {
    kind: "branch-select",
    label: "Career Branch Selection",
    category: "Career",
    blurb: "Branching promotion. Pulls each branch's own cover art automatically.",
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "body", label: "Prompt", type: "textarea" },
      { key: "careerName", label: "Career", type: "text", half: true },
      { key: "careerLevel", label: "Branch level", type: "number", half: true },
      { key: "branchIds", label: "Branches", type: "branches" },
      { key: "confirmLabel", label: "Confirm button", type: "text", half: true },
    ],
    defaults: () => ({
      title: "Choose Your Path",
      body: "Maya's talent has opened up two very different futures.",
      style: "career" as PreviewStyle,
      careerLevel: 6,
      confirmLabel: "Choose branch",
    }),
  },
  {
    kind: "promotion",
    label: "Promotion Result",
    category: "Career",
    blurb: "Auto-filled from the career level: pay, schedule, unlocks and cover art.",
    fields: [
      { key: "careerName", label: "Career", type: "text", half: true },
      { key: "portraitName", label: "Sim", type: "text", half: true },
      { key: "fromLevel", label: "From level", type: "number", half: true },
      { key: "toLevel", label: "To level", type: "number", half: true },
      { key: "fromTitle", label: "From title", type: "text", half: true },
      { key: "toTitle", label: "New position", type: "text", half: true },
      { key: "pay", label: "Hourly pay", type: "text", half: true },
      { key: "schedule", label: "Schedule", type: "text", half: true },
      { key: "bonus", label: "Bonus", type: "text", half: true },
      { key: "uniform", label: "New uniform", type: "text", half: true },
      { key: "body", label: "Promotion message", type: "textarea" },
      { key: "unlocks", label: "Unlocked objects / rewards", type: "tags" },
      { key: "interactions", label: "Unlocked interactions", type: "tags" },
      { key: "image", label: "Career / branch cover", type: "image" },
    ],
    defaults: () => ({
      title: "You've been promoted!",
      body: "The partners noticed. Maya moves up to Junior Associate.",
      style: "positive" as PreviewStyle,
      careerName: "Corporate Lawyer",
      portraitName: "Maya",
      fromLevel: 3,
      toLevel: 4,
      fromTitle: "Paralegal",
      toTitle: "Junior Associate",
      pay: "62",
      schedule: "Mon–Fri · 09:00 → 17:00",
      bonus: "§1,200",
      uniform: "Tailored Suit",
      unlocks: ["Executive Desk", "Law Library Shelf"],
      interactions: ["Network with Partners", "Work From Home"],
    }),
  },
  {
    kind: "demotion",
    label: "Demotion Result",
    category: "Career",
    blurb: "Same shape as promotion, tuned for setbacks, firing, quitting and retirement.",
    fields: [
      { key: "careerName", label: "Career", type: "text", half: true },
      { key: "portraitName", label: "Sim", type: "text", half: true },
      { key: "fromLevel", label: "From level", type: "number", half: true },
      { key: "toLevel", label: "To level", type: "number", half: true },
      { key: "fromTitle", label: "From title", type: "text", half: true },
      { key: "toTitle", label: "New position", type: "text", half: true },
      { key: "pay", label: "Hourly pay", type: "text", half: true },
      { key: "schedule", label: "Schedule", type: "text", half: true },
      { key: "body", label: "Message", type: "textarea" },
      { key: "unlocks", label: "Lost rewards", type: "tags" },
      { key: "image", label: "Career cover", type: "image" },
    ],
    defaults: () => ({
      title: "You've been demoted",
      body: "Missed deadlines caught up with Maya.",
      style: "negative" as PreviewStyle,
      careerName: "Corporate Lawyer",
      fromLevel: 4,
      toLevel: 3,
      fromTitle: "Junior Associate",
      toTitle: "Paralegal",
      pay: "38",
      schedule: "Mon–Fri · 09:00 → 17:00",
      unlocks: ["Executive Desk"],
    }),
  },
  {
    kind: "invitation",
    label: "Event Invitation",
    category: "Communication",
    blurb: "Another Sim invites the player somewhere.",
    choiceLabel: "Response",
    fields: [
      { key: "callerName", label: "Host", type: "text", half: true },
      { key: "callerRole", label: "Relationship", type: "text", half: true },
      { key: "portrait", label: "Host portrait", type: "portrait" },
      { key: "title", label: "Event", type: "text" },
      { key: "body", label: "Invitation text", type: "textarea" },
      { key: "image", label: "Location art", type: "image" },
      { key: "style", label: "Style", type: "style" },
      { key: "choices", label: "Responses", type: "choices" },
    ],
    defaults: () => ({
      title: "Opening Night Afterparty",
      body: "The whole company is heading to Planet Honey Pop after the show. Come?",
      style: "event" as PreviewStyle,
      callerName: "Kai Mercer",
      callerRole: "Coworker",
      choices: [
        { ...blankChoice("I'll be there!"), outcomeMode: "fixed" as const },
        { ...blankChoice("Maybe next time."), outcomeMode: "fixed" as const },
      ],
    }),
  },
  {
    kind: "tutorial",
    label: "Tutorial / Informational Popup",
    category: "Information",
    blurb: "Explains a mechanic. One dismiss button.",
    fields: [
      { key: "title", label: "Header", type: "text" },
      { key: "body", label: "Explanation", type: "textarea" },
      { key: "image", label: "Header art", type: "image" },
      { key: "icon", label: "Icon emoji", type: "text", half: true },
      { key: "buttons", label: "Dismiss button", type: "tags" },
    ],
    defaults: () => ({
      title: "Chance Cards",
      body: "While at work, your Sim may face a situation only you can resolve. Your choice affects work performance — and sometimes their mood.",
      style: "neutral" as PreviewStyle,
      icon: "🎴",
      buttons: ["Got it"],
    }),
  },
  {
    kind: "milestone",
    label: "Achievement / Milestone Notice",
    category: "Information",
    blurb: "Big progression moment. Strong art emphasis.",
    fields: [
      ...SHARED_HEADER,
      { key: "image", label: "Milestone art", type: "image" },
      { key: "icon", label: "Icon emoji", type: "text", half: true },
      { key: "style", label: "Style", type: "style", half: true },
      { key: "unlocks", label: "Rewards", type: "tags" },
    ],
    defaults: () => ({
      title: "Career Mastered",
      body: "Maya reached the top of the Dance career.",
      style: "reward" as PreviewStyle,
      icon: "🏆",
      unlocks: ["Signature Costume", "Retirement Pension"],
    }),
  },
  {
    kind: "situation",
    label: "Situation / Event Start",
    category: "Selection",
    blurb: "Configure and begin an event: host, guests, location, roles.",
    fields: [
      { key: "title", label: "Event name", type: "text" },
      { key: "body", label: "Description", type: "textarea" },
      { key: "callerName", label: "Host", type: "text", half: true },
      { key: "careerName", label: "Location", type: "text", half: true },
      { key: "options", label: "Roles / guests", type: "options" },
      { key: "confirmLabel", label: "Start button", type: "text", half: true },
      { key: "cancelLabel", label: "Cancel button", type: "text", half: true },
    ],
    defaults: () => ({
      title: "Opening Night",
      body: "Fill the roster and start the performance event.",
      style: "event" as PreviewStyle,
      callerName: "Maya",
      careerName: "Del Sol Theater",
      confirmLabel: "Start Event",
      cancelLabel: "Cancel",
      options: [
        { id: uid("op"), label: "Lead Dancer", description: "Required · 1 Sim" },
        { id: uid("op"), label: "Stage Crew", description: "Optional · up to 3 Sims" },
        { id: uid("op"), label: "Audience", description: "Optional · unlimited" },
      ],
    }),
  },
  {
    kind: "story-question",
    label: "Relationship / Story Question",
    category: "Communication",
    blurb: "Advice and Neighborhood-Stories style conversational decisions.",
    choiceLabel: "Response",
    fields: [
      { key: "portrait", label: "Portrait", type: "portrait", half: true },
      { key: "portraitName", label: "Sim name", type: "text", half: true },
      { key: "title", label: "Subject", type: "text" },
      { key: "body", label: "Conversation", type: "textarea" },
      { key: "style", label: "Style", type: "style" },
      { key: "choices", label: "Responses", type: "choices" },
    ],
    defaults: () => ({
      title: "Should I take the job?",
      body: "\"They offered me the lead role, but it means moving away from everyone. What would you do?\"",
      style: "relationship" as PreviewStyle,
      portraitName: "Ada Nova",
      choices: [
        { ...blankChoice("Take the leap."), outcomeMode: "fixed" as const },
        { ...blankChoice("Stay close to home."), outcomeMode: "fixed" as const },
        { ...blankChoice("Ask for more time."), outcomeMode: "fixed" as const },
      ],
    }),
  },
];

export const TEMPLATE_BY_KIND: Record<PreviewKind, TemplateDef> = TEMPLATES.reduce(
  (acc, t) => {
    acc[t.kind] = t;
    return acc;
  },
  {} as Record<PreviewKind, TemplateDef>,
);

/** Career Builder preview-type dropdown → engine template + overrides. */
export const CAREER_PREVIEW_PRESETS: {
  label: string;
  kind: PreviewKind;
  overrides?: Partial<PreviewDoc>;
}[] = [
  { label: "Notification", kind: "tns" },
  { label: "Career Chance Card", kind: "chance-card" },
  { label: "Phone Call", kind: "phone-call" },
  { label: "Dialogue", kind: "dialog" },
  { label: "Branch Selection", kind: "branch-select" },
  { label: "Picker", kind: "picker" },
  { label: "Promotion", kind: "promotion" },
  { label: "Demotion", kind: "demotion" },
  { label: "Career Event", kind: "situation" },
  { label: "Gig Offer", kind: "phone-call", overrides: { title: "Gig Offer", callerRole: "Client", body: "One night, one stage, double the usual rate. Interested?" } },
  { label: "Gig Result", kind: "milestone", overrides: { title: "Gig Complete", body: "The crowd loved it. Payout and reputation increased.", style: "reward" } },
  { label: "Work From Home Assignment", kind: "picker", overrides: { title: "Choose Today's Assignment", body: "Pick what Maya works on from home." } },
  { label: "Career Reward", kind: "reward-picker" },
  { label: "Career Warning", kind: "tns", overrides: { title: "Performance Warning", body: "One more missed shift and Maya loses this job.", style: "warning", buttons: ["Go to work"] } },
];

export function createDoc(kind: PreviewKind, projectId: string, name?: string): PreviewDoc {
  const t = TEMPLATE_BY_KIND[kind];
  return {
    id: uid("doc"),
    projectId,
    kind,
    name: name ?? t.label,
    title: "",
    body: "",
    style: "neutral",
    updatedAt: Date.now(),
    ...t.defaults(),
  } as PreviewDoc;
}
