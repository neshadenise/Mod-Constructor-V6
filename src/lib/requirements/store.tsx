/**
 * Project-scoped test-set library.
 *
 * Test sets are shared resources: any builder in the active project can
 * reference them by UUID. They persist per project so switching projects
 * swaps the library, and reloading the app restores it.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useActiveProject } from "@/lib/store";
import {
  TESTSET_SCHEMA,
  makeTestSet,
  pushHistory,
  rid,
  type TestSet,
} from "./schema";

const KEY = (projectId: string) => `mc:testsets:v1:${projectId}`;
const SYNC = "mc:testsets-changed";

function read(projectId: string): TestSet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { schema?: string; sets?: TestSet[] };
    return Array.isArray(parsed.sets) ? parsed.sets : [];
  } catch {
    return [];
  }
}

function write(projectId: string, sets: TestSet[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY(projectId), JSON.stringify({ schema: TESTSET_SCHEMA, sets }));
  window.dispatchEvent(new CustomEvent(SYNC, { detail: projectId }));
}

/** Read-only access outside React (export pipeline, validation). */
export function readTestSets(projectId: string | undefined): TestSet[] {
  return projectId ? read(projectId) : [];
}

export interface TestSetLibrary {
  sets: TestSet[];
  get: (uuid: string) => TestSet | undefined;
  create: (set?: TestSet) => TestSet;
  update: (uuid: string, fn: (s: TestSet) => TestSet, note?: string) => void;
  duplicate: (uuid: string) => TestSet | undefined;
  remove: (uuid: string) => void;
  importSets: (json: string) => number;
  exportJson: (uuids?: string[]) => string;
  restoreVersion: (uuid: string, version: number) => void;
}

export function useTestSets(): TestSetLibrary {
  const project = useActiveProject();
  const projectId = project?.id ?? "";
  const [sets, setSets] = useState<TestSet[]>(() => read(projectId));

  useEffect(() => {
    setSets(read(projectId));
  }, [projectId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onChange = () => setSets(read(projectId));
    window.addEventListener(SYNC, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(SYNC, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [projectId]);

  const commit = useCallback(
    (next: TestSet[]) => {
      if (!projectId) return;
      write(projectId, next);
      setSets(next);
    },
    [projectId],
  );

  return useMemo<TestSetLibrary>(
    () => ({
      sets,
      get: (uuid) => sets.find((s) => s.uuid === uuid),
      create: (set) => {
        const next = set ?? makeTestSet();
        commit([next, ...sets]);
        return next;
      },
      update: (uuid, fn, note) => {
        commit(
          sets.map((s) => {
            if (s.uuid !== uuid) return s;
            const edited = fn(s);
            return note ? pushHistory({ ...edited, updatedAt: Date.now() }, note) : { ...edited, updatedAt: Date.now() };
          }),
        );
      },
      duplicate: (uuid) => {
        const src = sets.find((s) => s.uuid === uuid);
        if (!src) return undefined;
        const copy: TestSet = {
          ...src,
          uuid: rid("testset"),
          name: `${src.name} Copy`,
          version: 1,
          history: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        commit([copy, ...sets]);
        return copy;
      },
      remove: (uuid) => commit(sets.filter((s) => s.uuid !== uuid)),
      importSets: (json) => {
        try {
          const parsed = JSON.parse(json) as { sets?: TestSet[] } | TestSet[];
          const incoming = Array.isArray(parsed) ? parsed : (parsed.sets ?? []);
          const clean = incoming
            .filter((s) => s && typeof s === "object" && s.root)
            .map((s) => ({ ...s, uuid: sets.some((x) => x.uuid === s.uuid) ? rid("testset") : s.uuid }));
          if (!clean.length) return 0;
          commit([...clean, ...sets]);
          return clean.length;
        } catch {
          return 0;
        }
      },
      exportJson: (uuids) =>
        JSON.stringify(
          {
            schema: TESTSET_SCHEMA,
            exportedAt: new Date().toISOString(),
            sets: uuids ? sets.filter((s) => uuids.includes(s.uuid)) : sets,
          },
          null,
          2,
        ),
      restoreVersion: (uuid, version) => {
        commit(
          sets.map((s) => {
            if (s.uuid !== uuid) return s;
            const snap = s.history.find((h) => h.version === version);
            if (!snap) return s;
            return pushHistory({ ...s, root: snap.root }, `Restored v${version}`);
          }),
        );
      },
    }),
    [sets, commit],
  );
}
