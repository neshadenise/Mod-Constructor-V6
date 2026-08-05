/**
 * Centralised resource ID service.
 *
 * Sims 4 resources are addressed by a Type / Group / Instance triple. Instance
 * ids are 64 bit, so they are kept as bigint internally and 16 digit uppercase
 * hex strings everywhere else — never as JavaScript numbers.
 *
 * Generation is deterministic: the same namespace + kind + name always yields
 * the same instance id, so exporting an unchanged project twice produces
 * identical keys. UI components must never invent ids themselves.
 */

import type { ResourceKey } from "@/lib/modimport/types";

export const TYPE_TUNING = "0333406C";
export const TYPE_SIMDATA = "545AC67A";
export const TYPE_STBL = "220557DA";
export const TYPE_PNG = "2F7D0004";
export const TYPE_DDS = "00B2D882";

export const GROUP_DEFAULT = "00000000";

/** Instances the game reserves — never hand these out. */
const RESERVED_INSTANCES = new Set(["0000000000000000", "FFFFFFFFFFFFFFFF"]);

export function fnv1a32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i) & 0xff;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const FNV64_PRIME = 0x100000001b3n;
const MASK64 = 0xffffffffffffffffn;

export function fnv1a64(text: string): bigint {
  let h = 0xcbf29ce484222325n;
  const bytes = new TextEncoder().encode(text);
  for (const b of bytes) {
    h ^= BigInt(b);
    h = (h * FNV64_PRIME) & MASK64;
  }
  return h;
}

/** Sims high-bit convention: tuning instances set bit 63 for "high bit" ids. */
export function withHighBit(v: bigint): bigint {
  return (v | 0x8000000000000000n) & MASK64;
}

export const hex32 = (n: number) => (n >>> 0).toString(16).toUpperCase().padStart(8, "0");
export const hex64 = (n: bigint) => (n & MASK64).toString(16).toUpperCase().padStart(16, "0");

export function keyToString(key: ResourceKey) {
  return `${key.type.toUpperCase()}:${key.group.toUpperCase()}:${key.instance.toUpperCase()}`;
}

export function normalizeKey(key: ResourceKey): ResourceKey {
  return {
    type: key.type.toUpperCase().padStart(8, "0"),
    group: key.group.toUpperCase().padStart(8, "0"),
    instance: key.instance.toUpperCase().padStart(16, "0"),
  };
}

export interface ResourceIdInput {
  /** Creator/mod namespace, e.g. "nesha.dancercareer". */
  namespace: string;
  /** Builder kind: "career", "career_level", "trait", "buff", "aspiration"... */
  kind: string;
  /** Stable name of the record — its internal id, not its display name. */
  name: string;
  type?: string;
  group?: string;
  /** Manual override — used verbatim after validation. */
  manualInstance?: string;
  /** Set for tuning instances that use the high bit convention. */
  highBit?: boolean;
}

export interface IdValidation {
  severity: "error" | "warning";
  code: string;
  message: string;
}

export class ResourceIdService {
  /** key string -> owning resource id. */
  private reserved = new Map<string, string>();

  constructor(existing: { key: ResourceKey; resourceId: string }[] = []) {
    for (const e of existing) this.reserved.set(keyToString(normalizeKey(e.key)), e.resourceId);
  }

  generateResourceKey(input: ResourceIdInput): ResourceKey {
    const type = (input.type ?? TYPE_TUNING).toUpperCase().padStart(8, "0");
    const group = (input.group ?? GROUP_DEFAULT).toUpperCase().padStart(8, "0");
    if (input.manualInstance) {
      return normalizeKey({ type, group, instance: input.manualInstance });
    }
    const seed = `${input.namespace}:${input.kind}:${input.name}`;
    let value = fnv1a64(seed);
    if (input.highBit ?? type === TYPE_TUNING) value = withHighBit(value);
    let key = normalizeKey({ type, group, instance: hex64(value) });
    // Deterministic repair: walk the seed, never random.
    let attempt = 0;
    while (
      (RESERVED_INSTANCES.has(key.instance) || this.reserved.has(keyToString(key))) &&
      attempt < 32
    ) {
      attempt++;
      let next = fnv1a64(`${seed}#${attempt}`);
      if (input.highBit ?? type === TYPE_TUNING) next = withHighBit(next);
      key = normalizeKey({ type, group, instance: hex64(next) });
    }
    return key;
  }

  validateResourceKey(key: ResourceKey): IdValidation[] {
    const out: IdValidation[] = [];
    const k = normalizeKey(key);
    if (!/^[0-9A-F]{8}$/.test(k.type))
      out.push({ severity: "error", code: "INVALID_TYPE", message: `Resource type "${key.type}" is not 8 hex digits.` });
    if (!/^[0-9A-F]{8}$/.test(k.group))
      out.push({ severity: "error", code: "INVALID_GROUP", message: `Resource group "${key.group}" is not 8 hex digits.` });
    if (!/^[0-9A-F]{16}$/.test(k.instance))
      out.push({ severity: "error", code: "INVALID_INSTANCE", message: `Instance "${key.instance}" is not 16 hex digits.` });
    if (RESERVED_INSTANCES.has(k.instance))
      out.push({ severity: "error", code: "RESERVED_INSTANCE", message: `Instance ${k.instance} is reserved by the game.` });
    return out;
  }

  detectCollision(key: ResourceKey, resourceId?: string): boolean {
    const owner = this.reserved.get(keyToString(normalizeKey(key)));
    return owner !== undefined && owner !== resourceId;
  }

  reserveKey(key: ResourceKey, resourceId: string): void {
    this.reserved.set(keyToString(normalizeKey(key)), resourceId);
  }

  /** Every key currently held, for duplicate reporting. */
  entries(): { key: string; resourceId: string }[] {
    return [...this.reserved.entries()].map(([key, resourceId]) => ({ key, resourceId }));
  }
}

/** Stable localisation key for a field of a record. */
export function localizationKey(namespace: string, kind: string, name: string, field: string) {
  return hex32(fnv1a32(`${namespace}:${kind}:${name}:${field}`));
}
