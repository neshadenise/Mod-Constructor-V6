/**
 * Curated EA interaction catalogue.
 *
 * These are reference entries: tuning names and behaviour metadata that ship
 * with the app so search works fully offline. Instance ids are deliberately
 * absent unless resolved from the user's own install or Lot51 — the app never
 * invents an EA id, and never writes to these resources.
 */

import type { InteractionCategory, InteractionKind, TargetType } from "./schema";

export interface EaInteraction {
  id: string;
  tuningName: string;
  displayName: string;
  kind: InteractionKind;
  interactionClass: string;
  categories: InteractionCategory[];
  targetType: TargetType;
  actorType: "sim" | "object" | "any";
  participants: number;
  pack: string;
  pieMenuCategory: string;
  routing: boolean;
  animated: boolean;
  autonomous: boolean;
  hasTests: boolean;
  hasOutcomes: boolean;
  referencesInteractions: boolean;
  /** Traits/buffs/skills EA gates this behind, when notable. */
  requiredTrait?: string;
  requiredBuff?: string;
  requiredSkill?: string;
  ages: string[];
  species: string[];
  objectType?: string;
  animationRef?: string;
  /** Only present when a trusted source resolved it. Never fabricated. */
  instanceId?: string;
  summary: string;
}

const BG = "Base Game";

export const EA_INTERACTIONS: EaInteraction[] = [
  {
    id: "ea_social_chat", tuningName: "social_Friendly_Chat", displayName: "Chat",
    kind: "social_mixer", interactionClass: "SocialMixerInteraction",
    categories: ["Social", "Friendly", "Sim-to-Sim", "Multi-Sim"], targetType: "sim", actorType: "sim",
    participants: 2, pack: BG, pieMenuCategory: "Friendly", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: ["child", "teen", "youngadult", "adult", "elder"], species: ["human"],
    animationRef: "social_Standing_Chat", summary: "The base friendly chatter mixer every social super interaction falls back to.",
  },
  {
    id: "ea_social_super_friendly", tuningName: "super_Social_Standing", displayName: "Talk To",
    kind: "social_super", interactionClass: "SocialSuperInteraction",
    categories: ["Social", "Friendly", "Sim-to-Sim"], targetType: "sim", actorType: "sim",
    participants: 2, pack: BG, pieMenuCategory: "Friendly", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: false, referencesInteractions: true,
    ages: ["child", "teen", "youngadult", "adult", "elder"], species: ["human"],
    summary: "Standing social super interaction that hosts friendly, funny, mean and romantic mixers.",
  },
  {
    id: "ea_joke", tuningName: "social_Funny_TellJoke", displayName: "Tell Joke",
    kind: "social_mixer", interactionClass: "SocialMixerInteraction",
    categories: ["Social", "Funny", "Sim-to-Sim"], targetType: "sim", actorType: "sim",
    participants: 2, pack: BG, pieMenuCategory: "Funny", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: ["child", "teen", "youngadult", "adult", "elder"], species: ["human"],
    requiredSkill: "Comedy", summary: "Comedy-scored joke mixer with success and failure outcomes.",
  },
  {
    id: "ea_flirt", tuningName: "social_Romance_Flirt", displayName: "Flirt",
    kind: "social_mixer", interactionClass: "SocialMixerInteraction",
    categories: ["Social", "Romantic", "Relationship", "Sim-to-Sim"], targetType: "sim", actorType: "sim",
    participants: 2, pack: BG, pieMenuCategory: "Romantic", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: ["teen", "youngadult", "adult", "elder"], species: ["human"],
    summary: "Romance mixer gated on age, romance relationship bits and mood.",
  },
  {
    id: "ea_first_kiss", tuningName: "social_Romance_FirstKiss", displayName: "First Kiss",
    kind: "social_mixer", interactionClass: "SocialMixerInteraction",
    categories: ["Social", "Romantic", "Relationship", "Sim-to-Sim"], targetType: "sim", actorType: "sim",
    participants: 2, pack: BG, pieMenuCategory: "Romantic", routing: true, animated: true,
    autonomous: false, hasTests: true, hasOutcomes: true, referencesInteractions: true,
    ages: ["teen", "youngadult", "adult", "elder"], species: ["human"],
    animationRef: "social_Kiss_First", summary: "Paired romance animation with relationship-bit outcomes.",
  },
  {
    id: "ea_hug", tuningName: "social_Friendly_Hug", displayName: "Hug",
    kind: "social_mixer", interactionClass: "SocialMixerInteraction",
    categories: ["Social", "Friendly", "Family", "Sim-to-Sim"], targetType: "sim", actorType: "sim",
    participants: 2, pack: BG, pieMenuCategory: "Friendly", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: ["child", "teen", "youngadult", "adult", "elder"], species: ["human"],
    animationRef: "social_Hug_Friendly", summary: "Paired hug animation, relationship gated.",
  },
  {
    id: "ea_argue", tuningName: "social_Mean_Argue", displayName: "Argue",
    kind: "social_mixer", interactionClass: "SocialMixerInteraction",
    categories: ["Social", "Mean", "Relationship", "Sim-to-Sim"], targetType: "sim", actorType: "sim",
    participants: 2, pack: BG, pieMenuCategory: "Mean", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: ["child", "teen", "youngadult", "adult", "elder"], species: ["human"],
    summary: "Mean mixer that lowers friendship and can push angry buffs.",
  },
  {
    id: "ea_prank", tuningName: "social_Mischief_Prank", displayName: "Prank",
    kind: "social_mixer", interactionClass: "SocialMixerInteraction",
    categories: ["Social", "Mischief", "Sim-to-Sim"], targetType: "sim", actorType: "sim",
    participants: 2, pack: BG, pieMenuCategory: "Mischief", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: ["child", "teen", "youngadult", "adult", "elder"], species: ["human"],
    requiredSkill: "Mischief", summary: "Mischief-scored prank with a success/failure split.",
  },
  {
    id: "ea_parenting_talk", tuningName: "social_Parenting_TalkAbout", displayName: "Talk About Values",
    kind: "social_mixer", interactionClass: "SocialMixerInteraction",
    categories: ["Social", "Parenting", "Family", "Skill", "Sim-to-Sim"], targetType: "sim", actorType: "sim",
    participants: 2, pack: "Parenthood", pieMenuCategory: "Parenting", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: ["child", "teen"], species: ["human"], requiredSkill: "Parenting",
    summary: "Parenting-skill social that shifts character values on the child.",
  },
  {
    id: "ea_toddler_read", tuningName: "super_Toddler_ReadTo", displayName: "Read To Toddler",
    kind: "super", interactionClass: "SuperInteraction",
    categories: ["Toddler and Infant Care", "Family", "Reading", "Skill", "Sim-to-Sim"],
    targetType: "sim", actorType: "sim", participants: 2, pack: BG, pieMenuCategory: "Toddler",
    routing: true, animated: true, autonomous: true, hasTests: true, hasOutcomes: true,
    referencesInteractions: true, ages: ["toddler"], species: ["human"],
    summary: "Adult reads to a toddler; builds the toddler communication skill.",
  },
  {
    id: "ea_infant_hold", tuningName: "super_Infant_PickUp", displayName: "Pick Up Infant",
    kind: "super", interactionClass: "SuperInteraction",
    categories: ["Toddler and Infant Care", "Family", "Sim-to-Sim"], targetType: "sim", actorType: "sim",
    participants: 2, pack: "Growing Together", pieMenuCategory: "Infant", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: false, referencesInteractions: true,
    ages: ["infant"], species: ["human"], summary: "Posture-changing carry interaction for infants.",
  },
  {
    id: "ea_pet_pet", tuningName: "social_Pet_PetAnimal", displayName: "Pet",
    kind: "social_mixer", interactionClass: "SocialMixerInteraction",
    categories: ["Pet", "Animal", "Social", "Friendly", "Sim-to-Sim"], targetType: "sim", actorType: "sim",
    participants: 2, pack: "Cats & Dogs", pieMenuCategory: "Friendly", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: ["child", "teen", "youngadult", "adult", "elder"], species: ["cat", "dog"],
    summary: "Cross-species friendly social with a pet rig on the target.",
  },
  {
    id: "ea_horse_ride", tuningName: "super_Horse_Ride", displayName: "Go For A Ride",
    kind: "super", interactionClass: "SuperInteraction",
    categories: ["Animal", "Skill", "Travel", "Sim-to-Sim"], targetType: "sim", actorType: "sim",
    participants: 2, pack: "Horse Ranch", pieMenuCategory: "Horse", routing: true, animated: true,
    autonomous: false, hasTests: true, hasOutcomes: true, referencesInteractions: true,
    ages: ["child", "teen", "youngadult", "adult", "elder"], species: ["horse"],
    requiredSkill: "Riding", summary: "Mounted posture interaction requiring the horse rig.",
  },
  {
    id: "ea_sit", tuningName: "sit_Passive", displayName: "Sit",
    kind: "super", interactionClass: "SuperInteraction",
    categories: ["Sit and Relax", "Object Use", "Sim-to-Object"], targetType: "object", actorType: "sim",
    participants: 1, pack: BG, pieMenuCategory: "None", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: false, referencesInteractions: false,
    ages: ["child", "teen", "youngadult", "adult", "elder"], species: ["human"],
    objectType: "Seating", summary: "Posture provider used by most seated interactions.",
  },
  {
    id: "ea_sleep", tuningName: "super_Sleep_Bed", displayName: "Sleep",
    kind: "super", interactionClass: "SuperInteraction",
    categories: ["Sleep", "Object Use", "Sim-to-Object"], targetType: "object", actorType: "sim",
    participants: 1, pack: BG, pieMenuCategory: "None", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: ["child", "teen", "youngadult", "adult", "elder"], species: ["human"],
    objectType: "Bed", summary: "Long looping energy-restoring interaction on beds.",
  },
  {
    id: "ea_eat", tuningName: "super_Eat_Meal", displayName: "Eat",
    kind: "super", interactionClass: "SuperInteraction",
    categories: ["Eat and Drink", "Object Use", "Sim-to-Object"], targetType: "object", actorType: "sim",
    participants: 1, pack: BG, pieMenuCategory: "None", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: ["child", "teen", "youngadult", "adult", "elder"], species: ["human"],
    objectType: "Consumable", summary: "Consumable interaction that drains the food object and fills hunger.",
  },
  {
    id: "ea_cook", tuningName: "super_Cook_Meal", displayName: "Cook",
    kind: "super", interactionClass: "SuperInteraction",
    categories: ["Cooking", "Crafting", "Skill", "Object Use", "Sim-to-Object"],
    targetType: "object", actorType: "sim", participants: 1, pack: BG, pieMenuCategory: "Cook",
    routing: true, animated: true, autonomous: true, hasTests: true, hasOutcomes: true,
    referencesInteractions: true, ages: ["teen", "youngadult", "adult", "elder"], species: ["human"],
    objectType: "Stove", requiredSkill: "Cooking",
    summary: "Recipe-driven crafting interaction with ingredient tests and a created object.",
  },
  {
    id: "ea_clean", tuningName: "super_Clean_Object", displayName: "Clean",
    kind: "super", interactionClass: "SuperInteraction",
    categories: ["Cleaning", "Object Use", "Sim-to-Object"], targetType: "object", actorType: "sim",
    participants: 1, pack: BG, pieMenuCategory: "None", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: ["child", "teen", "youngadult", "adult", "elder"], species: ["human"],
    summary: "State-change interaction that clears the dirty object state.",
  },
  {
    id: "ea_repair", tuningName: "super_Repair_Object", displayName: "Repair",
    kind: "super", interactionClass: "SuperInteraction",
    categories: ["Repair", "Skill", "Object Use", "Sim-to-Object"], targetType: "object", actorType: "sim",
    participants: 1, pack: BG, pieMenuCategory: "None", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: ["teen", "youngadult", "adult", "elder"], species: ["human"], requiredSkill: "Handiness",
    summary: "Handiness-scored repair with a shock failure outcome.",
  },
  {
    id: "ea_upgrade", tuningName: "super_Upgrade_Object", displayName: "Upgrade",
    kind: "super", interactionClass: "SuperInteraction",
    categories: ["Upgrade", "Repair", "Skill", "Object Use", "Sim-to-Object"], targetType: "object",
    actorType: "sim", participants: 1, pack: BG, pieMenuCategory: "Upgrade", routing: true,
    animated: true, autonomous: false, hasTests: true, hasOutcomes: true, referencesInteractions: true,
    ages: ["teen", "youngadult", "adult", "elder"], species: ["human"], requiredSkill: "Handiness",
    summary: "Consumes parts from inventory and applies an object state upgrade.",
  },
  {
    id: "ea_garden_water", tuningName: "super_Gardening_Water", displayName: "Water",
    kind: "super", interactionClass: "SuperInteraction",
    categories: ["Gardening", "Skill", "Object Use", "Sim-to-Object"], targetType: "object", actorType: "sim",
    participants: 1, pack: BG, pieMenuCategory: "Gardening", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: ["child", "teen", "youngadult", "adult", "elder"], species: ["human"],
    requiredSkill: "Gardening", summary: "Commodity-driven plant care with a watering prop.",
  },
  {
    id: "ea_fish", tuningName: "super_Fishing_Fish", displayName: "Fish",
    kind: "super", interactionClass: "SuperInteraction",
    categories: ["Fishing", "Skill", "Collecting", "Sim-to-Object"], targetType: "object", actorType: "sim",
    participants: 1, pack: BG, pieMenuCategory: "Fishing", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: ["child", "teen", "youngadult", "adult", "elder"], species: ["human"],
    requiredSkill: "Fishing", summary: "Looping skill interaction that creates collectible objects.",
  },
  {
    id: "ea_workout", tuningName: "super_Fitness_Workout", displayName: "Work Out",
    kind: "super", interactionClass: "SuperInteraction",
    categories: ["Exercise", "Skill", "Object Use", "Sim-to-Object"], targetType: "object", actorType: "sim",
    participants: 1, pack: BG, pieMenuCategory: "Workout", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: ["teen", "youngadult", "adult", "elder"], species: ["human"], requiredSkill: "Fitness",
    summary: "Looping exercise interaction with motive drain and fitness gain.",
  },
  {
    id: "ea_dance", tuningName: "super_Dance_Solo", displayName: "Dance",
    kind: "super", interactionClass: "SuperInteraction",
    categories: ["Dance", "Skill", "Music", "Self Interaction"], targetType: "none", actorType: "sim",
    participants: 1, pack: BG, pieMenuCategory: "Dance", routing: false, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: ["child", "teen", "youngadult", "adult", "elder"], species: ["human"],
    requiredSkill: "Dancing", animationRef: "a2a_dance_solo_x",
    summary: "Solo looping dance with skill-tiered animation selection.",
  },
  {
    id: "ea_dance_together", tuningName: "social_Dance_Together", displayName: "Dance Together",
    kind: "social_mixer", interactionClass: "SocialMixerInteraction",
    categories: ["Dance", "Skill", "Social", "Multi-Sim", "Sim-to-Sim"], targetType: "sim", actorType: "sim",
    participants: 2, pack: BG, pieMenuCategory: "Dance", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: true,
    ages: ["teen", "youngadult", "adult", "elder"], species: ["human"], requiredSkill: "Dancing",
    animationRef: "a2a_dance_partner_x_y",
    summary: "Paired dancing routine — the canonical multi-category example.",
  },
  {
    id: "ea_play_guitar", tuningName: "super_Guitar_Play", displayName: "Play Guitar",
    kind: "super", interactionClass: "SuperInteraction",
    categories: ["Music", "Skill", "Object Use", "Sim-to-Object"], targetType: "object", actorType: "sim",
    participants: 1, pack: BG, pieMenuCategory: "Guitar", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: ["child", "teen", "youngadult", "adult", "elder"], species: ["human"], requiredSkill: "Guitar",
    summary: "Instrument interaction with tip-jar and audience broadcasters.",
  },
  {
    id: "ea_paint", tuningName: "super_Painting_Paint", displayName: "Paint",
    kind: "super", interactionClass: "SuperInteraction",
    categories: ["Art", "Crafting", "Skill", "Sim-to-Object"], targetType: "object", actorType: "sim",
    participants: 1, pack: BG, pieMenuCategory: "Paint", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: true,
    ages: ["child", "teen", "youngadult", "adult", "elder"], species: ["human"], requiredSkill: "Painting",
    summary: "Progress-commodity crafting that spawns a finished painting.",
  },
  {
    id: "ea_write", tuningName: "super_Writing_Write", displayName: "Write",
    kind: "super", interactionClass: "SuperInteraction",
    categories: ["Writing", "Skill", "Computer", "Sim-to-Object"], targetType: "object", actorType: "sim",
    participants: 1, pack: BG, pieMenuCategory: "Write", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: true,
    ages: ["teen", "youngadult", "adult", "elder"], species: ["human"], requiredSkill: "Writing",
    summary: "Computer-targeted looping writing interaction with a book payoff.",
  },
  {
    id: "ea_read", tuningName: "super_Read_Book", displayName: "Read",
    kind: "super", interactionClass: "SuperInteraction",
    categories: ["Reading", "Skill", "Object Use", "Sim-to-Object"], targetType: "object", actorType: "sim",
    participants: 1, pack: BG, pieMenuCategory: "None", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: ["child", "teen", "youngadult", "adult", "elder"], species: ["human"], objectType: "Book",
    summary: "Seated or standing reading loop that can raise any skill book's skill.",
  },
  {
    id: "ea_computer_browse", tuningName: "super_Computer_BrowseWeb", displayName: "Browse Web",
    kind: "super", interactionClass: "SuperInteraction",
    categories: ["Computer", "Technology", "Object Use", "Sim-to-Object"], targetType: "computer",
    actorType: "sim", participants: 1, pack: BG, pieMenuCategory: "Web", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: false, referencesInteractions: true,
    ages: ["child", "teen", "youngadult", "adult", "elder"], species: ["human"], objectType: "Computer",
    summary: "The computer affordance list root most computer mods inject beside.",
  },
  {
    id: "ea_phone_call", tuningName: "super_Phone_Call", displayName: "Call…",
    kind: "picker", interactionClass: "PickerSuperInteraction",
    categories: ["Phone", "Technology", "Picker", "Social"], targetType: "phone", actorType: "sim",
    participants: 1, pack: BG, pieMenuCategory: "Phone", routing: false, animated: true,
    autonomous: false, hasTests: true, hasOutcomes: false, referencesInteractions: true,
    ages: ["teen", "youngadult", "adult", "elder"], species: ["human"],
    summary: "Sim-picker phone interaction — the standard picker reference.",
  },
  {
    id: "ea_tv_watch", tuningName: "super_TV_Watch", displayName: "Watch TV",
    kind: "super", interactionClass: "SuperInteraction",
    categories: ["Television", "Object Use", "Sit and Relax", "Sim-to-Object"], targetType: "object",
    actorType: "sim", participants: 1, pack: BG, pieMenuCategory: "None", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: false, referencesInteractions: false,
    ages: ["child", "teen", "youngadult", "adult", "elder"], species: ["human"], objectType: "TV",
    summary: "Channel-state driven fun interaction with seated posture support.",
  },
  {
    id: "ea_go_to_work", tuningName: "super_Career_GoToWork", displayName: "Go To Work",
    kind: "rabbit_hole", interactionClass: "RabbitHoleInteraction",
    categories: ["Career", "Rabbit Hole", "Travel"], targetType: "career", actorType: "sim",
    participants: 1, pack: BG, pieMenuCategory: "Career", routing: true, animated: false,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: ["teen", "youngadult", "adult", "elder"], species: ["human"],
    summary: "Rabbit-hole career departure with a career-performance outcome.",
  },
  {
    id: "ea_go_to_school", tuningName: "super_School_GoToSchool", displayName: "Go To School",
    kind: "rabbit_hole", interactionClass: "RabbitHoleInteraction",
    categories: ["School", "Rabbit Hole", "Travel"], targetType: "career", actorType: "sim",
    participants: 1, pack: BG, pieMenuCategory: "School", routing: true, animated: false,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: ["child", "teen"], species: ["human"], summary: "School rabbit hole for child and teen Sims.",
  },
  {
    id: "ea_retail_browse", tuningName: "super_Retail_Browse", displayName: "Browse",
    kind: "super", interactionClass: "SuperInteraction",
    categories: ["Retail", "Business", "Object Use", "Sim-to-Object"], targetType: "object", actorType: "sim",
    participants: 1, pack: "Get to Work", pieMenuCategory: "Retail", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: true,
    ages: ["teen", "youngadult", "adult", "elder"], species: ["human"],
    summary: "Customer browsing behaviour scored by retail situation state.",
  },
  {
    id: "ea_restaurant_order", tuningName: "super_Restaurant_Order", displayName: "Order Food",
    kind: "picker", interactionClass: "PickerSuperInteraction",
    categories: ["Restaurant", "Business", "Eat and Drink", "Picker"], targetType: "object", actorType: "sim",
    participants: 2, pack: "Dine Out", pieMenuCategory: "Restaurant", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: true,
    ages: ["child", "teen", "youngadult", "adult", "elder"], species: ["human"],
    summary: "Menu picker interaction driven by the restaurant situation.",
  },
  {
    id: "ea_club_gather", tuningName: "super_Club_StartGathering", displayName: "Start Club Gathering",
    kind: "picker", interactionClass: "PickerSuperInteraction",
    categories: ["Club", "Situation", "Picker", "Social"], targetType: "phone", actorType: "sim",
    participants: 1, pack: "Get Together", pieMenuCategory: "Club", routing: false, animated: true,
    autonomous: false, hasTests: true, hasOutcomes: false, referencesInteractions: true,
    ages: ["teen", "youngadult", "adult", "elder"], species: ["human"],
    summary: "Starts a club situation through a picker on the phone.",
  },
  {
    id: "ea_travel", tuningName: "super_Travel_ToLot", displayName: "Travel",
    kind: "picker", interactionClass: "PickerSuperInteraction",
    categories: ["Travel", "Venue", "Picker"], targetType: "phone", actorType: "sim",
    participants: 1, pack: BG, pieMenuCategory: "Travel", routing: false, animated: false,
    autonomous: false, hasTests: true, hasOutcomes: false, referencesInteractions: false,
    ages: ["teen", "youngadult", "adult", "elder"], species: ["human"],
    summary: "Lot picker travel interaction.",
  },
  {
    id: "ea_door_lock", tuningName: "super_Door_SetLock", displayName: "Set Lock",
    kind: "picker", interactionClass: "PickerSuperInteraction",
    categories: ["Door and Routing", "Object Use", "Picker"], targetType: "door", actorType: "sim",
    participants: 1, pack: BG, pieMenuCategory: "Door", routing: true, animated: true,
    autonomous: false, hasTests: true, hasOutcomes: false, referencesInteractions: false,
    ages: ["teen", "youngadult", "adult", "elder"], species: ["human"], objectType: "Door",
    summary: "Door affordance modifying routing permissions.",
  },
  {
    id: "ea_inventory_put", tuningName: "immediate_Inventory_PutAway", displayName: "Put Away",
    kind: "immediate", interactionClass: "ImmediateSuperInteraction",
    categories: ["Inventory", "Immediate", "Object Use"], targetType: "inventory_item", actorType: "sim",
    participants: 1, pack: BG, pieMenuCategory: "None", routing: false, animated: false,
    autonomous: true, hasTests: true, hasOutcomes: false, referencesInteractions: false,
    ages: ["child", "teen", "youngadult", "adult", "elder"], species: ["human"],
    summary: "Immediate, un-animated inventory transfer — a good immediate-interaction base.",
  },
  {
    id: "ea_collect", tuningName: "super_Collect_Object", displayName: "Collect",
    kind: "super", interactionClass: "SuperInteraction",
    categories: ["Collecting", "Inventory", "Object Use", "Sim-to-Object"], targetType: "object",
    actorType: "sim", participants: 1, pack: BG, pieMenuCategory: "None", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: ["child", "teen", "youngadult", "adult", "elder"], species: ["human"],
    summary: "Pick-up interaction that destroys the world object and adds an inventory item.",
  },
  {
    id: "ea_purchase", tuningName: "super_Purchase_Object", displayName: "Purchase",
    kind: "picker", interactionClass: "PickerSuperInteraction",
    categories: ["Purchase", "Retail", "Picker", "Inventory"], targetType: "object", actorType: "sim",
    participants: 1, pack: BG, pieMenuCategory: "Purchase", routing: true, animated: true,
    autonomous: false, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: ["teen", "youngadult", "adult", "elder"], species: ["human"],
    summary: "Currency test plus inventory grant.",
  },
  {
    id: "ea_debug_reset", tuningName: "immediate_Debug_ResetObject", displayName: "Reset Object (Debug)",
    kind: "immediate", interactionClass: "ImmediateSuperInteraction",
    categories: ["Debug", "Cheat", "Immediate", "Object Use"], targetType: "object", actorType: "sim",
    participants: 1, pack: BG, pieMenuCategory: "Debug", routing: false, animated: false,
    autonomous: false, hasTests: false, hasOutcomes: false, referencesInteractions: false,
    ages: [], species: [], summary: "Testing-cheats-only immediate interaction.",
  },
  {
    id: "ea_vampire_drink", tuningName: "social_Vampire_DrinkFrom", displayName: "Drink From Sim",
    kind: "social_mixer", interactionClass: "SocialMixerInteraction",
    categories: ["Occult", "Social", "Mean", "Sim-to-Sim"], targetType: "sim", actorType: "sim",
    participants: 2, pack: "Vampires", pieMenuCategory: "Vampire", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: true,
    ages: ["teen", "youngadult", "adult", "elder"], species: ["human"],
    requiredTrait: "Vampire", summary: "Occult-gated paired animation with strong relationship outcomes.",
  },
  {
    id: "ea_spellcast", tuningName: "super_Spellcaster_CastSpell", displayName: "Cast Spell",
    kind: "picker", interactionClass: "PickerSuperInteraction",
    categories: ["Occult", "Skill", "Picker", "Sim-to-Sim"], targetType: "sim", actorType: "sim",
    participants: 2, pack: "Realm of Magic", pieMenuCategory: "Magic", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: true,
    ages: ["child", "teen", "youngadult", "adult", "elder"], species: ["human"],
    requiredTrait: "Spellcaster", summary: "Spell picker with critical success and backfire outcomes.",
  },
  {
    id: "ea_ghost_haunt", tuningName: "super_Ghost_Haunt", displayName: "Haunt",
    kind: "super", interactionClass: "SuperInteraction",
    categories: ["Death and Ghost", "Occult", "Mischief", "Sim-to-Object"], targetType: "object",
    actorType: "sim", participants: 1, pack: BG, pieMenuCategory: "Ghost", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: ["teen", "youngadult", "adult", "elder"], species: ["human"], requiredTrait: "Ghost",
    summary: "Ghost-only object possession with visual effects.",
  },
  {
    id: "ea_pregnancy_checkup", tuningName: "super_Pregnancy_Checkup", displayName: "Take Pregnancy Test",
    kind: "super", interactionClass: "SuperInteraction",
    categories: ["Pregnancy", "Object Use", "Sim-to-Object"], targetType: "object", actorType: "sim",
    participants: 1, pack: BG, pieMenuCategory: "None", routing: true, animated: true,
    autonomous: false, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: ["teen", "youngadult", "adult", "elder"], species: ["human"],
    summary: "Buff-gated interaction with branching notification outcomes.",
  },
  {
    id: "ea_ask_about_career", tuningName: "social_Friendly_AskAboutCareer", displayName: "Ask About Career",
    kind: "social_mixer", interactionClass: "SocialMixerInteraction",
    categories: ["Social", "Friendly", "Career", "Sim-to-Sim"], targetType: "sim", actorType: "sim",
    participants: 2, pack: BG, pieMenuCategory: "Friendly", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: ["teen", "youngadult", "adult", "elder"], species: ["human"],
    summary: "Career-aware friendly social — the usual base for custom 'ask about' mods.",
  },
  {
    id: "ea_group_selfie", tuningName: "super_Photography_GroupSelfie", displayName: "Take Group Selfie",
    kind: "super", interactionClass: "SuperInteraction",
    categories: ["Social", "Multi-Sim", "Art", "Object Use"], targetType: "none", actorType: "sim",
    participants: 3, pack: "Get Famous", pieMenuCategory: "Friendly", routing: true, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: true,
    ages: ["child", "teen", "youngadult", "adult", "elder"], species: ["human"],
    summary: "Multi-Sim group animation with a created photo object.",
  },
  {
    id: "ea_situation_start", tuningName: "immediate_Situation_Start", displayName: "Start Event",
    kind: "immediate", interactionClass: "ImmediateSuperInteraction",
    categories: ["Situation", "Event", "Immediate"], targetType: "situation", actorType: "sim",
    participants: 1, pack: BG, pieMenuCategory: "Events", routing: false, animated: false,
    autonomous: false, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: ["teen", "youngadult", "adult", "elder"], species: ["human"],
    summary: "Immediate interaction that starts a situation — common event-mod base.",
  },
  {
    id: "ea_object_self_clean", tuningName: "super_Object_SelfMaintain", displayName: "Self Maintain",
    kind: "object", interactionClass: "SuperInteraction",
    categories: ["Object-to-Object", "Object Use", "Cleaning"], targetType: "object", actorType: "object",
    participants: 0, pack: BG, pieMenuCategory: "None", routing: false, animated: true,
    autonomous: true, hasTests: true, hasOutcomes: true, referencesInteractions: false,
    ages: [], species: [], summary: "Object-run affordance with no Sim actor — object-to-object reference.",
  },
];

/* --------------------------------------------------------------- search -- */

export interface InteractionQuery {
  text: string;
  categories: InteractionCategory[];
  kinds: InteractionKind[];
  targetTypes: TargetType[];
  packs: string[];
  ages: string[];
  species: string[];
  animatedOnly: boolean;
  autonomousOnly: boolean;
  routedOnly: boolean;
  minParticipants: number;
}

export const emptyQuery = (): InteractionQuery => ({
  text: "",
  categories: [],
  kinds: [],
  targetTypes: [],
  packs: [],
  ages: [],
  species: [],
  animatedOnly: false,
  autonomousOnly: false,
  routedOnly: false,
  minParticipants: 0,
});

export function searchInteractions(
  q: InteractionQuery,
  source: EaInteraction[] = EA_INTERACTIONS,
): EaInteraction[] {
  const text = q.text.trim().toLowerCase();
  return source.filter((i) => {
    if (text) {
      const hay = [
        i.tuningName, i.displayName, i.summary, i.pack, i.pieMenuCategory, i.interactionClass,
        i.objectType ?? "", i.animationRef ?? "", i.instanceId ?? "", i.requiredTrait ?? "",
        i.requiredBuff ?? "", i.requiredSkill ?? "", i.categories.join(" "), i.targetType, i.kind,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(text)) return false;
    }
    if (q.categories.length && !q.categories.some((c) => i.categories.includes(c))) return false;
    if (q.kinds.length && !q.kinds.includes(i.kind)) return false;
    if (q.targetTypes.length && !q.targetTypes.includes(i.targetType)) return false;
    if (q.packs.length && !q.packs.includes(i.pack)) return false;
    if (q.ages.length && !q.ages.some((a) => i.ages.includes(a))) return false;
    if (q.species.length && !q.species.some((s) => i.species.includes(s))) return false;
    if (q.animatedOnly && !i.animated) return false;
    if (q.autonomousOnly && !i.autonomous) return false;
    if (q.routedOnly && !i.routing) return false;
    if (q.minParticipants && i.participants < q.minParticipants) return false;
    return true;
  });
}

/** Category → matching interactions, so the library is browsable by behaviour. */
export function groupByCategory(list: EaInteraction[]): { category: InteractionCategory; items: EaInteraction[] }[] {
  const map = new Map<InteractionCategory, EaInteraction[]>();
  for (const i of list) {
    for (const c of i.categories) map.set(c, [...(map.get(c) ?? []), i]);
  }
  return [...map.entries()]
    .map(([category, items]) => ({ category, items }))
    .sort((a, b) => b.items.length - a.items.length || a.category.localeCompare(b.category));
}

export const ALL_PACKS = [...new Set(EA_INTERACTIONS.map((i) => i.pack))].sort();
