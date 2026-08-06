/**
 * Project Health scoring.
 *
 * Health answers one question: "if I export this mod right now, how likely is
 * it to work correctly and be maintainable?" — it is deliberately NOT a
 * completion percentage. Optional polish (icons, translations, outfits) can
 * only ever cost a few points; things that make a package fail to load
 * (broken tuning, duplicate instance IDs, unresolved references, missing
 * required resources, failed exports) dominate the score.
 *
 * Pure functions over AppState slices — no UI, no side effects.
 */
import type { BuildJob, ID } from "./types";
import type { DerivedIssue, ProjectScope } from "./project-analysis";
import type { SectionId } from "@/components/mc/sections";

/* ------------------------------ Model ---------------------------------- */

export type HealthCategoryId =
  | "errors"
  | "warnings"
  | "completion"
  | "assets"
  | "compatibility"
  | "testing"
  | "organization";

export interface HealthCategory {
  id: HealthCategoryId;
  label: string;
  /** Contribution weight, 0-1. All weights sum to 1. */
  weight: number;
  /** 0-100 score for this category alone. */
  score: number;
  /** One-line plain-language readout, e.g. "0 errors" or "Passed". */
  summary: string;
  /** What this category measures — shown as help text. */
  measures: string;
}

export type FindingSeverity = "critical" | "warning" | "suggestion";

export interface HealthFinding {
  id: string;
  severity: FindingSeverity;
  category: HealthCategoryId;
  /** Short actionable headline. */
  title: string;
  /** How to fix it. */
  fix?: string;
  /** Where clicking this finding should take the user. */
  section: SectionId;
  /** Record to open in the destination builder, when applicable. */
  record?: { kind: "career" | "trait" | "aspiration" | "notification"; id: ID };
}

export type HealthGrade = "excellent" | "healthy" | "attention" | "critical";

export interface HealthReport {
  /** Weighted overall score, 0-100. */
  score: number;
  grade: HealthGrade;
  gradeLabel: string;
  /** CSS colour token for the grade. */
  color: string;
  categories: HealthCategory[];
  findings: HealthFinding[];
  counts: { critical: number; warning: number; suggestion: number };
  /** Breakdown-card readouts. */
  readouts: {
    errors: number;
    warnings: number;
    assetsPct: number;
    compatibilityPct: number;
    testing: "passed" | "failed" | "untested";
    localizationPct: number;
    organization: string;
  };
  /** True when nothing blocks a working export. */
  exportSafe: boolean;
}

export const HEALTH_WEIGHTS: Record<HealthCategoryId, number> = {
  errors: 0.35,
  warnings: 0.15,
  completion: 0.15,
  assets: 0.1,
  compatibility: 0.1,
  testing: 0.1,
  organization: 0.05,
};

const GRADES: { grade: HealthGrade; min: number; label: string; color: string }[] = [
  { grade: "excellent", min: 90, label: "Excellent", color: "var(--green)" },
  { grade: "healthy", min: 75, label: "Healthy", color: "var(--green)" },
  { grade: "attention", min: 50, label: "Needs Attention", color: "var(--orange)" },
  { grade: "critical", min: 0, label: "Critical", color: "var(--red, #ef4444)" },
];

export function gradeFor(score: number) {
  return GRADES.find((g) => score >= g.min) ?? GRADES[GRADES.length - 1];
}

/* ------------------------------ Scoring -------------------------------- */

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Which builder section owns a validation issue. */
function sectionForScope(scope: DerivedIssue["scope"]): SectionId {
  switch (scope) {
    case "career": return "career";
    case "trait": return "trait";
    case "aspiration": return "aspiration";
    case "asset": return "assets";
    default: return "projects";
  }
}

function recordFor(issue: DerivedIssue): HealthFinding["record"] {
  const id = issue.recordId;
  if (!id) return undefined;
  if (issue.scope === "career" || issue.scope === "trait" || issue.scope === "aspiration") {
    return { kind: issue.scope, id };
  }
  return undefined;
}

export interface HealthInput {
  scope: ProjectScope;
  issues: DerivedIssue[];
  /** Build/export history for this project, newest first is not required. */
  builds?: BuildJob[];
}

export function computeProjectHealth({ scope, issues, builds = [] }: HealthInput): HealthReport {
  const { project, careers, traits, aspirations, assets, packModules } = scope;
  const findings: HealthFinding[] = [];

  /* ---- 1. Errors (35%) — blocking problems -------------------------- */
  const errorIssues = issues.filter((i) => i.severity === "error");
  errorIssues.forEach((i, n) => {
    findings.push({
      id: `err-${n}`,
      severity: "critical",
      category: "errors",
      title: i.message,
      fix: i.suggestion,
      section: sectionForScope(i.scope),
      record: recordFor(i),
    });
  });
  const errorScore = clamp(100 - errorIssues.length * 34);

  /* ---- 2. Warnings (15%) — polish, never fatal ---------------------- */
  const warnIssues = issues.filter((i) => i.severity === "warning");
  warnIssues.forEach((i, n) => {
    findings.push({
      id: `warn-${n}`,
      severity: "warning",
      category: "warnings",
      title: i.message,
      fix: i.suggestion,
      section: sectionForScope(i.scope),
      record: recordFor(i),
    });
  });
  const warnScore = clamp(100 - warnIssues.length * 7);

  issues
    .filter((i) => i.severity === "info")
    .forEach((i, n) => {
      findings.push({
        id: `info-${n}`,
        severity: "suggestion",
        category: "warnings",
        title: i.message,
        fix: i.suggestion,
        section: sectionForScope(i.scope),
        record: recordFor(i),
      });
    });

  /* ---- 3. Completion (15%) — required builder content --------------- */
  const records = [...careers, ...traits, ...aspirations];
  let filled = 0;
  let total = 0;
  const need = (ok: boolean) => { total++; if (ok) filled++; };

  for (const c of careers) {
    need(!!(c.name ?? "").trim());
    need((c.branches ?? []).some((b) => (b.levels ?? []).length > 0));
    need((c.branches ?? []).every((b) => (b.levels ?? []).every((l) => (l.title ?? "").trim() && (l.salary ?? 0) > 0)));
    const incomplete = (c.branches ?? []).flatMap((b) =>
      (b.levels ?? []).filter((l) => !(l.title ?? "").trim() || (l.salary ?? 0) <= 0).map((l) => ({ b, l })),
    );
    if (incomplete.length) {
      findings.push({
        id: `complete-career-${c.id}`,
        severity: "warning",
        category: "completion",
        title: `${incomplete.length} career level${incomplete.length === 1 ? "" : "s"} incomplete in "${c.name}"`,
        fix: "Every rank needs a title and a daily salary before it reads correctly in game.",
        section: "career",
        record: { kind: "career", id: c.id },
      });
    }
  }
  for (const t of traits) {
    need(!!(t.name ?? "").trim());
    need((t.buffs ?? []).length > 0);
  }
  for (const a of aspirations) {
    need(!!(a.name ?? "").trim());
    need((a.milestones ?? []).length > 0);
    need((a.milestones ?? []).every((m) => (m.objectives ?? []).length > 0));
  }
  const completionScore = total === 0 ? 0 : clamp((filled / total) * 100);
  if (records.length === 0) {
    findings.push({
      id: "complete-empty",
      severity: "warning",
      category: "completion",
      title: "This project has no content yet",
      fix: "Add a career, trait, or aspiration — or start from a template.",
      section: "templates",
    });
  }

  /* ---- 4. Assets (10%) — icons, thumbnails, resources --------------- */
  const assetIds = new Set(assets.map((a) => a.id));
  const iconRefs = records.map((r) => ({ r, id: r.iconAssetId })).filter((x) => x.id);
  const brokenRefs = iconRefs.filter((x) => !assetIds.has(x.id!));
  const withIcon = iconRefs.length - brokenRefs.length;
  // Unresolved references are fatal to a package: they cost the whole category.
  // Simply *not having* an optional icon costs a fraction.
  const missingIcons = records.length - iconRefs.length;
  const assetScore = records.length === 0
    ? 100
    : clamp(100 - brokenRefs.length * 40 - (missingIcons / records.length) * 15);
  for (const x of brokenRefs) {
    findings.push({
      id: `asset-broken-${x.r.id}`,
      severity: "critical",
      category: "assets",
      title: `"${x.r.name}" points at a missing image resource`,
      fix: "Re-pick an icon from the Icon Library, or re-import the asset.",
      section: "icons",
    });
  }
  if (missingIcons > 0) {
    findings.push({
      id: "asset-missing-icons",
      severity: "suggestion",
      category: "assets",
      title: `${missingIcons} item${missingIcons === 1 ? "" : "s"} have no custom icon`,
      fix: "Optional — the game falls back to a default icon. Generate one in the Icon Library.",
      section: "icons",
    });
  }
  const oversized = assets.filter((a) => a.sizeBytes > 2_000_000);
  if (oversized.length) {
    findings.push({
      id: "asset-oversized",
      severity: "suggestion",
      category: "organization",
      title: `Compress ${oversized.length} oversized asset${oversized.length === 1 ? "" : "s"}`,
      fix: `${oversized.map((a) => a.name).slice(0, 3).join(", ")} exceed 2 MB.`,
      section: "assets",
    });
  }

  /* ---- 5. Compatibility (10%) — packs, ages, frameworks ------------- */
  const gateable = [...careers, ...traits];
  const gated = gateable.filter((r) => (r.ageGates ?? []).length > 0).length;
  let compatibility = gateable.length === 0 ? 100 : clamp((gated / gateable.length) * 100);
  if (!/^\d+\.\d+/.test(project.version ?? "")) {
    compatibility = clamp(compatibility - 10);
    findings.push({
      id: "compat-version",
      severity: "warning",
      category: "compatibility",
      title: "Project version is not a semantic version",
      fix: 'Use a MAJOR.MINOR.PATCH version like "1.0.0" so updates can be compared.',
      section: "projects",
    });
  }
  for (const r of gateable.filter((x) => (x.ageGates ?? []).length === 0)) {
    findings.push({
      id: `compat-age-${r.id}`,
      severity: "warning",
      category: "compatibility",
      title: `"${r.name}" is not available to any age group`,
      fix: "Pick at least one age gate, or the game will never offer it.",
      section: "careers" in r ? "career" : "trait",
    });
  }
  const requiredPacks = new Set(packModules.map((m) => m.requiredPack).filter(Boolean) as string[]);
  const compatibilityScore = compatibility;

  /* ---- 6. Testing (10%) — has it actually exported? ----------------- */
  const projectBuilds = builds.filter((b) => b.projectId === project.id);
  const lastFinished = [...projectBuilds]
    .filter((b) => b.status === "success" || b.status === "failed")
    .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))[0];
  let testingScore = 25;
  let testing: HealthReport["readouts"]["testing"] = "untested";
  if (lastFinished?.status === "success") {
    const stale = (lastFinished.finishedAt ?? 0) < (project.updatedAt ?? 0);
    testingScore = stale ? 65 : 100;
    testing = "passed";
    if (stale) {
      findings.push({
        id: "testing-stale",
        severity: "suggestion",
        category: "testing",
        title: "Project changed since the last successful export",
        fix: "Run the export again so the validated package matches your current content.",
        section: "exporter",
      });
    }
  } else if (lastFinished?.status === "failed") {
    testingScore = 0;
    testing = "failed";
    findings.push({
      id: "testing-failed",
      severity: "critical",
      category: "testing",
      title: "The last export failed",
      fix: lastFinished.error ?? "Open the Export Center and re-run to see the failure log.",
      section: "exporter",
    });
  } else {
    findings.push({
      id: "testing-untested",
      severity: "warning",
      category: "testing",
      title: "This project has never been exported",
      fix: "Run an export — the pipeline reopens and verifies every generated file.",
      section: "exporter",
    });
  }

  /* ---- 7. Organization (5%) — tidy project, no orphans -------------- */
  const referenced = new Set(records.map((r) => r.iconAssetId).filter(Boolean) as string[]);
  const unused = assets.filter((a) => !referenced.has(a.id) && a.kind !== "package" && a.kind !== "script");
  const rootAssets = assets.filter((a) => (a.folder ?? "/") === "/");
  let organizationScore = clamp(
    100 - Math.min(40, unused.length * 5) - Math.min(20, rootAssets.length * 2),
  );
  if (assets.length === 0) organizationScore = 100;
  if (unused.length) {
    findings.push({
      id: "org-unused",
      severity: "suggestion",
      category: "organization",
      title: `${unused.length} unused asset${unused.length === 1 ? "" : "s"} in this project`,
      fix: "Remove them, or attach them to a record — unused files still ship in the package.",
      section: "assets",
    });
  }
  if (rootAssets.length > 4) {
    findings.push({
      id: "org-root",
      severity: "suggestion",
      category: "organization",
      title: `${rootAssets.length} assets sit in the project root`,
      fix: "Group them into folders (Icons, Images, Scripts) to keep the package maintainable.",
      section: "explorer",
    });
  }

  /* ---- Localization readout (strings coverage) ---------------------- */
  let strings = 0;
  let stringsFilled = 0;
  const str = (v?: string) => { strings++; if ((v ?? "").trim()) stringsFilled++; };
  for (const r of records) { str(r.name); str(r.description); }
  for (const c of careers) for (const b of c.branches ?? []) for (const l of b.levels ?? []) str(l.title);
  for (const t of traits) for (const b of t.buffs ?? []) str(b.name);
  for (const a of aspirations) for (const m of a.milestones ?? []) str(m.name);
  const localizationPct = strings === 0 ? 0 : clamp((stringsFilled / strings) * 100);

  /* ---- Weighted roll-up --------------------------------------------- */
  const categories: HealthCategory[] = [
    {
      id: "errors", label: "Errors", weight: HEALTH_WEIGHTS.errors, score: errorScore,
      summary: errorIssues.length === 0 ? "No errors" : `${errorIssues.length} blocking error${errorIssues.length === 1 ? "" : "s"}`,
      measures: "Missing required data, broken references, invalid or duplicate tuning IDs, failed validation",
    },
    {
      id: "warnings", label: "Warnings", weight: HEALTH_WEIGHTS.warnings, score: warnScore,
      summary: warnIssues.length === 0 ? "No warnings" : `${warnIssues.length} warning${warnIssues.length === 1 ? "" : "s"}`,
      measures: "Empty descriptions, missing icons, optional assets, deprecated settings",
    },
    {
      id: "completion", label: "Completion", weight: HEALTH_WEIGHTS.completion, score: completionScore,
      summary: `${completionScore}% of required fields`,
      measures: "Required builder content: career levels, buffs, milestones, objectives",
    },
    {
      id: "assets", label: "Assets", weight: HEALTH_WEIGHTS.assets, score: assetScore,
      summary: brokenRefs.length ? `${brokenRefs.length} broken reference${brokenRefs.length === 1 ? "" : "s"}` : `${withIcon}/${records.length || 0} with icons`,
      measures: "Icons, thumbnails, package resources and strings resolve to real files",
    },
    {
      id: "compatibility", label: "Compatibility", weight: HEALTH_WEIGHTS.compatibility, score: compatibilityScore,
      summary: requiredPacks.size ? `${requiredPacks.size} pack requirement${requiredPacks.size === 1 ? "" : "s"}` : "Base game only",
      measures: "Pack requirements, game version, age gates and framework dependencies",
    },
    {
      id: "testing", label: "Testing", weight: HEALTH_WEIGHTS.testing, score: testingScore,
      summary: testing === "passed" ? "Export verified" : testing === "failed" ? "Last export failed" : "Never exported",
      measures: "Successfully exported, package reopens and validates",
    },
    {
      id: "organization", label: "Organization", weight: HEALTH_WEIGHTS.organization, score: organizationScore,
      summary: organizationScore >= 90 ? "Excellent" : organizationScore >= 70 ? "Tidy" : "Cluttered",
      measures: "Clean folder structure, no unused assets or orphaned files",
    },
  ];

  const score = clamp(categories.reduce((sum, c) => sum + c.score * c.weight, 0));
  const g = gradeFor(score);

  const counts = {
    critical: findings.filter((f) => f.severity === "critical").length,
    warning: findings.filter((f) => f.severity === "warning").length,
    suggestion: findings.filter((f) => f.severity === "suggestion").length,
  };

  const order: Record<FindingSeverity, number> = { critical: 0, warning: 1, suggestion: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);

  return {
    score,
    grade: g.grade,
    gradeLabel: g.label,
    color: g.color,
    categories,
    findings,
    counts,
    readouts: {
      errors: errorIssues.length,
      warnings: warnIssues.length,
      assetsPct: assetScore,
      compatibilityPct: compatibilityScore,
      testing,
      localizationPct,
      organization: organizationScore >= 90 ? "Excellent" : organizationScore >= 70 ? "Tidy" : "Cluttered",
    },
    exportSafe: counts.critical === 0,
  };
}

/** Empty report used when no project is selected. */
export function emptyHealthReport(): HealthReport {
  return {
    score: 0,
    grade: "critical",
    gradeLabel: "No project",
    color: "var(--muted-foreground)",
    categories: [],
    findings: [],
    counts: { critical: 0, warning: 0, suggestion: 0 },
    readouts: {
      errors: 0, warnings: 0, assetsPct: 0, compatibilityPct: 0,
      testing: "untested", localizationPct: 0, organization: "—",
    },
    exportSafe: false,
  };
}
