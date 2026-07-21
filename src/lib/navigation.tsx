import { createContext, useContext, type ReactNode } from "react";
import type { SectionId } from "@/components/mc/sections";

type NavCtx = {
  active: SectionId;
  navigate: (id: SectionId) => void;
};

const Ctx = createContext<NavCtx | null>(null);

export function AppNavigationProvider({
  active,
  navigate,
  children,
}: NavCtx & { children: ReactNode }) {
  return <Ctx.Provider value={{ active, navigate }}>{children}</Ctx.Provider>;
}

export function useAppNavigation() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppNavigation must be used within AppNavigationProvider");
  return v;
}
