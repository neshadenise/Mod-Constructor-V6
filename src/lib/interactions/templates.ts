/**
 * Interaction templates and creation methods.
 *
 * A template is a fully-formed starting document — never a stub the creator
 * has to repair. Cloning an EA interaction also lands here so provenance is
 * recorded in exactly one place.
 */

import type { EaInteraction } from "./catalog";
import {
  INTERACTION_CLASSES,
  blankAnimation,
  blankInteractionDoc,
  blankOutcome,
  blankParticipant,
  sanitizeInternalName,
  type InteractionDoc,
  type InteractionKind,
} from "./schema";
import { SEQUENCE_PRESETS } from "./sequence";

export type CreationMethod =
  | "blank" | "clone_ea" | "clone_project" | "import" | "template" | "from_sequence"
  | "from_animation" | "from_object" | "from_social" | "from_immediate" | "from_preset";

export const CREATION_METHODS: { id: CreationMethod; label: string; hint: string }[] = [
  { id: "blank", label: "Blank interaction", hint: "Start from nothing and fill in every field yourself." },
  { id: "clone_ea", label: "Clone EA interaction", hint: "Copy an EA interaction into a new project-owned tuning." },
  { id: "clone_project", label: "Clone from another project", hint: "Reuse an interaction you already built, with fresh ids." },
  { id: "import", label: "Import custom tuning", hint: "Bring in an interaction XML file and inspect it." },
  { id: "template", label: "Create from template", hint: "Pick a ready-made shape and adjust it." },
  { id: "from_sequence", label: "Create from sequence preset", hint: "Start from a known-good step sequence." },
  { id: "from_animation", label: "Create from animation", hint: "Pick an animation first; participants and roles follow." },
  { id: "from_object", label: "Create from object", hint: "Attach to an object and inherit its slots and posture." },
  { id: "from_social", label: "Create from social interaction", hint: "Two-Sim social mixer starting point." },
  { id: "from_immediate", label: "Create from immediate interaction", hint: "No routing, no animation, runs instantly." },
  { id: "from_preset", label: "Create from saved preset", hint: "Use one of your own saved presets." },
];

export interface InteractionTemplate {
  id: string;
  label: string;
  summary: string;
  kind: InteractionKind;
  build: (namespace: string) => InteractionDoc;
}

const base = (
  namespace: string,
  displayName: string,
  kind: InteractionKind,
  patch: Partial<InteractionDoc> = {},
): InteractionDoc =>
  blankInteractionDoc({
    displayName,
    ids: { namespace, internalName: sanitizeInternalName(displayName) },
    kind,
    interactionClass: INTERACTION_CLASSES[kind],
    ...patch,
  });

const twoSims = () => [
  blankParticipant({ label: "Actor", slot: "Actor", animationRole: "x", routingRole: "route_to" }),
  blankParticipant({ label: "Target Sim", slot: "TargetSim", animationRole: "y", routingRole: "align" }),
];

const simAndObject = () => [
  blankParticipant({ label: "Actor", slot: "Actor", animationRole: "x", routingRole: "route_to" }),
  blankParticipant({ label: "Object", slot: "Object", animationRole: "obj", outcomeRecipient: false }),
];

const seq = (presetId: string) => {
  const preset = SEQUENCE_PRESETS.find((p) => p.id === presetId);
  return preset ? preset.build() : [];
};

export const INTERACTION_TEMPLATES: InteractionTemplate[] = [
  {
    id: "self", label: "Self interaction", kind: "super",
    summary: "One Sim, no target, single animation.",
    build: (ns) =>
      base(ns, "Self Interaction", "super", {
        targetType: "self", categories: ["Self Interaction"],
        placement: { surfaces: ["self"], pieMenuCategory: "None", method: "xml_injector", targets: [], scriptModule: "", notes: "" },
        animations: [blankAnimation({ label: "Main animation", source: "ea_animation" })],
      }),
  },
  {
    id: "social", label: "Sim-to-Sim social", kind: "social_mixer",
    summary: "Paired social mixer with relationship outcomes.",
    build: (ns) =>
      base(ns, "Social Interaction", "social_mixer", {
        targetType: "sim", categories: ["Social", "Sim-to-Sim"],
        participants: twoSims(), sequence: { name: "Main sequence", entryStep: "", steps: seq("paired_social"), successPath: "complete", failurePath: "cleanup", cancelPath: "cleanup", cleanupPath: "complete" },
        outcomes: [blankOutcome("success"), blankOutcome("failure"), blankOutcome("cancel")],
      }),
  },
  {
    id: "sim_object", label: "Sim-to-object interaction", kind: "super",
    summary: "Route, reserve, animate, apply loot, release.",
    build: (ns) =>
      base(ns, "Object Interaction", "super", {
        targetType: "object", categories: ["Object Use", "Sim-to-Object"], participants: simAndObject(),
        sequence: { name: "Main sequence", entryStep: "", steps: seq("simple_animated"), successPath: "complete", failurePath: "cleanup", cancelPath: "cleanup", cleanupPath: "complete" },
      }),
  },
  {
    id: "object_only", label: "Object-only interaction", kind: "object",
    summary: "Runs on the object with no Sim actor.",
    build: (ns) =>
      base(ns, "Object Behaviour", "object", {
        targetType: "object", actorType: "object", categories: ["Object-to-Object", "Object Use"],
        participants: [blankParticipant({ label: "Object", slot: "Object", animationRole: "obj" })],
        flags: { cancelable: false, userDirected: false, autonomous: true, repeatable: true, looping: false, joinable: false, mustRun: false, debugOnly: false, hidden: true },
      }),
  },
  {
    id: "immediate", label: "Immediate interaction", kind: "immediate",
    summary: "No routing or animation — fires instantly.",
    build: (ns) =>
      base(ns, "Immediate Interaction", "immediate", {
        targetType: "object", categories: ["Immediate"], estimatedSeconds: 0,
        sequence: { name: "Main sequence", entryStep: "", steps: [], successPath: "complete", failurePath: "complete", cancelPath: "complete", cleanupPath: "complete" },
      }),
  },
  {
    id: "phone", label: "Phone interaction", kind: "phone",
    summary: "Appears on the Sim's phone menu.",
    build: (ns) =>
      base(ns, "Phone Interaction", "phone", {
        targetType: "phone", categories: ["Phone", "Technology"],
        placement: { surfaces: ["phone"], pieMenuCategory: "Phone", method: "xml_injector", targets: [], scriptModule: "", notes: "" },
      }),
  },
  {
    id: "computer", label: "Computer interaction", kind: "computer",
    summary: "Injected into the computer affordance list.",
    build: (ns) =>
      base(ns, "Computer Interaction", "computer", {
        targetType: "computer", categories: ["Computer", "Technology", "Sim-to-Object"],
        objectReqs: { objectTuning: "object_Computer", objectTags: ["Computer"], objectDefinition: "", slot: "", routingSlot: "", container: "", surface: "", requiredPosture: "sitting", props: [], objectState: "", ownership: "any", inventoryPlacement: "any" },
        placement: { surfaces: ["computer"], pieMenuCategory: "Web", method: "xml_injector", targets: ["object_Computer"], scriptModule: "", notes: "" },
      }),
  },
  {
    id: "picker", label: "Picker interaction", kind: "picker",
    summary: "Shows a picker dialog before running.",
    build: (ns) =>
      base(ns, "Picker Interaction", "picker", {
        categories: ["Picker"],
        sequence: { name: "Main sequence", entryStep: "", steps: seq("simple_animated"), successPath: "complete", failurePath: "cleanup", cancelPath: "cleanup", cleanupPath: "complete" },
      }),
  },
  {
    id: "inventory", label: "Inventory interaction", kind: "inventory",
    summary: "Appears on an item in a Sim's inventory.",
    build: (ns) =>
      base(ns, "Inventory Interaction", "inventory", {
        targetType: "inventory_item", categories: ["Inventory", "Object Use"],
      }),
  },
  {
    id: "rabbit_hole", label: "Rabbit-hole interaction", kind: "rabbit_hole",
    summary: "Sends the Sim away for a period of time.",
    build: (ns) =>
      base(ns, "Rabbit Hole Interaction", "rabbit_hole", {
        targetType: "venue_object", categories: ["Rabbit Hole", "Travel"], estimatedSeconds: 3600,
      }),
  },
  {
    id: "multi_sim", label: "Multi-Sim interaction", kind: "super",
    summary: "Three or more participants with a group animation.",
    build: (ns) =>
      base(ns, "Group Interaction", "super", {
        categories: ["Multi-Sim", "Social"], targetType: "sim",
        participants: [
          ...twoSims(),
          blankParticipant({ label: "Third Sim", slot: "OtherSimsInSituation", animationRole: "z", multiple: true }),
        ],
        flags: { cancelable: true, userDirected: true, autonomous: false, repeatable: true, looping: false, joinable: true, mustRun: false, debugOnly: false, hidden: false },
      }),
  },
  {
    id: "paired_anim", label: "Paired animation interaction", kind: "social_super",
    summary: "Two Sims aligned for a single paired clip.",
    build: (ns) =>
      base(ns, "Paired Animation", "social_super", {
        targetType: "sim", categories: ["Social", "Sim-to-Sim"], participants: twoSims(),
        animations: [blankAnimation({ label: "Paired clip", source: "ea_animation" })],
        sequence: { name: "Main sequence", entryStep: "", steps: seq("paired_social"), successPath: "complete", failurePath: "cleanup", cancelPath: "cleanup", cleanupPath: "complete" },
      }),
  },
  {
    id: "group", label: "Group interaction", kind: "aggregate",
    summary: "Joinable interaction any nearby Sim can enter.",
    build: (ns) =>
      base(ns, "Group Activity", "aggregate", {
        categories: ["Multi-Sim", "Social", "Situation"],
        flags: { cancelable: true, userDirected: true, autonomous: true, repeatable: true, looping: true, joinable: true, mustRun: false, debugOnly: false, hidden: false },
      }),
  },
  {
    id: "looping", label: "Looping interaction", kind: "super",
    summary: "Runs until cancelled, with a clean loop stop.",
    build: (ns) =>
      base(ns, "Looping Interaction", "super", {
        categories: ["Object Use"],
        flags: { cancelable: true, userDirected: true, autonomous: true, repeatable: true, looping: true, joinable: false, mustRun: false, debugOnly: false, hidden: false },
        sequence: { name: "Main sequence", entryStep: "", steps: seq("timed_looping"), successPath: "complete", failurePath: "cleanup", cancelPath: "cleanup", cleanupPath: "complete" },
      }),
  },
  {
    id: "timed", label: "Timed interaction", kind: "super",
    summary: "Fixed duration with a timeout outcome.",
    build: (ns) =>
      base(ns, "Timed Interaction", "super", {
        estimatedSeconds: 120,
        outcomes: [blankOutcome("success"), blankOutcome("timeout"), blankOutcome("cancel")],
      }),
  },
  {
    id: "skill", label: "Skill-building interaction", kind: "super",
    summary: "Loops, gains skill, scales with skill level.",
    build: (ns) =>
      base(ns, "Skill Interaction", "super", {
        categories: ["Skill", "Object Use"],
        sequence: { name: "Main sequence", entryStep: "", steps: seq("timed_looping"), successPath: "complete", failurePath: "cleanup", cancelPath: "cleanup", cleanupPath: "complete" },
      }),
  },
  {
    id: "buff", label: "Buff-triggering interaction", kind: "super",
    summary: "Applies a moodlet on success.",
    build: (ns) => base(ns, "Buff Interaction", "super", { categories: ["Buff or Mood"] }),
  },
  {
    id: "relationship", label: "Relationship interaction", kind: "social_mixer",
    summary: "Changes friendship, romance and relationship bits.",
    build: (ns) =>
      base(ns, "Relationship Interaction", "social_mixer", {
        targetType: "sim", categories: ["Relationship", "Social", "Sim-to-Sim"], participants: twoSims(),
      }),
  },
  {
    id: "career", label: "Career interaction", kind: "super",
    summary: "Career-gated work task with performance rewards.",
    build: (ns) => base(ns, "Career Interaction", "super", { categories: ["Career", "Object Use"] }),
  },
  {
    id: "crafting", label: "Crafting interaction", kind: "super",
    summary: "Ingredients in, progress loop, finished object out.",
    build: (ns) =>
      base(ns, "Crafting Interaction", "super", {
        categories: ["Crafting", "Skill", "Sim-to-Object"], participants: simAndObject(),
        sequence: { name: "Main sequence", entryStep: "", steps: seq("object_crafting"), successPath: "complete", failurePath: "cleanup", cancelPath: "cleanup", cleanupPath: "complete" },
      }),
  },
  {
    id: "custom_object", label: "Custom object interaction", kind: "object",
    summary: "Attached to a custom object you ship in this mod.",
    build: (ns) =>
      base(ns, "Custom Object Interaction", "object", {
        targetType: "custom_object", categories: ["Object Use", "Sim-to-Object"],
        placement: { surfaces: ["custom_object"], pieMenuCategory: "None", method: "project_tuning", targets: [], scriptModule: "", notes: "" },
      }),
  },
  {
    id: "debug", label: "Debug interaction", kind: "immediate",
    summary: "Testing-cheats-only helper.",
    build: (ns) =>
      base(ns, "Debug Interaction", "immediate", {
        categories: ["Debug", "Immediate"],
        flags: { cancelable: true, userDirected: true, autonomous: false, repeatable: true, looping: false, joinable: false, mustRun: false, debugOnly: true, hidden: true },
        placement: { surfaces: ["object"], pieMenuCategory: "Debug", method: "xml_injector", targets: [], scriptModule: "", notes: "" },
      }),
  },
];

/* ---------------------------------------------------------- EA cloning --- */

/**
 * Clone an EA interaction into a project-owned document.
 * The original is only ever recorded as provenance — never written to.
 */
export function cloneFromEa(ea: EaInteraction, namespace: string): InteractionDoc {
  const displayName = `${ea.displayName} (Custom)`;
  const doc = blankInteractionDoc({
    displayName,
    description: ea.summary,
    ids: { namespace, internalName: sanitizeInternalName(`${namespace}_${ea.displayName}`) },
    kind: ea.kind,
    interactionClass: INTERACTION_CLASSES[ea.kind],
    baseTuning: ea.tuningName,
    targetType: ea.targetType,
    actorType: ea.actorType,
    categories: [...ea.categories],
    participants:
      ea.participants >= 2
        ? twoSims()
        : ea.targetType === "object"
          ? simAndObject()
          : [blankParticipant()],
    flags: {
      cancelable: true,
      userDirected: true,
      autonomous: ea.autonomous,
      repeatable: true,
      looping: false,
      joinable: ea.participants > 2,
      mustRun: false,
      debugOnly: ea.categories.includes("Debug"),
      hidden: false,
    },
  });
  doc.wording.pieMenu = ea.displayName;
  doc.placement.pieMenuCategory = ea.pieMenuCategory;
  doc.packCompat = {
    requirement: ea.pack === "Base Game" ? "base_game" : "pack_required",
    packs: ea.pack === "Base Game" ? [] : [ea.pack],
    fallback: ea.pack === "Base Game" ? "none" : "hide",
    alternateTuning: "",
    fallbackTooltip: "",
  };
  if (ea.animated) {
    doc.animations = [
      blankAnimation({
        label: "Inherited animation",
        source: "inherited",
        refId: ea.animationRef ?? "",
        notes: `Inherited from ${ea.tuningName}. Replace it to use your own clip.`,
      }),
    ];
  }
  doc.source = {
    mode: "clone",
    originalTuningName: ea.tuningName,
    originalInstanceId: ea.instanceId ?? "",
    pack: ea.pack,
    gameVersion: "",
    importedAt: Date.now(),
    changedFields: [],
    removedFields: [],
    addedFields: [],
    originalValues: {
      display_name: ea.displayName,
      tuning_name: ea.tuningName,
      interaction_class: ea.interactionClass,
      target_type: ea.targetType,
      pie_menu_category: ea.pieMenuCategory,
      autonomous: String(ea.autonomous),
      participants: String(ea.participants),
      pack: ea.pack,
    },
  };
  return doc;
}

/** Reference an EA interaction without copying it — no new tuning is minted. */
export function referenceEa(ea: EaInteraction, namespace: string): InteractionDoc {
  const doc = cloneFromEa(ea, namespace);
  doc.displayName = ea.displayName;
  doc.wording.pieMenu = ea.displayName;
  doc.source.mode = "reference";
  doc.animations = [];
  return doc;
}

/** Track which fields drifted from the EA original, for the diff viewer. */
export function diffAgainstSource(doc: InteractionDoc) {
  const current: Record<string, string> = {
    display_name: doc.displayName,
    tuning_name: `${doc.ids.namespace}:${doc.ids.internalName}`,
    interaction_class: doc.interactionClass,
    target_type: doc.targetType,
    pie_menu_category: doc.placement.pieMenuCategory,
    autonomous: String(doc.flags.autonomous),
    participants: String(doc.participants.length),
    pack: doc.packCompat.packs.join(", ") || "Base Game",
  };
  const original = doc.source.originalValues;
  const changed: { field: string; original: string; project: string }[] = [];
  const added: string[] = [];
  const removed: string[] = [];
  for (const [field, value] of Object.entries(current)) {
    const before = original[field];
    if (before === undefined) added.push(field);
    else if (before !== value) changed.push({ field, original: before, project: value });
  }
  for (const field of Object.keys(original)) if (!(field in current)) removed.push(field);
  return { changed, added, removed, unchanged: Object.keys(current).length - changed.length - added.length };
}
