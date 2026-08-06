import { describe, expect, it } from "vitest";
import { computeProjectHealth, gradeFor } from "@/lib/project-health";
import type { DerivedIssue, ProjectScope } from "@/lib/project-analysis";
import type { BuildJob, Career, Project } from "@/lib/types";

function project(over: Partial<Project> = {}): Project {
  return {
    id: "p1", name: "Dancer", author: "Nesha", description: "d", version: "1.0.0",
    status: "in-progress", changelog: [], createdAt: 0, updatedAt: 100,
    careerIds: [], traitIds: [], aspirationIds: [], notificationIds: [], assetIds: [],
    tags: [], favorite: false, ...over,
  };
}

function career(over: Partial<Career> = {}): Career {
  return {
    id: "c1", projectId: "p1", name: "Dancer", description: "x", internalId: "dancer",
    ageGates: ["adult"],
    branches: [{ id: "b1", name: "Stage", levels: [{ id: "l1", rank: 1, title: "Extra", salary: 100, workDays: ["mon"] }] }],
    createdAt: 0, updatedAt: 0,
    ...over,
  } as Career;
}

function scope(over: Partial<ProjectScope> = {}): ProjectScope {
  return {
    project: project(), careers: [], traits: [], aspirations: [],
    notifications: [], assets: [], packModules: [], ...over,
  } as ProjectScope;
}

const build = (over: Partial<BuildJob> = {}): BuildJob => ({
  id: "b", projectId: "p1", label: "export", status: "success", progress: 100,
  finishedAt: 500, log: [], ...over,
});

describe("project health", () => {
  it("grades on the weighted scale, not on completion", () => {
    expect(gradeFor(96).grade).toBe("excellent");
    expect(gradeFor(88).grade).toBe("healthy");
    expect(gradeFor(67).grade).toBe("attention");
    expect(gradeFor(32).grade).toBe("critical");
  });

  it("tanks the score for blocking errors even when content is complete", () => {
    const issues: DerivedIssue[] = [
      { severity: "error", scope: "career", recordId: "c1", message: "Duplicate internal ID" },
    ];
    const r = computeProjectHealth({ scope: scope({ careers: [career()] }), issues, builds: [build()] });
    expect(r.readouts.errors).toBe(1);
    expect(r.exportSafe).toBe(false);
    // Errors alone are worth 35 points, so a single blocking error caps the score.
    expect(r.score).toBeLessThanOrEqual(70);
    expect(r.findings.some((f) => f.severity === "critical")).toBe(true);
  });

  it("barely punishes optional polish", () => {
    const clean = computeProjectHealth({ scope: scope({ careers: [career()] }), issues: [], builds: [build()] });
    const polish: DerivedIssue[] = [
      { severity: "warning", scope: "trait", recordId: "t1", message: "Trait has no description" },
      { severity: "info", scope: "trait", recordId: "t1", message: "Trait has no buffs" },
    ];
    const withPolish = computeProjectHealth({ scope: scope({ careers: [career()] }), issues: polish, builds: [build()] });
    expect(clean.score - withPolish.score).toBeLessThanOrEqual(5);
    expect(withPolish.exportSafe).toBe(true);
  });

  it("scores testing from real export history", () => {
    const s = scope({ careers: [career()] });
    const untested = computeProjectHealth({ scope: s, issues: [], builds: [] });
    const failed = computeProjectHealth({ scope: s, issues: [], builds: [build({ status: "failed", error: "bad dbpf" })] });
    const passed = computeProjectHealth({ scope: s, issues: [], builds: [build()] });

    expect(untested.readouts.testing).toBe("untested");
    expect(failed.readouts.testing).toBe("failed");
    expect(passed.readouts.testing).toBe("passed");
    expect(passed.score).toBeGreaterThan(untested.score);
    expect(failed.exportSafe).toBe(false);
  });

  it("flags unresolved image references as critical", () => {
    const s = scope({ careers: [career({ iconAssetId: "missing" })] });
    const r = computeProjectHealth({ scope: s, issues: [], builds: [build()] });
    expect(r.findings.some((f) => f.severity === "critical" && /missing image resource/i.test(f.title))).toBe(true);
    expect(r.readouts.assetsPct).toBeLessThan(100);
  });

  it("routes each finding to a fixable destination", () => {
    const issues: DerivedIssue[] = [
      { severity: "error", scope: "career", recordId: "c1", message: "Career has no branches" },
    ];
    const r = computeProjectHealth({ scope: scope({ careers: [career()] }), issues, builds: [] });
    const f = r.findings.find((x) => x.title === "Career has no branches")!;
    expect(f.section).toBe("career");
    expect(f.record).toEqual({ kind: "career", id: "c1" });
  });

  it("weights sum to one", () => {
    const r = computeProjectHealth({ scope: scope(), issues: [], builds: [] });
    expect(r.categories.reduce((n, c) => n + c.weight, 0)).toBeCloseTo(1, 5);
  });
});
