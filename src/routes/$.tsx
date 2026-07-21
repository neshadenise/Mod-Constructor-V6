// Catch-all splat route.
//
// In "public-web" mode this enforces the site lock: any URL that isn't one of
// the six public pages (or the /mcp service endpoint) redirects to `/` and
// the landing page surfaces the "desktop application" toast. In dev/desktop
// mode we still show a 404 so developers notice broken links.
//
// /mcp is registered as its own file route (src/routes/mcp.ts) — it takes
// precedence over this splat and stays operational.

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { detectAppMode } from "@/lib/app-mode";

export const Route = createFileRoute("/$")({
  head: () => ({
    meta: [
      { title: "Not found · Mod Constructor V6" },
      // Locked / unmatched URLs must not be indexed.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SplatRedirect,
});

function SplatRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const mode = detectAppMode();
    if (mode === "public-web") {
      try {
        sessionStorage.setItem("mc:locked-redirect", "1");
      } catch {
        /* ignore */
      }
      navigate({ to: "/", replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-neutral-200 flex items-center justify-center px-5">
      <div className="max-w-md text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e6ff5a]">
          Mod Constructor V6
        </div>
        <h1 className="mt-3 text-3xl font-black">Page not found</h1>
        <p className="mt-3 text-sm text-neutral-400">
          The page you're looking for doesn't exist. If you were trying to open the app editor,
          Mod Constructor V6 is a standalone desktop application — downloads are on Patreon.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center rounded-xl bg-[#ff5cb0] px-4 py-2 text-sm font-bold text-black"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
