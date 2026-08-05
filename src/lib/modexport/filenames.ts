/**
 * Filename safety + versioned naming.
 * Sanitises without destroying intentional creator branding.
 */

const RESERVED = new Set([
  "CON", "PRN", "AUX", "NUL",
  ...Array.from({ length: 9 }, (_, i) => `COM${i + 1}`),
  ...Array.from({ length: 9 }, (_, i) => `LPT${i + 1}`),
]);

const MAX_LEN = 120;

export interface NameCheck {
  name: string;
  ok: boolean;
  problems: string[];
}

export function sanitizeFileName(input: string, fallback = "Mod"): NameCheck {
  const problems: string[] = [];
  let name = input.replace(/\\/g, "/").split("/").pop() ?? "";
  if (name !== input) problems.push("Path segments were removed.");
  name = name.replace(/[\u0000-\u001f<>:"|?*]/g, "_");
  name = name.replace(/^\.+/, "");
  name = name.replace(/\s+$/g, "");
  if (!name) {
    problems.push("Name was empty.");
    name = fallback;
  }
  const stem = name.replace(/\.[^.]+$/, "");
  if (RESERVED.has(stem.toUpperCase())) {
    problems.push(`"${stem}" is a reserved operating system name.`);
    name = `_${name}`;
  }
  if (/\.(exe|bat|cmd|com|scr|msi|sh|ps1|dll)$/i.test(name)) {
    problems.push("Executable extension is not allowed in a mod export.");
    name = name.replace(/\.[^.]+$/, ".txt");
  }
  if (name.length > MAX_LEN) {
    problems.push("Name was shortened.");
    const ext = name.match(/\.[^.]+$/)?.[0] ?? "";
    name = name.slice(0, MAX_LEN - ext.length) + ext;
  }
  return { name, ok: problems.length === 0, problems };
}

export function versionedName(base: string, extension: string, version?: string) {
  const clean = sanitizeFileName(base).name.replace(/\.[^.]+$/, "");
  const v = version ? `_v${version.replace(/^v/i, "")}` : "";
  return sanitizeFileName(`${clean}${v}.${extension.replace(/^\./, "")}`).name;
}

export function folderName(base: string, version?: string) {
  const clean = sanitizeFileName(base).name.replace(/\.[^.]+$/, "");
  return version ? `${clean}_v${version.replace(/^v/i, "")}` : clean;
}
