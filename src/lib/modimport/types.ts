/**
 * Unified Mod Project — data contracts for the Sims 4 mod importer.
 *
 * A ModProject is the top level imported object: it represents a complete mod
 * that may be distributed as several companion files (.package + .ts4script +
 * docs + config). Individual files are ModComponents.
 *
 * Three layers are always kept apart:
 *   1. original uploaded bytes   (ComponentBytes registry, never mutated)
 *   2. parsed intermediate repr  (ParsedPackage / ParsedScript)
 *   3. editable builder model    (mutations recorded, applied at export time)
 */

export type FileType =
  | "package"
  | "ts4script"
  | "xml"
  | "json"
  | "image"
  | "text"
  | "config"
  | "archive"
  | "unknown";

export type ComponentRole =
  | "tuning"
  | "script"
  | "localization"
  | "assets"
  | "configuration"
  | "documentation"
  | "dependency"
  | "unknown";

export type ParseStatus =
  | "pending"
  | "parsed"
  | "partially-parsed"
  | "unsupported"
  | "corrupt"
  | "blocked";

export type Confidence = "confirmed" | "high" | "medium" | "low" | "conflict";

export interface ResourceKey {
  /** 8 hex digits, no 0x prefix. */
  type: string;
  /** 8 hex digits. */
  group: string;
  /** 16 hex digits — kept as a string so 64-bit precision is never lost. */
  instance: string;
}

export type ResourceEditability =
  | "editable"
  | "partially-editable"
  | "read-only"
  | "preserved-unsupported"
  | "corrupt";

export interface ImportedResource {
  id: string;
  componentId: string;
  key: ResourceKey;
  /** Human label for the TGI type, e.g. "XML Tuning". */
  typeLabel: string;
  /** Detected tuning class / STBL locale / etc. */
  subtype?: string;
  name?: string;
  byteSize: number;
  /** Size after decompression when known. */
  memSize?: number;
  compression: "none" | "zlib" | "internal" | "unknown";
  editability: ResourceEditability;
  /** Index into the original package so export can copy bytes verbatim. */
  originalIndex: number;
  /** Decoded text for tuning/STBL previews. Absent for binary resources. */
  text?: string;
  /** Parsed STBL entries (hash -> value). */
  strings?: { key: string; value: string }[];
  notes?: string;
  /** Set when the user edited this resource — export re-encodes only these. */
  dirty?: boolean;
}

export interface ScriptModule {
  path: string;
  kind: "py" | "pyc" | "manifest" | "config" | "asset";
  byteSize: number;
  /** Dotted module namespace derived from the archive path. */
  namespace?: string;
  /** For .pyc: detected bytecode magic / python version when recognised. */
  bytecodeVersion?: string;
  /** Imports found by static parsing of .py sources. Never executed. */
  imports?: string[];
  compiled: boolean;
}

export interface ModComponent {
  id: string;
  projectId: string;

  originalFileName: string;
  normalizedFileName: string;
  relativePath?: string;

  fileType: FileType;
  role: ComponentRole;

  byteSize: number;
  /** SHA-256 hex of the original bytes. */
  checksum: string;

  parseStatus: ParseStatus;
  isEditable: boolean;
  preserveOriginalBytes: boolean;

  /** package only */
  resources?: ImportedResource[];
  /** ts4script only */
  modules?: ScriptModule[];
  /** Namespaces declared by the script archive. */
  namespaces?: string[];
  parseError?: string;
  /** Marked by the grouping engine / user as an external library, not owned. */
  external?: boolean;
  optional?: boolean;
}

export interface ModDependency {
  id: string;
  name: string;
  detectedFrom:
    | "manifest"
    | "script-import"
    | "tuning-reference"
    | "documentation"
    | "filename"
    | "user";
  required: boolean;
  confidence: "high" | "medium" | "low";
  installedComponentId?: string;
  notes?: string;
}

export interface ComponentRelationship {
  id: string;
  sourceComponentId: string;
  sourceResourceKey?: ResourceKey;
  targetComponentId?: string;
  targetResourceKey?: ResourceKey;
  relationshipType:
    | "companion-file"
    | "script-handler"
    | "tuning-reference"
    | "localization-reference"
    | "simdata-companion"
    | "image-reference"
    | "dependency"
    | "optional-addon"
    | "override"
    | "unknown";
  confidence: Exclude<Confidence, "conflict">;
  evidence: string[];
}

export type WarningLevel = "info" | "warning" | "error";

export interface ImportWarning {
  id: string;
  level: WarningLevel;
  code: string;
  message: string;
  componentId?: string;
  detail?: string;
}

export interface ValidationResult {
  id: string;
  level: WarningLevel;
  code: string;
  message: string;
  componentId?: string;
  suggestion?: string;
}

export interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
  files: string[];
}

export interface ResourceMutation {
  resourceId: string;
  fieldPath?: string;
  previousValue?: unknown;
  newValue?: unknown;
  mutationType: "edit" | "create" | "delete" | "replace" | "relink";
  timestamp: string;
}

export type ImportStatus =
  | "uploading"
  | "analyzing"
  | "needs-review"
  | "ready"
  | "partially-supported"
  | "failed";

export interface ModProject {
  id: string;
  name: string;
  creator?: string;
  version?: string;
  description?: string;

  components: ModComponent[];
  resources: ImportedResource[];
  dependencies: ModDependency[];
  relationships: ComponentRelationship[];

  importWarnings: ImportWarning[];
  validationResults: ValidationResult[];

  originalUploadName?: string;
  originalFolderStructure?: FolderNode[];

  importStatus: ImportStatus;

  /** Grouping confidence + the reasons that produced it. */
  confidence: Confidence;
  groupingReasons: string[];

  mutations: ResourceMutation[];
  /** Bumped whenever the parsers change so projects can be re-analysed. */
  parserVersion: string;
  importedAt: number;
}

/** One upload action. Every file lands here before any project is created. */
export interface ImportSession {
  id: string;
  createdAt: number;
  uploadName?: string;
  stage: ImportStage;
  stageIndex: number;
  files: SessionFile[];
  projects: ModProject[];
  logs: ImportLogEntry[];
  warnings: ImportWarning[];
  done: boolean;
}

export interface SessionFile {
  id: string;
  /** Path relative to the upload root (folder / zip aware). */
  relativePath: string;
  fileName: string;
  byteSize: number;
  checksum: string;
  fileType: FileType;
  /** Set when the file came out of an uploaded archive. */
  fromArchive?: string;
  /** Assigned project id after grouping. */
  projectId?: string;
  skipped?: boolean;
  skipReason?: string;
}

export interface ImportLogEntry {
  at: number;
  level: "debug" | "info" | "warn" | "error";
  stage: ImportStage;
  message: string;
  detail?: string;
}

export const IMPORT_STAGES = [
  "Uploading files",
  "Verifying file types",
  "Extracting archive",
  "Reading package indexes",
  "Reading script archives",
  "Parsing supported resources",
  "Building reference graph",
  "Detecting dependencies",
  "Grouping mod components",
  "Validating project",
  "Awaiting review",
  "Import complete",
] as const;

export type ImportStage = (typeof IMPORT_STAGES)[number];

export const PARSER_VERSION = "6.1.0";

/** Hard limits — untrusted input. */
export const LIMITS = {
  maxFileBytes: 512 * 1024 * 1024,
  maxTotalBytes: 1024 * 1024 * 1024,
  maxArchiveEntries: 20000,
  maxDecompressedBytes: 2 * 1024 * 1024 * 1024,
  maxNestedArchiveDepth: 2,
  maxResourcesPerPackage: 200000,
  parseTimeoutMs: 60000,
};
