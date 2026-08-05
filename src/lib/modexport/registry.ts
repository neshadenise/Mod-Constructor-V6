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

export function registerImportedProject(project: ModProject, originals: Map<string, Uint8Array>) {
  registry.set(project.id, { project, originals });
  listeners.forEach((l) => l());
}

export function unregisterImportedProject(id: string) {
  registry.delete(id);
  listeners.forEach((l) => l());
}

export function listImportedProjects(): RegisteredImport[] {
  return [...registry.values()];
}

export function getImportedProject(id: string) {
  return registry.get(id);
}

export function subscribeImports(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
