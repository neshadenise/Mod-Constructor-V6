/**
 * Save an analysed ModProject into the current project's Explorer assets.
 *
 * Everything an import produced becomes a real file in the project:
 *   - the original uploaded files (.package / .ts4script / docs), byte-for-byte
 *   - every editable tuning resource as a .xml file you can open and edit
 *   - every string table as a .json file
 *
 * Files are plain Explorer items, so the normal open / edit / rename / delete
 * flow works on them afterwards.
 */
import type { ModProject } from "./types";

export interface SaveFileEntry {
  /** Folder path segments below the project root. */
  folder: string[];
  name: string;
  size: number;
  mimeType?: string;
  dataUrl: string;
}

const CHUNK = 0x8000;

export function bytesToDataUrl(bytes: Uint8Array, mime = "application/octet-stream"): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

export function textToDataUrl(text: string, mime = "text/plain"): string {
  const bytes = new TextEncoder().encode(text);
  return bytesToDataUrl(bytes, mime);
}

function safeName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "-").trim() || "untitled";
}

const FOLDER_FOR_TYPE: Record<string, string> = {
  package: "Packages",
  ts4script: "Scripts",
  xml: "Tuning",
  json: "Other Assets",
  image: "Images",
  text: "Documentation",
  config: "Other Assets",
  archive: "Other Assets",
  unknown: "Other Assets",
};

const MIME_FOR_TYPE: Record<string, string> = {
  xml: "text/xml",
  json: "application/json",
  text: "text/plain",
  image: "image/png",
};

/**
 * Build the file list for one imported mod. `originals` maps componentId to
 * the exact uploaded bytes (as returned by analyzeUpload).
 */
export function buildImportFiles(
  project: ModProject,
  originals: Map<string, Uint8Array>,
): SaveFileEntry[] {
  const root = ["Imported", safeName(project.name)];
  const files: SaveFileEntry[] = [];

  for (const component of project.components) {
    const bytes = originals.get(component.id);
    if (!bytes) continue;
    files.push({
      folder: [...root, FOLDER_FOR_TYPE[component.fileType] ?? "Other Assets"],
      name: safeName(component.originalFileName),
      size: bytes.byteLength,
      mimeType: MIME_FOR_TYPE[component.fileType] ?? "application/octet-stream",
      dataUrl: bytesToDataUrl(bytes, MIME_FOR_TYPE[component.fileType] ?? "application/octet-stream"),
    });
  }

  for (const resource of project.resources) {
    const base = safeName(resource.name || `${resource.key.type}_${resource.key.instance}`);
    if (resource.text) {
      const text = resource.text;
      files.push({
        folder: [...root, "Tuning"],
        name: `${base}.xml`,
        size: text.length,
        mimeType: "text/xml",
        dataUrl: textToDataUrl(text, "text/xml"),
      });
    } else if (resource.strings?.length) {
      const json = JSON.stringify(
        Object.fromEntries(resource.strings.map((s) => [s.key, s.value])),
        null,
        2,
      );
      files.push({
        folder: [...root, "Localization"],
        name: `${base}.json`,
        size: json.length,
        mimeType: "application/json",
        dataUrl: textToDataUrl(json, "application/json"),
      });
    }
  }

  const summary = [
    `Mod: ${project.name}`,
    project.creator ? `Creator: ${project.creator}` : null,
    project.version ? `Version: ${project.version}` : null,
    project.description ? `Description: ${project.description}` : null,
    `Imported: ${new Date(project.importedAt || Date.now()).toLocaleString()}`,
    `Files: ${project.components.length}`,
    `Resources: ${project.resources.length}`,
    "",
    "Why these files were grouped:",
    ...project.groupingReasons.map((r) => `  - ${r}`),
    ...(project.supportReasons?.length
      ? ["", "Support notes:", ...project.supportReasons.map((r) => `  - ${r}`)]
      : []),
  ]
    .filter(Boolean)
    .join("\n");

  files.push({
    folder: [...root],
    name: "import-notes.md",
    size: summary.length,
    mimeType: "text/markdown",
    dataUrl: textToDataUrl(summary, "text/markdown"),
  });

  return files;
}
