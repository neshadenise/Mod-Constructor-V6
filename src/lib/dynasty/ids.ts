/**
 * Dynasty identity + EA safety.
 *
 * Two jobs, deliberately in one place because they are the same question from
 * different directions: which ids do we mint, and which ids are we forbidden
 * to touch. Every custom resource gets a fresh instance derived from
 * `namespace:internalName`, so nothing can ever land on an EA instance.
 */

import { GROUP_DEFAULT, TYPE_STBL, TYPE_TUNING, fnv1a32, fnv1a64, hex32, hex64, withHighBit } from "@/lib/modexport/ids";
import type { DynastyDoc, Requirement } from "./schema";
import { MODE_CAPABILITY } from "./schema";

/* ------------------------------------------------------------ EA registry */

/**
 * EA dynasty resources this builder may reference but must never emit.
 * Instance ids are the published Royalty & Legacy dynasty tuning values used
 * by the framework's core roles and statistics.
 */
export const EA_PROTECTED = [
  { key: "dynasty.DynastyHead", label: "Dynasty Head role", kind: "Trait" },
  { key: "dynasty.Heir", label: "Heir role", kind: "Trait" },
  { key: "dynasty.Outcast", label: "Outcast role", kind: "Trait" },
  { key: "dynasty.DynastyMember", label: "Dynasty Member trait", kind: "Trait" },
  { key: "dynasty.PrestigeStatistic", label: "Dynasty Prestige statistic", kind: "Statistic" },
  { key: "dynasty.DynastyValues", label: "Dynasty Values", kind: "Snippet" },
  { key: "dynasty.CreateDynastyInteraction", label: "Create Dynasty interaction", kind: "Interaction" },
  { key: "dynasty.NameHeirInteraction", label: "Name Heir interaction", kind: "Interaction" },
  { key: "dynasty.OutcastInteraction", label: "Make Outcast interaction", kind: "Interaction" },
  { key: "dynasty.DynastyPanel", label: "Dynasty UI panel", kind: "Snippet" },
  { key: "dynasty.MembershipRules", label: "Global membership restrictions", kind: "Snippet" },
  { key: "dynasty.SuccessionRules", label: "Global succession behavior", kind: "Snippet" },
] as const;

export type EaProtectedKey = (typeof EA_PROTECTED)[number]["key"];

/** Kinds of modification that would damage the stock dynasty system. */
export const FORBIDDEN_OPERATIONS = [
  "override_ea_role", "replace_ea_interaction", "replace_ea_values",
  "change_global_membership", "change_global_succession", "change_global_ui",
  "affect_external_dynasties", "reuse_ea_instance_id", "force_custom_settings",
] as const;
export type ForbiddenOperation = (typeof FORBIDDEN_OPERATIONS)[number];

export const FORBIDDEN_OPERATION_LABEL: Record<ForbiddenOperation, string> = {
  override_ea_role: "Override an EA dynasty role",
  replace_ea_interaction: "Replace a default dynasty interaction",
  replace_ea_values: "Replace the default dynasty values",
  change_global_membership: "Change global membership restrictions",
  change_global_succession: "Change global succession behavior",
  change_global_ui: "Change global dynasty UI behavior",
  affect_external_dynasties: "Change dynasties created outside this mod",
  reuse_ea_instance_id: "Reuse an EA instance id for a custom resource",
  force_custom_settings: "Force all dynasties to use custom settings",
};

/* --------------------------------------------------------------- key mint */

export interface GeneratedKey {
  label: string;
  tuningName: string;
  type: string;
  group: string;
  decimal: string;
  hex: string;
  /** Which resource family this key belongs to, for the export manifest. */
  category:
    | "dynasty" | "role" | "membership" | "trait" | "buff" | "statistic" | "loot"
    | "interaction" | "event" | "situation" | "notification" | "relbit" | "string";
}

export const tuningNameFor = (namespace: string, internalName: string) =>
  `${(namespace || "MyMods").trim().replace(/[^A-Za-z0-9_.]/g, "")}:${(internalName || "Dynasty_Untitled").trim()}`;

function mint(label: string, tuningName: string, category: GeneratedKey["category"]): GeneratedKey {
  const value = withHighBit(fnv1a64(tuningName));
  return {
    label, tuningName, type: TYPE_TUNING, group: GROUP_DEFAULT,
    decimal: value.toString(10), hex: hex64(value), category,
  };
}

const stringKey = (seed: string) => hex32(fnv1a32(seed));

export interface DynastyKeys {
  root: GeneratedKey;
  roles: GeneratedKey[];
  membershipTypes: GeneratedKey[];
  traits: GeneratedKey[];
  statistics: GeneratedKey[];
  events: GeneratedKey[];
  scandals: GeneratedKey[];
  relations: GeneratedKey[];
  interactions: GeneratedKey[];
  strings: { field: string; key: string; text: string }[];
  all: GeneratedKey[];
}

export function computeDynastyKeys(doc: DynastyDoc): DynastyKeys {
  const ns = doc.identity.namespace;
  const base = tuningNameFor(ns, doc.identity.internalName);
  const root = mint("Dynasty definition", base, "dynasty");
  if (doc.ids.manual && doc.ids.tuningDecimal) {
    root.decimal = doc.ids.tuningDecimal;
    root.hex = doc.ids.tuningHex;
  }

  const roles = doc.hierarchy.roles.map((r) =>
    mint(`Role: ${r.displayName}`, `${base}:role:${r.internalName}`, "role"),
  );
  const roleTraits = doc.hierarchy.roles.map((r) =>
    mint(`Role trait: ${r.displayName}`, `${base}:role:${r.internalName}:trait`, "trait"),
  );
  const membershipTypes = doc.membershipTypes.map((m) =>
    mint(`Membership: ${m.displayName}`, `${base}:membership:${m.internalName}`, "membership"),
  );
  const membershipTraits = doc.membershipTypes.map((m) =>
    mint(`Membership trait: ${m.displayName}`, `${base}:membership:${m.internalName}:trait`, "trait"),
  );
  const customTraits = doc.traits.map((t) =>
    mint(`Trait: ${t.displayName}`, `${base}:trait:${t.uuid}`, "trait"),
  );
  const bloodTraits = doc.bloodline.enabled
    ? [
        mint("Founder bloodline trait", `${base}:bloodline:founder`, "trait"),
        mint("Descendant bloodline trait", `${base}:bloodline:descendant`, "trait"),
      ]
    : [];

  const statistics = [
    ...(doc.prestige.enabled ? [mint(`${doc.prestige.name} statistic`, `${base}:stat:prestige`, "statistic")] : []),
    ...(doc.unity.enabled ? [mint(`${doc.unity.name} statistic`, `${base}:stat:unity`, "statistic")] : []),
    ...(doc.funds.enabled ? [mint(`${doc.funds.name} statistic`, `${base}:stat:funds`, "statistic")] : []),
  ];

  const events = doc.events.map((e) => mint(`Event: ${e.name}`, `${base}:event:${e.uuid}`, "event"));
  const scandals = doc.scandals.map((s) => mint(`Scandal: ${s.name}`, `${base}:scandal:${s.uuid}`, "notification"));
  const relations = doc.relations.map((r) => mint(`Relation: ${r.displayName}`, `${base}:relation:${r.uuid}`, "relbit"));
  // Only interactions we actually own get an id; EA references keep theirs.
  const interactions = doc.interactions
    .filter((i) => i.source !== "ea_reference")
    .map((i) => mint(`Interaction: ${i.label}`, `${base}:interaction:${i.action}`, "interaction"));

  const strings: { field: string; key: string; text: string }[] = [
    { field: "name", key: stringKey(`${base}:name`), text: doc.identity.displayName },
    { field: "description", key: stringKey(`${base}:description`), text: doc.identity.description },
    { field: "motto", key: stringKey(`${base}:motto`), text: doc.identity.motto },
    ...Object.entries(doc.terms).map(([k, v]) => ({
      field: `term.${k}`, key: stringKey(`${base}:term:${k}`), text: String(v),
    })),
    ...doc.hierarchy.roles.map((r) => ({
      field: `role.${r.internalName}`, key: stringKey(`${base}:role:${r.internalName}:name`), text: r.displayName,
    })),
    ...doc.membershipTypes.map((m) => ({
      field: `membership.${m.internalName}`, key: stringKey(`${base}:membership:${m.internalName}:name`), text: m.displayName,
    })),
    ...doc.values.map((v) => ({
      field: `value.${v.uuid}`, key: stringKey(`${base}:value:${v.uuid}`), text: v.name,
    })),
  ];

  const traits = [...roleTraits, ...membershipTraits, ...customTraits, ...bloodTraits];
  const all = [root, ...roles, ...membershipTypes, ...traits, ...statistics, ...events, ...scandals, ...relations, ...interactions];

  return { root, roles, membershipTypes, traits, statistics, events, scandals, relations, interactions, strings, all };
}

/** Duplicate instance ids inside one dynasty. */
export function internalCollisions(doc: DynastyDoc): { decimal: string; labels: string[] }[] {
  const byDecimal = new Map<string, string[]>();
  for (const k of computeDynastyKeys(doc).all) {
    byDecimal.set(k.decimal, [...(byDecimal.get(k.decimal) ?? []), k.label]);
  }
  return [...byDecimal.entries()]
    .filter(([, labels]) => labels.length > 1)
    .map(([decimal, labels]) => ({ decimal, labels }));
}

/** Instance ids shared with another dynasty in the same project. */
export function crossCollisions(doc: DynastyDoc, others: DynastyDoc[]) {
  const mine = computeDynastyKeys(doc).all;
  const out: { decimal: string; label: string; other: string }[] = [];
  for (const other of others) {
    if (other.uuid === doc.uuid) continue;
    const theirs = new Map(computeDynastyKeys(other).all.map((k) => [k.decimal, k.label]));
    for (const k of mine) {
      const hit = theirs.get(k.decimal);
      if (hit) out.push({ decimal: k.decimal, label: k.label, other: other.identity.typeName });
    }
  }
  return out;
}

/* ----------------------------------------------------------- EA safety     */

export interface SafetyIssue {
  operation: ForbiddenOperation;
  detail: string;
  where: string;
}

/**
 * Static audit of a document against the "never touch EA" contract. The export
 * pipeline refuses to run while this returns anything.
 */
export function auditEaSafety(doc: DynastyDoc): SafetyIssue[] {
  const issues: SafetyIssue[] = [];
  const protectedKeys = new Set<string>(EA_PROTECTED.map((p) => p.key));

  // 1. Nothing we mint may claim an EA tuning name.
  for (const key of computeDynastyKeys(doc).all) {
    if (protectedKeys.has(key.tuningName)) {
      issues.push({
        operation: "reuse_ea_instance_id",
        detail: `${key.label} would be emitted with the EA tuning name ${key.tuningName}.`,
        where: "identity",
      });
    }
  }

  // 2. EA resources may be referenced, never redefined. A project-source ref
  //    pointing at a protected key means the creator cloned it in place.
  const checkRef = (label: string, where: string, tuningName?: string, source?: string) => {
    if (tuningName && protectedKeys.has(tuningName) && source === "project") {
      issues.push({
        operation: "override_ea_role",
        detail: `${label} redefines the EA resource ${tuningName} as a project resource.`,
        where,
      });
    }
  };
  for (const r of doc.hierarchy.roles) {
    checkRef(`Role “${r.displayName}” trait`, "roles", r.trait.tuningName, r.trait.source);
  }
  for (const i of doc.interactions) {
    if (i.source === "ea_reference" && i.ref.source === "project") {
      issues.push({
        operation: "replace_ea_interaction",
        detail: `“${i.label}” is marked as an EA reference but points at a project resource.`,
        where: "interactions",
      });
    }
  }

  // 3. The custom UI must never claim the stock panel.
  if (doc.visual.overrideEaPanel) {
    issues.push({
      operation: "change_global_ui",
      detail: "The custom panel is configured to replace the stock dynasty UI.",
      where: "visual",
    });
  }

  // 4. Automation must be scoped to dynasties created from this definition.
  if (doc.autonomy.allowSilentPlayerChanges) {
    issues.push({
      operation: "force_custom_settings",
      detail:
        "Automation is allowed to change player-controlled leadership or membership without asking.",
      where: "autonomy",
    });
  }

  // 5. Dual membership fights EA's one-dynasty-per-Sim rule globally.
  if (doc.membership.allowDualMembership && doc.membership.respectEaSingleDynastyRule === false) {
    issues.push({
      operation: "change_global_membership",
      detail:
        "Dual membership with EA's single-dynasty rule disabled changes membership for every dynasty, not just yours.",
      where: "membership",
    });
  }

  return issues;
}

/* ------------------------------------------------------- requirement calc  */

export interface FeatureRequirement {
  feature: string;
  section: string;
  requirements: Requirement[];
  /** True when the current compatibility mode cannot deliver it. */
  beyondMode: boolean;
}

/** What this document actually needs to run, derived from what it uses. */
export function computeRequirements(doc: DynastyDoc): FeatureRequirement[] {
  const cap = MODE_CAPABILITY[doc.compatMode];
  const out: FeatureRequirement[] = [];
  const add = (feature: string, section: string, requirements: Requirement[]) => {
    out.push({ feature, section, requirements, beyondMode: requirements.some((r) => !cap.includes(r)) });
  };

  add("Dynasty definition and terminology", "identity", ["tuning", "royalty_legacy"]);
  if (doc.hierarchy.roles.length) add("Custom roles and role traits", "roles", ["tuning", "royalty_legacy"]);
  if (doc.hierarchy.connections.length) add("Custom hierarchy connections", "hierarchy", ["tuning", "injector"]);
  if (doc.branches.length) add("Dynasty branches", "branches", ["tuning", "injector"]);
  if (doc.membership.allowNonFamily) add("Non-family recruitment", "membership", ["tuning", "injector"]);
  if (doc.membership.approvalStages.length) add("Approval workflow", "membership", ["injector", "script"]);
  if (doc.prestige.enabled) add("Custom prestige statistic", "prestige", ["tuning", "injector"]);
  if (doc.unity.enabled) add("Unity statistic", "prestige", ["tuning", "injector"]);
  if (doc.funds.enabled) add("Shared funds", "funds", ["injector", "script"]);
  if (doc.conduct.some((c) => c.detection === "interaction_listener"))
    add("Conduct rule detection", "conduct", ["script"]);
  if (doc.scandals.length) add("Scandal system", "scandals", ["script"]);
  if (doc.relations.length) add("Alliances and rivalries", "relations", ["injector", "script"]);
  if (doc.events.length) add("Ceremonies and events", "events", ["tuning", "injector"]);
  if (doc.visual.uiMode === "custom_dialog") add("Custom information panel", "visual", ["script"]);
  if (Object.values(doc.autonomy.matrix).some((m) => Object.values(m).some(Boolean)))
    add("NPC and story progression", "autonomy", ["script"]);
  if (doc.identity.optionalPacks.length) add("Optional pack content", "identity", ["pack"]);

  return out;
}

/** Distinct requirement badges for the whole document. */
export function requirementSummary(doc: DynastyDoc): Requirement[] {
  const set = new Set<Requirement>();
  for (const f of computeRequirements(doc)) for (const r of f.requirements) set.add(r);
  return [...set];
}

export function regenerateIds(doc: DynastyDoc): DynastyDoc {
  const salt = Date.now().toString(36);
  const value = withHighBit(
    fnv1a64(`${tuningNameFor(doc.identity.namespace, doc.identity.internalName)}:${salt}`),
  );
  return {
    ...doc,
    ids: { manual: true, tuningDecimal: value.toString(10), tuningHex: hex64(value), lastGeneratedAt: Date.now() },
    updatedAt: Date.now(),
  };
}

export { TYPE_STBL };
