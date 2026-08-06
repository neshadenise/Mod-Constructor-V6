/**
 * Custom Dynasty schema.
 *
 * The whole point of this model is that three things EA's dynasty system
 * conflates are kept apart:
 *
 *   bloodline  — who descends from the founder (ancestry, never revoked)
 *   membership — who currently belongs to the organization (can be granted,
 *                suspended and revoked; may include people with no bloodline)
 *   hierarchy  — what authority a member holds right now (a position, held by
 *                at most its role cap, vacated on death or demotion)
 *
 * A Sim can have any combination: an exiled prince keeps his bloodline and
 * loses both membership and position; a recruited consigliere has membership
 * and a senior position with no bloodline at all.
 *
 * Everything a creator authors here is a NEW project-owned resource. EA's
 * dynasty tuning is only ever *referenced*, never patched — see `compat.ts`
 * for how that guarantee is enforced at export time.
 */

export const DYNASTY_DOC_VERSION = 1;

export const did = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;

export function sanitizeInternalName(s: string): string {
  const cleaned = (s || "")
    .trim()
    .replace(/[^A-Za-z0-9_ ]/g, "")
    .replace(/\s+/g, "_");
  return /^[0-9]/.test(cleaned) ? `_${cleaned}` : cleaned;
}

/* ------------------------------------------------------------------ refs -- */

export type ResourceKind =
  | "Trait" | "Buff" | "Loot" | "Statistic" | "Commodity" | "RelationshipBit"
  | "Interaction" | "Situation" | "Event" | "Notification" | "TestSet"
  | "Objective" | "Aspiration" | "Career" | "Skill" | "Object" | "Venue"
  | "World" | "Lot" | "Icon" | "String" | "Dynasty" | "Role" | "Snippet";

export interface ResourceRef {
  /** "project" resources are ours; "ea" resources are referenced read-only. */
  source: "unset" | "project" | "ea" | "mod";
  resourceKind: ResourceKind;
  expectedResourceKind: ResourceKind;
  /** Stable UUID of a resource inside this project. */
  projectResourceId?: string;
  /** Decimal instance id for EA/mod resources we only point at. */
  instanceId?: string;
  tuningName?: string;
  label?: string;
  pack?: string;
  resolutionMode: "required" | "optional";
}

export function blankRef(
  kind: ResourceKind,
  mode: ResourceRef["resolutionMode"] = "optional",
): ResourceRef {
  return { source: "unset", resourceKind: kind, expectedResourceKind: kind, resolutionMode: mode };
}

export const refIsSet = (r?: ResourceRef): boolean =>
  !!r && r.source !== "unset" && !!(r.projectResourceId || r.instanceId || r.tuningName);

export const refLabel = (r?: ResourceRef): string =>
  !refIsSet(r) ? "—" : (r?.label || r?.tuningName || r?.instanceId || r?.projectResourceId || "—");

/* ------------------------------------------------------- compatibility --- */

export const COMPAT_MODES = [
  "minimal", "custom_roles", "custom_hierarchy", "custom_membership",
  "custom_progression", "full_extension",
] as const;
export type CompatMode = (typeof COMPAT_MODES)[number];

export const COMPAT_MODE_LABEL: Record<CompatMode, string> = {
  minimal: "EA framework, minimal additions",
  custom_roles: "EA framework + custom roles",
  custom_hierarchy: "EA framework + custom hierarchy",
  custom_membership: "EA framework + custom membership rules",
  custom_progression: "EA framework + custom progression",
  full_extension: "Full custom dynasty extension",
};

export const COMPAT_MODE_BLURB: Record<CompatMode, string> = {
  minimal:
    "Adds terminology, values and buffs on top of EA roles. Tuning only — no injector, no script.",
  custom_roles:
    "Your own roles and role traits alongside EA's Head/Heir/Outcast, which keep working untouched.",
  custom_hierarchy:
    "Multi-branch hierarchy with your own reporting and promotion paths. Needs XML injection.",
  custom_membership:
    "Custom membership types and recruitment, including non-family members. Needs XML injection.",
  custom_progression:
    "Your own prestige, unity and level curve as new statistics. Needs XML injection.",
  full_extension:
    "Everything: custom UI dialog, autonomous NPC management, scandals and events. Needs a script.",
};

/** What a feature costs to ship — surfaced per section, never guessed at export. */
export type Requirement =
  | "tuning" | "injector" | "script" | "royalty_legacy" | "pack" | "framework";

export const REQUIREMENT_LABEL: Record<Requirement, string> = {
  tuning: "Tuning only",
  injector: "XML Injector",
  script: "Script support",
  royalty_legacy: "Royalty & Legacy",
  pack: "Another expansion pack",
  framework: "Custom framework dependency",
};

/** Baseline capability of each compatibility mode, used to warn about overreach. */
export const MODE_CAPABILITY: Record<CompatMode, Requirement[]> = {
  minimal: ["tuning", "royalty_legacy"],
  custom_roles: ["tuning", "royalty_legacy"],
  custom_hierarchy: ["tuning", "injector", "royalty_legacy"],
  custom_membership: ["tuning", "injector", "royalty_legacy"],
  custom_progression: ["tuning", "injector", "royalty_legacy"],
  full_extension: ["tuning", "injector", "script", "royalty_legacy", "framework"],
};

/* ------------------------------------------------------------ terminology - */

/**
 * Player-facing vocabulary. Every key maps to a framework concept whose
 * internal reference never changes — renaming "Heir" to "Chosen Successor"
 * rewrites strings, not tuning.
 */
export interface Terminology {
  organization: string;        // "Dynasty"
  organizationPlural: string;
  member: string;              // "Dynasty Member"
  memberPlural: string;
  founder: string;
  leader: string;              // EA: Dynasty Head
  heir: string;                // EA: Heir
  outcast: string;             // EA: Outcast
  formerMember: string;
  recruit: string;
  applicant: string;
  prestige: string;            // EA: Dynasty Prestige
  unity: string;
  values: string;              // EA: Dynasty Values
  scandal: string;
  alliance: string;
  rivalry: string;
  branch: string;
  ceremony: string;
  funds: string;
  createVerb: string;          // "Create Dynasty" → "Found Coven"
}

export const DEFAULT_TERMS: Terminology = {
  organization: "Dynasty", organizationPlural: "Dynasties",
  member: "Dynasty Member", memberPlural: "Dynasty Members",
  founder: "Founder", leader: "Dynasty Head", heir: "Heir", outcast: "Outcast",
  formerMember: "Former Member", recruit: "Recruit", applicant: "Applicant",
  prestige: "Prestige", unity: "Unity", values: "Dynasty Values",
  scandal: "Scandal", alliance: "Alliance", rivalry: "Rivalry", branch: "Branch",
  ceremony: "Ceremony", funds: "Dynasty Funds", createVerb: "Create Dynasty",
};

/** Framework concept each term maps to — shown so renaming feels safe. */
export const TERM_FRAMEWORK_REF: Record<keyof Terminology, string> = {
  organization: "dynasty.Dynasty", organizationPlural: "dynasty.Dynasty",
  member: "dynasty.DynastyMember", memberPlural: "dynasty.DynastyMember",
  founder: "dynasty.Founder", leader: "dynasty.DynastyHead", heir: "dynasty.Heir",
  outcast: "dynasty.Outcast", formerMember: "dynasty.FormerMember",
  recruit: "custom.Recruit", applicant: "custom.Applicant",
  prestige: "dynasty.PrestigeStatistic", unity: "custom.UnityStatistic",
  values: "dynasty.DynastyValues", scandal: "dynasty.Scandal",
  alliance: "dynasty.Alliance", rivalry: "dynasty.Rivalry",
  branch: "custom.Branch", ceremony: "custom.Ceremony",
  funds: "custom.Funds", createVerb: "dynasty.CreateDynastyInteraction",
};

/* ---------------------------------------------------------------- identity */

export interface Identity {
  typeName: string;
  internalName: string;
  namespace: string;
  displayName: string;
  description: string;
  motto: string;
  slogan: string;
  foundingStory: string;
  icon: ResourceRef;
  crest: ResourceRef;
  colors: { primary: string; secondary: string; accent: string };
  homeWorld: ResourceRef;
  headquarters: ResourceRef;
  venue: ResourceRef;
  lot: ResourceRef;
  signatureObject: ResourceRef;
  requiredPack: string;
  optionalPacks: string[];
}

/* -------------------------------------------------------------- membership */

export const MEMBERSHIP_STRUCTURES = [
  "family_only", "family_and_spouses", "family_spouses_adopted", "family_preferred",
  "invitation_only", "open_recruitment", "trait_based", "relationship_based",
  "career_based", "skill_based", "occult_based", "custom_test", "no_family_requirement",
] as const;
export type MembershipStructure = (typeof MEMBERSHIP_STRUCTURES)[number];

export const MEMBERSHIP_STRUCTURE_LABEL: Record<MembershipStructure, string> = {
  family_only: "Family members only",
  family_and_spouses: "Family and spouses",
  family_spouses_adopted: "Family, spouses and adopted members",
  family_preferred: "Family preferred, outsiders allowed",
  invitation_only: "Invitation-only organization",
  open_recruitment: "Open recruitment",
  trait_based: "Trait-based recruitment",
  relationship_based: "Relationship-based recruitment",
  career_based: "Career-based recruitment",
  skill_based: "Skill-based recruitment",
  occult_based: "Occult-based recruitment",
  custom_test: "Custom test-based recruitment",
  no_family_requirement: "No family requirement",
};

export const FAMILY_RELATIONS = [
  "biological_descendant", "adopted_descendant", "stepchild", "spouse", "fiance",
  "romantic_partner", "parent", "grandparent", "sibling", "half_sibling",
  "step_sibling", "aunt_uncle", "cousin", "extended_family", "secret_child",
  "recognized_illegitimate", "unrecognized_child",
] as const;
export type FamilyRelation = (typeof FAMILY_RELATIONS)[number];

export const FAMILY_RELATION_LABEL: Record<FamilyRelation, string> = {
  biological_descendant: "Biological descendants", adopted_descendant: "Adopted descendants",
  stepchild: "Stepchildren", spouse: "Spouses", fiance: "Fiancés",
  romantic_partner: "Romantic partners", parent: "Parents", grandparent: "Grandparents",
  sibling: "Siblings", half_sibling: "Half-siblings", step_sibling: "Step-siblings",
  aunt_uncle: "Aunts and uncles", cousin: "Cousins", extended_family: "Extended family",
  secret_child: "Secret children", recognized_illegitimate: "Recognized illegitimate children",
  unrecognized_child: "Unrecognized children",
};

/** A named hole punched in "keep membership in the family". */
export interface FamilyException {
  uuid: string;
  label: string;
  /** Role ids this exception applies to; empty means any role. */
  roleIds: string[];
  note: string;
}

export const RECRUITMENT_OPTIONS = [
  "leader_invites", "authorized_roles_invite", "members_nominate", "candidate_requests",
  "candidate_applies", "autonomous_recruitment", "after_task", "after_marriage",
  "after_trait", "after_relationship", "after_skill", "via_ceremony", "purchase",
  "inherit", "forced", "cheat_assigned", "custom_test",
] as const;
export type RecruitmentOption = (typeof RECRUITMENT_OPTIONS)[number];

export const RECRUITMENT_OPTION_LABEL: Record<RecruitmentOption, string> = {
  leader_invites: "Leader may invite anyone",
  authorized_roles_invite: "Authorized roles may invite anyone",
  members_nominate: "Members may nominate candidates",
  candidate_requests: "Candidates may request membership",
  candidate_applies: "Candidates may apply through an interaction",
  autonomous_recruitment: "Candidates may be recruited autonomously",
  after_task: "Join after completing a task",
  after_marriage: "Join after marrying a member",
  after_trait: "Join after gaining a required trait",
  after_relationship: "Join after reaching a relationship level",
  after_skill: "Join after reaching a skill level",
  via_ceremony: "Join through a ceremony",
  purchase: "Membership may be purchased",
  inherit: "Membership may be inherited",
  forced: "Sims may be forced into membership",
  cheat_assigned: "Assignable through cheats",
  custom_test: "Custom test-based recruitment",
};

/** One stage of an approval workflow: apply → sponsor → council → leader → initiate. */
export interface ApprovalStage {
  uuid: string;
  label: string;
  /** Who acts at this stage. */
  actor: "candidate" | "sponsor" | "council" | "leader" | "any_member" | "authorized_role" | "automatic";
  roleIds: string[];
  /** Interaction that performs the stage, if the creator wired one. */
  interaction: ResourceRef;
  test: ResourceRef;
  /** Stage may be skipped when the candidate already qualifies. */
  optional: boolean;
  /** Rejecting here ends the application. */
  canReject: boolean;
  notification: ResourceRef;
}

export interface MembershipRules {
  structure: MembershipStructure;
  qualifyingRelations: FamilyRelation[];
  /** "Keep membership in the family" — hides non-family recruitment. */
  keepInFamily: boolean;
  familyExceptions: FamilyException[];
  allowNonFamily: boolean;
  recruitment: RecruitmentOption[];
  approvalStages: ApprovalStage[];
  customTest: ResourceRef;
  /** A Sim may hold membership in another custom organization at the same time. */
  allowDualMembership: boolean;
  /** EA allows one dynasty per Sim; leaving that alone is the safe default. */
  respectEaSingleDynastyRule: boolean;
}

/* --------------------------------------------------------- membership type */

export interface MembershipType {
  uuid: string;
  displayName: string;
  internalName: string;
  description: string;
  trait: ResourceRef;
  buff: ResourceRef;
  icon: ResourceRef;
  /** Which hierarchy levels this category may occupy. */
  hierarchyAccess: "all" | "leadership" | "senior" | "standard" | "entry" | "none";
  promotionEligible: boolean;
  votingRights: boolean;
  successionEligible: boolean;
  mayRecruit: boolean;
  mayRemove: boolean;
  interactionAccess: "all" | "standard" | "limited" | "none";
  prestigeContribution: number;
  unityContribution: number;
  obligations: string[];
  benefits: string[];
  secret: boolean;
  countsTowardSize: boolean;
  allowOtherOrganizations: boolean;
  /** Bloodline is tracked separately — this flag only says what's typical. */
  typicallyBloodline: boolean;
}

export function blankMembershipType(patch: Partial<MembershipType> = {}): MembershipType {
  return {
    uuid: did("mtype"), displayName: "Member", internalName: "Member", description: "",
    trait: blankRef("Trait"), buff: blankRef("Buff"), icon: blankRef("Icon"),
    hierarchyAccess: "all", promotionEligible: true, votingRights: true,
    successionEligible: true, mayRecruit: false, mayRemove: false,
    interactionAccess: "standard", prestigeContribution: 1, unityContribution: 1,
    obligations: [], benefits: [], secret: false, countsTowardSize: true,
    allowOtherOrganizations: false, typicallyBloodline: false, ...patch,
  };
}

/* -------------------------------------------------------------- hierarchy  */

export const NODE_KINDS = [
  "founder", "supreme_leader", "co_leader", "consort", "heir", "co_heir",
  "successor_pool", "deputy", "regent", "council", "elder", "senior_member",
  "standard_member", "junior_member", "recruit", "applicant", "advisor", "guard",
  "servant", "employee", "specialist", "branch_leader", "regional_leader",
  "household_leader", "outcast", "former_member", "prisoner", "affiliate",
  "ally", "rival", "custom",
] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export const NODE_KIND_LABEL: Record<NodeKind, string> = {
  founder: "Founder", supreme_leader: "Supreme leader", co_leader: "Co-leader",
  consort: "Spouse or consort", heir: "Heir", co_heir: "Co-heir",
  successor_pool: "Successor pool", deputy: "Deputy", regent: "Regent",
  council: "Council", elder: "Elder", senior_member: "Senior member",
  standard_member: "Standard member", junior_member: "Junior member",
  recruit: "Recruit", applicant: "Applicant", advisor: "Advisor", guard: "Guard",
  servant: "Servant", employee: "Employee", specialist: "Specialist",
  branch_leader: "Branch leader", regional_leader: "Regional leader",
  household_leader: "Household leader", outcast: "Outcast",
  former_member: "Former member", prisoner: "Prisoner", affiliate: "Affiliate",
  ally: "Ally", rival: "Rival", custom: "Custom role",
};

/** Node kinds that hold authority — used by leadership and succession checks. */
export const LEADERSHIP_KINDS: NodeKind[] = [
  "founder", "supreme_leader", "co_leader", "regent", "branch_leader", "regional_leader",
];

/** Node kinds that are outside the organization looking in. */
export const NON_MEMBER_KINDS: NodeKind[] = ["outcast", "former_member", "prisoner", "ally", "rival"];

export const APPOINTMENT_METHODS = [
  "founder_assignment", "leader_appointment", "council_appointment", "member_vote",
  "dynasty_vote", "family_vote", "automatic_inheritance", "birth_order", "age",
  "gender_preference", "trait_match", "skill_score", "career_level",
  "prestige_contribution", "relationship_to_leader", "relationship_to_founder",
  "challenge", "duel", "competition", "ceremony", "random", "player_selection",
  "story_progression", "custom_tests",
] as const;
export type AppointmentMethod = (typeof APPOINTMENT_METHODS)[number];

export const APPOINTMENT_METHOD_LABEL: Record<AppointmentMethod, string> = {
  founder_assignment: "Founder assignment", leader_appointment: "Leader appointment",
  council_appointment: "Council appointment", member_vote: "Member vote",
  dynasty_vote: "Organization-wide vote", family_vote: "Family vote",
  automatic_inheritance: "Automatic inheritance", birth_order: "Birth order", age: "Age",
  gender_preference: "Gender preference", trait_match: "Trait match",
  skill_score: "Skill score", career_level: "Career level",
  prestige_contribution: "Prestige contribution", relationship_to_leader: "Relationship to leader",
  relationship_to_founder: "Relationship to founder", challenge: "Challenge", duel: "Duel",
  competition: "Competition", ceremony: "Ceremony", random: "Random selection",
  player_selection: "Player selection", story_progression: "Story progression",
  custom_tests: "Custom tests",
};

export interface RoleRequirements {
  familyRequired: boolean;
  membershipTypeIds: string[];
  ages: string[];
  species: string[];
  occults: string[];
  genderRestriction: "none" | "male" | "female";
  traits: ResourceRef[];
  skills: { skill: ResourceRef; level: number }[];
  careers: { career: ResourceRef; level: number }[];
  relationships: { track: ResourceRef; target: "leader" | "founder" | "any_member"; min: number }[];
  minPrestige: number;
  minUnity: number;
  customTest: ResourceRef;
}

export function blankRoleRequirements(patch: Partial<RoleRequirements> = {}): RoleRequirements {
  return {
    familyRequired: false, membershipTypeIds: [], ages: [], species: [], occults: [],
    genderRestriction: "none", traits: [], skills: [], careers: [], relationships: [],
    minPrestige: 0, minUnity: 0, customTest: blankRef("TestSet"), ...patch,
  };
}

export interface RoleNode {
  uuid: string;
  kind: NodeKind;
  displayName: string;
  internalName: string;
  description: string;
  icon: ResourceRef;
  trait: ResourceRef;
  buff: ResourceRef;
  /** Rank number inside the hierarchy; higher outranks lower. */
  rank: number;
  hierarchyLevel: number;
  minSims: number;
  maxSims: number;
  unique: boolean;
  temporary: boolean;
  secret: boolean;
  requirements: RoleRequirements;
  appointment: AppointmentMethod[];
  removal: AppointmentMethod[];
  allowManualOverride: boolean;
  successionEligible: boolean;
  votingRights: boolean;
  mayRecruit: boolean;
  mayPunish: boolean;
  mayReward: boolean;
  eventIds: string[];
  interactionRefs: ResourceRef[];
  autonomy: { enabled: boolean; weight: number; note: string };
  branchId?: string;
  /** Whiteboard placement. */
  x: number;
  y: number;
  color: string;
  collapsed: boolean;
  notes: string;
}

export function blankRole(patch: Partial<RoleNode> = {}): RoleNode {
  const name = patch.displayName ?? "New Role";
  return {
    uuid: did("role"), kind: "standard_member", displayName: name,
    internalName: sanitizeInternalName(`Role_${name}`), description: "",
    icon: blankRef("Icon"), trait: blankRef("Trait"), buff: blankRef("Buff"),
    rank: 10, hierarchyLevel: 3, minSims: 0, maxSims: 0, unique: false,
    temporary: false, secret: false, requirements: blankRoleRequirements(),
    appointment: ["leader_appointment"], removal: ["leader_appointment"],
    allowManualOverride: true, successionEligible: false, votingRights: false,
    mayRecruit: false, mayPunish: false, mayReward: false, eventIds: [],
    interactionRefs: [], autonomy: { enabled: true, weight: 1, note: "" },
    x: 0, y: 0, color: "cyan", collapsed: false, notes: "", ...patch,
  };
}

export const CONNECTION_TYPES = [
  "reports_to", "commands", "appoints", "elects", "advises", "protects", "serves",
  "supervises", "succeeds", "may_replace", "may_promote", "may_demote",
  "may_recruit", "may_remove", "may_punish", "may_reward", "may_challenge",
  "may_vote_on", "subordinate_to", "equal_to", "allied_with", "opposed_to",
  "part_of", "custom",
] as const;
export type ConnectionType = (typeof CONNECTION_TYPES)[number];

export const CONNECTION_TYPE_LABEL: Record<ConnectionType, string> = {
  reports_to: "Reports to", commands: "Commands", appoints: "Appoints", elects: "Elects",
  advises: "Advises", protects: "Protects", serves: "Serves", supervises: "Supervises",
  succeeds: "Succeeds", may_replace: "May replace", may_promote: "May promote",
  may_demote: "May demote", may_recruit: "May recruit", may_remove: "May remove",
  may_punish: "May punish", may_reward: "May reward", may_challenge: "May challenge",
  may_vote_on: "May vote on", subordinate_to: "Is subordinate to", equal_to: "Is equal to",
  allied_with: "Is allied with", opposed_to: "Is opposed to", part_of: "Is part of",
  custom: "Custom connection",
};

/** Connection types that create an authority chain — cycles here are bugs. */
export const AUTHORITY_CONNECTIONS: ConnectionType[] = [
  "reports_to", "subordinate_to", "commands", "supervises", "serves",
];
export const PROMOTION_CONNECTIONS: ConnectionType[] = ["may_promote", "succeeds", "may_replace"];

export interface Connection {
  uuid: string;
  from: string;
  to: string;
  type: ConnectionType;
  label: string;
  directed: boolean;
  required: boolean;
  minConnected: number;
  maxConnected: number;
  /** Subordinate inherits the superior's permissions unless denied locally. */
  inheritPermissions: boolean;
  successionPriority: number;
  isPromotionPath: boolean;
  isDemotionPath: boolean;
  visibleToPlayers: boolean;
  showInTree: boolean;
  test: ResourceRef;
  tuningRef: ResourceRef;
}

export function blankConnection(from: string, to: string, patch: Partial<Connection> = {}): Connection {
  return {
    uuid: did("conn"), from, to, type: "reports_to", label: "", directed: true,
    required: false, minConnected: 0, maxConnected: 0, inheritPermissions: false,
    successionPriority: 0, isPromotionPath: false, isDemotionPath: false,
    visibleToPlayers: true, showInTree: true, test: blankRef("TestSet"),
    tuningRef: blankRef("Snippet"), ...patch,
  };
}

/** Whiteboard grouping container (a visual branch box or a note cluster). */
export interface NodeGroup {
  uuid: string;
  label: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
  branchId?: string;
  collapsed: boolean;
}

export interface StickyNote {
  uuid: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

export interface Hierarchy {
  roles: RoleNode[];
  connections: Connection[];
  groups: NodeGroup[];
  notes: StickyNote[];
  snapToGrid: boolean;
  gridSize: number;
}

/* ------------------------------------------------------------- succession  */

export const SUCCESSION_RULES = [
  "named_heir", "oldest_child", "youngest_child", "oldest_eligible_descendant",
  "youngest_eligible_descendant", "firstborn", "lastborn", "male_preference",
  "female_preference", "gender_neutral", "biological_only", "adopted_allowed",
  "spouses_allowed", "siblings_allowed", "extended_family_allowed",
  "non_family_allowed", "role_based", "council_selected", "elected",
  "highest_prestige", "highest_skill", "closest_relationship", "trait_based",
  "competition_winner", "duel_winner", "random_eligible", "weighted_score",
  "custom_test_sequence",
] as const;
export type SuccessionRuleKind = (typeof SUCCESSION_RULES)[number];

export const SUCCESSION_RULE_LABEL: Record<SuccessionRuleKind, string> = {
  named_heir: "Named heir", oldest_child: "Oldest child", youngest_child: "Youngest child",
  oldest_eligible_descendant: "Oldest eligible descendant",
  youngest_eligible_descendant: "Youngest eligible descendant",
  firstborn: "Firstborn", lastborn: "Lastborn", male_preference: "Male preference",
  female_preference: "Female preference", gender_neutral: "Gender-neutral succession",
  biological_only: "Biological descendants only", adopted_allowed: "Adopted descendants allowed",
  spouses_allowed: "Spouses allowed", siblings_allowed: "Siblings allowed",
  extended_family_allowed: "Extended family allowed", non_family_allowed: "Non-family successors allowed",
  role_based: "Role-based succession", council_selected: "Council-selected successor",
  elected: "Elected successor", highest_prestige: "Highest prestige member",
  highest_skill: "Highest skill member", closest_relationship: "Closest relationship to leader",
  trait_based: "Trait-based successor", competition_winner: "Competition winner",
  duel_winner: "Duel winner", random_eligible: "Random eligible member",
  weighted_score: "Custom weighted scoring", custom_test_sequence: "Custom test sequence",
};

export interface SuccessionRule {
  uuid: string;
  kind: SuccessionRuleKind;
  label: string;
  /** Restrict this rule to a role or membership type. */
  roleIds: string[];
  membershipTypeIds: string[];
  requiredTrait: ResourceRef;
  requiredSkill: ResourceRef;
  minSkillLevel: number;
  weight: number;
  test: ResourceRef;
  enabled: boolean;
}

export const NO_SUCCESSOR_OUTCOMES = [
  "dissolve", "council_control", "appoint_regent", "election", "pass_to_ally",
  "pass_to_branch", "search_bloodline", "custom_event", "player_dialog",
] as const;
export type NoSuccessorOutcome = (typeof NO_SUCCESSOR_OUTCOMES)[number];

export const NO_SUCCESSOR_LABEL: Record<NoSuccessorOutcome, string> = {
  dissolve: "Organization dissolves", council_control: "Council takes control",
  appoint_regent: "Regent is appointed", election: "Election begins",
  pass_to_ally: "Leadership passes to an ally", pass_to_branch: "Leadership passes to another branch",
  search_bloodline: "Founder's bloodline is searched", custom_event: "Custom event begins",
  player_dialog: "Player receives a selection dialog",
};

export const LEADERSHIP_STRUCTURES = [
  "single", "leader_consort", "co_leaders", "triumvirate", "council",
  "elected_chair", "rotating", "branch_leaders", "regional_leaders",
  "elder_council", "none", "custom",
] as const;
export type LeadershipStructure = (typeof LEADERSHIP_STRUCTURES)[number];

export const LEADERSHIP_STRUCTURE_LABEL: Record<LeadershipStructure, string> = {
  single: "Single leader", leader_consort: "Leader and consort", co_leaders: "Co-leaders",
  triumvirate: "Triumvirate", council: "Council", elected_chair: "Elected chairperson",
  rotating: "Rotating leadership", branch_leaders: "Branch leaders",
  regional_leaders: "Regional leaders", elder_council: "Elder council",
  none: "No formal leader", custom: "Custom leadership structure",
};

export interface CouncilConfig {
  enabled: boolean;
  roleId: string;
  minSize: number;
  maxSize: number;
  votingMethod: "majority" | "supermajority" | "unanimous" | "plurality" | "weighted";
  majorityPercent: number;
  leaderVeto: boolean;
  tieBreaker: "leader" | "eldest" | "highest_prestige" | "random" | "no_decision";
  secretVoting: boolean;
  mayPropose: string[];
  mayVote: string[];
  mayRemoveCouncil: string[];
  termDays: number;
  lifetimeAppointment: boolean;
  successionAuthority: boolean;
  recruitmentAuthority: boolean;
  punishmentAuthority: boolean;
  allianceAuthority: boolean;
}

export interface Succession {
  structure: LeadershipStructure;
  rules: SuccessionRule[];
  noSuccessor: NoSuccessorOutcome;
  council: CouncilConfig;
  /** Leadership transfers automatically when the leader dies. */
  autoTransferOnDeath: boolean;
  /** Announce with a notification and optional ceremony event. */
  announceEventId: string;
}

/* ---------------------------------------------------------------- values   */

export interface DynastyValue {
  uuid: string;
  name: string;
  description: string;
  icon: ResourceRef;
  positiveActions: ResourceRef[];
  negativeActions: ResourceRef[];
  neutralActions: ResourceRef[];
  score: number;
  min: number;
  max: number;
  prestigeEffect: number;
  unityEffect: number;
  relationshipEffect: number;
  buff: ResourceRef;
  notification: ResourceRef;
  rewardId: string;
  punishmentId: string;
  requiredMembershipTypeIds: string[];
  exemptRoleIds: string[];
}

export function blankValue(patch: Partial<DynastyValue> = {}): DynastyValue {
  return {
    uuid: did("value"), name: "New Value", description: "", icon: blankRef("Icon"),
    positiveActions: [], negativeActions: [], neutralActions: [], score: 0,
    min: -100, max: 100, prestigeEffect: 5, unityEffect: 2, relationshipEffect: 0,
    buff: blankRef("Buff"), notification: blankRef("Notification"),
    rewardId: "", punishmentId: "", requiredMembershipTypeIds: [], exemptRoleIds: [], ...patch,
  };
}

/* ----------------------------------------------------------- expectations  */

export const EXPECTATION_TYPES = [
  "required_behavior", "encouraged_behavior", "discouraged_behavior",
  "forbidden_behavior", "role_duty", "scheduled_duty", "lifetime", "progression",
  "ceremony", "relationship", "career", "skill", "family", "financial",
  "reputation", "custom_test",
] as const;
export type ExpectationType = (typeof EXPECTATION_TYPES)[number];

export const EXPECTATION_TYPE_LABEL: Record<ExpectationType, string> = {
  required_behavior: "Required behavior", encouraged_behavior: "Encouraged behavior",
  discouraged_behavior: "Discouraged behavior", forbidden_behavior: "Forbidden behavior",
  role_duty: "Role-specific duty", scheduled_duty: "Scheduled duty",
  lifetime: "Lifetime expectation", progression: "Progression requirement",
  ceremony: "Ceremony requirement", relationship: "Relationship expectation",
  career: "Career expectation", skill: "Skill expectation", family: "Family expectation",
  financial: "Financial expectation", reputation: "Reputation expectation",
  custom_test: "Custom test-based expectation",
};

export interface Expectation {
  uuid: string;
  name: string;
  description: string;
  type: ExpectationType;
  roleIds: string[];
  membershipTypeIds: string[];
  frequency: "once" | "daily" | "weekly" | "monthly" | "per_generation" | "continuous";
  deadlineDays: number;
  trackProgress: boolean;
  objective: ResourceRef;
  successTest: ResourceRef;
  failureTest: ResourceRef;
  prestigeEffect: number;
  unityEffect: number;
  scandalRisk: number;
  rewardId: string;
  punishmentId: string;
  notification: ResourceRef;
  exemptRoleIds: string[];
  autonomous: boolean;
}

export function blankExpectation(patch: Partial<Expectation> = {}): Expectation {
  return {
    uuid: did("exp"), name: "New Expectation", description: "", type: "required_behavior",
    roleIds: [], membershipTypeIds: [], frequency: "weekly", deadlineDays: 7,
    trackProgress: true, objective: blankRef("Objective"), successTest: blankRef("TestSet"),
    failureTest: blankRef("TestSet"), prestigeEffect: 5, unityEffect: 2, scandalRisk: 0,
    rewardId: "", punishmentId: "", notification: blankRef("Notification"),
    exemptRoleIds: [], autonomous: true, ...patch,
  };
}

/* ------------------------------------------------------------ conduct      */

export const CONDUCT_CLASSES = [
  "required", "encouraged", "allowed", "discouraged", "forbidden", "leader_only",
  "role_restricted", "ceremony_only", "emergency_only", "secret", "custom",
] as const;
export type ConductClass = (typeof CONDUCT_CLASSES)[number];

export const CONDUCT_CLASS_LABEL: Record<ConductClass, string> = {
  required: "Required", encouraged: "Encouraged", allowed: "Allowed",
  discouraged: "Discouraged", forbidden: "Forbidden", leader_only: "Leader only",
  role_restricted: "Role-restricted", ceremony_only: "Ceremony only",
  emergency_only: "Emergency only", secret: "Secret", custom: "Custom",
};

export const CONSEQUENCES = [
  "warning", "negative_buff", "prestige_loss", "unity_loss", "relationship_loss",
  "fine", "demotion", "role_removal", "suspension", "scandal", "probation",
  "outcast", "expulsion", "punishment_interaction", "custom",
] as const;
export type ConsequenceKind = (typeof CONSEQUENCES)[number];

export const CONSEQUENCE_LABEL: Record<ConsequenceKind, string> = {
  warning: "Warning", negative_buff: "Negative buff", prestige_loss: "Prestige loss",
  unity_loss: "Unity loss", relationship_loss: "Relationship loss", fine: "Fine",
  demotion: "Demotion", role_removal: "Role removal", suspension: "Temporary suspension",
  scandal: "Scandal", probation: "Probation", outcast: "Outcast status",
  expulsion: "Expulsion", punishment_interaction: "Automatic punishment interaction",
  custom: "Custom consequence",
};

export interface ConductCondition {
  uuid: string;
  field:
    | "role" | "rank" | "membership_type" | "target" | "location" | "venue" | "time"
    | "day" | "relationship" | "trait" | "buff" | "mood" | "skill" | "career"
    | "object" | "event" | "prestige" | "unity" | "scandal" | "custom_test";
  operator: "is" | "is_not" | "gte" | "lte" | "between";
  value: string;
  valueHigh: string;
  ref: ResourceRef;
}

export interface ConductRule {
  uuid: string;
  name: string;
  /** The interaction being governed — EA or project-created, always by reference. */
  interaction: ResourceRef;
  classification: ConductClass;
  roleIds: string[];
  membershipTypeIds: string[];
  conditions: ConductCondition[];
  consequences: { kind: ConsequenceKind; magnitude: number; ref: ResourceRef }[];
  /** Detection needs a listener; tuning-only rules can merely discourage. */
  detection: "interaction_listener" | "test_poll" | "manual_report" | "none";
  notification: ResourceRef;
  enabled: boolean;
}

export function blankConductRule(patch: Partial<ConductRule> = {}): ConductRule {
  return {
    uuid: did("rule"), name: "New Rule", interaction: blankRef("Interaction", "required"),
    classification: "forbidden", roleIds: [], membershipTypeIds: [], conditions: [],
    consequences: [{ kind: "prestige_loss", magnitude: 10, ref: blankRef("Loot") }],
    detection: "interaction_listener", notification: blankRef("Notification"),
    enabled: true, ...patch,
  };
}

/* -------------------------------------------------- traits and bloodline   */

export const TRAIT_PURPOSES = [
  "general_membership", "membership_type", "role", "rank", "bloodline",
  "founder_lineage", "heir_eligibility", "leadership", "loyalty", "disloyalty",
  "favored", "disgraced", "probation", "outcast", "former_member", "secret_member",
  "rival_member", "allied_member", "enemy", "custom",
] as const;
export type TraitPurpose = (typeof TRAIT_PURPOSES)[number];

export const TRAIT_PURPOSE_LABEL: Record<TraitPurpose, string> = {
  general_membership: "General membership", membership_type: "Specific membership type",
  role: "Role", rank: "Rank", bloodline: "Bloodline", founder_lineage: "Founder lineage",
  heir_eligibility: "Heir eligibility", leadership: "Leadership", loyalty: "Loyalty",
  disloyalty: "Disloyalty", favored: "Favored member", disgraced: "Disgraced member",
  probation: "Probation", outcast: "Outcast", former_member: "Former member",
  secret_member: "Secret member", rival_member: "Rival organization member",
  allied_member: "Allied organization member", enemy: "Enemy", custom: "Custom status",
};

export interface DynastyTrait {
  uuid: string;
  purpose: TraitPurpose;
  displayName: string;
  description: string;
  icon: ResourceRef;
  /** Link to a Trait Builder record instead of duplicating the definition. */
  traitRef: ResourceRef;
  hidden: boolean;
  inherited: boolean;
  temporary: boolean;
  durationHours: number;
  removalConditions: string[];
  buffs: ResourceRef[];
  unlockInteractions: ResourceRef[];
  autonomyModifier: number;
  relationshipModifier: number;
  skillModifiers: { skill: ResourceRef; multiplier: number }[];
  careerModifiers: { career: ResourceRef; multiplier: number }[];
  statisticModifiers: { stat: ResourceRef; delta: number }[];
  lootOnAdd: ResourceRef;
  lootOnRemove: ResourceRef;
  test: ResourceRef;
  /** Which role or membership type this trait is bound to, when applicable. */
  boundToId: string;
}

export function blankDynastyTrait(patch: Partial<DynastyTrait> = {}): DynastyTrait {
  return {
    uuid: did("dtrait"), purpose: "general_membership", displayName: "New Trait",
    description: "", icon: blankRef("Icon"), traitRef: blankRef("Trait"), hidden: false,
    inherited: false, temporary: false, durationHours: 0, removalConditions: [],
    buffs: [], unlockInteractions: [], autonomyModifier: 0, relationshipModifier: 0,
    skillModifiers: [], careerModifiers: [], statisticModifiers: [],
    lootOnAdd: blankRef("Loot"), lootOnRemove: blankRef("Loot"), test: blankRef("TestSet"),
    boundToId: "", ...patch,
  };
}

export const BLOODLINE_KINDS = [
  "founder", "descendant", "strong", "weak", "diluted", "dormant", "adopted",
  "married_in", "secret", "illegitimate", "chosen", "non_hereditary",
] as const;
export type BloodlineKind = (typeof BLOODLINE_KINDS)[number];

export const BLOODLINE_KIND_LABEL: Record<BloodlineKind, string> = {
  founder: "Founder bloodline", descendant: "Descendant bloodline", strong: "Strong bloodline",
  weak: "Weak bloodline", diluted: "Diluted bloodline", dormant: "Dormant bloodline",
  adopted: "Adopted lineage", married_in: "Married-in lineage", secret: "Secret lineage",
  illegitimate: "Illegitimate lineage", chosen: "Chosen lineage",
  non_hereditary: "Non-hereditary organization",
};

export const INHERITANCE_MODES = [
  "all_biological", "selected_children", "random_chance", "trait_based_chance",
  "parent_role_chance", "two_member_requirement", "generational_weakening",
  "generational_strengthening", "skip_generations", "adoption_inheritance",
  "ceremony_based", "custom_tests",
] as const;
export type InheritanceMode = (typeof INHERITANCE_MODES)[number];

export const INHERITANCE_MODE_LABEL: Record<InheritanceMode, string> = {
  all_biological: "All biological children", selected_children: "Selected children",
  random_chance: "Random chance", trait_based_chance: "Trait-based chance",
  parent_role_chance: "Parent role-based chance", two_member_requirement: "Both parents must be members",
  generational_weakening: "Generational weakening", generational_strengthening: "Generational strengthening",
  skip_generations: "Skip generations", adoption_inheritance: "Adoption inheritance",
  ceremony_based: "Ceremony-based inheritance", custom_tests: "Custom inheritance tests",
};

export interface BloodlineConfig {
  enabled: boolean;
  kinds: BloodlineKind[];
  inheritance: InheritanceMode;
  chancePercent: number;
  generationsTracked: number;
  perGenerationDelta: number;
  founderTrait: ResourceRef;
  descendantTrait: ResourceRef;
  /**
   * Ancestry never implies membership. Leaving this false is what allows an
   * exiled descendant to keep their bloodline trait with no rights at all.
   */
  bloodlineGrantsMembership: boolean;
  bloodlineGrantsSuccession: boolean;
  test: ResourceRef;
}

/* ------------------------------------------------------------ permissions  */

export const PERMISSIONS = [
  "invite_members", "approve_members", "reject_members", "remove_members",
  "reinstate_members", "promote_members", "demote_members", "appoint_heir",
  "remove_heir", "appoint_leader", "challenge_leader", "vote", "call_vote",
  "form_alliance", "end_alliance", "declare_rivalry", "call_gathering",
  "start_ceremony", "spend_funds", "modify_rules", "punish_members",
  "pardon_members", "view_secret_members", "view_succession", "view_finances",
  "view_scandals", "assign_duties", "create_branch", "dissolve_branch",
] as const;
export type PermissionKey = (typeof PERMISSIONS)[number];

export const PERMISSION_LABEL: Record<PermissionKey, string> = {
  invite_members: "Invite members", approve_members: "Approve members",
  reject_members: "Reject members", remove_members: "Remove members",
  reinstate_members: "Reinstate members", promote_members: "Promote members",
  demote_members: "Demote members", appoint_heir: "Appoint heir", remove_heir: "Remove heir",
  appoint_leader: "Appoint leader", challenge_leader: "Challenge leader", vote: "Vote",
  call_vote: "Call vote", form_alliance: "Form alliance", end_alliance: "End alliance",
  declare_rivalry: "Declare rivalry", call_gathering: "Call gathering",
  start_ceremony: "Start ceremony", spend_funds: "Spend funds", modify_rules: "Modify rules",
  punish_members: "Punish members", pardon_members: "Pardon members",
  view_secret_members: "View secret members", view_succession: "View succession",
  view_finances: "View finances", view_scandals: "View scandals",
  assign_duties: "Assign duties", create_branch: "Create branch", dissolve_branch: "Dissolve branch",
};

export const PERMISSION_STATES = [
  "allowed", "denied", "inherited", "requires_approval", "requires_vote",
  "requires_relationship", "requires_prestige", "requires_test",
] as const;
export type PermissionState = (typeof PERMISSION_STATES)[number];

export const PERMISSION_STATE_LABEL: Record<PermissionState, string> = {
  allowed: "Allowed", denied: "Denied", inherited: "Inherited from superior",
  requires_approval: "Requires approval", requires_vote: "Requires vote",
  requires_relationship: "Requires relationship", requires_prestige: "Requires prestige",
  requires_test: "Requires custom test",
};

export interface CustomPermission {
  uuid: string;
  key: string;
  label: string;
  description: string;
}

/** roleId → permission key → state. Sparse: absent means "denied". */
export interface PermissionMatrix {
  cells: Record<string, Record<string, PermissionState>>;
  custom: CustomPermission[];
  /** Threshold used by requires_prestige cells. */
  prestigeThreshold: number;
}

/* --------------------------------------------------------------- branches  */

export interface Branch {
  uuid: string;
  name: string;
  description: string;
  crest: ResourceRef;
  leaderRoleId: string;
  roleIds: string[];
  parentBranchId: string;
  /** Branch-level overrides; empty means "inherit from the organization". */
  membershipOverride?: Partial<MembershipRules>;
  valueIds: string[];
  successionRuleIds: string[];
  prestigeSeparate: boolean;
  headquarters: ResourceRef;
  independentPermissions: boolean;
  separateIdentity: boolean;
  rivalBranchIds: string[];
}

export function blankBranch(patch: Partial<Branch> = {}): Branch {
  return {
    uuid: did("branch"), name: "New Branch", description: "", crest: blankRef("Icon"),
    leaderRoleId: "", roleIds: [], parentBranchId: "", valueIds: [],
    successionRuleIds: [], prestigeSeparate: false, headquarters: blankRef("Lot"),
    independentPermissions: false, separateIdentity: false, rivalBranchIds: [], ...patch,
  };
}

/* ------------------------------------------------- prestige / unity / funds */

export interface ProgressionLevel {
  uuid: string;
  name: string;
  threshold: number;
  unlockRoleIds: string[];
  unlockInteractions: ResourceRef[];
  unlockEventIds: string[];
  unlockVisualIds: string[];
  reward: ResourceRef;
}

export interface ScoreSource {
  uuid: string;
  label: string;
  amount: number;
  trigger: "interaction" | "event" | "expectation" | "value" | "scandal" | "time" | "custom";
  ref: ResourceRef;
}

export interface PrestigeConfig {
  enabled: boolean;
  /** Player-facing name; the statistic itself is always project-owned. */
  name: string;
  statistic: ResourceRef;
  start: number;
  min: number;
  max: number;
  decayPerWeek: number;
  gains: ScoreSource[];
  losses: ScoreSource[];
  memberContribution: number;
  roleContribution: number;
  householdContribution: number;
  levels: ProgressionLevel[];
  dynastyRewards: ResourceRef[];
  dynastyPenalties: ResourceRef[];
}

export interface UnityConfig {
  enabled: boolean;
  name: string;
  statistic: ResourceRef;
  start: number;
  min: number;
  max: number;
  gains: ScoreSource[];
  losses: ScoreSource[];
  relationshipWeight: number;
  leadershipWeight: number;
  scandalWeight: number;
  violationWeight: number;
  rivalryWeight: number;
  lowConsequences: ResourceRef[];
  highRewards: ResourceRef[];
  rebellionThreshold: number;
  challengeThreshold: number;
  departureThreshold: number;
  collapseThreshold: number;
}

export const RESOURCE_TYPES = [
  "simoleons", "influence", "fame", "reputation", "custom_currency", "inventory",
  "collectibles", "property", "venues", "businesses", "points", "custom_statistic",
] as const;
export type FundResourceType = (typeof RESOURCE_TYPES)[number];

export const RESOURCE_TYPE_LABEL: Record<FundResourceType, string> = {
  simoleons: "Simoleons", influence: "Influence", fame: "Fame", reputation: "Reputation",
  custom_currency: "Custom currency", inventory: "Inventory objects",
  collectibles: "Collectibles", property: "Property", venues: "Venues",
  businesses: "Businesses", points: "Organization points", custom_statistic: "Custom statistic",
};

export interface FundsConfig {
  enabled: boolean;
  name: string;
  types: FundResourceType[];
  statistic: ResourceRef;
  contributorRoleIds: string[];
  withdrawRoleIds: string[];
  duesAmount: number;
  duesFrequency: "none" | "daily" | "weekly" | "monthly";
  fineAmount: number;
  weeklyIncome: number;
  weeklyExpenses: number;
  inheritOnDeath: boolean;
  notifications: boolean;
  misuseScandalId: string;
  allowEmbezzlement: boolean;
  notes: string;
}

/* -------------------------------------------------- alliances and rivalries */

export const RELATION_TYPES = [
  "allied", "friendly", "neutral", "competitive", "rival", "enemy", "vassal",
  "patron", "protected", "trade_partner", "marriage_alliance", "secret_alliance", "custom",
] as const;
export type RelationType = (typeof RELATION_TYPES)[number];

export const RELATION_TYPE_LABEL: Record<RelationType, string> = {
  allied: "Allied", friendly: "Friendly", neutral: "Neutral", competitive: "Competitive",
  rival: "Rival", enemy: "Enemy", vassal: "Vassal", patron: "Patron",
  protected: "Protected", trade_partner: "Trade partner",
  marriage_alliance: "Marriage alliance", secret_alliance: "Secret alliance", custom: "Custom",
};

export interface DynastyRelation {
  uuid: string;
  displayName: string;
  description: string;
  type: RelationType;
  /** The other organization: another project dynasty, or an external reference. */
  target: ResourceRef;
  score: number;
  startingState: RelationType;
  formationTest: ResourceRef;
  endingTest: ResourceRef;
  memberRelationshipDelta: number;
  prestigeEffect: number;
  unityEffect: number;
  eventIds: string[];
  interactions: ResourceRef[];
  autonomyEffect: number;
  sharedEnemies: boolean;
  sharedAllies: boolean;
  betrayalConditions: string[];
  /** Network whiteboard placement. */
  x: number;
  y: number;
}

export function blankRelation(patch: Partial<DynastyRelation> = {}): DynastyRelation {
  return {
    uuid: did("rel"), displayName: "New Relationship", description: "", type: "allied",
    target: blankRef("Dynasty", "required"), score: 0, startingState: "neutral",
    formationTest: blankRef("TestSet"), endingTest: blankRef("TestSet"),
    memberRelationshipDelta: 10, prestigeEffect: 0, unityEffect: 0, eventIds: [],
    interactions: [], autonomyEffect: 0, sharedEnemies: false, sharedAllies: false,
    betrayalConditions: [], x: 0, y: 0, ...patch,
  };
}

/* --------------------------------------------------------------- scandals  */

export const SCANDAL_TRIGGERS = [
  "forbidden_romance", "betrayal", "crime", "rule_violation", "public_fight",
  "divorce", "secret_child", "leadership_challenge", "failed_ceremony",
  "financial_misconduct", "rival_relationship", "leaking_secrets",
  "refusing_duties", "disgrace", "career_failure", "public_humiliation",
  "custom_interaction", "custom_test",
] as const;
export type ScandalTrigger = (typeof SCANDAL_TRIGGERS)[number];

export const SCANDAL_TRIGGER_LABEL: Record<ScandalTrigger, string> = {
  forbidden_romance: "Forbidden romance", betrayal: "Betrayal", crime: "Crime",
  rule_violation: "Rule violation", public_fight: "Public fight", divorce: "Divorce",
  secret_child: "Secret child", leadership_challenge: "Leadership challenge",
  failed_ceremony: "Failed ceremony", financial_misconduct: "Financial misconduct",
  rival_relationship: "Relationship with a rival", leaking_secrets: "Leaking secrets",
  refusing_duties: "Refusing duties", disgrace: "Disgracing the organization",
  career_failure: "Career failure", public_humiliation: "Public humiliation",
  custom_interaction: "Custom interaction", custom_test: "Custom test",
};

export interface Scandal {
  uuid: string;
  name: string;
  description: string;
  triggers: ScandalTrigger[];
  triggerInteraction: ResourceRef;
  triggerTest: ResourceRef;
  severity: 1 | 2 | 3 | 4 | 5;
  publicScandal: boolean;
  affectedRoleIds: string[];
  prestigeLoss: number;
  unityLoss: number;
  relationshipDelta: number;
  buff: ResourceRef;
  notification: ResourceRef;
  durationDays: number;
  escalatesToId: string;
  resolutions: { label: string; roleIds: string[]; prestigeDelta: number; test: ResourceRef }[];
  allowCoverUp: boolean;
  coverUpRoleIds: string[];
  punishmentId: string;
  allowForgiveness: boolean;
}

export function blankScandal(patch: Partial<Scandal> = {}): Scandal {
  return {
    uuid: did("scandal"), name: "New Scandal", description: "", triggers: [],
    triggerInteraction: blankRef("Interaction"), triggerTest: blankRef("TestSet"),
    severity: 3, publicScandal: true, affectedRoleIds: [], prestigeLoss: 25,
    unityLoss: 10, relationshipDelta: -20, buff: blankRef("Buff"),
    notification: blankRef("Notification"), durationDays: 7, escalatesToId: "",
    resolutions: [], allowCoverUp: true, coverUpRoleIds: [], punishmentId: "",
    allowForgiveness: true, ...patch,
  };
}

/* --------------------------------------------------- rewards / punishments */

export const REWARD_KINDS = [
  "promotion", "new_role", "prestige", "unity", "money", "trait", "buff", "object",
  "relationship_gain", "title", "special_interaction", "succession_eligibility",
  "public_recognition", "custom_loot",
] as const;
export type RewardKind = (typeof REWARD_KINDS)[number];

export const REWARD_KIND_LABEL: Record<RewardKind, string> = {
  promotion: "Promotion", new_role: "New role", prestige: "Prestige", unity: "Unity",
  money: "Money", trait: "Trait", buff: "Buff", object: "Object",
  relationship_gain: "Relationship gain", title: "Title",
  special_interaction: "Special interaction", succession_eligibility: "Succession eligibility",
  public_recognition: "Public recognition", custom_loot: "Custom loot",
};

export const PUNISHMENT_KINDS = [
  "warning", "fine", "buff", "relationship_loss", "prestige_loss", "unity_loss",
  "demotion", "role_removal", "suspension", "probation", "outcast", "banishment",
  "expulsion", "lose_succession", "public_disgrace", "forced_task", "custom_loot",
] as const;
export type PunishmentKind = (typeof PUNISHMENT_KINDS)[number];

export const PUNISHMENT_KIND_LABEL: Record<PunishmentKind, string> = {
  warning: "Warning", fine: "Fine", buff: "Buff", relationship_loss: "Relationship loss",
  prestige_loss: "Prestige loss", unity_loss: "Unity loss", demotion: "Demotion",
  role_removal: "Role removal", suspension: "Suspension", probation: "Probation",
  outcast: "Outcast status", banishment: "Banishment", expulsion: "Expulsion",
  lose_succession: "Loss of succession eligibility", public_disgrace: "Public disgrace",
  forced_task: "Forced task", custom_loot: "Custom loot",
};

export interface Reward {
  uuid: string;
  name: string;
  description: string;
  kind: RewardKind;
  magnitude: number;
  ref: ResourceRef;
  notification: ResourceRef;
  /** Roles allowed to grant this. Empty means leadership only. */
  issuerRoleIds: string[];
}

export interface Punishment {
  uuid: string;
  name: string;
  description: string;
  kind: PunishmentKind;
  magnitude: number;
  ref: ResourceRef;
  notification: ResourceRef;
  /** Roles authorized to issue it — validation flags punishments nobody can apply. */
  issuerRoleIds: string[];
  appealable: boolean;
  durationDays: number;
}

/* ---------------------------------------------- interactions and events    */

export interface DynastyInteraction {
  uuid: string;
  label: string;
  /** Canonical action this represents, so validation can find gaps. */
  action: string;
  /** EA reference, cloned project interaction, or a builder-created one. */
  ref: ResourceRef;
  source: "ea_reference" | "cloned" | "project" | "unset";
  actorRoleIds: string[];
  targetRoleIds: string[];
  requiredPermission: PermissionKey | "";
  test: ResourceRef;
  animationSet: ResourceRef;
  sequence: ResourceRef;
  autonomous: boolean;
  enabled: boolean;
}

/** The canonical dynasty action list the builder can wire up. */
export const DYNASTY_ACTIONS: { action: string; label: string; permission?: PermissionKey }[] = [
  { action: "view_dynasty", label: "View Organization" },
  { action: "view_hierarchy", label: "View Hierarchy" },
  { action: "view_member", label: "View Member Profile" },
  { action: "invite_to_join", label: "Invite to Join", permission: "invite_members" },
  { action: "apply_to_join", label: "Apply to Join" },
  { action: "approve_applicant", label: "Approve Applicant", permission: "approve_members" },
  { action: "reject_applicant", label: "Reject Applicant", permission: "reject_members" },
  { action: "leave", label: "Leave Organization" },
  { action: "remove_member", label: "Remove Member", permission: "remove_members" },
  { action: "promote_member", label: "Promote Member", permission: "promote_members" },
  { action: "demote_member", label: "Demote Member", permission: "demote_members" },
  { action: "appoint_role", label: "Appoint Role", permission: "assign_duties" },
  { action: "resign_role", label: "Resign Role" },
  { action: "name_heir", label: "Name Heir", permission: "appoint_heir" },
  { action: "remove_heir", label: "Remove Heir", permission: "remove_heir" },
  { action: "challenge_leader", label: "Challenge Leader", permission: "challenge_leader" },
  { action: "hold_vote", label: "Hold Vote", permission: "call_vote" },
  { action: "council_meeting", label: "Call Council Meeting", permission: "call_gathering" },
  { action: "gathering", label: "Call Gathering", permission: "call_gathering" },
  { action: "praise_member", label: "Praise Member" },
  { action: "warn_member", label: "Warn Member", permission: "punish_members" },
  { action: "punish_member", label: "Punish Member", permission: "punish_members" },
  { action: "pardon_member", label: "Pardon Member", permission: "pardon_members" },
  { action: "demand_loyalty", label: "Demand Loyalty" },
  { action: "swear_loyalty", label: "Swear Loyalty" },
  { action: "pay_dues", label: "Pay Dues" },
  { action: "donate", label: "Donate to Organization" },
  { action: "request_funds", label: "Request Funds", permission: "spend_funds" },
  { action: "form_alliance", label: "Form Alliance", permission: "form_alliance" },
  { action: "end_alliance", label: "End Alliance", permission: "end_alliance" },
  { action: "declare_rivalry", label: "Declare Rivalry", permission: "declare_rivalry" },
  { action: "reveal_secret_member", label: "Reveal Secret Member", permission: "view_secret_members" },
  { action: "expose_scandal", label: "Expose Scandal" },
  { action: "cover_up_scandal", label: "Cover Up Scandal" },
  { action: "start_ceremony", label: "Start Ceremony", permission: "start_ceremony" },
  { action: "view_rules", label: "View Rules" },
  { action: "view_values", label: "View Values" },
];

export const EVENT_KINDS = [
  "founding", "initiation", "coronation", "leadership_appointment", "succession",
  "heir_announcement", "promotion", "council_meeting", "member_vote", "trial",
  "punishment_hearing", "wedding_alliance", "funeral", "memorial", "annual_gathering",
  "recruitment", "competition", "duel", "challenge", "feast", "fundraiser",
  "award_ceremony", "secret_meeting", "custom",
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  founding: "Founding ceremony", initiation: "Initiation", coronation: "Coronation",
  leadership_appointment: "Leadership appointment", succession: "Succession ceremony",
  heir_announcement: "Heir announcement", promotion: "Promotion ceremony",
  council_meeting: "Council meeting", member_vote: "Member vote", trial: "Trial",
  punishment_hearing: "Punishment hearing", wedding_alliance: "Wedding alliance",
  funeral: "Funeral", memorial: "Memorial", annual_gathering: "Annual gathering",
  recruitment: "Recruitment event", competition: "Competition", duel: "Duel",
  challenge: "Challenge", feast: "Feast", fundraiser: "Fundraiser",
  award_ceremony: "Award ceremony", secret_meeting: "Secret meeting", custom: "Custom event",
};

export interface DynastyEvent {
  uuid: string;
  name: string;
  kind: EventKind;
  description: string;
  hostRoleId: string;
  requiredRoleIds: string[];
  requiredMembers: number;
  optionalAttendees: boolean;
  venue: ResourceRef;
  objects: ResourceRef[];
  goals: ResourceRef[];
  requiredInteractions: ResourceRef[];
  situation: ResourceRef;
  rewardIds: string[];
  punishmentIds: string[];
  prestigeDelta: number;
  unityDelta: number;
  scandalRisk: number;
  outcomes: { label: string; test: ResourceRef; prestigeDelta: number; nextEventId: string }[];
  notification: ResourceRef;
}

export function blankEvent(patch: Partial<DynastyEvent> = {}): DynastyEvent {
  return {
    uuid: did("event"), name: "New Event", kind: "annual_gathering", description: "",
    hostRoleId: "", requiredRoleIds: [], requiredMembers: 2, optionalAttendees: true,
    venue: blankRef("Venue"), objects: [], goals: [], requiredInteractions: [],
    situation: blankRef("Situation"), rewardIds: [], punishmentIds: [], prestigeDelta: 10,
    unityDelta: 5, scandalRisk: 0, outcomes: [], notification: blankRef("Notification"), ...patch,
  };
}

/* --------------------------------------------------------------- autonomy  */

export const AUTOMATION_KEYS = [
  "assign_heirs", "fill_roles", "recruit", "remove_invalid", "promote", "demote",
  "pass_leadership_on_death", "pass_roles_on_death", "add_spouses", "add_children",
  "add_adopted", "recognize_secret_children", "maintain_minimum", "generate_rivalries",
  "generate_alliances", "schedule_events", "enforce_rules",
] as const;
export type AutomationKey = (typeof AUTOMATION_KEYS)[number];

export const AUTOMATION_LABEL: Record<AutomationKey, string> = {
  assign_heirs: "Automatically assign eligible heirs",
  fill_roles: "Automatically fill empty roles",
  recruit: "Automatically recruit members",
  remove_invalid: "Automatically remove invalid members",
  promote: "Automatically promote members",
  demote: "Automatically demote members",
  pass_leadership_on_death: "Automatically pass leadership after death",
  pass_roles_on_death: "Automatically pass roles after death",
  add_spouses: "Automatically add spouses",
  add_children: "Automatically add children",
  add_adopted: "Automatically add adopted children",
  recognize_secret_children: "Automatically recognize secret children",
  maintain_minimum: "Automatically maintain minimum membership",
  generate_rivalries: "Automatically generate rivalries",
  generate_alliances: "Automatically generate alliances",
  schedule_events: "Automatically schedule events",
  enforce_rules: "Automatically enforce rules",
};

export type AudienceKey = "active" | "played" | "unplayed" | "npc";

export const AUDIENCE_LABEL: Record<AudienceKey, string> = {
  active: "Active household", played: "Played households",
  unplayed: "Unplayed households", npc: "NPC Sims",
};

export interface AutonomyConfig {
  /** Per-audience automation switches. The active household defaults to off. */
  matrix: Record<AudienceKey, Partial<Record<AutomationKey, boolean>>>;
  disableAll: boolean;
  playerControlledOnly: boolean;
  /**
   * Hard guard: automation must never silently reassign a player-controlled
   * Sim's leadership or membership unless the creator opts in explicitly.
   */
  allowSilentPlayerChanges: boolean;
  tickHours: number;
  notes: string;
}

/* ------------------------------------------- notifications / progression   */

export interface StoryBeat {
  uuid: string;
  label: string;
  trigger:
    | "founding" | "member_joined" | "member_left" | "promotion" | "demotion"
    | "leader_death" | "succession" | "scandal" | "alliance" | "rivalry"
    | "prestige_level" | "unity_low" | "event_complete" | "custom";
  notification: ResourceRef;
  audiences: AudienceKey[];
  onlyIfVisible: boolean;
  cooldownHours: number;
  enabled: boolean;
}

/* ----------------------------------------------------------- visual / UI   */

export interface VisualIdentity {
  crest: ResourceRef;
  banner: ResourceRef;
  memberBadge: ResourceRef;
  roleIcons: Record<string, string>;
  palette: { primary: string; secondary: string; accent: string; text: string };
  uiMode: "custom_dialog" | "interaction_menu" | "ea_panel_readonly";
  panelFields: string[];
  /** Never true — kept as an explicit, visible refusal in the model. */
  overrideEaPanel: false;
}

/* -------------------------------------------------------------- document   */

export interface DynastyDoc {
  version: number;
  uuid: string;
  projectId: string;
  origin: "blank" | "template" | "cloned" | "imported" | "ea_style";
  templateId?: string;

  compatMode: CompatMode;
  terms: Terminology;
  identity: Identity;

  size: {
    maxMembers: number;
    minMembers: number;
    allowMultipleHouseholds: boolean;
    allowMultipleWorlds: boolean;
    allowActiveHousehold: boolean;
    allowNpc: boolean;
    allowPlayed: boolean;
    allowUnplayed: boolean;
    allowHomeless: boolean;
    allowOccult: boolean;
    allowPets: boolean;
  };

  membership: MembershipRules;
  membershipTypes: MembershipType[];
  hierarchy: Hierarchy;
  succession: Succession;
  values: DynastyValue[];
  expectations: Expectation[];
  conduct: ConductRule[];
  traits: DynastyTrait[];
  bloodline: BloodlineConfig;
  permissions: PermissionMatrix;
  branches: Branch[];
  prestige: PrestigeConfig;
  unity: UnityConfig;
  funds: FundsConfig;
  relations: DynastyRelation[];
  scandals: Scandal[];
  rewards: Reward[];
  punishments: Punishment[];
  interactions: DynastyInteraction[];
  events: DynastyEvent[];
  autonomy: AutonomyConfig;
  story: StoryBeat[];
  visual: VisualIdentity;

  ids: { manual: boolean; tuningDecimal: string; tuningHex: string; lastGeneratedAt: number };
  createdAt: number;
  updatedAt: number;
  lastExportedAt?: number;
}

/* -------------------------------------------------------------- factories  */

function defaultAutonomyMatrix(): AutonomyConfig["matrix"] {
  return {
    // The player's own household is left alone by default. That is the whole
    // point of the "never silently alter player leadership" rule.
    active: {},
    played: { pass_leadership_on_death: true, assign_heirs: true },
    unplayed: {
      assign_heirs: true, fill_roles: true, pass_leadership_on_death: true,
      pass_roles_on_death: true, maintain_minimum: true,
    },
    npc: {
      assign_heirs: true, fill_roles: true, recruit: true, promote: true,
      pass_leadership_on_death: true, pass_roles_on_death: true,
      maintain_minimum: true, schedule_events: true,
    },
  };
}

export function blankPermissionMatrix(): PermissionMatrix {
  return { cells: {}, custom: [], prestigeThreshold: 50 };
}

export function blankDynastyDoc(patch: Partial<DynastyDoc> = {}): DynastyDoc {
  const now = Date.now();
  const typeName = patch.identity?.typeName ?? "New Dynasty";
  return {
    version: DYNASTY_DOC_VERSION,
    uuid: did("dyn"),
    projectId: patch.projectId ?? "",
    origin: "blank",
    compatMode: "custom_roles",
    terms: { ...DEFAULT_TERMS },
    identity: {
      typeName,
      internalName: sanitizeInternalName(`Dynasty_${typeName}`),
      namespace: "MyMods",
      displayName: typeName,
      description: "",
      motto: "",
      slogan: "",
      foundingStory: "",
      icon: blankRef("Icon"),
      crest: blankRef("Icon"),
      colors: { primary: "#2dd4bf", secondary: "#0f172a", accent: "#f59e0b" },
      homeWorld: blankRef("World"),
      headquarters: blankRef("Lot"),
      venue: blankRef("Venue"),
      lot: blankRef("Lot"),
      signatureObject: blankRef("Object"),
      requiredPack: "Royalty & Legacy",
      optionalPacks: [],
    },
    size: {
      maxMembers: 24, minMembers: 1, allowMultipleHouseholds: true,
      allowMultipleWorlds: true, allowActiveHousehold: true, allowNpc: true,
      allowPlayed: true, allowUnplayed: true, allowHomeless: false,
      allowOccult: true, allowPets: false,
    },
    membership: {
      structure: "family_and_spouses",
      qualifyingRelations: ["biological_descendant", "adopted_descendant", "spouse"],
      keepInFamily: true,
      familyExceptions: [],
      allowNonFamily: false,
      recruitment: ["leader_invites"],
      approvalStages: [],
      customTest: blankRef("TestSet"),
      allowDualMembership: false,
      respectEaSingleDynastyRule: true,
    },
    membershipTypes: [],
    hierarchy: { roles: [], connections: [], groups: [], notes: [], snapToGrid: true, gridSize: 20 },
    succession: {
      structure: "single",
      rules: [],
      noSuccessor: "council_control",
      council: {
        enabled: false, roleId: "", minSize: 3, maxSize: 7, votingMethod: "majority",
        majorityPercent: 51, leaderVeto: false, tieBreaker: "leader", secretVoting: false,
        mayPropose: [], mayVote: [], mayRemoveCouncil: [], termDays: 0,
        lifetimeAppointment: true, successionAuthority: false, recruitmentAuthority: false,
        punishmentAuthority: false, allianceAuthority: false,
      },
      autoTransferOnDeath: true,
      announceEventId: "",
    },
    values: [],
    expectations: [],
    conduct: [],
    traits: [],
    bloodline: {
      enabled: true, kinds: ["founder", "descendant"], inheritance: "all_biological",
      chancePercent: 100, generationsTracked: 5, perGenerationDelta: 0,
      founderTrait: blankRef("Trait"), descendantTrait: blankRef("Trait"),
      bloodlineGrantsMembership: false, bloodlineGrantsSuccession: true,
      test: blankRef("TestSet"),
    },
    permissions: blankPermissionMatrix(),
    branches: [],
    prestige: {
      enabled: true, name: "Prestige", statistic: blankRef("Statistic"), start: 0,
      min: 0, max: 1000, decayPerWeek: 0, gains: [], losses: [], memberContribution: 1,
      roleContribution: 1, householdContribution: 1, levels: [], dynastyRewards: [],
      dynastyPenalties: [],
    },
    unity: {
      enabled: true, name: "Unity", statistic: blankRef("Statistic"), start: 50,
      min: 0, max: 100, gains: [], losses: [], relationshipWeight: 1,
      leadershipWeight: 1, scandalWeight: 2, violationWeight: 1, rivalryWeight: 1,
      lowConsequences: [], highRewards: [], rebellionThreshold: 15,
      challengeThreshold: 25, departureThreshold: 10, collapseThreshold: 0,
    },
    funds: {
      enabled: false, name: "Funds", types: ["simoleons"], statistic: blankRef("Statistic"),
      contributorRoleIds: [], withdrawRoleIds: [], duesAmount: 0, duesFrequency: "none",
      fineAmount: 250, weeklyIncome: 0, weeklyExpenses: 0, inheritOnDeath: true,
      notifications: true, misuseScandalId: "", allowEmbezzlement: false, notes: "",
    },
    relations: [],
    scandals: [],
    rewards: [],
    punishments: [],
    interactions: [],
    events: [],
    autonomy: {
      matrix: defaultAutonomyMatrix(), disableAll: false, playerControlledOnly: false,
      allowSilentPlayerChanges: false, tickHours: 24, notes: "",
    },
    story: [],
    visual: {
      crest: blankRef("Icon"), banner: blankRef("Icon"), memberBadge: blankRef("Icon"),
      roleIcons: {}, palette: { primary: "#2dd4bf", secondary: "#0f172a", accent: "#f59e0b", text: "#e2e8f0" },
      uiMode: "custom_dialog",
      panelFields: ["name", "crest", "motto", "leader", "heir", "members", "prestige", "unity"],
      overrideEaPanel: false,
    },
    ids: { manual: false, tuningDecimal: "", tuningHex: "", lastGeneratedAt: 0 },
    createdAt: now,
    updatedAt: now,
    ...patch,
  };
}

/* ------------------------------------------------------------- graph utils */

export const roleById = (doc: DynastyDoc, id: string) =>
  doc.hierarchy.roles.find((r) => r.uuid === id);

export const roleName = (doc: DynastyDoc, id: string) =>
  roleById(doc, id)?.displayName ?? "—";

/** Roles that hold authority in this document, by node kind or rank. */
export function leadershipRoles(doc: DynastyDoc): RoleNode[] {
  return doc.hierarchy.roles.filter((r) => LEADERSHIP_KINDS.includes(r.kind));
}

export function heirRoles(doc: DynastyDoc): RoleNode[] {
  return doc.hierarchy.roles.filter((r) => r.kind === "heir" || r.kind === "co_heir");
}

export function councilRoles(doc: DynastyDoc): RoleNode[] {
  return doc.hierarchy.roles.filter((r) => r.kind === "council" || r.kind === "elder");
}

/** Directed edges of a given family, as adjacency. */
export function adjacency(doc: DynastyDoc, types: ConnectionType[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const c of doc.hierarchy.connections) {
    if (!types.includes(c.type)) continue;
    const list = map.get(c.from) ?? [];
    list.push(c.to);
    map.set(c.from, list);
  }
  return map;
}

/** Every cycle-participating node id for the given connection family. */
export function findCycles(doc: DynastyDoc, types: ConnectionType[]): string[][] {
  const adj = adjacency(doc, types);
  const cycles: string[][] = [];
  const state = new Map<string, 0 | 1 | 2>();
  const stack: string[] = [];

  const visit = (id: string) => {
    state.set(id, 1);
    stack.push(id);
    for (const next of adj.get(id) ?? []) {
      const s = state.get(next) ?? 0;
      if (s === 1) {
        const start = stack.indexOf(next);
        if (start >= 0) cycles.push(stack.slice(start));
      } else if (s === 0) visit(next);
    }
    stack.pop();
    state.set(id, 2);
  };

  for (const r of doc.hierarchy.roles) if ((state.get(r.uuid) ?? 0) === 0) visit(r.uuid);
  return cycles;
}

/** Roles nothing can promote or appoint into — dead ends on the way in. */
export function rolesWithoutEntry(doc: DynastyDoc): RoleNode[] {
  const entered = new Set<string>();
  for (const c of doc.hierarchy.connections) {
    if (c.isPromotionPath || PROMOTION_CONNECTIONS.includes(c.type) || c.type === "appoints" || c.type === "elects")
      entered.add(c.to);
  }
  return doc.hierarchy.roles.filter(
    (r) =>
      !entered.has(r.uuid) &&
      !NON_MEMBER_KINDS.includes(r.kind) &&
      r.kind !== "founder" &&
      r.kind !== "applicant" &&
      r.kind !== "recruit" &&
      !r.appointment.length,
  );
}

/** Roles with no way out — no demotion, no removal method. */
export function rolesWithoutExit(doc: DynastyDoc): RoleNode[] {
  const exits = new Set<string>();
  for (const c of doc.hierarchy.connections) {
    if (c.isDemotionPath || c.type === "may_demote" || c.type === "may_remove") exits.add(c.to);
  }
  return doc.hierarchy.roles.filter(
    (r) => !exits.has(r.uuid) && !r.removal.length && !NON_MEMBER_KINDS.includes(r.kind),
  );
}

/** Nodes not connected to any leadership root. */
export function unreachableRoles(doc: DynastyDoc): RoleNode[] {
  const roots = leadershipRoles(doc).map((r) => r.uuid);
  if (!roots.length) return [];
  const undirected = new Map<string, Set<string>>();
  for (const c of doc.hierarchy.connections) {
    if (!undirected.has(c.from)) undirected.set(c.from, new Set());
    if (!undirected.has(c.to)) undirected.set(c.to, new Set());
    undirected.get(c.from)!.add(c.to);
    undirected.get(c.to)!.add(c.from);
  }
  const seen = new Set<string>(roots);
  const queue = [...roots];
  while (queue.length) {
    const id = queue.shift()!;
    for (const next of undirected.get(id) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return doc.hierarchy.roles.filter((r) => !seen.has(r.uuid));
}

/** Ordered promotion chains starting from entry-level roles. */
export function promotionPaths(doc: DynastyDoc): RoleNode[][] {
  const adj = adjacency(doc, PROMOTION_CONNECTIONS);
  const entry = doc.hierarchy.roles.filter(
    (r) => r.kind === "applicant" || r.kind === "recruit" || r.kind === "junior_member",
  );
  const starts = entry.length ? entry : doc.hierarchy.roles.filter((r) => !hasIncoming(doc, r.uuid));
  const paths: RoleNode[][] = [];

  const walk = (id: string, trail: string[]) => {
    if (trail.includes(id)) return; // cycle guard; reported separately
    const next = [...trail, id];
    const outs = adj.get(id) ?? [];
    if (!outs.length) {
      paths.push(next.map((n) => roleById(doc, n)!).filter(Boolean));
      return;
    }
    for (const o of outs) walk(o, next);
  };
  for (const s of starts) walk(s.uuid, []);
  return paths;
}

function hasIncoming(doc: DynastyDoc, id: string): boolean {
  return doc.hierarchy.connections.some((c) => c.to === id && PROMOTION_CONNECTIONS.includes(c.type));
}

/** Effective permission for a role, following inheritance up the authority chain. */
export function effectivePermission(
  doc: DynastyDoc,
  roleId: string,
  key: string,
  seen = new Set<string>(),
): PermissionState {
  if (seen.has(roleId)) return "denied";
  seen.add(roleId);
  const own = doc.permissions.cells[roleId]?.[key];
  if (own && own !== "inherited") return own;
  if (own === "inherited" || own === undefined) {
    // Walk to whoever this role reports to, if that edge grants inheritance.
    const up = doc.hierarchy.connections.find(
      (c) =>
        c.from === roleId &&
        c.inheritPermissions &&
        (c.type === "reports_to" || c.type === "subordinate_to" || c.type === "serves"),
    );
    if (up) return effectivePermission(doc, up.to, key, seen);
  }
  return own ?? "denied";
}

/** Roles that can actually perform a permission right now. */
export function rolesWithPermission(doc: DynastyDoc, key: string): RoleNode[] {
  return doc.hierarchy.roles.filter((r) => {
    const state = effectivePermission(doc, r.uuid, key);
    return state !== "denied";
  });
}

export function duplicateDynasty(doc: DynastyDoc, suffix = " Copy"): DynastyDoc {
  const name = `${doc.identity.typeName}${suffix}`;
  return {
    ...doc,
    uuid: did("dyn"),
    origin: "cloned",
    identity: {
      ...doc.identity,
      typeName: name,
      displayName: name,
      internalName: sanitizeInternalName(`Dynasty_${name}`),
    },
    ids: { manual: false, tuningDecimal: "", tuningHex: "", lastGeneratedAt: 0 },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastExportedAt: undefined,
  };
}

/** Rough completeness for landing cards, weighted toward gameplay wiring. */
export function completeness(doc: DynastyDoc): number {
  const checks: [boolean, number][] = [
    [!!doc.identity.typeName.trim(), 1],
    [!!doc.identity.description.trim(), 1],
    [refIsSet(doc.identity.crest) || refIsSet(doc.identity.icon), 1],
    [doc.hierarchy.roles.length > 0, 3],
    [leadershipRoles(doc).length > 0, 3],
    [doc.hierarchy.connections.length > 0, 2],
    [doc.membershipTypes.length > 0, 2],
    [doc.succession.rules.length > 0, 3],
    [doc.values.length > 0, 2],
    [doc.expectations.length > 0, 1],
    [doc.conduct.length > 0, 1],
    [Object.keys(doc.permissions.cells).length > 0, 2],
    [doc.interactions.some((i) => refIsSet(i.ref)), 2],
    [doc.prestige.levels.length > 0, 1],
    [!!doc.lastExportedAt, 1],
  ];
  const total = checks.reduce((s, [, w]) => s + w, 0);
  const got = checks.reduce((s, [ok, w]) => s + (ok ? w : 0), 0);
  return Math.round((got / total) * 100);
}
