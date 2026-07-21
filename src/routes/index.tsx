import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/mc/Sidebar";
import { TopBar } from "@/components/mc/TopBar";
import { Dashboard } from "@/components/mc/Dashboard";
import { MenuBar } from "@/components/mc/MenuBar";
import { StatusBar } from "@/components/mc/StatusBar";
import { SectionView } from "@/components/mc/Views";
import { AdvancedModeProvider, useAdvanced } from "@/lib/advanced-mode";
import { AppHostProvider } from "@/lib/app-host";
import type { SectionId } from "@/components/mc/sections";

const ADVANCED_ONLY: SectionId[] = ["tuning", "validation"];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mod Constructor V6 · Desktop Studio" },
      {
        name: "description",
        content:
          "Mod Constructor V6 — an offline-first desktop studio for building, tuning, validating, and packaging Sims 4 mods. Optional lot51.cc sync for framework updates.",
      },
      { property: "og:title", content: "Mod Constructor V6 · Desktop Studio" },
      {
        property: "og:description",
        content: "Offline-first desktop app for Sims 4 mod building. Career, Trait & Aspiration builders.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <AdvancedModeProvider>
      <Shell />
    </AdvancedModeProvider>
  );
}

function Shell() {
  const [active, setActive] = useState<SectionId>("dashboard");
  const { advanced } = useAdvanced();

  // Auto-return to dashboard if user disables advanced while on an advanced-only page
  useEffect(() => {
    if (!advanced && ADVANCED_ONLY.includes(active)) setActive("dashboard");
  }, [advanced, active]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MenuBar />
      <AppSidebar active={active} onSelect={setActive} />
      <div className="ml-60 pb-6">
        <TopBar active={active} />
        <SectionView active={active} DashboardEl={<Dashboard />} />
      </div>
      <StatusBar active={active} />
    </div>
  );
}
