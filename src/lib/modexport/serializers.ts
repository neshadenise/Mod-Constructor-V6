/**
 * Tuning XML serializers.
 *
 * Every supported builder type gets an explicit serializer — no generic
 * "object keys to XML tags" converter. Serializers only emit nodes they know
 * the game reads, and optional values are omitted rather than written empty.
 */

import type { ResourceKey } from "@/lib/modimport/types";
import type { Aspiration, Buff, Career, CareerBranch, CareerLevel, Trait } from "@/lib/types";
import { GROUP_DEFAULT, ResourceIdService, TYPE_TUNING, localizationKey } from "./ids";
import type { BuilderKind } from "./simdata";

export interface ValidationResult {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  fieldPath?: string;
}

export interface SerializedTuningResource {
  /** Stable id inside the export snapshot. */
  resourceId: string;
  kind: BuilderKind;
  key: ResourceKey;
  /** Tuning name attribute (n=""). */
  tuningName: string;
  className: string;
  modulePath: string;
  tuningType: string;
  xml: string;
  /** Localisation keys referenced by this resource. */
  stringRefs: string[];
  /** Strings this resource contributes to the STBL table. */
  strings: { key: string; value: string }[];
}

export interface TuningSerializer<TModel> {
  kind: BuilderKind;
  validate(model: TModel): ValidationResult[];
  serialize(model: TModel, ctx: SerializerContext): SerializedTuningResource[];
}

export interface SerializerContext {
  namespace: string;
  ids: ResourceIdService;
}

/* ------------------------------ helpers ------------------------------ */

export function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const slug = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "unnamed";

function tunable(name: string, value: string | number | boolean) {
  return `  <T n="${name}">${escapeXml(String(value))}</T>`;
}

function list(name: string, values: string[]) {
  if (!values.length) return "";
  return [`  <L n="${name}">`, ...values.map((v) => `    <T>${escapeXml(v)}</T>`), `  </L>`].join("\n");
}

function doc(
  className: string,
  instance: string,
  modulePath: string,
  tuningName: string,
  tuningType: string,
  body: string[],
) {
  const inner = body.filter(Boolean).join("\n");
  return [
    `<?xml version="1.0" encoding="utf-8"?>`,
    `<I c="${className}" i="${tuningType}" m="${modulePath}" n="${escapeXml(tuningName)}" s="${BigInt("0x" + instance).toString()}">`,
    inner,
    `</I>`,
  ].join("\n");
}

function keyFor(ctx: SerializerContext, kind: BuilderKind, name: string, resourceId: string) {
  const key = ctx.ids.generateResourceKey({
    namespace: ctx.namespace,
    kind,
    name,
    type: TYPE_TUNING,
    group: GROUP_DEFAULT,
  });
  ctx.ids.reserveKey(key, resourceId);
  return key;
}

function stringFor(
  ctx: SerializerContext,
  kind: BuilderKind,
  name: string,
  field: string,
  value: string,
) {
  const key = localizationKey(ctx.namespace, kind, name, field);
  return { key, value, ref: `0x${key}` };
}

/* ------------------------------ career ------------------------------- */

const AGE_FLAG: Record<string, string> = {
  teen: "TEEN",
  "young-adult": "YOUNGADULT",
  adult: "ADULT",
  elder: "ELDER",
};

export const careerSerializer: TuningSerializer<Career> = {
  kind: "career",
  validate(model) {
    const out: ValidationResult[] = [];
    if (!model.name.trim())
      out.push({ severity: "error", code: "CAREER_NO_NAME", message: "Career has no name.", fieldPath: "name" });
    if (!model.internalId?.trim())
      out.push({ severity: "error", code: "CAREER_NO_ID", message: `Career "${model.name}" has no internal id.`, fieldPath: "internalId" });
    if (!model.branches.length)
      out.push({ severity: "error", code: "CAREER_NO_BRANCH", message: `Career "${model.name}" has no branches.`, fieldPath: "branches" });
    if (!model.description.trim())
      out.push({ severity: "warning", code: "CAREER_NO_DESCRIPTION", message: `Career "${model.name}" has no description.`, fieldPath: "description" });
    for (const branch of model.branches) {
      if (!branch.levels.length)
        out.push({ severity: "error", code: "BRANCH_NO_LEVELS", message: `Branch "${branch.name}" has no levels.` });
      const ranks = new Set<number>();
      for (const level of branch.levels) {
        if (ranks.has(level.rank))
          out.push({ severity: "error", code: "DUPLICATE_RANK", message: `Branch "${branch.name}" has two levels at rank ${level.rank}.` });
        ranks.add(level.rank);
        if (!level.title.trim())
          out.push({ severity: "error", code: "LEVEL_NO_TITLE", message: `Rank ${level.rank} of "${branch.name}" has no title.` });
        if (level.salary < 0)
          out.push({ severity: "error", code: "LEVEL_BAD_SALARY", message: `Rank ${level.rank} of "${branch.name}" has a negative salary.` });
      }
    }
    return out;
  },
  serialize(model, ctx) {
    const base = model.internalId?.trim() || slug(model.name);
    const out: SerializedTuningResource[] = [];
    const strings: { key: string; value: string }[] = [];
    const refs: string[] = [];

    const nameStr = stringFor(ctx, "career", base, "name", model.name);
    const descStr = stringFor(ctx, "career", base, "description", model.description);
    strings.push({ key: nameStr.key, value: nameStr.value }, { key: descStr.key, value: descStr.value });
    refs.push(nameStr.ref, descStr.ref);

    const trackRefs: string[] = [];
    for (const branch of model.branches) {
      const track = serializeTrack(model, branch, ctx);
      out.push(...track.resources);
      strings.push(...track.strings);
      refs.push(...track.refs);
      trackRefs.push(BigInt("0x" + track.trackKey.instance).toString());
    }

    const resourceId = `career:${model.id}`;
    const key = keyFor(ctx, "career", base, resourceId);
    const tuningName = `${ctx.namespace}_${base}`;
    const body = [
      tunable("career_name", nameStr.ref),
      tunable("career_description", descStr.ref),
      tunable("career_category", model.careerType === "part-time" ? "PART_TIME" : "STANDARD"),
      list("available_for_ages", model.ageGates.map((a) => AGE_FLAG[a] ?? "ADULT")),
      list("career_tracks", trackRefs),
      model.iconAssetId ? tunable("icon_asset", model.iconAssetId) : "",
    ];
    out.push({
      resourceId,
      kind: "career",
      key,
      tuningName,
      className: "Career",
      modulePath: "careers.career_tuning",
      tuningType: "career",
      xml: doc("Career", key.instance, "careers.career_tuning", tuningName, "career", body),
      stringRefs: [nameStr.ref, descStr.ref],
      strings: [
        { key: nameStr.key, value: nameStr.value },
        { key: descStr.key, value: descStr.value },
      ],
    });
    return out;
  },
};

function serializeTrack(career: Career, branch: CareerBranch, ctx: SerializerContext) {
  const base = `${career.internalId?.trim() || slug(career.name)}_${slug(branch.name)}`;
  const resources: SerializedTuningResource[] = [];
  const strings: { key: string; value: string }[] = [];
  const refs: string[] = [];

  const levelRefs: string[] = [];
  for (const level of [...branch.levels].sort((a, b) => a.rank - b.rank)) {
    const r = serializeLevel(career, branch, level, ctx);
    resources.push(r);
    strings.push(...r.strings);
    refs.push(...r.stringRefs);
    levelRefs.push(BigInt("0x" + r.key.instance).toString());
  }

  const nameStr = stringFor(ctx, "career_track", base, "name", branch.name);
  const descStr = stringFor(ctx, "career_track", base, "description", branch.description);
  strings.push({ key: nameStr.key, value: nameStr.value }, { key: descStr.key, value: descStr.value });
  refs.push(nameStr.ref, descStr.ref);

  const resourceId = `career_track:${branch.id}`;
  const trackKey = keyFor(ctx, "career_track", base, resourceId);
  const tuningName = `${ctx.namespace}_${base}`;
  const body = [
    tunable("track_name", nameStr.ref),
    tunable("track_description", descStr.ref),
    list("career_levels", levelRefs),
    branch.rewardTraitId ? tunable("reward_trait", branch.rewardTraitId) : "",
  ];
  resources.push({
    resourceId,
    kind: "career_track",
    key: trackKey,
    tuningName,
    className: "CareerTrack",
    modulePath: "careers.career_tuning",
    tuningType: "career_track",
    xml: doc("CareerTrack", trackKey.instance, "careers.career_tuning", tuningName, "career_track", body),
    stringRefs: [nameStr.ref, descStr.ref],
    strings: [
      { key: nameStr.key, value: nameStr.value },
      { key: descStr.key, value: descStr.value },
    ],
  });
  return { resources, strings, refs, trackKey };
}

const DAY_FLAG: Record<string, string> = {
  mon: "MONDAY", tue: "TUESDAY", wed: "WEDNESDAY", thu: "THURSDAY",
  fri: "FRIDAY", sat: "SATURDAY", sun: "SUNDAY",
};

function hoursFrom(time: string) {
  const [h, m] = time.split(":").map((n) => Number(n));
  return Number.isFinite(h) ? (h ?? 0) + (m ?? 0) / 60 : 9;
}

function serializeLevel(
  career: Career,
  branch: CareerBranch,
  level: CareerLevel,
  ctx: SerializerContext,
): SerializedTuningResource {
  const base = `${career.internalId?.trim() || slug(career.name)}_${slug(branch.name)}_${level.rank}`;
  const titleStr = stringFor(ctx, "career_level", base, "title", level.title);
  const resourceId = `career_level:${level.id}`;
  const key = keyFor(ctx, "career_level", base, resourceId);
  const tuningName = `${ctx.namespace}_${base}`;
  const start = hoursFrom(level.workStart);
  const end = hoursFrom(level.workEnd);
  const body = [
    tunable("level_name", titleStr.ref),
    tunable("level", level.rank),
    tunable("simoleons_per_hour", Math.max(0, Math.round(level.salary / Math.max(1, end - start)))),
    tunable("pay_per_shift", level.salary),
    tunable("work_start_time", start),
    tunable("work_end_time", end),
    list("work_days", level.workDays.map((d) => DAY_FLAG[d] ?? "MONDAY")),
    list("objectives", level.objectives),
    list("promotion_perks", level.perks),
    level.uniformMasculine ? tunable("uniform_masculine", level.uniformMasculine) : "",
    level.uniformFeminine ? tunable("uniform_feminine", level.uniformFeminine) : "",
  ];
  return {
    resourceId,
    kind: "career_level",
    key,
    tuningName,
    className: "CareerLevel",
    modulePath: "careers.career_tuning",
    tuningType: "career_level",
    xml: doc("CareerLevel", key.instance, "careers.career_tuning", tuningName, "career_level", body),
    stringRefs: [titleStr.ref],
    strings: [{ key: titleStr.key, value: titleStr.value }],
  };
}

/* ------------------------------- trait ------------------------------- */

export const traitSerializer: TuningSerializer<Trait> = {
  kind: "trait",
  validate(model) {
    const out: ValidationResult[] = [];
    if (!model.name.trim())
      out.push({ severity: "error", code: "TRAIT_NO_NAME", message: "Trait has no name.", fieldPath: "name" });
    if (!model.internalId?.trim())
      out.push({ severity: "error", code: "TRAIT_NO_ID", message: `Trait "${model.name}" has no internal id.`, fieldPath: "internalId" });
    if (!model.description.trim())
      out.push({ severity: "warning", code: "TRAIT_NO_DESCRIPTION", message: `Trait "${model.name}" has no description.` });
    if (!model.ageGates.length)
      out.push({ severity: "warning", code: "TRAIT_NO_AGES", message: `Trait "${model.name}" is not available to any age.` });
    for (const buff of model.buffs) {
      if (!buff.name.trim())
        out.push({ severity: "error", code: "BUFF_NO_NAME", message: `A moodlet on "${model.name}" has no name.` });
      if (buff.durationHours < 0)
        out.push({ severity: "error", code: "BUFF_BAD_DURATION", message: `Moodlet "${buff.name}" has a negative duration.` });
    }
    return out;
  },
  serialize(model, ctx) {
    const base = model.internalId?.trim() || slug(model.name);
    const out: SerializedTuningResource[] = [];
    const buffRefs: string[] = [];
    for (const buff of model.buffs) {
      const r = serializeBuff(model, buff, ctx);
      out.push(r);
      buffRefs.push(BigInt("0x" + r.key.instance).toString());
    }

    const nameStr = stringFor(ctx, "trait", base, "name", model.name);
    const descStr = stringFor(ctx, "trait", base, "description", model.description);
    const resourceId = `trait:${model.id}`;
    const key = keyFor(ctx, "trait", base, resourceId);
    const tuningName = `${ctx.namespace}_${base}`;
    const body = [
      tunable("display_name", nameStr.ref),
      tunable("trait_description", descStr.ref),
      tunable("trait_type", model.category === "personality" ? "PERSONALITY" : "GAMEPLAY"),
      list("ages", model.ageGates.map((a) => AGE_FLAG[a] ?? "ADULT")),
      list("excluded_ages", model.blockedAges.map((a) => AGE_FLAG[a] ?? "ADULT")),
      list("buffs_add_on_add", buffRefs),
      list("social_interactions", model.socialInteractions),
      model.buffReplacements.length
        ? [
            `  <L n="buff_replacements">`,
            ...model.buffReplacements.map(
              (r) => `    <U><T n="from">${escapeXml(r.from)}</T><T n="to">${escapeXml(r.to)}</T></U>`,
            ),
            `  </L>`,
          ].join("\n")
        : "",
      model.commodityWeights.length
        ? [
            `  <L n="commodity_weights">`,
            ...model.commodityWeights.map(
              (c) => `    <U><T n="commodity">${escapeXml(c.commodity)}</T><T n="weight">${c.weight}</T></U>`,
            ),
            `  </L>`,
          ].join("\n")
        : "",
      model.voiceEffect ? tunable("voice_effect", model.voiceEffect) : "",
    ];
    out.push({
      resourceId,
      kind: "trait",
      key,
      tuningName,
      className: "Trait",
      modulePath: "traits.traits",
      tuningType: "trait",
      xml: doc("Trait", key.instance, "traits.traits", tuningName, "trait", body),
      stringRefs: [nameStr.ref, descStr.ref],
      strings: [
        { key: nameStr.key, value: nameStr.value },
        { key: descStr.key, value: descStr.value },
      ],
    });
    return out;
  },
};

function serializeBuff(trait: Trait, buff: Buff, ctx: SerializerContext): SerializedTuningResource {
  const base = `${trait.internalId?.trim() || slug(trait.name)}_${slug(buff.name)}`;
  const nameStr = stringFor(ctx, "buff", base, "name", buff.name);
  const descStr = stringFor(ctx, "buff", base, "description", buff.description);
  const resourceId = `buff:${buff.id}`;
  const key = keyFor(ctx, "buff", base, resourceId);
  const tuningName = `${ctx.namespace}_${base}`;
  const rules = buff.rules ?? [];
  const body = [
    tunable("buff_name", nameStr.ref),
    tunable("buff_description", descStr.ref),
    tunable("mood_type", buff.emotion.toUpperCase()),
    tunable("mood_weight", buff.weight),
    tunable("timeout", Math.round(buff.durationHours * 60)),
    tunable("visible", true),
    rules.length
      ? [
          `  <L n="application_rules">`,
          ...rules.map((r) =>
            [
              `    <U>`,
              `      <T n="trigger">${escapeXml(r.trigger)}</T>`,
              r.condition ? `      <T n="condition">${escapeXml(r.condition)}</T>` : "",
              `      <T n="chance">${r.chance}</T>`,
              `      <T n="cooldown_hours">${r.cooldownHours}</T>`,
              r.note ? `      <T n="note">${escapeXml(r.note)}</T>` : "",
              `    </U>`,
            ]
              .filter(Boolean)
              .join("\n"),
          ),
          `  </L>`,
        ].join("\n")
      : "",
  ];
  return {
    resourceId,
    kind: "buff",
    key,
    tuningName,
    className: "Buff",
    modulePath: "buffs.buff",
    tuningType: "buff",
    xml: doc("Buff", key.instance, "buffs.buff", tuningName, "buff", body),
    stringRefs: [nameStr.ref, descStr.ref],
    strings: [
      { key: nameStr.key, value: nameStr.value },
      { key: descStr.key, value: descStr.value },
    ],
  };
}

/* ---------------------------- aspiration ----------------------------- */

export const aspirationSerializer: TuningSerializer<Aspiration> = {
  kind: "aspiration",
  validate(model) {
    const out: ValidationResult[] = [];
    if (!model.name.trim())
      out.push({ severity: "error", code: "ASP_NO_NAME", message: "Aspiration has no name." });
    if (!model.internalId?.trim())
      out.push({ severity: "error", code: "ASP_NO_ID", message: `Aspiration "${model.name}" has no internal id.` });
    if (!model.milestones.length)
      out.push({ severity: "error", code: "ASP_NO_MILESTONES", message: `Aspiration "${model.name}" has no milestones.` });
    return out;
  },
  serialize(model, ctx) {
    const base = model.internalId?.trim() || slug(model.name);
    const out: SerializedTuningResource[] = [];
    const milestoneRefs: string[] = [];

    for (const milestone of [...model.milestones].sort((a, b) => a.order - b.order)) {
      const mBase = `${base}_${slug(milestone.name)}`;
      const mName = stringFor(ctx, "milestone", mBase, "name", milestone.name);
      const mDesc = stringFor(ctx, "milestone", mBase, "description", milestone.description);
      const resourceId = `milestone:${milestone.id}`;
      const key = keyFor(ctx, "milestone", mBase, resourceId);
      const tuningName = `${ctx.namespace}_${mBase}`;
      const body = [
        tunable("display_text", mName.ref),
        tunable("description_text", mDesc.ref),
        tunable("milestone_order", milestone.order),
        list("objectives", milestone.objectives),
      ];
      out.push({
        resourceId,
        kind: "milestone",
        key,
        tuningName,
        className: "Objective",
        modulePath: "aspirations.aspiration_tuning",
        tuningType: "aspiration",
        xml: doc("Objective", key.instance, "aspirations.aspiration_tuning", tuningName, "aspiration", body),
        stringRefs: [mName.ref, mDesc.ref],
        strings: [
          { key: mName.key, value: mName.value },
          { key: mDesc.key, value: mDesc.value },
        ],
      });
      milestoneRefs.push(BigInt("0x" + key.instance).toString());
    }

    const nameStr = stringFor(ctx, "aspiration", base, "name", model.name);
    const descStr = stringFor(ctx, "aspiration", base, "description", model.description);
    const resourceId = `aspiration:${model.id}`;
    const key = keyFor(ctx, "aspiration", base, resourceId);
    const tuningName = `${ctx.namespace}_${base}`;
    const body = [
      tunable("display_name", nameStr.ref),
      tunable("description", descStr.ref),
      tunable("category", model.category || "Other"),
      list("objectives", milestoneRefs),
      model.rewardTraitId ? tunable("reward_trait", model.rewardTraitId) : "",
    ];
    out.push({
      resourceId,
      kind: "aspiration",
      key,
      tuningName,
      className: "AspirationTrack",
      modulePath: "aspirations.aspiration_tuning",
      tuningType: "aspiration",
      xml: doc("AspirationTrack", key.instance, "aspirations.aspiration_tuning", tuningName, "aspiration", body),
      stringRefs: [nameStr.ref, descStr.ref],
      strings: [
        { key: nameStr.key, value: nameStr.value },
        { key: descStr.key, value: descStr.value },
      ],
    });
    return out;
  },
};

export const SERIALIZERS = {
  career: careerSerializer,
  trait: traitSerializer,
  aspiration: aspirationSerializer,
} as const;
