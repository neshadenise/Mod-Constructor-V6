import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/app/Dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mod Constructor V6 — Dashboard" },
      {
        name: "description",
        content: "Desktop workspace for building, validating, and packaging Sims 4 mods.",
      },
      { property: "og:title", content: "Mod Constructor V6" },
      { property: "og:description", content: "Desktop mod-construction workspace." },
    ],
  }),
  component: Dashboard,
});
