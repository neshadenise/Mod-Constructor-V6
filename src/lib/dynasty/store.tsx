/**
 * Project-scoped dynasty storage.
 *
 * A dynasty type is a first-class project resource. Careers, traits, events
 * and objectives link to one by UUID, so this library owns the documents and
 * everything else borrows. Switching projects swaps the whole library.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useActiveProject } from "@/lib/store";
import {
  DYNASTY_DOC_VERSION,
  blankDynastyDoc,
  blankPermissionMatrix,
  did,
  duplicateDynasty,
  type DynastyDoc,
} from "./schema";

const KEY = (projectId: string) => `mc:dynasties:v1:${projectId}`;
const SYNC = "mc:dynasties-changed";

/** Where a dynasty is referenced from, so deletion can warn honestly. */
export interface DynastyUsage {
  parentResourceId: string;
  parentKind: "career" | "trait" | "aspiration" | "event" | "objective" | "interaction" | "other";
  parentLabel: string;
  note?: string;
}

interface Bag {
  version: number;
  docs: DynastyDoc[];
  usage: Record<string, DynastyUsage[]>;
  namespace: string;
}

const emptyBag = (): Bag => ({ version: DYNASTY_DOC_VERSION, docs: [], usage: {}, namespace: "MyMods" });

/** Fill in blocks added after a document was written. */
function migrate(doc: DynastyDoc): DynastyDoc {
  const base = blankDynastyDoc();
  const arr = <T,>(v: unknown, fallback: T[]): T[] => (Array.isArray(v) ? (v as T[]) : fallback);
  return {
    ...base,
    ...doc,
    terms: { ...base.terms, ...doc.terms },
    identity: { ...base.identity, ...doc.identity, colors: { ...base.identity.colors, ...doc.identity?.colors } },
    size: { ...base.size, ...doc.size },
    membership: { ...base.membership, ...doc.membership },
    hierarchy: {
      ...base.hierarchy,
      ...doc.hierarchy,
      roles: arr(doc.hierarchy?.roles, base.hierarchy.roles),
      connections: arr(doc.hierarchy?.connections, base.hierarchy.connections),
      groups: arr(doc.hierarchy?.groups, base.hierarchy.groups),
      notes: arr(doc.hierarchy?.notes, base.hierarchy.notes),
    },
    succession: {
      ...base.succession,
      ...doc.succession,
      rules: arr(doc.succession?.rules, base.succession.rules),
      council: { ...base.succession.council, ...doc.succession?.council },
    },
    bloodline: { ...base.bloodline, ...doc.bloodline },
    permissions: { ...blankPermissionMatrix(), ...doc.permissions },
    prestige: { ...base.prestige, ...doc.prestige },
    unity: { ...base.unity, ...doc.unity },
    funds: { ...base.funds, ...doc.funds },
    autonomy: { ...base.autonomy, ...doc.autonomy, matrix: { ...base.autonomy.matrix, ...doc.autonomy?.matrix } },
    visual: { ...base.visual, ...doc.visual },
    membershipTypes: arr(doc.membershipTypes, base.membershipTypes),
    values: arr(doc.values, base.values),
    expectations: arr(doc.expectations, base.expectations),
    conduct: arr(doc.conduct, base.conduct),
    traits: arr(doc.traits, base.traits),
    branches: arr(doc.branches, base.branches),
    relations: arr(doc.relations, base.relations),
    scandals: arr(doc.scandals, base.scandals),
    rewards: arr(doc.rewards, base.rewards),
    punishments: arr(doc.punishments, base.punishments),
    interactions: arr(doc.interactions, base.interactions),
    events: arr(doc.events, base.events),
    story: arr(doc.story, base.story),
    ids: { ...base.ids, ...doc.ids },
    version: DYNASTY_DOC_VERSION,
  };
}

function read(projectId: string): Bag {
  if (typeof window === "undefined" || !projectId) return emptyBag();
  try {
    const raw = window.localStorage.getItem(KEY(projectId));
    if (!raw) return emptyBag();
    const parsed = JSON.parse(raw) as Partial<Bag>;
    return {
      version: parsed.version ?? DYNASTY_DOC_VERSION,
      docs: Array.isArray(parsed.docs) ? parsed.docs.map(migrate) : [],
      usage: parsed.usage && typeof parsed.usage === "object" ? parsed.usage : {},
      namespace: parsed.namespace || "MyMods",
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

/** Read-only access for validators, the explorer and project health. */
export function readDynasties(projectId: string | undefined): DynastyDoc[] {
  return projectId ? read(projectId).docs : [];
}

export interface DynastyLibrary {
  docs: DynastyDoc[];
  namespace: string;
  setNamespace: (ns: string) => void;
  get: (uuid: string) => DynastyDoc | undefined;
  create: (doc?: DynastyDoc) => DynastyDoc;
  update: (uuid: string, next: DynastyDoc) => void;
  patch: (uuid: string, patch: Partial<DynastyDoc>) => void;
  duplicate: (uuid: string) => DynastyDoc | undefined;
  remove: (uuid: string) => void;
  /** Other dynasties that name this one in a relation. */
  dependents: (uuid: string) => DynastyDoc[];
  usageOf: (uuid: string) => DynastyUsage[];
  linkUsage: (uuid: string, usage: DynastyUsage) => void;
  unlinkUsage: (uuid: string, parentResourceId: string) => void;
  markExported: (uuid: string) => void;
  importJson: (json: string) => number;
  exportJson: (uuids?: string[]) => string;
}

export function useDynastyLibrary(): DynastyLibrary {
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

  return useMemo<DynastyLibrary>(
    () => ({
      docs: bag.docs,
      namespace: bag.namespace,
      setNamespace: (ns) => commit({ ...bag, namespace: ns }),
      get: (uuid) => bag.docs.find((d) => d.uuid === uuid),
      create: (doc) => {
        const next = { ...(doc ?? blankDynastyDoc({ projectId })), projectId };
        commit({ ...bag, docs: [next, ...bag.docs] });
        return next;
      },
      update: (uuid, next) =>
        commit({
          ...bag,
          docs: bag.docs.map((d) => (d.uuid === uuid ? { ...next, uuid, projectId, updatedAt: Date.now() } : d)),
        }),
      patch: (uuid, p) =>
        commit({
          ...bag,
          docs: bag.docs.map((d) => (d.uuid === uuid ? { ...d, ...p, updatedAt: Date.now() } : d)),
        }),
      duplicate: (uuid) => {
        const src = bag.docs.find((d) => d.uuid === uuid);
        if (!src) return undefined;
        const copy = duplicateDynasty(src);
        commit({ ...bag, docs: [copy, ...bag.docs] });
        return copy;
      },
      remove: (uuid) => {
        const { [uuid]: _drop, ...usage } = bag.usage;
        commit({
          ...bag,
          usage,
          docs: bag.docs
            .filter((d) => d.uuid !== uuid)
            // Drop dangling alliance / rivalry references to the deleted type.
            .map((d) => ({
              ...d,
              relations: d.relations.filter((r) => r.target.projectResourceId !== uuid),
            })),
        });
      },
      dependents: (uuid) =>
        bag.docs.filter((d) => d.uuid !== uuid && d.relations.some((r) => r.target.projectResourceId === uuid)),
      usageOf: (uuid) => bag.usage[uuid] ?? [],
      linkUsage: (uuid, usage) =>
        commit({
          ...bag,
          usage: {
            ...bag.usage,
            [uuid]: [
              ...(bag.usage[uuid] ?? []).filter((u) => u.parentResourceId !== usage.parentResourceId),
              usage,
            ],
          },
        }),
      unlinkUsage: (uuid, parentResourceId) =>
        commit({
          ...bag,
          usage: {
            ...bag.usage,
            [uuid]: (bag.usage[uuid] ?? []).filter((u) => u.parentResourceId !== parentResourceId),
          },
        }),
      markExported: (uuid) =>
        commit({
          ...bag,
          docs: bag.docs.map((d) => (d.uuid === uuid ? { ...d, lastExportedAt: Date.now() } : d)),
        }),
      importJson: (json) => {
        try {
          const parsed = JSON.parse(json) as { docs?: DynastyDoc[] };
          const incoming = Array.isArray(parsed.docs) ? parsed.docs : [];
          // Imported dynasties get fresh UUIDs so they never collide, and their
          // ids are cleared so export re-derives them under this namespace.
          const fresh = incoming.map((d) => ({
            ...migrate(d),
            uuid: did("dyn"),
            projectId,
            origin: "imported" as const,
            ids: { manual: false, tuningDecimal: "", tuningHex: "", lastGeneratedAt: 0 },
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastExportedAt: undefined,
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
            version: DYNASTY_DOC_VERSION,
            docs: uuids ? bag.docs.filter((d) => uuids.includes(d.uuid)) : bag.docs,
          },
          null,
          2,
        ),
    }),
    [bag, commit, projectId],
  );
}
