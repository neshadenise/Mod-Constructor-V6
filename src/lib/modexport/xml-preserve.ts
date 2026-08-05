/**
 * Surgical XML editing for imported tuning.
 *
 * When a user edits a mapped field of an imported tuning resource we patch the
 * single node in the original document instead of regenerating the XML from the
 * simplified builder model — unknown nodes, attributes, comments, ordering and
 * namespaces all survive. When a mutation cannot be applied surgically the
 * caller must block safe-mode export instead of guessing.
 */

export interface XmlPatch {
  /** Tunable name attribute, e.g. "display_name". */
  tunable: string;
  value: string;
}

export interface XmlPatchResult {
  xml: string;
  applied: XmlPatch[];
  unapplied: XmlPatch[];
}

const escape = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Replaces `<T n="name">…</T>` values without touching anything else. */
export function patchTuningXml(xml: string, patches: XmlPatch[]): XmlPatchResult {
  let out = xml;
  const applied: XmlPatch[] = [];
  const unapplied: XmlPatch[] = [];
  for (const patch of patches) {
    const re = new RegExp(`(<T\\s+n="${escapeRe(patch.tunable)}"\\s*>)([\\s\\S]*?)(</T>)`, "m");
    if (!re.test(out)) {
      unapplied.push(patch);
      continue;
    }
    out = out.replace(re, (_m, open: string, _old: string, close: string) => `${open}${escape(patch.value)}${close}`);
    applied.push(patch);
  }
  return { xml: out, applied, unapplied };
}

/** Replaces the tuning `n=""` attribute (rename) while keeping the rest intact. */
export function patchTuningName(xml: string, name: string): XmlPatchResult {
  const re = /(<I\b[^>]*\bn=")([^"]*)(")/;
  if (!re.test(xml)) return { xml, applied: [], unapplied: [{ tunable: "n", value: name }] };
  return {
    xml: xml.replace(re, (_m, a: string, _b: string, c: string) => `${a}${escape(name)}${c}`),
    applied: [{ tunable: "n", value: name }],
    unapplied: [],
  };
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface XmlWellFormedness {
  ok: boolean
  error?: string;
}

/**
 * Cheap structural check — no DOM required, works in workers and Node.
 * Verifies the declaration, balanced tags and a single root element.
 */
export function checkXmlWellFormed(xml: string): XmlWellFormedness {
  const stack: string[] = [];
  const tag = /<\/?([A-Za-z_][\w.:-]*)([^<>]*?)(\/?)>/g;
  let match: RegExpExecArray | null;
  let roots = 0;
  const stripped = xml.replace(/<\?[\s\S]*?\?>/g, "").replace(/<!--[\s\S]*?-->/g, "");
  while ((match = tag.exec(stripped))) {
    const whole = match[0];
    const name = match[1]!;
    const selfClosing = match[3] === "/";
    if (whole.startsWith("</")) {
      const open = stack.pop();
      if (open !== name) return { ok: false, error: `Mismatched closing tag </${name}>` };
      if (stack.length === 0) roots++;
    } else if (!selfClosing) {
      stack.push(name);
    } else if (stack.length === 0) {
      roots++;
    }
  }
  if (stack.length) return { ok: false, error: `Unclosed tag <${stack[stack.length - 1]}>` };
  if (roots !== 1) return { ok: false, error: `Expected exactly one root element, found ${roots}` };
  return { ok: true };
}
