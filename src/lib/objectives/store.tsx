/**
 * Project-scoped objective storage.
 *
 * Objectives are first-class project resources, not children of an aspiration.
 * Anything (aspiration milestone, career level, scenario, event) links to one
 * by UUID, so this library is the single owner and everything else borrows.
 * Switching projects swaps the whole library.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useActiveProject } from "@/lib/store";
import {
  OBJECTIVE_DOC_VERSION,
  blankObjectiveDoc,
  duplicateObjective,
  oid,
  type ObjectiveDoc,
  type ParentUsage,
} from "./schema";

const KEY = (projectId: string) => `mc:objectives:v1:${projectId}`;
const SYNC = "mc:objectives-changed";

interface Bag {
  version: number;
  docs: ObjectiveDoc[];
  /** Namespace remembered per project so new objectives inherit it. */
  namespace: string;
}

const emptyBag = (): Bag => ({ version: OBJECTIVE_DOC_VERSION, docs: [], namespace: "MyMods" });

function read(projectId: string): Bag {
  if (typeof window === "undefined" || !projectId) return emptyBag();
  try {
    const raw = window.localStorage.getItem(KEY(projectId));
    if (!raw) return emptyBag();
    const parsed = JSON.parse(raw) as Partial<Bag>;
    return {
      version: parsed.version ?? OBJECTIVE_DOC_VERSION,
      docs: Array.isArray(parsed.docs) ? parsed.docs.map(migrate) : [],
      namespace: parsed.namespace || "MyMods",
    };
  } catch {
    return emptyBag();
  }
}

/** Fill in blocks added after a document was written. */
function migrate(doc: ObjectiveDoc): ObjectiveDoc {
  const base = blankObjectiveDoc();
  return {
    ...base,
    ...doc,
    progress: { ...base.progress, ...doc.progress },
    scope: { ...base.scope, ...doc.scope },
    activation: { ...base.activation, ...doc.activation },
    failure: { ...base.failure, ...doc.failure },
    strings: { ...base.strings, ...doc.strings },
    ids: { ...base.ids, ...doc.ids },
    payload: { ...base.payload, ...doc.payload },
    completion: Array.isArray(doc.completion) ? doc.completion : base.completion,
    parents: Array.isArray(doc.parents) ? doc.parents : [],
    version: OBJECTIVE_DOC_VERSION,
  };
}

function write(projectId: string, bag: Bag) {
  if (typeof window === "undefined" || !projectId) return;
  window.localStorage.setItem(KEY(projectId), JSON.stringify(bag));
  window.dispatchEvent(new CustomEvent(SYNC, { detail: projectId }));
}

/** Read-only access for validators, the explorer and project health. */
export function readObjectives(projectId: string | undefined): ObjectiveDoc[] {
  return projectId ? read(projectId).docs : [];
}

export interface ObjectiveLibrary {
  docs: ObjectiveDoc[];
  namespace: string;
  setNamespace: (ns: string) => void;
  get: (uuid: string) => ObjectiveDoc | undefined;
  create: (doc?: ObjectiveDoc) => ObjectiveDoc;
  update: (uuid: string, next: ObjectiveDoc) => void;
  patch: (uuid: string, patch: Partial<ObjectiveDoc>) => void;
  duplicate: (uuid: string) => ObjectiveDoc | undefined;
  remove: (uuid: string) => void;
  /** Objectives that reference the given resource or objective UUID. */
  dependents: (uuid: string) => ObjectiveDoc[];
  /** Register or refresh a parent link (aspiration, career, scenario…). */
  linkParent: (uuid: string, usage: ParentUsage) => void;
  unlinkParent: (uuid: string, parentId: string) => void;
  importJson: (json: string) => number;
  exportJson: (uuids?: string[]) => string;
}

export function useObjectiveLibrary(): ObjectiveLibrary {
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

  return useMemo<ObjectiveLibrary>(
    () => ({
      docs: bag.docs,
      namespace: bag.namespace,
      setNamespace: (ns) => commit({ ...bag, namespace: ns }),
      get: (uuid) => bag.docs.find((d) => d.uuid === uuid),
      create: (doc) => {
        const next = doc ?? blankObjectiveDoc({ projectId, namespace: bag.namespace });
        commit({ ...bag, docs: [{ ...next, projectId }, ...bag.docs] });
        return next;
      },
      update: (uuid, next) =>
        commit({
          ...bag,
          docs: bag.docs.map((d) => (d.uuid === uuid ? { ...next, uuid, updatedAt: Date.now() } : d)),
        }),
      patch: (uuid, p) =>
        commit({
          ...bag,
          docs: bag.docs.map((d) => (d.uuid === uuid ? { ...d, ...p, updatedAt: Date.now() } : d)),
        }),
      duplicate: (uuid) => {
        const src = bag.docs.find((d) => d.uuid === uuid);
        if (!src) return undefined;
        // A copy starts unused — parent links belong to the original.
        const copy = { ...duplicateObjective(src), parents: [] as ParentUsage[] };
        commit({ ...bag, docs: [copy, ...bag.docs] });
        return copy;
      },
      remove: (uuid) =>
        commit({
          ...bag,
          docs: bag.docs
            .filter((d) => d.uuid !== uuid)
            // Drop dangling composite / gate references to the deleted objective.
            .map((d) => ({
              ...d,
              payload: {
                ...d.payload,
                composite: {
                  ...d.payload.composite,
                  children: d.payload.composite.children.filter((c) => c.ref.projectResourceId !== uuid),
                },
              },
            })),
        }),
      dependents: (uuid) =>
        bag.docs.filter(
          (d) =>
            d.uuid !== uuid &&
            (d.payload.composite.children.some((c) => c.ref.projectResourceId === uuid) ||
              d.activation.gate?.projectResourceId === uuid ||
              d.revealedBy?.projectResourceId === uuid ||
              d.payload.parent_completion.parent?.projectResourceId === uuid ||
              d.completion.some((a) => a.ref?.projectResourceId === uuid)),
        ),
      linkParent: (uuid, usage) =>
        commit({
          ...bag,
          docs: bag.docs.map((d) =>
            d.uuid === uuid
              ? {
                  ...d,
                  parents: [...d.parents.filter((p) => p.parentId !== usage.parentId), usage],
                  updatedAt: Date.now(),
                }
              : d,
          ),
        }),
      unlinkParent: (uuid, parentId) =>
        commit({
          ...bag,
          docs: bag.docs.map((d) =>
            d.uuid === uuid ? { ...d, parents: d.parents.filter((p) => p.parentId !== parentId) } : d,
          ),
        }),
      importJson: (json) => {
        try {
          const parsed = JSON.parse(json) as { docs?: ObjectiveDoc[] };
          const incoming = Array.isArray(parsed.docs) ? parsed.docs : [];
          // Imported objectives get fresh UUIDs so they never collide.
          const fresh = incoming.map((d) => ({
            ...migrate(d),
            uuid: oid("obj"),
            projectId,
            parents: [] as ParentUsage[],
            origin: "imported" as const,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }));
          commit({ ...bag, docs: [...fresh, ...bag.docs] });
          return fresh.length;
        } catch {
          return 0;
        }
      },
      exportJson: (uuids) =>
        JSON.stringify(
          {
            version: OBJECTIVE_DOC_VERSION,
            docs: uuids ? bag.docs.filter((d) => uuids.includes(d.uuid)) : bag.docs,
          },
          null,
          2,
        ),
    }),
    [bag, commit, projectId],
  );
}
