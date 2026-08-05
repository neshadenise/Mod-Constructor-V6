/**
 * DBPF (.package) reader and writer for The Sims 4 (index major 7 / minor 3).
 *
 * The reader enumerates the real resource index — type, group, instance,
 * position, size, compression — and keeps every resource's original bytes so a
 * package can be rebuilt losslessly. Resources the app cannot decode are copied
 * through verbatim (including their compression) on export.
 */

import { ByteReader, ByteWriter, hex, hex64, inflateZlib, utf8 } from "./binary";
import { LIMITS, type ResourceKey } from "./types";

export interface DbpfEntry {
  index: number;
  key: ResourceKey;
  typeNum: number;
  groupNum: number;
  instance: bigint;
  position: number;
  /** Size on disk (possibly compressed). */
  size: number;
  memSize: number;
  compressionType: number;
  committed: number;
  /** Raw bytes exactly as stored on disk. */
  raw: Uint8Array;
}

export interface DbpfPackage {
  major: number;
  minor: number;
  indexMajor: number;
  indexMinor: number;
  entries: DbpfEntry[];
}

export const DBPF_MAGIC = "DBPF";

export function isDbpf(bytes: Uint8Array) {
  return bytes.length > 96 && utf8(bytes.subarray(0, 4)) === DBPF_MAGIC;
}

export function compressionLabel(t: number): "none" | "zlib" | "internal" | "unknown" {
  if (t === 0x0000) return "none";
  if (t === 0x5a42) return "zlib";
  if (t === 0xffff || t === 0xffe0) return "internal";
  return "unknown";
}

export function readDbpf(bytes: Uint8Array): DbpfPackage {
  if (!isDbpf(bytes)) throw new Error("Not a DBPF package (missing DBPF signature)");
  const r = new ByteReader(bytes);
  r.seek(4);
  const major = r.u32();
  const minor = r.u32();
  r.seek(0x20);
  const indexMajor = r.u32();
  const count = r.u32();
  const indexPositionLow = r.u32();
  const indexSize = r.u32();
  r.seek(0x3c);
  const indexMinor = r.u32();
  const indexPosition = r.u32();

  if (count > LIMITS.maxResourcesPerPackage)
    throw new Error(`Corrupt package: implausible resource count (${count})`);

  const start = indexPosition || indexPositionLow;
  if (count > 0 && (start <= 0 || start + indexSize > bytes.length))
    throw new Error("Corrupt package: index position is outside the file");

  const entries: DbpfEntry[] = [];
  if (count === 0) return { major, minor, indexMajor, indexMinor, entries };

  r.seek(start);
  const flags = r.u32();
  const constType = flags & 0x1 ? r.u32() : undefined;
  const constGroup = flags & 0x2 ? r.u32() : undefined;
  const constInstEx = flags & 0x4 ? r.u32() : undefined;

  for (let i = 0; i < count; i++) {
    const typeNum = constType ?? r.u32();
    const groupNum = constGroup ?? r.u32();
    const instHi = constInstEx ?? r.u32();
    const instLo = r.u32();
    const position = r.u32();
    const sizeField = r.u32();
    const size = sizeField & 0x7fffffff;
    let memSize = size;
    let compressionType = 0;
    let committed = 1;
    if (sizeField & 0x80000000) {
      memSize = r.u32();
      compressionType = r.u16();
      committed = r.u16();
    }
    if (position + size > bytes.length)
      throw new Error(`Corrupt package: resource ${i} extends past end of file`);
    const instance = (BigInt(instHi >>> 0) << 32n) | BigInt(instLo >>> 0);
    entries.push({
      index: i,
      key: { type: hex(typeNum, 8), group: hex(groupNum, 8), instance: hex64(instance) },
      typeNum,
      groupNum,
      instance,
      position,
      size,
      memSize,
      compressionType,
      committed,
      raw: bytes.subarray(position, position + size),
    });
  }
  return { major, minor, indexMajor, indexMinor, entries };
}

/** Decompresses one entry's payload when the compression is supported. */
export async function readDbpfResource(entry: DbpfEntry): Promise<Uint8Array> {
  const kind = compressionLabel(entry.compressionType);
  if (kind === "none") return entry.raw;
  if (kind === "zlib") return inflateZlib(entry.raw);
  throw new Error(`Unsupported DBPF compression 0x${hex(entry.compressionType, 4)}`);
}

export interface DbpfWriteEntry {
  typeNum: number;
  groupNum: number;
  instance: bigint;
  /** Bytes exactly as they should sit on disk. */
  raw: Uint8Array;
  memSize: number;
  compressionType: number;
  committed?: number;
}

/**
 * Writes a DBPF v2.1 package. Entries are written in the given order with their
 * stored bytes untouched, so a read -> write round trip is byte-stable for the
 * payloads and functionally identical for the game.
 */
export function writeDbpf(entries: DbpfWriteEntry[]): Uint8Array {
  const body = new ByteWriter();
  const positions: number[] = [];
  const HEADER = 96;
  body.zeros(HEADER);
  for (const e of entries) {
    positions.push(HEADER + (body.length - HEADER));
    body.raw(e.raw);
  }
  const indexPosition = body.length;

  const index = new ByteWriter();
  index.u32(0); // no constant fields — always write full keys
  entries.forEach((e, i) => {
    index.u32(e.typeNum >>> 0);
    index.u32(e.groupNum >>> 0);
    index.u32(Number((e.instance >> 32n) & 0xffffffffn));
    index.u32(Number(e.instance & 0xffffffffn));
    index.u32(positions[i]!);
    index.u32((e.raw.byteLength & 0x7fffffff) | 0x80000000);
    index.u32(e.memSize >>> 0);
    index.u16(e.compressionType & 0xffff);
    index.u16(e.committed ?? 1);
  });
  const indexBytes = index.finish();
  body.raw(indexBytes);

  const out = body.finish();
  const head = new DataView(out.buffer, out.byteOffset, HEADER);
  new Uint8Array(out.buffer, out.byteOffset, 4).set(new TextEncoder().encode(DBPF_MAGIC));
  head.setUint32(0x04, 2, true); // major
  head.setUint32(0x08, 1, true); // minor
  head.setUint32(0x20, 7, true); // index major
  head.setUint32(0x24, entries.length, true);
  head.setUint32(0x28, indexPosition, true);
  head.setUint32(0x2c, indexBytes.byteLength, true);
  head.setUint32(0x3c, 3, true); // index minor
  head.setUint32(0x40, indexPosition, true);
  return out;
}
