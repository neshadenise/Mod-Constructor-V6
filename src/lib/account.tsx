import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Account = {
  id: string;
  email: string;
  displayName: string;
  createdAt: number;
  lastSignInAt: number;
};

/**
 * Cloud sync is optional. Until a sync service is configured for the build,
 * accounts are stored on this device only: the app is fully usable signed out,
 * but projects cannot be resumed from another machine.
 */
export const SYNC_CONFIGURED = false;

export type SyncState = "offline" | "local-account" | "synced";

type AccountCtx = {
  account: Account | null;
  accounts: Account[];
  syncState: SyncState;
  signIn: (email: string, displayName?: string) => Account;
  signOut: () => void;
  forget: (id: string) => void;
};

const Ctx = createContext<AccountCtx | null>(null);
const KEY = "mc.account.v1";

type Persisted = { accounts: Account[]; activeId: string | null };

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { accounts: [], activeId: null };
    const parsed = JSON.parse(raw) as Persisted;
    return { accounts: parsed.accounts ?? [], activeId: parsed.activeId ?? null };
  } catch {
    return { accounts: [], activeId: null };
  }
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>({ accounts: [], activeId: null });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  const signIn = useCallback((email: string, displayName?: string) => {
    const normalized = email.trim().toLowerCase();
    const id = `acct_${normalized}`;
    const account: Account = {
      id,
      email: normalized,
      displayName: displayName?.trim() || normalized.split("@")[0] || "Modder",
      createdAt: Date.now(),
      lastSignInAt: Date.now(),
    };
    setState((s) => {
      const existing = s.accounts.find((a) => a.id === id);
      const merged = existing
        ? { ...existing, displayName: displayName?.trim() || existing.displayName, lastSignInAt: Date.now() }
        : account;
      return {
        accounts: [merged, ...s.accounts.filter((a) => a.id !== id)],
        activeId: id,
      };
    });
    return account;
  }, []);

  const signOut = useCallback(() => setState((s) => ({ ...s, activeId: null })), []);

  const forget = useCallback(
    (id: string) =>
      setState((s) => ({
        accounts: s.accounts.filter((a) => a.id !== id),
        activeId: s.activeId === id ? null : s.activeId,
      })),
    [],
  );

  const account = state.accounts.find((a) => a.id === state.activeId) ?? null;
  const syncState: SyncState = !account ? "offline" : SYNC_CONFIGURED ? "synced" : "local-account";

  const value = useMemo(
    () => ({ account, accounts: state.accounts, syncState, signIn, signOut, forget }),
    [account, state.accounts, syncState, signIn, signOut, forget],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccount() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAccount must be used within AccountProvider");
  return v;
}

export const SYNC_LABEL: Record<SyncState, string> = {
  offline: "Working offline · this device only",
  "local-account": "Signed in · device account (cloud sync not configured)",
  synced: "Signed in · projects sync across devices",
};

export function initials(name: string) {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
