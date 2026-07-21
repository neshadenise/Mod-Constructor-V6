/**
 * Storage adapter — the seam where Codex swaps localStorage for real
 * desktop file storage, SQLite, or a cloud backend without touching UI code.
 *
 * The store (src/lib/store.tsx) depends only on this interface.
 */

export interface StorageAdapter {
  /** Read a JSON-serializable value by key. Returns null when unset. */
  read<T>(key: string): Promise<T | null>;
  /** Persist a JSON-serializable value under the given key. */
  write<T>(key: string, value: T): Promise<void>;
  /** Delete one key. */
  remove(key: string): Promise<void>;
  /** Clear every key managed by this adapter. Used by "Reset Demo Data". */
  clear(): Promise<void>;
  /** Debug label surfaced in Settings → About. */
  readonly label: string;
}

/* ---------- Default: localStorage (browser + Electron renderer) ---------- */

const NAMESPACE = "mc.v6.";

export const localStorageAdapter: StorageAdapter = {
  label: "Browser localStorage",
  async read<T>(key: string) {
    try {
      const raw = localStorage.getItem(NAMESPACE + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  async write<T>(key: string, value: T) {
    try {
      localStorage.setItem(NAMESPACE + key, JSON.stringify(value));
    } catch {
      /* quota — ignore in prototype */
    }
  },
  async remove(key: string) {
    localStorage.removeItem(NAMESPACE + key);
  },
  async clear() {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(NAMESPACE)) doomed.push(k);
    }
    doomed.forEach((k) => localStorage.removeItem(k));
  },
};

/* ---------- In-memory fallback for SSR / tests ---------- */

export function createMemoryAdapter(): StorageAdapter {
  const bag = new Map<string, string>();
  return {
    label: "In-memory (transient)",
    async read<T>(key: string) {
      const raw = bag.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    },
    async write<T>(key: string, value: T) {
      bag.set(key, JSON.stringify(value));
    },
    async remove(key: string) {
      bag.delete(key);
    },
    async clear() {
      bag.clear();
    },
  };
}

/**
 * Placeholders Codex will implement natively.
 *
 * Desktop:
 *   - Read/write JSON files under <userdata>/ModConstructor/state.json
 *   - Assets stored as real files under <userdata>/ModConstructor/assets/
 *
 * SQLite (via Tauri plugin, better-sqlite3, or similar):
 *   - One row per top-level collection; use a single "state" table for
 *     drop-in parity with this adapter.
 */
