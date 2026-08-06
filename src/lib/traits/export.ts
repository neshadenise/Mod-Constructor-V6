/**
 * Trait export.
 *
 * Turns a TraitDoc into the actual resources a package needs: the trait tuning
 * XML, the STBL entries, the icon reference, a dependency manifest and a build
 * report. References are resolved to ids here and nowhere else.
 *
 * SimData: the game will not load trait tuning without its SimData companion,
 * and this build has no SimData writer. The pair's keys are still generated and
 * validated so the package is correct the moment a writer exists — but the
 * result is reported as non-loadable rather than silently shipped.
 */

import { canSerializeSimData, requiresSimData } from "@/lib/modexport/simdata";
import { keyToString } from "@/lib/modexport/ids";
import { computeTraitKeys, ensureStringKeys, ALL_STRING_FIELDS, type TraitKeys } from "./ids";
import {
  AGES,
  OCCULTS,
  SPECIES,
  collectRefs,
  isVisible,
  traitTypeSpec,
  type TraitDoc,
  type ResourceRef,
} from "./schema";
import {
  externalDependencies,
  requiredPacks,
  resolveRef,
  type ResolveContext,
} from "./resolver";
import { validateTrait, type TraitValidation } from "./validate";

export interface TraitExportFile {
  name: string;
  kind: "tuning" | "stbl" | "simdata" | "report" | "manifest";
  contents: string;
  resourceKey?: string;
}

export interface TraitExportResult {
  ok: boolean;
  /** True when the produced package would actually load in-game. */
  loadable: boolean;
  keys: TraitKeys;
  files: TraitExportFile[];
  packs: string[];
  dependencies: ReturnType<typeof externalDependencies>;
  validation: TraitValidation;
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

export function buildTraitXml(doc: TraitDoc, ctx: ResolveContext, keys: TraitKeys): string {
  const spec = traitTypeSpec(doc.traitType);
  const strings = ensureStringKeys(doc);
  const L: string[] = [];
  const push = (indent: number, line: string) => L.push(`${"  ".repeat(indent)}${line}`);

  push(0, `<?xml version="1.0" encoding="utf-8"?>`);
  push(
    0,
    `<I c="Trait" i="trait" m="traits.traits" n="${esc(keys.tuningName)}" s="${keys.tuningDecimal}">`,
  );
  push(1, `<T n="trait_type">${spec.gameTraitType}</T>`);
  push(1, `<T n="display_name">0x${strings.displayName.key}<!--${esc(doc.displayName)}--></T>`);
  if (strings.description.text)
    push(1, `<T n="trait_description">0x${strings.description.key}<!--${esc(doc.description)}--></T>`);
  if (doc.icon) push(1, `<T n="icon">${esc(doc.icon)}</T>`);
  push(1, `<T n="is_personality_trait">${spec.id === "personality"}</T>`);
  push(1, `<T n="visible">${isVisible(doc)}</T>`);
  if (spec.usesCategory) push(1, `<E n="trait_category">${doc.category.toUpperCase()}</E>`);
  if (spec.purchasable && doc.acquisition.methods.includes("reward-store")) {
    push(1, `<T n="reward_cost">${doc.acquisition.rewardStore.cost}</T>`);
    push(1, `<T n="reward_display_order">${doc.acquisition.rewardStore.displayOrder}</T>`);
  }

  // Ages / species / gender eligibility become real tests.
  push(1, `<L n="ages">`);
  for (const a of doc.eligibility.ages) {
    const spec2 = AGES.find((x) => x.id === a);
    if (spec2) push(2, `<E>${spec2.test}</E>`);
  }
  push(1, `</L>`);
  push(1, `<L n="species">`);
  for (const s of doc.eligibility.species) {
    const sp = SPECIES.find((x) => x.id === s);
    if (sp) push(2, `<E>${sp.test}</E>`);
  }
  push(1, `</L>`);
  if (doc.eligibility.gender !== "none")
    push(1, `<E n="gender_restriction">${doc.eligibility.gender.replace(/-/g, "_").toUpperCase()}</E>`);
  if (doc.eligibility.occultMode !== "any") {
    push(1, `<L n="${doc.eligibility.occultMode === "include" ? "whitelist_occults" : "blacklist_occults"}">`);
    for (const o of doc.eligibility.occults) {
      const oc = OCCULTS.find((x) => x.id === o);
      if (oc) push(2, `<E>${oc.test}</E>`);
    }
    push(1, `</L>`);
  }

  // Effects.
  const buffs = doc.effects.filter((e) => e.kind === "buff" && e.enabled);
  if (buffs.length) {
    push(1, `<L n="buffs">`);
    for (const b of buffs) {
      push(2, `<U>`);
      push(3, `<T n="buff_type">${esc(refValue(b.kind === "buff" ? b.ref : null, ctx))}<!--${esc(b.label)}--></T>`);
      if (b.kind === "buff") {
        push(3, `<T n="buff_reason">${esc(b.condition || "Trait buff")}</T>`);
        if (b.durationHours > 0) push(3, `<T n="duration">${b.durationHours}</T>`);
      }
      push(2, `</U>`);
    }
    push(1, `</L>`);
  }

  const stats = doc.effects.filter(
    (e) => (e.kind === "skill" || e.kind === "statistic" || e.kind === "motive") && e.enabled,
  );
  if (stats.length) {
    push(1, `<L n="statistic_modifiers">`);
    for (const s of stats) {
      if (s.kind !== "skill" && s.kind !== "statistic" && s.kind !== "motive") continue;
      const value = s.kind === "skill" ? s.gainMultiplier : s.value;
      push(2, `<U>`);
      push(3, `<T n="statistic">${esc(refValue("ref" in s ? s.ref : null, ctx))}<!--${esc(s.label)}--></T>`);
      push(3, `<T n="modifier">${value}</T>`);
      push(2, `</U>`);
    }
    push(1, `</L>`);
  }

  const autonomy = doc.effects.filter((e) => e.kind === "autonomy" && e.enabled);
  if (autonomy.length) {
    push(1, `<L n="autonomy_modifiers">`);
    for (const a of autonomy) {
      if (a.kind !== "autonomy") continue;
      push(2, `<U>`);
      push(3, `<T n="affordance">${esc(refValue(a.ref, ctx))}<!--${esc(a.label)}--></T>`);
      push(3, `<E n="mode">${a.mode.toUpperCase()}</E>`);
      push(3, `<T n="score_multiplier">${a.scoreMultiplier}</T>`);
      if (a.scoreBonus) push(3, `<T n="score_bonus">${a.scoreBonus}</T>`);
      push(2, `</U>`);
    }
    push(1, `</L>`);
  }

  const unlocks = doc.effects.filter((e) => e.kind === "interaction-unlock" && e.enabled);
  if (unlocks.length) {
    push(1, `<L n="super_affordances">`);
    for (const u of unlocks) {
      if (u.kind !== "interaction-unlock") continue;
      push(2, `<T>${esc(refValue(u.ref, ctx))}<!--${esc(u.label)} (${u.target})--></T>`);
    }
    push(1, `</L>`);
  }

  const loots = doc.effects.filter((e) => e.kind === "loot" && e.enabled);
  for (const trigger of ["trait-added", "trait-removed"] as const) {
    const set = loots.filter((l) => l.kind === "loot" && l.trigger === trigger);
    if (!set.length) continue;
    push(1, `<L n="${trigger === "trait-added" ? "loot_on_trait_add" : "loot_on_trait_removal"}">`);
    for (const l of set) {
      if (l.kind !== "loot") continue;
      push(2, `<T>${esc(refValue(l.ref, ctx))}<!--${esc(l.label)}--></T>`);
    }
    push(1, `</L>`);
  }

  const broadcasters = doc.effects.filter((e) => e.kind === "broadcaster" && e.enabled);
  if (broadcasters.length) {
    push(1, `<L n="broadcasters">`);
    for (const b of broadcasters) {
      if (b.kind !== "broadcaster") continue;
      push(2, `<U>`);
      push(3, `<T n="radius">${b.radius}</T>`);
      if (b.buffRef) push(3, `<T n="buff">${esc(refValue(b.buffRef, ctx))}</T>`);
      if (b.lootRef) push(3, `<T n="loot">${esc(refValue(b.lootRef, ctx))}</T>`);
      push(2, `</U>`);
    }
    push(1, `</L>`);
  }

  if (doc.conflicts.length) {
    push(1, `<L n="conflicting_traits">`);
    for (const c of doc.conflicts) {
      const v = c.ref ? refValue(c.ref, ctx) : c.matchValue;
      if (v) push(2, `<T>${esc(v)}<!--${c.behavior}--></T>`);
    }
    push(1, `</L>`);
  }

  if (doc.acquisition.removal.neverRemovable) push(1, `<T n="is_permanent">True</T>`);
  push(0, `</I>`);
  return L.join("\n");
}

/* --------------------------------------------------------------- STBL -- */

export function buildStblEntries(doc: TraitDoc) {
  const strings = ensureStringKeys(doc);
  return ALL_STRING_FIELDS(strings)
    .filter((t) => t.text.trim())
    .map((t) => ({ key: `0x${t.key}`, field: t.field, value: t.text }));
}

/* -------------------------------------------------------------- export -- */

export function exportTrait(
  doc: TraitDoc,
  ctx: ResolveContext,
  opts: { recordId?: string; includeReport?: boolean } = {},
): TraitExportResult {
  const validation = validateTrait(doc, ctx, opts.recordId);
  const keys = computeTraitKeys(doc);
  const packs = requiredPacks(doc, ctx);
  const dependencies = externalDependencies(doc);
  const blockers: string[] = [];

  const files: TraitExportFile[] = [];
  const hardErrors = validation.blocking.filter((i) => i.code !== "NO_SIMDATA_WRITER");
  const ok = hardErrors.length === 0;

  if (ok) {
    files.push({
      name: `${keys.tuningName.replace(":", "_")}.xml`,
      kind: "tuning",
      contents: buildTraitXml(doc, ctx, keys),
      resourceKey: keyToString(keys.tuning),
    });

    const entries = buildStblEntries(doc);
    files.push({
      name: `${keys.tuningName.replace(":", "_")}.stbl.json`,
      kind: "stbl",
      contents: JSON.stringify({ locale: "en-US", entries }, null, 2),
    });
  } else {
    blockers.push(...hardErrors.map((e) => e.message));
  }

  let loadable = ok;
  if (requiresSimData("trait")) {
    if (canSerializeSimData("trait")) {
      // A writer exists in a future build — the key pair is already correct.
      files.push({
        name: `${keys.tuningName.replace(":", "_")}.simdata`,
        kind: "simdata",
        contents: "",
        resourceKey: keyToString(keys.simData),
      });
    } else {
      loadable = false;
      blockers.push(
        "No SimData writer in this build. Trait XML, strings and icons are produced and the SimData key pair is reserved, but the game will not load the trait until SimData is generated.",
      );
    }
  }

  files.push({
    name: "dependencies.json",
    kind: "manifest",
    contents: JSON.stringify(
      {
        trait: keys.tuningName,
        tuning: keyToString(keys.tuning),
        simData: keyToString(keys.simData),
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

function collectResolved(doc: TraitDoc, ctx: ResolveContext) {
  return collectRefs(doc).map(({ path, ref }) => {
    const r = resolveRef(ref, ctx);
    return { path, kind: ref.resourceKind, source: ref.source, name: r.tuningName, id: r.tuningId, status: r.status };
  });
}

function buildReport(
  doc: TraitDoc,
  keys: TraitKeys,
  v: TraitValidation,
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
    `- Trait type: ${traitTypeSpec(doc.traitType).label} → ${traitTypeSpec(doc.traitType).gameTraitType}`,
    `- Required packs: ${packs.length ? packs.join(", ") : "base game only"}`,
    `- Loadable in-game: ${loadable ? "yes" : "NO"}`,
    "",
    `## Validation`,
    `${v.errors} error(s), ${v.warnings} warning(s), ${v.suggestions} suggestion(s)`,
    "",
    ...v.issues.map((i) => `- **${i.level}** \`${i.code}\` ${i.message}`),
  ];
  if (blockers.length) {
    lines.push("", "## Blockers", ...blockers.map((b) => `- ${b}`));
  }
  return lines.join("\n");
}
