/**
 * Aspiration resource resolver.
 *
 * References are stored as canonical ids and resolved here — never in a
 * component. Resolution of individual refs reuses the shared trait resolver,
 * so an aspiration and a trait pointing at the same resource always agree.
 */

import type { AppState, Aspiration, ID } from "@/lib/types";
import { resolveRef, type ResolveContext, type Resolved } from "@/lib/traits/resolver";
import {
  OCCULT_LABEL,
  SPECIES_LABEL,
  collectRefs,
  type AspirationDoc,
} from "./schema";
import { computeAspirationKeys, tuningNameFor } from "./ids";
import { migrateAspirationDoc } from "./migrate";

export { resolveRef };
export type { ResolveContext, Resolved };

const SPECIES_PACK: Record<string, string> = {
  human: "BaseGame", dog: "Cats & Dogs", cat: "Cats & Dogs", horse: "Horse Ranch",
};
const OCCULT_PACK: Record<string, string> = {
  spellcaster: "Realm of Magic", werewolf: "Werewolves", vampire: "Vampires",
  alien: "Get to Work", ghost: "BaseGame", mermaid: "Island Living",
  servo: "Discover University", plantsim: "BaseGame",
};

/** All aspiration docs belonging to a project, migrated to the current schema. */
export function projectAspirationDocs(
  state: AppState,
  projectId?: ID,
): { id: ID; record: Aspiration; doc: AspirationDoc }[] {
  return state.aspirations
    .filter((a) => !projectId || a.projectId === projectId)
    .map((a) => ({ id: a.id, record: a, doc: migrateAspirationDoc(a) }));
}

/** Resolve the aspiration itself into the resource keys it will export with. */
export function resolveAspiration(doc: AspirationDoc) {
  const keys = computeAspirationKeys(doc);
  return {
    uuid: doc.ids.uuid,
    tuningName: tuningNameFor(doc.ids.namespace, doc.ids.internalName),
    tuning: keys.tuning,
    simData: keys.simData,
    keys,
  };
}

/** Packs implied by everything the aspiration touches. */
export function requiredPacks(doc: AspirationDoc, ctx: ResolveContext): string[] {
  const packs = new Set<string>(doc.availability.extraPacks);
  for (const id of doc.availability.species) {
    const pack = SPECIES_PACK[id];
    if (pack && pack !== "BaseGame") packs.add(pack);
  }
  if (doc.availability.occultMode !== "any") {
    for (const id of doc.availability.occults) {
      const pack = OCCULT_PACK[id];
      if (pack && pack !== "BaseGame") packs.add(pack);
    }
  }
  for (const { ref } of collectRefs(doc)) {
    const r = resolveRef(ref, ctx);
    if (r.pack && r.pack !== "BaseGame") packs.add(r.pack);
  }
  return [...packs].sort();
}

/** External mods the aspiration depends on. */
export function externalDependencies(doc: AspirationDoc) {
  const out: { creator: string; modName: string; minVersion?: string; required: boolean }[] = [];
  for (const { ref } of collectRefs(doc)) {
    if (ref.source !== "mod") continue;
    if (out.some((d) => d.creator === ref.creator && d.modName === ref.modName)) continue;
    out.push({
      creator: ref.creator,
      modName: ref.modName,
      ...(ref.minVersion ? { minVersion: ref.minVersion } : {}),
      required: ref.required,
    });
  }
  return out;
}

export interface OutgoingLink {
  path: string;
  label: string;
  kind: string;
  source: string;
  status: string;
  openIn?: Resolved["openIn"];
  recordId?: ID;
}

/** Everything this aspiration points at, resolved for the dependency viewer. */
export function outgoingLinks(doc: AspirationDoc, ctx: ResolveContext): OutgoingLink[] {
  return collectRefs(doc).map(({ path, ref }) => {
    const r = resolveRef(ref, ctx);
    return {
      path,
      label: r.label || ref.label || ref.tuningName,
      kind: ref.resourceKind,
      source: ref.source,
      status: r.status,
      ...(r.openIn ? { openIn: r.openIn } : {}),
      ...(r.recordId ? { recordId: r.recordId } : {}),
    };
  });
}

/** Which project records reference this aspiration. */
export function incomingLinks(doc: AspirationDoc, ctx: ResolveContext) {
  const out: { kind: "trait" | "aspiration" | "career"; id: ID; name: string; path: string }[] = [];
  const target = doc.ids.uuid;

  for (const { id, doc: other } of projectAspirationDocs(ctx.state, ctx.projectId)) {
    if (other.ids.uuid === target) continue;
    for (const { path, ref } of collectRefs(other)) {
      if (ref.source === "project" && ref.projectResourceId === target)
        out.push({ kind: "aspiration", id, name: other.displayName, path });
    }
  }
  for (const career of ctx.state.careers.filter((c) => !ctx.projectId || c.projectId === ctx.projectId)) {
    if (JSON.stringify(career.builderState ?? {}).includes(target))
      out.push({ kind: "career", id: career.id, name: career.name, path: "career reward" });
  }
  for (const trait of ctx.state.traits.filter((t) => !ctx.projectId || t.projectId === ctx.projectId)) {
    if (JSON.stringify(trait.builderState ?? {}).includes(target))
      out.push({ kind: "trait", id: trait.id, name: trait.name, path: "trait reference" });
  }
  return out;
}

export const speciesLabel = (id: string) => SPECIES_LABEL[id as keyof typeof SPECIES_LABEL] ?? id;
export const occultLabel = (id: string) => OCCULT_LABEL[id as keyof typeof OCCULT_LABEL] ?? id;
