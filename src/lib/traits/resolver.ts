/**
 * Central resource resolver.
 *
 * Every builder screen goes through this module instead of resolving links
 * itself. A reference is stored by canonical id; resolution turns it into the
 * concrete thing it points at right now — a project record, an EA tuning id,
 * or a dependency on someone else's mod.
 */

import type { AppState, Asset, ID } from "@/lib/types";
import { OCCULTS, SPECIES, type ResourceKind, type ResourceRef, type TraitDoc } from "./schema";
import { computeTraitKeys, tuningNameFor } from "./ids";
import { migrateTraitDoc } from "./migrate";

export interface ResolveContext {
  state: AppState;
  projectId?: ID;
}

export type ResolveStatus = "ok" | "missing" | "wrong-type" | "unresolved-external";

export interface Resolved {
  status: ResolveStatus;
  kind: ResourceKind;
  label: string;
  tuningName: string;
  /** Decimal id when known; "resolved-at-build" for project refs. */
  tuningId: string;
  source: ResourceRef["source"];
  pack?: string;
  message?: string;
  /** Builder this resource can be opened in, when applicable. */
  openIn?: "trait" | "career" | "aspiration" | "assets" | "notifications";
  recordId?: ID;
}

/** All trait docs belonging to a project, migrated to the current schema. */
export function projectTraitDocs(state: AppState, projectId?: ID): { id: ID; doc: TraitDoc }[] {
  return state.traits
    .filter((t) => !projectId || t.projectId === projectId)
    .map((t) => ({ id: t.id, doc: migrateTraitDoc(t) }));
}

function findProjectResource(ctx: ResolveContext, ref: ResourceRef) {
  if (ref.source !== "project") return null;
  const { state, projectId } = ctx;
  const id = ref.projectResourceId;

  const trait = state.traits.find((t) => t.id === id || migrateTraitDoc(t).ids.uuid === id);
  if (trait) return { label: trait.name, openIn: "trait" as const, recordId: trait.id, projectId: trait.projectId };

  const career = state.careers.find((c) => c.id === id);
  if (career) return { label: career.name, openIn: "career" as const, recordId: career.id, projectId: career.projectId };

  const asp = state.aspirations.find((a) => a.id === id);
  if (asp) return { label: asp.name, openIn: "aspiration" as const, recordId: asp.id, projectId: asp.projectId };

  const note = state.notifications.find((n) => n.id === id);
  if (note) return { label: note.name, openIn: "notifications" as const, recordId: note.id, projectId: note.projectId };

  const asset: Asset | undefined = state.assets.find((a) => a.id === id);
  if (asset) return { label: asset.name, openIn: "assets" as const, recordId: asset.id, projectId: asset.projectId };

  // Buffs live inside their owning trait.
  for (const t of state.traits) {
    const buff = (t.buffs ?? []).find((b) => b.id === id);
    if (buff) return { label: buff.name, openIn: "trait" as const, recordId: t.id, projectId: t.projectId };
  }
  void projectId;
  return null;
}

export function resolveRef(ref: ResourceRef, ctx: ResolveContext): Resolved {
  const base = {
    kind: ref.resourceKind,
    label: ref.label || ref.tuningName,
    tuningName: ref.tuningName,
    source: ref.source,
  };

  if (ref.source === "project") {
    const hit = findProjectResource(ctx, ref);
    if (!hit) {
      return {
        ...base,
        status: "missing",
        tuningId: "unresolved",
        message: `Project resource ${ref.projectResourceId} no longer exists.`,
      };
    }
    if (ref.expectedType !== ref.resourceKind) {
      return {
        ...base,
        status: "wrong-type",
        tuningId: "unresolved",
        message: `Expected a ${ref.expectedType} but the reference is a ${ref.resourceKind}.`,
      };
    }
    return {
      ...base,
      label: hit.label,
      status: "ok",
      tuningId: ref.tuningId || "resolved-at-build",
      openIn: hit.openIn,
      recordId: hit.recordId,
    };
  }

  if (ref.source === "game") {
    const ok = /^\d+$/.test(ref.tuningId);
    return {
      ...base,
      status: ok ? "ok" : "unresolved-external",
      tuningId: ref.tuningId,
      pack: ref.pack,
      ...(ok ? {} : { message: "Game reference has no resolved instance id." }),
    };
  }

  const ok = /^\d+$/.test(ref.tuningId);
  return {
    ...base,
    status: ok ? "ok" : "unresolved-external",
    tuningId: ref.tuningId,
    message: ok
      ? `Requires ${ref.modName} by ${ref.creator}${ref.minVersion ? ` ≥ ${ref.minVersion}` : ""}.`
      : `Dependency ${ref.modName} has no resolved id.`,
  };
}

/** Resolve the trait itself into the resource keys it will export with. */
export function resolveTrait(doc: TraitDoc) {
  const keys = computeTraitKeys(doc);
  return {
    uuid: doc.ids.uuid,
    tuningName: tuningNameFor(doc.ids.namespace, doc.ids.internalName),
    tuning: keys.tuning,
    simData: keys.simData,
    keys,
  };
}

/** Packs implied by everything the trait touches. */
export function requiredPacks(doc: TraitDoc, ctx: ResolveContext): string[] {
  const packs = new Set<string>(doc.eligibility.extraPacks);
  for (const id of doc.eligibility.species) {
    const s = SPECIES.find((x) => x.id === id);
    if (s && s.pack !== "BaseGame") packs.add(s.pack);
  }
  if (doc.eligibility.occultMode !== "any") {
    for (const id of doc.eligibility.occults) {
      const o = OCCULTS.find((x) => x.id === id);
      if (o && o.pack !== "BaseGame" && o.pack !== "Custom") packs.add(o.pack);
    }
  }
  for (const { ref } of refsOf(doc)) {
    const r = resolveRef(ref, ctx);
    if (r.pack && r.pack !== "BaseGame") packs.add(r.pack);
  }
  return [...packs].sort();
}

/** External mods the trait depends on. */
export function externalDependencies(doc: TraitDoc) {
  const out: { creator: string; modName: string; minVersion?: string; required: boolean }[] = [];
  for (const { ref } of refsOf(doc)) {
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

/** Which traits in the project reference a given resource id. */
export function dependentsOf(resourceId: string, ctx: ResolveContext) {
  const out: { traitId: ID; traitName: string; path: string }[] = [];
  for (const { id, doc } of projectTraitDocs(ctx.state, ctx.projectId)) {
    for (const { path, ref } of refsOf(doc)) {
      if (ref.source === "project" && ref.projectResourceId === resourceId) {
        out.push({ traitId: id, traitName: doc.displayName, path });
      }
    }
  }
  return out;
}

// Re-exported so callers don't need two imports.
import { collectRefs as refsOf } from "./schema";
export { refsOf as collectRefs };
