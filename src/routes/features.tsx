import { createFileRoute } from "@tanstack/react-router";
import { LandingLayout } from "@/components/landing/LandingLayout";
import { FeaturesPage } from "@/components/landing/Pages";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features · Mod Constructor V6" },
      {
        name: "description",
        content:
          "Career, Trait, and Aspiration builders, notifications, an icon library, live preview, templates, validation, and portable project bundles — all in one desktop workspace.",
      },
      { property: "og:title", content: "Features · Mod Constructor V6" },
      {
        property: "og:description",
        content: "Ten focused tools for building Sims 4 gameplay mods without hand-writing tuning.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <LandingLayout>
      <FeaturesPage />
    </LandingLayout>
  ),
});
