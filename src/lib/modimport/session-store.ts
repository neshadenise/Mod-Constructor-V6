/**
 * Durable import sessions.
 *
 * An import used to live only in React state, so reloading the app — or the
 * app updating itself — threw the analysis and the original bytes away. This
 * module parks the whole session (analysis + raw file bytes) in IndexedDB so
 * the Mod Importer can pick up exactly where you left off.
 *
 * IndexedDB is used instead of localStorage because package bytes routinely
 * run into tens of megabytes, well past the localStorage quota.
 */

import type { ImportSession, ModProject } from "./types";

const DB_NAME = "mc.v6.modimport";
const DB_VERSION = 1;
const STORE = "sessions";
const KEY = "current";

export interface PersistedImport {
  session: ImportSession;
  projects: ModProject[];
  /** Raw bytes keyed by component/resource id, as produced by analyzeUpload. */
  bytes: Record<string, Uint8Array>;
  savedAt: string;
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const t = db.transaction(STORE, mode);
      const req = run(t.objectStore(STORE));
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
      t.oncomplete = () => db.close();
    } catch {
      db.close();
      resolve(null);
    }
  });
}

/** Persist the current import so it survives reloads and app updates. */
export async function saveImportSession(
  session: ImportSession,
  projects: ModProject[],
  bytes: Map<string, Uint8Array>,
): Promise<void> {
  const record: PersistedImport = {
    session,
    projects,
    bytes: Object.fromEntries(bytes),
    savedAt: new Date().toISOString(),
  };
  await tx("readwrite", (s) => s.put(record, KEY) as IDBRequest<unknown> as IDBRequest<void>);
}

/** Restore the last import, or null when there is nothing stored. */
export async function loadImportSession(): Promise<{
  session: ImportSession;
  projects: ModProject[];
  bytes: Map<string, Uint8Array>;
  savedAt: string;
} | null> {
  const rec = await tx<PersistedImport>("readonly", (s) => s.get(KEY) as IDBRequest<PersistedImport>);
  if (!rec?.session) return null;
  const bytes = new Map<string, Uint8Array>();
  for (const [k, v] of Object.entries(rec.bytes ?? {})) {
    bytes.set(k, v instanceof Uint8Array ? v : new Uint8Array(v as ArrayBufferLike));
  }
  return { session: rec.session, projects: rec.projects ?? [], bytes, savedAt: rec.savedAt };
}

/** Forget the stored import (used by "Clear import"). */
export async function clearImportSession(): Promise<void> {
  await tx("readwrite", (s) => s.delete(KEY) as IDBRequest<unknown> as IDBRequest<void>);
}
