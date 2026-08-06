/**
 * Objective templates.
 *
 * Each template is a functional starting point: correct type, correct tracked
 * resource kind, a sane progress mode, a real target and the right evaluation
 * strategy. Every field stays editable afterwards.
 */

import {
  blankObjectiveDoc,
  blankProgress,
  blankRef,
  sanitizeInternalName,
  type ObjectiveDoc,
  type ObjectiveType,
  type ProgressMode,
} from "./schema";

export interface ObjectiveTemplate {
  id: string;
  label: string;
  summary: string;
  type: ObjectiveType;
  group: string;
  pack?: string;
  build: (namespace: string) => ObjectiveDoc;
}

const make = (
  namespace: string,
  displayName: string,
  type: ObjectiveType,
  patch: Partial<ObjectiveDoc> = {},
): ObjectiveDoc => {
  const doc = blankObjectiveDoc({
    displayName,
    namespace,
    internalName: sanitizeInternalName(`Objective_${displayName}`),
    type,
    origin: "template",
    ...patch,
  });
  doc.strings.name.text = displayName;
  return doc;
};

const progress = (mode: ProgressMode, target: number, patch = {}) =>
  blankProgress({ mode, target, ...patch });

/** Type payload helper that keeps the other blocks intact. */
const withPayload = (doc: ObjectiveDoc, patch: Partial<ObjectiveDoc["payload"]>): ObjectiveDoc => ({
  ...doc,
  payload: { ...doc.payload, ...patch },
});

export const OBJECTIVE_TEMPLATES: ObjectiveTemplate[] = [
  {
    id: "reach_skill_level", label: "Reach Skill Level", group: "Skills", type: "skill",
    summary: "Complete when a skill reaches a level. Reads the live skill value.",
    build: (ns) => {
      const d = make(ns, "Reach Skill Level", "skill", {
        progress: progress("current_value", 5, { starting: "current_game_value", display: { style: "fraction", customFormat: "" } }),
      });
      return withPayload(d, { skill: { ...d.payload.skill, skill: blankRef("Skill"), requiredLevel: 5 } });
    },
  },
  {
    id: "gain_skill_levels", label: "Gain Skill Levels", group: "Skills", type: "skill",
    summary: "Counts only levels gained after the objective activates.",
    build: (ns) => {
      const d = make(ns, "Gain Skill Levels", "skill", {
        progress: progress("counter", 3, { starting: "changes_after_activation" }),
      });
      return withPayload(d, { skill: { ...d.payload.skill, skill: blankRef("Skill"), levelsGained: 3, countAfterStart: true } });
    },
  },
  {
    id: "perform_interaction", label: "Perform Interaction", group: "Interactions", type: "interaction",
    summary: "Completes on a single successful interaction completion event.",
    build: (ns) => {
      const d = make(ns, "Perform Interaction", "interaction", { progress: progress("boolean", 1) });
      return withPayload(d, { interaction: { ...d.payload.interaction, interaction: blankRef("Interaction"), count: 1 } });
    },
  },
  {
    id: "perform_interaction_times", label: "Perform Interaction Multiple Times", group: "Interactions", type: "interaction",
    summary: "Counts successful completions, ignoring cancellations.",
    build: (ns) => {
      const d = make(ns, "Perform Interaction Multiple Times", "interaction", { progress: progress("counter", 5) });
      return withPayload(d, { interaction: { ...d.payload.interaction, interaction: blankRef("Interaction"), count: 5, includeCancelled: false } });
    },
  },
  {
    id: "interaction_unique_sims", label: "Perform Interaction on Unique Sims", group: "Interactions", type: "interaction",
    summary: "Counts each target Sim once, using unique-target tracking.",
    build: (ns) => {
      const d = make(ns, "Perform Interaction on Unique Sims", "interaction", { progress: progress("unique_targets", 3) });
      return withPayload(d, { interaction: { ...d.payload.interaction, interaction: blankRef("Interaction"), uniqueTargets: 3 } });
    },
  },
  {
    id: "earn_money", label: "Earn Money", group: "Money", type: "money",
    summary: "Accumulates earned Simoleons; ignores the starting balance.",
    build: (ns) => {
      const d = make(ns, "Earn Money", "money", { progress: progress("accumulated", 10000, { display: { style: "fraction", customFormat: "" } }) });
      return withPayload(d, { money: { ...d.payload.money, behavior: "earn", amount: 10000 } });
    },
  },
  {
    id: "spend_money", label: "Spend Money", group: "Money", type: "money",
    summary: "Accumulates spending, filtered by transaction source.",
    build: (ns) => {
      const d = make(ns, "Spend Money", "money", { progress: progress("accumulated", 5000) });
      return withPayload(d, { money: { ...d.payload.money, behavior: "spend", amount: 5000 } });
    },
  },
  {
    id: "own_funds", label: "Own Funds", group: "Money", type: "money",
    summary: "Reads the current household balance rather than accumulating.",
    build: (ns) => {
      const d = make(ns, "Own Funds", "money", { progress: progress("current_value", 50000, { starting: "current_game_value" }) });
      return withPayload(d, { money: { ...d.payload.money, behavior: "balance", amount: 50000 } });
    },
  },
  {
    id: "reach_career_level", label: "Reach Career Level", group: "Career", type: "career",
    summary: "Completes when the Sim reaches a career level.",
    build: (ns) => {
      const d = make(ns, "Reach Career Level", "career", { progress: progress("current_value", 5, { starting: "current_game_value" }) });
      return withPayload(d, { career: { ...d.payload.career, career: blankRef("Career"), level: 5, trigger: "reach_level" } });
    },
  },
  {
    id: "receive_promotion", label: "Receive Promotion", group: "Career", type: "career",
    summary: "Counts promotion events after activation.",
    build: (ns) => {
      const d = make(ns, "Receive Promotion", "career", { progress: progress("counter", 3) });
      return withPayload(d, { career: { ...d.payload.career, career: blankRef("Career"), promotions: 3, trigger: "promotion" } });
    },
  },
  {
    id: "complete_work_tasks", label: "Complete Work Tasks", group: "Career", type: "career",
    summary: "Counts completed daily tasks or work-from-home assignments.",
    build: (ns) => {
      const d = make(ns, "Complete Work Tasks", "career", { progress: progress("counter", 5) });
      return withPayload(d, { career: { ...d.payload.career, career: blankRef("Career"), trigger: "daily_task" } });
    },
  },
  {
    id: "build_friendship", label: "Build Friendship", group: "Relationships", type: "relationship",
    summary: "Reads the friendship track against a target Sim.",
    build: (ns) => {
      const d = make(ns, "Build Friendship", "relationship", { progress: progress("current_value", 75, { starting: "current_game_value" }) });
      return withPayload(d, { relationship: { ...d.payload.relationship, track: blankRef("RelationshipTrack"), minValue: 75, restriction: "friendship" } });
    },
  },
  {
    id: "build_romance", label: "Build Romance", group: "Relationships", type: "relationship",
    summary: "Reads the romance track against a target Sim.",
    build: (ns) => {
      const d = make(ns, "Build Romance", "relationship", { progress: progress("current_value", 50, { starting: "current_game_value" }) });
      return withPayload(d, { relationship: { ...d.payload.relationship, track: blankRef("RelationshipTrack"), minValue: 50, restriction: "romance" } });
    },
  },
  {
    id: "make_friends", label: "Make Friends", group: "Relationships", type: "relationship",
    summary: "Counts unique Sims who reach the friend threshold.",
    build: (ns) => {
      const d = make(ns, "Make Friends", "relationship", { progress: progress("unique_targets", 5) });
      return withPayload(d, { relationship: { ...d.payload.relationship, track: blankRef("RelationshipTrack"), uniqueCount: 5, restriction: "friendship" } });
    },
  },
  {
    id: "gain_followers", label: "Gain Followers", group: "Fame", type: "statistic",
    summary: "Tracks a follower statistic as an accumulated gain.",
    build: (ns) => {
      const d = make(ns, "Gain Followers", "statistic", { progress: progress("accumulated", 500) });
      return withPayload(d, { statistic: { ...d.payload.statistic, stat: blankRef("Statistic") } });
    },
  },
  {
    id: "gain_fame", label: "Gain Fame", group: "Fame", type: "fame", pack: "Get Famous",
    summary: "Celebrity level, using the fame system rather than a raw statistic.",
    build: (ns) => make(ns, "Gain Fame", "fame", { progress: progress("current_value", 3, { starting: "current_game_value" }) }),
  },
  {
    id: "gain_reputation", label: "Gain Reputation", group: "Fame", type: "reputation", pack: "Get Famous",
    summary: "Reputation standing as a ranked state.",
    build: (ns) => make(ns, "Gain Reputation", "reputation", { progress: progress("ranked_state", 1, { display: { style: "checkmark", customFormat: "" } }) }),
  },
  {
    id: "own_object", label: "Own Object", group: "Objects", type: "object",
    summary: "Checks household ownership of a matching object.",
    build: (ns) => {
      const d = make(ns, "Own Object", "object", { progress: progress("counter", 3, { starting: "current_game_value" }) });
      return withPayload(d, { object: { ...d.payload.object, object: blankRef("Object"), action: "own", quantity: 3 } });
    },
  },
  {
    id: "buy_object", label: "Buy Object", group: "Objects", type: "object",
    summary: "Counts purchase events for matching objects.",
    build: (ns) => {
      const d = make(ns, "Buy Object", "object", { progress: progress("counter", 1) });
      return withPayload(d, { object: { ...d.payload.object, object: blankRef("Object"), action: "purchase" } });
    },
  },
  {
    id: "use_object", label: "Use Object", group: "Objects", type: "object",
    summary: "Counts interactions completed on a matching object.",
    build: (ns) => {
      const d = make(ns, "Use Object", "object", { progress: progress("counter", 5) });
      return withPayload(d, { object: { ...d.payload.object, object: blankRef("Object"), action: "use", quantity: 5 } });
    },
  },
  {
    id: "craft_object", label: "Craft Object", group: "Crafting", type: "crafting",
    summary: "Counts successful crafting completions at a station.",
    build: (ns) => {
      const d = make(ns, "Craft Object", "crafting", { progress: progress("counter", 3) });
      return withPayload(d, { crafting: { ...d.payload.crafting, recipe: blankRef("Recipe"), quantity: 3 } });
    },
  },
  {
    id: "collect_items", label: "Collect Items", group: "Collections", type: "collection",
    summary: "Counts unique collectibles found.",
    build: (ns) => {
      const d = make(ns, "Collect Items", "collection", { progress: progress("counter", 10) });
      return withPayload(d, { collection: { ...d.payload.collection, collection: blankRef("Collection"), quantity: 10 } });
    },
  },
  {
    id: "complete_collection", label: "Complete Collection", group: "Collections", type: "collection",
    summary: "Completes when an entire collection is finished.",
    build: (ns) => {
      const d = make(ns, "Complete Collection", "collection", { progress: progress("collection", 1, { display: { style: "percentage", customFormat: "" } }) });
      return withPayload(d, { collection: { ...d.payload.collection, collection: blankRef("Collection"), completeEntire: true } });
    },
  },
  {
    id: "cook_meals", label: "Cook Meals", group: "Crafting", type: "recipe",
    summary: "Counts cooked meals at a quality threshold.",
    build: (ns) => {
      const d = make(ns, "Cook Meals", "recipe", { progress: progress("counter", 5) });
      return withPayload(d, { recipe: { ...d.payload.recipe, recipe: blankRef("Recipe"), action: "cook", quantity: 5, quality: "excellent" } });
    },
  },
  {
    id: "harvest_plants", label: "Harvest Plants", group: "Nature", type: "harvesting",
    summary: "Counts harvests, optionally filtered by quality.",
    build: (ns) => {
      const d = make(ns, "Harvest Plants", "harvesting", { progress: progress("counter", 20) });
      return withPayload(d, { harvesting: { ...d.payload.harvesting, plant: blankRef("Plant"), quantity: 20 } });
    },
  },
  {
    id: "catch_fish", label: "Catch Fish", group: "Nature", type: "fishing",
    summary: "Counts unique fish species caught.",
    build: (ns) => {
      const d = make(ns, "Catch Fish", "fishing", { progress: progress("unique_targets", 5) });
      return withPayload(d, { fishing: { ...d.payload.fishing, fish: blankRef("Fish"), uniqueSpecies: 5 } });
    },
  },
  {
    id: "travel_location", label: "Travel to Location", group: "World", type: "travel",
    summary: "Completes on arrival at a world or lot.",
    build: (ns) => {
      const d = make(ns, "Travel to Location", "travel", { progress: progress("boolean", 1) });
      return withPayload(d, { travel: { ...d.payload.travel, world: blankRef("World") } });
    },
  },
  {
    id: "visit_venue", label: "Visit Venue", group: "World", type: "location",
    summary: "Counts unique venues of a type that the Sim visits.",
    build: (ns) => {
      const d = make(ns, "Visit Venue", "location", { progress: progress("unique_targets", 3) });
      return withPayload(d, { location: { ...d.payload.location, venue: blankRef("Venue"), uniqueLocations: 3 } });
    },
  },
  {
    id: "attend_event", label: "Attend Event", group: "Events", type: "event",
    summary: "Counts attended social events.",
    build: (ns) => {
      const d = make(ns, "Attend Event", "event", { progress: progress("counter", 3) });
      return withPayload(d, { event: { ...d.payload.event, event: blankRef("Event"), participantRole: "guest", instances: 3 } });
    },
  },
  {
    id: "complete_situation", label: "Complete Situation", group: "Events", type: "situation",
    summary: "Completes when a situation ends successfully.",
    build: (ns) => {
      const d = make(ns, "Complete Situation", "situation", { progress: progress("boolean", 1) });
      return withPayload(d, { situation: { ...d.payload.situation, situation: blankRef("Situation"), result: "success" } });
    },
  },
  {
    id: "earn_event_medal", label: "Earn Event Medal", group: "Events", type: "event",
    summary: "Completes at a medal tier, tracked as a ranked state.",
    build: (ns) => {
      const d = make(ns, "Earn Event Medal", "event", { progress: progress("ranked_state", 1, { display: { style: "checkmark", customFormat: "" } }) });
      return withPayload(d, { event: { ...d.payload.event, event: blankRef("Event"), medal: "gold" } });
    },
  },
  {
    id: "gain_trait", label: "Gain Trait", group: "Traits", type: "trait",
    summary: "Completes when the Sim gains a trait.",
    build: (ns) => {
      const d = make(ns, "Gain Trait", "trait", { progress: progress("boolean", 1) });
      return withPayload(d, { trait: { ...d.payload.trait, required: blankRef("Trait"), action: "gain" } });
    },
  },
  {
    id: "remove_trait", label: "Remove Trait", group: "Traits", type: "trait",
    summary: "Completes when a trait is removed.",
    build: (ns) => {
      const d = make(ns, "Remove Trait", "trait", { progress: progress("boolean", 1) });
      return withPayload(d, { trait: { ...d.payload.trait, required: blankRef("Trait"), action: "remove" } });
    },
  },
  {
    id: "gain_buff", label: "Gain Buff", group: "Moodlets", type: "buff",
    summary: "Completes when a buff is applied.",
    build: (ns) => {
      const d = make(ns, "Gain Buff", "buff", { progress: progress("boolean", 1) });
      return withPayload(d, { buff: { ...d.payload.buff, buff: blankRef("Buff"), action: "gain" } });
    },
  },
  {
    id: "maintain_emotion", label: "Maintain Emotion", group: "Moodlets", type: "emotion",
    summary: "Requires a mood to hold continuously for a duration.",
    build: (ns) => {
      const d = make(ns, "Maintain Emotion", "emotion", {
        progress: progress("duration", 240, { evaluation: "continuous", requireContinuousSeconds: 240, display: { style: "bar", customFormat: "" } }),
      });
      return withPayload(d, { buff: { ...d.payload.buff, action: "maintain", emotion: "Confident", continuousMinutes: 240 } });
    },
  },
  {
    id: "maintain_state", label: "Maintain State for Duration", group: "Meta", type: "test_based",
    summary: "A test set that must stay true for a continuous period.",
    build: (ns) => {
      const d = make(ns, "Maintain State for Duration", "test_based", {
        progress: progress("duration", 120, { evaluation: "continuous", requireContinuousSeconds: 120 }),
      });
      return withPayload(d, { test_based: { ...d.payload.test_based, testSet: blankRef("TestSet"), completeImmediately: false, resetIfFalse: true } });
    },
  },
  {
    id: "survive_time", label: "Survive Time Period", group: "Meta", type: "time",
    summary: "Elapsed in-game time, with an optional state requirement.",
    build: (ns) => make(ns, "Survive Time Period", "time", {
      progress: progress("duration", 72, { display: { style: "bar", customFormat: "" } }),
    }),
  },
  {
    id: "complete_other_objective", label: "Complete Other Objective", group: "Meta", type: "parent_completion",
    summary: "Tracks completion of another objective resource.",
    build: (ns) => {
      const d = make(ns, "Complete Other Objective", "parent_completion", { progress: progress("boolean", 1) });
      return withPayload(d, { parent_completion: { ...d.payload.parent_completion, parent: blankRef("Objective"), parentKind: "Objective" } });
    },
  },
  {
    id: "complete_objective_group", label: "Complete Objective Group", group: "Meta", type: "composite",
    summary: "Combines child objectives with AND / OR / N-of logic.",
    build: (ns) => make(ns, "Complete Objective Group", "composite", {
      progress: progress("composite", 1, { display: { style: "fraction", customFormat: "" } }),
    }),
  },
  {
    id: "custom_test", label: "Custom Test-Based Objective", group: "Meta", type: "test_based",
    summary: "Completes the moment a test set evaluates true.",
    build: (ns) => {
      const d = make(ns, "Custom Test-Based Objective", "test_based", { progress: progress("boolean", 1) });
      return withPayload(d, { test_based: { ...d.payload.test_based, testSet: blankRef("TestSet") } });
    },
  },
  {
    id: "hidden_tracking", label: "Hidden Tracking Objective", group: "Meta", type: "statistic",
    summary: "Invisible bookkeeping that still contributes to completion.",
    build: (ns) => {
      const d = make(ns, "Hidden Tracking Objective", "statistic", {
        visibility: "hidden",
        progress: progress("hidden_state", 1, { display: { style: "hidden", customFormat: "" } }),
      });
      return withPayload(d, { statistic: { ...d.payload.statistic, stat: blankRef("Statistic") } });
    },
  },
  {
    id: "timed_objective", label: "Timed Objective", group: "Meta", type: "time",
    summary: "Must be finished inside a time limit; failure resets progress.",
    build: (ns) => make(ns, "Timed Objective", "time", {
      progress: progress("duration", 24),
      failure: { enabled: true, condition: "Time limit expired", onFail: "reset_progress" },
    }),
  },
];

export const TEMPLATE_GROUPS = [...new Set(OBJECTIVE_TEMPLATES.map((t) => t.group))];

export function docFromTemplate(template: ObjectiveTemplate, namespace: string, projectId: string): ObjectiveDoc {
  const doc = template.build(namespace);
  return { ...doc, projectId, templateId: template.id };
}
