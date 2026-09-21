/**
 * Shared actions for anything that imports Sims 4 mod files.
 *
 * Both the Mod Importer and the Package Importer run uploads through
 * `analyzeUpload` (companion-file grouping, metadata, validation and
 * dependency checks) and then use these helpers to save the result into the
 * open project or hydrate a builder. Keeping them here means the two screens
 * can never drift apart.
 */

import { buildImportFiles } from "./save-to-project";
import { extractBuilderRecords, type ExtractedKind } from "./to-builder";
import type { ModProject } from "./types";
import type { BuilderDetection } from "./detect-builder";

/** Minimal slice of the explorer API these helpers need. */
export interface ExplorerLike {
  ensureScaffold: (projectId: string) => void;
  addFilesAtPath: (
    projectId: string,
    path: string[],
    files: {
      name: string;
      size: number;
      mimeType: string;
      dataUrl?: string;
      resourceKey?: string;
    }[],
  ) => number;
}

/** Minimal slice of the app store these helpers need. */
export interface StoreLike {
  state: {
    careers: { id: string; projectId: string; name: string }[];
    traits: { id: string; projectId: string; name: string }[];
    aspirations: { id: string; projectId: string; name: string }[];
  };
  createCareer: (init: unknown) => { id: string };
  createTrait: (init: unknown) => { id: string };
  createAspiration: (init: unknown) => { id: string };
  updateCareer: (id: string, patch: unknown) => unknown;
  updateTrait: (id: string, patch: unknown) => unknown;
  updateAspiration: (id: string, patch: unknown) => unknown;
}

/**
 * Write every file of an analysed mod into the project's asset tree, keeping
 * the folder layout the importer worked out.
 */
export function saveModFilesToProject(
  project: ModProject,
  bytes: Map<string, Uint8Array>,
  ex: ExplorerLike,
  projectId: string,
): number {
  ex.ensureScaffold(projectId);
  const files = buildImportFiles(project, bytes);
  const byFolder = new Map<string, typeof files>();
  for (const f of files) {
    const key = f.folder.join("/");
    byFolder.set(key, [...(byFolder.get(key) ?? []), f]);
  }
  let saved = 0;
  for (const [key, group] of byFolder) {
    saved += ex.addFilesAtPath(
      projectId,
      key.split("/"),
      group.map((f) => ({
        name: f.name,
        size: f.size,
        mimeType: f.mimeType ?? "application/octet-stream",
        dataUrl: f.dataUrl,
        resourceKey: f.resourceKey,
      })),
    );
  }
  return saved;
}

export interface BuilderImportResult {
  created: number;
  updated: number;
  firstId: string | null;
}

/**
 * Turn the tuning parsed out of an imported mod into editable records on the
 * given project. Records that already exist under the same name are refreshed
 * rather than duplicated.
 */
export function importModIntoBuilders(
  project: ModProject,
  kind: ExtractedKind,
  store: StoreLike,
  projectId: string,
  detection?: BuilderDetection,
): BuilderImportResult {
  const existing =
    kind === "career" ? store.state.careers : kind === "trait" ? store.state.traits : store.state.aspirations;
  const mine = existing.filter((r) => r.projectId === projectId);

  const parsed = extractBuilderRecords(project, kind);
  const payloads: Record<string, unknown>[] = parsed.length
    ? (parsed as unknown as Record<string, unknown>[])
    : (detection?.items ?? []).slice(0, 25).map((item) => ({ name: item.name || item.source }));

  let created = 0;
  let updated = 0;
  let firstId: string | null = null;

  for (const payload of payloads.slice(0, 50)) {
    const name = String(payload.name ?? "").trim();
    if (!name) continue;
    const init = {
      ...payload,
      projectId,
      name,
      description: (payload.description as string) || `Imported from ${project.name}`,
    };
    const hit = mine.find((r) => r.name.toLowerCase() === name.toLowerCase());
    if (hit) {
      if (kind === "career") store.updateCareer(hit.id, init);
      else if (kind === "trait") store.updateTrait(hit.id, init);
      else store.updateAspiration(hit.id, init);
      updated++;
      firstId ??= hit.id;
      continue;
    }
    const rec =
      kind === "career"
        ? store.createCareer(init)
        : kind === "trait"
          ? store.createTrait(init)
          : store.createAspiration(init);
    created++;
    firstId ??= rec.id;
  }
  return { created, updated, firstId };
}
