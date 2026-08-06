/**
 * Aspiration export pipeline (Part 4).
 *
 * Twelve ordered stages turn a document into package resources and a build
 * report. The pipeline is deliberately data-only: it returns a structured
 * result the UI renders, so the same pipeline can run from the Export Center,
 * the MCP tools or a batch build.
 */

import { keyToString } from "@/lib/modexport/ids";
import { canSerializeSimData, requiresSimData } from "@/lib/modexport/simdata";
import { computeAspirationKeys, computeGameplayKeys, ensureStringKeys, orphanStrings } from "./ids";
import { exportAspiration, type AspirationExportFile } from "./export";
import { ensureGameplay, type AspirationDoc, type ResourceRef } from "./schema";
import { externalDependencies, requiredPacks, type ResolveContext } from "./resolver";
import { validateAspiration, type AspirationValidation } from "./validate";
import { compileTestSetXml, computeTestSetKeys, validateTestSet } from "@/lib/requirements/compile";
import type { TestSet } from "@/lib/requirements/schema";

export const PIPELINE_STEPS = [
  { id: "validate", label: "Validate" },
  { id: "resolve", label: "Resolve references" },
  { id: "xml", label: "Generate XML" },
  { id: "simdata", label: "Generate SimData" },
  { id: "stbl", label: "Generate STBL" },
  { id: "icons", label: "Generate icons" },
  { id: "resources", label: "Generate package resources" },
  { id: "package", label: "Build package" },
  { id: "verify", label: "Run validation" },
  { id: "report", label: "Generate build report" },
  { id: "health", label: "Update project health" },
  { id: "mark", label: "Mark successful export" },
] as const;

export type PipelineStepId = (typeof PIPELINE_STEPS)[number]["id"];
export type StepStatus = "pending" | "running" | "ok" | "warn" | "fail" | "skipped";

export interface PipelineStepResult {
  id: PipelineStepId;
  label: string;
  status: StepStatus;
  detail: string;
  ms: number;
}

export interface ManifestRow {
  name: string;
  type: string;
  instance: string;
  group: string;
  kind: string;
  bytes: number;
  required: boolean;
}

export interface GraphNode {
  id: string;
  label: string;
  kind: string;
}
export interface GraphEdge {
  from: string;
  to: string;
}
export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  cycles: string[][];
}

export interface BuildReport {
  aspiration: string;
  tuningName: string;
  generatedAt: number;
  ok: boolean;
  loadable: boolean;
  resources: number;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  packageBytes: number;
  durationMs: number;
  requiredPacks: string[];
  requiredMods: { name: string; required: boolean }[];
  unused: string[];
  duplicateIds: string[];
  manifest: ManifestRow[];
  files: AspirationExportFile[];
  graph: DependencyGraph;
  validation: AspirationValidation;
  steps: PipelineStepResult[];
  healthScore: number;
}

/* ------------------------------------------------------------ dep graph -- */

export function dependencyGraph(doc: AspirationDoc): DependencyGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const add = (id: string, label: string, kind: string) => {
    if (!nodes.some((n) => n.id === id)) nodes.push({ id, label, kind });
  };
  const link = (from: string, to: string) => {
    if (from !== to && !edges.some((e) => e.from === from && e.to === to)) edges.push({ from, to });
  };

  const root = `aspiration:${doc.ids.uuid}`;
  add(root, doc.displayName || "Aspiration", "Aspiration");

  for (const m of doc.milestones) {
    const mid = `milestone:${m.uuid}`;
    add(mid, m.title || "Milestone", "Milestone");
    link(root, mid);
    for (const o of m.objectives) {
      const oid = `objective:${o.uuid}`;
      add(oid, o.label || "Objective", "Objective");
      link(mid, oid);
    }
  }

  const g = ensureGameplay(doc);
  const refName = (ref: ResourceRef | null | undefined) => ref?.tuningName || ref?.label || "";
  const refKind = (ref: ResourceRef | null | undefined) => ref?.resourceKind ?? "Resource";

  const linkRefs = (from: string, refs: (ResourceRef | null | undefined)[]) => {
    for (const ref of refs) {
      const name = refName(ref);
      if (!name) continue;
      const target = `resource:${name}`;
      add(target, name, refKind(ref));
      link(from, target);
    }
  };

  for (const r of g.rewards) {
    const id = `reward:${r.id}`;
    add(id, r.name || r.kind, "Reward");
    const owner =
      r.scope === "milestone" && r.ownerUuid
        ? `milestone:${r.ownerUuid}`
        : r.scope === "objective" && r.ownerUuid
          ? `objective:${r.ownerUuid}`
          : root;
    link(owner, id);
    linkRefs(id, Object.values(r.refs ?? {}));
  }
  for (const l of g.loot) {
    const id = `loot:${l.id}`;
    add(id, l.name || "Loot", "Loot");
    link(root, id);
    linkRefs(id, l.ops.map((op) => op.ref));
  }
  for (const b of g.buffs) {
    const id = `buff:${b.id}`;
    add(id, b.name || "Buff", "Buff");
    link(root, id);
    linkRefs(id, [b.ref]);
  }
  for (const n of g.notifications) {
    const id = `notification:${n.id}`;
    add(id, n.name || n.title || "Notification", "Notification");
    link(root, id);
  }
  for (const b of g.broadcasters) {
    const id = `broadcaster:${b.id}`;
    add(id, b.name || "Broadcaster", "Broadcaster");
    link(root, id);
    linkRefs(id, [b.buffRef]);
  }

  return { nodes, edges, cycles: findCycles(nodes, edges) };
}

function findCycles(nodes: GraphNode[], edges: GraphEdge[]): string[][] {
  const out: string[][] = [];
  const adj = new Map<string, string[]>();
  for (const e of edges) adj.set(e.from, [...(adj.get(e.from) ?? []), e.to]);
  const state = new Map<string, 0 | 1 | 2>();
  const stack: string[] = [];

  const visit = (id: string) => {
    if (state.get(id) === 1) {
      const i = stack.indexOf(id);
      if (i >= 0) out.push([...stack.slice(i), id]);
      return;
    }
    if (state.get(id) === 2) return;
    state.set(id, 1);
    stack.push(id);
    for (const next of adj.get(id) ?? []) visit(next);
    stack.pop();
    state.set(id, 2);
  };
  nodes.forEach((n) => visit(n.id));
  return out;
}

/* ---------------------------------------------------------------- unused -- */

export function unusedResources(doc: AspirationDoc): string[] {
  const g = ensureGameplay(doc);
  const out: string[] = [];
  const referenced = new Set<string>();
  const note = (ref: { tuningName?: string; label?: string } | null | undefined) => {
    const name = ref?.tuningName || ref?.label;
    if (name) referenced.add(name);
  };
  for (const r of g.rewards) Object.values(r.refs ?? {}).forEach(note);
  for (const l of g.loot) l.ops.forEach((op) => note(op.ref));

  for (const b of g.buffs) {
    const name = b.ref?.tuningName || b.ref?.label || b.name;
    if (name && !referenced.has(name)) out.push(`Buff "${b.name || name}" is never applied by loot or a reward.`);
  }
  for (const n of g.notifications)
    if (!n.trigger) out.push(`Notification "${n.name || n.id}" has no trigger.`);
  for (const s of orphanStrings(doc)) if (s.text.trim()) out.push(`String "${s.field}" is not referenced.`);
  if (!doc.icon) out.push("No icon assigned — the game shows a placeholder.");
  return out;
}

/* -------------------------------------------------------------- pipeline -- */

export interface PipelineOptions {
  recordId?: string;
  testSets?: TestSet[];
  /** Test set uuids actually referenced by this aspiration. */
  usedTestSets?: string[];
}

export function runExportPipeline(
  doc: AspirationDoc,
  ctx: ResolveContext,
  opts: PipelineOptions = {},
): BuildReport {
  const started = Date.now();
  const steps: PipelineStepResult[] = [];
  const step = (id: PipelineStepId, status: StepStatus, detail: string) => {
    const spec = PIPELINE_STEPS.find((s) => s.id === id)!;
    steps.push({ id, label: spec.label, status, detail, ms: Date.now() - started });
  };

  const validation = validateAspiration(doc, ctx, opts.recordId);
  step(
    "validate",
    validation.errors ? "fail" : validation.warnings ? "warn" : "ok",
    `${validation.errors} error(s), ${validation.warnings} warning(s), ${validation.suggestions} suggestion(s)`,
  );

  const keys = computeAspirationKeys(doc);
  const gameplayKeys = computeGameplayKeys(doc);
  const packs = requiredPacks(doc, ctx);
  const mods = externalDependencies(doc);
  const graph = dependencyGraph(doc);
  step(
    "resolve",
    graph.cycles.length ? "fail" : "ok",
    graph.cycles.length
      ? `${graph.cycles.length} circular dependency chain(s) — export blocked`
      : `${graph.nodes.length} resources, ${graph.edges.length} links resolved`,
  );

  const result = exportAspiration(doc, ctx, {
    ...(opts.recordId ? { recordId: opts.recordId } : {}),
    includeReport: false,
  });

  const tuningFiles = result.files.filter((f) => f.kind === "tuning");
  step(
    "xml",
    result.ok ? "ok" : "fail",
    result.ok ? `${tuningFiles.length} tuning file(s)` : (result.blockers[0] ?? "blocked by validation"),
  );

  const needsSimData = requiresSimData("aspiration");
  step(
    "simdata",
    !needsSimData ? "skipped" : canSerializeSimData("aspiration") ? "ok" : "warn",
    !needsSimData
      ? "Not required for this resource type"
      : canSerializeSimData("aspiration")
        ? "SimData generated and matched to tuning"
        : `Key pair reserved (${keyToString(keys.simData)}) — writer not available in this build`,
  );

  const stblFiles = result.files.filter((f) => f.kind === "stbl");
  const strings = ensureStringKeys(doc);
  step("stbl", stblFiles.length ? "ok" : "warn", `${Object.keys(strings).length} localised field(s)`);

  step(doc.icon ? "icons" : "icons", doc.icon ? "ok" : "warn", doc.icon ? `Icon resource "${doc.icon}" packed` : "No icon assigned");

  const testSets = (opts.testSets ?? []).filter(
    (s) => !opts.usedTestSets || opts.usedTestSets.includes(s.uuid),
  );
  const testFiles: AspirationExportFile[] = testSets.map((s) => {
    const tk = computeTestSetKeys(doc.ids.namespace, s);
    return {
      name: `${tk.tuningName.replace(":", "_")}.xml`,
      kind: "tuning",
      contents: compileTestSetXml(s, doc.ids.namespace, tk),
      resourceKey: `${tk.key.type}:${tk.key.group}:${tk.key.instance}`,
    };
  });
  const testIssues = testSets.flatMap((s) => validateTestSet(s, opts.testSets ?? []));
  step(
    "resources",
    testIssues.some((i) => i.level === "error") ? "fail" : "ok",
    `${testFiles.length} test set(s), ${gameplayKeys.loot.length + gameplayKeys.notifications.length} gameplay resource(s)`,
  );

  const files = [...result.files, ...testFiles];
  const manifest = buildManifestRows(files);
  const packageBytes = files.reduce((n, f) => n + new Blob([f.contents]).size, 0);
  step(result.ok ? "package" : "package", result.ok ? "ok" : "fail", `${manifest.length} resources · ${formatBytes(packageBytes)}`);

  const duplicateIds = findDuplicateInstances(manifest);
  step(
    "verify",
    duplicateIds.length ? "fail" : result.loadable ? "ok" : "warn",
    duplicateIds.length
      ? `${duplicateIds.length} duplicate instance id(s)`
      : result.loadable
        ? "Package verified — loadable in game"
        : "Package incomplete — see blockers",
  );

  const unused = unusedResources(doc);
  step("report", "ok", `${unused.length} unused resource note(s)`);

  const healthScore = computeHealth(validation, graph, duplicateIds, result.loadable, unused.length);
  step("health", healthScore >= 90 ? "ok" : healthScore >= 70 ? "warn" : "fail", `Project health contribution ${healthScore}%`);

  const ok = result.ok && !duplicateIds.length && !graph.cycles.length;
  step(
    "mark",
    ok ? "ok" : "fail",
    ok ? `Export recorded at ${new Date().toLocaleTimeString()}` : "Export not marked — fix blocking errors",
  );

  return {
    aspiration: doc.displayName || "Untitled aspiration",
    tuningName: keys.tuningName,
    generatedAt: Date.now(),
    ok,
    loadable: result.loadable && ok,
    resources: manifest.length,
    errors: [
      ...validation.issues.filter((i) => i.level === "error").map((i) => i.message),
      ...result.blockers,
      ...graph.cycles.map((c) => `Circular dependency: ${c.join(" → ")}`),
      ...duplicateIds.map((d) => `Duplicate instance id ${d}`),
      ...testIssues.filter((i) => i.level === "error").map((i) => `Test set: ${i.message}`),
    ],
    warnings: [
      ...validation.issues.filter((i) => i.level === "warning").map((i) => i.message),
      ...testIssues.filter((i) => i.level === "warning").map((i) => `Test set: ${i.message}`),
    ],
    suggestions: validation.issues.filter((i) => i.level === "suggestion").map((i) => i.message),
    packageBytes,
    durationMs: Date.now() - started,
    requiredPacks: packs,
    requiredMods: mods.map((m) => ({ name: `${m.creator} — ${m.modName}`, required: m.required })),
    unused,
    duplicateIds,
    manifest,
    files,
    graph,
    validation,
    steps,
    healthScore,
  };
}

function buildManifestRows(files: AspirationExportFile[]): ManifestRow[] {
  return files.map((f) => {
    const parts = (f.resourceKey ?? "").split(":");
    return {
      name: f.name,
      type: parts[0] ?? "—",
      group: parts[1] ?? "00000000",
      instance: parts[2] ?? "—",
      kind: f.kind,
      bytes: new Blob([f.contents]).size,
      required: f.kind === "tuning" || f.kind === "simdata",
    };
  });
}

function findDuplicateInstances(rows: ManifestRow[]): string[] {
  const seen = new Map<string, number>();
  for (const r of rows) {
    if (r.instance === "—") continue;
    const key = `${r.type}:${r.group}:${r.instance}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k);
}

function computeHealth(
  validation: AspirationValidation,
  graph: DependencyGraph,
  duplicates: string[],
  loadable: boolean,
  unused: number,
): number {
  let score = 100;
  score -= validation.errors * 12;
  score -= validation.warnings * 4;
  score -= graph.cycles.length * 20;
  score -= duplicates.length * 15;
  score -= Math.min(10, unused * 2);
  if (!loadable) score -= 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/* ----------------------------------------------------------- report i/o -- */

export function reportToJson(report: BuildReport): string {
  const { files, ...rest } = report;
  return JSON.stringify({ ...rest, files: files.map((f) => ({ name: f.name, kind: f.kind })) }, null, 2);
}

export function reportToHtml(report: BuildReport): string {
  const list = (items: string[]) =>
    items.length ? `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>` : "<p>None</p>";
  return `<!doctype html><html><head><meta charset="utf-8"><title>Build report — ${escapeHtml(
    report.aspiration,
  )}</title><style>
  body{font-family:system-ui,sans-serif;margin:32px;color:#12161f;background:#f7f9fc}
  h1{font-size:20px}h2{font-size:14px;margin-top:24px;text-transform:uppercase;letter-spacing:.06em;color:#54607a}
  table{border-collapse:collapse;width:100%;font-size:12px}td,th{border:1px solid #dbe2ee;padding:6px 8px;text-align:left}
  .ok{color:#0f8a5f}.bad{color:#c02b2b}code{font-family:ui-monospace,monospace}</style></head><body>
  <h1>${escapeHtml(report.aspiration)} — build report</h1>
  <p class="${report.ok ? "ok" : "bad"}">${report.ok ? "Build succeeded" : "Build failed"} ·
  ${report.resources} resources · ${formatBytes(report.packageBytes)} · ${report.durationMs} ms ·
  health ${report.healthScore}%</p>
  <p><code>${escapeHtml(report.tuningName)}</code></p>
  <h2>Errors</h2>${list(report.errors)}
  <h2>Warnings</h2>${list(report.warnings)}
  <h2>Suggestions</h2>${list(report.suggestions)}
  <h2>Required packs</h2>${list(report.requiredPacks.length ? report.requiredPacks : ["Base game only"])}
  <h2>Required mods</h2>${list(report.requiredMods.map((m) => `${m.name}${m.required ? " (required)" : " (optional)"}`))}
  <h2>Unused resources</h2>${list(report.unused)}
  <h2>Package manifest</h2>
  <table><tr><th>Name</th><th>Kind</th><th>Type</th><th>Group</th><th>Instance</th><th>Bytes</th></tr>
  ${report.manifest
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.name)}</td><td>${r.kind}</td><td><code>${r.type}</code></td><td><code>${r.group}</code></td><td><code>${r.instance}</code></td><td>${r.bytes}</td></tr>`,
    )
    .join("")}
  </table></body></html>`;
}

export function reportToMarkdown(report: BuildReport): string {
  return [
    `# Build report — ${report.aspiration}`,
    "",
    `- Status: ${report.ok ? "success" : "failed"} (${report.loadable ? "loadable" : "not loadable"})`,
    `- Tuning: \`${report.tuningName}\``,
    `- Resources: ${report.resources} · ${formatBytes(report.packageBytes)} · ${report.durationMs} ms`,
    `- Health: ${report.healthScore}%`,
    "",
    "## Errors",
    ...(report.errors.length ? report.errors.map((e) => `- ${e}`) : ["- none"]),
    "",
    "## Warnings",
    ...(report.warnings.length ? report.warnings.map((e) => `- ${e}`) : ["- none"]),
    "",
    "## Manifest",
    ...report.manifest.map((r) => `- ${r.name} · ${r.kind} · ${r.type}:${r.group}:${r.instance} · ${r.bytes} B`),
  ].join("\n");
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
