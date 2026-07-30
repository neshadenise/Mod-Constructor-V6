/**
 * Live project analysis used by the Dashboard.
 *
 * Pure functions over AppState — no UI, no side effects. The desktop engine
 * can replace these with real compile-time checks; the shapes stay identical.
 */
import type { AppState, ID, Project, ValidationIssue } from "./types";

export type DerivedIssue = Omit<ValidationIssue, "id" | "createdAt" | "dismissed">;

export interface ProjectScope {
  project: Project;
  careers: AppState["careers"];
  traits: AppState["traits"];
  aspirations: AppState["aspirations"];
  notifications: AppState["notifications"];
  assets: AppState["assets"];
  packModules: AppState["packModules"];
}

export function scopeProject(state: AppState, projectId: ID | undefined): ProjectScope | null {
  const project = state.projects.find((p) => p.id === projectId);
  if (!project) return null;
  return {
    project,
    careers: state.careers.filter((r) => r.projectId === project.id),
    traits: state.traits.filter((r) => r.projectId === project.id),
    aspirations: state.aspirations.filter((r) => r.projectId === project.id),
    notifications: state.notifications.filter((r) => r.projectId === project.id),
    assets: state.assets.filter((r) => r.projectId === project.id),
    packModules: (state.packModules ?? []).filter((r) => r.projectId === project.id),
  };
}

/* ------------------------------ Validation ----------------------------- */

export function analyzeProject(scope: ProjectScope): DerivedIssue[] {
  const out: DerivedIssue[] = [];
  const { project, careers, traits, aspirations, assets } = scope;

  if (!project.description.trim()) {
    out.push({
      severity: "warning", scope: "project", recordId: project.id, field: "description",
      message: "Project has no description",
      suggestion: "Add a short summary — it ships in the package manifest.",
    });
  }
  if (!project.author.trim()) {
    out.push({
      severity: "warning", scope: "project", recordId: project.id, field: "author",
      message: "Project has no author set",
      suggestion: "Set an author so downloads credit you.",
    });
  }
  if (careers.length + traits.length + aspirations.length === 0) {
    out.push({
      severity: "info", scope: "project", recordId: project.id,
      message: "Project is empty",
      suggestion: "Add a career, trait, or aspiration — or start from a template.",
    });
  }

  // Duplicate internal IDs across all record types.
  const seen = new Map<string, string>();
  const all = [
    ...careers.map((r) => ({ id: r.id, name: r.name, internalId: r.internalId, scope: "career" as const })),
    ...traits.map((r) => ({ id: r.id, name: r.name, internalId: r.internalId, scope: "trait" as const })),
    ...aspirations.map((r) => ({ id: r.id, name: r.name, internalId: r.internalId, scope: "aspiration" as const })),
  ];
  for (const r of all) {
    const key = (r.internalId || "").trim().toLowerCase();
    if (!key) {
      out.push({
        severity: "error", scope: r.scope, recordId: r.id, field: "internalId",
        message: `"${r.name}" has no internal ID`,
        suggestion: "Internal IDs are required to emit tuning.",
      });
      continue;
    }
    const prev = seen.get(key);
    if (prev) {
      out.push({
        severity: "error", scope: r.scope, recordId: r.id, field: "internalId",
        message: `Duplicate internal ID "${r.internalId}" (also used by ${prev})`,
        suggestion: "Internal IDs must be unique inside a package.",
      });
    } else {
      seen.set(key, r.name);
    }
  }

  const assetIds = new Set(assets.map((a) => a.id));

  for (const c of careers) {
    if (c.branches.length === 0) {
      out.push({
        severity: "error", scope: "career", recordId: c.id, field: "branches",
        message: `Career "${c.name}" has no branches`,
        suggestion: "Every career needs at least one branch with levels.",
      });
    }
    for (const b of c.branches) {
      if (b.levels.length === 0) {
        out.push({
          severity: "error", scope: "career", recordId: c.id, field: "levels",
          message: `Branch "${b.name}" in "${c.name}" has no levels`,
          suggestion: "Add promotion levels with salary and hours.",
        });
      }
      for (const l of b.levels) {
        if (!l.title.trim()) {
          out.push({
            severity: "warning", scope: "career", recordId: c.id, field: "title",
            message: `Rank ${l.rank} in "${b.name}" has no title`,
          });
        }
        if (l.salary <= 0) {
          out.push({
            severity: "warning", scope: "career", recordId: c.id, field: "salary",
            message: `Rank ${l.rank} "${l.title || "untitled"}" pays §0`,
            suggestion: "Set a daily salary for this rank.",
          });
        }
        if (l.workDays.length === 0) {
          out.push({
            severity: "warning", scope: "career", recordId: c.id, field: "workDays",
            message: `Rank ${l.rank} in "${b.name}" has no work days`,
          });
        }
      }
    }
    if (c.ageGates.length === 0) {
      out.push({
        severity: "warning", scope: "career", recordId: c.id, field: "ageGates",
        message: `Career "${c.name}" is not available to any age`,
        suggestion: "Pick at least one age group.",
      });
    }
    if (c.iconAssetId && !assetIds.has(c.iconAssetId)) {
      out.push({
        severity: "error", scope: "career", recordId: c.id, field: "iconAssetId",
        message: `Career "${c.name}" points at a missing icon asset`,
        suggestion: "Re-pick an icon from the library.",
      });
    }
  }

  for (const t of traits) {
    if (!t.description.trim()) {
      out.push({
        severity: "warning", scope: "trait", recordId: t.id, field: "description",
        message: `Trait "${t.name}" has no description`,
        suggestion: "In-game trait tooltips read this string.",
      });
    }
    if (t.buffs.length === 0) {
      out.push({
        severity: "info", scope: "trait", recordId: t.id, field: "buffs",
        message: `Trait "${t.name}" has no buffs`,
        suggestion: "Traits without buffs have no visible gameplay effect.",
      });
    }
    for (const b of t.buffs) {
      if (b.durationHours <= 0) {
        out.push({
          severity: "warning", scope: "trait", recordId: t.id, field: "durationHours",
          message: `Buff "${b.name}" on "${t.name}" lasts 0 hours`,
        });
      }
    }
    if (t.iconAssetId && !assetIds.has(t.iconAssetId)) {
      out.push({
        severity: "error", scope: "trait", recordId: t.id, field: "iconAssetId",
        message: `Trait "${t.name}" points at a missing icon asset`,
      });
    }
  }

  for (const a of aspirations) {
    if (a.milestones.length === 0) {
      out.push({
        severity: "error", scope: "aspiration", recordId: a.id, field: "milestones",
        message: `Aspiration "${a.name}" has no milestones`,
        suggestion: "Add at least one milestone with objectives.",
      });
    }
    for (const m of a.milestones) {
      if (m.objectives.length === 0) {
        out.push({
          severity: "warning", scope: "aspiration", recordId: a.id, field: "objectives",
          message: `Milestone "${m.name}" in "${a.name}" has no objectives`,
        });
      }
    }
  }

  return out;
}

/* -------------------------------- Health -------------------------------- */

export interface HealthMetrics {
  /** 100 minus weighted validation penalties. */
  buildHealth: number;
  /** How many records declare pack/age compatibility properly. */
  compatibility: number;
  /** Share of expected content that is actually filled in. */
  completeness: number;
  errors: number;
  warnings: number;
  infos: number;
  missingAssetRefs: number;
  recordCount: number;
}

export function computeHealth(scope: ProjectScope, issues: DerivedIssue[]): HealthMetrics {
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const infos = issues.filter((i) => i.severity === "info").length;

  const buildHealth = clamp(100 - errors * 12 - warnings * 4 - infos * 1);

  const { careers, traits, aspirations, assets } = scope;
  const records = [...careers, ...traits, ...aspirations];
  const recordCount = records.length;

  const assetIds = new Set(assets.map((a) => a.id));
  const refs = records.map((r) => r.iconAssetId).filter(Boolean) as string[];
  const missingAssetRefs = refs.filter((id) => !assetIds.has(id)).length;

  const gated = [...careers, ...traits].filter((r) => r.ageGates.length > 0).length;
  const gateable = careers.length + traits.length;
  const compatibility = gateable === 0
    ? 100
    : clamp(Math.round((gated / gateable) * 100) - missingAssetRefs * 5);

  let filled = 0;
  let total = 0;
  for (const r of records) {
    total += 3;
    if (r.name.trim()) filled++;
    if (r.description.trim()) filled++;
    if (r.iconAssetId && assetIds.has(r.iconAssetId)) filled++;
  }
  for (const c of careers) {
    total += 1;
    if (c.branches.some((b) => b.levels.length > 0)) filled++;
  }
  for (const t of traits) {
    total += 1;
    if (t.buffs.length > 0) filled++;
  }
  for (const a of aspirations) {
    total += 1;
    if (a.milestones.length > 0) filled++;
  }
  const completeness = total === 0 ? 0 : clamp(Math.round((filled / total) * 100));

  return { buildHealth, compatibility, completeness, errors, warnings, infos, missingAssetRefs, recordCount };
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, n));
}

/* ----------------------------- Dependencies ----------------------------- */

export interface DependencyRow {
  name: string;
  detail: string;
  status: "ok" | "warn" | "missing";
}

/**
 * Derives the runtime dependencies this project's content implies.
 * Purely structural — no network, works offline.
 */
export function computeDependencies(scope: ProjectScope): DependencyRow[] {
  const { careers, traits, aspirations, assets, packModules } = scope;
  const rows: DependencyRow[] = [];

  const needsInjector = careers.length > 0 || aspirations.length > 0;
  rows.push({
    name: "XML Injector",
    detail: needsInjector ? "required by careers / aspirations" : "not required",
    status: needsInjector ? "warn" : "ok",
  });

  const iconRefs = [...careers, ...traits, ...aspirations].filter((r) => r.iconAssetId).length;
  const iconAssets = assets.filter((a) => a.kind === "icon").length;
  rows.push({
    name: "Icon assets",
    detail: `${iconRefs} referenced · ${iconAssets} in project`,
    status: iconRefs === 0 ? "missing" : iconRefs <= iconAssets ? "ok" : "warn",
  });

  const stblStrings = careers.reduce((n, c) => n + c.messageOverrides.length, 0)
    + traits.reduce((n, t) => n + t.buffs.length, 0)
    + aspirations.reduce((n, a) => n + a.milestones.length, 0);
  rows.push({
    name: "String table (STBL)",
    detail: `${stblStrings} localized strings`,
    status: stblStrings === 0 ? "missing" : "ok",
  });

  const packs = new Set<string>();
  for (const m of packModules) if (m.requiredPack) packs.add(m.requiredPack);
  rows.push({
    name: "Game packs",
    detail: packs.size ? [...packs].join(", ") : "base game only",
    status: "ok",
  });

  return rows;
}

/* ------------------------------ Build steps ----------------------------- */

export const BUILD_STEPS = [
  "Parse manifest",
  "Resolve dependencies",
  "Compile tunings",
  "Package DBPF",
  "Validate output",
  "Finalize",
] as const;

export function stepStateFor(progress: number, index: number): "done" | "run" | "wait" {
  const per = 100 / BUILD_STEPS.length;
  const current = Math.min(BUILD_STEPS.length - 1, Math.floor(progress / per));
  if (progress >= 100) return "done";
  if (index < current) return "done";
  if (index === current) return "run";
  return "wait";
}
