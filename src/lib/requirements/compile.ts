/**
 * Test-set compiler: identity, XML, validation and usage analysis.
 *
 * The editor never sees a tuning id. This module owns the translation from a
 * requirement tree to a named, hashed, exportable test-set resource.
 */

import { GROUP_DEFAULT, TYPE_TUNING, fnv1a32, fnv1a64, hex32, hex64, withHighBit } from "@/lib/modexport/ids";
import {
  describeNode,
  fingerprint,
  requirementSpec,
  testSetPacks,
  testSetRefs,
  walkNodes,
  type RequirementGroup,
  type RequirementNode,
  type TestSet,
} from "./schema";

export interface TestSetKeys {
  tuningName: string;
  hashInput: string;
  instanceHex: string;
  instanceDecimal: string;
  fnv32: string;
  key: { type: string; group: string; instance: string };
}

const safe = (s: string) =>
  s
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_") || "Untitled";

export function testSetTuningName(namespace: string, set: TestSet): string {
  const ns = (namespace || "MyMods").replace(/[^A-Za-z0-9_.]/g, "");
  return `${ns}:testset_${safe(set.name)}`;
}

export function computeTestSetKeys(namespace: string, set: TestSet): TestSetKeys {
  const tuningName = testSetTuningName(namespace, set);
  const hashInput = tuningName.toLowerCase();
  const instance = withHighBit(fnv1a64(hashInput));
  return {
    tuningName,
    hashInput,
    instanceHex: hex64(instance),
    instanceDecimal: instance.toString(10),
    fnv32: hex32(fnv1a32(hashInput)),
    key: { type: TYPE_TUNING, group: GROUP_DEFAULT, instance: hex64(instance) },
  };
}

/* ------------------------------------------------------------------- xml -- */

const esc = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function nodeXml(node: RequirementNode, indent: string): string {
  if (node.kind === "test") {
    const spec = requirementSpec(node.specId);
    const params = Object.entries(node.params)
      .filter(([, v]) => v !== "" && v !== undefined)
      .map(([k, v]) => `${indent}  <T n="${k}">${esc(String(v))}</T>`);
    const comment = node.comment ? `${indent}<!-- ${esc(node.comment)} -->\n` : "";
    return `${comment}${indent}<V t="${spec.xmlClass}"${node.negate ? ' negate="True"' : ""}${
      node.priority ? ` priority="${node.priority}"` : ""
    }>\n${params.join("\n")}${params.length ? "\n" : ""}${indent}</V>`;
  }
  const comment = node.comment ? `${indent}<!-- ${esc(node.comment)} -->\n` : "";
  const inner = node.children.map((c) => nodeXml(c, `${indent}  `)).join("\n");
  return `${comment}${indent}<L n="${node.op}_group">\n${inner}${inner ? "\n" : ""}${indent}</L>`;
}

export function compileTestSetXml(set: TestSet, namespace: string, keys = computeTestSetKeys(namespace, set)) {
  return [
    `<?xml version="1.0" encoding="utf-8"?>`,
    `<I c="TestSet" i="snippet" m="event_testing.test_variants" n="${keys.tuningName}" s="${keys.instanceDecimal}">`,
    `  <!-- ${esc(describeNode(set.root))} -->`,
    set.description ? `  <!-- ${esc(set.description)} -->` : "",
    `  <L n="tests">`,
    nodeXml(set.root, "    "),
    `  </L>`,
    `</I>`,
  ]
    .filter(Boolean)
    .join("\n");
}

/* ------------------------------------------------------------ validation -- */

export interface TestSetIssue {
  id: string;
  level: "error" | "warning" | "suggestion";
  message: string;
  nodeId?: string;
  fix?: string;
}

export function validateTestSet(set: TestSet, all: TestSet[] = []): TestSetIssue[] {
  const out: TestSetIssue[] = [];
  const push = (level: TestSetIssue["level"], id: string, message: string, nodeId?: string, fix?: string) =>
    out.push({ id, level, message, ...(nodeId ? { nodeId } : {}), ...(fix ? { fix } : {}) });

  if (!set.name.trim()) push("error", "NO_NAME", "Test set has no name.");
  if (!set.root.children.length) push("error", "EMPTY", "Test set contains no tests.", set.root.id);

  walkNodes(set.root, (n) => {
    if (n.kind === "group") {
      if (!n.children.length) push("warning", `EMPTY_GROUP:${n.id}`, "Empty group is ignored at export.", n.id);
      if (n.op === "not" && n.children.length > 1)
        push("warning", `NOT_MULTI:${n.id}`, "NOT group with several children negates their combination.", n.id);
      return;
    }
    const spec = requirementSpec(n.specId);
    for (const field of spec.fields) {
      const value = n.params[field.id];
      if (field.type === "text" && field.resource && !String(value ?? "").trim())
        push("error", `NO_REF:${n.id}:${field.id}`, `${spec.label}: "${field.label}" needs a resource.`, n.id);
      if (field.type === "number" && typeof value === "number") {
        if (field.min !== undefined && value < field.min)
          push("error", `MIN:${n.id}:${field.id}`, `${spec.label}: ${field.label} below ${field.min}.`, n.id);
        if (field.max !== undefined && value > field.max)
          push("error", `MAX:${n.id}:${field.id}`, `${spec.label}: ${field.label} above ${field.max}.`, n.id);
      }
    }
  });

  // duplicate tests inside the same group
  walkNodes(set.root, (n) => {
    if (n.kind !== "group") return;
    const seen = new Map<string, string>();
    for (const child of n.children) {
      const fp = fingerprint(child);
      if (seen.has(fp))
        push("warning", `DUP:${child.id}`, "Identical test appears twice in the same group.", child.id, "Remove one copy.");
      else seen.set(fp, child.id);
    }
  });

  const twin = all.find((s) => s.uuid !== set.uuid && fingerprint(s.root) === fingerprint(set.root));
  if (twin)
    push("suggestion", "TWIN", `Same logic as "${twin.name}" — consider reusing that test set instead.`);

  if (!set.description.trim())
    push("suggestion", "NO_DESC", "Add a description so other builders know when to reuse this set.");

  return out;
}

/* ----------------------------------------------------------------- usage -- */

export interface TestSetSummary {
  tests: number;
  groups: number;
  packs: string[];
  refs: ReturnType<typeof testSetRefs>;
  sentence: string;
}

export function summarizeTestSet(set: TestSet): TestSetSummary {
  let tests = 0;
  let groups = 0;
  walkNodes(set.root, (n) => (n.kind === "test" ? (tests += 1) : (groups += 1)));
  return {
    tests,
    groups,
    packs: testSetPacks(set),
    refs: testSetRefs(set),
    sentence: describeNode(set.root),
  };
}

/** Merge candidates: sets whose logic is identical. */
export function duplicateSets(sets: TestSet[]): { fingerprint: string; sets: TestSet[] }[] {
  const map = new Map<string, TestSet[]>();
  for (const s of sets) {
    const fp = fingerprint(s.root);
    map.set(fp, [...(map.get(fp) ?? []), s]);
  }
  return [...map.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([fp, group]) => ({ fingerprint: fp, sets: group }));
}

export const emptyRoot = (): RequirementGroup => ({
  kind: "group",
  id: "root",
  op: "and",
  children: [],
  priority: 0,
  comment: "",
});
