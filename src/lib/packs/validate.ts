/**
 * Structural validation for Pack Mechanics modules.
 * Pure functions — no React, no store access. Returns field-addressable
 * issues so the builders can show inline errors and a summary panel.
 */

import type {
  ClubModuleData,
  ConditionGroup,
  ConditionNode,
  LegacyModuleData,
  LocalizedString,
  PackMechanicModuleData,
  PackModule,
  ResourceRef,
  RoyaltyModuleData,
} from "./types";

export interface PackIssue {
  id: string;
  level: "error" | "warning" | "info";
  /** Dot path used to highlight the offending field. */
  path: string;
  message: string;
}

let seq = 0;
const iss = (level: PackIssue["level"], path: string, message: string): PackIssue =>
  ({ id: `pi-${++seq}`, level, path, message });

function refOk(ref?: ResourceRef): boolean {
  if (!ref) return false;
  if (ref.source === "none") return false;
  if (ref.source === "project" || ref.source === "new") return Boolean(ref.refId);
  if (ref.source === "tuning-id" || ref.source === "instance-id") return Boolean(ref.tuningId?.trim());
  return true;
}

function locIssues(loc: LocalizedString | undefined, path: string, label: string, seen: Map<string, string>): PackIssue[] {
  const out: PackIssue[] = [];
  if (!loc) return out;
  if (loc.text.trim() && !loc.key.trim()) out.push(iss("error", path, `${label}: missing STBL string key.`));
  if (loc.key.trim()) {
    const prev = seen.get(loc.key);
    if (prev && prev !== path) out.push(iss("warning", path, `${label}: duplicate STBL key "${loc.key}".`));
    else seen.set(loc.key, path);
  }
  if (!loc.text.trim() && loc.key.trim()) out.push(iss("warning", path, `${label}: string key has no default English text.`));
  return out;
}

function conditionIssues(g: ConditionGroup | undefined, path: string): PackIssue[] {
  const out: PackIssue[] = [];
  if (!g) return out;
  const walk = (n: ConditionNode, p: string) => {
    if (n.type === "group") {
      if (n.logic === "min-match" && (n.minMatch ?? 0) > n.children.length) {
        out.push(iss("error", p, `Minimum-match of ${n.minMatch} can never be satisfied by ${n.children.length} condition(s).`));
      }
      const leaves = n.children.filter((c): c is Extract<ConditionNode, { type: "leaf" }> => c.type === "leaf");
      if (n.logic === "and") {
        const bySubject = new Map<string, string[]>();
        for (const l of leaves) {
          if (l.operator === "is" || l.operator === "has") {
            const arr = bySubject.get(l.subject) ?? [];
            arr.push(l.value);
            bySubject.set(l.subject, arr);
          }
        }
        for (const [subject, vals] of bySubject) {
          const uniq = new Set(vals.filter(Boolean));
          if ((subject === "age" || subject === "gender" || subject === "species") && uniq.size > 1) {
            out.push(iss("error", p, `Impossible combination: "${subject}" cannot equal ${[...uniq].join(" and ")} at once.`));
          }
        }
      }
      n.children.forEach((c, i) => walk(c, `${p}.${i}`));
    } else {
      if (!n.value.trim() && !refOk(n.ref)) {
        out.push(iss("warning", p, `Condition "${n.subject}" has no value or reference.`));
      }
    }
  };
  walk(g, path);
  return out;
}

export function validatePackModule(mod: PackModule): PackIssue[] {
  seq = 0;
  const out: PackIssue[] = [];
  const keys = new Map<string, string>();

  if (!mod.name.trim()) out.push(iss("error", "name", "Module needs a display name."));
  if (!mod.requiredPack.trim()) out.push(iss("error", "requiredPack", "Missing required pack."));

  if (mod.kind === "club") out.push(...validateClub(mod.data as ClubModuleData, keys));
  if (mod.kind === "royalty") out.push(...validateRoyalty(mod.data as RoyaltyModuleData, keys));
  if (mod.kind === "legacy") out.push(...validateLegacy(mod.data as LegacyModuleData, keys));
  if (mod.kind === "pack") out.push(...validatePack(mod.data as PackMechanicModuleData, keys));

  return out;
}

function validateClub(d: ClubModuleData, keys: Map<string, string>): PackIssue[] {
  const out: PackIssue[] = [];
  if (!d.internalName.trim()) out.push(iss("error", "data.internalName", "Internal module name is required."));
  if (!d.displayName.text.trim()) out.push(iss("error", "data.displayName", "Club display name is required."));
  out.push(...locIssues(d.displayName, "data.displayName", "Display name", keys));
  out.push(...locIssues(d.description, "data.description", "Description", keys));
  if (d.minMembers < 1) out.push(iss("error", "data.minMembers", "Minimum member count must be at least 1."));
  if (d.maxMembers < d.minMembers) out.push(iss("error", "data.maxMembers", "Maximum members must be ≥ minimum members."));
  if (d.maxMembers > 8) out.push(iss("warning", "data.maxMembers", "Get Together supports 8 members without a club-size perk."));
  out.push(...conditionIssues(d.membership, "data.membership"));

  const rankNames = new Set<string>();
  d.ranks.forEach((r, i) => {
    if (!r.name.trim()) out.push(iss("error", `data.ranks.${i}.name`, "Rank needs a name."));
    else if (rankNames.has(r.name.toLowerCase())) out.push(iss("error", `data.ranks.${i}.name`, `Duplicate rank "${r.name}".`));
    else rankNames.add(r.name.toLowerCase());
    out.push(...locIssues(r.description, `data.ranks.${i}.description`, `Rank "${r.name}"`, keys));
  });

  d.activities.forEach((a, i) => {
    if (!a.name.trim()) out.push(iss("error", `data.activities.${i}.name`, "Activity needs a name."));
    if (!refOk(a.interactionRef)) out.push(iss("error", `data.activities.${i}.interactionRef`, `Activity "${a.name || i + 1}" is missing an interaction reference.`));
    out.push(...conditionIssues(a.required, `data.activities.${i}.required`));
    out.push(...conditionIssues(a.excluded, `data.activities.${i}.excluded`));
    out.push(...locIssues(a.tooltip, `data.activities.${i}.tooltip`, "Activity tooltip", keys));
  });

  d.perks.forEach((p, i) => {
    if (!p.name.trim()) out.push(iss("error", `data.perks.${i}.name`, "Perk needs a name."));
    if (p.requiredPerkId && p.requiredPerkId === p.id) out.push(iss("error", `data.perks.${i}.requiredPerkId`, "A perk cannot require itself."));
    if (p.requiredRankId && !d.ranks.some((r) => r.id === p.requiredRankId)) out.push(iss("error", `data.perks.${i}.requiredRankId`, `Perk "${p.name}" points at a deleted rank.`));
    out.push(...locIssues(p.description, `data.perks.${i}.description`, `Perk "${p.name}"`, keys));
  });

  d.gatherings.forEach((g, i) => {
    if (g.rewards.length && !g.goals.length) out.push(iss("warning", `data.gatherings.${i}`, `Gathering "${g.name}" grants rewards with no trigger goal.`));
    if (g.goals.length && !g.rewards.length) out.push(iss("info", `data.gatherings.${i}`, `Gathering "${g.name}" has goals but no outcome.`));
  });

  return out;
}

function validateRoyalty(d: RoyaltyModuleData, keys: Map<string, string>): PackIssue[] {
  const out: PackIssue[] = [];
  if (!d.systemName.trim()) out.push(iss("error", "data.systemName", "System name is required."));
  out.push(...locIssues(d.displayName, "data.displayName", "System name", keys));
  out.push(...locIssues(d.description, "data.description", "Description", keys));

  const titleNames = new Set<string>();
  d.titles.forEach((t, i) => {
    const label = t.neutralName.text || t.masculineName.text || `Title ${i + 1}`;
    if (!t.neutralName.text.trim() && !t.masculineName.text.trim() && !t.feminineName.text.trim()) {
      out.push(iss("error", `data.titles.${i}`, "Title needs at least one display name."));
    }
    if (titleNames.has(label.toLowerCase())) out.push(iss("error", `data.titles.${i}`, `Duplicate title "${label}".`));
    else titleNames.add(label.toLowerCase());
    if (t.parentTitleId && !d.titles.some((x) => x.id === t.parentTitleId)) {
      out.push(iss("error", `data.titles.${i}.parentTitleId`, `Title "${label}" references a deleted parent title.`));
    }
    ["masculineName", "feminineName", "neutralName", "description"].forEach((k) =>
      out.push(...locIssues((t as unknown as Record<string, LocalizedString>)[k], `data.titles.${i}.${k}`, label, keys)));
  });

  // circular parent chains
  d.titles.forEach((t, i) => {
    const seen = new Set<string>([t.id]);
    let cur = t.parentTitleId;
    while (cur) {
      if (seen.has(cur)) { out.push(iss("error", `data.titles.${i}.parentTitleId`, "Circular title hierarchy detected.")); break; }
      seen.add(cur);
      cur = d.titles.find((x) => x.id === cur)?.parentTitleId;
    }
  });

  if (d.titles.length && !d.succession.length) {
    out.push(iss("error", "data.succession", "Titles exist but no succession rule is defined."));
  }
  const prios = new Set<number>();
  d.succession.forEach((r, i) => {
    if (prios.has(r.priority)) out.push(iss("warning", `data.succession.${i}.priority`, `Duplicate succession priority ${r.priority}.`));
    prios.add(r.priority);
    out.push(...conditionIssues(r.eligibility, `data.succession.${i}.eligibility`));
    out.push(...conditionIssues(r.exclusions, `data.succession.${i}.exclusions`));
  });

  d.courtRoles.forEach((r, i) => {
    if (!r.name.trim()) out.push(iss("error", `data.courtRoles.${i}.name`, "Court role needs a name."));
    if (r.requiredTitleId && !d.titles.some((t) => t.id === r.requiredTitleId)) {
      out.push(iss("error", `data.courtRoles.${i}.requiredTitleId`, `Court role "${r.name}" references a deleted title.`));
    }
  });

  d.interactions.forEach((x, i) => {
    if (!refOk(x.ref)) out.push(iss("error", `data.interactions.${i}.ref`, `Royal interaction "${x.name}" is missing an interaction reference.`));
  });

  d.events.forEach((e, i) => {
    if (!e.participants.length) out.push(iss("error", `data.events.${i}.participants`, `Event "${e.name}" has an empty participant list.`));
    if (e.loot.length && e.triggers.children.length === 0) out.push(iss("warning", `data.events.${i}.triggers`, `Event "${e.name}" grants rewards with no trigger condition.`));
    if (e.triggers.children.length && !e.loot.length && e.notification.style === "none") {
      out.push(iss("warning", `data.events.${i}`, `Event "${e.name}" has a trigger but no outcome.`));
    }
    out.push(...conditionIssues(e.triggers, `data.events.${i}.triggers`));
    out.push(...locIssues(e.notification.title, `data.events.${i}.notification.title`, `Event "${e.name}" title`, keys));
    out.push(...locIssues(e.notification.body, `data.events.${i}.notification.body`, `Event "${e.name}" body`, keys));
  });

  return out;
}

function validateLegacy(d: LegacyModuleData, keys: Map<string, string>): PackIssue[] {
  const out: PackIssue[] = [];
  if (!d.legacyName.trim()) out.push(iss("error", "data.legacyName", "Legacy name is required."));
  if (!d.dynastyName.trim()) out.push(iss("warning", "data.dynastyName", "Dynasty name is empty."));
  out.push(...locIssues(d.description, "data.description", "Description", keys));
  out.push(...locIssues(d.motto, "data.motto", "Motto", keys));

  if (!d.heirRules.length) out.push(iss("error", "data.heirRules", "No heir selection rule defined."));
  if (d.maxGenerations < d.startingGeneration) out.push(iss("error", "data.maxGenerations", "Maximum generations must be ≥ starting generation."));

  const gens = new Set<number>();
  d.generations.forEach((g, i) => {
    if (gens.has(g.number)) out.push(iss("error", `data.generations.${i}.number`, `Duplicate generation number ${g.number}.`));
    gens.add(g.number);
    if (!g.name.trim()) out.push(iss("error", `data.generations.${i}.name`, "Generation needs a name."));
    if (g.completionRewards.length && !g.goals.length) out.push(iss("warning", `data.generations.${i}`, `Generation "${g.name}" grants rewards with no goal.`));
    out.push(...conditionIssues(g.failConditions, `data.generations.${i}.failConditions`));
    out.push(...locIssues(g.description, `data.generations.${i}.description`, `Generation "${g.name}"`, keys));
    out.push(...locIssues(g.notification.title, `data.generations.${i}.notification.title`, `Generation "${g.name}" notification`, keys));
  });

  d.bloodlines.forEach((b, i) => {
    if (!b.name.trim()) out.push(iss("error", `data.bloodlines.${i}.name`, "Bloodline needs a name."));
    if (b.inheritanceChance < 0 || b.inheritanceChance > 100) out.push(iss("error", `data.bloodlines.${i}.inheritanceChance`, "Inheritance chance must be 0-100."));
    out.push(...locIssues(b.description, `data.bloodlines.${i}.description`, `Bloodline "${b.name}"`, keys));
  });

  d.scoring.forEach((s, i) => {
    if (!s.event.trim()) out.push(iss("error", `data.scoring.${i}.event`, "Scoring rule needs an event."));
    out.push(...conditionIssues(s.conditions, `data.scoring.${i}.conditions`));
  });

  return out;
}

function validatePack(d: PackMechanicModuleData, keys: Map<string, string>): PackIssue[] {
  const out: PackIssue[] = [];
  if (!d.packKey) out.push(iss("error", "data.packKey", "Select a pack or dependency."));
  if (!d.mechanicCategory) out.push(iss("error", "data.mechanicCategory", "Select a mechanic category."));
  if (d.conflictWarnings.trim()) out.push(iss("warning", "data.conflictWarnings", d.conflictWarnings.trim()));
  d.requiredTuningRefs.forEach((r, i) => {
    if (!refOk(r)) out.push(iss("error", `data.requiredTuningRefs.${i}`, "Required tuning reference is unresolved."));
  });
  d.rules.forEach((r, i) => {
    if (!r.name.trim()) out.push(iss("error", `data.rules.${i}.name`, "Rule needs a name."));
    if (r.loot.length && r.conditions.children.length === 0) out.push(iss("warning", `data.rules.${i}`, `Rule "${r.name}" has rewards but no trigger.`));
    if (r.conditions.children.length && !r.loot.length && r.notification.style === "none") out.push(iss("warning", `data.rules.${i}`, `Rule "${r.name}" has a trigger but no outcome.`));
    out.push(...conditionIssues(r.conditions, `data.rules.${i}.conditions`));
    out.push(...locIssues(r.description, `data.rules.${i}.description`, `Rule "${r.name}"`, keys));
    out.push(...locIssues(r.notification.title, `data.rules.${i}.notification.title`, `Rule "${r.name}" notification`, keys));
  });
  return out;
}

/** Count of configured rules shown on dashboard cards. */
export function countRules(mod: PackModule): number {
  const d = mod.data as unknown as Record<string, unknown>;
  const arrays = ["activities", "perks", "ranks", "roles", "uniforms", "gatherings",
    "titles", "succession", "courtRoles", "interactions", "events",
    "generations", "heirRules", "bloodlines", "scoring", "rules"];
  return arrays.reduce((n, k) => n + (Array.isArray(d[k]) ? (d[k] as unknown[]).length : 0), 0);
}
