/**
 * Pack catalog — drives the Pack-Specific Mechanics builder.
 *
 * Adding a new pack or mechanic category means appending to this list only;
 * no builder code changes. Each mechanic declares a field template so the
 * generic rule editor can render typed inputs and persist structured data.
 */

import type { PackTier } from "./types";

export interface MechanicField {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select";
  options?: string[];
  help?: string;
}

export interface MechanicTemplate {
  key: string;
  label: string;
  description: string;
  resourceTypes: string[];
  fields: MechanicField[];
}

export interface PackDefinition {
  key: string;
  label: string;
  tier: PackTier;
  code: string;
  mechanics: MechanicTemplate[];
}

const f = (key: string, label: string, type: MechanicField["type"] = "text", options?: string[]): MechanicField =>
  ({ key, label, type, options });

const COMMON: MechanicField[] = [
  f("weight", "Autonomy weight", "number"),
  f("cooldownHours", "Cooldown (hours)", "number"),
  f("enabledForNpc", "Applies to NPCs", "boolean"),
];

function mech(key: string, label: string, description: string, resourceTypes: string[], fields: MechanicField[] = []): MechanicTemplate {
  return { key, label, description, resourceTypes, fields: [...fields, ...COMMON] };
}

export const PACK_CATALOG: PackDefinition[] = [
  {
    key: "base-game", label: "Base Game", tier: "base-game", code: "BG",
    mechanics: [
      mech("aspiration-hooks", "Aspiration hooks", "Custom milestone and whim hooks.", ["Tuning", "SimData", "STBL"]),
      mech("sim-filters", "Sim filters", "Reusable filters for situation jobs.", ["Tuning"]),
      mech("venue-rules", "Venue rules", "Custom venue behavior and schedules.", ["Tuning", "SimData"]),
    ],
  },
  {
    key: "get-together", label: "Get Together", tier: "expansion", code: "EP02",
    mechanics: [
      mech("clubs", "Clubs", "Club definitions, seeds and filters.", ["Tuning", "SimData", "STBL"], [f("clubSeed", "Seeded club", "boolean")]),
      mech("club-perks", "Club perks", "Perk unlock tree and point costs.", ["Tuning", "STBL"], [f("pointCost", "Point cost", "number")]),
      mech("gatherings", "Gatherings", "Gathering situations and goals.", ["Tuning"], [f("durationHours", "Duration (hours)", "number")]),
      mech("dance-parties", "Dance parties", "Dance floor situations and skill gates.", ["Tuning"]),
      mech("dj-events", "DJ events", "DJ booth events and rewards.", ["Tuning"]),
    ],
  },
  {
    key: "city-living", label: "City Living", tier: "expansion", code: "EP03",
    mechanics: [
      mech("festivals", "Festivals", "Festival situations and schedules.", ["Tuning", "STBL"], [f("day", "Calendar day", "text")]),
      mech("apartments", "Apartments", "Apartment rules and quirks.", ["Tuning"]),
      mech("lot-traits", "Lot traits", "Custom lot traits.", ["Tuning", "SimData", "STBL"]),
      mech("neighborhood-events", "Neighborhood events", "Street events.", ["Tuning"]),
      mech("food-stalls", "Food stalls", "Stall menus and vendors.", ["Tuning"]),
      mech("karaoke", "Karaoke contests", "Contest situations and scoring.", ["Tuning"]),
      mech("politics", "Political career mechanics", "Career-linked civic actions.", ["Tuning", "SimData"]),
    ],
  },
  {
    key: "cats-dogs", label: "Cats & Dogs", tier: "expansion", code: "EP04",
    mechanics: [
      mech("pet-traits", "Pet traits", "Custom pet traits.", ["Tuning", "SimData", "STBL"]),
      mech("vet-clinic", "Vet clinic rules", "Clinic perks and pricing.", ["Tuning"]),
      mech("pet-illness", "Pet illnesses", "Illness definitions and cures.", ["Tuning"]),
      mech("pet-interactions", "Pet interactions", "Pet-only affordances.", ["Tuning"]),
      mech("breeding", "Breeding rules", "Genetics and offspring rules.", ["Tuning", "Python"]),
      mech("strays", "Stray generation", "Stray spawn filters.", ["Tuning"]),
    ],
  },
  {
    key: "seasons", label: "Seasons", tier: "expansion", code: "EP05",
    mechanics: [
      mech("holidays", "Holidays", "Custom holidays.", ["Tuning", "STBL"], [f("season", "Season", "select", ["Spring", "Summer", "Fall", "Winter"])]),
      mech("traditions", "Traditions", "Holiday traditions and scoring.", ["Tuning", "STBL"]),
      mech("weather-reactions", "Weather reactions", "Buffs from weather states.", ["Tuning"]),
      mech("seasonal-buffs", "Seasonal buffs", "Season-gated buffs.", ["Tuning"]),
      mech("calendar", "Calendar events", "Calendar entries and reminders.", ["Tuning"]),
      mech("gift-roles", "Gift-giver roles", "Father Winter-style NPC roles.", ["Tuning", "Python"]),
      mech("decorations", "Decoration rules", "Auto-decorate rules.", ["Tuning"]),
    ],
  },
  {
    key: "get-famous", label: "Get Famous", tier: "expansion", code: "EP06",
    mechanics: [
      mech("fame-perks", "Fame perks", "Perk tree and costs.", ["Tuning", "STBL"]),
      mech("reputation", "Reputation", "Reputation events and decay.", ["Tuning"]),
      mech("quirks", "Celebrity quirks", "Quirk unlock conditions.", ["Tuning"]),
      mech("gigs", "Acting gigs", "Gig situations and payouts.", ["Tuning"], [f("payout", "Payout", "number")]),
      mech("auditions", "Auditions", "Audition rules.", ["Tuning"]),
      mech("media", "Media production", "Studio production rules.", ["Tuning"]),
      mech("fans", "Fan behavior", "Fan spawn and autonomy.", ["Tuning"]),
    ],
  },
  {
    key: "island-living", label: "Island Living", tier: "expansion", code: "EP07",
    mechanics: [
      mech("conservation", "Conservation", "Conservationist actions.", ["Tuning"]),
      mech("island-events", "Island events", "Island situations.", ["Tuning"]),
      mech("mermaids", "Mermaids", "Occult rules and powers.", ["Tuning", "Python"]),
      mech("elementals", "Elementals", "Island spirit behavior.", ["Tuning"]),
      mech("beach", "Beach interactions", "Beach-only affordances.", ["Tuning"]),
      mech("culture", "Island culture", "Cultural buffs and reputation.", ["Tuning"]),
    ],
  },
  {
    key: "university", label: "Discover University", tier: "expansion", code: "EP08",
    mechanics: [
      mech("degrees", "Degrees", "Custom degrees and career bonuses.", ["Tuning", "SimData", "STBL"]),
      mech("organizations", "Organizations", "Org membership and tasks.", ["Tuning"]),
      mech("scholarships", "Scholarships", "Award conditions and value.", ["Tuning"], [f("value", "Award value", "number")]),
      mech("classes", "Classes", "Class schedules and grading.", ["Tuning"]),
      mech("student-status", "Student status", "Enrollment states.", ["Tuning"]),
      mech("probation", "Academic probation", "Probation rules.", ["Tuning"]),
      mech("graduation", "Graduation rules", "Graduation ceremony and rewards.", ["Tuning"]),
    ],
  },
  {
    key: "eco-lifestyle", label: "Eco Lifestyle", tier: "expansion", code: "EP09",
    mechanics: [
      mech("nap", "Neighborhood Action Plans", "Custom NAPs.", ["Tuning", "SimData", "STBL"]),
      mech("footprint", "Eco footprint", "Footprint contributors.", ["Tuning"]),
      mech("community-projects", "Community projects", "Project stages and rewards.", ["Tuning"]),
      mech("fabrication", "Fabrication", "Fabricator recipes.", ["Tuning"]),
      mech("civil-designer", "Civil designer mechanics", "Career-linked actions.", ["Tuning"]),
      mech("voting", "Voting", "Voting sessions and outcomes.", ["Tuning", "Python"]),
    ],
  },
  {
    key: "snowy-escape", label: "Snowy Escape", tier: "expansion", code: "EP10",
    mechanics: [
      mech("lifestyles", "Lifestyles", "Custom lifestyles.", ["Tuning", "SimData", "STBL"]),
      mech("sentiments", "Sentiments", "Sentiment definitions and decay.", ["Tuning", "STBL"]),
      mech("excursions", "Mountain excursions", "Excursion situations.", ["Tuning"]),
      mech("festivals", "Festivals", "Snowy festivals.", ["Tuning"]),
      mech("vacation", "Vacation rules", "Vacation lot rules.", ["Tuning"]),
    ],
  },
  {
    key: "cottage-living", label: "Cottage Living", tier: "expansion", code: "EP11",
    mechanics: [
      mech("animal-relationships", "Animal relationships", "Farm animal bonds.", ["Tuning"]),
      mech("errands", "Village errands", "Errand board tasks.", ["Tuning"]),
      mech("fairs", "Fairs", "Fair competitions.", ["Tuning"]),
      mech("simple-living", "Simple Living", "Ingredient requirements.", ["Tuning"]),
      mech("crop-quality", "Crop quality", "Quality curves.", ["Tuning"]),
      mech("animal-treats", "Animal treats", "Treat effects.", ["Tuning"]),
    ],
  },
  {
    key: "high-school", label: "High School Years", tier: "expansion", code: "EP12",
    mechanics: [
      mech("school-events", "School events", "Class and event scheduling.", ["Tuning"]),
      mech("prom", "Prom", "Prom situation and outcomes.", ["Tuning"]),
      mech("graduation", "Graduation", "Graduation rules.", ["Tuning"]),
      mech("after-school", "After-school activities", "Activity progression.", ["Tuning"]),
      mech("social-hooks", "Social app hooks", "Social feed hooks.", ["Tuning", "Python"]),
      mech("teen-aspirations", "Teen aspirations", "Teen-only aspirations.", ["Tuning", "STBL"]),
      mech("detention", "Detention", "Detention triggers.", ["Tuning"]),
    ],
  },
  {
    key: "growing-together", label: "Growing Together", tier: "expansion", code: "EP14",
    mechanics: [
      mech("milestones", "Milestones", "Custom milestones.", ["Tuning", "SimData", "STBL"]),
      mech("family-dynamics", "Family dynamics", "Dynamic definitions.", ["Tuning"]),
      mech("compatibility", "Social compatibility", "Compatibility scoring.", ["Tuning"]),
      mech("infant-quirks", "Infant quirks", "Quirk definitions.", ["Tuning"]),
      mech("midlife-crisis", "Midlife crisis", "Crisis goals.", ["Tuning"]),
      mech("family-visits", "Family visits", "Visit situations.", ["Tuning"]),
    ],
  },
  {
    key: "horse-ranch", label: "Horse Ranch", tier: "expansion", code: "EP15",
    mechanics: [
      mech("horse-traits", "Horse traits", "Custom horse traits.", ["Tuning", "SimData", "STBL"]),
      mech("competitions", "Horse competitions", "Competition tiers and payouts.", ["Tuning"], [f("payout", "Payout", "number")]),
      mech("ranch-hands", "Ranch hands", "NPC roles and schedules.", ["Tuning"]),
      mech("nectar", "Nectar making", "Nectar recipes and aging.", ["Tuning"]),
      mech("ranch-events", "Ranch events", "Ranch situations.", ["Tuning"]),
      mech("bonding", "Animal bonding", "Bond progression.", ["Tuning"]),
    ],
  },
  {
    key: "for-rent", label: "For Rent", tier: "expansion", code: "EP16",
    mechanics: [
      mech("rental-units", "Residential rental units", "Unit definitions.", ["Tuning"]),
      mech("tenant-rules", "Tenant rules", "Tenant behavior and complaints.", ["Tuning"]),
      mech("landlord-events", "Landlord events", "Landlord situations.", ["Tuning"]),
      mech("unit-traits", "Unit traits", "Unit-level traits.", ["Tuning", "STBL"]),
      mech("rent", "Rent", "Rent calculation.", ["Tuning"], [f("baseRent", "Base rent", "number")]),
      mech("eviction", "Eviction", "Eviction conditions.", ["Tuning"]),
      mech("maintenance", "Maintenance events", "Repair events.", ["Tuning"]),
    ],
  },
  {
    key: "lovestruck", label: "Lovestruck", tier: "expansion", code: "EP17",
    mechanics: [
      mech("attraction", "Attraction rules", "Attraction scoring.", ["Tuning"]),
      mech("turn-ons", "Turn-ons", "Turn-on definitions.", ["Tuning", "STBL"]),
      mech("turn-offs", "Turn-offs", "Turn-off definitions.", ["Tuning", "STBL"]),
      mech("romantic-satisfaction", "Romantic satisfaction", "Satisfaction decay and boosts.", ["Tuning"]),
      mech("dating-events", "Dating events", "Date situations and goals.", ["Tuning"]),
      mech("boundaries", "Relationship boundaries", "Boundary rules.", ["Tuning"]),
    ],
  },
  {
    key: "businesses-hobbies", label: "Businesses & Hobbies", tier: "expansion", code: "EP18",
    mechanics: [
      mech("small-business", "Small business rules", "Business types and rules.", ["Tuning"]),
      mech("business-perks", "Business perks", "Perk tree.", ["Tuning", "STBL"]),
      mech("employee-roles", "Employee roles", "Role schedules and wages.", ["Tuning"], [f("wage", "Wage", "number")]),
      mech("customer-behavior", "Customer behavior", "Customer autonomy.", ["Tuning"]),
      mech("hobby-progression", "Hobby progression", "Hobby levels.", ["Tuning"]),
      mech("classes", "Classes", "Taught classes.", ["Tuning"]),
      mech("custom-venues", "Custom venues", "Venue definitions.", ["Tuning", "SimData"]),
      mech("event-scheduling", "Custom event scheduling", "Recurring events.", ["Tuning"]),
    ],
  },
  {
    key: "custom", label: "Custom dependency", tier: "custom", code: "CUSTOM",
    mechanics: [mech("custom", "Custom mechanic", "Fully custom mechanic definition.", ["Tuning"])],
  },
  {
    key: "external-mod", label: "External mod dependency", tier: "external-mod", code: "MOD",
    mechanics: [mech("external", "External mod hook", "Hook into a third-party mod's tuning.", ["Tuning", "Python"])],
  },
];

export function findPack(key: string): PackDefinition | undefined {
  return PACK_CATALOG.find((p) => p.key === key);
}

export const PACK_TIER_LABEL: Record<PackTier, string> = {
  "base-game": "Base Game",
  expansion: "Expansion Pack",
  "game-pack": "Game Pack",
  "stuff-pack": "Stuff Pack",
  kit: "Kit",
  custom: "Custom dependency",
  "external-mod": "External mod dependency",
};
