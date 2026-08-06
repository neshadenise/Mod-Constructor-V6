export type SectionId =
  | "dashboard"
  | "projects"
  | "explorer"
  | "career"
  | "trait"
  | "aspiration"
  | "notifications"
  | "tuning"
  | "icons"
  | "assets"
  | "reference"
  | "exporter"
  | "importer"
  | "validation"
  | "queue"
  | "templates"
  | "snippets"
  | "graph"
  | "timeline"
  | "analytics"
  | "updates"
  | "community"
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
  icons: "Icon Library",
  assets: "Project Assets",
  reference: "Reference Viewer",
  exporter: "Package Exporter",
  importer: "Mod Importer",
  validation: "Validation Center",
  queue: "Build Queue",
  templates: "Templates",
  snippets: "Snippets",
  graph: "Dependency Graph",
  timeline: "Activity Timeline",
  analytics: "Build Analytics",
  updates: "Update Center",
  community: "Community Library",
  settings: "Settings",
};

