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
import type { ImportedResource, ModProject, ResourceKey } from "./types";

export interface SaveFileEntry {
  /** Folder path segments below the project root. */
  folder: string[];
  name: string;
  size: number;
  mimeType?: string;
  dataUrl: string;
  /** "type!group!instance" for files that came from a package resource. */
  resourceKey?: string;
}

/** Sidecar written next to an imported mod so edits can be rebuilt back into it. */
export interface ResourceManifest {
  version: 1;
  mod: string;
  resources: {
    key: ResourceKey;
    /** Path relative to the imported mod folder. */
    path: string;
    /** File name of the .package this resource came from. */
    sourceFile: string;
    typeLabel: string;
    encoding: "xml" | "stbl-json" | "preserved";
    byteSize: number;
  }[];
}

const BINARY_EXT: Record<string, string> = {
  simdata: ".simdata",
  image: ".dds",
  audio: ".audio",
  localization: ".stbl",
  data: ".data",
};

function binaryExtension(resource: ImportedResource): string {
  const sub = (resource.subtype ?? "").toLowerCase();
  if (sub === "dds") return ".dds";
  if (sub === "png") return ".png";
  if (sub === "jpeg") return ".jpg";
  if (sub === "zip") return ".zip";
  if (sub === "rcol") return ".rcol";
  return BINARY_EXT[sub] ?? ".bin";
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

  const manifest: ResourceManifest = { version: 1, mod: project.name, resources: [] };

  for (const resource of project.resources) {
    const component = project.components.find((c) => c.id === resource.componentId);
    const base = safeName(resource.name || `${resource.key.type}_${resource.key.instance}`);
    const keyTag = `${resource.key.type}!${resource.key.group}!${resource.key.instance}`;

    let folder: string[];
    let fileName: string;
    let mime: string;
    let size: number;
    let dataUrl: string;

    if (resource.text !== undefined) {
      folder = [...root, "Tuning"];
      fileName = `${base}.xml`;
      mime = "text/xml";
      size = resource.text.length;
      dataUrl = textToDataUrl(resource.text, mime);
    } else if (resource.strings?.length) {
      folder = [...root, "Localization"];
      fileName = `${base}.json`;
      mime = "application/json";
      const json = JSON.stringify(
        Object.fromEntries(resource.strings.map((s) => [s.key, s.value])),
        null,
        2,
      );
      size = json.length;
      dataUrl = textToDataUrl(json, mime);
    } else {
      // Preserved binary: recorded as a read-only stub file so it is visible,
      // addressable, and rebuildable. Bytes stay in the original .package.
      folder = [...root, "Preserved"];
      fileName = `${base}${binaryExtension(resource)}.info.txt`;
      mime = "text/plain";

      const stub = [
        `Resource ${keyTag}`,
        `Type: ${resource.typeLabel}`,
        `Format: ${resource.subtype ?? "binary"}`,
        `Size: ${resource.byteSize} bytes`,
        `Source: ${component?.originalFileName ?? "unknown"}`,
        "",
        "Preserved byte-for-byte. Rebuilding this package copies the original bytes.",
      ].join("\n");
      size = resource.byteSize;
      dataUrl = textToDataUrl(stub, "text/plain");
    }

    files.push({ folder, name: fileName, size, mimeType: mime, dataUrl, resourceKey: keyTag });
    manifest.resources.push({
      key: resource.key,
      path: [...folder.slice(root.length), fileName].join("/"),
      sourceFile: component?.originalFileName ?? "",
      typeLabel: resource.typeLabel,
      encoding:
        resource.text !== undefined ? "xml" : resource.strings?.length ? "stbl-json" : "preserved",
      byteSize: resource.byteSize,
    });
  }

  const manifestJson = JSON.stringify(manifest, null, 2);
  files.push({
    folder: [...root],
    name: "resources.json",
    size: manifestJson.length,
    mimeType: "application/json",
    dataUrl: textToDataUrl(manifestJson, "application/json"),
  });


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
