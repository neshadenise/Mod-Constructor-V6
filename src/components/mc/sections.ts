export type SectionId =
  | "dashboard"
  | "projects"
  | "career"
  | "trait"
  | "aspiration"
  | "notifications"
  | "tuning"
  | "assets"
  | "validation"
  | "queue"
  | "settings";

export const SECTION_LABEL: Record<SectionId, string> = {
  dashboard: "Dashboard",
  projects: "Projects",
  career: "Career Builder",
  trait: "Trait Builder",
  aspiration: "Aspiration Builder",
  notifications: "Notification Library",
  tuning: "Tuning Editor",
  assets: "Assets",
  validation: "Validation",
  queue: "Build Queue",
  settings: "Settings",
};
