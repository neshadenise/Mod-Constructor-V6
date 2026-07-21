import { createFileRoute } from "@tanstack/react-router";
import { LandingLayout } from "@/components/landing/LandingLayout";
import { SupportPage } from "@/components/landing/Pages";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support · Mod Constructor V6" },
      {
        name: "description",
        content:
          "Get help with Mod Constructor V6. Downloads, release notes, and creator communication happen on Patreon.",
      },
      { property: "og:title", content: "Support · Mod Constructor V6" },
      {
        property: "og:description",
        content: "Downloads, updates, and support live on NeshaDenise Sims' Patreon.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <LandingLayout>
      <SupportPage />
    </LandingLayout>
  ),
});
