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
import { ShortcutsDialog } from "@/components/mc/ShortcutsDialog";
import { AdvancedModeProvider, useAdvanced } from "@/lib/advanced-mode";
import { AppHostProvider } from "@/lib/app-host";
import { AppNavigationProvider } from "@/lib/navigation";
import { NotificationsProvider } from "@/lib/notifications";
import { InspectorHistoryProvider } from "@/lib/inspector-history";
import { StoreProvider } from "@/lib/store";
import { AccountProvider } from "@/lib/account";
import { TabsProvider, useTabs } from "@/lib/tabs";
import { TabStrip } from "@/components/mc/TabStrip";
import { PreviewSidebar, usePreviewPanel, PREVIEW_WIDTH } from "@/components/mc/PreviewSidebar";

import type { SectionId } from "@/components/mc/sections";
import { detectAppMode, type AppMode } from "@/lib/app-mode";
import { LandingLayout } from "@/components/landing/LandingLayout";
import { LandingHome } from "@/components/landing/Home";

const ADVANCED_ONLY: SectionId[] = ["tuning", "validation"];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mod Constructor V6 · Sims 4 Gameplay Mod Studio" },
      {
        name: "description",
        content:
          "Build careers, traits, aspirations, notifications, and reusable Sims 4 gameplay mods in one guided desktop workspace by NeshaDenise Sims. Windows and macOS.",
      },
      { property: "og:title", content: "Mod Constructor V6 · Sims 4 Gameplay Mod Studio" },
      {
        property: "og:description",
        content:
          "Build careers, traits, aspirations, notifications, and reusable Sims 4 gameplay mods in one guided desktop workspace by NeshaDenise Sims. Windows and macOS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  // Deferred mode detection avoids SSR/hydration mismatch — SSR renders the
  // landing shell (public-web default); after hydration we swap to the full
  // app for dev and desktop environments.
  const [mode, setMode] = useState<AppMode | null>(null);
  useEffect(() => setMode(detectAppMode()), []);

  if (mode === null) {
    // SSR + first-render fallback: render the public landing so search
    // engines / social crawlers see something sensible without a flash.
    return (
      <LandingLayout>
        <LandingHome />
      </LandingLayout>
    );
  }

  if (mode === "public-web") {
    return (
      <LandingLayout>
        <LandingHome />
      </LandingLayout>
    );
  }

  return <FullApp />;
}

function FullApp() {
  return (
    <AppHostProvider>
      <AccountProvider>
      <StoreProvider>
        <NotificationsProvider>
          <InspectorHistoryProvider>
            <AdvancedModeProvider>
              <Shell />
            </AdvancedModeProvider>
          </InspectorHistoryProvider>
        </NotificationsProvider>
      </StoreProvider>
      </AccountProvider>
    </AppHostProvider>
  );
}

function Shell() {
  const { advanced } = useAdvanced();
  const allowed = useCallback(
    (id: SectionId) => advanced || !ADVANCED_ONLY.includes(id),
    [advanced],
  );
  return (
    <TabsProvider allowed={allowed}>
      <ShellBody />
    </TabsProvider>
  );
}

function ShellBody() {
  const { active, open } = useTabs();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const preview = usePreviewPanel();

  const togglePalette = useCallback(() => setPaletteOpen((v) => !v), []);
  useCommandPaletteHotkey(togglePalette);

  return (
    <AppNavigationProvider active={active} navigate={open}>
      <div
        className="min-h-screen bg-background text-foreground"
        style={{ "--preview-w": preview.open ? `${PREVIEW_WIDTH}px` : "0px" } as React.CSSProperties}
      >
        <MenuBar />
        <AppSidebar active={active} onSelect={open} />
        <div
          className="ml-60 pb-7 transition-[margin] duration-200"
          style={{ marginRight: preview.open ? PREVIEW_WIDTH : 0 }}
        >
          <TopBar active={active} onOpenPalette={() => setPaletteOpen(true)} />
          <TabStrip />
          <SectionView active={active} DashboardEl={<Dashboard />} />
        </div>
        <PreviewSidebar active={active} open={preview.open} onOpenChange={preview.setOpen} />
        <StatusBar active={active} />
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        <NotificationCenter />
        <ShortcutsDialog />
      </div>
    </AppNavigationProvider>
  );
}

