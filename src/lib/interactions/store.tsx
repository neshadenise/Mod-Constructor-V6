/**
 * Project-scoped interaction storage.
 *
 * Interactions, imported animation sets and reusable presets live per project
 * and survive reloads. Switching projects swaps the whole library.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useActiveProject } from "@/lib/store";
import {
  INTERACTION_DOC_VERSION,
  blankInteractionDoc,
  reidentify,
  rid,
  type CustomAnimationSet,
  type InteractionDoc,
} from "./schema";

const KEY = (projectId: string) => `mc:interactions:v1:${projectId}`;
const SYNC = "mc:interactions-changed";

export type PresetKind =
  | "interaction" | "animation" | "participants" | "tests" | "outcomes" | "step" | "sequence"
  | "autonomy" | "injection";

export interface InteractionPreset {
  uuid: string;
  kind: PresetKind;
  name: string;
  createdAt: number;
  /** Serialized fragment; ids are regenerated when applied. */
  payload: unknown;
}

interface Bag {
  version: number;
  docs: InteractionDoc[];
  animationSets: CustomAnimationSet[];
  presets: InteractionPreset[];
}

const emptyBag = (): Bag => ({ version: INTERACTION_DOC_VERSION, docs: [], animationSets: [], presets: [] });

function read(projectId: string): Bag {
  if (typeof window === "undefined" || !projectId) return emptyBag();
  try {
    const raw = window.localStorage.getItem(KEY(projectId));
    if (!raw) return emptyBag();
    const parsed = JSON.parse(raw) as Partial<Bag>;
    return {
      version: parsed.version ?? INTERACTION_DOC_VERSION,
      docs: Array.isArray(parsed.docs) ? parsed.docs : [],
      animationSets: Array.isArray(parsed.animationSets) ? parsed.animationSets : [],
      presets: Array.isArray(parsed.presets) ? parsed.presets : [],
    };
  } catch {
    return emptyBag();
  }
}

function write(projectId: string, bag: Bag) {
  if (typeof window === "undefined" || !projectId) return;
  window.localStorage.setItem(KEY(projectId), JSON.stringify(bag));
  window.dispatchEvent(new CustomEvent(SYNC, { detail: projectId }));
}

/** Read-only access for validators and the project explorer. */
export function readInteractions(projectId: string | undefined): InteractionDoc[] {
  return projectId ? read(projectId).docs : [];
}

export interface InteractionLibrary {
  docs: InteractionDoc[];
  animationSets: CustomAnimationSet[];
  presets: InteractionPreset[];
  get: (uuid: string) => InteractionDoc | undefined;
  create: (doc?: InteractionDoc) => InteractionDoc;
  update: (uuid: string, next: InteractionDoc) => void;
  duplicate: (uuid: string) => InteractionDoc | undefined;
  remove: (uuid: string) => void;
  /** Which docs reference a given resource — used before deleting anything. */
  dependents: (ref: string) => InteractionDoc[];
  addAnimationSet: (set: CustomAnimationSet) => void;
  updateAnimationSet: (uuid: string, set: CustomAnimationSet) => void;
  removeAnimationSet: (uuid: string) => void;
  savePreset: (kind: PresetKind, name: string, payload: unknown) => InteractionPreset;
  removePreset: (uuid: string) => void;
  importJson: (json: string) => number;
  exportJson: (uuids?: string[]) => string;
}

export function useInteractionLibrary(): InteractionLibrary {
  const project = useActiveProject();
  const projectId = project?.id ?? "";
  const [bag, setBag] = useState<Bag>(() => read(projectId));

  useEffect(() => setBag(read(projectId)), [projectId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onChange = () => setBag(read(projectId));
    window.addEventListener(SYNC, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(SYNC, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [projectId]);

  const commit = useCallback(
    (next: Bag) => {
      if (!projectId) return;
      write(projectId, next);
      setBag(next);
    },
    [projectId],
  );

  return useMemo<InteractionLibrary>(
    () => ({
      docs: bag.docs,
      animationSets: bag.animationSets,
      presets: bag.presets,
      get: (uuid) => bag.docs.find((d) => d.uuid === uuid),
      create: (doc) => {
        const next = doc ?? blankInteractionDoc();
        commit({ ...bag, docs: [next, ...bag.docs] });
        return next;
      },
      update: (uuid, next) =>
        commit({
          ...bag,
          docs: bag.docs.map((d) => (d.uuid === uuid ? { ...next, uuid, updatedAt: Date.now() } : d)),
        }),
      duplicate: (uuid) => {
        const src = bag.docs.find((d) => d.uuid === uuid);
        if (!src) return undefined;
        const copy = reidentify({
          ...src,
          displayName: `${src.displayName} Copy`,
          ids: { ...src.ids, internalName: `${src.ids.internalName}_copy` },
        });
        commit({ ...bag, docs: [copy, ...bag.docs] });
        return copy;
      },
      remove: (uuid) => commit({ ...bag, docs: bag.docs.filter((d) => d.uuid !== uuid) }),
      dependents: (ref) =>
        bag.docs.filter((d) => {
          if (d.baseTuning === ref) return true;
          if (d.animations.some((a) => a.refId === ref)) return true;
          if (d.tests.testSets.includes(ref)) return true;
          if (d.outcomes.some((o) => o.effects.some((e) => e.ref === ref))) return true;
          if (d.placement.targets.includes(ref)) return true;
          return false;
        }),
      addAnimationSet: (set) => commit({ ...bag, animationSets: [set, ...bag.animationSets] }),
      updateAnimationSet: (uuid, set) =>
        commit({ ...bag, animationSets: bag.animationSets.map((s) => (s.uuid === uuid ? set : s)) }),
      removeAnimationSet: (uuid) =>
        commit({ ...bag, animationSets: bag.animationSets.filter((s) => s.uuid !== uuid) }),
      savePreset: (kind, name, payload) => {
        const preset: InteractionPreset = { uuid: rid("preset"), kind, name, createdAt: Date.now(), payload };
        commit({ ...bag, presets: [preset, ...bag.presets] });
        return preset;
      },
      removePreset: (uuid) => commit({ ...bag, presets: bag.presets.filter((p) => p.uuid !== uuid) }),
      importJson: (json) => {
        try {
          const parsed = JSON.parse(json) as { docs?: InteractionDoc[] };
          const incoming = Array.isArray(parsed.docs) ? parsed.docs : [];
          // Presets and cross-project copies always get fresh ids.
          const fresh = incoming.map((d) => reidentify(d));
          commit({ ...bag, docs: [...fresh, ...bag.docs] });
          return fresh.length;
        } catch {
          return 0;
        }
      },
      exportJson: (uuids) =>
        JSON.stringify(
          {
            version: INTERACTION_DOC_VERSION,
            docs: uuids ? bag.docs.filter((d) => uuids.includes(d.uuid)) : bag.docs,
          },
          null,
          2,
        ),
    }),
    [bag, commit],
  );
}
