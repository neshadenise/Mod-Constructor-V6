/**
 * Shared requirement / test-set model (Part 4).
 *
 * Every builder in the app (Aspirations, Traits, Careers, Buffs, Skills…)
 * describes gameplay conditions with the SAME structure so a requirement
 * authored once can be referenced anywhere. Nothing here contains tuning ids:
 * a requirement stores a spec id plus plain parameters, and the compiler in
 * `compile.ts` turns that into XML test tuning at export time.
 */

export type RequirementDomain =
  | "sim"
  | "skills"
  | "relationships"
  | "world"
  | "objects"
  | "gameplay";

export const REQUIREMENT_DOMAINS: { id: RequirementDomain; label: string }[] = [
  { id: "sim", label: "Sim" },
  { id: "skills", label: "Skills" },
  { id: "relationships", label: "Relationships" },
  { id: "world", label: "World" },
  { id: "objects", label: "Objects" },
  { id: "gameplay", label: "Gameplay" },
];

export type FieldType = "text" | "number" | "select" | "bool";

export interface RequirementFieldSpec {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
  min?: number;
  max?: number;
  default?: string | number | boolean;
  /** Hints that the value points at another project/game resource. */
  resource?: boolean;
}

export interface RequirementSpec {
  id: string;
  label: string;
  domain: RequirementDomain;
  /** Tuning class emitted for this test. */
  xmlClass: string;
  fields: RequirementFieldSpec[];
  /** Human sentence shown in the editor and the journal preview. */
  describe: (p: ParamBag) => string;
  /** Packs this test relies on, if any. */
  packs?: string[];
}

export type ParamValue = string | number | boolean;
export type ParamBag = Record<string, ParamValue>;

const OPS = ["equal", "not-equal", "greater-or-equal", "less-or-equal", "greater", "less"];
const opWord = (v: ParamValue | undefined) =>
  ({
    equal: "=",
    "not-equal": "≠",
    "greater-or-equal": "≥",
    "less-or-equal": "≤",
    greater: ">",
    less: "<",
  })[String(v ?? "equal")] ?? "=";

const f = {
  text: (id: string, label: string, placeholder = "", resource = false): RequirementFieldSpec => ({
    id,
    label,
    type: "text",
    placeholder,
    default: "",
    resource,
  }),
  num: (id: string, label: string, def = 1, min = 0, max = 999999): RequirementFieldSpec => ({
    id,
    label,
    type: "number",
    default: def,
    min,
    max,
  }),
  sel: (id: string, label: string, options: string[], def?: string): RequirementFieldSpec => ({
    id,
    label,
    type: "select",
    options,
    default: def ?? options[0] ?? "",
  }),
  bool: (id: string, label: string, def = false): RequirementFieldSpec => ({
    id,
    label,
    type: "bool",
    default: def,
  }),
  op: (): RequirementFieldSpec => f.sel("operator", "Comparison", OPS, "greater-or-equal"),
};

const AGES = ["Infant", "Toddler", "Child", "Teen", "Young Adult", "Adult", "Elder"];
const SPECIES = ["Human", "Dog", "Cat", "Horse", "Small Dog"];
const OCCULTS = [
  "None",
  "Vampire",
  "Spellcaster",
  "Mermaid",
  "Alien",
  "Ghost",
  "Werewolf",
  "Servo",
  "Fairy",
  "Plant Sim",
];
const EMOTIONS = [
  "Happy",
  "Sad",
  "Angry",
  "Flirty",
  "Playful",
  "Focused",
  "Inspired",
  "Confident",
  "Energized",
  "Bored",
  "Uncomfortable",
  "Embarrassed",
  "Tense",
  "Dazed",
  "Scared",
];

/* ------------------------------------------------------------- catalogue -- */

export const REQUIREMENT_SPECS: RequirementSpec[] = [
  /* ---- Sim ---- */
  {
    id: "sim.age",
    label: "Age",
    domain: "sim",
    xmlClass: "V:sim_info.age",
    fields: [f.sel("age", "Age", AGES, "Teen"), f.sel("mode", "Rule", ["is", "is not", "at least"])],
    describe: (p) => `Sim age ${p.mode ?? "is"} ${p.age ?? "Teen"}`,
  },
  {
    id: "sim.species",
    label: "Species",
    domain: "sim",
    xmlClass: "V:sim_info.species",
    fields: [f.sel("species", "Species", SPECIES), f.bool("invert", "Must NOT be")],
    describe: (p) => `Sim ${p.invert ? "is not" : "is"} a ${p.species ?? "Human"}`,
  },
  {
    id: "sim.occult",
    label: "Occult",
    domain: "sim",
    xmlClass: "V:sim_info.occult",
    fields: [f.sel("occult", "Occult", OCCULTS, "Vampire"), f.bool("invert", "Must NOT be")],
    describe: (p) => `Sim ${p.invert ? "is not" : "is"} a ${p.occult ?? "Vampire"}`,
  },
  {
    id: "sim.gender",
    label: "Gender",
    domain: "sim",
    xmlClass: "V:sim_info.gender",
    fields: [f.sel("gender", "Gender", ["Female", "Male", "Any"])],
    describe: (p) => `Sim gender is ${p.gender ?? "Any"}`,
  },
  {
    id: "sim.household",
    label: "Household",
    domain: "sim",
    xmlClass: "V:household.membership",
    fields: [f.sel("rule", "Rule", ["is played household", "is NPC household", "owns the lot"])],
    describe: (p) => `Household ${p.rule ?? "is played household"}`,
  },
  {
    id: "sim.household-size",
    label: "Household size",
    domain: "sim",
    xmlClass: "V:household.size",
    fields: [f.op(), f.num("count", "Sims", 4, 1, 20)],
    describe: (p) => `Household size ${opWord(p.operator)} ${p.count ?? 4}`,
  },
  {
    id: "sim.pregnancy",
    label: "Pregnancy",
    domain: "sim",
    xmlClass: "V:sim_info.pregnancy",
    fields: [f.sel("state", "State", ["is pregnant", "is not pregnant", "is expecting twins"])],
    describe: (p) => `Sim ${p.state ?? "is pregnant"}`,
  },
  {
    id: "sim.marriage",
    label: "Marriage",
    domain: "sim",
    xmlClass: "V:relationship.marriage",
    fields: [f.sel("state", "State", ["is married", "is single", "is engaged", "is divorced"])],
    describe: (p) => `Sim ${p.state ?? "is married"}`,
  },
  {
    id: "sim.children",
    label: "Children",
    domain: "sim",
    xmlClass: "V:relationship.children",
    fields: [f.op(), f.num("count", "Children", 1, 0, 12)],
    describe: (p) => `Number of children ${opWord(p.operator)} ${p.count ?? 1}`,
  },
  {
    id: "sim.fame",
    label: "Fame level",
    domain: "sim",
    xmlClass: "V:fame.level",
    fields: [f.op(), f.num("level", "Star level", 3, 0, 5)],
    describe: (p) => `Fame ${opWord(p.operator)} ${p.level ?? 3} stars`,
    packs: ["Get Famous"],
  },
  {
    id: "sim.reputation",
    label: "Reputation",
    domain: "sim",
    xmlClass: "V:reputation.level",
    fields: [
      f.sel("rep", "Reputation", [
        "Pillar of the Community",
        "Good",
        "Neutral",
        "Bad",
        "Terrible",
      ]),
    ],
    describe: (p) => `Reputation is ${p.rep ?? "Good"}`,
    packs: ["Get Famous"],
  },
  {
    id: "sim.lifestyle",
    label: "Lifestyle",
    domain: "sim",
    xmlClass: "V:lifestyle.has",
    fields: [f.text("lifestyle", "Lifestyle", "Health Nut"), f.bool("invert", "Must NOT have")],
    describe: (p) => `Sim ${p.invert ? "lacks" : "has"} the ${p.lifestyle || "…"} lifestyle`,
    packs: ["Snowy Escape"],
  },
  {
    id: "sim.preference",
    label: "Likes / dislikes",
    domain: "sim",
    xmlClass: "V:preference.has",
    fields: [
      f.sel("mode", "Preference", ["likes", "dislikes"]),
      f.text("subject", "Subject", "Painting"),
    ],
    describe: (p) => `Sim ${p.mode ?? "likes"} ${p.subject || "…"}`,
  },
  {
    id: "sim.university",
    label: "University enrollment",
    domain: "sim",
    xmlClass: "V:university.enrolled",
    fields: [f.sel("school", "School", ["Any", "Britechester", "Foxbury"])],
    describe: (p) => `Enrolled at ${p.school ?? "Any"} university`,
    packs: ["Discover University"],
  },
  {
    id: "sim.degree",
    label: "Degree",
    domain: "sim",
    xmlClass: "V:university.degree",
    fields: [
      f.text("degree", "Degree", "Fine Art"),
      f.sel("honours", "Standing", ["Any", "Regular", "Honours"]),
    ],
    describe: (p) => `Holds a ${p.honours === "Honours" ? "honours " : ""}degree in ${p.degree || "…"}`,
    packs: ["Discover University"],
  },
  {
    id: "sim.career",
    label: "Career",
    domain: "sim",
    xmlClass: "V:career.has",
    fields: [f.text("career", "Career", "Painter", true), f.bool("invert", "Must NOT have")],
    describe: (p) => `Sim ${p.invert ? "is not" : "is"} in the ${p.career || "…"} career`,
  },
  {
    id: "sim.career-branch",
    label: "Career branch",
    domain: "sim",
    xmlClass: "V:career.branch",
    fields: [f.text("career", "Career", "Painter", true), f.text("branch", "Branch", "Master of the Real")],
    describe: (p) => `${p.career || "Career"} branch is ${p.branch || "…"}`,
  },
  {
    id: "sim.career-level",
    label: "Career level",
    domain: "sim",
    xmlClass: "V:career.level",
    fields: [f.text("career", "Career", "Painter", true), f.op(), f.num("level", "Level", 5, 1, 10)],
    describe: (p) => `${p.career || "Career"} level ${opWord(p.operator)} ${p.level ?? 5}`,
  },
  {
    id: "sim.club",
    label: "Club membership",
    domain: "sim",
    xmlClass: "V:club.membership",
    fields: [f.text("club", "Club", "Any club"), f.bool("leader", "Must be club leader")],
    describe: (p) => `Member of ${p.club || "any club"}${p.leader ? " (as leader)" : ""}`,
    packs: ["Get Together"],
  },
  {
    id: "sim.organization",
    label: "Organization membership",
    domain: "sim",
    xmlClass: "V:organization.membership",
    fields: [f.text("org", "Organization", "Debate Guild"), f.op(), f.num("rank", "Rank", 1, 1, 10)],
    describe: (p) => `Member of ${p.org || "…"} at rank ${opWord(p.operator)} ${p.rank ?? 1}`,
    packs: ["Discover University"],
  },
  {
    id: "sim.trait",
    label: "Trait",
    domain: "sim",
    xmlClass: "V:trait.has",
    fields: [f.text("trait", "Trait", "trait_Creative", true), f.bool("invert", "Must NOT have")],
    describe: (p) => `Sim ${p.invert ? "does not have" : "has"} ${p.trait || "…"}`,
  },
  {
    id: "sim.buff",
    label: "Buff",
    domain: "sim",
    xmlClass: "V:buff.has",
    fields: [f.text("buff", "Buff", "buff_Inspired", true), f.bool("invert", "Must NOT have")],
    describe: (p) => `Sim ${p.invert ? "does not have" : "has"} the ${p.buff || "…"} buff`,
  },
  {
    id: "sim.emotion",
    label: "Emotion",
    domain: "sim",
    xmlClass: "V:mood.is",
    fields: [f.sel("emotion", "Emotion", EMOTIONS, "Inspired"), f.op(), f.num("intensity", "Intensity", 1, 0, 4)],
    describe: (p) => `Mood is ${p.emotion ?? "Inspired"} (intensity ${opWord(p.operator)} ${p.intensity ?? 1})`,
  },
  {
    id: "sim.walkstyle",
    label: "Walkstyle",
    domain: "sim",
    xmlClass: "V:walkstyle.is",
    fields: [f.text("style", "Walkstyle", "walkstyle_Confident")],
    describe: (p) => `Walkstyle is ${p.style || "…"}`,
  },
  {
    id: "sim.voice",
    label: "Voice",
    domain: "sim",
    xmlClass: "V:voice.is",
    fields: [f.sel("voice", "Voice", ["Voice 1", "Voice 2", "Voice 3", "Sweet", "Melodic", "Lilted"])],
    describe: (p) => `Voice is ${p.voice ?? "Voice 1"}`,
  },
  {
    id: "sim.body-type",
    label: "Body type",
    domain: "sim",
    xmlClass: "V:sim_info.body",
    fields: [f.sel("body", "Body", ["Fit", "Fat", "Lean", "Average"]), f.op(), f.num("value", "Value", 50, 0, 100)],
    describe: (p) => `${p.body ?? "Fit"} value ${opWord(p.operator)} ${p.value ?? 50}`,
  },
  {
    id: "sim.custom",
    label: "Custom Sim test",
    domain: "sim",
    xmlClass: "V:custom.sim",
    fields: [f.text("expression", "Tuning snippet", "my_custom_test"), f.text("note", "Note")],
    describe: (p) => `Custom Sim test ${p.expression || "…"}`,
  },

  /* ---- Skills ---- */
  {
    id: "skill.level",
    label: "Skill level",
    domain: "skills",
    xmlClass: "V:skill.level",
    fields: [f.text("skill", "Skill", "Painting", true), f.op(), f.num("level", "Level", 5, 0, 10)],
    describe: (p) => `${p.skill || "Skill"} ${opWord(p.operator)} level ${p.level ?? 5}`,
  },
  {
    id: "skill.exact",
    label: "Exact skill level",
    domain: "skills",
    xmlClass: "V:skill.level",
    fields: [f.text("skill", "Skill", "Cooking", true), f.num("level", "Level", 10, 0, 10)],
    describe: (p) => `${p.skill || "Skill"} is exactly level ${p.level ?? 10}`,
  },
  {
    id: "skill.max",
    label: "Maximum skill level",
    domain: "skills",
    xmlClass: "V:skill.level",
    fields: [f.text("skill", "Skill", "Painting", true), f.num("level", "Max level", 4, 0, 10)],
    describe: (p) => `${p.skill || "Skill"} is at most level ${p.level ?? 4}`,
  },
  {
    id: "skill.combined",
    label: "Combined skills",
    domain: "skills",
    xmlClass: "V:skill.combined",
    fields: [
      f.text("skills", "Skills (comma separated)", "Painting, Photography"),
      f.op(),
      f.num("total", "Combined level", 10, 0, 100),
    ],
    describe: (p) => `Combined ${p.skills || "skills"} ${opWord(p.operator)} ${p.total ?? 10}`,
  },
  {
    id: "skill.count",
    label: "Number of maxed skills",
    domain: "skills",
    xmlClass: "V:skill.maxed_count",
    fields: [f.op(), f.num("count", "Maxed skills", 3, 0, 40)],
    describe: (p) => `Maxed skills ${opWord(p.operator)} ${p.count ?? 3}`,
  },

  /* ---- Relationships ---- */
  {
    id: "rel.friendship",
    label: "Friendship",
    domain: "relationships",
    xmlClass: "V:relationship.track",
    fields: [f.op(), f.num("value", "Friendship", 50, -100, 100), f.sel("target", "Target", ["Any Sim", "Specific Sim", "Household member", "NPC"])],
    describe: (p) => `Friendship with ${p.target ?? "Any Sim"} ${opWord(p.operator)} ${p.value ?? 50}`,
  },
  {
    id: "rel.romance",
    label: "Romance",
    domain: "relationships",
    xmlClass: "V:relationship.track",
    fields: [f.op(), f.num("value", "Romance", 50, -100, 100), f.sel("target", "Target", ["Any Sim", "Specific Sim", "Household member", "NPC"])],
    describe: (p) => `Romance with ${p.target ?? "Any Sim"} ${opWord(p.operator)} ${p.value ?? 50}`,
  },
  {
    id: "rel.sentiment",
    label: "Sentiment",
    domain: "relationships",
    xmlClass: "V:sentiment.has",
    fields: [f.text("sentiment", "Sentiment", "Close"), f.op(), f.num("intensity", "Intensity", 1, 0, 5)],
    describe: (p) => `Has sentiment ${p.sentiment || "…"} ${opWord(p.operator)} ${p.intensity ?? 1}`,
  },
  {
    id: "rel.bit",
    label: "Relationship bit",
    domain: "relationships",
    xmlClass: "V:relationship.bit",
    fields: [f.text("bit", "Relationship bit", "Enemy", true), f.bool("invert", "Must NOT have")],
    describe: (p) => `${p.invert ? "Lacks" : "Has"} relationship bit ${p.bit || "…"}`,
  },
  {
    id: "rel.household",
    label: "Household relationship",
    domain: "relationships",
    xmlClass: "V:relationship.household",
    fields: [f.sel("rule", "Rule", ["Lives with target", "Does not live with target"])],
    describe: (p) => `${p.rule ?? "Lives with target"}`,
  },
  {
    id: "rel.family",
    label: "Family relationship",
    domain: "relationships",
    xmlClass: "V:relationship.family",
    fields: [
      f.sel("relation", "Relation", [
        "Parent",
        "Child",
        "Sibling",
        "Grandparent",
        "Grandchild",
        "Spouse",
        "Cousin",
      ]),
    ],
    describe: (p) => `Target is the Sim's ${p.relation ?? "Parent"}`,
  },
  {
    id: "rel.specific-sim",
    label: "Specific Sim",
    domain: "relationships",
    xmlClass: "V:sim.is",
    fields: [f.text("sim", "Sim", "Bella Goth"), f.bool("invert", "Must NOT be")],
    describe: (p) => `Target ${p.invert ? "is not" : "is"} ${p.sim || "…"}`,
  },
  {
    id: "rel.npc",
    label: "NPC role",
    domain: "relationships",
    xmlClass: "V:sim.npc_role",
    fields: [f.text("role", "NPC role", "Bartender")],
    describe: (p) => `Target is an NPC ${p.role || "…"}`,
  },

  /* ---- World ---- */
  {
    id: "world.world",
    label: "World",
    domain: "world",
    xmlClass: "V:world.is",
    fields: [f.text("world", "World", "Willow Creek"), f.bool("invert", "Must NOT be")],
    describe: (p) => `${p.invert ? "Not in" : "In"} ${p.world || "…"}`,
  },
  {
    id: "world.neighborhood",
    label: "Neighborhood",
    domain: "world",
    xmlClass: "V:world.neighborhood",
    fields: [f.text("neighborhood", "Neighborhood", "Foundry Cove")],
    describe: (p) => `In neighborhood ${p.neighborhood || "…"}`,
  },
  {
    id: "world.lot",
    label: "Lot",
    domain: "world",
    xmlClass: "V:lot.is",
    fields: [f.sel("rule", "Rule", ["Home lot", "Not home lot", "Named lot"]), f.text("lot", "Lot name")],
    describe: (p) => `${p.rule ?? "Home lot"}${p.lot ? ` — ${p.lot}` : ""}`,
  },
  {
    id: "world.lot-type",
    label: "Lot type",
    domain: "world",
    xmlClass: "V:lot.type",
    fields: [f.sel("type", "Lot type", ["Residential", "Retail", "Restaurant", "Vet Clinic", "Rental", "Community"])],
    describe: (p) => `Lot type is ${p.type ?? "Residential"}`,
  },
  {
    id: "world.venue",
    label: "Venue",
    domain: "world",
    xmlClass: "V:venue.type",
    fields: [f.text("venue", "Venue", "Bar")],
    describe: (p) => `Venue is ${p.venue || "…"}`,
  },
  {
    id: "world.region",
    label: "Region",
    domain: "world",
    xmlClass: "V:region.is",
    fields: [f.text("region", "Region", "Mt. Komorebi")],
    describe: (p) => `Region is ${p.region || "…"}`,
  },
  {
    id: "world.vacation",
    label: "Vacation world",
    domain: "world",
    xmlClass: "V:region.vacation",
    fields: [f.bool("onVacation", "Currently on vacation", true)],
    describe: (p) => (p.onVacation === false ? "Not on vacation" : "On vacation"),
  },
  {
    id: "world.weather",
    label: "Weather",
    domain: "world",
    xmlClass: "V:weather.is",
    fields: [f.sel("weather", "Weather", ["Sunny", "Cloudy", "Rain", "Storm", "Snow", "Heatwave", "Windy"])],
    describe: (p) => `Weather is ${p.weather ?? "Sunny"}`,
    packs: ["Seasons"],
  },
  {
    id: "world.season",
    label: "Season",
    domain: "world",
    xmlClass: "V:season.is",
    fields: [f.sel("season", "Season", ["Spring", "Summer", "Fall", "Winter"])],
    describe: (p) => `Season is ${p.season ?? "Spring"}`,
    packs: ["Seasons"],
  },
  {
    id: "world.holiday",
    label: "Holiday",
    domain: "world",
    xmlClass: "V:holiday.active",
    fields: [f.text("holiday", "Holiday", "Winterfest")],
    describe: (p) => `${p.holiday || "A holiday"} is active`,
    packs: ["Seasons"],
  },
  {
    id: "world.festival",
    label: "Festival",
    domain: "world",
    xmlClass: "V:festival.active",
    fields: [f.text("festival", "Festival", "Romance Festival")],
    describe: (p) => `${p.festival || "A festival"} is running`,
    packs: ["City Living"],
  },
  {
    id: "world.time",
    label: "Time of day",
    domain: "world",
    xmlClass: "V:time.of_day",
    fields: [f.num("from", "From hour", 8, 0, 23), f.num("to", "To hour", 18, 0, 23)],
    describe: (p) => `Between ${p.from ?? 8}:00 and ${p.to ?? 18}:00`,
  },
  {
    id: "world.day",
    label: "Day of week",
    domain: "world",
    xmlClass: "V:time.day_of_week",
    fields: [
      f.sel("day", "Day", ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]),
    ],
    describe: (p) => `Day is ${p.day ?? "Sunday"}`,
  },
  {
    id: "world.moon",
    label: "Moon phase",
    domain: "world",
    xmlClass: "V:moon.phase",
    fields: [f.sel("phase", "Phase", ["New Moon", "Waxing Crescent", "First Quarter", "Full Moon", "Waning"])],
    describe: (p) => `Moon phase is ${p.phase ?? "Full Moon"}`,
    packs: ["Werewolves"],
  },

  /* ---- Objects ---- */
  {
    id: "object.exists",
    label: "Object exists",
    domain: "objects",
    xmlClass: "V:object.exists",
    fields: [f.text("object", "Object", "Easel", true), f.op(), f.num("count", "Count", 1, 1, 99)],
    describe: (p) => `${p.object || "Object"} on lot ${opWord(p.operator)} ${p.count ?? 1}`,
  },
  {
    id: "object.owned",
    label: "Object owned",
    domain: "objects",
    xmlClass: "V:object.owned",
    fields: [f.text("object", "Object", "Piano", true)],
    describe: (p) => `Household owns ${p.object || "…"}`,
  },
  {
    id: "object.crafted",
    label: "Object crafted",
    domain: "objects",
    xmlClass: "V:object.crafted",
    fields: [f.text("object", "Object", "Painting", true), f.op(), f.num("count", "Count", 5, 1, 999)],
    describe: (p) => `Crafted ${p.object || "objects"} ${opWord(p.operator)} ${p.count ?? 5}`,
  },
  {
    id: "object.quality",
    label: "Object quality",
    domain: "objects",
    xmlClass: "V:object.quality",
    fields: [f.sel("quality", "Quality", ["Poor", "Normal", "Good", "Excellent", "Masterwork"]), f.op()],
    describe: (p) => `Quality ${opWord(p.operator)} ${p.quality ?? "Excellent"}`,
  },
  {
    id: "object.state",
    label: "Object state",
    domain: "objects",
    xmlClass: "V:object.state",
    fields: [f.text("state", "State", "Clean")],
    describe: (p) => `Object state is ${p.state || "…"}`,
  },
  {
    id: "object.inventory",
    label: "Inventory contains",
    domain: "objects",
    xmlClass: "V:inventory.contains",
    fields: [f.text("object", "Object", "Crystal", true), f.op(), f.num("count", "Count", 1, 1, 999)],
    describe: (p) => `Inventory holds ${p.object || "…"} ${opWord(p.operator)} ${p.count ?? 1}`,
  },
  {
    id: "object.tag",
    label: "Object tag",
    domain: "objects",
    xmlClass: "V:object.tag",
    fields: [f.text("tag", "Tag", "Func_Art"), f.bool("invert", "Must NOT have")],
    describe: (p) => `Object ${p.invert ? "lacks" : "has"} tag ${p.tag || "…"}`,
  },
  {
    id: "object.custom",
    label: "Custom object test",
    domain: "objects",
    xmlClass: "V:custom.object",
    fields: [f.text("expression", "Tuning snippet", "my_object_test")],
    describe: (p) => `Custom object test ${p.expression || "…"}`,
  },

  /* ---- Gameplay ---- */
  {
    id: "game.money",
    label: "Household funds",
    domain: "gameplay",
    xmlClass: "V:funds.household",
    fields: [f.op(), f.num("amount", "Simoleons", 20000, 0, 100000000)],
    describe: (p) => `Household funds ${opWord(p.operator)} §${p.amount ?? 20000}`,
  },
  {
    id: "game.business-funds",
    label: "Business funds",
    domain: "gameplay",
    xmlClass: "V:funds.business",
    fields: [f.op(), f.num("amount", "Simoleons", 5000, 0, 100000000)],
    describe: (p) => `Business funds ${opWord(p.operator)} §${p.amount ?? 5000}`,
  },
  {
    id: "game.collection",
    label: "Collection progress",
    domain: "gameplay",
    xmlClass: "V:collection.progress",
    fields: [f.text("collection", "Collection", "Crystals"), f.op(), f.num("percent", "Percent", 100, 0, 100)],
    describe: (p) => `${p.collection || "Collection"} ${opWord(p.operator)} ${p.percent ?? 100}%`,
  },
  {
    id: "game.aspiration-complete",
    label: "Aspiration complete",
    domain: "gameplay",
    xmlClass: "V:aspiration.completed",
    fields: [f.text("aspiration", "Aspiration", "", true), f.bool("invert", "Must NOT be complete")],
    describe: (p) => `${p.aspiration || "Aspiration"} ${p.invert ? "not completed" : "completed"}`,
  },
  {
    id: "game.milestone-complete",
    label: "Milestone complete",
    domain: "gameplay",
    xmlClass: "V:aspiration.milestone_completed",
    fields: [f.text("milestone", "Milestone", "", true)],
    describe: (p) => `Milestone ${p.milestone || "…"} completed`,
  },
  {
    id: "game.objective-complete",
    label: "Objective complete",
    domain: "gameplay",
    xmlClass: "V:objective.completed",
    fields: [f.text("objective", "Objective", "", true)],
    describe: (p) => `Objective ${p.objective || "…"} completed`,
  },
  {
    id: "game.statistic",
    label: "Statistic",
    domain: "gameplay",
    xmlClass: "V:statistic.value",
    fields: [f.text("stat", "Statistic", "statistic_Fun", true), f.op(), f.num("value", "Value", 50, -1000, 100000)],
    describe: (p) => `${p.stat || "Statistic"} ${opWord(p.operator)} ${p.value ?? 50}`,
  },
  {
    id: "game.commodity",
    label: "Commodity",
    domain: "gameplay",
    xmlClass: "V:commodity.value",
    fields: [f.text("commodity", "Commodity", "motive_Fun", true), f.op(), f.num("value", "Value", 50, -100, 100)],
    describe: (p) => `${p.commodity || "Commodity"} ${opWord(p.operator)} ${p.value ?? 50}`,
  },
  {
    id: "game.custom",
    label: "Custom test",
    domain: "gameplay",
    xmlClass: "V:custom.test",
    fields: [f.text("expression", "Tuning snippet", "my_test"), f.text("note", "Note")],
    describe: (p) => `Custom test ${p.expression || "…"}`,
  },
];

export const requirementSpec = (id: string): RequirementSpec =>
  REQUIREMENT_SPECS.find((s) => s.id === id) ?? REQUIREMENT_SPECS[0]!;

export const specsByDomain = (domain: RequirementDomain) =>
  REQUIREMENT_SPECS.filter((s) => s.domain === domain);

/* ------------------------------------------------------------------ tree -- */

export type GroupOperator = "and" | "or" | "not";

export interface RequirementLeaf {
  kind: "test";
  id: string;
  specId: string;
  params: ParamBag;
  negate: boolean;
  priority: number;
  comment: string;
}

export interface RequirementGroup {
  kind: "group";
  id: string;
  op: GroupOperator;
  children: RequirementNode[];
  priority: number;
  comment: string;
}

export type RequirementNode = RequirementLeaf | RequirementGroup;

export interface TestSetVersion {
  version: number;
  at: number;
  note: string;
  root: RequirementGroup;
}

export interface TestSet {
  uuid: string;
  name: string;
  description: string;
  root: RequirementGroup;
  tags: string[];
  version: number;
  createdAt: number;
  updatedAt: number;
  history: TestSetVersion[];
}

export const TESTSET_SCHEMA = "testset/1" as const;

export const rid = (prefix: string) =>
  `${prefix}_${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16).slice(-4)}`;

export function defaultParams(specId: string): ParamBag {
  const out: ParamBag = {};
  for (const field of requirementSpec(specId).fields) {
    out[field.id] = field.default ?? (field.type === "number" ? 0 : field.type === "bool" ? false : "");
  }
  return out;
}

export const makeLeaf = (specId = "sim.age"): RequirementLeaf => ({
  kind: "test",
  id: rid("test"),
  specId,
  params: defaultParams(specId),
  negate: false,
  priority: 0,
  comment: "",
});

export const makeGroup = (op: GroupOperator = "and", children: RequirementNode[] = []): RequirementGroup => ({
  kind: "group",
  id: rid("grp"),
  op,
  children,
  priority: 0,
  comment: "",
});

export function makeTestSet(name = "New test set"): TestSet {
  const now = Date.now();
  return {
    uuid: rid("testset"),
    name,
    description: "",
    root: makeGroup("and", [makeLeaf()]),
    tags: [],
    version: 1,
    createdAt: now,
    updatedAt: now,
    history: [],
  };
}

/** Deep clone with brand new node ids (used by duplicate / paste). */
export function cloneNode(node: RequirementNode): RequirementNode {
  if (node.kind === "test") return { ...node, id: rid("test"), params: { ...node.params } };
  return { ...node, id: rid("grp"), children: node.children.map(cloneNode) };
}

export function walkNodes(node: RequirementNode, visit: (n: RequirementNode, depth: number) => void, depth = 0) {
  visit(node, depth);
  if (node.kind === "group") node.children.forEach((c) => walkNodes(c, visit, depth + 1));
}

export function updateNode(
  root: RequirementGroup,
  id: string,
  fn: (n: RequirementNode) => RequirementNode,
): RequirementGroup {
  const rec = (n: RequirementNode): RequirementNode => {
    if (n.id === id) return fn(n);
    if (n.kind === "group") return { ...n, children: n.children.map(rec) };
    return n;
  };
  return rec(root) as RequirementGroup;
}

export function removeNode(root: RequirementGroup, id: string): RequirementGroup {
  const rec = (n: RequirementGroup): RequirementGroup => ({
    ...n,
    children: n.children
      .filter((c) => c.id !== id)
      .map((c) => (c.kind === "group" ? rec(c) : c)),
  });
  return rec(root);
}

export function addChild(root: RequirementGroup, parentId: string, child: RequirementNode): RequirementGroup {
  const rec = (n: RequirementGroup): RequirementGroup => ({
    ...n,
    children:
      n.id === parentId
        ? [...n.children, child]
        : n.children.map((c) => (c.kind === "group" ? rec(c) : c)),
  });
  return rec(root);
}

export function moveChild(root: RequirementGroup, id: string, delta: number): RequirementGroup {
  const rec = (n: RequirementGroup): RequirementGroup => {
    const i = n.children.findIndex((c) => c.id === id);
    if (i >= 0) {
      const next = [...n.children];
      const j = Math.max(0, Math.min(next.length - 1, i + delta));
      const [item] = next.splice(i, 1);
      next.splice(j, 0, item!);
      return { ...n, children: next };
    }
    return { ...n, children: n.children.map((c) => (c.kind === "group" ? rec(c) : c)) };
  };
  return rec(root);
}

export function countTests(node: RequirementNode): number {
  let n = 0;
  walkNodes(node, (x) => {
    if (x.kind === "test") n += 1;
  });
  return n;
}

export function maxDepth(node: RequirementNode): number {
  let d = 0;
  walkNodes(node, (_, depth) => {
    d = Math.max(d, depth);
  });
  return d;
}

/** Plain-English rendering of the whole tree — used everywhere in the UI. */
export function describeNode(node: RequirementNode): string {
  if (node.kind === "test") {
    const text = requirementSpec(node.specId).describe(node.params);
    return node.negate ? `NOT (${text})` : text;
  }
  const parts = node.children.map(describeNode).filter(Boolean);
  if (!parts.length) return "(empty group)";
  if (node.op === "not") return `NOT (${parts.join(" AND ")})`;
  return parts.length === 1 ? parts[0]! : `(${parts.join(node.op === "and" ? " AND " : " OR ")})`;
}

/** Packs any test in the set depends on. */
export function testSetPacks(set: TestSet): string[] {
  const packs = new Set<string>();
  walkNodes(set.root, (n) => {
    if (n.kind === "test") requirementSpec(n.specId).packs?.forEach((p) => packs.add(p));
  });
  return [...packs];
}

/** Resource-shaped parameter values (project / game references). */
export function testSetRefs(set: TestSet): { nodeId: string; field: string; value: string }[] {
  const out: { nodeId: string; field: string; value: string }[] = [];
  walkNodes(set.root, (n) => {
    if (n.kind !== "test") return;
    for (const field of requirementSpec(n.specId).fields) {
      if (!field.resource) continue;
      out.push({ nodeId: n.id, field: field.id, value: String(n.params[field.id] ?? "") });
    }
  });
  return out;
}

/** Structural fingerprint — two sets with the same fingerprint are duplicates. */
export function fingerprint(node: RequirementNode): string {
  if (node.kind === "test") {
    const params = Object.keys(node.params)
      .sort()
      .map((k) => `${k}=${String(node.params[k])}`)
      .join(",");
    return `${node.negate ? "!" : ""}${node.specId}(${params})`;
  }
  return `${node.op}[${node.children.map(fingerprint).sort().join("|")}]`;
}

export function pushHistory(set: TestSet, note: string): TestSet {
  return {
    ...set,
    version: set.version + 1,
    updatedAt: Date.now(),
    history: [
      { version: set.version, at: set.updatedAt, note, root: set.root },
      ...set.history,
    ].slice(0, 25),
  };
}
