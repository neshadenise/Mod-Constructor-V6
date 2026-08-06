/**
 * Bridge between Project Explorer files and the package rebuild engine.
 *
 * The importer writes each mod into `Imported/<mod name>/…` with a
 * `resources.json` manifest. This module discovers those folders in the active
 * project, reads the current content of every file, and produces the input the
 * rebuild engine needs. Everything is read from persisted Explorer state, so
 * rebuilding works after a reload and does not depend on the import session.
 */

import type { ProjectExplorerItem } from "@/lib/explorer";
import type { RebuildFile, RebuildSource } from "./rebuild";
import type { ResourceManifest } from "./save-to-project";

export interface ImportedModFolder {
  /** Explorer folder id of the mod root. */
  id: string;
  name: string;
  source: RebuildSource;
  /** Files listed in the manifest that no longer exist in the project. */
  missingFiles: number;
}

function decodeDataUrl(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const meta = dataUrl.slice(0, comma);
  const body = dataUrl.slice(comma + 1);
  if (!meta.includes(";base64")) return new TextEncoder().encode(decodeURIComponent(body));
  const binary = atob(body);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function dataUrlToText(dataUrl: string): string {
  return new TextDecoder().decode(decodeDataUrl(dataUrl));
}

/** Discovers every imported mod folder in a project that carries a manifest. */
export function collectImportedMods(items: ProjectExplorerItem[], projectId: string): ImportedModFolder[] {
  const live = items.filter((i) => i.projectId === projectId && !i.deletedAt);
  const childrenOf = (parentId: string | null) => live.filter((i) => i.parentFolderId === parentId);

  const importedRoot = live.find(
    (i) => i.itemType === "folder" && i.parentFolderId === null && i.name.toLowerCase() === "imported",
  );
  if (!importedRoot) return [];

  const mods: ImportedModFolder[] = [];
  for (const modFolder of childrenOf(importedRoot.id).filter((i) => i.itemType === "folder")) {
    const manifestFile = childrenOf(modFolder.id).find(
      (i) => i.itemType === "file" && i.name.toLowerCase() === "resources.json" && i.dataUrl,
    );
    if (!manifestFile?.dataUrl) continue;

    let manifest: ResourceManifest;
    try {
      manifest = JSON.parse(dataUrlToText(manifestFile.dataUrl)) as ResourceManifest;
    } catch {
      continue;
    }

    // Index every descendant file by its path relative to the mod folder.
    const byPath = new Map<string, ProjectExplorerItem>();
    const walk = (folderId: string, prefix: string[]) => {
      for (const child of childrenOf(folderId)) {
        if (child.itemType === "folder") walk(child.id, [...prefix, child.name]);
        else byPath.set([...prefix, child.name].join("/"), child);
      }
    };
    walk(modFolder.id, []);

    const packages = new Map<string, Uint8Array>();
    for (const [path, item] of byPath) {
      if (!path.toLowerCase().endsWith(".package") || !item.dataUrl) continue;
      try {
        packages.set(item.name, decodeDataUrl(item.dataUrl));
      } catch {
        /* unreadable original — skipped, reported by the rebuild engine */
      }
    }

    const files = new Map<string, RebuildFile>();
    let missingFiles = 0;
    for (const record of manifest.resources) {
      const item = byPath.get(record.path);
      if (!item) {
        files.set(record.path, { path: record.path, missing: true });
        missingFiles++;
        continue;
      }
      if (record.encoding === "preserved" || !item.dataUrl) {
        files.set(record.path, { path: record.path });
        continue;
      }
      files.set(record.path, { path: record.path, text: dataUrlToText(item.dataUrl) });
    }

    mods.push({
      id: modFolder.id,
      name: modFolder.name,
      missingFiles,
      source: { packages, manifest, files },
    });
  }

  return mods;
}
