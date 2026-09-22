/**
 * Aspiration template regression tests.
 *
 * A template marked "ready" must create a complete, validation-clean record
 * without manual repair, and that record must reach the exporter as real
 * tuning inside a DBPF package. A template marked "draft" must stay blocked.
 */

import { describe, expect, it } from "vitest";
import {
  ASPIRATION_TEMPLATES,
  docFromTemplate,
  templateById,
  templateObjectiveCount,
} from "@/lib/aspirations/templates";
import { validateAspiration } from "@/lib/aspirations/validate";
import { allObjectives } from "@/lib/aspirations/schema";
import { objectiveTypeSpec } from "@/lib/aspirations/goals";
import { projectAspirationDoc } from "@/lib/builder-projection";
import { runExport } from "@/lib/modexport/pipeline";
import { DEFAULT_EXPORT_REQUEST } from "@/lib/modexport/types";
import { readDbpf } from "@/lib/modimport/dbpf";
import type { Aspiration, Project } from "@/lib/types";

const REWARD_TRAIT_ID = "trait-record-1";

const ctx = {
  state: {
    traits: [{ id: REWARD_TRAIT_ID, projectId: "p1", name: "Quick Learner" }],
    careers: [],
    aspirations: [],
    notifications: [],
    assets: [],
  },
  projectId: "p1",
} as never;

const build = (id: string) =>
  docFromTemplate(templateById(id)!, "MyMods", {
    rewardTraitId: REWARD_TRAIT_ID,
    rewardTraitName: "Quick Learner",
  });

describe("Aspiration template catalog", () => {
  it("every ready template creates a validation-clean document", () => {
    for (const t of ASPIRATION_TEMPLATES.filter((x) => x.status === "ready")) {
      const v = validateAspiration(build(t.id), ctx);
      expect(`${t.id}: ${v.issues.filter((i) => i.level !== "suggestion").map((i) => i.code).join(",")}`)
        .toBe(`${t.id}: `);
      expect(v.exportable).toBe(true);
      expect(v.score).toBe(100);
    }
  });

  it("every ready template ships identity text, icons, rewards and completion text", () => {
    for (const t of ASPIRATION_TEMPLATES.filter((x) => x.status === "ready")) {
      const doc = build(t.id);
      expect(doc.icon, t.id).not.toBe("");
      expect(doc.description.trim().length, t.id).toBeGreaterThan(20);
      expect(doc.strings.completionNotification.text, t.id).not.toBe("");
      expect(doc.milestones.length, t.id).toBeGreaterThan(0);
      expect(
        doc.gameplay.rewards.some((r) => r.scope === "aspiration" && r.trigger === "completed"),
        t.id,
      ).toBe(true);
      for (const m of doc.milestones) {
        expect(m.description, `${t.id}/${m.title}`).not.toBe("");
        expect(m.icon, `${t.id}/${m.title}`).not.toBe("");
        expect(m.points, `${t.id}/${m.title}`).toBeGreaterThan(0);
        expect(m.objectives.length, `${t.id}/${m.title}`).toBeGreaterThan(0);
      }
      // Every required objective field is filled in with a supported test set.
      for (const o of allObjectives(doc)) {
        for (const f of objectiveTypeSpec(o.type).fields.filter((x) => x.required)) {
          if (f.kind === "ref") expect(o.refs[f.id], `${t.id}/${o.label}/${f.id}`).toBeTruthy();
          if (f.kind === "number")
            expect(Number(o.params[f.id] ?? 0), `${t.id}/${o.label}/${f.id}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("links the reward trait a ready template promises", () => {
    for (const t of ASPIRATION_TEMPLATES.filter((x) => x.status === "ready" && x.rewardTrait)) {
      const ref = build(t.id).rewardTrait;
      expect(ref?.source, t.id).toBe("project");
      expect((ref as { projectResourceId?: string })?.projectResourceId).toBe(REWARD_TRAIT_ID);
    }
  });

  it("blocks every draft template with an actionable configuration list", () => {
    for (const t of ASPIRATION_TEMPLATES.filter((x) => x.status === "draft")) {
      const v = validateAspiration(build(t.id), ctx);
      expect(v.errors, t.id).toBeGreaterThan(0);
      expect(v.exportable, t.id).toBe(false);
      expect((t.requiresConfiguration ?? []).length, t.id).toBeGreaterThan(0);
    }
  });

  it("Knowledge produces four milestones and eight tested objectives", () => {
    const t = templateById("knowledge")!;
    expect(t.status).toBe("ready");
    expect(t.milestones).toHaveLength(4);
    expect(templateObjectiveCount(t)).toBe(8);

    const doc = build("knowledge");
    const objectives = allObjectives(doc);
    expect(objectives).toHaveLength(8);
    expect(objectives.every((o) => o.type === "skill" && o.refs["skill"])).toBe(true);

    const v = validateAspiration(doc, ctx);
    expect(v.issues.map((i) => i.code)).not.toContain("OBJ_NO_TEST");
    expect(v.errors).toBe(0);
    expect(v.warnings).toBe(0);
  });
});

describe("Template record exports as a real package", () => {
  it("packages a Knowledge aspiration into a DBPF with its milestones", async () => {
    const doc = build("knowledge");
    const patch = projectAspirationDoc(doc as never);
    const record = {
      id: "a1",
      projectId: "p1",
      name: doc.displayName,
      internalId: doc.ids.internalName,
      description: doc.description,
      category: "Knowledge",
      milestones: [],
      createdAt: 0,
      updatedAt: 0,
      ...patch,
    } as Aspiration;

    const project: Project = {
      id: "p1", name: "Template Test", author: "Nesha", description: "Template export fixture",
      version: "1.0.0", status: "in-progress", changelog: [], createdAt: 0, updatedAt: 0,
      careerIds: [], traitIds: [], aspirationIds: [], notificationIds: [], assetIds: [],
      tags: [], favorite: false,
    };

    const job = await runExport({
      request: { ...DEFAULT_EXPORT_REQUEST, projectId: "p1", exportType: "package-only" },
      builder: { project, careers: [], traits: [], aspirations: [record], notifications: [], assets: [] },
    });

    const codes = job.warnings.concat(job.errors as never[]).map((i) => i.code);
    expect(codes).not.toContain("RESOURCE_EXCLUDED");
    expect(codes).not.toContain("ALL_RECORDS_EXCLUDED");

    const pkg = job.outputFiles.find((f) => f.name.endsWith(".package"));
    expect(pkg).toBeDefined();
    const dbpf = readDbpf(pkg!.bytes);
    expect(dbpf.entries.length).toBeGreaterThan(1);
    const text = new TextDecoder().decode(
      new Uint8Array(dbpf.entries.flatMap((e) => Array.from(e.raw))),
    );
    expect(text).toContain("Knowledge Aspiration");
    expect(text).toContain("Renowned Scholar");
  });
});
