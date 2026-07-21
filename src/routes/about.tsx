import { createFileRoute } from "@tanstack/react-router";
import { LandingLayout } from "@/components/landing/LandingLayout";
import { AboutPage } from "@/components/landing/Pages";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About · Mod Constructor V6" },
      {
        name: "description",
        content:
          "Mod Constructor V6 is a standalone desktop workspace for Sims 4 gameplay mod creators by NeshaDenise Sims — offline-first, creator-focused, and community-made.",
      },
      { property: "og:title", content: "About · Mod Constructor V6" },
      {
        property: "og:description",
        content: "An independent, offline-first Sims 4 mod construction desktop app by NeshaDenise Sims.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <LandingLayout>
      <AboutPage />
    </LandingLayout>
  ),
});
