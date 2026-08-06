/**
 * Shared-library / dependency detection.
 *
 * Libraries such as XML Injector or the Lot 51 Core Library are recorded as
 * dependencies of the imported mod. They are never absorbed into the mod's
 * editable source unless the user explicitly overrides the classification.
 */

import type { ModDependency } from "./types";

export interface KnownLibrary {
  name: string;
  /** Filename fragments (normalized, lower case, separators collapsed). */
  fileHints: string[];
  /** Python top-level packages / module prefixes exposed by the library. */
  moduleHints: string[];
  notes: string;
}

export const KNOWN_LIBRARIES: KnownLibrary[] = [
  {
    name: "XML Injector",
    fileHints: ["xmlinjector", "xml injector"],
    moduleHints: ["xml_injector", "xmlinjector"],
    notes: "Scumbumbo's XML Injector — install separately, do not redistribute inside your mod.",
  },
  {
    name: "Lot 51 Core Library",
    fileHints: ["lot51core", "lot51 core", "lot51"],
    moduleHints: ["lot51_core", "lot51"],
    notes: "Lot 51 Core Library — required at runtime, distributed by its author.",
  },
  {
    name: "Sims 4 Community Library",
    fileHints: ["s4cl", "sims4communitylib", "community library"],
    moduleHints: ["sims4communitylib", "s4cl"],
    notes: "Sims 4 Community Library (S4CL).",
  },
  {
    name: "TURBODRIVER Wicked Framework",
    fileHints: ["turbolib", "turbodriver"],
    moduleHints: ["turbolib"],
    notes: "Third-party framework library.",
  },
  {
    name: "MC Command Center",
    fileHints: ["mccc", "mc command center", "mc_cmd_center"],
    moduleHints: ["mc_", "mccc"],
    notes: "MCCC framework module.",
  },
  {
    name: "Sims 4 Control Menu",
    fileHints: ["s4cm", "control menu"],
    moduleHints: ["s4cm"],
    notes: "Shared control-menu library.",
  },
];

/** Python packages shipped by the game itself — never a mod dependency file. */
export const GAME_MODULES = new Set([
  "sims4",
  "sims",
  "services",
  "objects",
  "interactions",
  "event_testing",
  "buffs",
  "traits",
  "careers",
  "situations",
  "zone",
  "server_commands",
  "clock",
  "date_and_time",
  "distributor",
  "protocolbuffers",
  "ui",
  "statistics",
  "world",
  "routing",
  "singletons",
  "enum",
  "typing",
  "os",
  "sys",
  "json",
  "random",
  "math",
  "re",
  "time",
  "collections",
  "functools",
  "itertools",
  "logging",
  "pathlib",
  "traceback",
  "autonomy",
  "relationships",
  "socials",
  "postures",
  "elements",
  "filters",
  "tag",
  "tunable_utils",
  "sims4communitylib_stub",
  "away_actions",
  "objects_utils",
  "role",
  "venues",
  "whims",
  "rewards",
  "adaptive_clock",
  "animation",
  "audio",
  "balloon",
  "cas",
  "crafting",
  "curfew",
  "drama_scheduler",
  "gsi_handlers",
  "households",
  "notebook",
  "restaurants",
  "retail",
  "seasons",
  "server",
  "sickness",
  "story_progression",
  "teleport",
  "vehicles",
  "weather",
]);

const norm = (s: string) => s.toLowerCase().replace(/[\s._-]+/g, "");

export function matchLibraryByFileName(fileName: string): KnownLibrary | undefined {
  const n = norm(fileName);
  return KNOWN_LIBRARIES.find((l) => l.fileHints.some((h) => n.includes(norm(h))));
}

export function matchLibraryByModule(moduleName: string): KnownLibrary | undefined {
  const top = moduleName.split(".")[0]!.toLowerCase();
  return KNOWN_LIBRARIES.find((l) =>
    l.moduleHints.some((h) => top === h.toLowerCase() || top.startsWith(h.toLowerCase())),
  );
}

let seq = 0;
const nextId = () => `dep-${Date.now().toString(36)}-${seq++}`;

export function dependencyFromLibrary(
  lib: KnownLibrary,
  detectedFrom: ModDependency["detectedFrom"],
  confidence: ModDependency["confidence"],
  installedComponentId?: string,
): ModDependency {
  return {
    id: nextId(),
    name: lib.name,
    detectedFrom,
    required: true,
    confidence,
    notes: lib.notes,
    ...(installedComponentId ? { installedComponentId } : {}),
  };
}

/** Unknown third-party imports become low-confidence dependencies. */
export function dependencyFromImport(moduleName: string): ModDependency | undefined {
  const top = moduleName.split(".")[0]!;
  if (!top || GAME_MODULES.has(top.toLowerCase())) return undefined;
  const lib = matchLibraryByModule(top);
  if (lib) return dependencyFromLibrary(lib, "script-import", "high");
  return {
    id: nextId(),
    name: top,
    detectedFrom: "script-import",
    required: false,
    confidence: "low",
    notes: `Script imports "${moduleName}". Confirm whether this ships with the mod or must be installed separately.`,
  };
}
