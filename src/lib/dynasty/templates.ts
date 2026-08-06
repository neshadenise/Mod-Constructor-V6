/**
 * Dynasty templates.
 *
 * Each one is a working organization, not a name on an empty document: roles
 * placed on the whiteboard, connections between them, membership rules that
 * match the fiction, succession that resolves, and a couple of values. All of
 * it stays editable — templates only decide the starting point.
 */

import {
  blankBranch, blankDynastyDoc, blankMembershipType, blankRole, blankValue,
  blankConnection, sanitizeInternalName, type CompatMode, type Connection,
  type DynastyDoc, type MembershipStructure, type NodeKind, type RoleNode,
  type SuccessionRuleKind, did,
} from "./schema";

export interface RoleSeed {
  name: string;
  kind: NodeKind;
  rank: number;
  level: number;
  unique?: boolean;
  maxSims?: number;
  secret?: boolean;
  successionEligible?: boolean;
  votingRights?: boolean;
  mayRecruit?: boolean;
  mayPunish?: boolean;
  familyRequired?: boolean;
}

export interface ConnSeed {
  from: string;
  to: string;
  type: Connection["type"];
  promotion?: boolean;
  demotion?: boolean;
  inherit?: boolean;
  priority?: number;
  label?: string;
}

export interface DynastyTemplate {
  id: string;
  label: string;
  blurb: string;
  group: "Family" | "Power" | "Occult" | "Modern" | "Underground" | "Blank";
  terms: Partial<DynastyDoc["terms"]>;
  compatMode: CompatMode;
  structure: MembershipStructure;
  keepInFamily: boolean;
  allowNonFamily: boolean;
  leadership: DynastyDoc["succession"]["structure"];
  succession: SuccessionRuleKind[];
  roles: RoleSeed[];
  connections: ConnSeed[];
  membershipTypes: { name: string; bloodline?: boolean; secret?: boolean; voting?: boolean }[];
  values: string[];
  branches?: string[];
  prestigeName?: string;
  unityName?: string;
}

/** Lay roles out as a readable tree: level = row, index within level = column. */
function place(roles: RoleSeed[]): { x: number; y: number }[] {
  const byLevel = new Map<number, number>();
  return roles.map((r) => {
    const col = byLevel.get(r.level) ?? 0;
    byLevel.set(r.level, col + 1);
    return { x: 120 + col * 260, y: 100 + r.level * 170 };
  });
}

export function buildFromTemplate(t: DynastyTemplate, namespace: string, projectId: string): DynastyDoc {
  const doc = blankDynastyDoc({ projectId, origin: t.id === "blank" ? "blank" : "template", templateId: t.id });
  const positions = place(t.roles);

  doc.compatMode = t.compatMode;
  doc.terms = { ...doc.terms, ...t.terms };
  doc.identity = {
    ...doc.identity,
    typeName: t.label,
    displayName: t.label,
    internalName: sanitizeInternalName(`Dynasty_${t.label}`),
    namespace,
    description: t.blurb,
  };

  // Roles first — connections and rules reference them by uuid.
  const byName = new Map<string, RoleNode>();
  doc.hierarchy.roles = t.roles.map((seed, i) => {
    const role = blankRole({
      displayName: seed.name,
      internalName: sanitizeInternalName(`Role_${seed.name}`),
      kind: seed.kind,
      rank: seed.rank,
      hierarchyLevel: seed.level,
      unique: seed.unique ?? false,
      maxSims: seed.maxSims ?? (seed.unique ? 1 : 0),
      secret: seed.secret ?? false,
      successionEligible: seed.successionEligible ?? false,
      votingRights: seed.votingRights ?? false,
      mayRecruit: seed.mayRecruit ?? false,
      mayPunish: seed.mayPunish ?? false,
      x: positions[i]!.x,
      y: positions[i]!.y,
    });
    role.requirements.familyRequired = seed.familyRequired ?? false;
    byName.set(seed.name, role);
    return role;
  });

  doc.hierarchy.connections = t.connections.flatMap((c) => {
    const from = byName.get(c.from);
    const to = byName.get(c.to);
    if (!from || !to) return [];
    return [
      blankConnection(from.uuid, to.uuid, {
        type: c.type,
        label: c.label ?? "",
        isPromotionPath: c.promotion ?? false,
        isDemotionPath: c.demotion ?? false,
        inheritPermissions: c.inherit ?? false,
        successionPriority: c.priority ?? 0,
      }),
    ];
  });

  doc.membershipTypes = t.membershipTypes.map((m) =>
    blankMembershipType({
      displayName: m.name,
      internalName: sanitizeInternalName(m.name),
      typicallyBloodline: m.bloodline ?? false,
      secret: m.secret ?? false,
      votingRights: m.voting ?? true,
    }),
  );

  doc.values = t.values.map((name) => blankValue({ name }));

  doc.membership = {
    ...doc.membership,
    structure: t.structure,
    keepInFamily: t.keepInFamily,
    allowNonFamily: t.allowNonFamily,
    recruitment: t.allowNonFamily
      ? ["leader_invites", "authorized_roles_invite", "candidate_applies", "via_ceremony"]
      : ["leader_invites"],
  };

  doc.succession = {
    ...doc.succession,
    structure: t.leadership,
    rules: t.succession.map((kind, i) => ({
      uuid: did("succ"),
      kind,
      label: "",
      roleIds: [],
      membershipTypeIds: [],
      requiredTrait: { ...doc.bloodline.founderTrait },
      requiredSkill: { ...doc.bloodline.descendantTrait },
      minSkillLevel: 0,
      weight: t.succession.length - i,
      test: { ...doc.membership.customTest },
      enabled: true,
    })),
    council: {
      ...doc.succession.council,
      enabled: t.leadership === "council" || t.leadership === "elder_council" || t.leadership === "triumvirate",
      roleId: byName.get(t.roles.find((r) => r.kind === "council")?.name ?? "")?.uuid ?? "",
    },
  };

  if (t.branches?.length) {
    doc.branches = t.branches.map((name) => blankBranch({ name }));
  }
  if (t.prestigeName) {
    doc.prestige = { ...doc.prestige, name: t.prestigeName };
    doc.terms.prestige = t.prestigeName;
  }
  if (t.unityName) {
    doc.unity = { ...doc.unity, name: t.unityName };
    doc.terms.unity = t.unityName;
  }

  // Non-family organizations should not silently keep bloodline succession on.
  if (!t.keepInFamily && t.structure !== "family_only") {
    doc.bloodline = { ...doc.bloodline, enabled: false, bloodlineGrantsSuccession: false, kinds: ["non_hereditary"] };
  }

  return doc;
}

const LADDER: ConnSeed[] = [];

export const DYNASTY_TEMPLATES: DynastyTemplate[] = [
  {
    id: "blank", label: "Blank Custom Dynasty", group: "Blank",
    blurb: "An empty definition with EA-safe defaults. Build the hierarchy yourself.",
    terms: {}, compatMode: "custom_roles", structure: "family_and_spouses",
    keepInFamily: true, allowNonFamily: false, leadership: "single",
    succession: ["named_heir"], roles: [], connections: LADDER,
    membershipTypes: [], values: [],
  },
  {
    id: "ea_family", label: "EA-Style Family Dynasty", group: "Family",
    blurb: "Mirrors the stock Head / Heir / Outcast shape using project-owned roles.",
    terms: {}, compatMode: "minimal", structure: "family_spouses_adopted",
    keepInFamily: true, allowNonFamily: false, leadership: "single",
    succession: ["named_heir", "oldest_eligible_descendant"],
    roles: [
      { name: "Founder", kind: "founder", rank: 100, level: 0, unique: true, familyRequired: true },
      { name: "Dynasty Head", kind: "supreme_leader", rank: 90, level: 1, unique: true, votingRights: true, mayRecruit: true, mayPunish: true, familyRequired: true },
      { name: "Heir", kind: "heir", rank: 70, level: 2, unique: true, successionEligible: true, familyRequired: true },
      { name: "Dynasty Member", kind: "standard_member", rank: 40, level: 3, votingRights: true, familyRequired: true },
      { name: "Outcast", kind: "outcast", rank: 0, level: 4 },
    ],
    connections: [
      { from: "Dynasty Head", to: "Founder", type: "succeeds", priority: 1 },
      { from: "Heir", to: "Dynasty Head", type: "reports_to", inherit: true },
      { from: "Heir", to: "Dynasty Head", type: "succeeds", priority: 1 },
      { from: "Dynasty Member", to: "Dynasty Head", type: "reports_to" },
      { from: "Dynasty Member", to: "Heir", type: "may_promote", promotion: true },
      { from: "Dynasty Head", to: "Outcast", type: "may_remove", demotion: true },
    ],
    membershipTypes: [
      { name: "Blood Member", bloodline: true }, { name: "Married-In Member" },
      { name: "Adopted Member" }, { name: "Former Member", voting: false },
    ],
    values: ["Legacy", "Family", "Ambition"],
  },
  {
    id: "royal_house", label: "Royal House", group: "Power",
    blurb: "Crown, consort, court and a strict line of succession with a regency fallback.",
    terms: {
      organization: "Royal House", organizationPlural: "Royal Houses", member: "Courtier",
      memberPlural: "Court", leader: "Monarch", heir: "Crown Heir", outcast: "Exile",
      prestige: "Renown", unity: "Loyalty", createVerb: "Found Royal House",
    },
    compatMode: "custom_hierarchy", structure: "family_preferred", keepInFamily: true,
    allowNonFamily: true, leadership: "leader_consort",
    succession: ["named_heir", "firstborn", "oldest_eligible_descendant", "siblings_allowed", "council_selected"],
    roles: [
      { name: "Founding Monarch", kind: "founder", rank: 100, level: 0, unique: true, familyRequired: true },
      { name: "Monarch", kind: "supreme_leader", rank: 95, level: 1, unique: true, votingRights: true, mayRecruit: true, mayPunish: true, familyRequired: true },
      { name: "Consort", kind: "consort", rank: 80, level: 1, unique: true },
      { name: "Crown Heir", kind: "heir", rank: 75, level: 2, unique: true, successionEligible: true, familyRequired: true },
      { name: "Regent", kind: "regent", rank: 74, level: 2, unique: true },
      { name: "Privy Council", kind: "council", rank: 60, level: 3, maxSims: 5, votingRights: true },
      { name: "Royal Advisor", kind: "advisor", rank: 50, level: 3 },
      { name: "Royal Guard", kind: "guard", rank: 40, level: 4 },
      { name: "Courtier", kind: "standard_member", rank: 30, level: 4 },
      { name: "Exile", kind: "outcast", rank: 0, level: 5 },
    ],
    connections: [
      { from: "Monarch", to: "Founding Monarch", type: "succeeds", priority: 1 },
      { from: "Consort", to: "Monarch", type: "advises" },
      { from: "Crown Heir", to: "Monarch", type: "succeeds", priority: 1 },
      { from: "Regent", to: "Monarch", type: "may_replace", priority: 2 },
      { from: "Privy Council", to: "Monarch", type: "advises", inherit: true },
      { from: "Privy Council", to: "Crown Heir", type: "elects" },
      { from: "Royal Advisor", to: "Privy Council", type: "may_promote", promotion: true },
      { from: "Royal Guard", to: "Monarch", type: "protects" },
      { from: "Courtier", to: "Royal Advisor", type: "may_promote", promotion: true },
      { from: "Monarch", to: "Exile", type: "may_remove", demotion: true },
    ],
    membershipTypes: [
      { name: "Royal Blood", bloodline: true }, { name: "Married Into the House" },
      { name: "Sworn Courtier" }, { name: "Honorary Peer", voting: false },
      { name: "Exile", voting: false },
    ],
    values: ["Honor", "Tradition", "Renown", "Duty"],
    branches: ["Main Line", "Cadet Branch"],
    prestigeName: "Renown", unityName: "Loyalty",
  },
  {
    id: "crime_family", label: "Crime Family", group: "Underground",
    blurb: "Blood relatives and made members hold different status; loyalty is enforced.",
    terms: {
      organization: "Family", organizationPlural: "Families", member: "Associate",
      memberPlural: "The Family", leader: "Don", heir: "Underboss", outcast: "Rat",
      prestige: "Influence", unity: "Loyalty", scandal: "Heat", createVerb: "Start a Family",
    },
    compatMode: "full_extension", structure: "family_preferred", keepInFamily: false,
    allowNonFamily: true, leadership: "single",
    succession: ["named_heir", "role_based", "highest_prestige", "non_family_allowed"],
    roles: [
      { name: "Founder", kind: "founder", rank: 100, level: 0, unique: true },
      { name: "Don", kind: "supreme_leader", rank: 95, level: 1, unique: true, mayRecruit: true, mayPunish: true },
      { name: "Underboss", kind: "deputy", rank: 80, level: 2, unique: true, successionEligible: true, mayPunish: true },
      { name: "Consigliere", kind: "advisor", rank: 75, level: 2, unique: true, votingRights: true },
      { name: "Caporegime", kind: "branch_leader", rank: 60, level: 3, mayRecruit: true },
      { name: "Made Member", kind: "senior_member", rank: 45, level: 4, votingRights: true },
      { name: "Associate", kind: "junior_member", rank: 25, level: 5 },
      { name: "Rat", kind: "outcast", rank: 0, level: 6 },
    ],
    connections: [
      { from: "Don", to: "Founder", type: "succeeds", priority: 1 },
      { from: "Underboss", to: "Don", type: "reports_to", inherit: true },
      { from: "Underboss", to: "Don", type: "succeeds", priority: 1 },
      { from: "Consigliere", to: "Don", type: "advises" },
      { from: "Caporegime", to: "Underboss", type: "reports_to", inherit: true },
      { from: "Made Member", to: "Caporegime", type: "reports_to" },
      { from: "Made Member", to: "Caporegime", type: "may_promote", promotion: true },
      { from: "Associate", to: "Made Member", type: "may_promote", promotion: true },
      { from: "Don", to: "Rat", type: "may_remove", demotion: true },
      { from: "Caporegime", to: "Associate", type: "may_recruit" },
    ],
    membershipTypes: [
      { name: "Blood Relative", bloodline: true }, { name: "Made Member" },
      { name: "Associate", voting: false }, { name: "Secret Member", secret: true },
      { name: "Marked", voting: false },
    ],
    values: ["Loyalty", "Secrecy", "Ruthlessness", "Respect"],
    branches: ["Main Crew", "Docks Crew"],
    prestigeName: "Influence", unityName: "Loyalty",
  },
  {
    id: "coven", label: "Coven", group: "Occult",
    blurb: "Initiation over ancestry: outsiders may join, and the bloodline is optional.",
    terms: {
      organization: "Coven", organizationPlural: "Covens", member: "Coven Member",
      memberPlural: "Coven", leader: "High Priestess", heir: "Chosen Successor",
      outcast: "Banished", prestige: "Coven Influence", values: "Coven Laws",
      ceremony: "Rite", createVerb: "Form Coven",
    },
    compatMode: "custom_membership", structure: "invitation_only", keepInFamily: false,
    allowNonFamily: true, leadership: "elder_council",
    succession: ["council_selected", "highest_skill", "trait_based", "non_family_allowed"],
    roles: [
      { name: "Founding Witch", kind: "founder", rank: 100, level: 0, unique: true },
      { name: "High Priestess", kind: "supreme_leader", rank: 95, level: 1, unique: true, mayRecruit: true, mayPunish: true },
      { name: "Chosen Successor", kind: "heir", rank: 80, level: 2, unique: true, successionEligible: true },
      { name: "Elder Witch", kind: "elder", rank: 70, level: 2, maxSims: 3, votingRights: true },
      { name: "Coven Member", kind: "standard_member", rank: 40, level: 3, votingRights: true },
      { name: "Initiate", kind: "recruit", rank: 20, level: 4 },
      { name: "Banished", kind: "outcast", rank: 0, level: 5 },
    ],
    connections: [
      { from: "High Priestess", to: "Founding Witch", type: "succeeds", priority: 1 },
      { from: "Chosen Successor", to: "High Priestess", type: "succeeds", priority: 1 },
      { from: "Elder Witch", to: "High Priestess", type: "advises", inherit: true },
      { from: "Elder Witch", to: "Chosen Successor", type: "elects" },
      { from: "Coven Member", to: "Elder Witch", type: "may_promote", promotion: true },
      { from: "Initiate", to: "Coven Member", type: "may_promote", promotion: true },
      { from: "High Priestess", to: "Banished", type: "may_remove", demotion: true },
    ],
    membershipTypes: [
      { name: "Initiate", voting: false }, { name: "Full Member" },
      { name: "Elder" }, { name: "Bloodline Witch", bloodline: true },
      { name: "Secret Member", secret: true },
    ],
    values: ["Magical Purity", "Secrecy", "Knowledge", "Sisterhood"],
    prestigeName: "Coven Influence", unityName: "Harmony",
  },
  {
    id: "clan", label: "Clan", group: "Family",
    blurb: "Extended kin across many households, with elders and branch chiefs.",
    terms: {
      organization: "Clan", organizationPlural: "Clans", member: "Clansman",
      memberPlural: "Clan", leader: "Chief", heir: "Tanist", outcast: "Kinless",
      prestige: "Honor", branch: "Sept", createVerb: "Raise Clan",
    },
    compatMode: "custom_hierarchy", structure: "family_and_spouses", keepInFamily: true,
    allowNonFamily: true, leadership: "elder_council",
    succession: ["council_selected", "oldest_eligible_descendant", "siblings_allowed", "extended_family_allowed"],
    roles: [
      { name: "Clan Founder", kind: "founder", rank: 100, level: 0, unique: true, familyRequired: true },
      { name: "Chief", kind: "supreme_leader", rank: 90, level: 1, unique: true, mayPunish: true, familyRequired: true },
      { name: "Tanist", kind: "heir", rank: 75, level: 2, unique: true, successionEligible: true, familyRequired: true },
      { name: "Elder", kind: "elder", rank: 65, level: 2, maxSims: 5, votingRights: true },
      { name: "Sept Chief", kind: "branch_leader", rank: 55, level: 3, mayRecruit: true },
      { name: "Clansman", kind: "standard_member", rank: 35, level: 4, votingRights: true },
      { name: "Kinless", kind: "outcast", rank: 0, level: 5 },
    ],
    connections: [
      { from: "Chief", to: "Clan Founder", type: "succeeds", priority: 1 },
      { from: "Tanist", to: "Chief", type: "succeeds", priority: 1 },
      { from: "Elder", to: "Chief", type: "advises", inherit: true },
      { from: "Elder", to: "Tanist", type: "elects" },
      { from: "Sept Chief", to: "Chief", type: "reports_to", inherit: true },
      { from: "Clansman", to: "Sept Chief", type: "reports_to" },
      { from: "Clansman", to: "Sept Chief", type: "may_promote", promotion: true },
      { from: "Chief", to: "Kinless", type: "may_remove", demotion: true },
    ],
    membershipTypes: [
      { name: "Blood Kin", bloodline: true }, { name: "Married Kin" },
      { name: "Fostered Kin" }, { name: "Sworn Ally", voting: false },
    ],
    values: ["Honor", "Family", "Independence", "Tradition"],
    branches: ["Main Sept", "Highland Sept"],
    prestigeName: "Honor", unityName: "Kinship",
  },
  {
    id: "business_empire", label: "Business Empire", group: "Modern",
    blurb: "A board, divisions and promotion by performance rather than birth.",
    terms: {
      organization: "Empire", organizationPlural: "Empires", member: "Executive",
      memberPlural: "Leadership", leader: "CEO", heir: "Successor",
      outcast: "Terminated", prestige: "Market Power", unity: "Morale",
      branch: "Division", createVerb: "Incorporate",
    },
    compatMode: "custom_progression", structure: "career_based", keepInFamily: false,
    allowNonFamily: true, leadership: "council",
    succession: ["council_selected", "role_based", "highest_prestige", "non_family_allowed"],
    roles: [
      { name: "Founder", kind: "founder", rank: 100, level: 0, unique: true },
      { name: "CEO", kind: "supreme_leader", rank: 95, level: 1, unique: true, mayRecruit: true, mayPunish: true },
      { name: "Board Member", kind: "council", rank: 75, level: 2, maxSims: 7, votingRights: true },
      { name: "Division Head", kind: "branch_leader", rank: 60, level: 3, mayRecruit: true },
      { name: "Manager", kind: "specialist", rank: 45, level: 4 },
      { name: "Employee", kind: "employee", rank: 25, level: 5 },
      { name: "Terminated", kind: "former_member", rank: 0, level: 6 },
    ],
    connections: [
      { from: "CEO", to: "Founder", type: "succeeds", priority: 1 },
      { from: "Board Member", to: "CEO", type: "may_replace", priority: 1 },
      { from: "Board Member", to: "CEO", type: "elects" },
      { from: "Division Head", to: "CEO", type: "reports_to", inherit: true },
      { from: "Manager", to: "Division Head", type: "reports_to" },
      { from: "Manager", to: "Division Head", type: "may_promote", promotion: true },
      { from: "Employee", to: "Manager", type: "may_promote", promotion: true },
      { from: "CEO", to: "Terminated", type: "may_remove", demotion: true },
    ],
    membershipTypes: [
      { name: "Founding Partner" }, { name: "Executive" }, { name: "Employee", voting: false },
      { name: "Contractor", voting: false }, { name: "Shareholder" },
    ],
    values: ["Business Success", "Ambition", "Discipline", "Wealth"],
    branches: ["Corporate", "Overseas Division"],
    prestigeName: "Market Power", unityName: "Morale",
  },
  {
    id: "celebrity_family", label: "Celebrity Family", group: "Modern",
    blurb: "Fame is the currency and scandal is the real threat.",
    terms: {
      organization: "Family Brand", member: "Family Member", leader: "Matriarch",
      heir: "Next Generation", outcast: "Cancelled", prestige: "Fame",
      scandal: "Tabloid Scandal", createVerb: "Launch the Brand",
    },
    compatMode: "custom_progression", structure: "family_spouses_adopted", keepInFamily: true,
    allowNonFamily: true, leadership: "leader_consort",
    succession: ["named_heir", "highest_prestige", "oldest_child"],
    roles: [
      { name: "Founder", kind: "founder", rank: 100, level: 0, unique: true },
      { name: "Matriarch", kind: "supreme_leader", rank: 90, level: 1, unique: true, mayPunish: true },
      { name: "Next Generation", kind: "heir", rank: 70, level: 2, successionEligible: true, maxSims: 3 },
      { name: "Family Member", kind: "standard_member", rank: 45, level: 3, votingRights: true },
      { name: "Manager", kind: "advisor", rank: 40, level: 3 },
      { name: "Cancelled", kind: "outcast", rank: 0, level: 4 },
    ],
    connections: [
      { from: "Matriarch", to: "Founder", type: "succeeds", priority: 1 },
      { from: "Next Generation", to: "Matriarch", type: "succeeds", priority: 1 },
      { from: "Family Member", to: "Matriarch", type: "reports_to" },
      { from: "Family Member", to: "Next Generation", type: "may_promote", promotion: true },
      { from: "Manager", to: "Matriarch", type: "advises" },
      { from: "Matriarch", to: "Cancelled", type: "may_remove", demotion: true },
    ],
    membershipTypes: [
      { name: "Blood Family", bloodline: true }, { name: "Married In" },
      { name: "Brand Partner", voting: false },
    ],
    values: ["Fame", "Image", "Wealth", "Romance"],
    prestigeName: "Fame", unityName: "Harmony",
  },
  {
    id: "guild", label: "Guild", group: "Power",
    blurb: "Skill-gated ranks from apprentice to master, elected guildmaster.",
    terms: {
      organization: "Guild", member: "Guild Member", leader: "Guildmaster",
      heir: "Master-Elect", outcast: "Expelled", prestige: "Standing",
      createVerb: "Charter Guild",
    },
    compatMode: "custom_membership", structure: "skill_based", keepInFamily: false,
    allowNonFamily: true, leadership: "elected_chair",
    succession: ["elected", "highest_skill", "role_based", "non_family_allowed"],
    roles: [
      { name: "Charter Master", kind: "founder", rank: 100, level: 0, unique: true },
      { name: "Guildmaster", kind: "supreme_leader", rank: 90, level: 1, unique: true, mayRecruit: true, mayPunish: true },
      { name: "Guild Council", kind: "council", rank: 70, level: 2, maxSims: 5, votingRights: true },
      { name: "Master", kind: "senior_member", rank: 60, level: 3, mayRecruit: true, votingRights: true },
      { name: "Journeyman", kind: "standard_member", rank: 40, level: 4, votingRights: true },
      { name: "Apprentice", kind: "recruit", rank: 20, level: 5 },
      { name: "Expelled", kind: "former_member", rank: 0, level: 6 },
    ],
    connections: [
      { from: "Guildmaster", to: "Charter Master", type: "succeeds", priority: 1 },
      { from: "Guild Council", to: "Guildmaster", type: "elects" },
      { from: "Master", to: "Guild Council", type: "may_promote", promotion: true },
      { from: "Journeyman", to: "Master", type: "may_promote", promotion: true },
      { from: "Apprentice", to: "Journeyman", type: "may_promote", promotion: true },
      { from: "Apprentice", to: "Master", type: "serves" },
      { from: "Guildmaster", to: "Expelled", type: "may_remove", demotion: true },
    ],
    membershipTypes: [
      { name: "Apprentice", voting: false }, { name: "Journeyman" },
      { name: "Master" }, { name: "Honorary Member", voting: false },
    ],
    values: ["Craftsmanship", "Education", "Discipline", "Community Service"],
    prestigeName: "Standing", unityName: "Cohesion",
  },
  {
    id: "secret_society", label: "Secret Society", group: "Underground",
    blurb: "Secret membership by default, sponsorship and initiation required.",
    terms: {
      organization: "Order", member: "Initiate", leader: "Grand Master",
      heir: "Successor", outcast: "Renounced", prestige: "Influence",
      ceremony: "Rite", createVerb: "Establish Order",
    },
    compatMode: "full_extension", structure: "invitation_only", keepInFamily: false,
    allowNonFamily: true, leadership: "council",
    succession: ["council_selected", "trait_based", "custom_test_sequence", "non_family_allowed"],
    roles: [
      { name: "Founder", kind: "founder", rank: 100, level: 0, unique: true, secret: true },
      { name: "Grand Master", kind: "supreme_leader", rank: 95, level: 1, unique: true, secret: true, mayPunish: true },
      { name: "Inner Circle", kind: "council", rank: 75, level: 2, maxSims: 5, secret: true, votingRights: true },
      { name: "Sponsor", kind: "advisor", rank: 55, level: 3, mayRecruit: true },
      { name: "Sworn Member", kind: "standard_member", rank: 40, level: 3 },
      { name: "Initiate", kind: "recruit", rank: 20, level: 4 },
      { name: "Renounced", kind: "outcast", rank: 0, level: 5 },
    ],
    connections: [
      { from: "Grand Master", to: "Founder", type: "succeeds", priority: 1 },
      { from: "Inner Circle", to: "Grand Master", type: "elects" },
      { from: "Sponsor", to: "Inner Circle", type: "may_promote", promotion: true },
      { from: "Sworn Member", to: "Sponsor", type: "may_promote", promotion: true },
      { from: "Initiate", to: "Sworn Member", type: "may_promote", promotion: true },
      { from: "Sponsor", to: "Initiate", type: "may_recruit" },
      { from: "Grand Master", to: "Renounced", type: "may_remove", demotion: true },
    ],
    membershipTypes: [
      { name: "Initiate", secret: true, voting: false }, { name: "Sworn Member", secret: true },
      { name: "Inner Circle", secret: true }, { name: "Renounced", voting: false },
    ],
    values: ["Secrecy", "Loyalty", "Knowledge", "Influence"],
    prestigeName: "Influence", unityName: "Trust",
  },
  {
    id: "wrestling_stable", label: "Wrestling Stable", group: "Modern",
    blurb: "Champion at the top, tag teams as branches, betrayal built in.",
    terms: {
      organization: "Stable", member: "Stable Member", leader: "Leader",
      heir: "Heir Apparent", outcast: "Turncoat", prestige: "Heat",
      unity: "Chemistry", branch: "Tag Team", createVerb: "Form Stable",
    },
    compatMode: "custom_hierarchy", structure: "open_recruitment", keepInFamily: false,
    allowNonFamily: true, leadership: "co_leaders",
    succession: ["competition_winner", "highest_prestige", "role_based", "non_family_allowed"],
    roles: [
      { name: "Founder", kind: "founder", rank: 100, level: 0, unique: true },
      { name: "Stable Leader", kind: "supreme_leader", rank: 90, level: 1, unique: true, mayRecruit: true },
      { name: "Champion", kind: "co_leader", rank: 85, level: 1, unique: true, successionEligible: true },
      { name: "Enforcer", kind: "guard", rank: 60, level: 2 },
      { name: "Tag Team Leader", kind: "branch_leader", rank: 55, level: 2 },
      { name: "Stable Member", kind: "standard_member", rank: 35, level: 3, votingRights: true },
      { name: "Rookie", kind: "recruit", rank: 15, level: 4 },
      { name: "Turncoat", kind: "outcast", rank: 0, level: 5 },
    ],
    connections: [
      { from: "Stable Leader", to: "Founder", type: "succeeds", priority: 1 },
      { from: "Champion", to: "Stable Leader", type: "equal_to" },
      { from: "Champion", to: "Stable Leader", type: "may_challenge" },
      { from: "Enforcer", to: "Stable Leader", type: "protects" },
      { from: "Tag Team Leader", to: "Stable Leader", type: "reports_to", inherit: true },
      { from: "Stable Member", to: "Tag Team Leader", type: "may_promote", promotion: true },
      { from: "Rookie", to: "Stable Member", type: "may_promote", promotion: true },
      { from: "Stable Leader", to: "Turncoat", type: "may_remove", demotion: true },
    ],
    membershipTypes: [
      { name: "Rookie", voting: false }, { name: "Full Member" },
      { name: "Champion" }, { name: "Turncoat", voting: false },
    ],
    values: ["Athletic Excellence", "Fame", "Loyalty", "Ruthlessness"],
    branches: ["Main Roster", "Tag Team"],
    prestigeName: "Heat", unityName: "Chemistry",
  },
  {
    id: "political_dynasty", label: "Political Dynasty", group: "Power",
    blurb: "Elected offices, campaign donors and scandals that cost real standing.",
    terms: {
      organization: "Political Family", member: "Family Member", leader: "Party Head",
      heir: "Presumptive Nominee", outcast: "Disowned", prestige: "Political Capital",
      createVerb: "Found Political Family",
    },
    compatMode: "custom_progression", structure: "family_preferred", keepInFamily: true,
    allowNonFamily: true, leadership: "elected_chair",
    succession: ["elected", "named_heir", "highest_prestige", "oldest_eligible_descendant"],
    roles: [
      { name: "Founder", kind: "founder", rank: 100, level: 0, unique: true },
      { name: "Party Head", kind: "supreme_leader", rank: 90, level: 1, unique: true, mayPunish: true },
      { name: "Presumptive Nominee", kind: "heir", rank: 75, level: 2, unique: true, successionEligible: true },
      { name: "Campaign Council", kind: "council", rank: 65, level: 2, maxSims: 5, votingRights: true },
      { name: "Officeholder", kind: "senior_member", rank: 55, level: 3, votingRights: true },
      { name: "Staffer", kind: "employee", rank: 30, level: 4 },
      { name: "Disowned", kind: "outcast", rank: 0, level: 5 },
    ],
    connections: [
      { from: "Party Head", to: "Founder", type: "succeeds", priority: 1 },
      { from: "Presumptive Nominee", to: "Party Head", type: "succeeds", priority: 1 },
      { from: "Campaign Council", to: "Presumptive Nominee", type: "elects" },
      { from: "Officeholder", to: "Campaign Council", type: "may_promote", promotion: true },
      { from: "Staffer", to: "Officeholder", type: "may_promote", promotion: true },
      { from: "Party Head", to: "Disowned", type: "may_remove", demotion: true },
    ],
    membershipTypes: [
      { name: "Family", bloodline: true }, { name: "Married In" },
      { name: "Staff", voting: false }, { name: "Donor", voting: false },
    ],
    values: ["Ambition", "Public Image", "Loyalty", "Community Service"],
    prestigeName: "Political Capital", unityName: "Party Discipline",
  },
  {
    id: "custom_org", label: "Custom Organization", group: "Blank",
    blurb: "Neutral scaffolding for anything that is not a family: leader, council, members, recruits.",
    terms: {
      organization: "Organization", organizationPlural: "Organizations",
      member: "Member", memberPlural: "Members", leader: "Leader",
      heir: "Successor", outcast: "Former Member", createVerb: "Create Organization",
    },
    compatMode: "custom_membership", structure: "open_recruitment", keepInFamily: false,
    allowNonFamily: true, leadership: "council",
    succession: ["council_selected", "elected", "highest_prestige", "non_family_allowed"],
    roles: [
      { name: "Founder", kind: "founder", rank: 100, level: 0, unique: true },
      { name: "Leader", kind: "supreme_leader", rank: 90, level: 1, unique: true, mayRecruit: true, mayPunish: true },
      { name: "Council", kind: "council", rank: 70, level: 2, maxSims: 5, votingRights: true },
      { name: "Member", kind: "standard_member", rank: 40, level: 3, votingRights: true },
      { name: "Recruit", kind: "recruit", rank: 20, level: 4 },
      { name: "Former Member", kind: "former_member", rank: 0, level: 5 },
    ],
    connections: [
      { from: "Leader", to: "Founder", type: "succeeds", priority: 1 },
      { from: "Council", to: "Leader", type: "advises", inherit: true },
      { from: "Council", to: "Leader", type: "elects" },
      { from: "Member", to: "Council", type: "may_promote", promotion: true },
      { from: "Recruit", to: "Member", type: "may_promote", promotion: true },
      { from: "Leader", to: "Former Member", type: "may_remove", demotion: true },
    ],
    membershipTypes: [
      { name: "Recruit", voting: false }, { name: "Full Member" },
      { name: "Senior Member" }, { name: "Honorary Member", voting: false },
    ],
    values: ["Loyalty", "Community Service", "Discipline"],
  },
];

export const TEMPLATE_GROUPS = [...new Set(DYNASTY_TEMPLATES.map((t) => t.group))];
