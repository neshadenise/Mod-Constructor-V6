/**
 * Factory helpers for new Pack Mechanics modules.
 * Every new module is fully populated so the builders never touch undefined.
 */

import type { ID } from "@/lib/types";
import {
  CURRENT_BUILD_SUPPORT,
  emptyConditionGroup,
  emptyLoc,
  emptyNotify,
  emptyRef,
  rid,
  type ClubModuleData,
  type LegacyModuleData,
  type PackMechanicModuleData,
  type PackModule,
  type PackModuleKind,
  type RoyaltyModuleData,
} from "./types";

export function newClubData(name: string): ClubModuleData {
  return {
    internalName: slug(name),
    displayName: emptyLoc(`MC6_CLUB_${slug(name).toUpperCase()}_NAME`, name),
    description: emptyLoc(`MC6_CLUB_${slug(name).toUpperCase()}_DESC`, ""),
    requiredPack: "Get Together (EP02)",
    iconRef: emptyRef("icon"),
    color: "#38bdf8",
    minMembers: 2,
    maxMembers: 8,
    startingPoints: 0,
    appearsInClubPicker: true,
    npcAutonomousJoin: true,
    playerEditable: true,
    membership: emptyConditionGroup("and"),
    activities: [],
    perks: [],
    ranks: [],
    roles: [],
    uniforms: [],
    gatherings: [],
    hangoutRefs: [],
    autonomyRules: [],
    relationshipModifiers: [],
    leadershipRules: [],
    invitationRules: [],
    gatheringBehavior: [],
  };
}

export function newRoyaltyData(name: string): RoyaltyModuleData {
  return {
    systemName: slug(name),
    displayName: emptyLoc(`MC6_ROYAL_${slug(name).toUpperCase()}_NAME`, name),
    description: emptyLoc(`MC6_ROYAL_${slug(name).toUpperCase()}_DESC`, ""),
    requiredPacks: [],
    optionalMods: [],
    iconRef: emptyRef("icon"),
    defaultRoyalHousehold: "",
    royalResidenceLot: "",
    courtVenueRef: emptyRef("venue"),
    prestigeStatRef: emptyRef("statistic"),
    hereditary: true,
    multipleFamilies: false,
    npcKingdoms: false,
    titles: [],
    succession: [],
    marriage: {
      eligibility: emptyConditionGroup("and"),
      political: false,
      arranged: false,
      morganatic: false,
      spouseInheritsTitle: true,
      approvalRequired: true,
      divorcePenalty: 0,
      multipleSpouses: false,
      householdTransfer: true,
      dynastyNameChange: false,
    },
    courtRoles: [],
    interactions: [],
    events: [],
  };
}

export function newLegacyData(name: string): LegacyModuleData {
  return {
    legacyName: name,
    dynastyName: name,
    founder: "",
    description: emptyLoc(`MC6_LEGACY_${slug(name).toUpperCase()}_DESC`, ""),
    iconRef: emptyRef("icon"),
    crestRef: emptyRef("icon"),
    motto: emptyLoc(`MC6_LEGACY_${slug(name).toUpperCase()}_MOTTO`, ""),
    startingGeneration: 1,
    maxGenerations: 10,
    activeHousehold: "",
    homeLot: "",
    requiredPacks: [],
    optionalMods: [],
    generations: [],
    heirRules: [],
    bloodlines: [],
    scoring: [],
    events: [],
    familyTree: [],
  };
}

export function newPackMechanicData(name: string): PackMechanicModuleData {
  return {
    packTier: "expansion",
    packKey: "",
    packLabel: "",
    mechanicCategory: "",
    requiredResourceTypes: [],
    requiredTuningRefs: [],
    optionalDependencies: [],
    compatibilityNotes: "",
    patchVersion: "",
    conflictWarnings: "",
    rules: [],
  };
}

export function newPackModule(kind: PackModuleKind, projectId: ID, name: string): PackModule {
  const data =
    kind === "club" ? newClubData(name)
    : kind === "royalty" ? newRoyaltyData(name)
    : kind === "legacy" ? newLegacyData(name)
    : newPackMechanicData(name);
  const requiredPack =
    kind === "club" ? "Get Together (EP02)" : kind === "pack" ? "" : "Base Game";
  return {
    id: rid(),
    projectId,
    kind,
    name,
    summary: "",
    requiredPack,
    status: "draft",
    buildSupport: { ...CURRENT_BUILD_SUPPORT },
    data,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function emptyNotifyFor(prefix: string) {
  return emptyNotify(prefix);
}

export function slug(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "module";
}
