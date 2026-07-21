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
  | "templates"
  | "snippets"
  | "graph"
  | "timeline"
  | "analytics"
  | "updates"
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
  templates: "Templates",
  snippets: "Snippets",
  graph: "Dependency Graph",
  timeline: "Activity Timeline",
  analytics: "Build Analytics",
  updates: "Update Center",
  settings: "Settings",
};
