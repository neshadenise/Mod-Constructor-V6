import { createFileRoute } from "@tanstack/react-router";
import { LandingLayout } from "@/components/landing/LandingLayout";
import { PrivacyPage } from "@/components/landing/Pages";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy · Mod Constructor V6" },
      {
        name: "description",
        content:
          "Mod Constructor V6 stores projects locally on your machine, is offline-first, and does not transmit project data by default.",
      },
      { property: "og:title", content: "Privacy · Mod Constructor V6" },
      {
        property: "og:description",
        content: "Offline-first desktop app. Your projects stay on your machine.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <LandingLayout>
      <PrivacyPage />
    </LandingLayout>
  ),
});
