/**
 * Lot51 game-data proxy.
 *
 * The browser cannot call tdesc.lot51.cc directly (no CORS headers, and the
 * origin sits behind a bot challenge that rejects requests without a normal
 * browser User-Agent). This route forwards a small, explicit allow-list of
 * read-only endpoints and returns JSON the app can cache on-device.
 *
 * Nothing here is user-specific, so it lives under /api/public/* and is
 * intentionally unauthenticated — it only relays public documentation data.
 */

import { createFileRoute } from "@tanstack/react-router";

const UPSTREAM = "https://tdesc.lot51.cc/api";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
} as const;

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extra },
  });
}

/** Maps our stable public paths onto upstream paths + allowed query params. */
function resolveUpstream(splat: string, url: URL): { path: string; params: URLSearchParams } | null {
  const p = new URLSearchParams();
  const q = (name: string, max = 200) => {
    const v = url.searchParams.get(name);
    if (v && v.length <= max) p.set(name, v);
  };

  if (splat === "tdesc/versions") return { path: "/tdesc", params: p };

  if (splat === "tdesc/enums") return { path: "/tdesc/enums", params: p };

  if (splat === "tdesc/doc") {
    const path = url.searchParams.get("path");
    if (!path || path.length > 300 || path.includes("..")) return null;
    p.set("path", path);
    q("version", 32);
    return { path: "/tdesc/doc", params: p };
  }

  if (splat === "tdesc/search") {
    q("q");
    q("version", 32);
    p.set("size", clampSize(url.searchParams.get("size")));
    return { path: "/simdex/search/tdesc", params: p };
  }

  if (splat === "search/tuning" || splat === "search/strings") {
    q("q");
    q("type", 64);
    p.set("size", clampSize(url.searchParams.get("size")));
    const kind = splat === "search/tuning" ? "tuning" : "strings";
    return { path: `/simdex/search/${kind}`, params: p };
  }

  const tuningMatch = /^tuning\/(\d{1,20})$/.exec(splat);
  if (tuningMatch) return { path: `/simdex/tuning/${tuningMatch[1]}`, params: p };

  return null;
}

function clampSize(raw: string | null): string {
  const n = Number(raw ?? 25);
  if (!Number.isFinite(n)) return "25";
  return String(Math.min(100, Math.max(1, Math.trunc(n))));
}

export const Route = createFileRoute("/api/public/gamedata/$")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async ({ params, request }) => {
        const splat = (params as { _splat?: string })._splat ?? "";
        const url = new URL(request.url);
        const target = resolveUpstream(splat.replace(/^\/+|\/+$/g, ""), url);

        if (!target) {
          return json({ error: "Unknown game-data endpoint", path: splat }, 404);
        }

        const qs = target.params.toString();
        const upstreamUrl = `${UPSTREAM}${target.path}${qs ? `?${qs}` : ""}`;

        try {
          const res = await fetch(upstreamUrl, {
            headers: {
              "User-Agent": BROWSER_UA,
              Accept: "application/json",
            },
          });

          const text = await res.text();
          if (!res.ok) {
            console.error(`Lot51 game-data request failed [${res.status}] ${upstreamUrl}: ${text.slice(0, 300)}`);
            return json(
              {
                error: "Lot51 request failed",
                status: res.status,
                detail: text.slice(0, 400),
              },
              res.status === 404 ? 404 : 502,
            );
          }

          return new Response(text, {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              // Documentation data changes only on game patches.
              "Cache-Control": "public, max-age=3600",
              ...CORS,
            },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`Lot51 game-data fetch threw for ${upstreamUrl}: ${message}`);
          return json({ error: "Lot51 unreachable", detail: message }, 503);
        }
      },
    },
  },
});
