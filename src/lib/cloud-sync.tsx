/**
 * Cloud sync.
 *
 * Local-first: the workspace always lives in the local storage adapter. When an
 * account is signed in we mirror it to `workspace_state` so the same projects
 * can be resumed on another machine. Newest copy wins on sign-in.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { useStore } from "@/lib/store";
import type { AppState } from "@/lib/types";

type CloudSyncApi = {
  lastSyncedAt: number | null;
  syncNow: () => Promise<void>;
};

const Ctx = createContext<CloudSyncApi>({ lastSyncedAt: null, syncNow: async () => {} });

const PUSH_DEBOUNCE_MS = 4000;
const PUSH_KEY = "mc.cloud.lastPush";

function lastLocalPush(): number {
  try {
    return Number(localStorage.getItem(PUSH_KEY) ?? 0);
  } catch {
    return 0;
  }
}

export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const { account, setSyncState } = useAccount();
  const store = useStore();
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const pulledFor = useRef<string | null>(null);
  const stateRef = useRef(store.state);
  stateRef.current = store.state;

  const push = useCallback(async () => {
    if (!account) return;
    setSyncState("syncing");
    const { error } = await supabase
      .from("workspace_state")
      .upsert(
        { user_id: account.id, data: stateRef.current } as never,
        { onConflict: "user_id" },
      );
    if (error) {
      setSyncState("error");
      return;
    }
    const at = Date.now();
    try {
      localStorage.setItem(PUSH_KEY, String(at));
    } catch {
      /* storage unavailable — sync still works for this session */
    }
    setLastSyncedAt(at);
    setSyncState("synced");
  }, [account, setSyncState]);

  /* Pull once per sign-in: the remote copy wins when it is newer. */
  useEffect(() => {
    if (!account || !store.hydrated) return;
    if (pulledFor.current === account.id) return;
    pulledFor.current = account.id;
    let alive = true;
    (async () => {
      setSyncState("syncing");
      const { data, error } = await supabase
        .from("workspace_state")
        .select("data, updated_at")
        .eq("user_id", account.id)
        .maybeSingle();
      if (!alive) return;
      if (error) {
        setSyncState("error");
        return;
      }
      const remote = data?.data as AppState | undefined;
      const remoteAt = data?.updated_at ? Date.parse(data.updated_at) : 0;
      const localAt = lastLocalPush();
      if (remote && remoteAt > localAt) {
        store.replaceState(remote);
        setLastSyncedAt(Date.now());
        setSyncState("synced");
      } else {
        await push();
      }
    })();
    return () => {
      alive = false;
    };
  }, [account, store, store.hydrated, push, setSyncState]);

  /* Mirror local edits upward, debounced. */
  useEffect(() => {
    if (!account || !store.hydrated) return;
    if (pulledFor.current !== account.id) return;
    const t = setTimeout(() => void push(), PUSH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [account, store.hydrated, store.state, push]);

  useEffect(() => {
    if (!account) {
      pulledFor.current = null;
      setLastSyncedAt(null);
    }
  }, [account]);

  const value = useMemo(() => ({ lastSyncedAt, syncNow: push }), [lastSyncedAt, push]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCloudSync() {
  return useContext(Ctx);
}
