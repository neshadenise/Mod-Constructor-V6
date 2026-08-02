/**
 * Builder seed channel.
 *
 * Templates (and any other "open this in the builder" action) drop a payload
 * here, then navigate to the matching builder section. The builder consumes
 * the seed once on mount and hydrates its editor state from it.
 */

import { useEffect, useRef } from "react";

export type BuilderSeedKind = "career" | "trait" | "aspiration" | "notification";

type Seed = {
  kind: BuilderSeedKind;
  payload: unknown;
  recordId?: string;
};

let pending: Seed | null = null;
const listeners = new Set<() => void>();

export function setBuilderSeed(
  kind: BuilderSeedKind,
  payload: unknown,
  recordId?: string,
) {
  pending = { kind, payload, recordId };
  for (const l of Array.from(listeners)) l();
}

export function clearBuilderSeed() {
  pending = null;
}

/** Consume a pending seed for this builder (once). */
export function useBuilderSeed<T>(
  kind: BuilderSeedKind,
  apply: (payload: T, recordId?: string) => void,
) {
  const applyRef = useRef(apply);
  applyRef.current = apply;

  useEffect(() => {
    const run = () => {
      if (!pending || pending.kind !== kind) return;
      const seed = pending;
      pending = null;
      applyRef.current(seed.payload as T, seed.recordId);
    };
    run();
    listeners.add(run);
    return () => {
      listeners.delete(run);
    };
  }, [kind]);
}
