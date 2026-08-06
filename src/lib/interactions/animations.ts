/**
 * Animation catalogue, categories and compatibility analysis.
 *
 * Compatibility is never assumed from a name: every check below compares the
 * animation's declared actors, rigs, postures, props and pack against the
 * interaction that wants to use it, and reports what is actually missing.
 */

import type { AnimationAssignment, InteractionDoc, Participant } from "./schema";

export const ANIMATION_CATEGORIES = [
  "Idle", "Standing", "Sitting", "Lying", "Sleeping", "Walking", "Running", "Routing", "Talking",
  "Listening", "Greeting", "Hugging", "Kissing", "Romantic", "Arguing", "Fighting", "Laughing",
  "Crying", "Angry", "Sad", "Scared", "Surprised", "Dancing", "Singing", "Playing Instrument",
  "Exercising", "Eating", "Drinking", "Cooking", "Cleaning", "Repairing", "Crafting", "Writing",
  "Reading", "Computer", "Phone", "Photography", "Posing", "Parenting", "Infant", "Toddler",
  "Child", "Pet", "Horse", "Occult", "Death", "Object Use", "Object Animation", "Paired Animation",
  "Group Animation", "Looping", "Transition", "Facial", "Full Body", "Upper Body", "Prop-Based",
  "Custom", "Other",
] as const;
export type AnimationCategory = (typeof ANIMATION_CATEGORIES)[number];

export interface AnimationActorDef {
  name: string;
  role: "actor" | "target" | "object" | "prop";
  rigAges: string[];
  rigSpecies: string[];
}

export interface EaAnimation {
  id: string;
  displayName: string;
  animationName: string;
  asmKey: string;
  stateMachine: string;
  stateName: string;
  clipName: string;
  categories: AnimationCategory[];
  pack: string;
  actors: AnimationActorDef[];
  posture: string;
  props: string[];
  object?: string;
  durationSec: number;
  looping: boolean;
  facial: boolean;
  body: "full" | "upper" | "facial";
  usedBy: string[];
  /** Only when resolved from a trusted source. */
  clipResourceId?: string;
  notes: string;
}

const human = (ages: string[] = ["teen", "youngadult", "adult", "elder"]) => ({
  rigAges: ages,
  rigSpecies: ["human"],
});

export const EA_ANIMATIONS: EaAnimation[] = [
  {
    id: "an_idle_stand", displayName: "Standing Idle", animationName: "a_idle_stand_x",
    asmKey: "sim_idle", stateMachine: "sim_idle", stateName: "idle_stand", clipName: "a_idle_stand_x",
    categories: ["Idle", "Standing", "Looping", "Full Body"], pack: "Base Game",
    actors: [{ name: "x", role: "actor", ...human(["child", "teen", "youngadult", "adult", "elder"]) }],
    posture: "standing", props: [], durationSec: 3, looping: true, facial: false, body: "full",
    usedBy: ["super_Social_Standing"], notes: "Safe default filler for any standing interaction.",
  },
  {
    id: "an_chat", displayName: "Standing Chat", animationName: "a2a_social_chat_x_y",
    asmKey: "social_standing", stateMachine: "social_standing", stateName: "chat", clipName: "a2a_social_chat_x",
    categories: ["Talking", "Standing", "Paired Animation", "Upper Body"], pack: "Base Game",
    actors: [
      { name: "x", role: "actor", ...human(["child", "teen", "youngadult", "adult", "elder"]) },
      { name: "y", role: "target", ...human(["child", "teen", "youngadult", "adult", "elder"]) },
    ],
    posture: "standing", props: [], durationSec: 5, looping: true, facial: true, body: "upper",
    usedBy: ["social_Friendly_Chat"], notes: "Two-actor chatter loop with facial overlay.",
  },
  {
    id: "an_listen", displayName: "Listening", animationName: "a_social_listen_x",
    asmKey: "social_standing", stateMachine: "social_standing", stateName: "listen", clipName: "a_social_listen_x",
    categories: ["Listening", "Standing", "Upper Body", "Looping"], pack: "Base Game",
    actors: [{ name: "x", role: "actor", ...human(["child", "teen", "youngadult", "adult", "elder"]) }],
    posture: "standing", props: [], durationSec: 4, looping: true, facial: true, body: "upper",
    usedBy: [], notes: "Reaction loop for the non-speaking participant.",
  },
  {
    id: "an_greet_wave", displayName: "Wave Greeting", animationName: "a2a_greet_wave_x_y",
    asmKey: "social_standing", stateMachine: "social_standing", stateName: "greet", clipName: "a2a_greet_wave_x",
    categories: ["Greeting", "Standing", "Paired Animation", "Upper Body"], pack: "Base Game",
    actors: [
      { name: "x", role: "actor", ...human(["child", "teen", "youngadult", "adult", "elder"]) },
      { name: "y", role: "target", ...human(["child", "teen", "youngadult", "adult", "elder"]) },
    ],
    posture: "standing", props: [], durationSec: 3, looping: false, facial: true, body: "upper",
    usedBy: [], notes: "Short greeting; good sequence entry animation.",
  },
  {
    id: "an_hug", displayName: "Friendly Hug", animationName: "a2a_hug_friendly_x_y",
    asmKey: "social_hug", stateMachine: "social_hug", stateName: "hug_friendly", clipName: "a2a_hug_friendly_x",
    categories: ["Hugging", "Paired Animation", "Full Body", "Transition"], pack: "Base Game",
    actors: [
      { name: "x", role: "actor", ...human(["child", "teen", "youngadult", "adult", "elder"]) },
      { name: "y", role: "target", ...human(["child", "teen", "youngadult", "adult", "elder"]) },
    ],
    posture: "standing", props: [], durationSec: 4, looping: false, facial: true, body: "full",
    usedBy: ["social_Friendly_Hug"], notes: "Requires both actors aligned before playback.",
  },
  {
    id: "an_kiss", displayName: "Kiss", animationName: "a2a_kiss_x_y",
    asmKey: "social_romance", stateMachine: "social_romance", stateName: "kiss", clipName: "a2a_kiss_x",
    categories: ["Kissing", "Romantic", "Paired Animation", "Full Body"], pack: "Base Game",
    actors: [
      { name: "x", role: "actor", ...human(["teen", "youngadult", "adult", "elder"]) },
      { name: "y", role: "target", ...human(["teen", "youngadult", "adult", "elder"]) },
    ],
    posture: "standing", props: [], durationSec: 5, looping: false, facial: true, body: "full",
    usedBy: ["social_Romance_FirstKiss"], notes: "Teen+ rigs only; alignment is mandatory.",
  },
  {
    id: "an_argue", displayName: "Argue", animationName: "a2a_argue_x_y",
    asmKey: "social_mean", stateMachine: "social_mean", stateName: "argue", clipName: "a2a_argue_x",
    categories: ["Arguing", "Angry", "Paired Animation", "Upper Body"], pack: "Base Game",
    actors: [
      { name: "x", role: "actor", ...human(["child", "teen", "youngadult", "adult", "elder"]) },
      { name: "y", role: "target", ...human(["child", "teen", "youngadult", "adult", "elder"]) },
    ],
    posture: "standing", props: [], durationSec: 6, looping: true, facial: true, body: "upper",
    usedBy: ["social_Mean_Argue"], notes: "Loops until the mixer ends.",
  },
  {
    id: "an_laugh", displayName: "Laugh", animationName: "a_react_laugh_x",
    asmKey: "sim_reaction", stateMachine: "sim_reaction", stateName: "laugh", clipName: "a_react_laugh_x",
    categories: ["Laughing", "Facial", "Upper Body"], pack: "Base Game",
    actors: [{ name: "x", role: "actor", ...human(["child", "teen", "youngadult", "adult", "elder"]) }],
    posture: "standing", props: [], durationSec: 2, looping: false, facial: true, body: "upper",
    usedBy: ["social_Funny_TellJoke"], notes: "Reaction clip; pairs well with timing events.",
  },
  {
    id: "an_cry", displayName: "Cry", animationName: "a_react_cry_x",
    asmKey: "sim_reaction", stateMachine: "sim_reaction", stateName: "cry", clipName: "a_react_cry_x",
    categories: ["Crying", "Sad", "Facial", "Full Body"], pack: "Base Game",
    actors: [{ name: "x", role: "actor", ...human(["child", "teen", "youngadult", "adult", "elder"]) }],
    posture: "standing", props: [], durationSec: 4, looping: true, facial: true, body: "full",
    usedBy: [], notes: "Sad reaction loop.",
  },
  {
    id: "an_dance_solo", displayName: "Solo Dance", animationName: "a_dance_solo_x",
    asmKey: "dance_solo", stateMachine: "dance_solo", stateName: "dance_loop", clipName: "a_dance_solo_x",
    categories: ["Dancing", "Looping", "Full Body"], pack: "Base Game",
    actors: [{ name: "x", role: "actor", ...human(["child", "teen", "youngadult", "adult", "elder"]) }],
    posture: "standing", props: [], durationSec: 8, looping: true, facial: false, body: "full",
    usedBy: ["super_Dance_Solo"], notes: "Skill-tiered solo dance loop.",
  },
  {
    id: "an_dance_partner", displayName: "Partner Dance", animationName: "a2a_dance_partner_x_y",
    asmKey: "dance_partner", stateMachine: "dance_partner", stateName: "dance_loop", clipName: "a2a_dance_partner_x",
    categories: ["Dancing", "Paired Animation", "Looping", "Full Body"], pack: "Base Game",
    actors: [
      { name: "x", role: "actor", ...human(["teen", "youngadult", "adult", "elder"]) },
      { name: "y", role: "target", ...human(["teen", "youngadult", "adult", "elder"]) },
    ],
    posture: "standing", props: [], durationSec: 10, looping: true, facial: false, body: "full",
    usedBy: ["social_Dance_Together"], notes: "Both actors must be routed and aligned first.",
  },
  {
    id: "an_dance_group", displayName: "Group Routine", animationName: "a3a_dance_group_x_y_z",
    asmKey: "dance_group", stateMachine: "dance_group", stateName: "routine", clipName: "a3a_dance_group_x",
    categories: ["Dancing", "Group Animation", "Full Body"], pack: "Base Game",
    actors: [
      { name: "x", role: "actor", ...human() },
      { name: "y", role: "target", ...human() },
      { name: "z", role: "target", ...human() },
    ],
    posture: "standing", props: [], durationSec: 12, looping: false, facial: false, body: "full",
    usedBy: [], notes: "Three-actor routine — needs three participants mapped.",
  },
  {
    id: "an_sit_idle", displayName: "Seated Idle", animationName: "a_sit_idle_x",
    asmKey: "posture_sit", stateMachine: "posture_sit", stateName: "sit_idle", clipName: "a_sit_idle_x",
    categories: ["Sitting", "Idle", "Looping", "Full Body"], pack: "Base Game",
    actors: [{ name: "x", role: "actor", ...human(["child", "teen", "youngadult", "adult", "elder"]) }],
    posture: "sitting", props: [], object: "Seating", durationSec: 4, looping: true, facial: false,
    body: "full", usedBy: ["sit_Passive"], notes: "Requires the seated posture and a seating object.",
  },
  {
    id: "an_sleep", displayName: "Sleep Loop", animationName: "a_sleep_bed_x",
    asmKey: "posture_sleep", stateMachine: "posture_sleep", stateName: "sleep_loop", clipName: "a_sleep_bed_x",
    categories: ["Sleeping", "Lying", "Looping", "Full Body"], pack: "Base Game",
    actors: [{ name: "x", role: "actor", ...human(["child", "teen", "youngadult", "adult", "elder"]) }],
    posture: "lying", props: [], object: "Bed", durationSec: 20, looping: true, facial: false,
    body: "full", usedBy: ["super_Sleep_Bed"], notes: "Bed object animation runs in parallel.",
  },
  {
    id: "an_route_walk", displayName: "Walk Route", animationName: "a_route_walk_x",
    asmKey: "sim_locomotion", stateMachine: "sim_locomotion", stateName: "walk", clipName: "a_route_walk_x",
    categories: ["Walking", "Routing", "Looping", "Full Body"], pack: "Base Game",
    actors: [{ name: "x", role: "actor", ...human(["child", "teen", "youngadult", "adult", "elder"]) }],
    posture: "standing", props: [], durationSec: 1, looping: true, facial: false, body: "full",
    usedBy: [], notes: "Locomotion state — do not drive it manually from a sequence.",
  },
  {
    id: "an_eat", displayName: "Eat Meal", animationName: "a_eat_meal_x",
    asmKey: "consume", stateMachine: "consume", stateName: "eat", clipName: "a_eat_meal_x",
    categories: ["Eating", "Prop-Based", "Looping", "Upper Body"], pack: "Base Game",
    actors: [{ name: "x", role: "actor", ...human(["child", "teen", "youngadult", "adult", "elder"]) }],
    posture: "sitting", props: ["fork", "plate"], object: "Consumable", durationSec: 6, looping: true,
    facial: true, body: "upper", usedBy: ["super_Eat_Meal"], notes: "Needs the plate prop in hand.",
  },
  {
    id: "an_cook", displayName: "Cook At Stove", animationName: "a_cook_stove_x",
    asmKey: "cooking", stateMachine: "cooking", stateName: "cook_loop", clipName: "a_cook_stove_x",
    categories: ["Cooking", "Object Use", "Looping", "Full Body"], pack: "Base Game",
    actors: [
      { name: "x", role: "actor", ...human(["teen", "youngadult", "adult", "elder"]) },
      { name: "stove", role: "object", rigAges: [], rigSpecies: [] },
    ],
    posture: "standing", props: ["pan"], object: "Stove", durationSec: 10, looping: true, facial: false,
    body: "full", usedBy: ["super_Cook_Meal"], notes: "Object actor drives the stove animation.",
  },
  {
    id: "an_clean", displayName: "Wipe Clean", animationName: "a_clean_wipe_x",
    asmKey: "cleaning", stateMachine: "cleaning", stateName: "wipe", clipName: "a_clean_wipe_x",
    categories: ["Cleaning", "Object Use", "Looping", "Upper Body"], pack: "Base Game",
    actors: [{ name: "x", role: "actor", ...human(["child", "teen", "youngadult", "adult", "elder"]) }],
    posture: "standing", props: ["rag"], durationSec: 6, looping: true, facial: false, body: "upper",
    usedBy: ["super_Clean_Object"], notes: "Prop required or the hand will be empty.",
  },
  {
    id: "an_repair", displayName: "Repair Kneel", animationName: "a_repair_kneel_x",
    asmKey: "handiness", stateMachine: "handiness", stateName: "repair_loop", clipName: "a_repair_kneel_x",
    categories: ["Repairing", "Object Use", "Looping", "Full Body"], pack: "Base Game",
    actors: [{ name: "x", role: "actor", ...human(["teen", "youngadult", "adult", "elder"]) }],
    posture: "kneeling", props: ["wrench"], durationSec: 8, looping: true, facial: false, body: "full",
    usedBy: ["super_Repair_Object"], notes: "Kneeling posture; needs floor clearance.",
  },
  {
    id: "an_craft_table", displayName: "Craft At Table", animationName: "a_craft_table_x",
    asmKey: "crafting", stateMachine: "crafting", stateName: "craft_loop", clipName: "a_craft_table_x",
    categories: ["Crafting", "Object Use", "Looping", "Full Body"], pack: "Base Game",
    actors: [
      { name: "x", role: "actor", ...human(["child", "teen", "youngadult", "adult", "elder"]) },
      { name: "table", role: "object", rigAges: [], rigSpecies: [] },
    ],
    posture: "standing", props: [], object: "Crafting Table", durationSec: 9, looping: true,
    facial: false, body: "full", usedBy: [], notes: "Generic crafting loop with an object actor slot.",
  },
  {
    id: "an_write", displayName: "Type At Computer", animationName: "a_computer_type_x",
    asmKey: "computer", stateMachine: "computer", stateName: "type_loop", clipName: "a_computer_type_x",
    categories: ["Computer", "Writing", "Sitting", "Looping", "Upper Body"], pack: "Base Game",
    actors: [
      { name: "x", role: "actor", ...human(["child", "teen", "youngadult", "adult", "elder"]) },
      { name: "computer", role: "object", rigAges: [], rigSpecies: [] },
    ],
    posture: "sitting", props: [], object: "Computer", durationSec: 8, looping: true, facial: false,
    body: "upper", usedBy: ["super_Computer_BrowseWeb", "super_Writing_Write"],
    notes: "Seated posture plus a computer object actor.",
  },
  {
    id: "an_read", displayName: "Read Book", animationName: "a_read_book_x",
    asmKey: "reading", stateMachine: "reading", stateName: "read_loop", clipName: "a_read_book_x",
    categories: ["Reading", "Prop-Based", "Looping", "Upper Body"], pack: "Base Game",
    actors: [{ name: "x", role: "actor", ...human(["child", "teen", "youngadult", "adult", "elder"]) }],
    posture: "standing", props: ["book"], durationSec: 8, looping: true, facial: false, body: "upper",
    usedBy: ["super_Read_Book"], notes: "Book prop is carried in both hands.",
  },
  {
    id: "an_phone", displayName: "Phone Talk", animationName: "a_phone_talk_x",
    asmKey: "phone", stateMachine: "phone", stateName: "talk_loop", clipName: "a_phone_talk_x",
    categories: ["Phone", "Talking", "Prop-Based", "Looping", "Upper Body"], pack: "Base Game",
    actors: [{ name: "x", role: "actor", ...human(["child", "teen", "youngadult", "adult", "elder"]) }],
    posture: "standing", props: ["phone"], durationSec: 6, looping: true, facial: true, body: "upper",
    usedBy: ["super_Phone_Call"], notes: "Phone prop is spawned by the ASM.",
  },
  {
    id: "an_guitar", displayName: "Play Guitar", animationName: "a_guitar_play_x",
    asmKey: "instrument_guitar", stateMachine: "instrument_guitar", stateName: "play_loop",
    clipName: "a_guitar_play_x", categories: ["Playing Instrument", "Music", "Prop-Based", "Looping", "Full Body"],
    pack: "Base Game",
    actors: [
      { name: "x", role: "actor", ...human(["child", "teen", "youngadult", "adult", "elder"]) },
      { name: "guitar", role: "object", rigAges: [], rigSpecies: [] },
    ],
    posture: "standing", props: [], object: "Guitar", durationSec: 12, looping: true, facial: false,
    body: "full", usedBy: ["super_Guitar_Play"], notes: "Requires the guitar object, not a prop.",
  },
  {
    id: "an_workout", displayName: "Workout Loop", animationName: "a_fitness_workout_x",
    asmKey: "fitness", stateMachine: "fitness", stateName: "workout_loop", clipName: "a_fitness_workout_x",
    categories: ["Exercising", "Looping", "Full Body"], pack: "Base Game",
    actors: [{ name: "x", role: "actor", ...human(["teen", "youngadult", "adult", "elder"]) }],
    posture: "standing", props: [], durationSec: 10, looping: true, facial: false, body: "full",
    usedBy: ["super_Fitness_Workout"], notes: "High-energy loop; adds sweat VFX in EA tuning.",
  },
  {
    id: "an_pose", displayName: "Pose For Photo", animationName: "a_photo_pose_x",
    asmKey: "photography", stateMachine: "photography", stateName: "pose", clipName: "a_photo_pose_x",
    categories: ["Posing", "Photography", "Full Body"], pack: "Get Famous",
    actors: [{ name: "x", role: "actor", ...human(["child", "teen", "youngadult", "adult", "elder"]) }],
    posture: "standing", props: [], durationSec: 3, looping: false, facial: true, body: "full",
    usedBy: ["super_Photography_GroupSelfie"], notes: "Short hold; ideal for group sequences.",
  },
  {
    id: "an_toddler_play", displayName: "Toddler Play", animationName: "a_toddler_play_x",
    asmKey: "toddler", stateMachine: "toddler", stateName: "play_loop", clipName: "a_toddler_play_x",
    categories: ["Toddler", "Child", "Looping", "Full Body"], pack: "Base Game",
    actors: [{ name: "x", role: "actor", rigAges: ["toddler"], rigSpecies: ["human"] }],
    posture: "standing", props: [], durationSec: 6, looping: true, facial: true, body: "full",
    usedBy: [], notes: "Toddler rig only — will not retarget to child or adult.",
  },
  {
    id: "an_infant_hold", displayName: "Hold Infant", animationName: "a2a_infant_hold_x_y",
    asmKey: "infant", stateMachine: "infant", stateName: "hold", clipName: "a2a_infant_hold_x",
    categories: ["Infant", "Parenting", "Paired Animation", "Full Body"], pack: "Growing Together",
    actors: [
      { name: "x", role: "actor", ...human() },
      { name: "y", role: "target", rigAges: ["infant"], rigSpecies: ["human"] },
    ],
    posture: "carrying", props: [], durationSec: 5, looping: true, facial: false, body: "full",
    usedBy: ["super_Infant_PickUp"], notes: "Carry posture with an infant rig target.",
  },
  {
    id: "an_pet_idle", displayName: "Pet Idle", animationName: "a_pet_idle_x",
    asmKey: "pet_idle", stateMachine: "pet_idle", stateName: "idle", clipName: "a_pet_idle_x",
    categories: ["Pet", "Idle", "Looping", "Full Body"], pack: "Cats & Dogs",
    actors: [{ name: "x", role: "actor", rigAges: ["child", "adult", "elder"], rigSpecies: ["cat", "dog", "smalldog"] }],
    posture: "standing", props: [], durationSec: 4, looping: true, facial: false, body: "full",
    usedBy: [], notes: "Pet rigs only.",
  },
  {
    id: "an_horse_trot", displayName: "Horse Trot", animationName: "a_horse_trot_x",
    asmKey: "horse_locomotion", stateMachine: "horse_locomotion", stateName: "trot", clipName: "a_horse_trot_x",
    categories: ["Horse", "Walking", "Looping", "Full Body"], pack: "Horse Ranch",
    actors: [{ name: "x", role: "actor", rigAges: ["child", "adult", "elder"], rigSpecies: ["horse"] }],
    posture: "standing", props: [], durationSec: 4, looping: true, facial: false, body: "full",
    usedBy: ["super_Horse_Ride"], notes: "Horse rig only; rider uses a separate mounted clip.",
  },
  {
    id: "an_occult_cast", displayName: "Cast Spell", animationName: "a_spell_cast_x",
    asmKey: "spellcaster", stateMachine: "spellcaster", stateName: "cast", clipName: "a_spell_cast_x",
    categories: ["Occult", "Full Body"], pack: "Realm of Magic",
    actors: [{ name: "x", role: "actor", ...human(["child", "teen", "youngadult", "adult", "elder"]) }],
    posture: "standing", props: ["wand"], durationSec: 4, looping: false, facial: true, body: "full",
    usedBy: ["super_Spellcaster_CastSpell"], notes: "Wand prop optional; VFX carried by tuning.",
  },
  {
    id: "an_death", displayName: "Death Reaction", animationName: "a_death_react_x",
    asmKey: "death", stateMachine: "death", stateName: "react", clipName: "a_death_react_x",
    categories: ["Death", "Scared", "Full Body"], pack: "Base Game",
    actors: [{ name: "x", role: "actor", ...human(["child", "teen", "youngadult", "adult", "elder"]) }],
    posture: "standing", props: [], durationSec: 6, looping: false, facial: true, body: "full",
    usedBy: [], notes: "Long non-cancelable reaction.",
  },
  {
    id: "an_object_door", displayName: "Door Swing", animationName: "ao_door_swing",
    asmKey: "door", stateMachine: "door", stateName: "swing", clipName: "ao_door_swing",
    categories: ["Object Animation", "Transition"], pack: "Base Game",
    actors: [{ name: "door", role: "object", rigAges: [], rigSpecies: [] }],
    posture: "", props: [], object: "Door", durationSec: 1, looping: false, facial: false, body: "full",
    usedBy: ["super_Door_SetLock"], notes: "Object-only animation, no Sim actor.",
  },
  {
    id: "an_transition_stand_sit", displayName: "Stand → Sit Transition", animationName: "a_trans_stand_to_sit_x",
    asmKey: "posture_transition", stateMachine: "posture_transition", stateName: "stand_to_sit",
    clipName: "a_trans_stand_to_sit_x", categories: ["Transition", "Sitting", "Full Body"], pack: "Base Game",
    actors: [{ name: "x", role: "actor", ...human(["child", "teen", "youngadult", "adult", "elder"]) }],
    posture: "sitting", props: [], object: "Seating", durationSec: 2, looping: false, facial: false,
    body: "full", usedBy: ["sit_Passive"], notes: "Insert before any seated loop.",
  },
  {
    id: "an_facial_smile", displayName: "Smile Overlay", animationName: "af_smile_x",
    asmKey: "facial_overlay", stateMachine: "facial_overlay", stateName: "smile", clipName: "af_smile_x",
    categories: ["Facial", "Upper Body"], pack: "Base Game",
    actors: [{ name: "x", role: "actor", ...human(["child", "teen", "youngadult", "adult", "elder"]) }],
    posture: "", props: [], durationSec: 2, looping: true, facial: true, body: "facial",
    usedBy: [], notes: "Overlay only — safe to run in parallel with a body clip.",
  },
];

/* --------------------------------------------------------------- search -- */

export interface AnimationQuery {
  text: string;
  categories: AnimationCategory[];
  packs: string[];
  ages: string[];
  species: string[];
  postures: string[];
  loopingOnly: boolean;
  pairedOnly: boolean;
  minActors: number;
}

export const emptyAnimationQuery = (): AnimationQuery => ({
  text: "",
  categories: [],
  packs: [],
  ages: [],
  species: [],
  postures: [],
  loopingOnly: false,
  pairedOnly: false,
  minActors: 0,
});

export function searchAnimations(q: AnimationQuery, source: EaAnimation[] = EA_ANIMATIONS): EaAnimation[] {
  const text = q.text.trim().toLowerCase();
  return source.filter((a) => {
    if (text) {
      const hay = [
        a.displayName, a.animationName, a.asmKey, a.stateMachine, a.stateName, a.clipName, a.pack,
        a.posture, a.object ?? "", a.props.join(" "), a.usedBy.join(" "), a.categories.join(" "),
        a.actors.map((x) => x.name).join(" "), a.clipResourceId ?? "", a.notes,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(text)) return false;
    }
    if (q.categories.length && !q.categories.some((c) => a.categories.includes(c))) return false;
    if (q.packs.length && !q.packs.includes(a.pack)) return false;
    if (q.ages.length && !a.actors.some((x) => q.ages.some((age) => x.rigAges.includes(age)))) return false;
    if (q.species.length && !a.actors.some((x) => q.species.some((s) => x.rigSpecies.includes(s)))) return false;
    if (q.postures.length && !q.postures.includes(a.posture)) return false;
    if (q.loopingOnly && !a.looping) return false;
    if (q.pairedOnly && a.actors.filter((x) => x.role !== "object").length < 2) return false;
    if (q.minActors && a.actors.length < q.minActors) return false;
    return true;
  });
}

export function groupAnimationsByCategory(list: EaAnimation[]) {
  const map = new Map<AnimationCategory, EaAnimation[]>();
  for (const a of list) for (const c of a.categories) map.set(c, [...(map.get(c) ?? []), a]);
  return [...map.entries()]
    .map(([category, items]) => ({ category, items }))
    .sort((a, b) => b.items.length - a.items.length || a.category.localeCompare(b.category));
}

export const ANIMATION_PACKS = [...new Set(EA_ANIMATIONS.map((a) => a.pack))].sort();
export const ANIMATION_POSTURES = [...new Set(EA_ANIMATIONS.map((a) => a.posture).filter(Boolean))].sort();

/* -------------------------------------------------------- compatibility -- */

export type CompatLevel = "error" | "warning" | "info";

export interface CompatIssue {
  level: CompatLevel;
  code: string;
  message: string;
  fix?: string;
}

export function findAnimation(id: string): EaAnimation | undefined {
  return EA_ANIMATIONS.find((a) => a.id === id || a.animationName === id);
}

/**
 * Compare an animation against the interaction that wants to play it.
 * Nothing here is inferred from the animation's name.
 */
export function checkAnimationCompatibility(
  anim: EaAnimation | undefined,
  assignment: AnimationAssignment,
  doc: InteractionDoc,
  installedPacks: string[] = [],
): CompatIssue[] {
  const issues: CompatIssue[] = [];
  const sims = doc.participants.filter((p) => p.slot !== "Object" && p.slot !== "PickedObject");

  if (!anim) {
    if (assignment.source === "custom_animation" || assignment.source === "custom_asm") {
      const set = doc.animationSets.find((s) => s.uuid === assignment.refId);
      if (!set) {
        issues.push({
          level: "error", code: "missing_asm",
          message: "The custom animation set this assignment points at no longer exists.",
          fix: "Re-import the animation set or pick another animation.",
        });
        return issues;
      }
      if (!set.asmKey)
        issues.push({ level: "error", code: "missing_asm", message: `“${set.name}” has no ASM key.`, fix: "Set the ASM key on the imported animation set." });
      if (!set.states.some((s) => s.kind === "entry"))
        issues.push({ level: "warning", code: "missing_state", message: `“${set.name}” has no entry state.` });
      if (!set.actors.length)
        issues.push({ level: "error", code: "missing_actor", message: `“${set.name}” declares no actors.` });
      for (const actor of set.actors) {
        if (!actor.clip)
          issues.push({ level: "error", code: "missing_clip", message: `Actor “${actor.name}” has no clip assigned.` });
      }
      if (set.actors.length > sims.length)
        issues.push({
          level: "error", code: "participant_count",
          message: `The set needs ${set.actors.length} actors but the interaction defines ${sims.length} Sim participants.`,
          fix: "Add participants, or use an animation with fewer actors.",
        });
      return issues;
    }
    if (assignment.source !== "none")
      issues.push({ level: "error", code: "missing_asm", message: "No animation is selected for this assignment." });
    return issues;
  }

  // Pack availability.
  if (anim.pack !== "Base Game" && installedPacks.length && !installedPacks.includes(anim.pack))
    issues.push({
      level: "warning", code: "pack_unavailable",
      message: `“${anim.displayName}” comes from ${anim.pack}, which is not marked as installed.`,
      fix: "Add the pack to the interaction's pack requirements or choose a base-game animation.",
    });

  // Actor mapping.
  const needed = anim.actors.filter((a) => a.role === "actor" || a.role === "target");
  const mapped = new Set(assignment.roles.map((r) => r.asmActor).filter(Boolean));
  for (const a of needed) {
    if (!mapped.has(a.name))
      issues.push({
        level: "error", code: a.role === "target" ? "missing_target_role" : "missing_actor_role",
        message: `ASM actor “${a.name}” (${a.role}) is not mapped to a participant.`,
        fix: "Map it in Animation Setup → role mapping.",
      });
  }
  if (needed.length > sims.length)
    issues.push({
      level: "error", code: "participant_count",
      message: `This animation needs ${needed.length} Sims; the interaction defines ${sims.length}.`,
    });

  // Rig checks against participant restrictions.
  for (const role of assignment.roles) {
    const part = doc.participants.find((p) => p.uuid === role.participantUuid);
    const def = anim.actors.find((a) => a.name === role.asmActor);
    if (!part || !def || def.role === "object" || def.role === "prop") continue;
    const ages = part.restrictions.ages;
    if (ages.length && def.rigAges.length && !ages.some((a) => def.rigAges.includes(a)))
      issues.push({
        level: "error", code: "age_rig",
        message: `“${part.label}” allows ${ages.join(", ")} but the clip only has rigs for ${def.rigAges.join(", ")}.`,
        fix: "Restrict the participant's ages or pick an age-appropriate animation.",
      });
    const species = part.restrictions.species;
    if (species.length && def.rigSpecies.length && !species.some((s) => def.rigSpecies.includes(s)))
      issues.push({
        level: "error", code: "species_rig",
        message: `“${part.label}” allows ${species.join(", ")} but the clip only has rigs for ${def.rigSpecies.join(", ")}.`,
      });
  }

  // Object / prop / posture requirements.
  if (anim.object && !doc.objectReqs.objectTuning && !doc.objectReqs.objectTags.length)
    issues.push({
      level: "warning", code: "missing_object",
      message: `This animation expects a ${anim.object}, but the interaction declares no required object.`,
      fix: "Set a required object in Object & Slots.",
    });
  for (const prop of anim.props) {
    if (!doc.objectReqs.props.includes(prop))
      issues.push({
        level: "warning", code: "missing_prop",
        message: `Prop “${prop}” is used by this clip but is not listed in the interaction's props.`,
        fix: "Add the prop under Object & Slots.",
      });
  }
  if (anim.posture && doc.objectReqs.requiredPosture && anim.posture !== doc.objectReqs.requiredPosture)
    issues.push({
      level: "error", code: "posture",
      message: `Clip posture is “${anim.posture}” but the interaction requires “${doc.objectReqs.requiredPosture}”.`,
      fix: "Add a posture-change step before this animation.",
    });
  if (anim.posture && !doc.objectReqs.requiredPosture && anim.posture !== "standing")
    issues.push({
      level: "info", code: "posture",
      message: `This clip plays in the ${anim.posture} posture — make sure the sequence gets there first.`,
    });

  // Routing sanity.
  const routed = doc.participants.some((p) => p.routingRole !== "none");
  if (needed.length > 1 && !routed)
    issues.push({
      level: "warning", code: "routing",
      message: "Paired animation with no participant set to route or align — Sims may play it apart.",
      fix: "Set a routing role on the actor and target, or add route/align steps.",
    });

  if (assignment.loop && !anim.looping)
    issues.push({
      level: "warning", code: "loop_mismatch",
      message: "This assignment is marked looping but the clip is a one-shot.",
    });

  return issues;
}

/** Suggest a sensible role map for a freshly picked animation. */
export function suggestRoles(anim: EaAnimation, participants: Participant[]) {
  const sims = participants.filter((p) => p.slot !== "Object" && p.slot !== "PickedObject");
  const objects = participants.filter((p) => p.slot === "Object" || p.slot === "PickedObject");
  let s = 0;
  let o = 0;
  return anim.actors
    .map((a) => {
      const pool = a.role === "object" || a.role === "prop" ? objects : sims;
      const idx = a.role === "object" || a.role === "prop" ? o++ : s++;
      const part = pool[idx];
      return part ? { participantUuid: part.uuid, asmActor: a.name } : null;
    })
    .filter((r): r is { participantUuid: string; asmActor: string } => r !== null);
}
