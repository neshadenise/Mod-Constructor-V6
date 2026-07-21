import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppSidebar } from "@/components/mc/Sidebar";
import { TopBar } from "@/components/mc/TopBar";
import { Dashboard } from "@/components/mc/Dashboard";
import { MenuBar } from "@/components/mc/MenuBar";
import { StatusBar } from "@/components/mc/StatusBar";
import { SectionView } from "@/components/mc/Views";
import { CommandPalette, useCommandPaletteHotkey } from "@/components/mc/CommandPalette";
import { NotificationCenter } from "@/components/mc/NotificationCenter";
import { AdvancedModeProvider, useAdvanced } from "@/lib/advanced-mode";
import { AppHostProvider } from "@/lib/app-host";
import { AppNavigationProvider } from "@/lib/navigation";
import { NotificationsProvider } from "@/lib/notifications";
import { InspectorHistoryProvider } from "@/lib/inspector-history";
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
    <AppHostProvider>
      <NotificationsProvider>
        <InspectorHistoryProvider>
          <AdvancedModeProvider>
            <Shell />
          </AdvancedModeProvider>
        </InspectorHistoryProvider>
      </NotificationsProvider>
    </AppHostProvider>
  );
}

function Shell() {
  const [active, setActive] = useState<SectionId>("dashboard");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { advanced } = useAdvanced();

  useEffect(() => {
    if (!advanced && ADVANCED_ONLY.includes(active)) setActive("dashboard");
  }, [advanced, active]);

  const togglePalette = useCallback(() => setPaletteOpen((v) => !v), []);
  useCommandPaletteHotkey(togglePalette);

  return (
    <AppNavigationProvider active={active} navigate={setActive}>
      <div className="min-h-screen bg-background text-foreground">
        <MenuBar />
        <AppSidebar active={active} onSelect={setActive} />
        <div className="ml-60 pb-7">
          <TopBar active={active} onOpenPalette={() => setPaletteOpen(true)} />
          <SectionView active={active} DashboardEl={<Dashboard />} />
        </div>
        <StatusBar active={active} />
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        <NotificationCenter />
      </div>
    </AppNavigationProvider>
  );
}
