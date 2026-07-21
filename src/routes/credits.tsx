import { createFileRoute } from "@tanstack/react-router";
import { LandingLayout } from "@/components/landing/LandingLayout";
import { CreditsPage } from "@/components/landing/Pages";

export const Route = createFileRoute("/credits")({
  head: () => ({
    meta: [
      { title: "Credits & Acknowledgements · Mod Constructor V6" },
      {
        name: "description",
        content:
          "Credits for Mod Constructor V6: created by NeshaDenise Sims, with acknowledgements to Zerbu (Mod Constructor V1–V5) and Lot 51 (Core Library).",
      },
      { property: "og:title", content: "Credits · Mod Constructor V6" },
      {
        property: "og:description",
        content: "Acknowledgements to Zerbu, Lot 51, and the broader Sims 4 modding community.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <LandingLayout>
      <CreditsPage />
    </LandingLayout>
  ),
});
