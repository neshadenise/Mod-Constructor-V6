/**
 * Dynasty validation.
 *
 * Findings are graded by what they actually cost the player:
 *
 *   blocking      — export cannot produce a working mod
 *   likely_failure— it will export, then misbehave in game
 *   compatibility — risks other mods, other packs, or EA's own dynasties
 *   design        — legal, but the organization will not behave as intended
 *   info          — worth knowing
 *
 * Every finding names the section to open, so nothing is a dead end.
 */

import {
  AUTHORITY_CONNECTIONS, LEADERSHIP_KINDS, NON_MEMBER_KINDS, PROMOTION_CONNECTIONS,
  councilRoles, findCycles, heirRoles, leadershipRoles, refIsSet, roleName,
  rolesWithPermission, rolesWithoutEntry, rolesWithoutExit, unreachableRoles,
  type DynastyDoc,
} from "./schema";
import { auditEaSafety, computeRequirements, crossCollisions, internalCollisions } from "./ids";

export type Severity = "blocking" | "likely_failure" | "compatibility" | "design" | "info";

export const SEVERITY_LABEL: Record<Severity, string> = {
  blocking: "Blocking error",
  likely_failure: "Likely in-game failure",
  compatibility: "Compatibility warning",
  design: "Design warning",
  info: "Informational note",
};

export interface Finding {
  id: string;
  severity: Severity;
  section: string;
  message: string;
  fix?: string;
  /** Role/entity the finding points at, for click-to-focus. */
  targetId?: string;
}

export interface DynastyValidation {
  findings: Finding[];
  counts: Record<Severity, number>;
  exportable: boolean;
  /** 0-100, dominated by blocking and in-game failures. */
  health: number;
  eaSafe: boolean;
}

export interface ValidationContext {
  others: DynastyDoc[];
  installedPacks?: string[];
  /** Project resources that exist, for broken-reference detection. */
  knownResourceIds?: Set<string>;
  hasScriptSupport?: boolean;
  hasInjector?: boolean;
}

export function validateDynasty(doc: DynastyDoc, ctx: ValidationContext): DynastyValidation {
  const { others, installedPacks = [], knownResourceIds, hasScriptSupport = true, hasInjector = true } = ctx;
  const f: Finding[] = [];
  let n = 0;
  const push = (severity: Severity, section: string, message: string, extra: Partial<Finding> = {}) =>
    f.push({ id: `${section}:${n++}`, severity, section, message, ...extra });

  const roles = doc.hierarchy.roles;
  const leaders = leadershipRoles(doc);
  const council = councilRoles(doc);

  /* ---------------------------------------------------------- identity --- */
  if (!doc.identity.typeName.trim()) push("blocking", "identity", "The dynasty type has no name.");
  if (!doc.identity.internalName.trim())
    push("blocking", "identity", "The internal tuning name is empty.");
  if (/[^A-Za-z0-9_]/.test(doc.identity.internalName))
    push("blocking", "identity", "Internal names may only use letters, numbers and underscores.");
  if (!doc.identity.namespace.trim())
    push("blocking", "identity", "A creator namespace is required so ids stay unique.");
  if (others.some((o) => o.uuid !== doc.uuid && o.identity.internalName === doc.identity.internalName))
    push("blocking", "identity", "Another dynasty in this project uses the same internal name.");
  if (!doc.identity.description.trim())
    push("info", "identity", "No description — this appears in the generated documentation.");
  if (!refIsSet(doc.identity.crest) && !refIsSet(doc.identity.icon))
    push("design", "visual", "The organization has no crest or icon.");

  /* ------------------------------------------------------------- ids ----- */
  for (const c of internalCollisions(doc))
    push("blocking", "identity", `Duplicate generated id ${c.decimal}: ${c.labels.join(", ")}.`, {
      fix: "Rename one of the resources — ids derive from internal names.",
    });
  for (const c of crossCollisions(doc, others))
    push("blocking", "identity", `Id ${c.decimal} (${c.label}) collides with “${c.other}”.`, {
      fix: "Regenerate ids on one of the two dynasties.",
    });
  const missingIdNames = roles.filter((r) => !r.internalName.trim());
  for (const r of missingIdNames)
    push("blocking", "roles", `Role “${r.displayName}” has no internal name, so no id can be generated.`, {
      targetId: r.uuid,
    });

  /* --------------------------------------------------------- EA safety --- */
  const safety = auditEaSafety(doc);
  for (const s of safety)
    push("blocking", "compat", `EA overwrite risk: ${s.detail}`, {
      fix: "Reference the EA resource instead of redefining it, or clone it with a new id.",
    });
  if (doc.compatMode === "minimal" && roles.length > 6)
    push("compatibility", "compat", "Minimal mode adds tuning only, but this hierarchy has custom roles that need injection.");

  const reqs = computeRequirements(doc);
  for (const r of reqs.filter((x) => x.beyondMode))
    push("compatibility", "compat", `“${r.feature}” needs ${r.requirements.join(", ")}, beyond the selected compatibility mode.`, {
      fix: "Raise the compatibility mode or drop the feature.",
    });
  if (reqs.some((r) => r.requirements.includes("script")) && !hasScriptSupport)
    push("compatibility", "compat", "This dynasty needs script support, but the project has no script file configured.");
  if (reqs.some((r) => r.requirements.includes("injector")) && !hasInjector)
    push("compatibility", "compat", "XML Injector is required but not listed as a dependency.");
  if (installedPacks.length && doc.identity.requiredPack && !installedPacks.includes(doc.identity.requiredPack))
    push("compatibility", "compat", `${doc.identity.requiredPack} is required but not installed here.`);

  /* ------------------------------------------------------- hierarchy ----- */
  if (!roles.length)
    push("blocking", "hierarchy", "The hierarchy is empty — no roles have been created.");
  if (!roles.some((r) => r.kind === "founder"))
    push("likely_failure", "hierarchy", "No founder role exists, so a new organization has nobody to start it.", {
      fix: "Add a Founder node to the whiteboard.",
    });
  if (!leaders.length && doc.succession.structure !== "none")
    push("blocking", "hierarchy", "No leadership role exists, but the leadership structure expects one.");

  const uniqueLeaders = leaders.filter((r) => r.unique);
  if (doc.succession.structure === "single" && uniqueLeaders.length > 1)
    push("likely_failure", "hierarchy", `Single-leader structure has ${uniqueLeaders.length} unique leader roles assigned.`, {
      fix: "Switch to co-leaders, or make only one leadership role unique.",
    });

  for (const cycle of findCycles(doc, AUTHORITY_CONNECTIONS))
    push("blocking", "hierarchy", `Circular reporting relationship: ${cycle.map((id) => roleName(doc, id)).join(" → ")} → …`, {
      targetId: cycle[0],
    });
  for (const cycle of findCycles(doc, PROMOTION_CONNECTIONS))
    push("blocking", "hierarchy", `Circular promotion path: ${cycle.map((id) => roleName(doc, id)).join(" → ")} → …`, {
      targetId: cycle[0],
    });
  for (const cycle of findCycles(doc, ["succeeds"]))
    push("blocking", "succession", `Circular succession path: ${cycle.map((id) => roleName(doc, id)).join(" → ")} → …`, {
      targetId: cycle[0],
    });

  for (const c of doc.hierarchy.connections) {
    const from = roles.find((r) => r.uuid === c.from);
    const to = roles.find((r) => r.uuid === c.to);
    if (!from || !to) {
      push("blocking", "hierarchy", "A connection points at a role that no longer exists.", { targetId: c.uuid });
      continue;
    }
    if (c.from === c.to)
      push("likely_failure", "hierarchy", `“${from.displayName}” is connected to itself.`, { targetId: c.uuid });
    if (c.required && c.minConnected > 0) {
      const count = doc.hierarchy.connections.filter((x) => x.type === c.type && x.from === c.from).length;
      if (count < c.minConnected)
        push("design", "hierarchy", `“${from.displayName}” needs at least ${c.minConnected} ${c.type} connections but has ${count}.`);
    }
  }

  for (const r of rolesWithoutEntry(doc))
    push("likely_failure", "roles", `Nothing can appoint or promote into “${r.displayName}”.`, {
      targetId: r.uuid,
      fix: "Add an appointment method or a promotion connection into this role.",
    });
  for (const r of rolesWithoutExit(doc))
    push("design", "roles", `“${r.displayName}” has no removal or demotion path.`, { targetId: r.uuid });
  for (const r of unreachableRoles(doc))
    push("design", "hierarchy", `“${r.displayName}” is not connected to the rest of the hierarchy.`, { targetId: r.uuid });

  for (const r of roles) {
    if (r.maxSims > 0 && r.minSims > r.maxSims)
      push("blocking", "roles", `“${r.displayName}” requires more Sims than it allows.`, { targetId: r.uuid });
    if (r.unique && r.maxSims > 1)
      push("design", "roles", `“${r.displayName}” is marked unique but allows ${r.maxSims} Sims.`, { targetId: r.uuid });
    if (!r.appointment.length && !NON_MEMBER_KINDS.includes(r.kind))
      push("likely_failure", "roles", `“${r.displayName}” has no appointment method.`, { targetId: r.uuid });
    if (r.requirements.familyRequired && !doc.membership.keepInFamily && !doc.membership.qualifyingRelations.length)
      push("design", "roles", `“${r.displayName}” requires family, but no qualifying family relationships are selected.`, {
        targetId: r.uuid,
      });
    if (refIsSet(r.trait) && knownResourceIds && r.trait.source === "project" && r.trait.projectResourceId &&
        !knownResourceIds.has(r.trait.projectResourceId))
      push("blocking", "roles", `“${r.displayName}” points at a trait that no longer exists.`, { targetId: r.uuid });
    // A role trait that is never granted is a role nobody can detect in game.
    if (LEADERSHIP_KINDS.includes(r.kind) && !refIsSet(r.trait))
      push("design", "roles", `Leadership role “${r.displayName}” has no role trait, so tuning cannot test for it.`, {
        targetId: r.uuid,
      });
  }

  /* ------------------------------------------------------- membership ---- */
  const familyOnly = doc.membership.structure === "family_only" ||
    (doc.membership.keepInFamily && !doc.membership.allowNonFamily);
  if (familyOnly && !doc.membership.qualifyingRelations.length)
    push("blocking", "membership", "Family-only membership with no qualifying relationships means nobody can ever join.");
  if (doc.membership.allowNonFamily) {
    const recruitmentInteractions = doc.interactions.filter(
      (i) => ["invite_to_join", "apply_to_join", "approve_applicant"].includes(i.action) && refIsSet(i.ref),
    );
    if (!recruitmentInteractions.length)
      push("likely_failure", "membership", "Non-family recruitment is enabled, but no recruitment interactions are wired up.", {
        fix: "Add Invite to Join / Apply to Join in Dynasty Interactions.",
      });
    if (!doc.membership.recruitment.length)
      push("blocking", "membership", "Non-family members are allowed, but no recruitment method is selected.");
  }
  if (doc.membership.keepInFamily && doc.membership.allowNonFamily && !doc.membership.familyExceptions.length)
    push("design", "membership", "“Keep membership in the family” and non-family recruitment are both on with no exceptions defined.", {
      fix: "Add a family exception naming which roles outsiders may hold.",
    });

  const approvers = doc.membership.approvalStages.filter((s) => s.canReject);
  if (doc.membership.approvalStages.length && !approvers.length)
    push("likely_failure", "membership", "The approval workflow has no stage that can reject an applicant.");
  for (const stage of doc.membership.approvalStages) {
    if (stage.actor === "authorized_role" && !stage.roleIds.length)
      push("blocking", "membership", `Approval stage “${stage.label}” names no authorized role.`);
    if (stage.actor === "council" && !council.length)
      push("likely_failure", "membership", `Approval stage “${stage.label}” needs a council, but no council role exists.`);
    if (!refIsSet(stage.interaction) && stage.actor !== "automatic")
      push("design", "membership", `Approval stage “${stage.label}” has no interaction, so the player cannot act on it.`);
  }
  const anyApprovalAuthority =
    rolesWithPermission(doc, "approve_members").length > 0 ||
    doc.membership.approvalStages.some((s) => s.actor === "leader" || s.actor === "council");
  if (doc.membership.allowNonFamily && !anyApprovalAuthority)
    push("likely_failure", "permissions", "Recruitment exists but no role can approve members.");

  if (!doc.membershipTypes.length)
    push("design", "membership_types", "No membership categories are defined — everyone is identical.");
  for (const m of doc.membershipTypes) {
    if (!m.internalName.trim())
      push("blocking", "membership_types", `Membership type “${m.displayName}” has no internal name.`);
    if (m.successionEligible && !m.countsTowardSize)
      push("design", "membership_types", `“${m.displayName}” can inherit leadership but does not count as a member.`);
  }
  if (doc.membership.allowDualMembership && doc.membership.respectEaSingleDynastyRule)
    push("design", "membership", "Dual membership is enabled while EA's one-dynasty rule is respected — the game will still refuse the second dynasty.");

  /* ------------------------------------------------------- succession ---- */
  if (!doc.succession.rules.filter((r) => r.enabled).length && doc.succession.structure !== "none")
    push("likely_failure", "succession", "No succession rule is enabled, so leadership never transfers.");
  for (const rule of doc.succession.rules.filter((r) => r.enabled)) {
    const familyRule = [
      "oldest_child", "youngest_child", "firstborn", "lastborn", "biological_only",
      "oldest_eligible_descendant", "youngest_eligible_descendant",
    ].includes(rule.kind);
    if (familyRule && !doc.bloodline.enabled)
      push("likely_failure", "succession", `“${rule.kind.replace(/_/g, " ")}” needs bloodline tracking, which is disabled.`);
    if (rule.kind === "council_selected" && !council.length)
      push("blocking", "succession", "Council-selected succession has no council role.");
    if (rule.kind === "role_based" && !rule.roleIds.length)
      push("blocking", "succession", "Role-based succession names no role.");
    if (rule.kind === "named_heir" && !heirRoles(doc).length)
      push("likely_failure", "succession", "Named-heir succession has no heir role in the hierarchy.");
    if (rule.kind === "custom_test_sequence" && !refIsSet(rule.test))
      push("blocking", "succession", "Custom test succession has no test set selected.");
    if (rule.kind === "non_family_allowed" && familyOnly)
      push("design", "succession", "A non-family successor rule exists, but membership is family-only.");
  }
  if (doc.succession.structure === "council" && !council.length)
    push("blocking", "succession", "Council leadership is selected but no council role exists.");
  if (doc.succession.council.enabled) {
    const c = doc.succession.council;
    if (c.minSize > c.maxSize) push("blocking", "succession", "Council minimum size exceeds its maximum.");
    if (!c.mayVote.length) push("likely_failure", "succession", "The council requires voting but nobody is allowed to vote.");
    if (c.votingMethod === "majority" && (c.majorityPercent <= 0 || c.majorityPercent > 100))
      push("blocking", "succession", "Council majority percentage must be between 1 and 100.");
    if (!c.roleId) push("design", "succession", "No hierarchy role is bound to the council.");
  }
  if (doc.succession.noSuccessor === "pass_to_branch" && !doc.branches.length)
    push("likely_failure", "succession", "Leadership is set to pass to another branch, but no branches exist.");
  if (doc.succession.noSuccessor === "pass_to_ally" && !doc.relations.some((r) => r.type === "allied"))
    push("likely_failure", "succession", "Leadership is set to pass to an ally, but no alliance is defined.");

  /* ----------------------------------------------------------- values ---- */
  for (const v of doc.values) {
    if (!v.name.trim()) push("blocking", "values", "A value has no name.");
    if (v.min >= v.max) push("blocking", "values", `“${v.name}” has an empty score range.`);
    if (!v.positiveActions.length && !v.negativeActions.length)
      push("design", "values", `“${v.name}” has no actions attached, so its score can never change.`);
  }

  /* ----------------------------------------------------- expectations ---- */
  for (const e of doc.expectations) {
    if (!e.roleIds.length && !e.membershipTypeIds.length)
      push("design", "expectations", `“${e.name}” applies to nobody in particular — it will be enforced on every member.`);
    if (e.trackProgress && !refIsSet(e.objective) && !refIsSet(e.successTest))
      push("likely_failure", "expectations", `“${e.name}” tracks progress but has neither an objective nor a success test.`);
    if (e.punishmentId && !doc.punishments.some((p) => p.uuid === e.punishmentId))
      push("blocking", "expectations", `“${e.name}” references a punishment that no longer exists.`);
    if (e.rewardId && !doc.rewards.some((r) => r.uuid === e.rewardId))
      push("blocking", "expectations", `“${e.name}” references a reward that no longer exists.`);
    if (e.frequency === "scheduled_duty" as never && e.deadlineDays <= 0)
      push("design", "expectations", `“${e.name}” is scheduled but has no deadline.`);
  }

  /* --------------------------------------------------------- conduct ----- */
  for (const rule of doc.conduct.filter((r) => r.enabled)) {
    if (!refIsSet(rule.interaction))
      push("blocking", "conduct", `Conduct rule “${rule.name}” has no interaction selected.`, { targetId: rule.uuid });
    if (rule.classification === "forbidden" && rule.detection === "none")
      push("likely_failure", "conduct", `“${rule.name}” forbids an action nothing can detect.`, {
        targetId: rule.uuid,
        fix: "Choose a detection method, or downgrade the rule to Discouraged.",
      });
    if (rule.classification === "required" && !refIsSet(rule.interaction))
      push("blocking", "conduct", `Required action “${rule.name}” has no interaction reference.`, { targetId: rule.uuid });
    if (rule.classification === "role_restricted" && !rule.roleIds.length)
      push("blocking", "conduct", `“${rule.name}” is role-restricted but names no role.`, { targetId: rule.uuid });
    if (rule.detection === "interaction_listener" && !hasScriptSupport)
      push("compatibility", "conduct", `“${rule.name}” needs a script listener to detect the action.`, { targetId: rule.uuid });
    for (const c of rule.consequences) {
      if (c.kind === "demotion" && !doc.hierarchy.connections.some((x) => x.isDemotionPath))
        push("likely_failure", "conduct", `“${rule.name}” demotes offenders, but the hierarchy has no demotion path.`, {
          targetId: rule.uuid,
        });
      if (c.kind === "scandal" && !doc.scandals.length)
        push("likely_failure", "conduct", `“${rule.name}” triggers a scandal, but no scandals are defined.`, {
          targetId: rule.uuid,
        });
    }
  }

  /* ---------------------------------------------------------- traits ----- */
  const assignedTraitIds = new Set(
    [...roles.map((r) => r.trait.projectResourceId), ...doc.membershipTypes.map((m) => m.trait.projectResourceId)]
      .filter(Boolean) as string[],
  );
  for (const t of doc.traits) {
    if (!t.displayName.trim()) push("blocking", "traits", "A dynasty trait has no name.");
    if (t.purpose === "role" && !t.boundToId)
      push("design", "traits", `Role trait “${t.displayName}” is not bound to a role.`);
    if (t.temporary && t.durationHours <= 0)
      push("design", "traits", `“${t.displayName}” is temporary but has no duration.`);
    if (t.purpose !== "bloodline" && t.boundToId && !roles.some((r) => r.uuid === t.boundToId) &&
        !doc.membershipTypes.some((m) => m.uuid === t.boundToId))
      push("blocking", "traits", `“${t.displayName}” is bound to something that no longer exists.`);
  }
  for (const r of roles) {
    if (r.requirements.traits.length && !r.requirements.traits.some((t) => refIsSet(t)))
      push("design", "roles", `“${r.displayName}” lists trait requirements but none are selected.`, { targetId: r.uuid });
  }
  const requiredButUnassigned = roles
    .flatMap((r) => r.requirements.traits.map((t) => ({ role: r, trait: t })))
    .filter(({ trait }) => refIsSet(trait) && trait.source === "project" && trait.projectResourceId &&
      !assignedTraitIds.has(trait.projectResourceId) &&
      !doc.traits.some((dt) => dt.traitRef.projectResourceId === trait.projectResourceId));
  for (const { role, trait } of requiredButUnassigned)
    push("likely_failure", "roles", `“${role.displayName}” requires ${trait.label ?? "a trait"} that nothing in this dynasty ever grants.`, {
      targetId: role.uuid,
    });

  /* ------------------------------------------------------- bloodline ----- */
  if (doc.bloodline.enabled) {
    if (doc.bloodline.inheritance === "random_chance" && (doc.bloodline.chancePercent <= 0 || doc.bloodline.chancePercent > 100))
      push("blocking", "bloodline", "Bloodline inheritance chance must be between 1 and 100.");
    if (doc.bloodline.bloodlineGrantsMembership && doc.membership.structure === "invitation_only")
      push("design", "bloodline", "Bloodline grants membership automatically, which contradicts invitation-only membership.");
    if (!doc.bloodline.bloodlineGrantsSuccession && doc.succession.rules.some((r) => r.kind === "biological_only"))
      push("design", "bloodline", "Succession is restricted to biological descendants, but bloodline does not grant succession eligibility.");
  } else if (doc.succession.rules.some((r) => r.enabled && ["firstborn", "oldest_child", "biological_only"].includes(r.kind))) {
    push("likely_failure", "bloodline", "Descent-based succession is enabled with bloodline tracking turned off.");
  }

  /* ----------------------------------------------------- permissions ----- */
  const hasAnyPermission = Object.keys(doc.permissions.cells).length > 0;
  if (!hasAnyPermission && roles.length)
    push("design", "permissions", "No permissions are granted, so no role can act on the organization.");
  for (const key of ["remove_members", "promote_members", "punish_members"] as const) {
    if (hasAnyPermission && !rolesWithPermission(doc, key).length)
      push("design", "permissions", `No role may ${key.replace(/_/g, " ")}.`);
  }
  for (const roleId of Object.keys(doc.permissions.cells)) {
    if (!roles.some((r) => r.uuid === roleId))
      push("blocking", "permissions", "The permission matrix has a row for a role that no longer exists.");
  }
  for (const p of doc.punishments) {
    const issuers = p.issuerRoleIds.length
      ? p.issuerRoleIds.filter((id) => roles.some((r) => r.uuid === id))
      : rolesWithPermission(doc, "punish_members").map((r) => r.uuid);
    if (!issuers.length)
      push("likely_failure", "punishments", `Punishment “${p.name}” has no role authorized to issue it.`);
  }
  for (const r of doc.rewards) {
    if (r.kind === "new_role" && !refIsSet(r.ref))
      push("blocking", "rewards", `Reward “${r.name}” grants a role but names none.`);
  }

  /* --------------------------------------------------------- branches ---- */
  for (const b of doc.branches) {
    if (b.parentBranchId === b.uuid) push("blocking", "branches", `Branch “${b.name}” is its own parent.`);
    if (b.leaderRoleId && !roles.some((r) => r.uuid === b.leaderRoleId))
      push("blocking", "branches", `Branch “${b.name}” points at a leader role that no longer exists.`);
    if (!b.leaderRoleId) push("design", "branches", `Branch “${b.name}” has no leader.`);
  }
  const branchCycle = doc.branches.filter((b) => {
    const seen = new Set<string>();
    let cur = b.parentBranchId;
    while (cur) {
      if (seen.has(cur)) return true;
      seen.add(cur);
      cur = doc.branches.find((x) => x.uuid === cur)?.parentBranchId ?? "";
    }
    return false;
  });
  for (const b of branchCycle) push("blocking", "branches", `Branch “${b.name}” is part of a circular branch chain.`);

  /* ------------------------------------------------------- progression --- */
  if (doc.prestige.enabled) {
    if (doc.prestige.min >= doc.prestige.max) push("blocking", "prestige", `${doc.prestige.name} has an empty range.`);
    const levels = [...doc.prestige.levels].sort((a, b) => a.threshold - b.threshold);
    for (let i = 1; i < levels.length; i++) {
      if (levels[i]!.threshold === levels[i - 1]!.threshold)
        push("design", "prestige", `Two ${doc.prestige.name} levels share the threshold ${levels[i]!.threshold}.`);
    }
    if (levels.some((l) => l.threshold > doc.prestige.max))
      push("likely_failure", "prestige", `A ${doc.prestige.name} level is above the maximum and can never be reached.`);
    if (!doc.prestige.gains.length)
      push("design", "prestige", `${doc.prestige.name} has no gain sources, so it will never increase.`);
  }
  if (doc.unity.enabled) {
    const u = doc.unity;
    if (u.min >= u.max) push("blocking", "prestige", `${u.name} has an empty range.`);
    if (u.collapseThreshold > u.departureThreshold)
      push("design", "prestige", `${u.name} collapse threshold is above the departure threshold, so members never leave first.`);
    if (u.rebellionThreshold > u.max)
      push("likely_failure", "prestige", `${u.name} rebellion threshold is above the maximum and can never trigger.`);
  }
  if (doc.funds.enabled) {
    if (!doc.funds.contributorRoleIds.length && doc.funds.duesAmount > 0)
      push("design", "funds", "Dues are charged but no role is listed as a contributor.");
    if (!doc.funds.withdrawRoleIds.length)
      push("design", "funds", "No role may withdraw funds.");
    if (doc.funds.misuseScandalId && !doc.scandals.some((s) => s.uuid === doc.funds.misuseScandalId))
      push("blocking", "funds", "The financial misuse scandal no longer exists.");
  }

  /* -------------------------------------------------------- relations ---- */
  for (const rel of doc.relations) {
    if (!refIsSet(rel.target))
      push("blocking", "relations", `“${rel.displayName}” names no other organization.`);
    if (rel.target.projectResourceId === doc.uuid)
      push("blocking", "relations", `“${rel.displayName}” points this organization at itself.`);
    if (rel.type === "vassal" && !doc.relations.some((o) => o.uuid !== rel.uuid && o.type === "patron"))
      push("info", "relations", `“${rel.displayName}” is a vassal relationship with no matching patron defined.`);
  }

  /* --------------------------------------------------------- scandals ---- */
  for (const s of doc.scandals) {
    if (!s.triggers.length && !refIsSet(s.triggerInteraction) && !refIsSet(s.triggerTest))
      push("likely_failure", "scandals", `“${s.name}” has no trigger, so it can never occur.`);
    if (s.escalatesToId && !doc.scandals.some((x) => x.uuid === s.escalatesToId))
      push("blocking", "scandals", `“${s.name}” escalates into a scandal that no longer exists.`);
    if (s.escalatesToId === s.uuid) push("blocking", "scandals", `“${s.name}” escalates into itself.`);
    if (s.allowCoverUp && !s.coverUpRoleIds.length)
      push("design", "scandals", `“${s.name}” can be covered up but no role is authorized to do it.`);
    if (!s.resolutions.length && s.durationDays === 0)
      push("likely_failure", "scandals", `“${s.name}” never expires and has no resolution.`);
  }

  /* ---------------------------------------------------- interactions ----- */
  const wired = new Set(doc.interactions.filter((i) => i.enabled && refIsSet(i.ref)).map((i) => i.action));
  if (!wired.has("view_dynasty"))
    push("design", "interactions", "There is no “View Organization” interaction, so players cannot inspect it in game.");
  if (doc.succession.rules.some((r) => r.kind === "named_heir") && !wired.has("name_heir"))
    push("likely_failure", "interactions", "Named-heir succession has no “Name Heir” interaction.");
  if (doc.punishments.length && !wired.has("punish_member"))
    push("likely_failure", "interactions", "Punishments exist but no “Punish Member” interaction is wired up.");
  for (const i of doc.interactions) {
    if (i.enabled && !refIsSet(i.ref))
      push("blocking", "interactions", `“${i.label}” is enabled but has no interaction reference.`);
    if (i.requiredPermission && !rolesWithPermission(doc, i.requiredPermission).length)
      push("likely_failure", "interactions", `“${i.label}” requires the ${i.requiredPermission.replace(/_/g, " ")} permission, which no role has.`);
  }

  /* ---------------------------------------------------------- events ----- */
  for (const e of doc.events) {
    if (e.hostRoleId && !roles.some((r) => r.uuid === e.hostRoleId))
      push("blocking", "events", `Event “${e.name}” is hosted by a role that no longer exists.`);
    if (e.requiredMembers > doc.size.maxMembers)
      push("likely_failure", "events", `“${e.name}” requires more attendees than the organization allows.`);
    for (const o of e.outcomes) {
      if (o.nextEventId && !doc.events.some((x) => x.uuid === o.nextEventId))
        push("blocking", "events", `“${e.name}” branches into an event that no longer exists.`);
    }
    if (e.kind === "initiation" && !doc.membership.allowNonFamily && doc.membership.keepInFamily)
      push("info", "events", `“${e.name}” is an initiation for an organization that only admits family.`);
  }
  // Event chains must terminate.
  for (const e of doc.events) {
    const seen = new Set<string>();
    let cur: string | undefined = e.uuid;
    let depth = 0;
    while (cur && depth < 64) {
      if (seen.has(cur)) {
        push("blocking", "events", `“${e.name}” starts an event loop that never ends.`);
        break;
      }
      seen.add(cur);
      cur = doc.events.find((x) => x.uuid === cur)?.outcomes[0]?.nextEventId || undefined;
      depth++;
    }
  }

  /* -------------------------------------------------------- autonomy ----- */
  if (doc.autonomy.allowSilentPlayerChanges)
    push("compatibility", "autonomy", "Automation may change player-controlled leadership without asking. Most players consider this a bug.");
  const activeAutomation = Object.values(doc.autonomy.matrix.active ?? {}).filter(Boolean).length;
  if (activeAutomation > 0 && !doc.autonomy.allowSilentPlayerChanges)
    push("info", "autonomy", "Active-household automation is on but silent changes are blocked, so the player will be prompted.");
  if (doc.autonomy.disableAll && Object.values(doc.autonomy.matrix).some((m) => Object.values(m).some(Boolean)))
    push("design", "autonomy", "Automation is globally disabled, so the per-audience switches do nothing.");
  if (doc.autonomy.tickHours <= 0 && !doc.autonomy.disableAll)
    push("blocking", "autonomy", "The automation interval must be greater than zero.");
  if (doc.autonomy.matrix.npc?.recruit && !doc.membership.allowNonFamily && doc.membership.keepInFamily)
    push("design", "autonomy", "NPC auto-recruitment is on, but membership is closed to non-family Sims.");

  /* -------------------------------------------------------- size etc ----- */
  if (doc.size.minMembers > doc.size.maxMembers)
    push("blocking", "identity", "Minimum membership exceeds the maximum.");
  if (doc.size.maxMembers < roles.filter((r) => r.unique).length)
    push("likely_failure", "identity", "There are more unique roles than the organization allows members.");
  if (!doc.size.allowMultipleHouseholds && doc.size.maxMembers > 8)
    push("design", "identity", "A single household cannot hold more than eight Sims, but multi-household membership is off.");

  /* ------------------------------------------------------------ score ---- */
  const counts: Record<Severity, number> = {
    blocking: 0, likely_failure: 0, compatibility: 0, design: 0, info: 0,
  };
  for (const x of f) counts[x.severity]++;

  const health = Math.max(
    0,
    Math.min(
      100,
      100 - counts.blocking * 20 - counts.likely_failure * 8 - counts.compatibility * 4 - counts.design * 2 - counts.info * 0.5,
    ),
  );

  return {
    findings: f,
    counts,
    exportable: counts.blocking === 0,
    health: Math.round(health),
    eaSafe: safety.length === 0,
  };
}

export function validateAll(docs: DynastyDoc[], ctx: Omit<ValidationContext, "others">) {
  const map = new Map<string, DynastyValidation>();
  for (const doc of docs)
    map.set(doc.uuid, validateDynasty(doc, { ...ctx, others: docs.filter((d) => d.uuid !== doc.uuid) }));
  return map;
}
