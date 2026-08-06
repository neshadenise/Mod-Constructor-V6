export type SectionId =
  | "dashboard"
  | "projects"
  | "explorer"
  | "career"
  | "trait"
  | "aspiration"
  | "dynasty"
  | "notifications"
  | "tuning"
  | "icons"
  | "assets"
  | "reference"
  | "gamedata"
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
  dynasty: "Custom Dynasty Builder",
  notifications: "Notification Library",
  tuning: "Tuning Editor",
  icons: "Icon Library",
  assets: "Project Assets",
  reference: "Reference Viewer",
  gamedata: "Game Data",
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

