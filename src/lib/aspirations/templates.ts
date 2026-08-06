/**
 * Aspiration templates.
 *
 * Templates seed a recommended milestone structure for a common aspiration
 * style. They are starting points, not cages: everything they set is a normal
 * editable field and nothing is locked to EA's format.
 */

import {
  blankAspirationDoc,
  makeMilestone,
  makeObjective,
  sanitizeInternalName,
  type AspirationCategoryId,
  type AspirationDoc,
  type AspirationTypeId,
  type DifficultyId,
} from "./schema";

export interface AspirationTemplate {
  id: string;
  label: string;
  blurb: string;
  category: AspirationCategoryId;
  type: AspirationTypeId;
  difficulty: DifficultyId;
  /** [milestone title, objective labels] */
  structure: [string, string[]][];
}

export const ASPIRATION_TEMPLATES: AspirationTemplate[] = [
  {
    id: "knowledge", label: "Knowledge", blurb: "Skill mastery with escalating study goals.",
    category: "Knowledge", type: "primary", difficulty: "normal",
    structure: [
      ["Curious Mind", ["Read 3 books", "Reach Logic level 2"]],
      ["Dedicated Student", ["Reach Logic level 5", "Research 5 topics"]],
      ["Field Expert", ["Reach Logic level 8", "Mentor another Sim"]],
      ["Renowned Scholar", ["Reach Logic level 10", "Publish a paper"]],
    ],
  },
  {
    id: "creative", label: "Creative", blurb: "Make, sell and be known for your work.",
    category: "Creativity", type: "primary", difficulty: "normal",
    structure: [
      ["First Sketches", ["Paint 3 paintings", "Reach Painting level 3"]],
      ["Working Artist", ["Sell 5 works", "Reach Painting level 6"]],
      ["Gallery Name", ["Sell a masterpiece", "Reach Painting level 9"]],
      ["Celebrated Creator", ["Complete 3 commissions"]],
    ],
  },
  {
    id: "athletic", label: "Athletic", blurb: "Fitness progression with physical challenges.",
    category: "Athletic", type: "primary", difficulty: "hard",
    structure: [
      ["Warming Up", ["Work out 5 times", "Reach Fitness level 3"]],
      ["Serious Training", ["Reach Fitness level 6", "Win a sparring match"]],
      ["Peak Condition", ["Reach Fitness level 10", "Win 3 competitions"]],
    ],
  },
  {
    id: "family", label: "Family", blurb: "Household milestones across generations.",
    category: "Family", type: "primary", difficulty: "normal",
    structure: [
      ["New Beginnings", ["Get married", "Reach a friendly relationship with 3 Sims"]],
      ["Growing Household", ["Have a child", "Raise a toddler to Child"]],
      ["Family Legacy", ["Raise 2 children to Teen", "Become a grandparent"]],
    ],
  },
  {
    id: "romance", label: "Romance", blurb: "Charisma and relationship-driven goals.",
    category: "Romance", type: "primary", difficulty: "normal",
    structure: [
      ["First Flirt", ["Flirt with 3 Sims", "Reach Charisma level 3"]],
      ["Sweetheart", ["Have 2 romantic partners", "First kiss"]],
      ["Serial Romantic", ["Reach Charisma level 8", "Woohoo in 3 locations"]],
    ],
  },
  {
    id: "nature", label: "Nature", blurb: "Gardening, collecting and the outdoors.",
    category: "Nature", type: "primary", difficulty: "easy",
    structure: [
      ["Green Thumb", ["Plant 5 plants", "Reach Gardening level 3"]],
      ["Harvest Season", ["Harvest 20 items", "Reach Gardening level 6"]],
      ["Guardian of the Grove", ["Grow a perfect plant", "Reach Gardening level 10"]],
    ],
  },
  {
    id: "food", label: "Food", blurb: "Cooking mastery from grilled cheese upward.",
    category: "Food", type: "primary", difficulty: "normal",
    structure: [
      ["Home Cook", ["Cook 5 meals", "Reach Cooking level 3"]],
      ["Kitchen Confident", ["Cook 3 gourmet meals", "Reach Gourmet Cooking level 5"]],
      ["Master Chef", ["Reach Gourmet Cooking level 10", "Serve a dinner party"]],
    ],
  },
  {
    id: "fortune", label: "Fortune", blurb: "Wealth accumulation and property goals.",
    category: "Fortune", type: "primary", difficulty: "hard",
    structure: [
      ["First Simoleons", ["Earn §5,000", "Get a job"]],
      ["Comfortable", ["Earn §50,000", "Own a §100,000 home"]],
      ["Filthy Rich", ["Earn §500,000"]],
    ],
  },
  {
    id: "popularity", label: "Popularity", blurb: "Social reach and reputation.",
    category: "Popularity", type: "primary", difficulty: "normal",
    structure: [
      ["Making Friends", ["Befriend 3 Sims", "Reach Charisma level 3"]],
      ["Well Known", ["Befriend 10 Sims", "Throw a good party"]],
      ["Local Icon", ["Throw 3 gold parties", "Befriend 20 Sims"]],
    ],
  },
  {
    id: "deviance", label: "Deviance", blurb: "Mischief-driven misbehaviour.",
    category: "Deviance", type: "primary", difficulty: "hard",
    structure: [
      ["Petty Trouble", ["Play 5 pranks", "Reach Mischief level 3"]],
      ["Known Nuisance", ["Start 3 fights", "Reach Mischief level 6"]],
      ["Public Menace", ["Reach Mischief level 10"]],
    ],
  },
  {
    id: "occult", label: "Occult", blurb: "Occult-gated progression track.",
    category: "Occult", type: "occult", difficulty: "expert",
    structure: [
      ["Awakening", ["Discover your nature", "Use an occult ability 5 times"]],
      ["Embracing It", ["Master 2 abilities", "Meet 3 other occults"]],
      ["Ancient Power", ["Master all abilities"]],
    ],
  },
  {
    id: "career", label: "Career", blurb: "Attached to a career track.",
    category: "Career", type: "career", difficulty: "normal",
    structure: [
      ["Getting Hired", ["Join the career", "Reach level 3"]],
      ["Climbing", ["Reach level 6", "Get 2 promotions"]],
      ["Top of the Ladder", ["Reach the final level"]],
    ],
  },
  {
    id: "business", label: "Business", blurb: "Own and grow a venture.",
    category: "Business", type: "primary", difficulty: "hard",
    structure: [
      ["Opening Day", ["Own a business", "Make your first sale"]],
      ["Turning Profit", ["Earn §10,000 profit", "Hire an employee"]],
      ["Retail Empire", ["Reach 5-star rating"]],
    ],
  },
  {
    id: "university", label: "University", blurb: "Degree-style academic track.",
    category: "University", type: "university", difficulty: "hard",
    structure: [
      ["Enrolled", ["Enrol in a degree", "Complete 3 assignments"]],
      ["Dean's List", ["Hold an A average for a term"]],
      ["Graduate", ["Graduate with honours"]],
    ],
  },
  {
    id: "hidden", label: "Hidden Gameplay", blurb: "Silent background tracking.",
    category: "Lifestyle", type: "hidden", difficulty: "normal",
    structure: [["Tracked Progress", ["Trigger the tracked event 10 times"]]],
  },
  {
    id: "challenge", label: "Challenge", blurb: "Long-form self-imposed challenge.",
    category: "Lifestyle", type: "challenge", difficulty: "legendary",
    structure: [
      ["Rule Set", ["Accept the challenge terms"]],
      ["The Grind", ["Complete 10 challenge steps"]],
      ["Endgame", ["Survive to the final generation"]],
    ],
  },
  {
    id: "tutorial", label: "Tutorial", blurb: "Short guided teaching sequence.",
    category: "Lifestyle", type: "tutorial", difficulty: "very-easy",
    structure: [["Learn the Basics", ["Open the new menu", "Use the new interaction once"]]],
  },
  {
    id: "custom", label: "Custom", blurb: "Empty structure — you own every field.",
    category: "Custom", type: "custom", difficulty: "normal",
    structure: [],
  },
];

/** Build a fresh document from a template. Never mutates the template. */
export function docFromTemplate(t: AspirationTemplate, namespace: string): AspirationDoc {
  const displayName = `${t.label} Aspiration`;
  const doc = blankAspirationDoc({
    displayName,
    aspirationType: t.type,
    category: t.category,
    difficulty: t.difficulty,
    summary: t.blurb,
    milestones: t.structure.map(([title, objectives], i) => {
      const ms = makeMilestone(i, title);
      ms.objectives = objectives.map((o) => makeObjective(o));
      return ms;
    }),
  });
  doc.ids.namespace = namespace || "MyMods";
  doc.ids.internalName = sanitizeInternalName(displayName);
  doc.strings.displayName.text = displayName;
  return doc;
}
