/**
 * CareerTrack SimData writer.
 *
 * The Sims 4 Mod Constructor 5 has no CareerTrack template file — it writes
 * this resource from scratch, because the row contains the variable-length
 * branch and level lists. This is a direct port of that writer
 * (Constructor5.Elements/CareerTracks/CareerTrack.cs -> BuildSimData), so the
 * emitted bytes match a SimData the game already loads.
 *
 * Layout (all offsets are relative to the field that stores them):
 *   0   header        DATA, version 0x101
 *   32  table info 0  the CareerTrack row (80 bytes)
 *   60  table info 1  the branch + level id list
 *   96  row data      vectors, localisation keys, resource keys
 *   176 id list       branch instances, then level instances
 *   ..  schema        1 schema, 8 columns
 *   ..  string pool   column + schema names
 */

const NULL_OFFSET = -0x80000000;

class Writer {
  private buf = new Uint8Array(1024);
  private len = 0;

  private fit(extra: number) {
    if (this.len + extra <= this.buf.byteLength) return;
    const next = new Uint8Array(Math.max(this.buf.byteLength * 2, this.len + extra));
    next.set(this.buf.subarray(0, this.len));
    this.buf = next;
  }

  private dv() {
    return new DataView(this.buf.buffer, this.buf.byteOffset, this.buf.byteLength);
  }

  i32(value: number) {
    this.fit(4);
    this.dv().setInt32(this.len, value | 0, true);
    this.len += 4;
  }

  u32(value: number) {
    this.fit(4);
    this.dv().setUint32(this.len, value >>> 0, true);
    this.len += 4;
  }

  u64(value: bigint) {
    this.fit(8);
    this.dv().setBigUint64(this.len, value & 0xffffffffffffffffn, true);
    this.len += 8;
  }

  u16(value: number) {
    this.fit(2);
    this.dv().setUint16(this.len, value & 0xffff, true);
    this.len += 2;
  }

  ascii(text: string) {
    this.fit(text.length + 1);
    for (let i = 0; i < text.length; i++) this.buf[this.len++] = text.charCodeAt(i) & 0x7f;
    this.buf[this.len++] = 0;
  }

  bytes(): Uint8Array {
    return this.buf.slice(0, this.len);
  }
}

export interface CareerTrackSimDataInput {
  /** Instance ids (decimal or 0x-hex strings) of the branch tracks. */
  branches?: string[];
  /** Instance ids of the career levels, in order. */
  levels?: string[];
  /** 32-bit localisation key of the track name. */
  nameKey?: number;
  /** 32-bit localisation key of the track description. */
  descriptionKey?: number;
  /** "type:group:instance" resource keys, when the project has artwork. */
  icon?: string;
  iconHighRes?: string;
  image?: string;
}

function toU64(value: string | undefined): bigint {
  if (!value) return 0n;
  const clean = value.trim();
  try {
    return clean.startsWith("0x") || /[a-f]/i.test(clean)
      ? BigInt(clean.startsWith("0x") ? clean : `0x${clean}`)
      : BigInt(clean);
  } catch {
    return 0n;
  }
}

function writeResourceKey(w: Writer, key: string | undefined) {
  if (!key || !key.includes(":")) {
    w.u64(0n);
    w.u32(0);
    w.u32(0);
    return;
  }
  const [typeRaw, groupRaw, instanceRaw] = key.split(":");
  // Mod Constructor 5 remaps the PNG image type onto the thumbnail type.
  const type = (typeRaw ?? "").toUpperCase() === "2F7D0004" ? "00B2D882" : (typeRaw ?? "0");
  w.u64(toU64(instanceRaw));
  w.u32(Number.parseInt(type, 16) >>> 0 || 0);
  w.u32(Number.parseInt(groupRaw ?? "0", 16) >>> 0 || 0);
}

/** Builds a CareerTrack SimData resource for a generated career track. */
export function buildCareerTrackSimData(input: CareerTrackSimDataInput): Uint8Array {
  const branches = (input.branches ?? []).map(toU64);
  const levels = (input.levels ?? []).map(toU64);
  const branchListSize = branches.length * 8;
  const levelListSize = levels.length * 8;

  const out = new Writer();

  /* ------------------------------ header ------------------------------ */
  out.u32(0x41544144); // "DATA" little-endian

  out.i32(0x101); // version
  out.i32(24); // table info offset (relative to this field)
  out.i32(2); // table count
  out.i32(168 + levelListSize + branchListSize); // schema offset
  out.i32(1); // schema count
  out.i32(0);
  out.i32(0);

  /* ---------------------------- table info ---------------------------- */
  // table 0: the CareerTrack row
  out.i32(469 + levelListSize + branchListSize); // name offset
  out.u32(2014394279); // name hash ("Constructor")
  out.i32(144 + levelListSize + branchListSize); // schema offset
  out.i32(13); // OBJECT
  out.i32(80); // row size
  out.i32(44); // row offset
  out.i32(1); // row count

  // table 1: branch + level instance ids
  out.i32(NULL_OFFSET);
  out.u32(2166136261);
  out.i32(NULL_OFFSET);
  out.i32(18); // TABLESETREFERENCE
  out.i32(8);
  out.i32(96);
  out.i32(branches.length + levels.length);

  out.i32(0);
  out.i32(0);

  /* ------------------------------ row data ---------------------------- */
  out.i32(80); // branches vector -> id list
  out.i32(branches.length);
  out.u32(0x77d1d57e); // busy_time_situation_picker_tooltip
  out.u32(input.descriptionKey ?? 0); // career_description
  out.i32(64 + branchListSize); // career_levels vector -> id list
  out.i32(levels.length);
  out.u32(input.nameKey ?? 0); // career_name
  out.i32(0);
  writeResourceKey(out, input.icon);
  writeResourceKey(out, input.iconHighRes);
  // EA's default career track image.
  out.u64(0x6665077284098fa2n);
  out.u32(0xb2d882);
  out.u32(0);

  for (const branch of branches) out.u64(branch);
  for (const level of levels) out.u64(level);
  out.i32(0);
  out.i32(0);

  /* ------------------------------- schema ----------------------------- */
  out.i32(298); // name offset -> "TunableCareerTrack"
  out.u32(999219117);
  out.u32(2590922216);
  out.u32(80); // schema size
  out.i32(8); // column offset
  out.u32(8); // column count

  const column = (nameOffset: number, nameHash: number, dataType: number, offset: number) => {
    out.i32(nameOffset);
    out.u32(nameHash);
    out.u16(dataType);
    out.u16(0);
    out.i32(offset);
    out.i32(NULL_OFFSET);
  };
  column(204, 928197604, 20, 12); // career_description (LOCKEY)
  column(149, 1791709452, 20, 8); // busy_time_situation_picker_tooltip
  column(209, 1856672634, 19, 32); // icon (RESOURCEKEY)
  column(194, 1884253194, 19, 48); // icon_high_res
  column(157, 2152427307, 20, 24); // career_name
  column(168, 2651530348, 19, 64); // image
  column(40, 3513072909, 14, 0); // branches (VECTOR)
  column(83, 3982613787, 14, 16); // career_levels (VECTOR)

  /* ---------------------------- string pool --------------------------- */
  for (const name of [
    "branches",
    "busy_time_situation_picker_tooltip",
    "career_description",
    "career_levels",
    "career_name",
    "icon",
    "icon_high_res",
    "image",
    "TunableCareerTrack",
    "Constructor",
  ])
    out.ascii(name);

  return out.bytes();
}
