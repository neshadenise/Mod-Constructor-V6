/**
 * Pack Mechanics build generator.
 *
 * Lowers PackModule records (clubs, royalty, legacy, pack-specific mechanics)
 * into real snippet tuning plus STBL strings. Snippets are used deliberately:
 * they are the one tuning class the game loads without a SimData companion, so
 * pack modules export into a loadable package with this build's capabilities.
 * Nothing is invented — only fields the module actually carries are emitted.
 */

import type {
  ClubModuleData,
  LegacyModuleData,
  LocalizedString,
  PackMechanicModuleData,
  PackModule,
  RoyaltyModuleData,
} from "@/lib/packs/types";
import {
  doc,
  keyFor,
  list,
  slug,
  stringFor,
  tunable,
  type SerializedTuningResource,
  type SerializerContext,
  type ValidationResult,
} from "./serializers";

const MODULE_PATH = "snippets.snippet";
const CLASS_NAME = "Snippet";

interface Emitted {
  resources: SerializedTuningResource[];
  strings: { key: string; value: string }[];
}

function emit(
  ctx: SerializerContext,
  name: string,
  resourceId: string,
  body: string[],
  strings: { key: string; value: string }[],
  stringRefs: string[],
): SerializedTuningResource {
  const key = keyFor(ctx, "snippet", name, resourceId);
  const tuningName = `${ctx.namespace}_${name}`;
  return {
    resourceId,
    kind: "snippet",
    key,
    tuningName,
    className: CLASS_NAME,
    modulePath: MODULE_PATH,
    tuningType: "snippet",
    xml: doc(CLASS_NAME, key.instance, MODULE_PATH, tuningName, "snippet", body),
    stringRefs,
    strings,
  };
}

function locString(
  ctx: SerializerContext,
  base: string,
  field: string,
  loc: LocalizedString | undefined,
) {
  const value = loc?.text?.trim();
  if (!value) return undefined;
  return stringFor(ctx, "snippet", base, field, value);
}

/* ------------------------------ validation ---------------------------- */

export function validatePackModuleForExport(m: PackModule): ValidationResult[] {
  const out: ValidationResult[] = [];
  if (!m.name.trim())
    out.push({ severity: "error", code: "PACK_NO_NAME", message: "A pack module has no name.", fieldPath: "name" });
  if (!m.requiredPack.trim())
    out.push({
      severity: "warning",
      code: "PACK_NO_REQUIRED_PACK",
      message: `"${m.name}" does not declare the pack it needs; players cannot tell what to install.`,
      fieldPath: "requiredPack",
    });
  if (m.kind === "club") {
    const d = m.data as ClubModuleData;
    if (!d.activities.length && !d.perks.length && !d.ranks.length)
      out.push({ severity: "warning", code: "CLUB_EMPTY", message: `Club "${m.name}" has no activities, perks or ranks — it exports as a stub.` });
    if (d.maxMembers && d.minMembers > d.maxMembers)
      out.push({ severity: "error", code: "CLUB_MEMBER_RANGE", message: `Club "${m.name}" has a minimum member count above its maximum.` });
  }
  if (m.kind === "royalty") {
    const d = m.data as RoyaltyModuleData;
    if (!d.titles.length)
      out.push({ severity: "warning", code: "ROYALTY_NO_TITLES", message: `Royalty system "${m.name}" has no titles.` });
  }
  if (m.kind === "legacy") {
    const d = m.data as LegacyModuleData;
    if (!d.generations.length)
      out.push({ severity: "warning", code: "LEGACY_NO_GENERATIONS", message: `Legacy "${m.name}" has no generation rules.` });
  }
  if (m.kind === "pack") {
    const d = m.data as PackMechanicModuleData;
    if (!d.rules.filter((r) => r.enabled).length)
      out.push({ severity: "warning", code: "PACK_NO_RULES", message: `"${m.name}" has no enabled mechanic rules.` });
  }
  return out;
}

/* ------------------------------ serialize ----------------------------- */

export function serializePackModule(m: PackModule, ctx: SerializerContext): SerializedTuningResource[] {
  const base = `${m.kind}_${slug(m.name)}`;
  const out: Emitted = { resources: [], strings: [] };

  const childRefs: string[] = [];
  const push = (
    childName: string,
    resourceId: string,
    body: string[],
    strings: { key: string; value: string }[],
    refs: string[],
  ) => {
    const r = emit(ctx, childName, resourceId, body, strings, refs);
    out.resources.push(r);
    out.strings.push(...strings);
    childRefs.push(BigInt("0x" + r.key.instance).toString());
  };

  if (m.kind === "club") serializeClub(m, ctx, base, push);
  if (m.kind === "royalty") serializeRoyalty(m, ctx, base, push);
  if (m.kind === "legacy") serializeLegacy(m, ctx, base, push);
  if (m.kind === "pack") serializePackMechanic(m, ctx, base, push);

  const nameStr = stringFor(ctx, "snippet", base, "name", m.name);
  const descStr = m.summary.trim() ? stringFor(ctx, "snippet", base, "description", m.summary) : undefined;
  const rootStrings = [
    { key: nameStr.key, value: nameStr.value },
    ...(descStr ? [{ key: descStr.key, value: descStr.value }] : []),
  ];

  const body = [
    tunable("module_kind", m.kind),
    tunable("display_name", nameStr.ref),
    descStr ? tunable("description", descStr.ref) : "",
    m.requiredPack.trim() ? tunable("required_pack", m.requiredPack.trim()) : "",
    list("entries", childRefs),
  ];

  const root = emit(ctx, base, `pack:${m.id}`, body, rootStrings, [
    nameStr.ref,
    ...(descStr ? [descStr.ref] : []),
  ]);

  return [...out.resources, root];
}

type Push = (
  childName: string,
  resourceId: string,
  body: string[],
  strings: { key: string; value: string }[],
  refs: string[],
) => void;

function serializeClub(m: PackModule, ctx: SerializerContext, base: string, push: Push) {
  const d = m.data as ClubModuleData;

  for (const a of d.activities) {
    const n = `${base}_activity_${slug(a.name)}`;
    const tip = locString(ctx, n, "tooltip", a.tooltip);
    push(
      n,
      `pack:${m.id}:activity:${a.id}`,
      [
        tunable("entry_type", "club_activity"),
        tunable("stance", a.stance),
        tunable("club_points", a.clubPoints),
        tunable("autonomy_weight", a.autonomyWeight),
        tunable("cooldown_minutes", a.cooldownMinutes),
        a.category ? tunable("category", a.category) : "",
        a.interactionRef.tuningId ? tunable("interaction", a.interactionRef.tuningId) : "",
        tip ? tunable("tooltip", tip.ref) : "",
      ],
      tip ? [{ key: tip.key, value: tip.value }] : [],
      tip ? [tip.ref] : [],
    );
  }

  for (const p of d.perks) {
    const n = `${base}_perk_${slug(p.name)}`;
    const desc = locString(ctx, n, "description", p.description);
    push(
      n,
      `pack:${m.id}:perk:${p.id}`,
      [
        tunable("entry_type", "club_perk"),
        tunable("point_cost", p.pointCost),
        tunable("club_size_increase", p.clubSizeIncrease),
        tunable("point_gain_multiplier", p.pointGainMultiplier),
        p.grantRef.tuningId ? tunable("grants", p.grantRef.tuningId) : "",
        desc ? tunable("description", desc.ref) : "",
        list("unlocked_interactions", p.unlockedInteractions.map((r) => r.tuningId ?? "").filter(Boolean)),
      ],
      desc ? [{ key: desc.key, value: desc.value }] : [],
      desc ? [desc.ref] : [],
    );
  }

  for (const r of d.ranks) {
    const n = `${base}_rank_${slug(r.name)}`;
    const desc = locString(ctx, n, "description", r.description);
    push(
      n,
      `pack:${m.id}:rank:${r.id}`,
      [
        tunable("entry_type", "club_rank"),
        tunable("required_points", r.requiredPoints),
        tunable("auto_promote", r.autoPromote),
        tunable("relationship_requirement", r.relationshipRequirement),
        list("permissions", r.permissions),
        desc ? tunable("description", desc.ref) : "",
      ],
      desc ? [{ key: desc.key, value: desc.value }] : [],
      desc ? [desc.ref] : [],
    );
  }

  for (const g of d.gatherings) {
    const n = `${base}_gathering_${slug(g.name)}`;
    push(
      n,
      `pack:${m.id}:gathering:${g.id}`,
      [
        tunable("entry_type", "club_gathering"),
        tunable("duration_hours", g.durationHours),
        tunable("min_members", g.minMembers),
        g.schedule ? tunable("schedule", g.schedule) : "",
        list("goals", g.goals),
      ],
      [],
      [],
    );
  }
}

function serializeRoyalty(m: PackModule, ctx: SerializerContext, base: string, push: Push) {
  const d = m.data as RoyaltyModuleData;

  for (const t of d.titles) {
    const n = `${base}_title_${slug(t.neutralName.text || t.masculineName.text || "title")}`;
    const label = locString(ctx, n, "name", t.neutralName) ?? locString(ctx, n, "name", t.masculineName);
    const desc = locString(ctx, n, "description", t.description);
    const strings = [
      ...(label ? [{ key: label.key, value: label.value }] : []),
      ...(desc ? [{ key: desc.key, value: desc.value }] : []),
    ];
    push(
      n,
      `pack:${m.id}:title:${t.id}`,
      [
        tunable("entry_type", "royal_title"),
        tunable("rank_priority", t.rankPriority),
        tunable("prestige", t.prestige),
        tunable("hereditary", t.hereditary),
        tunable("revocable", t.revocable),
        tunable("max_holders", t.maxHolders),
        list("allowed_ages", t.allowedAges),
        t.traitRef.tuningId ? tunable("trait", t.traitRef.tuningId) : "",
        t.buffRef.tuningId ? tunable("buff", t.buffRef.tuningId) : "",
        label ? tunable("display_name", label.ref) : "",
        desc ? tunable("description", desc.ref) : "",
      ],
      strings,
      strings.map((s) => `0x${s.key}`),
    );
  }

  for (const s of d.succession) {
    const n = `${base}_succession_${slug(s.name)}`;
    push(
      n,
      `pack:${m.id}:succession:${s.id}`,
      [
        tunable("entry_type", "succession_rule"),
        tunable("mode", s.mode),
        tunable("priority", s.priority),
        tunable("weight", s.weight),
      ],
      [],
      [],
    );
  }

  for (const r of d.courtRoles) {
    const n = `${base}_court_${slug(r.name)}`;
    push(
      n,
      `pack:${m.id}:court:${r.id}`,
      [
        tunable("entry_type", "court_role"),
        tunable("salary", r.salary),
        r.schedule ? tunable("schedule", r.schedule) : "",
        list("responsibilities", r.responsibilities),
        r.careerRef.tuningId ? tunable("career", r.careerRef.tuningId) : "",
      ],
      [],
      [],
    );
  }
}

function serializeLegacy(m: PackModule, ctx: SerializerContext, base: string, push: Push) {
  const d = m.data as LegacyModuleData;

  for (const g of d.generations) {
    const n = `${base}_gen_${g.number}_${slug(g.name)}`;
    const desc = locString(ctx, n, "description", g.description);
    push(
      n,
      `pack:${m.id}:generation:${g.id}`,
      [
        tunable("entry_type", "legacy_generation"),
        tunable("generation", g.number),
        g.theme ? tunable("theme", g.theme) : "",
        tunable("child_requirement", g.childRequirement),
        tunable("wealth_requirement", g.wealthRequirement),
        list("goals", g.goals.map((x) => x.text).filter(Boolean)),
        desc ? tunable("description", desc.ref) : "",
      ],
      desc ? [{ key: desc.key, value: desc.value }] : [],
      desc ? [desc.ref] : [],
    );
  }

  for (const b of d.bloodlines) {
    const n = `${base}_bloodline_${slug(b.name)}`;
    const desc = locString(ctx, n, "description", b.description);
    push(
      n,
      `pack:${m.id}:bloodline:${b.id}`,
      [
        tunable("entry_type", "legacy_bloodline"),
        tunable("hidden", b.hidden),
        tunable("inheritance_chance", b.inheritanceChance),
        tunable("maternal_chance", b.maternalChance),
        tunable("paternal_chance", b.paternalChance),
        tunable("generation_decay", b.generationDecay),
        list("buffs", b.buffRefs.map((r) => r.tuningId ?? "").filter(Boolean)),
        desc ? tunable("description", desc.ref) : "",
      ],
      desc ? [{ key: desc.key, value: desc.value }] : [],
      desc ? [desc.ref] : [],
    );
  }

  for (const s of d.scoring) {
    const n = `${base}_score_${slug(s.event)}`;
    push(
      n,
      `pack:${m.id}:score:${s.id}`,
      [
        tunable("entry_type", "legacy_score_rule"),
        tunable("event", s.event),
        tunable("points", s.points),
        tunable("multiplier", s.multiplier),
        tunable("scope", s.scope),
      ],
      [],
      [],
    );
  }
}

function serializePackMechanic(m: PackModule, ctx: SerializerContext, base: string, push: Push) {
  const d = m.data as PackMechanicModuleData;

  for (const rule of d.rules) {
    if (!rule.enabled) continue;
    const n = `${base}_rule_${slug(rule.name)}`;
    const desc = locString(ctx, n, "description", rule.description);
    const fieldNodes = Object.entries(rule.fields)
      .filter(([, v]) => v !== "" && v !== undefined && v !== null)
      .map(([k, v]) => tunable(k, v as string | number | boolean));
    push(
      n,
      `pack:${m.id}:rule:${rule.id}`,
      [
        tunable("entry_type", "pack_mechanic_rule"),
        tunable("pack", d.packKey || m.requiredPack),
        rule.category ? tunable("category", rule.category) : "",
        ...fieldNodes,
        list("references", rule.refs.map((r) => r.tuningId ?? "").filter(Boolean)),
        desc ? tunable("description", desc.ref) : "",
      ],
      desc ? [{ key: desc.key, value: desc.value }] : [],
      desc ? [desc.ref] : [],
    );
  }
}
