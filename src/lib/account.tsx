import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";

export type Account = {
  id: string;
  email: string;
  displayName: string;
};

/**
 * Cloud sync is available: signing in stores an encrypted-at-rest copy of the
 * workspace against the account so a build can continue on another device.
 * The app remains fully usable signed out — everything is saved locally first.
 */
export const SYNC_CONFIGURED = true;

export type SyncState = "offline" | "syncing" | "synced" | "error";

type AccountCtx = {
  account: Account | null;
  ready: boolean;
  syncState: SyncState;
  setSyncState: (s: SyncState) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AccountCtx | null>(null);

function toAccount(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null): Account | null {
  if (!user) return null;
  const email = user.email ?? "";
  const meta = user.user_metadata ?? {};
  const displayName =
    (typeof meta.display_name === "string" && meta.display_name) ||
    email.split("@")[0] ||
    "Modder";
  return { id: user.id, email, displayName };
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("offline");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAccount(toAccount(session?.user ?? null));
      if (!session) setSyncState("offline");
    });
    supabase.auth.getSession().then(({ data }) => {
      setAccount(toAccount(data.session?.user ?? null));
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: displayName?.trim() ? { display_name: displayName.trim() } : undefined,
      },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAccount(null);
    setSyncState("offline");
  }, []);

  const value = useMemo(
    () => ({ account, ready, syncState, setSyncState, signIn, signUp, signOut }),
    [account, ready, syncState, signIn, signUp, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccount() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAccount must be used within AccountProvider");
  return v;
}

export const SYNC_LABEL: Record<SyncState, string> = {
  offline: "Working offline · saved on this device only",
  syncing: "Syncing your workspace…",
  synced: "Signed in · your workspace syncs across devices",
  error: "Signed in · last sync failed, changes are still saved locally",
};

export function initials(name: string) {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
