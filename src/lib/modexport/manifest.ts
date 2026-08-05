/**
 * Machine readable manifest + human documentation for an export.
 * The manifest describes the files; the game never needs it to load the mod.
 */

import { MANIFEST_SCHEMA, type ExportSnapshot, type ExportedFile, type ExportedModManifest } from "./types";

export function buildManifest(
  snapshot: ExportSnapshot,
  files: ExportedFile[],
): ExportedModManifest {
  const componentByName = new Map(snapshot.components.map((c) => [c.fileName, c]));
  return {
    schemaVersion: MANIFEST_SCHEMA,
    mod: {
      name: snapshot.projectName,
      creator: snapshot.creator,
      version: snapshot.projectVersion,
      description: snapshot.description,
    },
    components: files
      .filter((f) => f.kind !== "manifest" && f.kind !== "zip")
      .map((f) => {
        const component = componentByName.get(f.name);
        return {
          fileName: f.name,
          type: f.kind,
          role: component?.role ?? (f.kind === "project-source" ? "project-source" : "documentation"),
          required: component?.required ?? false,
          checksum: f.checksum,
        };
      }),
    dependencies: snapshot.dependencies.map((d) => ({
      name: d.name,
      required: d.required,
      included: Boolean(d.installedComponentId) && snapshot.settings.includeDependencies,
    })),
    builder: {
      projectId: snapshot.projectId,
      exporterVersion: snapshot.exporterVersion,
    },
  };
}

export function buildDependencyFile(snapshot: ExportSnapshot) {
  return {
    schemaVersion: "moddependencies/1",
    mod: snapshot.projectName,
    dependencies: snapshot.dependencies.map((d) => ({
      name: d.name,
      required: d.required,
      detectedFrom: d.detectedFrom,
      confidence: d.confidence,
      reason: d.notes ?? (d.required ? "Required for this mod to function." : "Optional enhancement."),
      included: Boolean(d.installedComponentId) && snapshot.settings.includeDependencies,
      note: snapshot.settings.includeDependencies
        ? undefined
        : "Install this separately from the original creator — it is not redistributed here.",
    })),
  };
}

export function buildReadme(snapshot: ExportSnapshot, files: ExportedFile[]) {
  const lines = [
    snapshot.projectName,
    "=".repeat(snapshot.projectName.length),
    "",
    snapshot.creator ? `Creator: ${snapshot.creator}` : "",
    snapshot.projectVersion ? `Version: ${snapshot.projectVersion}` : "",
    snapshot.description ? `\n${snapshot.description}\n` : "",
    "Installation",
    "------------",
    "Copy the .package and .ts4script files into Documents/Electronic Arts/The Sims 4/Mods.",
    "Script mods require 'Enable Custom Content and Mods' and 'Script Mods Allowed' in Game Options.",
    "",
    "Files",
    "-----",
    ...files
      .filter((f) => f.kind !== "zip")
      .map((f) => `  ${f.name}  (${f.kind}, ${f.size} bytes, ${f.verbatim ? "preserved" : "rebuilt"})`),
    "",
  ];
  const required = snapshot.dependencies.filter((d) => d.required);
  if (required.length) {
    lines.push("Required separately", "-------------------");
    for (const d of required) lines.push(`  ${d.name}${d.notes ? ` — ${d.notes}` : ""}`);
    lines.push("");
  }
  lines.push(`Built with Mod Constructor V6 exporter ${snapshot.exporterVersion}.`);
  return lines.filter((l) => l !== undefined).join("\n");
}
