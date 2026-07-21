export type SectionId =
  | "dashboard"
  | "projects"
  | "explorer"
  | "career"
  | "trait"
  | "aspiration"
  | "notifications"
  | "tuning"
  | "assets"
  | "reference"
  | "exporter"
  | "validation"
  | "queue"
  | "settings";

export const SECTION_LABEL: Record<SectionId, string> = {
  dashboard: "Dashboard",
  projects: "Projects",
  explorer: "Project Explorer",
  career: "Career Builder",
  trait: "Trait Builder",
  aspiration: "Aspiration Builder",
  notifications: "Notification Library",
  tuning: "Tuning Editor",
  assets: "Assets",
  reference: "Reference Viewer",
  exporter: "Package Exporter",
  validation: "Validation Center",
  queue: "Build Queue",
  settings: "Settings",
};
