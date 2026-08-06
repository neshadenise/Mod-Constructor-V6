import { describe, expect, it } from "vitest";
import { analyzeUpload } from "@/lib/modimport/analyze";
import { readDbpf, writeDbpf, readDbpfResource } from "@/lib/modimport/dbpf";
import { sniffFormat } from "@/lib/modimport/resource-types";
import { rebuildPackages } from "@/lib/modimport/rebuild";
import { buildImportFiles, type ResourceManifest } from "@/lib/modimport/save-to-project";

const enc = new TextEncoder();
const dec = new TextDecoder();

const tuning = `<?xml version="1.0" encoding="utf-8"?>
<I c="Trait" i="trait" m="coolmod.traits.night_owl" n="coolmod_NightOwl" s="9876543210">
  <T n="display_name">0x1A2B3C4D</T>
</I>`;

/** XML stored under a type id the app does not have in its table. */
const UNKNOWN_TYPE = 0x0badf00d;

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
    {
      typeNum: UNKNOWN_TYPE,
      groupNum: 0,
      instance: 111n,
      raw: enc.encode(tuning),
      memSize: tuning.length,
      compressionType: 0,
    },
    {
      typeNum: 0x545ac67a, // SimData — preserved binary
      groupNum: 0,
      instance: 222n,
      raw: new Uint8Array([0x44, 0x41, 0x54, 0x41, 0, 1, 2, 3]),
      memSize: 8,
      compressionType: 0,
    },
  ]);
}

describe("format sniffing", () => {
  it("identifies payloads by content", () => {
    expect(sniffFormat(enc.encode(tuning))).toBe("xml");
    expect(sniffFormat(enc.encode("STBL\u0005"))).toBe("stbl");
    expect(sniffFormat(enc.encode("DDS "))).toBe("dds");
    expect(sniffFormat(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe("png");
    expect(sniffFormat(new Uint8Array([0, 1, 2, 3, 4]))).toBe("binary");
  });
});

describe("unknown resource types", () => {
  it("treats XML under an unknown type id as editable, and known binaries as preserved", async () => {
    const { session } = await analyzeUpload([
      { name: "CoolMod.package", relativePath: "CoolMod.package", bytes: packageBytes() },
    ]);
    const project = session.projects[0]!;
    const editable = project.resources.filter((r) => r.editability === "editable");
    const preserved = project.resources.filter((r) => r.editability === "read-only");
    const unknown = project.resources.filter((r) => r.editability === "preserved-unsupported");

    expect(editable).toHaveLength(2); // known tuning + sniffed XML
    expect(preserved).toHaveLength(1); // SimData
    expect(unknown).toHaveLength(0);
    expect(project.importStatus).not.toBe("partially-supported");
  });
});

describe("save-to-project manifest and rebuild", () => {
  it("writes a manifest for every resource and rebuilds edits back into the package", async () => {
    const bytes = packageBytes();
    const { session, bytes: originals } = await analyzeUpload([
      { name: "CoolMod.package", relativePath: "CoolMod.package", bytes },
    ]);
    const project = session.projects[0]!;
    const files = buildImportFiles(project, originals);

    const manifestFile = files.find((f) => f.name === "resources.json");
    expect(manifestFile).toBeTruthy();
    const manifest = JSON.parse(
      dec.decode(Uint8Array.from(atob(manifestFile!.dataUrl.split(",")[1]!), (c) => c.charCodeAt(0))),
    ) as ResourceManifest;
    expect(manifest.resources).toHaveLength(project.resources.length);

    // Edit one tuning file, leave everything else alone.
    const target = manifest.resources.find((r) => r.encoding === "xml")!;
    const editedText = tuning.replace("0x1A2B3C4D", "0xDEADBEEF");

    const rebuilt = await rebuildPackages({
      packages: new Map([["CoolMod.package", bytes]]),
      manifest,
      files: new Map(
        manifest.resources.map((r) => [
          r.path,
          r.path === target.path
            ? { path: r.path, text: editedText }
            : { path: r.path, text: r.encoding === "xml" ? tuning : undefined },
        ]),
      ),
    });

    expect(rebuilt).toHaveLength(1);
    const out = rebuilt[0]!;
    expect(out.editedResources).toBe(1);
    expect(out.verbatimResources).toBe(2);
    expect(out.verified).toBe(true);

    const pkg = readDbpf(out.bytes);
    expect(pkg.entries).toHaveLength(3);
    const edited = pkg.entries.find(
      (e) => e.key.instance.toUpperCase() === target.key.instance.toUpperCase(),
    )!;
    expect(dec.decode(await readDbpfResource(edited))).toContain("0xDEADBEEF");

    // Untouched SimData must be byte-identical to the original.
    const original = readDbpf(bytes).entries.find((e) => e.typeNum === 0x545ac67a)!;
    const after = pkg.entries.find((e) => e.typeNum === 0x545ac67a)!;
    expect(Array.from(after.raw)).toEqual(Array.from(original.raw));
  });
});
