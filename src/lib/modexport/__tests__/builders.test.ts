/**
 * Per-builder regression tests.
 *
 * Each builder must (a) refuse to compile incomplete data with an actionable
 * message, (b) produce real tuning when complete, and (c) leave the rest of the
 * package intact when one record is excluded.
 */

import { describe, expect, it } from "vitest";
import { readDbpf } from "@/lib/modimport/dbpf";
import { runExport } from "@/lib/modexport/pipeline";
import { DEFAULT_EXPORT_REQUEST, type ExportRequest } from "@/lib/modexport/types";
import { ResourceIdService } from "@/lib/modexport/ids";
import {
  serializeNotification,
  validateNotificationForExport,
} from "@/lib/modexport/notification-serializer";
import { serializeDynasty, validateDynastyForExport } from "@/lib/modexport/dynasty-serializer";
import { blankDynastyDoc, blankRole, blankValue } from "@/lib/dynasty/schema";
import {
  projectAspirationDoc,
  projectCareerDraft,
  projectTraitDoc,
} from "@/lib/builder-projection";
import type { Aspiration, Career, NotificationTemplate, Project, Trait } from "@/lib/types";
import type { SerializerContext } from "@/lib/modexport/serializers";

const dec = new TextDecoder();

function project(): Project {
  return {
    id: "p1", name: "Builder Audit", author: "Nesha", description: "Audit fixture",
    version: "1.0.0", status: "in-progress", changelog: [], createdAt: 0, updatedAt: 0,
    careerIds: [], traitIds: [], aspirationIds: [], notificationIds: [], assetIds: [],
    tags: [], favorite: false,
  };
}

function ctx(): SerializerContext {
  return { namespace: "audit", ids: new ResourceIdService() };
}

function completeTrait(over: Partial<Trait> = {}): Trait {
  return {
    id: "t1", projectId: "p1", name: "Trendsetter", internalId: "trendsetter",
    description: "Always ahead of the curve.", category: "personality", ageGates: ["adult"],
    buffs: [{
      id: "bf1", name: "On Trend", description: "Feeling stylish.", emotion: "confident",
      weight: 2, durationHours: 4, rules: [],
    }],
    socialInteractions: [], buffReplacements: [], commodityWeights: [],
    blockedAges: [], blockedEmotions: [], createdAt: 0, updatedAt: 0, ...over,
  };
}

function completeCareer(over: Partial<Career> = {}): Career {
  return {
    id: "c1", projectId: "p1", name: "Dancer", internalId: "dancer",
    description: "Dance for a living.", careerType: "standard", ageGates: ["adult"],
    branches: [{
      id: "b1", name: "Stage", description: "Perform on stage.",
      levels: [{
        id: "l1", rank: 1, title: "Backup Dancer", salary: 200, workStart: "09:00",
        workEnd: "17:00", workDays: ["mon"], objectives: ["Practice"], perks: [],
      }],
    }],
    messageOverrides: [], workFromHomeEvents: [], createdAt: 0, updatedAt: 0, ...over,
  };
}

function completeAspiration(): Aspiration {
  return {
    id: "a1", projectId: "p1", name: "Dance Legend", internalId: "dance_legend",
    description: "Become a legend.", category: "Creativity",
    milestones: [{ id: "m1", order: 1, name: "First Steps", description: "Learn to dance.", objectives: ["Dance 5 times"] }],
    createdAt: 0, updatedAt: 0,
  };
}

function notification(over: Partial<NotificationTemplate> = {}): NotificationTemplate {
  return {
    id: "n1", projectId: "p1", name: "promotion_top", visual: "toast",
    title: "Promoted to Headliner", body: "Your Sim reached the top of the Dancer career.",
    previewKind: "promotion", actions: [{ label: "View career", kind: "primary" }],
    createdAt: 0, updatedAt: 0, ...over,
  };
}

function completeDynasty() {
  const d = blankDynastyDoc({ projectId: "p1" });
  d.identity.displayName = "House Ashford";
  d.identity.internalName = "house_ashford";
  d.identity.description = "An old family with a long memory.";
  d.hierarchy.roles = [blankRole({ displayName: "Matriarch", internalName: "matriarch", minSims: 1, maxSims: 1 })];
  d.values = [blankValue({ name: "Honour" })];
  return d;
}

function request(over: Partial<ExportRequest> = {}): ExportRequest {
  return { ...DEFAULT_EXPORT_REQUEST, projectId: "p1", exportType: "package-only", ...over };
}

function builder(over: Record<string, unknown> = {}) {
  return {
    project: project(), careers: [completeCareer()], traits: [completeTrait()],
    aspirations: [completeAspiration()], notifications: [], assets: [], ...over,
  };
}

/* --------------------------------------------------------- notifications */

describe("Notification builder", () => {
  it("rejects a notification with no title or body", () => {
    const issues = validateNotificationForExport(notification({ title: "", body: "" }));
    const codes = issues.map((i) => i.code);
    expect(codes).toContain("NOTIF_NO_TITLE");
    expect(codes).toContain("NOTIF_NO_BODY");
    expect(issues.every((i) => i.message.length > 10)).toBe(true);
  });

  it("accepts a complete notification and emits tuning with its strings", () => {
    expect(validateNotificationForExport(notification()).filter((i) => i.severity === "error")).toEqual([]);
    const out = serializeNotification(notification(), ctx());
    expect(out).toHaveLength(1);
    expect(out[0].className).toBe("Snippet");
    expect(out[0].xml).toContain("dialog_title");
    expect(out[0].strings.map((s) => s.value)).toContain("Promoted to Headliner");
  });
});

/* --------------------------------------------------------------- dynasty */

describe("Custom Dynasty builder", () => {
  it("rejects a dynasty with no name, description or roles", () => {
    const codes = validateDynastyForExport(blankDynastyDoc({ projectId: "p1" })).map((i) => i.code);
    expect(codes).toContain("DYNASTY_NO_NAME");
    expect(codes).toContain("DYNASTY_NO_DESCRIPTION");
    expect(codes).toContain("DYNASTY_NO_ROLES");
  });

  it("emits a root snippet plus one per role and value", () => {
    const d = completeDynasty();
    expect(validateDynastyForExport(d).filter((i) => i.severity === "error")).toEqual([]);
    const out = serializeDynasty(d, ctx());
    expect(out).toHaveLength(3); // 1 role + 1 value + root
    const root = out[out.length - 1];
    expect(root.xml).toContain("roles");
    expect(root.xml).toContain("values");
    expect(new Set(out.map((r) => r.key.instance)).size).toBe(3);
  });

  it("flags a role whose minimum exceeds its maximum", () => {
    const d = completeDynasty();
    d.hierarchy.roles = [blankRole({ displayName: "Heir", minSims: 4, maxSims: 2 })];
    expect(validateDynastyForExport(d).map((i) => i.code)).toContain("DYNASTY_ROLE_BAD_SEATS");
  });
});

/* ------------------------------------------------------ draft projection */

describe("Builder drafts reach the canonical record", () => {
  it("projects a career draft onto branches and levels the exporter reads", () => {
    const patch = projectCareerDraft({
      name: "Dancer", description: "Dance for a living.",
      branches: [{
        id: "b1", name: "Stage", description: "Perform.",
        ranks: [{ id: "r1", lvl: 1, title: "Backup", simoleonsPerHour: 20, beginHour: 9, durationHours: 8, days: ["mon"] }],
      }],
    } as never);
    expect(patch.branches?.[0].levels[0].title).toBe("Backup");
    expect(patch.description).toBe("Dance for a living.");
  });

  it("projects a trait document onto canonical buffs", () => {
    const patch = projectTraitDoc({
      identity: { displayName: "Night Owl", description: "Up late." },
      effects: [{ kind: "buff", name: "Wide Awake", description: "Alert at night." }],
    } as never);
    expect(patch.name).toBe("Night Owl");
    expect(patch.buffs?.length).toBe(1);
  });

  it("projects an aspiration document onto canonical milestones", () => {
    const patch = projectAspirationDoc({
      identity: { displayName: "Dance Legend", description: "Be great." },
      milestones: [{ title: "First Steps", description: "Learn.", order: 1, objectives: [{ title: "Dance" }] }],
    } as never);
    expect(patch.milestones?.[0].name).toBe("First Steps");
  });
});

/* ----------------------------------------------------- export exclusions */

describe("Exporter excludes incomplete records", () => {
  it("skips an incomplete career but still packages the rest", async () => {
    const job = await runExport({
      request: request(),
      builder: builder({ careers: [completeCareer({ branches: [] })] }),
    });
    const excluded = job.warnings.concat(job.errors as never[]).filter((i) => i.code === "RESOURCE_EXCLUDED") ;
    expect(excluded.length).toBeGreaterThan(0);
    expect(excluded[0].message).toMatch(/Dancer/);
    const pkg = job.outputFiles.find((f) => f.name.endsWith(".package"));
    expect(pkg).toBeDefined();
    const xml = readDbpf(pkg!.bytes).entries.map((e) => dec.decode(e.raw)).join("\n");
    expect(xml).toContain("Trendsetter");
    expect(xml).not.toContain("Dancer");
  });

  it("fails the build when every record is incomplete", async () => {
    const job = await runExport({
      request: request(),
      builder: builder({
        careers: [completeCareer({ branches: [] })],
        traits: [completeTrait({ description: "", buffs: [] , name: "" })],
        aspirations: [],
      }),
    });
    const codes = job.warnings.concat(job.errors as never[]).map((i) => i.code) ;
    expect(codes).toContain("ALL_RECORDS_EXCLUDED");
  });

  it("packages a notification and a dynasty alongside builder content", async () => {
    const job = await runExport({
      request: request(),
      builder: builder({ notifications: [notification()], dynasties: [completeDynasty()] }),
    });
    const pkg = job.outputFiles.find((f) => f.name.endsWith(".package"));
    expect(pkg).toBeDefined();
    const text = readDbpf(pkg!.bytes).entries.map((e) => dec.decode(e.raw)).join("\n");
    expect(text).toContain("dialog_title");
    expect(text).toContain("house_ashford");
  });
});
