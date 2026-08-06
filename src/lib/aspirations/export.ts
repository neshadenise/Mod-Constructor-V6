/**
 * Aspiration export.
 *
 * Turns an AspirationDoc into the resources a package needs: aspiration tuning
 * XML, milestone/objective stubs, STBL entries, the icon reference, a
 * dependency manifest and a build report. References are resolved to ids here
 * and nowhere else.
 *
 * SimData: the game will not load aspiration tuning without its SimData
 * companion and this build has no SimData writer. The key pair is generated
 * and validated so the package is correct the moment a writer exists — the
 * result is reported as non-loadable rather than silently shipped.
 */

import { canSerializeSimData, requiresSimData } from "@/lib/modexport/simdata";
import { keyToString } from "@/lib/modexport/ids";
import {
  ALL_STRING_FIELDS,
  computeAspirationKeys,
  ensureStringKeys,
  type AspirationKeys,
} from "./ids";
import {
  AGE_LABEL,
  aspirationTypeSpec,
  collectRefs,
  isVisible,
  objectiveCount,
  type AspirationDoc,
  type ResourceRef,
} from "./schema";
import { externalDependencies, requiredPacks, resolveRef, type ResolveContext } from "./resolver";
import { validateAspiration, type AspirationValidation } from "./validate";

export interface AspirationExportFile {
  name: string;
  kind: "tuning" | "stbl" | "simdata" | "report" | "manifest";
  contents: string;
  resourceKey?: string;
}

export interface AspirationExportResult {
  ok: boolean;
  /** True when the produced package would actually load in-game. */
  loadable: boolean;
  keys: AspirationKeys;
  files: AspirationExportFile[];
  packs: string[];
  dependencies: ReturnType<typeof externalDependencies>;
  validation: AspirationValidation;
  blockers: string[];
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function refValue(ref: ResourceRef | null | undefined, ctx: ResolveContext): string {
  if (!ref) return "";
  const r = resolveRef(ref, ctx);
  return r.tuningId && r.tuningId !== "resolved-at-build" ? r.tuningId : r.tuningName;
}

/* -------------------------------------------------------------- tuning -- */

export function buildAspirationXml(
  doc: AspirationDoc,
  ctx: ResolveContext,
  keys: AspirationKeys,
): string {
  const spec = aspirationTypeSpec(doc.aspirationType);
  const strings = ensureStringKeys(doc);
  const L: string[] = [];
  const push = (indent: number, line: string) => L.push(`${"  ".repeat(indent)}${line}`);

  push(0, `<?xml version="1.0" encoding="utf-8"?>`);
  push(
    0,
    `<I c="Aspiration" i="aspiration" m="aspirations.aspiration_types" n="${esc(keys.tuningName)}" s="${keys.tuningDecimal}">`,
  );
  push(1, `<T n="aspiration_type">${spec.gameAspirationType}</T>`);
  push(1, `<T n="display_name">0x${strings.displayName.key}<!--${esc(doc.displayName)}--></T>`);
  if (strings.description.text)
    push(1, `<T n="description">0x${strings.description.key}<!--${esc(doc.description)}--></T>`);
  if (strings.tooltip.text) push(1, `<T n="tooltip">0x${strings.tooltip.key}</T>`);
  if (doc.icon) push(1, `<T n="icon">${esc(doc.icon)}</T>`);
  push(1, `<T n="category">${esc(doc.category)}</T>`);
  push(1, `<T n="visible">${isVisible(doc) ? "True" : "False"}</T>`);

  if (doc.availability.ages.length) {
    push(1, `<L n="available_ages">`);
    for (const a of doc.availability.ages)
      push(2, `<T>${AGE_LABEL[a].toUpperCase().replace(" ", "")}</T>`);
    push(1, `</L>`);
  }
  if (doc.availability.species.length) {
    push(1, `<L n="available_species">`);
    for (const s of doc.availability.species) push(2, `<T>${s.toUpperCase()}</T>`);
    push(1, `</L>`);
  }
  if (doc.availability.occultMode !== "any" && doc.availability.occults.length) {
    push(1, `<L n="occult_${doc.availability.occultMode.replace("-", "_")}">`);
    for (const o of doc.availability.occults) push(2, `<T>${o.toUpperCase()}</T>`);
    push(1, `</L>`);
  }
  if (doc.availability.gender !== "none")
    push(1, `<T n="gender_requirement">${esc(doc.availability.gender)}</T>`);

  const reward = refValue(doc.rewardTrait, ctx);
  if (reward) push(1, `<T n="reward">${esc(reward)}</T>`);

  if (keys.milestones.length) {
    push(1, `<L n="milestones">`);
    for (const m of keys.milestones) push(2, `<T>${m.decimal}<!--${esc(m.tuningName)}--></T>`);
    push(1, `</L>`);
  }

  push(0, `</I>`);
  return L.join("\n");
}

function buildMilestoneXml(
  doc: AspirationDoc,
  ctx: ResolveContext,
  keys: AspirationKeys,
): AspirationExportFile[] {
  return keys.milestones.flatMap((mk, i) => {
    const m = doc.milestones[i];
    if (!m) return [];
    const L: string[] = [];
    const push = (indent: number, line: string) => L.push(`${"  ".repeat(indent)}${line}`);
    push(0, `<?xml version="1.0" encoding="utf-8"?>`);
    push(
      0,
      `<I c="Objective" i="aspiration" m="aspirations.aspiration_tuning" n="${esc(mk.tuningName)}" s="${mk.decimal}">`,
    );
    push(1, `<T n="tier">${esc(m.tier)}</T>`);
    push(1, `<T n="points">${m.points}</T>`);
    const reward = refValue(m.rewardRef, ctx);
    if (reward) push(1, `<T n="reward">${esc(reward)}</T>`);
    push(1, `<L n="objectives">`);
    mk.objectives.forEach((ok, j) => {
      const o = m.objectives[j];
      push(2, `<T>${ok.decimal}<!--${esc(o?.label ?? ok.tuningName)}--></T>`);
    });
    push(1, `</L>`);
    push(0, `</I>`);
    return [
      {
        name: `${mk.tuningName.replace(":", "_")}.xml`,
        kind: "tuning" as const,
        contents: L.join("\n"),
        resourceKey: keyToString(mk.key),
      },
    ];
  });
}

/* --------------------------------------------------------------- STBL -- */

export function buildStblEntries(doc: AspirationDoc) {
  const strings = ensureStringKeys(doc);
  return ALL_STRING_FIELDS(strings)
    .filter((t) => t.text.trim())
    .map((t) => ({ key: `0x${t.key}`, field: t.field, value: t.text }));
}

/* -------------------------------------------------------------- export -- */

export function exportAspiration(
  doc: AspirationDoc,
  ctx: ResolveContext,
  opts: { recordId?: string; includeReport?: boolean } = {},
): AspirationExportResult {
  const validation = validateAspiration(doc, ctx, opts.recordId);
  const keys = computeAspirationKeys(doc);
  const packs = requiredPacks(doc, ctx);
  const dependencies = externalDependencies(doc);
  const blockers: string[] = [];

  const files: AspirationExportFile[] = [];
  const hardErrors = validation.blocking.filter((i) => i.code !== "NO_SIMDATA_WRITER");
  const ok = hardErrors.length === 0;

  if (ok) {
    files.push({
      name: `${keys.tuningName.replace(":", "_")}.xml`,
      kind: "tuning",
      contents: buildAspirationXml(doc, ctx, keys),
      resourceKey: keyToString(keys.tuning),
    });
    files.push(...buildMilestoneXml(doc, ctx, keys));

    files.push({
      name: `${keys.tuningName.replace(":", "_")}.stbl.json`,
      kind: "stbl",
      contents: JSON.stringify({ locale: "en-US", entries: buildStblEntries(doc) }, null, 2),
    });
  } else {
    blockers.push(...hardErrors.map((e) => e.message));
  }

  let loadable = ok;
  if (requiresSimData("aspiration")) {
    if (canSerializeSimData("aspiration")) {
      files.push({
        name: `${keys.tuningName.replace(":", "_")}.simdata`,
        kind: "simdata",
        contents: "",
        resourceKey: keyToString(keys.simData),
      });
    } else {
      loadable = false;
      blockers.push(
        "No SimData writer in this build. Aspiration XML, strings and icons are produced and the SimData key pair is reserved, but the game will not load the aspiration until SimData is generated.",
      );
    }
  }

  files.push({
    name: "dependencies.json",
    kind: "manifest",
    contents: JSON.stringify(
      {
        aspiration: keys.tuningName,
        uuid: doc.ids.uuid,
        tuning: keyToString(keys.tuning),
        simData: keyToString(keys.simData),
        milestones: keys.milestones.map((m) => ({
          name: m.tuningName,
          key: keyToString(m.key),
          objectives: m.objectives.map((o) => ({ name: o.tuningName, key: keyToString(o.key) })),
        })),
        requiredPacks: packs,
        baseGameCompatible: packs.length === 0,
        externalMods: dependencies,
        projectReferences: collectResolved(doc, ctx),
      },
      null,
      2,
    ),
  });

  if (opts.includeReport !== false) {
    files.push({
      name: "build-report.md",
      kind: "report",
      contents: buildReport(doc, keys, validation, packs, loadable, blockers),
    });
  }

  return { ok, loadable, keys, files, packs, dependencies, validation, blockers };
}

function collectResolved(doc: AspirationDoc, ctx: ResolveContext) {
  return collectRefs(doc).map(({ path, ref }) => {
    const r = resolveRef(ref, ctx);
    return {
      path,
      kind: ref.resourceKind,
      source: ref.source,
      name: r.tuningName,
      id: r.tuningId,
      status: r.status,
    };
  });
}

function buildReport(
  doc: AspirationDoc,
  keys: AspirationKeys,
  v: AspirationValidation,
  packs: string[],
  loadable: boolean,
  blockers: string[],
) {
  const lines = [
    `# Build report — ${doc.displayName}`,
    "",
    `- Tuning name: \`${keys.tuningName}\``,
    `- Tuning instance: \`${keys.tuning.instance}\` (${keys.tuningDecimal})`,
    `- SimData instance: \`${keys.simData.instance}\``,
    `- Type: ${aspirationTypeSpec(doc.aspirationType).label} → ${aspirationTypeSpec(doc.aspirationType).gameAspirationType}`,
    `- Milestones: ${doc.milestones.length} · Objectives: ${objectiveCount(doc)}`,
    `- Required packs: ${packs.length ? packs.join(", ") : "base game only"}`,
    `- Loadable in-game: ${loadable ? "yes" : "NO"}`,
    "",
    `## Validation`,
    `${v.errors} error(s), ${v.warnings} warning(s), ${v.suggestions} suggestion(s)`,
    "",
    ...v.issues.map((i) => `- **${i.level}** \`${i.code}\` ${i.message}`),
  ];
  if (blockers.length) lines.push("", "## Blockers", ...blockers.map((b) => `- ${b}`));
  return lines.join("\n");
}
