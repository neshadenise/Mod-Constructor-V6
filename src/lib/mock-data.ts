export type NodeType = "career" | "job" | "trait" | "aspiration" | "interaction" | "logic";

export interface CanvasNode {
  id: string;
  type: NodeType;
  title: string;
  subtitle: string;
  x: number;
  y: number;
}

export interface CanvasEdge {
  from: string;
  to: string;
}

export const initialNodes: CanvasNode[] = [
  { id: "n1", type: "career", title: "Career Branch", subtitle: "Tech Innovator", x: 40, y: 60 },
  { id: "n2", type: "job", title: "Job", subtitle: "Systems Architect", x: 300, y: 40 },
  { id: "n3", type: "trait", title: "Trait", subtitle: "Quick Learner", x: 300, y: 180 },
  { id: "n4", type: "aspiration", title: "Aspiration", subtitle: "Mastermind", x: 560, y: 60 },
  { id: "n5", type: "interaction", title: "Interaction", subtitle: "Mentor", x: 560, y: 200 },
  { id: "n6", type: "logic", title: "Requirement Logic", subtitle: "IF level ≥ 5 AND trait", x: 300, y: 320 },
];

export const initialEdges: CanvasEdge[] = [
  { from: "n1", to: "n2" },
  { from: "n1", to: "n3" },
  { from: "n2", to: "n4" },
  { from: "n3", to: "n5" },
  { from: "n2", to: "n6" },
  { from: "n3", to: "n6" },
];

export const templates = [
  { name: "Career: Corporate Ladder", type: "Career", updated: "2d ago", color: "info" },
  { name: "Trait Pack: Bookworm+", type: "Trait", updated: "5d ago", color: "violet" },
  { name: "Aspiration: World Traveler", type: "Aspiration", updated: "1w ago", color: "primary" },
  { name: "Interaction: Debate Club", type: "Interaction", updated: "2w ago", color: "warning" },
];

export const buildQueue = [
  { name: "Epic Careers Overhaul", status: "building", progress: 65 },
  { name: "trait-expansion-addon", status: "queued", progress: 0 },
];

export const buildSteps = [
  { name: "Validate Package", state: "done" as const },
  { name: "Process Modules", state: "done" as const },
  { name: "Compile Scripts", state: "done" as const },
  { name: "Merge Assets", state: "done" as const },
  { name: "Generate Package", state: "active" as const },
  { name: "Sign & Finalize", state: "pending" as const },
];

export const dependencies = [
  { name: "MC Script API", version: "v3.4.1", status: "satisfied" as const, required: true },
  { name: "Core Gameplay Pack", version: "v1.12", status: "satisfied" as const, required: true },
  { name: "UI Framework", version: "v2.0", status: "satisfied" as const, required: true },
  { name: "Animation Library", version: "v0.8", status: "optional" as const, required: false },
];

export const initialLogs = [
  { t: "14:22:04", level: "INFO", msg: "Loaded project Epic Careers Overhaul" },
  { t: "14:22:05", level: "INFO", msg: "Resolved 3 dependencies" },
  { t: "14:22:11", level: "WARN", msg: "Trait 'Quick Learner' overlaps with base game trait" },
  { t: "14:22:14", level: "INFO", msg: "Compiling module: careers/tech_innovator.py" },
  { t: "14:22:19", level: "SUCCESS", msg: "Compiled 12/18 modules" },
  { t: "14:22:24", level: "INFO", msg: "Merging asset atlas (2.4 MB)" },
  { t: "14:22:31", level: "WARN", msg: "Icon dimensions non-square: mentor.png" },
  { t: "14:22:38", level: "INFO", msg: "Generating package manifest…" },
];
