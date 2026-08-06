/**
 * Builder record binding.
 *
 * Every builder (Career / Trait / Aspiration) edits ONE record that belongs to
 * the active project. This hook owns that relationship:
 *
 *  - switching projects reloads the builder with that project's first record,
 *    or a fresh default draft when the project has none of that kind;
 *  - a project can hold many records — `select` swaps between them;
 *  - `addNew` starts a blank entry (saving the current one first);
 *  - `save` is the manual save; edits to an unsaved default draft are
 *    auto-committed as a NEW entry shortly after typing stops.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore, useActiveProject } from "@/lib/store";
import type { Aspiration, Career, ID, Trait } from "@/lib/types";

export type BuilderKind = "career" | "trait" | "aspiration";

type AnyRecord = Career | Trait | Aspiration;

export interface BuilderRecordApi<S> {
  /** Records of this kind inside the active project (newest first). */
  records: { id: ID; name: string }[];
  /** Currently bound record, or null while editing an uncommitted draft. */
  currentId: ID | null;
  currentName: string;
  dirty: boolean;
  /** Persist now (creates the record when the draft is new). */
  save: () => void;
  /** Save the current work and start a blank entry. */
  addNew: () => void;
  /** Save the current work and load another record. */
  select: (id: ID) => void;
  /** Delete a record; falls back to the next one, or a blank draft. */
  remove: (id: ID) => void;
  /** Load a payload straight into the builder as a brand-new draft. */
  loadDraft: (draft: S) => void;
}

const AUTOSAVE_MS = 1200;

const NEW_EVENT = "mc:builder-new";

/** Ask the given builder to start a blank entry (used by sidebar "+"). */
export function requestNewRecord(kind: BuilderKind) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NEW_EVENT, { detail: kind }));
}

export function useBuilderRecord<S>(opts: {
  kind: BuilderKind;
  /** Serialize the builder's current editor state. */
  snapshot: () => S;
  /** Hydrate the builder from a previously saved draft. */
  restore: (draft: S) => void;
  /** A pristine starter draft for a brand-new entry. */
  blank: () => S;
  /** Display name derived from the draft. */
  title: (draft: S) => string;
  /**
   * Build a draft from a stored record that has no saved builder state yet
   * (created from the dashboard, an import, or an older version).
   */
  fromRecord?: (rec: Career | Trait | Aspiration) => S;
}): BuilderRecordApi<S> {
  const { kind } = opts;
  const store = useStore();
  const project = useActiveProject();
  const projectId = project?.id;

  const api = useRef(opts);
  api.current = opts;

  const [currentId, setCurrentId] = useState<ID | null>(null);
  const savedRef = useRef<string>("");
  const [, force] = useState(0);

  const list = useMemo<AnyRecord[]>(() => {
    const all: AnyRecord[] =
      kind === "career"
        ? store.state.careers
        : kind === "trait"
          ? store.state.traits
          : store.state.aspirations;
    return all.filter((r) => r.projectId === projectId);
  }, [kind, projectId, store.state.careers, store.state.traits, store.state.aspirations]);

  const listRef = useRef(list);
  listRef.current = list;

  const create = useCallback(
    (name: string, draft: S): AnyRecord | null => {
      if (!projectId) return null;
      const init = { projectId, name, builderState: draft as Record<string, unknown> };
      if (kind === "career") return store.createCareer(init as never);
      if (kind === "trait") return store.createTrait(init as never);
      return store.createAspiration(init as never);
    },
    [kind, projectId, store],
  );

  const update = useCallback(
    (id: ID, name: string, draft: S) => {
      const patch = { name, builderState: draft as Record<string, unknown> };
      if (kind === "career") store.updateCareer(id, patch);
      else if (kind === "trait") store.updateTrait(id, patch);
      else store.updateAspiration(id, patch);
    },
    [kind, store],
  );

  const del = useCallback(
    (id: ID) => {
      if (kind === "career") store.deleteCareer(id);
      else if (kind === "trait") store.deleteTrait(id);
      else store.deleteAspiration(id);
    },
    [kind, store],
  );

  /** Load a record (or a blank draft) into the builder without saving. */
  const load = useCallback((rec: AnyRecord | null) => {
    if (rec && rec.builderState) {
      api.current.restore(rec.builderState as S);
    } else if (rec) {
      // Created outside the builder (dashboard / import): map the stored
      // record onto a draft so its real content shows up.
      const mapped = api.current.fromRecord?.(rec);
      const base = api.current.blank();
      api.current.restore(mapped ?? ({ ...(base as object), name: rec.name } as S));
    } else {
      api.current.restore(api.current.blank());
    }
    setCurrentId(rec?.id ?? null);
    savedRef.current = "";
    // Snapshot is captured on the next effect pass (state has not applied yet).
    queueMicrotask(() => force((n) => n + 1));
  }, []);

  /* Re-bind whenever the active project changes. */
  const boundProject = useRef<ID | undefined>(undefined);
  useEffect(() => {
    if (boundProject.current === projectId) return;
    boundProject.current = projectId;
    load(listRef.current[0] ?? null);
  }, [projectId, load]);

  const draft = api.current.snapshot();
  const json = JSON.stringify(draft);
  // First pass after a load: treat what's on screen as the saved baseline.
  if (savedRef.current === "") savedRef.current = json;
  const dirty = json !== savedRef.current;

  const persist = useCallback(() => {
    if (!projectId) return;
    const s = api.current.snapshot();
    const name = api.current.title(s).trim() || "Untitled";
    if (currentId && listRef.current.some((r) => r.id === currentId)) {
      update(currentId, name, s);
    } else {
      const rec = create(name, s);
      if (rec) setCurrentId(rec.id);
    }
    savedRef.current = JSON.stringify(s);
    force((n) => n + 1);
  }, [projectId, currentId, create, update]);

  /* Auto-commit: a touched draft becomes a real entry on its own. */
  useEffect(() => {
    if (!dirty || !projectId) return;
    const t = setTimeout(persist, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [dirty, json, projectId, persist]);

  const addNew = useCallback(() => {
    if (dirty) persist();
    load(null);
  }, [dirty, persist, load]);

  const select = useCallback(
    (id: ID) => {
      if (id === currentId) return;
      if (dirty) persist();
      load(listRef.current.find((r) => r.id === id) ?? null);
    },
    [currentId, dirty, persist, load],
  );

  const remove = useCallback(
    (id: ID) => {
      del(id);
      if (id === currentId) {
        const next = listRef.current.find((r) => r.id !== id) ?? null;
        load(next);
      }
    },
    [del, currentId, load],
  );

  /* Sidebar / command palette "+" for this builder. */
  const addNewRef = useRef(addNew);
  addNewRef.current = addNew;
  const selectRef = useRef(select);
  selectRef.current = select;
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail === kind) addNewRef.current();
    };
    /* "Take me to this record" — Health Inspector, search, deep links. */
    const reveal = (e: Event) => {
      const d = (e as CustomEvent).detail as { kind: BuilderKind; id: ID } | undefined;
      if (!d || d.kind !== kind) return;
      if (listRef.current.some((r) => r.id === d.id)) selectRef.current(d.id);
    };
    window.addEventListener(NEW_EVENT, handler);
    window.addEventListener(REVEAL_EVENT, reveal);
    return () => {
      window.removeEventListener(NEW_EVENT, handler);
      window.removeEventListener(REVEAL_EVENT, reveal);
    };
  }, [kind]);

  const loadDraft = useCallback(
    (d: S) => {
      api.current.restore(d);
      setCurrentId(null);
      savedRef.current = "";
      queueMicrotask(() => force((n) => n + 1));
    },
    [],
  );

  const currentName =
    listRef.current.find((r) => r.id === currentId)?.name ?? api.current.title(draft);

  return {
    records: list.map((r) => ({ id: r.id, name: r.name })),
    currentId,
    currentName,
    dirty,
    save: persist,
    addNew,
    select,
    remove,
    loadDraft,
  };
}
