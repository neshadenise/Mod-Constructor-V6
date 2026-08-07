/**
 * In-memory bridge between the Mod Importer session and the Export Center.
 * Imported originals stay in memory only — they are never persisted.
 */

import type { ModProject } from "@/lib/modimport/types";

export interface RegisteredImport {
  project: ModProject;
  originals: Map<string, Uint8Array>;
}

const registry = new Map<string, RegisteredImport>();
const listeners = new Set<() => void>();

/**
 * Cached snapshot. useSyncExternalStore requires a referentially stable value
 * between notifications — rebuilding the array on every read caused an
 * infinite render loop in the Export Center.
 */
let snapshot: RegisteredImport[] = [];

function refresh() {
  snapshot = [...registry.values()];
  listeners.forEach((l) => l());
}

export function registerImportedProject(project: ModProject, originals: Map<string, Uint8Array>) {
  registry.set(project.id, { project, originals });
  refresh();
}

export function unregisterImportedProject(id: string) {
  if (registry.delete(id)) refresh();
}

export function listImportedProjects(): RegisteredImport[] {
  return snapshot;
}

export function getImportedProject(id: string) {
  return registry.get(id);
}

export function subscribeImports(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

