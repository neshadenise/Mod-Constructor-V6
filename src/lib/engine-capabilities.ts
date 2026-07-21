/**
 * Engine capability flags.
 *
 * These are the actions that require a real Mod Architect engine, native
 * desktop shell, or an external network service. Every UI surface that
 * exposes one of these must gate on the corresponding flag and show an
 * explicit state (Requires desktop engine / Not connected / Coming later /
 * Unavailable in this host) — NEVER pretend to succeed.
 *
 * Codex: flip these to true from the native runtime once the corresponding
 * integration is wired.
 */

export type EngineState =
  | "available"
  | "requires-desktop-engine"
  | "not-connected"
  | "coming-later"
  | "unavailable-in-host";

export interface EngineCapabilities {
  /** Compile a verified Sims 4 .package binary from project data. */
  compilePackage: EngineState;
  /** Install compiled files into the Sims 4 Mods folder. */
  installToModsFolder: EngineState;
  /** Auto-detect the local Sims 4 install directory. */
  detectSimsInstall: EngineState;
  /** Read the player's live game files (mods, saves). */
  readGameFiles: EngineState;
  /** Fetch third-party tuning resources / Core Library updates. */
  fetchThirdPartyTuning: EngineState;
  /** Generate images via a user's ChatGPT subscription. */
  chatgptImageGeneration: EngineState;
  /** Produce verified production XML via the real generation engine. */
  produceProductionXml: EngineState;
  /** Native file/folder picker dialogs. */
  nativeFilePicker: EngineState;
}

/**
 * Default capabilities for the browser prototype. Everything the real
 * engine owns is explicitly UNAVAILABLE; Codex overrides in the desktop
 * shell.
 *
 * ChatGPT image generation is intentionally "coming-later" (not
 * "available") because neither the web prototype nor the standalone
 * desktop app can consume a user's ChatGPT subscription. See CODEX_HANDOFF.
 */
export const defaultEngineCapabilities: EngineCapabilities = {
  compilePackage: "requires-desktop-engine",
  installToModsFolder: "requires-desktop-engine",
  detectSimsInstall: "requires-desktop-engine",
  readGameFiles: "requires-desktop-engine",
  fetchThirdPartyTuning: "not-connected",
  chatgptImageGeneration: "coming-later",
  produceProductionXml: "requires-desktop-engine",
  nativeFilePicker: "requires-desktop-engine",
};

export const ENGINE_STATE_LABEL: Record<EngineState, string> = {
  "available": "Available",
  "requires-desktop-engine": "Requires desktop engine",
  "not-connected": "Not connected",
  "coming-later": "Coming later",
  "unavailable-in-host": "Unavailable in this host",
};

export const ENGINE_STATE_TOOLTIP: Record<EngineState, string> = {
  "available": "",
  "requires-desktop-engine":
    "This action needs the native Mod Architect engine that ships with the standalone desktop build.",
  "not-connected":
    "An external service must be configured before this action can run.",
  "coming-later":
    "This capability is planned but not yet integrated. It will appear in a future release.",
  "unavailable-in-host":
    "The current runtime host does not support this action.",
};

export function isEngineActionAvailable(s: EngineState): boolean {
  return s === "available";
}
