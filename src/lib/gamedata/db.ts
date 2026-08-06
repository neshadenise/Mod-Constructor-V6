/**
 * IndexedDB-backed cache for game reference data.
 *
 * Everything the Game Data system downloads or indexes lives here so it
 * survives reloads and app updates — the same reason the mod importer keeps
 * its sessions in IndexedDB rather than localStorage. Payloads (TDESC class
 * docs, enum tables, local package indexes) are far too large for the
 * localStorage quota.
 */

const DB_NAME = "mc.v6.gamedata";
const DB_VERSION = 1;

export const STORE_TDESC = "tdesc";
export const STORE_META = "meta";
export const STORE_LOCAL = "local";

const STORES = [STORE_TDESC, STORE_META, STORE_LOCAL] as const;
export type StoreName = (typeof STORES)[number];

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
      for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
}

async function run<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  op: (s: IDBObjectStore) => IDBRequest,
): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const t = db.transaction(store, mode);
      const req = op(t.objectStore(store));
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
      t.oncomplete = () => db.close();
    } catch {
      db.close();
      resolve(null);
    }
  });
}

export function idbGet<T>(store: StoreName, key: string): Promise<T | null> {
  return run<T>(store, "readonly", (s) => s.get(key));
}

export async function idbSet(store: StoreName, key: string, value: unknown): Promise<void> {
  await run(store, "readwrite", (s) => s.put(value, key));
}

export async function idbDelete(store: StoreName, key: string): Promise<void> {
  await run(store, "readwrite", (s) => s.delete(key));
}

export async function idbKeys(store: StoreName): Promise<string[]> {
  const keys = await run<IDBValidKey[]>(store, "readonly", (s) => s.getAllKeys());
  return (keys ?? []).map(String);
}

export async function idbAll<T>(store: StoreName): Promise<T[]> {
  const all = await run<T[]>(store, "readonly", (s) => s.getAll());
  return all ?? [];
}

export async function idbClear(store: StoreName): Promise<void> {
  await run(store, "readwrite", (s) => s.clear());
}

/** Rough on-device size of a cached store, for the "cache size" readout. */
export async function idbApproxSize(store: StoreName): Promise<number> {
  const all = await idbAll<unknown>(store);
  let bytes = 0;
  for (const item of all) {
    try {
      bytes += JSON.stringify(item).length;
    } catch {
      /* unserializable entries don't count toward the estimate */
    }
  }
  return bytes;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
