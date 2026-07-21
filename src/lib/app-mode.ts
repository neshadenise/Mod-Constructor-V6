// Environment-aware app mode detection.
//
// - "dev"        → Vite dev server / Lovable preview → full app shell
// - "desktop"    → Wrapped in Tauri/Electron → full app shell
// - "public-web" → Published Lovable site → public landing only
//
// The MCP server route lives at /mcp and is a raw server handler — it is
// unaffected by this and remains reachable in every mode.

export type AppMode = "dev" | "desktop" | "public-web";

export function detectAppMode(): AppMode {
  if (import.meta.env.DEV) return "dev";
  if (typeof window === "undefined") return "public-web";
  const w = window as unknown as {
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
    electronAPI?: unknown;
    __DESKTOP__?: unknown;
    process?: { versions?: { electron?: string } };
  };
  if (w.__TAURI__ || w.__TAURI_INTERNALS__ || w.electronAPI || w.__DESKTOP__) return "desktop";
  if (w.process?.versions?.electron) return "desktop";
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host.includes("id-preview--")) {
    return "dev";
  }
  return "public-web";
}

// Message shown to public visitors who land on a locked internal path.
export const LOCKED_MESSAGE =
  "Mod Constructor V6 is a standalone desktop application. Download access is available through NeshaDenise Sims on Patreon.";

export const PATREON_URL = "https://www.patreon.com/cw/NeshaDeniseSims";
