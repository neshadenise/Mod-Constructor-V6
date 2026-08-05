/**
 * XML tuning analysis.
 *
 * The original source text is always retained; the structured view is derived
 * with a DOM parser (browser) or a small regex tokenizer fallback (workers,
 * tests). References are collected from IDs and explicit attributes only —
 * never from display names alone.
 */

export interface TuningReference {
  kind:
    | "instance"
    | "module"
    | "class"
    | "trait"
    | "buff"
    | "loot"
    | "interaction"
    | "career"
    | "career-level"
    | "aspiration"
    | "situation"
    | "snippet"
    | "stbl"
    | "image"
    | "tuning";
  value: string;
  /** The XML attribute/element the reference came from. */
  via: string;
}

export interface ParsedTuning {
  /** i= attribute (career, trait, buff ...). */
  instanceType?: string;
  /** n= attribute — the tuning name. */
  name?: string;
  /** s= attribute — the 64-bit instance id, kept as a string. */
  instanceId?: string;
  /** c= attribute — the tuning class. */
  className?: string;
  /** m= attribute — the python module path. */
  modulePath?: string;
  references: TuningReference[];
  source: string;
}

const ATTR = (tag: string, name: string) =>
  new RegExp(`<${tag}\\b[^>]*\\b${name}="([^"]*)"`, "i");

const REF_KIND: Record<string, TuningReference["kind"]> = {
  trait: "trait",
  traits: "trait",
  buff: "buff",
  buffs: "buff",
  loot: "loot",
  loot_list: "loot",
  interaction: "interaction",
  affordance: "interaction",
  career: "career",
  career_levels: "career-level",
  career_level: "career-level",
  aspiration: "aspiration",
  situation: "situation",
  snippet: "snippet",
  icon: "image",
  display_name: "stbl",
  description: "stbl",
};

const isNumericId = (v: string) => /^\d{6,}$/.test(v.trim());

export function isXmlText(text: string) {
  return /^\s*<\??[A-Za-z!]/.test(text);
}

export function parseTuning(source: string): ParsedTuning {
  const out: ParsedTuning = { references: [], source };
  const root = /<(I|M)\b[^>]*>/i.exec(source);
  if (root) {
    const tag = root[1]!.toUpperCase();
    out.instanceType = ATTR(tag, "i").exec(source)?.[1];
    out.name = ATTR(tag, "n").exec(source)?.[1];
    out.instanceId = ATTR(tag, "s").exec(source)?.[1];
    out.className = ATTR(tag, "c").exec(source)?.[1];
    out.modulePath = ATTR(tag, "m").exec(source)?.[1];
  }
  if (out.instanceId) out.references.push({ kind: "instance", value: out.instanceId, via: "s" });
  if (out.modulePath) out.references.push({ kind: "module", value: out.modulePath, via: "m" });
  if (out.className) out.references.push({ kind: "class", value: out.className, via: "c" });

  // Referenced tuning ids appear as element text or as n="..." keyed values.
  const tagRe = /<([TVUEL])\b([^>]*)>([^<]*)<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(source))) {
    const attrs = m[2] ?? "";
    const value = (m[3] ?? "").trim();
    const nameAttr = /\bn="([^"]*)"/.exec(attrs)?.[1] ?? "";
    if (!value) continue;
    const kind = REF_KIND[nameAttr.toLowerCase()];
    if (isNumericId(value)) {
      out.references.push({ kind: kind ?? "tuning", value, via: nameAttr || m[1]! });
    } else if (kind === "stbl" && /^0x[0-9a-f]+$/i.test(value)) {
      out.references.push({ kind: "stbl", value: value.replace(/^0x/i, "").toUpperCase(), via: nameAttr });
    } else if (/^[a-z_][a-z0-9_]*\.[a-z0-9_.]+$/i.test(value) && nameAttr.includes("module")) {
      out.references.push({ kind: "module", value, via: nameAttr });
    }
  }

  // Module + class pairs used by script-driven tuning.
  const modRe = /\bm="([a-z0-9_.]+)"\s+c="([A-Za-z0-9_]+)"/gi;
  while ((m = modRe.exec(source))) {
    out.references.push({ kind: "module", value: m[1]!, via: "m" });
    out.references.push({ kind: "class", value: m[2]!, via: "c" });
  }
  return out;
}

/** All distinct python module namespaces mentioned by a tuning file. */
export function tuningModules(t: ParsedTuning): string[] {
  return [...new Set(t.references.filter((r) => r.kind === "module").map((r) => r.value))];
}
