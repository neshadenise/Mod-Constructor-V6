/**
 * Shared data contracts for Mod Constructor V6.
 *
 * Every UI action MUST read from and write to these types via the central
 * store (src/lib/store.tsx). Components must not maintain unrelated
 * long-lived state locally — transient inputs (draft text) are fine.
 *
 * Codex: these interfaces are the wire format between the UI, the local
 * storage adapter, exported bundles (.mcbundle.json), and any future native
 * / cloud backend.
 */

export type ID = string;
export type Timestamp = number; // ms since epoch
export type ISODate = string;

/* -------------------------- Project ---------------------------------- */

export interface Project {
  id: ID;
  name: string;
  author: string;
  description: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** IDs of records that belong to this project. */
  careerIds: ID[];
  traitIds: ID[];
  aspirationIds: ID[];
  notificationIds: ID[];
  assetIds: ID[];
  /** Free-form tags for filtering. */
  tags: string[];
  favorite: boolean;
}

export interface ProjectBundle {
  version: 2;
  exportedAt: Timestamp;
  exportedFrom: "chatgpt" | "desktop" | "web";
  project: Project;
  careers: Career[];
  traits: Trait[];
  aspirations: Aspiration[];
  notifications: NotificationTemplate[];
  assets: Asset[];
  /** Global libraries the project depends on but doesn't own. */
  templates?: Template[];
  snippets?: Snippet[];
}

/* -------------------------- Career ----------------------------------- */

export type AgeGate = "teen" | "young-adult" | "adult" | "elder";

export interface Career {
  id: ID;
  projectId: ID;
  name: string;
  internalId: string; // hex/underscore identifier
  description: string;
  careerType: "standard" | "part-time" | "freelance" | "active" | "military";
  ageGates: AgeGate[];
  iconAssetId?: ID;
  branches: CareerBranch[];
  messageOverrides: CareerMessage[];
  workFromHomeEvents: WFHEvent[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CareerBranch {
  id: ID;
  name: string;
  description: string;
  levels: CareerLevel[];
  rewardTraitId?: ID;
}

export interface CareerLevel {
  id: ID;
  rank: number;
  title: string;
  salary: number;
  workStart: string; // "09:00"
  workEnd: string; // "17:00"
  workDays: ("mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun")[];
  uniformMasculine?: ID; // asset id
  uniformFeminine?: ID;
  objectives: string[];
  perks: string[];
}

export interface CareerMessage {
  key: string; // "promotion", "demotion", "dailyReport", ...
  text: string;
}

export interface WFHEvent {
  id: ID;
  name: string;
  weight: number;
  outcomes: string[];
}

/* -------------------------- Trait ------------------------------------ */

export type TraitCategory = "personality" | "gameplay" | "lifestyle" | "bonus";
export type EmotionalWeight = "flirty" | "happy" | "sad" | "angry" | "confident" | "focused" | "playful" | "uncomfortable" | "bored" | "energized" | "inspired" | "dazed" | "embarrassed" | "asleep" | "fine";

export interface Trait {
  id: ID;
  projectId: ID;
  name: string;
  internalId: string;
  description: string;
  category: TraitCategory;
  ageGates: AgeGate[];
  iconAssetId?: ID;
  buffs: Buff[];
  socialInteractions: string[];
  buffReplacements: { from: string; to: string }[];
  commodityWeights: { commodity: string; weight: number }[];
  blockedAges: AgeGate[];
  blockedEmotions: EmotionalWeight[];
  voiceEffect?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Buff {
  id: ID;
  name: string;
  description: string;
  emotion: EmotionalWeight;
  weight: number;
  durationHours: number;
  iconAssetId?: ID;
}

/* -------------------------- Aspiration ------------------------------- */

export interface Aspiration {
  id: ID;
  projectId: ID;
  name: string;
  internalId: string;
  description: string;
  category: string;
  iconAssetId?: ID;
  milestones: Milestone[];
  rewardTraitId?: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Milestone {
  id: ID;
  order: number;
  name: string;
  description: string;
  objectives: string[];
}

/* -------------------------- Notification ----------------------------- */

export type NotificationVisual = "toast" | "modal" | "banner" | "milestone" | "phone";

export interface NotificationTemplate {
  id: ID;
  projectId: ID;
  name: string;
  visual: NotificationVisual;
  title: string;
  body: string;
  iconAssetId?: ID;
  /** Optional preview style tag used by the in-app Notification Library. */
  previewKind?:
    | "success" | "warning" | "error" | "info"
    | "promotion" | "reward" | "relationship"
    | "buff" | "trait" | "career" | "aging";
  actions: { label: string; kind: "primary" | "secondary" | "dismiss" }[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/* -------------------------- Asset ------------------------------------ */

export type AssetKind = "icon" | "image" | "audio" | "other";

export interface Asset {
  id: ID;
  projectId?: ID; // undefined = global library
  name: string;
  folder: string; // "/", "/Icons", "/Uniforms"
  kind: AssetKind;
  /** data URL for portable prototype storage; Codex will replace with file paths. */
  dataUrl?: string;
  /** Original file path when the desktop app has real filesystem access. */
  filePath?: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  tags: string[];
  favorite: boolean;
  source: "upload" | "generated" | "imported" | "library";
  createdAt: Timestamp;
}

/* -------------------------- Template / Snippet ----------------------- */

export type TemplateKind = "Career" | "Trait" | "Aspiration" | "Notification";

export interface Template {
  id: ID;
  name: string;
  kind: TemplateKind;
  author: string;
  summary: string;
  official: boolean;
  custom: boolean;
  /** Serialized record body used when the user scaffolds from this template. */
  payload: unknown;
  rating: number;
  installs: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Snippet {
  id: ID;
  name: string;
  category: string;
  language: "xml" | "python" | "text";
  body: string;
  tags: string[];
  favorite: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/* -------------------------- Validation ------------------------------- */

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationIssue {
  id: ID;
  severity: ValidationSeverity;
  message: string;
  scope: "project" | "career" | "trait" | "aspiration" | "asset" | "tuning";
  recordId?: ID;
  field?: string;
  suggestion?: string;
  dismissed: boolean;
  createdAt: Timestamp;
}

/* -------------------------- Build Queue ------------------------------ */

export type BuildStatus = "queued" | "running" | "success" | "failed" | "cancelled";

export interface BuildJob {
  id: ID;
  projectId: ID;
  label: string;
  status: BuildStatus;
  /** 0-100 for simulated frontend jobs; real engine reports real progress. */
  progress: number;
  startedAt?: Timestamp;
  finishedAt?: Timestamp;
  log: string[];
  outputPath?: string; // set by real engine only
  error?: string;
}

/* -------------------------- Notifications (in-app) ------------------- */

export interface AppNotification {
  id: ID;
  title: string;
  body: string;
  level: "info" | "success" | "warning" | "error";
  createdAt: Timestamp;
  read: boolean;
  actionLabel?: string;
  actionRoute?: string;
}

/* -------------------------- Activity Timeline ------------------------ */

export interface ActivityEvent {
  id: ID;
  kind: "create" | "update" | "delete" | "build" | "export" | "import";
  entityType: "project" | "career" | "trait" | "aspiration" | "asset" | "template" | "snippet";
  entityId?: ID;
  summary: string;
  createdAt: Timestamp;
}

/* -------------------------- App Settings ----------------------------- */

export interface AppSettings {
  advancedMode: boolean;
  theme: "light" | "dark" | "system";
  simsInstallPath?: string;
  modsFolderPath?: string;
  autoUpdate: boolean;
  autosaveIntervalSec: number;
  confirmBeforeCompile: boolean;
  showHexIds: boolean;
  validateOnSave: boolean;
  crashReports: boolean;
}

/* -------------------------- Store shape ------------------------------ */

export interface AppState {
  projects: Project[];
  activeProjectId?: ID;
  careers: Career[];
  traits: Trait[];
  aspirations: Aspiration[];
  notifications: NotificationTemplate[];
  assets: Asset[];
  templates: Template[];
  snippets: Snippet[];
  validation: ValidationIssue[];
  builds: BuildJob[];
  appNotifications: AppNotification[];
  activity: ActivityEvent[];
  settings: AppSettings;
  recent: ID[]; // recently opened record IDs (mixed types)
  favorites: ID[];
  version: 2;
}
