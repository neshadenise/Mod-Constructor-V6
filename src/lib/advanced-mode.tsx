import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Ctx = {
  advanced: boolean;
  setAdvanced: (v: boolean) => void;
  toggle: () => void;
};

const AdvancedContext = createContext<Ctx | null>(null);
const KEY = "mc.advanced-mode";

export function AdvancedModeProvider({ children }: { children: ReactNode }) {
  const [advanced, setAdvancedState] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v === "1") setAdvancedState(true);
    } catch {}
  }, []);

  const setAdvanced = useCallback((v: boolean) => {
    setAdvancedState(v);
    try {
      localStorage.setItem(KEY, v ? "1" : "0");
    } catch {}
  }, []);

  const toggle = useCallback(() => setAdvanced(!advanced), [advanced, setAdvanced]);

  return (
    <AdvancedContext.Provider value={{ advanced, setAdvanced, toggle }}>
      {children}
    </AdvancedContext.Provider>
  );
}

export function useAdvanced() {
  const ctx = useContext(AdvancedContext);
  if (!ctx) return { advanced: false, setAdvanced: () => {}, toggle: () => {} };
  return ctx;
}
