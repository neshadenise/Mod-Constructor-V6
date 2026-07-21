import type { LucideIcon } from "lucide-react";
import type { SectionId } from "@/components/mc/sections";
import {
  Briefcase,
  Sparkles,
  Target,
  Bell,
  Package,
  ShieldCheck,
  Boxes,
  Settings as SettingsIcon,
  Wrench,
  FileCode2,
  Copy,
  Search,
  Wand2,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  Sliders,
  RefreshCw,
  Upload,
  Save,
} from "lucide-react";

export type CommandItem = {
  id: string;
  title: string;
  subtitle?: string;
  group: "Create" | "Navigate" | "Build" | "AI" | "Project" | "Tools";
  icon: LucideIcon;
  shortcut?: string;
  keywords?: string[];
  section?: SectionId;
  action: "navigate" | "custom";
};

export type SearchEntry = {
  id: string;
  title: string;
  subtitle?: string;
  kind:
    | "Project"
    | "Career"
    | "Trait"
    | "Aspiration"
    | "Buff"
    | "Notification"
    | "Asset"
    | "Reference"
    | "Validation"
    | "Setting"
    | "Template";
  section: SectionId;
  icon: LucideIcon;
  keywords?: string[];
};

export const COMMANDS: CommandItem[] = [
  // Create
  { id: "cmd.create.career", title: "Create Career", group: "Create", icon: Briefcase, section: "career", action: "navigate", shortcut: "⌘⇧C" },
  { id: "cmd.create.trait", title: "Create Trait", group: "Create", icon: Sparkles, section: "trait", action: "navigate", shortcut: "⌘⇧T" },
  { id: "cmd.create.aspiration", title: "Create Aspiration", group: "Create", icon: Target, section: "aspiration", action: "navigate" },
  { id: "cmd.create.notification", title: "Create Notification", group: "Create", icon: Bell, section: "notifications", action: "navigate" },
  // Navigate
  { id: "nav.dashboard", title: "Go to Dashboard", group: "Navigate", icon: LayoutDashboard, section: "dashboard", action: "navigate", shortcut: "⌘1" },
  { id: "nav.projects", title: "Open Projects", group: "Navigate", icon: FolderKanban, section: "projects", action: "navigate" },
  { id: "nav.assets", title: "Open Assets", group: "Navigate", icon: Boxes, section: "assets", action: "navigate" },
  { id: "nav.exporter", title: "Open Package Exporter", group: "Navigate", icon: Package, section: "exporter", action: "navigate" },
  { id: "nav.queue", title: "Open Build Queue", group: "Navigate", icon: ListChecks, section: "queue", action: "navigate" },
  { id: "nav.tuning", title: "Open Tuning Editor", group: "Navigate", icon: Sliders, section: "tuning", action: "navigate" },
  { id: "nav.validation", title: "Open Validation", group: "Navigate", icon: ShieldCheck, section: "validation", action: "navigate" },
  { id: "nav.settings", title: "Open Settings", group: "Navigate", icon: SettingsIcon, section: "settings", action: "navigate", shortcut: "⌘," },
  // Build
  { id: "build.run", title: "Run Build", group: "Build", icon: RefreshCw, action: "custom", shortcut: "⌘B" },
  { id: "build.export", title: "Export Package", group: "Build", icon: Package, section: "exporter", action: "navigate", shortcut: "⌘E" },
  { id: "build.validate", title: "Validate Project", group: "Build", icon: ShieldCheck, section: "validation", action: "navigate", shortcut: "⌘⇧V" },
  { id: "build.xml", title: "Generate XML", group: "Build", icon: FileCode2, action: "custom" },
  // Project
  { id: "proj.duplicate", title: "Duplicate Branch", group: "Project", icon: Copy, action: "custom" },
  { id: "proj.import", title: "Import Assets", group: "Project", icon: Upload, section: "assets", action: "navigate" },
  { id: "proj.findRefs", title: "Find References", group: "Project", icon: Search, action: "custom" },
  { id: "proj.save", title: "Save Project", group: "Project", icon: Save, action: "custom", shortcut: "⌘S" },
  // AI
  { id: "ai.icon", title: "Generate Icon with AI", group: "AI", icon: Wand2, action: "custom" },
  { id: "ai.description", title: "Improve Description", group: "AI", icon: Wand2, action: "custom" },
  // Tools
  { id: "tool.advanced", title: "Toggle Advanced Mode", group: "Tools", icon: Wrench, action: "custom" },
  { id: "tool.reload", title: "Check lot51 for Updates", group: "Tools", icon: RefreshCw, action: "custom" },
];

// Mock catalog of searchable content (would come from project store in real app)
export const SEARCH_INDEX: SearchEntry[] = [
  { id: "s.proj.epic", title: "Epic Careers Overhaul", subtitle: "Current project · v0.8.2", kind: "Project", section: "projects", icon: FolderKanban },
  { id: "s.proj.witch", title: "Witchcraft Traits Pack", subtitle: "Draft", kind: "Project", section: "projects", icon: FolderKanban },

  { id: "s.career.medic", title: "Field Medic", subtitle: "Career · 10 ranks · 2 branches", kind: "Career", section: "career", icon: Briefcase, keywords: ["hospital", "doctor"] },
  { id: "s.career.chef", title: "Michelin Chef", subtitle: "Career · 12 ranks", kind: "Career", section: "career", icon: Briefcase, keywords: ["food", "cook"] },
  { id: "s.career.artisan", title: "Space Artisan", subtitle: "Career · 8 ranks", kind: "Career", section: "career", icon: Briefcase },

  { id: "s.trait.night", title: "Night Owl", subtitle: "Personality trait", kind: "Trait", section: "trait", icon: Sparkles },
  { id: "s.trait.iron", title: "Iron Will", subtitle: "Gameplay trait", kind: "Trait", section: "trait", icon: Sparkles },

  { id: "s.asp.tycoon", title: "Cosmic Tycoon", subtitle: "Aspiration · 4 tiers", kind: "Aspiration", section: "aspiration", icon: Target },

  { id: "s.buff.focus", title: "Deep Focus", subtitle: "Buff · +2 confident · 4h", kind: "Buff", section: "trait", icon: Sparkles },
  { id: "s.buff.tired", title: "Overtime Fatigue", subtitle: "Buff · +2 tense · 6h", kind: "Buff", section: "career", icon: Sparkles },

  { id: "s.notif.promo", title: "Promotion Popup", subtitle: "Notification template", kind: "Notification", section: "notifications", icon: Bell },
  { id: "s.notif.wfh", title: "Work-From-Home Nudge", subtitle: "Notification template", kind: "Notification", section: "notifications", icon: Bell },
  { id: "s.notif.aspirationDone", title: "Aspiration Complete", subtitle: "Notification template", kind: "Notification", section: "notifications", icon: Bell },

  { id: "s.asset.badge", title: "career_medic_badge.png", subtitle: "Icon · 128×128", kind: "Asset", section: "assets", icon: Boxes },
  { id: "s.asset.hero", title: "career_chef_hero.png", subtitle: "Cover · 512×256", kind: "Asset", section: "assets", icon: Boxes },
  { id: "s.asset.uniform", title: "medic_uniform_f.stbl", subtitle: "Reference sheet", kind: "Asset", section: "assets", icon: Boxes },

  { id: "s.ref.corelib", title: "@lot51.corelib.1.108", subtitle: "Framework reference", kind: "Reference", section: "settings", icon: FileCode2 },

  { id: "s.val.tuning", title: "Missing tuning ID (rank 6)", subtitle: "Warning · Career Builder", kind: "Validation", section: "validation", icon: ShieldCheck },
  { id: "s.val.icon", title: "Icon reference not found", subtitle: "Error · Trait Builder", kind: "Validation", section: "validation", icon: ShieldCheck },
  { id: "s.val.string", title: "Untranslated string", subtitle: "Warning · Aspiration Builder", kind: "Validation", section: "validation", icon: ShieldCheck },

  { id: "s.set.install", title: "Sims 4 Installation Paths", subtitle: "Settings", kind: "Setting", section: "settings", icon: SettingsIcon },
  { id: "s.set.mode", title: "Interface Mode (Simple/Advanced)", subtitle: "Settings", kind: "Setting", section: "settings", icon: SettingsIcon },
  { id: "s.set.provider", title: "Image Generation Provider", subtitle: "Settings", kind: "Setting", section: "settings", icon: SettingsIcon },

  { id: "s.tpl.career.retail", title: "Retail Career (starter)", subtitle: "Career template", kind: "Template", section: "career", icon: Briefcase },
  { id: "s.tpl.trait.hobby", title: "Hobby Trait Bundle", subtitle: "Trait template", kind: "Template", section: "trait", icon: Sparkles },
];
