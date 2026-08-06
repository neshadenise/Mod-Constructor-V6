/** Sims 4 resource type table + STBL string-table parsing. */

import { ByteReader, utf8 } from "./binary";

export interface ResourceTypeInfo {
  label: string;
  /** Whether the app has a decoder that can edit this type. */
  decodable: boolean;
  /**
   * Recognised binary formats we cannot edit but fully understand and copy
   * through byte-for-byte on export. These are safe, not "unsupported".
   */
  preservable?: boolean;
  category: "tuning" | "simdata" | "localization" | "image" | "audio" | "data" | "other";
}

/** Type ids are decimal-free hex strings, matching ResourceKey.type. */
export const RESOURCE_TYPES: Record<string, ResourceTypeInfo> = {
  /* Tuning (text XML) */
  "0333406C": { label: "XML Tuning", decodable: true, category: "tuning" },
  "7FB6AD8A": { label: "Combined Tuning", decodable: true, category: "tuning" },
  "0C772E27": { label: "Level XML", decodable: true, category: "tuning" },
  "62ECC59A": { label: "Object Catalog Tuning", decodable: true, category: "tuning" },
  "02D5DF13": { label: "Animation Clip Tuning", decodable: false, preservable: true, category: "other" },
  "0166038C": { label: "Name Map", decodable: false, preservable: true, category: "data" },
  "6017E896": { label: "Cache Blob", decodable: false, preservable: true, category: "other" },

  /* Binary data (DATA / SimData family) */
  "545AC67A": { label: "SimData", decodable: false, preservable: true, category: "simdata" },
  "62E94D38": { label: "Object Definition", decodable: false, preservable: true, category: "data" },
  "034AEECB": { label: "CAS Part", decodable: false, preservable: true, category: "data" },
  "0354796A": { label: "Trait Tuning Data", decodable: false, preservable: true, category: "data" },
  "3BD45407": { label: "Sim Info Fragment", decodable: false, preservable: true, category: "data" },
  "D8CB0F1A": { label: "Slot Definition", decodable: false, preservable: true, category: "data" },
  "0C93E3DE": { label: "Object Slot Data", decodable: false, preservable: true, category: "data" },
  "D3044521": { label: "Region Map", decodable: false, preservable: true, category: "data" },
  "8FFB80F6": { label: "Blueprint", decodable: false, preservable: true, category: "data" },
  "9AFE47F5": { label: "Sim Outfit", decodable: false, preservable: true, category: "data" },
  "025ED6F4": { label: "Sim Info", decodable: false, preservable: true, category: "data" },
  "AC16FBEC": { label: "Household Binary", decodable: false, preservable: true, category: "data" },
  "AC8E1BC0": { label: "Lot Description", decodable: false, preservable: true, category: "data" },
  "F0633989": { label: "Household Description", decodable: false, preservable: true, category: "data" },
  "6B20C4F3": { label: "Object Catalog Set", decodable: false, preservable: true, category: "data" },
  "319E4F1D": { label: "Object Definition (OBJD)", decodable: false, preservable: true, category: "data" },
  "B61DE6B4": { label: "Catalog Product", decodable: false, preservable: true, category: "data" },
  "0C9DE763": { label: "Catalog Wall Floor Pattern", decodable: false, preservable: true, category: "data" },
  "9151E6BC": { label: "Catalog Terrain Paint", decodable: false, preservable: true, category: "data" },
  "B0311D0F": { label: "Catalog Style", decodable: false, preservable: true, category: "data" },
  "3C1D8799": { label: "Catalog Fence", decodable: false, preservable: true, category: "data" },
  "9F5CFF10": { label: "Catalog Stairs", decodable: false, preservable: true, category: "data" },
  "4B58975A": { label: "Catalog Roof Pattern", decodable: false, preservable: true, category: "data" },
  "91EDBD3E": { label: "Catalog Roof Style", decodable: false, preservable: true, category: "data" },
  "F1EDBD86": { label: "Catalog Frieze", decodable: false, preservable: true, category: "data" },
  "0418FE2A": { label: "Catalog Wall", decodable: false, preservable: true, category: "data" },
  "D65DAFF9": { label: "Catalog Column", decodable: false, preservable: true, category: "data" },
  "AC16FBEB": { label: "Catalog Railing", decodable: false, preservable: true, category: "data" },
  "1C1CF1F7": { label: "Catalog Trim", decodable: false, preservable: true, category: "data" },
  "E7ADA79D": { label: "Catalog Foundation", decodable: false, preservable: true, category: "data" },
  "CF9A4ACE": { label: "Catalog Modular Stairs", decodable: false, preservable: true, category: "data" },
  "9C925813": { label: "Sim Preset", decodable: false, preservable: true, category: "data" },
  "C0DB5AE7": { label: "Object Preset", decodable: false, preservable: true, category: "data" },
  "0C7E9A76": { label: "Jazz Script", decodable: false, preservable: true, category: "data" },
  "02C9EFF2": { label: "Audio Effect Map", decodable: false, preservable: true, category: "audio" },
  "01A527DB": { label: "Audio Reference", decodable: false, preservable: true, category: "audio" },
  "01EEF63A": { label: "Audio Sample", decodable: false, preservable: true, category: "audio" },
  "2026960B": { label: "Audio Bank", decodable: false, preservable: true, category: "audio" },

  /* Localization */
  "220557DA": { label: "String Table (STBL)", decodable: true, category: "localization" },
  "0166038D": { label: "Locale Name Map", decodable: false, preservable: true, category: "localization" },

  /* Images */
  "00B2D882": { label: "DDS Image", decodable: false, preservable: true, category: "image" },
  "3C1AF1F2": { label: "Thumbnail (PNG)", decodable: false, preservable: true, category: "image" },
  "2F7D0004": { label: "PNG Image", decodable: false, preservable: true, category: "image" },
  "3453CF95": { label: "RLE2 Image", decodable: false, preservable: true, category: "image" },
  "B6C8B6A0": { label: "Thumbnail Image", decodable: false, preservable: true, category: "image" },
  "2E75C764": { label: "CAS Thumbnail", decodable: false, preservable: true, category: "image" },
  "3C2A8647": { label: "Object Thumbnail", decodable: false, preservable: true, category: "image" },
  "5B282D45": { label: "Sim Thumbnail", decodable: false, preservable: true, category: "image" },
  "3BD45407": { label: "Sim Info Fragment", decodable: false, preservable: true, category: "data" },
  "0580A2B4": { label: "Build/Buy Thumbnail", decodable: false, preservable: true, category: "image" },
  "0580A2B5": { label: "Build/Buy Thumbnail (small)", decodable: false, preservable: true, category: "image" },
  "0580A2B6": { label: "Build/Buy Thumbnail (large)", decodable: false, preservable: true, category: "image" },
  "0D338A3A": { label: "CAS Preset Thumbnail", decodable: false, preservable: true, category: "image" },
  "16CA6BC4": { label: "Sim Face Thumbnail", decodable: false, preservable: true, category: "image" },
  "2653E3C8": { label: "Room Thumbnail", decodable: false, preservable: true, category: "image" },
  "5DE9DBA0": { label: "Lot Thumbnail", decodable: false, preservable: true, category: "image" },
  "6B6D2CE4": { label: "Household Thumbnail", decodable: false, preservable: true, category: "image" },
  "8E71065D": { label: "Texture (RLES)", decodable: false, preservable: true, category: "image" },
  "3BD45407A": { label: "Reserved", decodable: false, preservable: true, category: "other" },

  /* Geometry / rendering (RCOL family) */
  "01661233": { label: "Model (MODL)", decodable: false, preservable: true, category: "other" },
  "01D10F34": { label: "Model LOD (MLOD)", decodable: false, preservable: true, category: "other" },
  "01D0E75D": { label: "Material Definition (MATD)", decodable: false, preservable: true, category: "other" },
  "01D0E723": { label: "Rig (RIG)", decodable: false, preservable: true, category: "other" },
  "01D0E70F": { label: "Geometry (GEOM)", decodable: false, preservable: true, category: "other" },
  "01D0E6FB": { label: "Bone Delta (BOND)", decodable: false, preservable: true, category: "other" },
  "033A1435": { label: "Texture Compositor", decodable: false, preservable: true, category: "other" },
  "0355E0A6": { label: "Bone Pose", decodable: false, preservable: true, category: "other" },
  "F3A38370": { label: "Footprint (FTPT)", decodable: false, preservable: true, category: "other" },
  "D382BF57": { label: "Footprint Set", decodable: false, preservable: true, category: "other" },
  "8EAF13DE": { label: "Skin Tone", decodable: false, preservable: true, category: "other" },
  "015A1849": { label: "Geometry Resource", decodable: false, preservable: true, category: "other" },
  "01A527DA": { label: "Vertex Format", decodable: false, preservable: true, category: "other" },
  "6B6D837D": { label: "Light Set", decodable: false, preservable: true, category: "other" },
  "0166038F": { label: "Shader Resource", decodable: false, preservable: true, category: "other" },
  "01942E2C": { label: "Animation State Machine", decodable: false, preservable: true, category: "other" },
  "6017E8F8": { label: "Clip Header", decodable: false, preservable: true, category: "other" },
  "8FFB80F7": { label: "Room Blueprint", decodable: false, preservable: true, category: "other" },
};

/** Best-effort format detection for payloads whose type id is unknown. */
export type SniffedFormat =
  | "xml"
  | "stbl"
  | "dds"
  | "png"
  | "jpeg"
  | "rle"
  | "data"
  | "rcol"
  | "zip"
  | "text"
  | "binary";

const SNIFF_LABEL: Record<SniffedFormat, string> = {
  xml: "XML tuning",
  stbl: "String table (STBL)",
  dds: "DDS image",
  png: "PNG image",
  jpeg: "JPEG image",
  rle: "RLE texture",
  data: "Binary data (DATA)",
  rcol: "Render resource (RCOL)",
  zip: "Compressed archive",
  text: "Plain text",
  binary: "Binary payload",
};

export function sniffedFormatLabel(format: SniffedFormat): string {
  return SNIFF_LABEL[format];
}

function magic(bytes: Uint8Array, len = 4): string {
  return utf8(bytes.subarray(0, Math.min(len, bytes.length)));
}

/**
 * Identifies a payload by its leading bytes. Used when the resource type id is
 * not in the table, so an unknown id never means "unrecognised content".
 */
export function sniffFormat(bytes: Uint8Array): SniffedFormat {
  if (!bytes.length) return "binary";
  const head = magic(bytes);
  if (head === "STBL") return "stbl";
  if (head === "DDS ") return "dds";
  if (head === "DATA") return "data";
  if (head === "RCOL" || head === "GEOM" || head === "MODL" || head === "RIG ") return "rcol";
  if (head.startsWith("PK")) return "zip";
  if (bytes[0] === 0x89 && head.slice(1, 4) === "PNG") return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpeg";
  if (head === "RLE2" || head === "RLES") return "rle";

  // Text detection over a leading window: mostly printable, no NUL bytes.
  const window = bytes.subarray(0, Math.min(512, bytes.length));
  let printable = 0;
  for (const b of window) {
    if (b === 0) return "binary";
    if (b === 9 || b === 10 || b === 13 || (b >= 0x20 && b < 0x7f) || b >= 0x80) printable++;
  }
  if (printable / window.length > 0.95) {
    const text = utf8(window).trimStart();
    if (text.startsWith("<?xml") || text.startsWith("<")) return "xml";
    return "text";
  }
  return "binary";
}

export function resourceTypeInfo(type: string): ResourceTypeInfo {
  return (
    RESOURCE_TYPES[type.toUpperCase()] ?? {
      label: `Unknown type 0x${type.toUpperCase()}`,
      decodable: false,
      preservable: false,
      category: "other",
    }
  );
}

export function isKnownResourceType(type: string): boolean {
  return Boolean(RESOURCE_TYPES[type.toUpperCase()]);
}



export interface StblEntry {
  key: string;
  value: string;
}

export function isStbl(bytes: Uint8Array) {
  return bytes.length >= 21 && utf8(bytes.subarray(0, 4)) === "STBL";
}

/**
 * Parses an uncompressed STBL v5 payload.
 * Header: "STBL" | version u16 | compressed u8 | numEntries u64 | reserved(2) |
 * stringLength u32, then per entry: keyHash u32 | flags u8 | length u16 | utf8.
 */
export function parseStbl(bytes: Uint8Array): StblEntry[] {
  if (!isStbl(bytes)) throw new Error("Not an STBL string table");
  const r = new ByteReader(bytes);
  r.seek(4);
  const version = r.u16();
  if (version < 5) throw new Error(`Unsupported STBL version ${version}`);
  r.u8(); // compressed flag
  const count = Number(r.u64());
  r.offset += 2; // reserved
  r.u32(); // total string length
  const out: StblEntry[] = [];
  for (let i = 0; i < count && r.remaining >= 7; i++) {
    const key = r.u32().toString(16).toUpperCase().padStart(8, "0");
    r.u8(); // flags
    const len = r.u16();
    if (len > r.remaining) break;
    out.push({ key, value: utf8(r.slice(len)) });
  }
  return out;
}
