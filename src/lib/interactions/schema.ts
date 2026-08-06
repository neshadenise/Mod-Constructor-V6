/**
 * Interaction & Animation Builder — document model.
 *
 * One InteractionDoc describes a single project-owned interaction: identity,
 * wording, participants, availability, animation setup, sequence, outcomes,
 * autonomy, injection and object requirements — plus provenance for anything
 * cloned from EA and a raw bag for tuning we do not model yet.
 *
 * Hard rule encoded here: EA tuning is never mutated. Cloning always mints a
 * new project-owned tuning name and instance id and records the source.
 */

export const INTERACTION_DOC_VERSION = 1;

export const rid = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;

export function sanitizeInternalName(s: string): string {
  return (
    s
      .trim()
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/_{2,}/g, "_")
      .toLowerCase() || "untitled_interaction"
  );
}

/* ------------------------------------------------------------ categories -- */

/** What an interaction *does* — an interaction may belong to several. */
export const INTERACTION_CATEGORIES = [
  "Social", "Friendly", "Funny", "Romantic", "Mean", "Mischief", "Family", "Parenting",
  "Toddler and Infant Care", "Pet", "Animal", "Object Use", "Sit and Relax", "Sleep",
  "Eat and Drink", "Cooking", "Cleaning", "Repair", "Upgrade", "Crafting", "Gardening",
  "Fishing", "Exercise", "Dance", "Music", "Art", "Writing", "Reading", "Technology",
  "Computer", "Phone", "Television", "Career", "School", "Business", "Retail", "Restaurant",
  "Club", "Travel", "Venue", "Door and Routing", "Inventory", "Collecting", "Purchase",
  "Picker", "Immediate", "Debug", "Cheat", "Occult", "Death and Ghost", "Pregnancy",
  "Relationship", "Skill", "Trait", "Buff or Mood", "Situation", "Event", "Rabbit Hole",
  "Multi-Sim", "Object-to-Object", "Sim-to-Object", "Sim-to-Sim", "Self Interaction", "Other",
] as const;
export type InteractionCategory = (typeof INTERACTION_CATEGORIES)[number];

export const INTERACTION_KINDS = [
  "super", "social_mixer", "social_super", "immediate", "mixer", "terrain", "picker",
  "rabbit_hole", "phone", "computer", "inventory", "object", "aggregate",
] as const;
export type InteractionKind = (typeof INTERACTION_KINDS)[number];

export const INTERACTION_KIND_LABEL: Record<InteractionKind, string> = {
  super: "Super interaction",
  social_mixer: "Social mixer",
  social_super: "Social super interaction",
  immediate: "Immediate interaction",
  mixer: "Mixer interaction",
  terrain: "Terrain interaction",
  picker: "Picker interaction",
  rabbit_hole: "Rabbit hole interaction",
  phone: "Phone interaction",
  computer: "Computer interaction",
  inventory: "Inventory interaction",
  object: "Object interaction",
  aggregate: "Aggregate interaction",
};

/** The python class the tuning declares — kept editable for advanced users. */
export const INTERACTION_CLASSES: Record<InteractionKind, string> = {
  super: "interactions.base.super_interaction.SuperInteraction",
  social_mixer: "interactions.social.social_mixer_interaction.SocialMixerInteraction",
  social_super: "interactions.social.social_super_interaction.SocialSuperInteraction",
  immediate: "interactions.base.immediate_interaction.ImmediateSuperInteraction",
  mixer: "interactions.base.mixer_interaction.MixerInteraction",
  terrain: "interactions.base.super_interaction.SuperInteraction",
  picker: "interactions.utils.tunable_icon.PickerSuperInteraction",
  rabbit_hole: "interactions.rabbit_hole.RabbitHoleInteraction",
  phone: "interactions.base.super_interaction.SuperInteraction",
  computer: "interactions.base.super_interaction.SuperInteraction",
  inventory: "interactions.base.super_interaction.SuperInteraction",
  object: "interactions.base.super_interaction.SuperInteraction",
  aggregate: "interactions.aggregate.AggregateSuperInteraction",
};

export const TARGET_TYPES = [
  "none", "sim", "self", "object", "object_tag", "object_definition", "terrain", "door",
  "computer", "phone", "mailbox", "inventory_item", "situation", "career", "venue_object",
  "custom_object", "custom",
] as const;
export type TargetType = (typeof TARGET_TYPES)[number];

/* ---------------------------------------------------------- participants -- */

export const PARTICIPANT_SLOTS = [
  "Actor", "TargetSim", "Object", "PickedSim", "PickedObject", "Listeners", "Speaker",
  "SignificantOther", "HouseholdMembers", "ClubMembers", "SituationSims", "CareerSims",
  "Owner", "ObjectOwner", "LotOwner", "AllSims", "OtherSimsInSituation", "Custom",
] as const;
export type ParticipantSlot = (typeof PARTICIPANT_SLOTS)[number];

export const PARTICIPANT_SLOT_LABEL: Record<ParticipantSlot, string> = {
  Actor: "Actor",
  TargetSim: "Target Sim",
  Object: "Target object",
  PickedSim: "Picked Sim",
  PickedObject: "Picked object",
  Listeners: "Listener",
  Speaker: "Speaker",
  SignificantOther: "Significant other",
  HouseholdMembers: "Household member",
  ClubMembers: "Club member",
  SituationSims: "Situation Sim",
  CareerSims: "Career Sim",
  Owner: "Owner",
  ObjectOwner: "Object owner",
  LotOwner: "Lot owner",
  AllSims: "All Sims",
  OtherSimsInSituation: "Other Sims",
  Custom: "Custom participant slot",
};

export interface ParticipantRestrictions {
  ages: string[];
  species: string[];
  occults: string[];
  traits: string[];
  buffs: string[];
  relationshipBits: string[];
  household: "any" | "same" | "different";
  gender: "any" | "male" | "female";
}

export interface Participant {
  uuid: string;
  /** Creator-facing label, e.g. "Stylist". Mapped to a real slot on export. */
  label: string;
  slot: ParticipantSlot;
  /** Only used when slot === "Custom". */
  customSlotName: string;
  required: boolean;
  multiple: boolean;
  restrictions: ParticipantRestrictions;
  /** ASM actor name this participant animates as. */
  animationRole: string;
  routingRole: "none" | "route_to" | "route_from" | "align" | "stand_ground";
  posture: string;
  outcomeRecipient: boolean;
  notes: string;
}

export function blankParticipant(patch: Partial<Participant> = {}): Participant {
  return {
    uuid: rid("part"),
    label: "Actor",
    slot: "Actor",
    customSlotName: "",
    required: true,
    multiple: false,
    restrictions: {
      ages: [],
      species: [],
      occults: [],
      traits: [],
      buffs: [],
      relationshipBits: [],
      household: "any",
      gender: "any",
    },
    animationRole: "x",
    routingRole: "none",
    posture: "",
    outcomeRecipient: true,
    notes: "",
    ...patch,
  };
}

export const AGES = ["infant", "toddler", "child", "teen", "youngadult", "adult", "elder"];
export const SPECIES = ["human", "cat", "dog", "smalldog", "fox", "horse"];
export const OCCULTS = ["alien", "vampire", "mermaid", "spellcaster", "werewolf", "ghost", "servo", "fairy"];

/* ---------------------------------------------------------------- tests --- */

export interface AvailabilityTests {
  /** UUIDs into the shared project test-set library. */
  testSets: string[];
  /** Inline quick tests kept simple; the full editor lives in the test library. */
  userDirectedOnly: boolean;
  autonomousOnly: boolean;
  /** Per-test disabled tooltip overrides, keyed by test-set uuid. */
  tooltips: Record<string, string>;
}

/* ------------------------------------------------------------ animation --- */

export type AnimationSourceKind =
  | "none"
  | "ea_animation"
  | "custom_animation"
  | "ea_asm"
  | "custom_asm"
  | "animation_element"
  | "inherited";

export type AnimationSelector =
  | "always"
  | "random"
  | "by_participant_test"
  | "by_trait"
  | "by_age"
  | "by_species"
  | "by_mood"
  | "by_relationship"
  | "by_object_state"
  | "by_condition";

export interface AnimationRoleMap {
  /** Builder participant uuid → ASM actor name. */
  participantUuid: string;
  asmActor: string;
}

export interface AnimationAssignment {
  uuid: string;
  label: string;
  source: AnimationSourceKind;
  /** Catalogue id (EA) or custom animation-set id. */
  refId: string;
  asmKey: string;
  stateMachine: string;
  stateName: string;
  clipName: string;
  loop: boolean;
  durationSec: number;
  selector: AnimationSelector;
  /** Free-form condition text used by non-"always" selectors. */
  condition: string;
  weight: number;
  roles: AnimationRoleMap[];
  /** Placement relative to other assignments. */
  placement: "replace" | "before" | "after";
  notes: string;
}

export function blankAnimation(patch: Partial<AnimationAssignment> = {}): AnimationAssignment {
  return {
    uuid: rid("anim"),
    label: "Animation",
    source: "none",
    refId: "",
    asmKey: "",
    stateMachine: "",
    stateName: "",
    clipName: "",
    loop: false,
    durationSec: 4,
    selector: "always",
    condition: "",
    weight: 1,
    roles: [],
    placement: "replace",
    notes: "",
    ...patch,
  };
}

/** A grouped set of imported custom animation resources. */
export interface CustomAnimationSet {
  uuid: string;
  name: string;
  actors: { name: string; role: string; clip: string; rig: string }[];
  states: { name: string; kind: "entry" | "loop" | "exit" | "transition" }[];
  asmKey: string;
  props: string[];
  objects: string[];
  ages: string[];
  species: string[];
  durationSec: number;
  events: { at: string; kind: string; value: string }[];
  files: { name: string; kind: string; bytes: number }[];
  importedAt: number;
  notes: string;
}

export function blankAnimationSet(patch: Partial<CustomAnimationSet> = {}): CustomAnimationSet {
  return {
    uuid: rid("animset"),
    name: "Custom animation set",
    actors: [],
    states: [],
    asmKey: "",
    props: [],
    objects: [],
    ages: ["adult"],
    species: ["human"],
    durationSec: 4,
    events: [],
    files: [],
    importedAt: Date.now(),
    notes: "",
    ...patch,
  };
}

/* ------------------------------------------------------------- outcomes --- */

export const OUTCOME_KINDS = [
  "success", "critical_success", "neutral", "failure", "critical_failure", "cancel",
  "interrupted", "timeout", "participant_unavailable", "routing_failure", "missing_object",
  "missing_item",
] as const;
export type OutcomeKind = (typeof OUTCOME_KINDS)[number];

export const OUTCOME_LABEL: Record<OutcomeKind, string> = {
  success: "Success",
  critical_success: "Critical success",
  neutral: "Neutral",
  failure: "Failure",
  critical_failure: "Critical failure",
  cancel: "Cancelled",
  interrupted: "Interrupted",
  timeout: "Timed out",
  participant_unavailable: "Participant unavailable",
  routing_failure: "Routing failure",
  missing_object: "Missing object",
  missing_item: "Missing required item",
};

export const EFFECT_KINDS = [
  "loot", "add_buff", "remove_buff", "relationship", "skill", "motive", "statistic",
  "object_state", "create_object", "destroy_object", "push_interaction", "notification",
  "dialog", "situation", "event", "career", "fame", "reputation", "currency", "custom",
] as const;
export type EffectKind = (typeof EFFECT_KINDS)[number];

export interface Effect {
  uuid: string;
  kind: EffectKind;
  /** Reference to a project or game resource. */
  ref: string;
  target: string;
  amount: number;
  text: string;
}

export function blankEffect(patch: Partial<Effect> = {}): Effect {
  return { uuid: rid("fx"), kind: "loot", ref: "", target: "Actor", amount: 0, text: "", ...patch };
}

export interface Outcome {
  uuid: string;
  kind: OutcomeKind;
  enabled: boolean;
  weight: number;
  /** Test-set uuid that gates this outcome. */
  testSet: string;
  effects: Effect[];
  notificationText: string;
  notes: string;
}

export function blankOutcome(kind: OutcomeKind): Outcome {
  return {
    uuid: rid("out"),
    kind,
    enabled: kind === "success" || kind === "failure",
    weight: 1,
    testSet: "",
    effects: [],
    notificationText: "",
    notes: "",
  };
}

/* ------------------------------------------------------------- autonomy --- */

export interface ScoreModifier {
  uuid: string;
  kind: "trait" | "buff" | "motive" | "relationship" | "skill" | "time" | "venue" | "object_state";
  ref: string;
  value: number;
}

export interface Autonomy {
  allowAutonomous: boolean;
  allowUserDirected: boolean;
  baseScore: number;
  modifiers: ScoreModifier[];
  cooldownMinutes: number;
  reuseDelayMinutes: number;
  maxConcurrent: number;
  npcAvailable: boolean;
  householdAutonomy: boolean;
  advertisedCommodities: { uuid: string; ref: string; value: number }[];
  satisfiedCommodities: { uuid: string; ref: string; value: number }[];
  staticCommodities: { uuid: string; ref: string; value: number }[];
}

/* ------------------------------------------------------------ injection --- */

export type InjectionMethod =
  | "xml_injector"
  | "script"
  | "project_tuning"
  | "object_tuning"
  | "project_framework"
  | "manual";

export const INJECTION_LABEL: Record<InjectionMethod, string> = {
  xml_injector: "XML Injector snippet",
  script: "Project script injection",
  project_tuning: "Direct project-owned tuning reference",
  object_tuning: "Object tuning reference",
  project_framework: "Existing project framework",
  manual: "Manual advanced setup",
};

export interface Placement {
  /** Where the interaction shows up. */
  surfaces: string[];
  pieMenuCategory: string;
  method: InjectionMethod;
  /** Affordance list target(s), e.g. object tuning names / tags. */
  targets: string[];
  scriptModule: string;
  notes: string;
}

/* --------------------------------------------------- object requirements -- */

export interface ObjectRequirements {
  objectTuning: string;
  objectTags: string[];
  objectDefinition: string;
  slot: string;
  routingSlot: string;
  container: string;
  surface: string;
  requiredPosture: string;
  props: string[];
  objectState: string;
  ownership: "any" | "owned" | "not_owned";
  inventoryPlacement: "any" | "sim" | "object" | "household";
}

/* ------------------------------------------------------------- wording ---- */

export interface Wording {
  pieMenu: string;
  tooltip: string;
  failureTooltip: string;
  disabledTooltip: string;
  actorText: string;
  targetText: string;
  notification: string;
  successText: string;
  failureText: string;
  cancelText: string;
  pickerTitle: string;
  pickerRow: string;
  confirmDialog: string;
  participantText: Record<string, string>;
}

export const TEXT_TOKENS: { token: string; label: string; group: string }[] = [
  { token: "{0.SimFirstName}", label: "Actor first name", group: "Sim" },
  { token: "{0.SimName}", label: "Actor full name", group: "Sim" },
  { token: "{1.SimFirstName}", label: "Target first name", group: "Sim" },
  { token: "{1.SimName}", label: "Target full name", group: "Sim" },
  { token: "{0.M.he}{0.F.she}", label: "Actor pronoun (he/she)", group: "Pronoun" },
  { token: "{0.M.his}{0.F.her}", label: "Actor possessive", group: "Pronoun" },
  { token: "{1.M.him}{1.F.her}", label: "Target object pronoun", group: "Pronoun" },
  { token: "{2.ObjectName}", label: "Object name", group: "Object" },
  { token: "{2.String}", label: "Raw string parameter", group: "Object" },
  { token: "{3.Number}", label: "Numeric value", group: "Number" },
  { token: "{3.Money}", label: "Simoleon value", group: "Number" },
  { token: "{0.RelationshipName}", label: "Relationship label", group: "Relationship" },
];

/* ------------------------------------------------------------ provenance -- */

export interface SourceRecord {
  /** "clone" copies EA tuning into the project; "reference" only points at it. */
  mode: "authored" | "clone" | "reference" | "import";
  originalTuningName: string;
  originalInstanceId: string;
  pack: string;
  gameVersion: string;
  importedAt: number;
  /** Fields the creator changed relative to the original. */
  changedFields: string[];
  removedFields: string[];
  addedFields: string[];
  /** Original field values, so the comparison viewer can diff. */
  originalValues: Record<string, string>;
}

export interface PackCompat {
  requirement: "base_game" | "pack_required" | "pack_optional";
  packs: string[];
  fallback: "none" | "alternate_tuning" | "hide" | "disable_with_tooltip";
  alternateTuning: string;
  fallbackTooltip: string;
}

/* ------------------------------------------------------------- document --- */

export interface InteractionDoc {
  version: number;
  uuid: string;
  displayName: string;
  description: string;
  ids: {
    namespace: string;
    internalName: string;
  };
  kind: InteractionKind;
  interactionClass: string;
  baseTuning: string;
  targetType: TargetType;
  actorType: "sim" | "object" | "any";
  icon: string;
  categories: InteractionCategory[];
  estimatedSeconds: number;
  flags: {
    cancelable: boolean;
    userDirected: boolean;
    autonomous: boolean;
    repeatable: boolean;
    looping: boolean;
    joinable: boolean;
    mustRun: boolean;
    debugOnly: boolean;
    hidden: boolean;
  };
  queueBehavior: "normal" | "must_run_next" | "first_in_queue" | "replace_running";
  priority: "low" | "normal" | "high" | "critical";
  wording: Wording;
  participants: Participant[];
  tests: AvailabilityTests;
  animations: AnimationAssignment[];
  animationSets: CustomAnimationSet[];
  sequence: Sequence;
  outcomes: Outcome[];
  autonomy: Autonomy;
  placement: Placement;
  objectReqs: ObjectRequirements;
  packCompat: PackCompat;
  source: SourceRecord;
  /** Imported tuning fields we do not model — never dropped. */
  rawFields: { path: string; value: string }[];
  createdAt: number;
  updatedAt: number;
}

/* ------------------------------------------------------------- sequence --- */

export interface SequenceStep {
  uuid: string;
  type: string;
  label: string;
  enabled: boolean;
  participant: string;
  target: string;
  ref: string;
  durationSec: number;
  condition: string;
  /** Step uuid or a terminal keyword ("complete" | "fail" | "cancel" | "cleanup"). */
  onSuccess: string;
  onFailure: string;
  onCancel: string;
  /** Timing hooks attached to this step. */
  events: TimingEvent[];
  children: SequenceStep[];
  collapsed: boolean;
  notes: string;
}

export const TIMING_POINTS = [
  "animation_start", "animation_end", "elapsed", "event_marker", "loop_start", "loop_end",
  "every_loop", "after_n_loops", "participant_sync", "object_state_change",
] as const;
export type TimingPoint = (typeof TIMING_POINTS)[number];

export const TIMING_ACTIONS = [
  "sound", "vfx", "prop_visibility", "object_state", "buff", "loot", "notification",
  "relationship", "camera", "custom",
] as const;

export interface TimingEvent {
  uuid: string;
  at: TimingPoint;
  offsetSec: number;
  loops: number;
  action: (typeof TIMING_ACTIONS)[number];
  ref: string;
  notes: string;
}

export interface Sequence {
  name: string;
  entryStep: string;
  steps: SequenceStep[];
  successPath: string;
  failurePath: string;
  cancelPath: string;
  cleanupPath: string;
}

export function blankStep(type = "wait", patch: Partial<SequenceStep> = {}): SequenceStep {
  return {
    uuid: rid("step"),
    type,
    label: "",
    enabled: true,
    participant: "Actor",
    target: "",
    ref: "",
    durationSec: 0,
    condition: "",
    onSuccess: "",
    onFailure: "",
    onCancel: "",
    events: [],
    children: [],
    collapsed: false,
    notes: "",
    ...patch,
  };
}

/* --------------------------------------------------------------- blanks --- */

export function blankWording(patch: Partial<Wording> = {}): Wording {
  return {
    pieMenu: "",
    tooltip: "",
    failureTooltip: "",
    disabledTooltip: "",
    actorText: "",
    targetText: "",
    notification: "",
    successText: "",
    failureText: "",
    cancelText: "",
    pickerTitle: "",
    pickerRow: "",
    confirmDialog: "",
    participantText: {},
    ...patch,
  };
}

export function blankInteractionDoc(patch: Partial<InteractionDoc> = {}): InteractionDoc {
  const displayName = patch.displayName ?? "New Interaction";
  const base: InteractionDoc = {
    version: INTERACTION_DOC_VERSION,
    uuid: rid("ixn"),
    displayName,
    description: "",
    ids: {
      namespace: patch.ids?.namespace ?? "MyMods",
      internalName: patch.ids?.internalName ?? sanitizeInternalName(displayName),
    },
    kind: "super",
    interactionClass: INTERACTION_CLASSES.super,
    baseTuning: "",
    targetType: "sim",
    actorType: "sim",
    icon: "",
    categories: ["Other"],
    estimatedSeconds: 30,
    flags: {
      cancelable: true,
      userDirected: true,
      autonomous: false,
      repeatable: true,
      looping: false,
      joinable: false,
      mustRun: false,
      debugOnly: false,
      hidden: false,
    },
    queueBehavior: "normal",
    priority: "normal",
    wording: blankWording({ pieMenu: displayName }),
    participants: [blankParticipant()],
    tests: { testSets: [], userDirectedOnly: false, autonomousOnly: false, tooltips: {} },
    animations: [],
    animationSets: [],
    sequence: {
      name: "Main sequence",
      entryStep: "",
      steps: [],
      successPath: "complete",
      failurePath: "cleanup",
      cancelPath: "cleanup",
      cleanupPath: "complete",
    },
    outcomes: [blankOutcome("success"), blankOutcome("failure")],
    autonomy: {
      allowAutonomous: false,
      allowUserDirected: true,
      baseScore: 1,
      modifiers: [],
      cooldownMinutes: 0,
      reuseDelayMinutes: 0,
      maxConcurrent: 1,
      npcAvailable: false,
      householdAutonomy: true,
      advertisedCommodities: [],
      satisfiedCommodities: [],
      staticCommodities: [],
    },
    placement: {
      surfaces: ["sim"],
      pieMenuCategory: "Friendly",
      method: "xml_injector",
      targets: [],
      scriptModule: "",
      notes: "",
    },
    objectReqs: {
      objectTuning: "",
      objectTags: [],
      objectDefinition: "",
      slot: "",
      routingSlot: "",
      container: "",
      surface: "",
      requiredPosture: "",
      props: [],
      objectState: "",
      ownership: "any",
      inventoryPlacement: "any",
    },
    packCompat: {
      requirement: "base_game",
      packs: [],
      fallback: "none",
      alternateTuning: "",
      fallbackTooltip: "",
    },
    source: {
      mode: "authored",
      originalTuningName: "",
      originalInstanceId: "",
      pack: "",
      gameVersion: "",
      importedAt: 0,
      changedFields: [],
      removedFields: [],
      addedFields: [],
      originalValues: {},
    },
    rawFields: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  return { ...base, ...patch, ids: { ...base.ids, ...(patch.ids ?? {}) } };
}

/* ------------------------------------------------------------- tree ops --- */

export function walkSteps(
  steps: SequenceStep[],
  visit: (s: SequenceStep, depth: number, parent: SequenceStep | null) => void,
  depth = 0,
  parent: SequenceStep | null = null,
) {
  for (const s of steps) {
    visit(s, depth, parent);
    walkSteps(s.children, visit, depth + 1, s);
  }
}

export function findStep(steps: SequenceStep[], uuid: string): SequenceStep | undefined {
  let found: SequenceStep | undefined;
  walkSteps(steps, (s) => {
    if (s.uuid === uuid) found = s;
  });
  return found;
}

export function updateStep(
  steps: SequenceStep[],
  uuid: string,
  fn: (s: SequenceStep) => SequenceStep,
): SequenceStep[] {
  return steps.map((s) =>
    s.uuid === uuid ? fn(s) : { ...s, children: updateStep(s.children, uuid, fn) },
  );
}

export function removeStep(steps: SequenceStep[], uuid: string): SequenceStep[] {
  return steps
    .filter((s) => s.uuid !== uuid)
    .map((s) => ({ ...s, children: removeStep(s.children, uuid) }));
}

export function insertStep(
  steps: SequenceStep[],
  parentUuid: string | null,
  step: SequenceStep,
  index?: number,
): SequenceStep[] {
  if (!parentUuid) {
    const next = [...steps];
    next.splice(index ?? next.length, 0, step);
    return next;
  }
  return steps.map((s) => {
    if (s.uuid === parentUuid) {
      const kids = [...s.children];
      kids.splice(index ?? kids.length, 0, step);
      return { ...s, children: kids, collapsed: false };
    }
    return { ...s, children: insertStep(s.children, parentUuid, step, index) };
  });
}

export function moveStep(steps: SequenceStep[], uuid: string, delta: number): SequenceStep[] {
  const reorder = (list: SequenceStep[]): SequenceStep[] => {
    const i = list.findIndex((s) => s.uuid === uuid);
    if (i >= 0) {
      const j = Math.max(0, Math.min(list.length - 1, i + delta));
      if (i === j) return list;
      const next = [...list];
      const [item] = next.splice(i, 1);
      if (item) next.splice(j, 0, item);
      return next;
    }
    return list.map((s) => ({ ...s, children: reorder(s.children) }));
  };
  return reorder(steps);
}

export function cloneStep(step: SequenceStep): SequenceStep {
  return {
    ...step,
    uuid: rid("step"),
    events: step.events.map((e) => ({ ...e, uuid: rid("evt") })),
    children: step.children.map(cloneStep),
  };
}

export function countSteps(steps: SequenceStep[]): number {
  let n = 0;
  walkSteps(steps, () => {
    n += 1;
  });
  return n;
}

/** Freshly-minted ids for every nested resource — used by presets and clones. */
export function reidentify(doc: InteractionDoc): InteractionDoc {
  const partMap = new Map<string, string>();
  const participants = doc.participants.map((p) => {
    const uuid = rid("part");
    partMap.set(p.uuid, uuid);
    return { ...p, uuid };
  });
  return {
    ...doc,
    uuid: rid("ixn"),
    participants,
    animations: doc.animations.map((a) => ({
      ...a,
      uuid: rid("anim"),
      roles: a.roles.map((r) => ({
        ...r,
        participantUuid: partMap.get(r.participantUuid) ?? r.participantUuid,
      })),
    })),
    animationSets: doc.animationSets.map((s) => ({ ...s, uuid: rid("animset") })),
    outcomes: doc.outcomes.map((o) => ({
      ...o,
      uuid: rid("out"),
      effects: o.effects.map((e) => ({ ...e, uuid: rid("fx") })),
    })),
    sequence: { ...doc.sequence, steps: doc.sequence.steps.map(cloneStep), entryStep: "" },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
