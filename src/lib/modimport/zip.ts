/**
 * Minimal, defensive ZIP reader/writer.
 *
 * Untrusted input: entry names are sanitised (ZIP-slip / absolute path / traversal),
 * entry counts and decompressed sizes are bounded, and encrypted archives are
 * rejected rather than half-parsed. Nothing inside an archive is ever executed.
 */

import { ByteReader, ByteWriter, crc32, inflateRaw } from "./binary";
import { LIMITS } from "./types";

export interface ZipEntry {
  name: string;
  /** Sanitised, always relative, no "..", no leading slash or drive letter. */
  safeName: string;
  byteSize: number;
  compressedSize: number;
  method: number;
  crc: number;
  offset: number;
  directory: boolean;
  encrypted: boolean;
  unsafeName?: string;
}

export interface ZipReadResult {
  entries: ZipEntry[];
  warnings: string[];
}

export function sanitizeZipPath(name: string): { safe: string; unsafe?: string } {
  const raw = name.replace(/\\/g, "/");
  const cleaned = raw
    .replace(/^[a-zA-Z]:/, "")
    .split("/")
    .filter((p) => p && p !== "." && p !== "..")
    .join("/");
  const unsafe = cleaned !== raw.replace(/^\/+/, "") ? raw : undefined;
  return { safe: cleaned, unsafe };
}

export function isZip(bytes: Uint8Array) {
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 3 || bytes[2] === 5 || bytes[2] === 7);
}

/** Reads the central directory. Throws on a corrupt/unsupported archive. */
export function readZipIndex(bytes: Uint8Array): ZipReadResult {
  const warnings: string[] = [];
  let eocd = -1;
  const start = Math.max(0, bytes.length - 66_000);
  for (let i = bytes.length - 22; i >= start; i--) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Corrupt archive: end-of-central-directory record not found");

  const r = new ByteReader(bytes);
  r.seek(eocd + 10);
  let count = r.u16();
  r.u32(); // central dir size
  let cdOffset = r.u32();

  // ZIP64 locator
  if (count === 0xffff || cdOffset === 0xffffffff) {
    const loc = eocd - 20;
    if (loc >= 0 && bytes[loc] === 0x50 && bytes[loc + 1] === 0x4b && bytes[loc + 2] === 0x06 && bytes[loc + 3] === 0x07) {
      r.seek(loc + 8);
      const z64 = Number(r.u64());
      r.seek(z64 + 32);
      count = Number(r.u64());
      r.seek(z64 + 48);
      cdOffset = Number(r.u64());
    } else {
      throw new Error("Corrupt archive: ZIP64 locator missing");
    }
  }
  if (count > LIMITS.maxArchiveEntries)
    throw new Error(`Archive rejected: ${count} entries exceeds the ${LIMITS.maxArchiveEntries} limit`);

  const entries: ZipEntry[] = [];
  let total = 0;
  r.seek(cdOffset);
  for (let i = 0; i < count; i++) {
    if (r.remaining < 46) break;
    if (r.u32() !== 0x02014b50) throw new Error("Corrupt archive: bad central directory signature");
    r.offset += 4; // versions
    const flags = r.u16();
    const method = r.u16();
    r.offset += 4; // time/date
    const crc = r.u32();
    let compressedSize = r.u32();
    let byteSize = r.u32();
    const nameLen = r.u16();
    const extraLen = r.u16();
    const commentLen = r.u16();
    r.offset += 4; // disk number start + internal attributes
    r.offset += 4; // external attributes
    let offset = r.u32();
    const name = new TextDecoder().decode(r.slice(nameLen));
    const extra = r.slice(extraLen);
    r.offset += commentLen;

    if (byteSize === 0xffffffff || compressedSize === 0xffffffff || offset === 0xffffffff) {
      const er = new ByteReader(extra);
      while (er.remaining >= 4) {
        const id = er.u16();
        const size = er.u16();
        const end = er.offset + size;
        if (id === 0x0001) {
          if (byteSize === 0xffffffff) byteSize = Number(er.u64());
          if (compressedSize === 0xffffffff) compressedSize = Number(er.u64());
          if (offset === 0xffffffff && er.remaining >= 8) offset = Number(er.u64());
        }
        er.seek(Math.min(end, extra.length));
      }
    }

    const encrypted = (flags & 0x1) !== 0;
    const { safe, unsafe } = sanitizeZipPath(name);
    if (unsafe) warnings.push(`Unsafe archive path rewritten: "${name}" -> "${safe}"`);
    if (encrypted) warnings.push(`Skipped password-protected entry "${name}"`);
    total += byteSize;
    if (total > LIMITS.maxDecompressedBytes)
      throw new Error("Archive rejected: decompressed size limit exceeded");

    entries.push({
      name,
      safeName: safe,
      byteSize,
      compressedSize,
      method,
      crc,
      offset,
      directory: name.endsWith("/") || safe === "",
      encrypted,
      unsafeName: unsafe,
    });
  }
  return { entries, warnings };
}

/** Reads and decompresses one entry. Supports stored (0) and deflate (8). */
export async function readZipEntry(bytes: Uint8Array, entry: ZipEntry): Promise<Uint8Array> {
  if (entry.encrypted) throw new Error("Entry is encrypted");
  const r = new ByteReader(bytes);
  r.seek(entry.offset);
  if (r.u32() !== 0x04034b50) throw new Error("Corrupt archive: bad local header");
  r.offset += 22;
  const nameLen = r.u16();
  const extraLen = r.u16();
  r.offset += nameLen + extraLen;
  const raw = r.slice(entry.compressedSize);
  if (entry.method === 0) return raw;
  if (entry.method === 8) return inflateRaw(raw);
  throw new Error(`Unsupported compression method ${entry.method}`);
}

export interface ZipWriteEntry {
  name: string;
  bytes: Uint8Array;
}

/** Writes a stored (uncompressed) ZIP — deterministic and dependency free. */
export function writeZip(files: ZipWriteEntry[]): Uint8Array {
  const out = new ByteWriter();
  const central: { name: Uint8Array; crc: number; size: number; offset: number }[] = [];
  const enc = new TextEncoder();

  for (const f of files) {
    const name = enc.encode(sanitizeZipPath(f.name).safe);
    const crc = crc32(f.bytes);
    const offset = out.length;
    out.u32(0x04034b50).u16(20).u16(0).u16(0).u16(0).u16(0);
    out.u32(crc).u32(f.bytes.byteLength).u32(f.bytes.byteLength).u16(name.length).u16(0);
    out.raw(name).raw(f.bytes);
    central.push({ name, crc, size: f.bytes.byteLength, offset });
  }

  const cdStart = out.length;
  for (const c of central) {
    out.u32(0x02014b50).u16(20).u16(20).u16(0).u16(0).u16(0).u16(0);
    out.u32(c.crc).u32(c.size).u32(c.size);
    out.u16(c.name.length).u16(0).u16(0).u16(0).u16(0).u32(0).u32(c.offset);
    out.raw(c.name);
  }
  const cdSize = out.length - cdStart;
  out.u32(0x06054b50).u16(0).u16(0).u16(central.length).u16(central.length);
  out.u32(cdSize).u32(cdStart).u16(0);
  return out.finish();
}
