import { createFileRoute } from "@tanstack/react-router";
import { AppSidebar } from "@/components/mc/Sidebar";
import { TopBar } from "@/components/mc/TopBar";
import { Dashboard } from "@/components/mc/Dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mod Constructor V6 · Studio Dashboard" },
      {
        name: "description",
        content:
          "Mod Constructor V6 — a dense, professional desktop-style studio for building, validating, and packaging game mods.",
      },
      { property: "og:title", content: "Mod Constructor V6" },
      { property: "og:description", content: "Desktop-first studio dashboard for building game mods." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar />
      <div className="ml-60">
        <TopBar />
        <Dashboard />
      </div>
    </div>
  );
}
