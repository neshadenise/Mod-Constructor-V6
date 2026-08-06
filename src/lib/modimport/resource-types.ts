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
  /* Tuning */
  "0333406C": { label: "XML Tuning", decodable: true, category: "tuning" },
  "7FB6AD8A": { label: "Combined Tuning", decodable: true, category: "tuning" },
  "0C772E27": { label: "Level XML", decodable: true, category: "tuning" },
  "62ECC59A": { label: "Object Catalog Tuning", decodable: true, category: "tuning" },
  "6017E896": { label: "Cache Blob", decodable: false, preservable: true, category: "other" },

  /* Data */
  "545AC67A": { label: "SimData", decodable: false, preservable: true, category: "simdata" },
  "0166038C": { label: "Name Map", decodable: false, preservable: true, category: "data" },
  "62E94D38": { label: "Object Definition", decodable: false, preservable: true, category: "data" },
  "034AEECB": { label: "CAS Part", decodable: false, preservable: true, category: "data" },
  "0354796A": { label: "Trait Tuning Data", decodable: false, preservable: true, category: "data" },
  "3BD45407": { label: "Sim Info Fragment", decodable: false, preservable: true, category: "data" },
  "D8CB0F1A": { label: "Slot Definition", decodable: false, preservable: true, category: "data" },
  "0C93E3DE": { label: "Object Slot Data", decodable: false, preservable: true, category: "data" },

  /* Localization */
  "220557DA": { label: "String Table (STBL)", decodable: true, category: "localization" },

  /* Images */
  "00B2D882": { label: "DDS Image", decodable: false, preservable: true, category: "image" },
  "3C1AF1F2": { label: "Thumbnail (PNG)", decodable: false, preservable: true, category: "image" },
  "2F7D0004": { label: "PNG Image", decodable: false, preservable: true, category: "image" },
  "3453CF95": { label: "RLE2 Image", decodable: false, preservable: true, category: "image" },
  "B6C8B6A0": { label: "Thumbnail Image", decodable: false, preservable: true, category: "image" },
  "2E75C764": { label: "CAS Thumbnail", decodable: false, preservable: true, category: "image" },
  "3C2A8647": { label: "Object Thumbnail", decodable: false, preservable: true, category: "image" },
  "5B282D45": { label: "Sim Thumbnail", decodable: false, preservable: true, category: "image" },

  /* Geometry / rendering */
  "01661233": { label: "Model (MODL)", decodable: false, preservable: true, category: "other" },
  "01D10F34": { label: "Model LOD", decodable: false, preservable: true, category: "other" },
  "01D0E75D": { label: "Material Definition", decodable: false, preservable: true, category: "other" },
  "01D0E723": { label: "Rig", decodable: false, preservable: true, category: "other" },
  "01D0E70F": { label: "Geometry (GEOM)", decodable: false, preservable: true, category: "other" },
  "02D5DF13": { label: "Animation Clip", decodable: false, preservable: true, category: "other" },
  "D3044521": { label: "Region Map", decodable: false, preservable: true, category: "other" },
  "8FFB80F6": { label: "Blueprint", decodable: false, preservable: true, category: "other" },

  /* Audio */
  "01A527DB": { label: "Audio Reference", decodable: false, preservable: true, category: "audio" },
};

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
