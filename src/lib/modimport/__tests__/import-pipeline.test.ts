import { describe, expect, it } from "vitest";
import { analyzeUpload } from "@/lib/modimport/analyze";
import { writeDbpf } from "@/lib/modimport/dbpf";
import { exportModProject } from "@/lib/modimport/export";
import { baseName, groupCandidates } from "@/lib/modimport/grouping";
import { writeZip } from "@/lib/modimport/zip";

const enc = new TextEncoder();

const tuning = `<?xml version="1.0" encoding="utf-8"?>
<I c="Trait" i="trait" m="coolmod.traits.night_owl" n="coolmod_NightOwl" s="9876543210">
  <T n="display_name">0x1A2B3C4D</T>
</I>`;

function packageBytes() {
  return writeDbpf([
    {
      typeNum: 0x0333406c,
      groupNum: 0,
      instance: 9876543210n,
      raw: enc.encode(tuning),
      memSize: tuning.length,
      compressionType: 0,
    },
  ]);
}

function scriptBytes() {
  return writeZip([
    {
      name: "coolmod/traits/night_owl.py",
      bytes: enc.encode("import xml_injector\nimport services\n\nclass NightOwl:\n    pass\n"),
    },
  ]);
}

describe("filename normalization", () => {
  it("strips companion suffixes and versions", () => {
    expect(baseName("CoolMod_NightOwl_Script.ts4script")).toBe("coolmod nightowl");
    expect(baseName("CoolMod_NightOwl v1.2.package")).toBe("coolmod nightowl");
  });
});

describe("grouping", () => {
  it("keeps unrelated mods apart", () => {
    const groups = groupCandidates([
      { id: "a", fileName: "AlphaMod.package", relativePath: "AlphaMod.package", folder: "", fileType: "package", checksum: "1" },
      { id: "b", fileName: "BetaThing.package", relativePath: "BetaThing.package", folder: "", fileType: "package", checksum: "2" },
    ]);
    expect(groups).toHaveLength(2);
  });
});

describe("import pipeline", () => {
  it("groups a package with its script and detects the dependency", async () => {
    const { session } = await analyzeUpload([
      { name: "CoolMod_NightOwl.package", relativePath: "CoolMod/CoolMod_NightOwl.package", bytes: packageBytes() },
      { name: "CoolMod_NightOwl.ts4script", relativePath: "CoolMod/CoolMod_NightOwl.ts4script", bytes: scriptBytes() },
    ]);

    expect(session.projects).toHaveLength(1);
    const project = session.projects[0]!;
    expect(project.components).toHaveLength(2);
    expect(project.resources[0]!.editability).toBe("editable");
    expect(project.dependencies.map((d) => d.name)).toContain("XML Injector");
    expect(project.relationships.some((r) => r.relationshipType === "script-handler")).toBe(true);
  });

  it("round-trips untouched files byte-for-byte", async () => {
    const pkg = packageBytes();
    const { session, bytes } = await analyzeUpload([
      { name: "CoolMod_NightOwl.package", relativePath: "CoolMod_NightOwl.package", bytes: pkg },
    ]);
    const report = await exportModProject(session.projects[0]!, bytes);
    expect(report.files[0]!.verbatim).toBe(true);
    expect(report.files[0]!.bytes).toEqual(pkg);
  });
});
