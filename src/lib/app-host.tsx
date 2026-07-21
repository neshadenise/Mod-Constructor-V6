/**
 * AppHostCapabilities
 * -------------------
 * Detects whether Mod Constructor V6 is running inside ChatGPT (via the
 * OpenAI Apps SDK / MCP embedded UI) or as a standalone desktop app.
 *
 * This is a UI-only detection layer. The real ChatGPT App host exposes a
 * `window.openai` bridge; when absent we fall back to "desktop".
 *
 * IMPORTANT:
 *   - ChatGPT mode = native ChatGPT assistance + image generation.
 *     No OpenAI API key is ever requested or stored.
 *   - Desktop mode = local tools, manual uploads, separately configured
 *     generation providers. A user's ChatGPT subscription is NOT consumed
 *     by the standalone desktop build.
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type HostMode = "chatgpt" | "desktop";

export type ImageProvider =
  | "chatgpt"        // ChatGPT App native image generation (no API key)
  | "local"          // Desktop: user's local uploads only
  | "stable-diffusion" // Desktop: user-configured SD endpoint
  | "openai-api"     // Desktop: user's own OpenAI API key
  | "none";

export interface AppHostCapabilities {
  mode: HostMode;
  /** True when running as an embedded ChatGPT App surface. */
  isChatGPT: boolean;
  /** True when running as the standalone desktop application. */
  isDesktop: boolean;
  /** Image generation providers available in the current host. */
  availableImageProviders: ImageProvider[];
  /** Currently selected provider for image generation actions. */
  imageProvider: ImageProvider;
  setImageProvider: (p: ImageProvider) => void;
  /** True when host can produce images without a user-supplied API key. */
  canGenerateImagesInline: boolean;
  /** True when project data can round-trip to the desktop via export. */
  canExportToDesktop: boolean;
  /** MCP tools published to ChatGPT when in ChatGPT mode. */
  mcpTools: readonly string[];
}

function detectMode(): HostMode {
  if (typeof window === "undefined") return "desktop";
  // OpenAI Apps SDK injects a bridge on window.openai for embedded surfaces.
  // We also honour a URL flag for local previews (?host=chatgpt).
  const w = window as unknown as { openai?: unknown };
  if (w.openai) return "chatgpt";
  const params = new URLSearchParams(window.location.search);
  if (params.get("host") === "chatgpt") return "chatgpt";
  return "desktop";
}

export const MCP_TOOLS = [
  "project.create",
  "project.update",
  "project.export",
  "career.create",
  "career.update",
  "trait.create",
  "trait.update",
  "aspiration.create",
  "aspiration.update",
  "fields.validate",
  "assets.saveGeneratedImage",
  "assets.attachToRecord",
] as const;

const AppHostContext = createContext<AppHostCapabilities | null>(null);

export function AppHostProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<HostMode>(() => detectMode());
  const [imageProvider, setImageProviderState] = useState<ImageProvider>("none");

  // Re-detect on mount for hydration safety.
  useEffect(() => {
    const detected = detectMode();
    setMode(detected);
    const stored = localStorage.getItem("mc.imageProvider") as ImageProvider | null;
    // ChatGPT is no longer selectable — coerce legacy values to "local".
    if (stored && stored !== "chatgpt") {
      setImageProviderState(stored);
    } else {
      setImageProviderState("local");
    }
  }, []);

  const setImageProvider = (p: ImageProvider) => {
    setImageProviderState(p);
    localStorage.setItem("mc.imageProvider", p);
  };

  const value = useMemo<AppHostCapabilities>(() => {
    const isChatGPT = mode === "chatgpt";
    const isDesktop = mode === "desktop";
    // ChatGPT image generation is intentionally NOT offered as an active
    // provider: neither the standalone desktop app nor the web preview can
    // consume a user's ChatGPT subscription. The tile remains visible in
    // Settings only as a disabled "Coming later" affordance.
    const availableImageProviders: ImageProvider[] = ["local", "stable-diffusion", "openai-api", "none"];
    return {
      mode,
      isChatGPT,
      isDesktop,
      availableImageProviders,
      imageProvider,
      setImageProvider,
      canGenerateImagesInline:
        imageProvider === "stable-diffusion" || imageProvider === "openai-api",
      canExportToDesktop: true,
      mcpTools: isChatGPT ? MCP_TOOLS : [],
    };
  }, [mode, imageProvider]);

  return <AppHostContext.Provider value={value}>{children}</AppHostContext.Provider>;
}

export function useAppHost(): AppHostCapabilities {
  const ctx = useContext(AppHostContext);
  if (!ctx) throw new Error("useAppHost must be used inside <AppHostProvider>");
  return ctx;
}

export const PROVIDER_LABEL: Record<ImageProvider, string> = {
  chatgpt: "ChatGPT Image Generation",
  local: "Local uploads only",
  "stable-diffusion": "Stable Diffusion (local endpoint)",
  "openai-api": "OpenAI API (your key)",
  none: "Disabled",
};

export const PROVIDER_DESCRIPTION: Record<ImageProvider, string> = {
  chatgpt:
    "Images are produced by ChatGPT while this project is open in the ChatGPT App. No API key is required or requested.",
  local:
    "You provide icons and images by browsing to files on disk. No generation performed.",
  "stable-diffusion":
    "Desktop mode. Point at a locally running Stable Diffusion / Automatic1111 / ComfyUI endpoint.",
  "openai-api":
    "Desktop mode. Uses an OpenAI API key that you configure separately. Does NOT consume your ChatGPT subscription.",
  none: "Image generation actions are hidden.",
};
