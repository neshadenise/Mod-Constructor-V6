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
import { SECTION_LABEL, type SectionId } from "@/components/mc/sections";

export type WorkTab = {
  id: SectionId;
  title: string;
  /**
   * Pinned tabs stick around. Unpinned tabs are transient: opening a new
   * section replaces the current unpinned tab instead of stacking up.
   * Dashboard is always pinned.
   */
  pinned?: boolean;
};

type TabsCtx = {
  tabs: WorkTab[];
  active: SectionId;
  open: (id: SectionId) => void;
  close: (id: SectionId) => void;
  closeOthers: (id: SectionId) => void;
  closeAll: () => void;
  cycle: (dir: 1 | -1) => void;
  move: (from: number, to: number) => void;
  togglePin: (id: SectionId) => void;
};

const Ctx = createContext<TabsCtx | null>(null);
const KEY = "mc.tabs.v1";
const DEFAULT: WorkTab[] = [{ id: "dashboard", title: SECTION_LABEL.dashboard, pinned: true }];


export function TabsProvider({
  children,
  allowed,
}: {
  children: ReactNode;
  /** Sections currently reachable (advanced-mode gating). */
  allowed?: (id: SectionId) => boolean;
}) {
  const [tabs, setTabs] = useState<WorkTab[]>(DEFAULT);
  const [active, setActive] = useState<SectionId>("dashboard");
  const [hydrated, setHydrated] = useState(false);
  const activeRef = useRef<SectionId>("dashboard");
  activeRef.current = active;


  // Restore after mount so SSR and first client render match.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { tabs: WorkTab[]; active: SectionId };
        const valid = (parsed.tabs ?? []).filter((t) => t && t.id in SECTION_LABEL);
        if (valid.length) {
          const withDash = valid.some((t) => t.id === "dashboard") ? valid : [...DEFAULT, ...valid];
          setTabs(withDash.map((t) => (t.id === "dashboard" ? { ...t, pinned: true } : t)));
          if (withDash.some((t) => t.id === parsed.active)) setActive(parsed.active);
        }
      }
    } catch {
      /* corrupt state — fall back to defaults */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ tabs, active }));
    } catch {
      /* storage full or unavailable — tabs stay in-memory */
    }
  }, [tabs, active, hydrated]);

  const open = useCallback((id: SectionId) => {
    setTabs((prev) => {
      if (prev.some((t) => t.id === id)) return prev;
      const cur = activeRef.current;
      const curIdx = prev.findIndex((t) => t.id === cur);
      const curTab = prev[curIdx];
      // Transient behaviour: an unpinned active tab is replaced, not stacked.
      if (curTab && !curTab.pinned) {
        const next = [...prev];
        next[curIdx] = { id, title: SECTION_LABEL[id] };
        return next;
      }
      return [...prev, { id, title: SECTION_LABEL[id] }];
    });
    setActive(id);
  }, []);

  const togglePin = useCallback((id: SectionId) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id && t.id !== "dashboard" ? { ...t, pinned: !t.pinned } : t)),
    );
  }, []);


  const close = useCallback((id: SectionId) => {
    setTabs((prev) => {
      const target = prev.find((t) => t.id === id);
      if (!target || target.pinned) return prev;
      const idx = prev.findIndex((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);
      setActive((cur) => (cur === id ? (next[idx] ?? next[idx - 1] ?? next[0]).id : cur));
      return next.length ? next : DEFAULT;
    });
  }, []);

  const closeOthers = useCallback((id: SectionId) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id === id || t.pinned);
      setActive(id);
      return next;
    });
  }, []);

  const closeAll = useCallback(() => {
    setTabs(DEFAULT);
    setActive("dashboard");
  }, []);

  const cycle = useCallback(
    (dir: 1 | -1) => {
      setActive((cur) => {
        const idx = tabs.findIndex((t) => t.id === cur);
        const next = (idx + dir + tabs.length) % tabs.length;
        return tabs[next]?.id ?? cur;
      });
    },
    [tabs],
  );

  const move = useCallback((from: number, to: number) => {
    setTabs((prev) => {
      if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, []);

  // Drop tabs that are no longer reachable (e.g. advanced mode turned off).
  useEffect(() => {
    if (!allowed) return;
    setTabs((prev) => {
      const next = prev.filter((t) => t.pinned || allowed(t.id));
      if (next.length === prev.length) return prev;
      setActive((cur) => (next.some((t) => t.id === cur) ? cur : next[0].id));
      return next.length ? next : DEFAULT;
    });
  }, [allowed]);

  // Ctrl/Cmd+W closes, Ctrl+Tab cycles, Ctrl+1..9 jumps.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key.toLowerCase() === "w") {
        e.preventDefault();
        close(active);
      } else if (e.key === "Tab") {
        e.preventDefault();
        cycle(e.shiftKey ? -1 : 1);
      } else if (/^[1-9]$/.test(e.key)) {
        const t = tabs[Number(e.key) - 1];
        if (t) {
          e.preventDefault();
          setActive(t.id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close, cycle, tabs]);

  const value = useMemo(
    () => ({ tabs, active, open, close, closeOthers, closeAll, cycle, move }),
    [tabs, active, open, close, closeOthers, closeAll, cycle, move],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTabs() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTabs must be used within TabsProvider");
  return v;
}
