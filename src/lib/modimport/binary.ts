/** Little-endian binary helpers shared by the DBPF / ZIP / STBL parsers. */

export class ByteReader {
  readonly view: DataView;
  offset = 0;
  constructor(readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  get remaining() {
    return this.bytes.byteLength - this.offset;
  }
  seek(o: number) {
    if (o < 0 || o > this.bytes.byteLength) throw new RangeError(`seek out of bounds: ${o}`);
    this.offset = o;
  }
  u8() {
    return this.view.getUint8(this.offset++);
  }
  u16() {
    const v = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return v;
  }
  u32() {
    const v = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return v;
  }
  i32() {
    const v = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return v;
  }
  u64() {
    const v = this.view.getBigUint64(this.offset, true);
    this.offset += 8;
    return v;
  }
  ascii(n: number) {
    const s = String.fromCharCode(...this.bytes.subarray(this.offset, this.offset + n));
    this.offset += n;
    return s;
  }
  slice(n: number) {
    const s = this.bytes.subarray(this.offset, this.offset + n);
    this.offset += n;
    return s;
  }
}

export class ByteWriter {
  private chunks: Uint8Array[] = [];
  private len = 0;
  private scratch = new DataView(new ArrayBuffer(8));

  get length() {
    return this.len;
  }
  raw(b: Uint8Array) {
    this.chunks.push(b);
    this.len += b.byteLength;
    return this;
  }
  u8(v: number) {
    return this.raw(new Uint8Array([v & 0xff]));
  }
  u16(v: number) {
    this.scratch.setUint16(0, v & 0xffff, true);
    return this.raw(new Uint8Array(this.scratch.buffer.slice(0, 2)));
  }
  u32(v: number) {
    this.scratch.setUint32(0, v >>> 0, true);
    return this.raw(new Uint8Array(this.scratch.buffer.slice(0, 4)));
  }
  u64(v: bigint) {
    this.scratch.setBigUint64(0, v, true);
    return this.raw(new Uint8Array(this.scratch.buffer.slice(0, 8)));
  }
  ascii(s: string) {
    return this.raw(new TextEncoder().encode(s));
  }
  zeros(n: number) {
    return this.raw(new Uint8Array(n));
  }
  finish(): Uint8Array {
    const out = new Uint8Array(this.len);
    let o = 0;
    for (const c of this.chunks) {
      out.set(c, o);
      o += c.byteLength;
    }
    return out;
  }
}

export const hex = (n: number, digits: number) =>
  (n >>> 0).toString(16).toUpperCase().padStart(digits, "0");

export const hex64 = (n: bigint) => n.toString(16).toUpperCase().padStart(16, "0");

/** SHA-256 of arbitrary bytes; falls back to a stable FNV hash without WebCrypto. */
export async function checksum(bytes: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const view = new Uint8Array(bytes); // detach from any larger buffer
    const digest = await subtle.digest("SHA-256", view.buffer as ArrayBuffer);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i]!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `fnv-${h.toString(16)}`;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function streamThrough(bytes: Uint8Array, format: "deflate-raw" | "deflate" | "gzip") {
  const Ctor = (globalThis as { DecompressionStream?: typeof DecompressionStream })
    .DecompressionStream;
  if (!Ctor) throw new Error("DecompressionStream is unavailable in this runtime");
  const stream = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(new Ctor(format));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export const inflateRaw = (b: Uint8Array) => streamThrough(b, "deflate-raw");
export const inflateZlib = (b: Uint8Array) => streamThrough(b, "deflate");

export function utf8(bytes: Uint8Array) {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

export function looksLikeText(bytes: Uint8Array) {
  const n = Math.min(bytes.length, 512);
  let printable = 0;
  for (let i = 0; i < n; i++) {
    const b = bytes[i]!;
    if (b === 9 || b === 10 || b === 13 || (b >= 32 && b < 127) || b >= 128) printable++;
  }
  return n > 0 && printable / n > 0.9;
}
