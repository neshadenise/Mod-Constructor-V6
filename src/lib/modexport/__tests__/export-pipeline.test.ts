import { describe, expect, it } from "vitest";
import { checksum } from "@/lib/modimport/binary";
import { readDbpf, writeDbpf } from "@/lib/modimport/dbpf";
import { parseStbl } from "@/lib/modimport/resource-types";
import { readZipIndex, writeZip } from "@/lib/modimport/zip";
import type { ModComponent, ModProject } from "@/lib/modimport/types";
import { runExport } from "@/lib/modexport/pipeline";
import { buildSnapshot } from "@/lib/modexport/snapshot";
import { ResourceIdService, TYPE_TUNING, normalizeKey } from "@/lib/modexport/ids";
import { mergeLocalization, checkReferences } from "@/lib/modexport/stbl";
import { sanitizeFileName } from "@/lib/modexport/filenames";
import { exportScriptComponent, verifyScriptArchive } from "@/lib/modexport/scripts";
import { DEFAULT_EXPORT_REQUEST, type ExportRequest } from "@/lib/modexport/types";
import type { Aspiration, Career, Project, Trait } from "@/lib/types";

const enc = new TextEncoder();
const dec = new TextDecoder();

/* ------------------------------ fixtures ----------------------------- */

function project(): Project {
  return {
    id: "p1",
    name: "Dancer Career",
    author: "Nesha",
    description: "A ten level dancer career.",
    version: "1.2.0",
    status: "in-progress",
    changelog: [],
    createdAt: 0,
    updatedAt: 0,
    careerIds: [],
    traitIds: [],
    aspirationIds: [],
    notificationIds: [],
    assetIds: [],
    tags: [],
    favorite: false,
  };
}

function career(): Career {
  return {
    id: "c1",
    projectId: "p1",
    name: "Dancer",
    internalId: "dancer",
    description: "Dance for a living.",
    careerType: "standard",
    ageGates: ["teen", "adult"],
    branches: [
      {
        id: "b1",
        name: "Stage Dancer",
        description: "Perform on stage.",
        levels: [
          { id: "l1", rank: 1, title: "Backup Dancer", salary: 200, workStart: "09:00", workEnd: "17:00", workDays: ["mon", "tue"], objectives: ["Practice"], perks: [] },
          { id: "l2", rank: 2, title: "Lead Dancer", salary: 400, workStart: "10:00", workEnd: "18:00", workDays: ["mon"], objectives: [], perks: ["Confident"] },
        ],
      },
    ],
    messageOverrides: [],
    workFromHomeEvents: [],
    createdAt: 0,
    updatedAt: 0,
  };
}

function trait(): Trait {
  return {
    id: "t1",
    projectId: "p1",
    name: "Trendsetter",
    internalId: "trendsetter",
    description: "Always ahead of the curve.",
    category: "personality",
    ageGates: ["adult"],
    buffs: [
      { id: "bf1", name: "On Trend", description: "Feeling stylish.", emotion: "confident", weight: 2, durationHours: 4, rules: [{ id: "r1", trigger: "on-social", condition: "", chance: 50, cooldownHours: 2 }] },
    ],
    socialInteractions: [],
    buffReplacements: [],
    commodityWeights: [],
    blockedAges: [],
    blockedEmotions: [],
    createdAt: 0,
    updatedAt: 0,
  };
}

function aspiration(): Aspiration {
  return {
    id: "a1",
    projectId: "p1",
    name: "Dance Legend",
    internalId: "dance_legend",
    description: "Become a legend.",
    category: "Creativity",
    milestones: [{ id: "m1", order: 1, name: "First Steps", description: "Learn to dance.", objectives: ["Dance 5 times"] }],
    createdAt: 0,
    updatedAt: 0,
  };
}

function builderContent() {
  return { project: project(), careers: [career()], traits: [trait()], aspirations: [aspiration()], notifications: [], assets: [] };
}

function request(over: Partial<ExportRequest> = {}): ExportRequest {
  return { ...DEFAULT_EXPORT_REQUEST, projectId: "p1", allowTuningOnly: true, ...over };
}

/* ------------------------- imported fixtures ------------------------- */

const tuningXml = `<?xml version="1.0" encoding="utf-8"?>
<I c="Trait" i="trait" m="coolmod.traits.night_owl" n="coolmod_NightOwl" s="9876543210">
  <T n="display_name">0x1A2B3C4D</T>
  <L n="unknown_future_field"><T>keep_me</T></L>
</I>`;

const UNKNOWN_TYPE = 0x0166038c; // Name Map — not decodable by the app

function importedPackageBytes() {
  return writeDbpf([
    { typeNum: 0x0333406c, groupNum: 0, instance: 9876543210n, raw: enc.encode(tuningXml), memSize: tuningXml.length, compressionType: 0 },
    { typeNum: UNKNOWN_TYPE, groupNum: 0x12345678, instance: 0xabcdef0123456789n, raw: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), memSize: 8, compressionType: 0 },
    { typeNum: 0x00b2d882, groupNum: 0, instance: 0x1111222233334444n, raw: new Uint8Array([9, 9, 9, 9]), memSize: 4, compressionType: 0 },
  ]);
}

function scriptBytes() {
  return writeZip([
    { name: "coolmod/__init__.pyc", bytes: new Uint8Array([0x55, 0x0d, 0x0d, 0x0a, 0, 0, 0, 0]) },
    { name: "coolmod/main.pyc", bytes: new Uint8Array([0x55, 0x0d, 0x0d, 0x0a, 1, 1, 1, 1]) },
  ]);
}

async function importedProject(opts: { withScript?: boolean; dirtyTuning?: string } = {}) {
  const pkgBytes = importedPackageBytes();
  const pkg = readDbpf(pkgBytes);
  const pkgComponent: ModComponent = {
    id: "cmp-pkg",
    projectId: "imp1",
    originalFileName: "CoolMod.package",
    normalizedFileName: "coolmod",
    fileType: "package",
    role: "tuning",
    byteSize: pkgBytes.byteLength,
    checksum: await checksum(pkgBytes),
    parseStatus: "parsed",
    isEditable: true,
    preserveOriginalBytes: false,
    resources: pkg.entries.map((e, i) => ({
      id: `res-${i}`,
      componentId: "cmp-pkg",
      key: e.key,
      typeLabel: "x",
      subtype: undefined,
      byteSize: e.size,
      compression: "none" as const,
      editability: i === 0 ? ("editable" as const) : ("preserved-unsupported" as const),
      originalIndex: i,
      text: i === 0 ? (opts.dirtyTuning ?? dec.decode(e.raw)) : undefined,
      dirty: i === 0 ? Boolean(opts.dirtyTuning) : false,
    })),
  };

  const components: ModComponent[] = [pkgComponent];
  const originals = new Map<string, Uint8Array>([["cmp-pkg", pkgBytes]]);

  if (opts.withScript) {
    const sb = scriptBytes();
    components.push({
      id: "cmp-script",
      projectId: "imp1",
      originalFileName: "CoolMod.ts4script",
      normalizedFileName: "coolmod",
      fileType: "ts4script",
      role: "script",
      byteSize: sb.byteLength,
      checksum: await checksum(sb),
      parseStatus: "parsed",
      isEditable: false,
      preserveOriginalBytes: true,
      modules: [],
    });
    originals.set("cmp-script", sb);
  }

  const proj: ModProject = {
    id: "imp1",
    name: "CoolMod",
    creator: "CoolCreator",
    version: "2.0.0",
    description: "An imported mod.",
    components,
    resources: components.flatMap((c) => c.resources ?? []),
    dependencies: [{ id: "d1", name: "XML Injector", detectedFrom: "script-import", required: true, confidence: "high" }],
    relationships: [],
    importWarnings: [],
    validationResults: [],
    importStatus: "ready",
    confidence: "high",
    groupingReasons: [],
    mutations: [],
    parserVersion: "6.1.0",
    importedAt: 0,
  };
  return { project: proj, originals };
}

/* -------------------------------- tests ------------------------------ */

describe("resource id service", () => {
  it("generates deterministic 64-bit keys", () => {
    const a = new ResourceIdService().generateResourceKey({ namespace: "n", kind: "trait", name: "x" });
    const b = new ResourceIdService().generateResourceKey({ namespace: "n", kind: "trait", name: "x" });
    expect(a).toEqual(b);
    expect(a.instance).toMatch(/^[0-9A-F]{16}$/);
  });

  it("detects collisions and repairs deterministically without randomness", () => {
    const svc = new ResourceIdService();
    const first = svc.generateResourceKey({ namespace: "n", kind: "trait", name: "x" });
    svc.reserveKey(first, "r1");
    expect(svc.detectCollision(first, "r2")).toBe(true);
    const second = svc.generateResourceKey({ namespace: "n", kind: "trait", name: "x" });
    expect(second.instance).not.toBe(first.instance);
    const svc2 = new ResourceIdService([{ key: first, resourceId: "r1" }]);
    expect(svc2.generateResourceKey({ namespace: "n", kind: "trait", name: "x" }).instance).toBe(second.instance);
  });

  it("rejects malformed and reserved keys", () => {
    const svc = new ResourceIdService();
    expect(svc.validateResourceKey({ type: "zz", group: "0", instance: "1" }).length).toBeGreaterThan(0);
    expect(svc.validateResourceKey(normalizeKey({ type: TYPE_TUNING, group: "0", instance: "0" }))
      .some((r) => r.code === "RESERVED_INSTANCE")).toBe(true);
  });
});

describe("localization", () => {
  it("preserves imported entries and only updates changed ones", () => {
    const merged = mergeLocalization(
      [{ key: "AAAA0001", value: "old" }, { key: "AAAA0002", value: "keep" }],
      [{ id: "1", key: "AAAA0001", locale: "en-US", value: "new", source: "user", state: "modified" }],
    );
    expect(merged.entries).toEqual([{ key: "AAAA0001", value: "new" }, { key: "AAAA0002", value: "keep" }]);
  });

  it("removes only explicitly deleted keys and flags missing references", () => {
    const merged = mergeLocalization([{ key: "A1", value: "x" }], [{ id: "1", key: "A1", locale: "en-US", value: "", source: "user", state: "deleted" }]);
    expect(merged.entries).toHaveLength(0);
    expect(checkReferences(["A1"], merged.entries).some((i) => i.code === "STBL_REFERENCE_MISSING")).toBe(true);
  });
});

describe("file names", () => {
  it("blocks traversal, reserved names and executables", () => {
    expect(sanitizeFileName("../../etc/passwd").name).toBe("passwd");
    expect(sanitizeFileName("CON.package").name.startsWith("_")).toBe(true);
    expect(sanitizeFileName("evil.exe").name.endsWith(".txt")).toBe(true);
    expect(sanitizeFileName("Nesha_Dancer_v1.2.0.package").ok).toBe(true);
  });
});

describe("builder export", () => {
  it("writes a real DBPF package that reopens with the expected resources", async () => {
    const job = await runExport({ request: request({ exportType: "package-only" }), builder: builderContent() });
    expect(job.status).toBe("ready");
    const pkg = job.outputFiles.find((f) => f.kind === "package")!;
    expect(pkg).toBeTruthy();
    const reopened = readDbpf(pkg.bytes);
    // 1 career + 1 track + 2 levels + 1 trait + 1 buff + 1 aspiration + 1 milestone + 1 stbl
    expect(reopened.entries.length).toBe(9);
    const tuning = reopened.entries.filter((e) => e.typeNum === 0x0333406c);
    expect(tuning.length).toBe(8);
    expect(dec.decode(tuning[0]!.raw)).toContain("<I c=");
    const stbl = reopened.entries.find((e) => e.typeNum === 0x220557da)!;
    expect(parseStbl(stbl.raw).length).toBeGreaterThan(0);
    expect(pkg.verified).toBe(true);
  });

  it("produces identical resource ids across repeated exports", async () => {
    const first = await runExport({ request: request({ exportType: "package-only" }), builder: builderContent() });
    const second = await runExport({ request: request({ exportType: "package-only" }), builder: builderContent() });
    const keys = (bytes: Uint8Array) => readDbpf(bytes).entries.map((e) => `${e.key.type}:${e.key.instance}`).sort();
    expect(keys(first.outputFiles[0]!.bytes)).toEqual(keys(second.outputFiles[0]!.bytes));
  });

  it("blocks tuning-only packages unless the user acknowledges the SimData gap", async () => {
    const job = await runExport({ request: request({ exportType: "package-only", allowTuningOnly: false }), builder: builderContent() });
    expect(job.status).toBe("failed");
    expect(job.errors[0]!.code).toBe("SIMDATA_UNSUPPORTED");
    expect(job.outputFiles).toHaveLength(0);
  });

  it("blocks export when a required field is missing", async () => {
    const content = builderContent();
    content.careers[0]!.branches = [];
    const job = await runExport({ request: request({ exportType: "package-only" }), builder: content });
    expect(job.status).toBe("failed");
    expect(job.validationReport!.results.some((r) => r.code === "CAREER_NO_BRANCH")).toBe(true);
  });

  it("exports a re-importable builder project source", async () => {
    const job = await runExport({ request: request({ exportType: "project-source", includeProjectSource: true }), builder: builderContent() });
    expect(job.status).toBe("ready");
    const src = JSON.parse(dec.decode(job.outputFiles[0]!.bytes));
    expect(src.schemaVersion).toBe("ts4builder/1");
    expect(src.careers[0].branches[0].levels).toHaveLength(2);
    expect(job.outputFiles[0]!.name).toContain("v1.2.0");
  });

  it("emits a validation report without writing mod files", async () => {
    const job = await runExport({ request: request({ exportType: "validation-report" }), builder: builderContent() });
    expect(job.status).toBe("ready");
    expect(job.outputFiles[0]!.kind).toBe("report");
    expect(JSON.parse(dec.decode(job.outputFiles[0]!.bytes)).results.length).toBeGreaterThan(0);
  });
});

describe("imported project export", () => {
  it("round-trips an unedited package with identical resource payloads", async () => {
    const imported = await importedProject();
    const job = await runExport({ request: request({ exportType: "package-only" }), imported });
    expect(job.status).toBe("ready");
    const out = job.outputFiles[0]!;
    const before = readDbpf(imported.originals.get("cmp-pkg")!);
    const after = readDbpf(out.bytes);
    expect(after.entries.length).toBe(before.entries.length);
    for (let i = 0; i < before.entries.length; i++)
      expect(await checksum(after.entries[i]!.raw)).toBe(await checksum(before.entries[i]!.raw));
    expect(job.validationReport!.roundTrip!.unexpectedLosses).toHaveLength(0);
  });

  it("preserves unsupported resources byte-for-byte after editing one supported resource", async () => {
    const edited = tuningXml.replace("coolmod_NightOwl", "coolmod_NightOwl2");
    const imported = await importedProject({ dirtyTuning: edited });
    const job = await runExport({ request: request({ exportType: "package-only" }), imported });
    expect(job.status).toBe("ready");
    const before = readDbpf(imported.originals.get("cmp-pkg")!);
    const after = readDbpf(job.outputFiles[0]!.bytes);
    expect(after.entries.length).toBe(3);
    // unsupported resources unchanged
    for (const i of [1, 2])
      expect(await checksum(after.entries[i]!.raw)).toBe(await checksum(before.entries[i]!.raw));
    expect(dec.decode(after.entries[0]!.raw)).toContain("coolmod_NightOwl2");
    expect(dec.decode(after.entries[0]!.raw)).toContain("unknown_future_field");
    expect(job.validationReport!.roundTrip!.modifiedResources).toBe(1);
  });

  it("keeps package and script companions together in the mod ZIP", async () => {
    const imported = await importedProject({ withScript: true });
    const job = await runExport({ request: request({ exportType: "complete-mod" }), imported });
    expect(job.status).toBe("ready");
    const zip = job.outputFiles.find((f) => f.kind === "zip")!;
    const names = readZipIndex(zip.bytes).entries.map((e) => e.safeName);
    expect(names.some((n) => n.endsWith("CoolMod.package"))).toBe(true);
    expect(names.some((n) => n.endsWith("CoolMod.ts4script"))).toBe(true);
    expect(names.some((n) => n.endsWith("manifest.json"))).toBe(true);
    expect(names.some((n) => n.endsWith("dependencies.json"))).toBe(true);
    // XML Injector must not be bundled
    expect(names.some((n) => /injector/i.test(n))).toBe(false);
    expect(names.every((n) => !n.includes(".."))).toBe(true);
  });

  it("exports a compiled script archive byte-for-byte", async () => {
    const imported = await importedProject({ withScript: true });
    const job = await runExport({ request: request({ exportType: "scripts-only" }), imported });
    const script = job.outputFiles.find((f) => f.kind === "ts4script")!;
    expect(script.verbatim).toBe(true);
    expect(await checksum(script.bytes)).toBe(await checksum(imported.originals.get("cmp-script")!));
  });

  it("blocks safe-mode export when an edited resource has no serializer", async () => {
    const imported = await importedProject();
    const target = imported.project.components[0]!.resources![1]!;
    target.dirty = true;
    const job = await runExport({ request: request({ exportType: "package-only" }), imported });
    expect(job.status).toBe("failed");
    expect(job.errors[0]!.code).toBe("UNSUPPORTED_RESOURCE_MUTATION");
    expect(job.outputFiles).toHaveLength(0);
  });

  it("blocks duplicate resource keys", async () => {
    const imported = await importedProject();
    const dup = writeDbpf([
      { typeNum: 0x0333406c, groupNum: 0, instance: 5n, raw: enc.encode("<I/>"), memSize: 4, compressionType: 0 },
      { typeNum: 0x0333406c, groupNum: 0, instance: 5n, raw: enc.encode("<I/>"), memSize: 4, compressionType: 0 },
    ]);
    imported.originals.set("cmp-pkg", dup);
    imported.project.components[0]!.resources = [
      { id: "a", componentId: "cmp-pkg", key: { type: "0333406C", group: "00000000", instance: "0000000000000005" }, typeLabel: "x", byteSize: 4, compression: "none", editability: "editable", originalIndex: 0, text: "<I/>", dirty: true },
      { id: "b", componentId: "cmp-pkg", key: { type: "0333406C", group: "00000000", instance: "0000000000000005" }, typeLabel: "x", byteSize: 4, compression: "none", editability: "editable", originalIndex: 1, text: "<I/>", dirty: true },
    ];
    const job = await runExport({ request: request({ exportType: "package-only" }), imported });
    expect(job.status).toBe("failed");
    expect(job.errors[0]!.code).toBe("DUPLICATE_RESOURCE_KEY");
  });

  it("classifies resource states in the snapshot", async () => {
    const imported = await importedProject();
    const { snapshot } = await buildSnapshot({ request: request(), imported });
    expect(snapshot.resources.filter((r) => r.state === "unsupported-preserved").length).toBe(2);
    expect(snapshot.resources.every((r) => r.resourceKey.instance.length === 16)).toBe(true);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });
});

describe("script safety", () => {
  it("never executes scripts and rejects malicious archive paths", () => {
    const evil = writeZip([{ name: "coolmod/../../evil.pyc", bytes: new Uint8Array([1]) }]);
    const verify = verifyScriptArchive(evil);
    // writeZip sanitises on write, so the reopened path must be safe
    expect(readZipIndex(evil).entries.every((e) => !e.safeName.includes(".."))).toBe(true);
    expect(verify.entries.every((e) => !e.safeName.startsWith("/"))).toBe(true);
  });

  it("blocks script export when behaviour changed but only bytecode exists", () => {
    const result = exportScriptComponent({
      componentId: "s", fileName: "CoolMod.ts4script", originalBytes: scriptBytes(), behaviorChanged: true, compiledOnly: true,
    });
    expect(result.bytes).toBeUndefined();
    expect(result.errors[0]!.code).toBe("SCRIPT_SOURCE_UNAVAILABLE");
  });

  it("blocks script builds from source because no compiler service exists", () => {
    const result = exportScriptComponent({
      componentId: "s", fileName: "New.ts4script", sourceModules: [{ path: "mod/__init__.py", text: "x = 1" }],
    });
    expect(result.bytes).toBeUndefined();
    expect(result.errors[0]!.code).toBe("SCRIPT_COMPILATION_FAILED");
  });
});

describe("failure handling", () => {
  it("returns no downloads and leaves inputs untouched when a job fails", async () => {
    const content = builderContent();
    const snapshotBefore = JSON.stringify(content);
    content.traits[0]!.internalId = "";
    content.traits[0]!.name = "";
    const job = await runExport({ request: request({ exportType: "package-only" }), builder: content });
    expect(job.status).toBe("failed");
    expect(job.outputFiles).toHaveLength(0);
    expect(job.logs.some((l) => l.level === "error")).toBe(true);
    content.traits[0]!.internalId = "trendsetter";
    content.traits[0]!.name = "Trendsetter";
    expect(JSON.stringify(content)).toBe(snapshotBefore);
  });

  it("cancels safely", async () => {
    const job = await runExport({ request: request(), builder: builderContent(), signal: { cancelled: true } });
    expect(job.status).toBe("failed");
    expect(job.errors[0]!.code).toBe("EXPORT_CANCELLED");
  });
});
