/**
 * Requirement templates — the conditions creators reach for constantly.
 * Each template expands into a normal editable requirement tree.
 */

import {
  makeGroup,
  makeLeaf,
  makeTestSet,
  type RequirementGroup,
  type RequirementLeaf,
  type TestSet,
} from "./schema";

const leaf = (specId: string, params: Record<string, string | number | boolean>): RequirementLeaf => {
  const node = makeLeaf(specId);
  return { ...node, params: { ...node.params, ...params } };
};

export interface RequirementTemplate {
  id: string;
  label: string;
  description: string;
  group: "Progress" | "Life" | "Career" | "World" | "Wealth";
  build: () => RequirementGroup;
}

export const REQUIREMENT_TEMPLATES: RequirementTemplate[] = [
  {
    id: "painting-level",
    label: "Painting level",
    description: "Painting skill at or above a level.",
    group: "Progress",
    build: () => makeGroup("and", [leaf("skill.level", { skill: "Painting", operator: "greater-or-equal", level: 5 })]),
  },
  {
    id: "cooking-level",
    label: "Cooking level",
    description: "Cooking skill at or above a level.",
    group: "Progress",
    build: () => makeGroup("and", [leaf("skill.level", { skill: "Cooking", operator: "greater-or-equal", level: 5 })]),
  },
  {
    id: "career-promotion",
    label: "Career promotion",
    description: "Reach a career level.",
    group: "Career",
    build: () =>
      makeGroup("and", [leaf("sim.career-level", { career: "Painter", operator: "greater-or-equal", level: 5 })]),
  },
  {
    id: "become-friends",
    label: "Become friends",
    description: "Friendship above the friend threshold.",
    group: "Life",
    build: () => makeGroup("and", [leaf("rel.friendship", { operator: "greater-or-equal", value: 50, target: "Any Sim" })]),
  },
  {
    id: "own-house",
    label: "Own a house",
    description: "Household owns the residential lot they live on.",
    group: "Wealth",
    build: () =>
      makeGroup("and", [
        leaf("sim.household", { rule: "owns the lot" }),
        leaf("world.lot-type", { type: "Residential" }),
      ]),
  },
  {
    id: "earn-money",
    label: "Earn money",
    description: "Household funds threshold.",
    group: "Wealth",
    build: () => makeGroup("and", [leaf("game.money", { operator: "greater-or-equal", amount: 20000 })]),
  },
  {
    id: "finish-university",
    label: "Finish university",
    description: "Hold a degree.",
    group: "Progress",
    build: () => makeGroup("and", [leaf("sim.degree", { degree: "Fine Art", honours: "Any" })]),
  },
  {
    id: "complete-collection",
    label: "Complete a collection",
    description: "Collection progress at 100%.",
    group: "Progress",
    build: () =>
      makeGroup("and", [leaf("game.collection", { collection: "Crystals", operator: "greater-or-equal", percent: 100 })]),
  },
  {
    id: "visit-world",
    label: "Visit a world",
    description: "Sim is currently in a chosen world.",
    group: "World",
    build: () => makeGroup("and", [leaf("world.world", { world: "Willow Creek" })]),
  },
  {
    id: "become-famous",
    label: "Become famous",
    description: "Fame star level threshold.",
    group: "Life",
    build: () => makeGroup("and", [leaf("sim.fame", { operator: "greater-or-equal", level: 3 })]),
  },
  {
    id: "have-child",
    label: "Have a child",
    description: "At least one child.",
    group: "Life",
    build: () => makeGroup("and", [leaf("sim.children", { operator: "greater-or-equal", count: 1 })]),
  },
  {
    id: "marry",
    label: "Get married",
    description: "Sim is married.",
    group: "Life",
    build: () => makeGroup("and", [leaf("sim.marriage", { state: "is married" })]),
  },
  {
    id: "own-pet",
    label: "Own a pet",
    description: "Household contains a cat or dog.",
    group: "Life",
    build: () =>
      makeGroup("or", [
        leaf("sim.species", { species: "Dog" }),
        leaf("sim.species", { species: "Cat" }),
      ]),
  },
  {
    id: "join-club",
    label: "Join a club",
    description: "Sim belongs to a club.",
    group: "Life",
    build: () => makeGroup("and", [leaf("sim.club", { club: "Any club" })]),
  },
  {
    id: "own-business",
    label: "Own a business",
    description: "Business funds above zero on a retail lot.",
    group: "Wealth",
    build: () =>
      makeGroup("and", [
        leaf("world.lot-type", { type: "Retail" }),
        leaf("game.business-funds", { operator: "greater-or-equal", amount: 1 }),
      ]),
  },
  {
    id: "teen-artist",
    label: "Teen artist (nested example)",
    description: "Teen AND Painting ≥ 5 AND (Painter OR Interior Decorator).",
    group: "Career",
    build: () =>
      makeGroup("and", [
        leaf("sim.age", { age: "Teen", mode: "is" }),
        leaf("skill.level", { skill: "Painting", operator: "greater-or-equal", level: 5 }),
        makeGroup("or", [
          leaf("sim.career", { career: "Painter" }),
          leaf("sim.career", { career: "Interior Decorator" }),
        ]),
      ]),
  },
  {
    id: "custom",
    label: "Custom",
    description: "Start from an empty AND group.",
    group: "Progress",
    build: () => makeGroup("and", []),
  },
];

export function testSetFromTemplate(t: RequirementTemplate): TestSet {
  const set = makeTestSet(t.label);
  return { ...set, description: t.description, root: t.build(), tags: [t.group.toLowerCase()] };
}
