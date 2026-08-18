/**
 * SimData (DATA, type 0x545AC67A) reader and in-place value patcher.
 *
 * Layout implemented from the documented v0x100/v0x101 structure:
 * header -> table info array -> schema array (+ inline column arrays) ->
 * row data + string pool. Every offset field stores a value relative to the
 * position of the field itself; 0x80000000 means "none".
 *
 * This module deliberately does NOT synthesise a schema from scratch. EA's
 * exported column set for a tuning class changes between patches, so a
 * hand-built schema is a guess that can crash the game. Instead it reads a
 * real EA/imported SimData, and rewrites fixed-width values in place — the
 * byte length never changes, so no offset in the file needs reflowing.
 */

const MAGIC = "DATA";
const NULL_OFFSET = -0x80000000;

export const DT = {
  BOOL: 0,
  CHAR8: 1,
  INT8: 2,
  UINT8: 3,
  INT16: 4,
  UINT16: 5,
  INT32: 6,
  UINT32: 7,
  INT64: 8,
  UINT64: 9,
  FLOAT: 10,
  STRING8: 11,
  HASHEDSTRING8: 12,
  OBJECT: 13,
  VECTOR: 14,
  FLOAT2: 15,
  FLOAT3: 16,
  FLOAT4: 17,
  TABLESETREFERENCE: 18,
  RESOURCEKEY: 19,
  LOCKEY: 20,
  VARIANT: 21,
} as const;

export interface SimDataColumn {
  name?: string;
  nameHash: number;
  dataType: number;
  /** Byte offset of the field inside a row. */
  offset: number;
}

export interface SimDataSchema {
  position: number;
  name?: string;
  nameHash: number;
  schemaHash: number;
  schemaSize: number;
  columns: SimDataColumn[];
}

export interface SimDataTable {
  name?: string;
  nameHash: number;
  schema?: SimDataSchema;
  dataType: number;
  rowSize: number;
  rowStart: number;
  rowCount: number;
}

export interface SimDataFile {
  version: number;
  tables: SimDataTable[];
  schemas: SimDataSchema[];
}

export function isSimData(bytes: Uint8Array) {
  return (
    bytes.byteLength > 24 &&
    bytes[0] === 0x44 && bytes[1] === 0x41 && bytes[2] === 0x54 && bytes[3] === 0x41
  );
}

function view(bytes: Uint8Array) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function relOffset(dv: DataView, at: number): number | undefined {
  const raw = dv.getInt32(at, true);
  if (raw === NULL_OFFSET) return undefined;
  return at + raw;
}

function cstring(bytes: Uint8Array, start: number): string {
  let end = start;
  while (end < bytes.byteLength && bytes[end] !== 0) end++;
  return new TextDecoder().decode(bytes.subarray(start, end));
}

/** Parses the structure of a SimData resource. Throws on anything malformed. */
export function readSimData(bytes: Uint8Array): SimDataFile {
  if (!isSimData(bytes)) throw new Error(`Not a ${MAGIC} resource.`);
  const dv = view(bytes);
  const version = dv.getUint32(4, true);
  if (version !== 0x100 && version !== 0x101)
    throw new Error(`Unsupported SimData version 0x${version.toString(16)}.`);

  const tablePos = relOffset(dv, 8);
  const tableCount = dv.getInt32(12, true);
  const schemaPos = relOffset(dv, 16);
  const schemaCount = dv.getInt32(20, true);
  if (tablePos === undefined || schemaPos === undefined)
    throw new Error("SimData header has no table or schema section.");

  const schemaCache = new Map<number, SimDataSchema>();
  const readSchema = (pos: number): SimDataSchema => {
    const cached = schemaCache.get(pos);
    if (cached) return cached;
    const nameAt = relOffset(dv, pos);
    const schema: SimDataSchema = {
      position: pos,
      name: nameAt === undefined ? undefined : cstring(bytes, nameAt),
      nameHash: dv.getUint32(pos + 4, true),
      schemaHash: dv.getUint32(pos + 8, true),
      schemaSize: dv.getUint32(pos + 12, true),
      columns: [],
    };
    schemaCache.set(pos, schema);
    const colPos = relOffset(dv, pos + 16);
    const colCount = dv.getUint32(pos + 20, true);
    if (colPos !== undefined) {
      for (let i = 0; i < colCount; i++) {
        const c = colPos + i * 20;
        const cNameAt = relOffset(dv, c);
        schema.columns.push({
          name: cNameAt === undefined ? undefined : cstring(bytes, cNameAt),
          nameHash: dv.getUint32(c + 4, true),
          dataType: dv.getUint16(c + 8, true),
          offset: dv.getUint32(c + 12, true),
        });
      }
    }
    return schema;
  };

  const schemas: SimDataSchema[] = [];
  for (let i = 0; i < schemaCount; i++) schemas.push(readSchema(schemaPos + i * 24));

  const tables: SimDataTable[] = [];
  for (let i = 0; i < tableCount; i++) {
    const t = tablePos + i * 28;
    const nameAt = relOffset(dv, t);
    const sPos = relOffset(dv, t + 8);
    const rowStart = relOffset(dv, t + 20);
    tables.push({
      name: nameAt === undefined ? undefined : cstring(bytes, nameAt),
      nameHash: dv.getUint32(t + 4, true),
      schema: sPos === undefined ? undefined : readSchema(sPos),
      dataType: dv.getUint32(t + 12, true),
      rowSize: dv.getUint32(t + 16, true),
      rowStart: rowStart ?? 0,
      rowCount: dv.getUint32(t + 24, true),
    });
  }

  return { version, tables, schemas };
}

export interface SimDataPatch {
  /** Column name as it appears in the schema, e.g. "display_name". */
  column: string;
  /** Localisation key (32-bit) for LOCKEY columns. */
  lockey?: number;
  /** Numeric value for integer / float columns. */
  number?: number;
  /** Value for 64-bit columns (instance ids, table set references). */
  big?: bigint;
  /** Boolean value for BOOL columns. */
  flag?: boolean;
}

export interface SimDataPatchReport {
  applied: { column: string; table: string; row: number }[];
  skipped: { column: string; reason: string }[];
}

/**
 * Rewrites fixed-width fields in an existing SimData by column name.
 * Returns a new byte array; the input is never mutated and the size is
 * unchanged, so all internal offsets stay valid.
 */
export function patchSimData(bytes: Uint8Array, patches: SimDataPatch[]): {
  bytes: Uint8Array;
  report: SimDataPatchReport;
} {
  const copy = new Uint8Array(bytes.slice());
  const parsed = readSimData(copy);
  const dv = view(copy);
  const report: SimDataPatchReport = { applied: [], skipped: [] };

  for (const patch of patches) {
    let hit = false;
    for (const table of parsed.tables) {
      const column = table.schema?.columns.find(
        (c) => c.name?.toLowerCase() === patch.column.toLowerCase(),
      );
      if (!column) continue;
      for (let row = 0; row < table.rowCount; row++) {
        const at = table.rowStart + row * table.rowSize + column.offset;
        if (at + 8 > copy.byteLength && column.dataType !== DT.BOOL) continue;
        if (!writeField(dv, at, column.dataType, patch)) continue;
        hit = true;
        report.applied.push({ column: patch.column, table: table.name ?? "<root>", row });
      }
    }
    if (!hit) report.skipped.push({ column: patch.column, reason: "column not present in this SimData" });
  }

  return { bytes: copy, report };
}

function writeField(dv: DataView, at: number, dataType: number, patch: SimDataPatch): boolean {
  switch (dataType) {
    case DT.LOCKEY:
      if (patch.lockey === undefined) return false;
      dv.setUint32(at, patch.lockey >>> 0, true);
      return true;
    case DT.UINT32:
    case DT.INT32:
      if (patch.number === undefined) return false;
      dv.setUint32(at, patch.number >>> 0, true);
      return true;
    case DT.UINT16:
    case DT.INT16:
      if (patch.number === undefined) return false;
      dv.setUint16(at, patch.number & 0xffff, true);
      return true;
    case DT.UINT8:
    case DT.INT8:
      if (patch.number === undefined) return false;
      dv.setUint8(at, patch.number & 0xff);
      return true;
    case DT.FLOAT:
      if (patch.number === undefined) return false;
      dv.setFloat32(at, patch.number, true);
      return true;
    case DT.BOOL:
      if (patch.flag === undefined) return false;
      dv.setUint8(at, patch.flag ? 1 : 0);
      return true;
    case DT.UINT64:
    case DT.INT64:
    case DT.TABLESETREFERENCE:
      if (patch.big === undefined) return false;
      dv.setBigUint64(at, patch.big & 0xffffffffffffffffn, true);
      return true;
    default:
      return false;
  }
}

/** Human-readable summary used by the export log. */
export function describeSimData(file: SimDataFile) {
  const columns = file.schemas.flatMap((s) => s.columns.map((c) => c.name).filter(Boolean));
  return `v0x${file.version.toString(16)}, ${file.tables.length} table(s), ${file.schemas.length} schema(s), columns: ${columns.slice(0, 12).join(", ")}${columns.length > 12 ? "…" : ""}`;
}
