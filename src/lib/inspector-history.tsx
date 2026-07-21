import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type HistoryEntry = {
  id: string;
  fieldId: string;
  label: string;
  previousValue: unknown;
  nextValue: unknown;
  editedAt: number;
  user: string;
};

type Ctx = {
  entries: HistoryEntry[];
  recentFieldIds: string[];
  record: (e: Omit<HistoryEntry, "id" | "editedAt" | "user">) => void;
  restore: (entryId: string) => HistoryEntry | undefined;
  undo: () => HistoryEntry | undefined;
  redo: () => HistoryEntry | undefined;
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
};

const InspectorHistoryCtx = createContext<Ctx | null>(null);

function newId() {
  return `h_${Math.random().toString(36).slice(2, 10)}`;
}

export function InspectorHistoryProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const redoStack = useRef<HistoryEntry[]>([]);

  const record = useCallback<Ctx["record"]>((e) => {
    const entry: HistoryEntry = {
      ...e,
      id: newId(),
      editedAt: Date.now(),
      user: "Alex Kern",
    };
    setEntries((prev) => [entry, ...prev].slice(0, 200));
    redoStack.current = [];
  }, []);

  const restore = useCallback(
    (entryId: string) => entries.find((e) => e.id === entryId),
    [entries],
  );

  const undo = useCallback(() => {
    let popped: HistoryEntry | undefined;
    setEntries((prev) => {
      if (prev.length === 0) return prev;
      popped = prev[0];
      redoStack.current.unshift(popped);
      return prev.slice(1);
    });
    return popped;
  }, []);

  const redo = useCallback(() => {
    const next = redoStack.current.shift();
    if (next) setEntries((prev) => [next, ...prev]);
    return next;
  }, []);

  const clear = useCallback(() => {
    setEntries([]);
    redoStack.current = [];
  }, []);

  const recentFieldIds = useMemo(() => {
    const seen: string[] = [];
    for (const e of entries) {
      if (!seen.includes(e.fieldId)) seen.push(e.fieldId);
      if (seen.length >= 8) break;
    }
    return seen;
  }, [entries]);

  const value = useMemo<Ctx>(
    () => ({
      entries,
      recentFieldIds,
      record,
      restore,
      undo,
      redo,
      canUndo: entries.length > 0,
      canRedo: redoStack.current.length > 0,
      clear,
    }),
    [entries, recentFieldIds, record, restore, undo, redo],
  );

  return <InspectorHistoryCtx.Provider value={value}>{children}</InspectorHistoryCtx.Provider>;
}

export function useInspectorHistory() {
  const v = useContext(InspectorHistoryCtx);
  if (!v) throw new Error("useInspectorHistory must be used within InspectorHistoryProvider");
  return v;
}
