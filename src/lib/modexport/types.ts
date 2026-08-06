/**
 * Mod Export Engine — data contracts.
 *
 * The exporter turns an editable builder project (and/or an imported
 * ModProject) into real Sims 4 files: DBPF .package containers, preserved
 * .ts4script archives, a distributable ZIP, a builder project source file and
 * a machine readable manifest.
 *
 * Nothing in this module simulates an export. Every output is written by a
 * real binary writer and re-opened by the reader before it is offered for
 * download.
 */

import type {
  ComponentRelationship,
  ModDependency,
  ModProject,
  ResourceKey,
} from "@/lib/modimport/types";

export const EXPORTER_VERSION = "6.2.0";
export const PROJECT_FILE_SCHEMA = "ts4builder/1";
export const MANIFEST_SCHEMA = "modmanifest/1";

/* ------------------------------ request ------------------------------ */

export type ExportType =
  | "complete-mod"
  | "package-only"
  | "scripts-only"
  | "changed-components"
  | "project-source"
  | "validation-report";

export type ExportMode = "safe" | "rebuild" | "preserve-original";

export type ConflictPolicy = "block" | "warn" | "auto-fix-safe";

export interface ExportRequest {
  projectId: string;
  exportType: ExportType;
  mode: ExportMode;

  selectedComponentIds?: string[];

  includeOptionalAddons: boolean;
  includeDependencies: boolean;
  includeDocumentation: boolean;
  includeProjectSource: boolean;

  outputName?: string;
  preserveFolderStructure: boolean;
  /** Adds manifest.json to the ZIP. */
  includeManifest?: boolean;
  /** Only export components whose contents changed since the last export. */
  onlyModified?: boolean;
  /** Appends the project version to generated filenames. */
  versionedFileNames?: boolean;
  /**
   * Creator handle prefixed onto generated file and folder names
   * ("NeshaDenise_DancerCareer.package"). Affects file names only — never
   * tuning names, instance ids, or resource keys.
   */
  creatorPrefix?: string;

  conflictPolicy: ConflictPolicy;

  /**
   * Explicit acknowledgement that a package may be written without the SimData
   * companions some resource types require. Off by default: without a working
   * SimData serializer those builder types are non-exportable.
   */
  allowTuningOnly?: boolean;
}

export const DEFAULT_EXPORT_REQUEST: Omit<ExportRequest, "projectId"> = {
  exportType: "complete-mod",
  mode: "safe",
  includeOptionalAddons: true,
  includeDependencies: false,
  includeDocumentation: true,
  includeProjectSource: false,
  preserveFolderStructure: false,
  includeManifest: true,
  onlyModified: false,
  versionedFileNames: true,
  conflictPolicy: "block",
  allowTuningOnly: false,
};

/* ------------------------------ snapshot ----------------------------- */

export type ResourceState =
  | "unchanged"
  | "modified"
  | "created"
  | "deleted"
  | "replaced"
  | "unsupported-preserved"
  | "invalid";

export type ResourceSource =
  | "original-bytes"
  | "builder-model"
  | "generated"
  | "replacement-file";

export interface ExportResourceState {
  resourceId: string;
  resourceKey: ResourceKey;
  state: ResourceState;
  source: ResourceSource;
  originalHash?: string;
  currentHash?: string;
  canRebuild: boolean;
  preserveRawBytes: boolean;
}

export interface ExportResourceSnapshot extends ExportResourceState {
  componentId: string;
  typeLabel: string;
  name?: string;
  /** Bytes exactly as they must sit in the package (already compressed form). */
  raw?: Uint8Array;
  memSize?: number;
  compressionType?: number;
  /** Rebuilt payload produced by a serializer (always uncompressed). */
  payload?: Uint8Array;
  notes?: string;
}

export type ExportComponentKind =
  | "package"
  | "ts4script"
  | "documentation"
  | "configuration"
  | "project-source"
  | "manifest"
  | "asset";

export interface ExportComponentSnapshot {
  id: string;
  fileName: string;
  relativePath?: string;
  kind: ExportComponentKind;
  role: string;
  required: boolean;
  optional?: boolean;
  external?: boolean;
  /** package: resource ids assigned to this component. */
  resourceIds: string[];
  /** ts4script / doc / asset: verbatim bytes. */
  bytes?: Uint8Array;
  /** True when this component must be written byte for byte. */
  preserveOriginalBytes: boolean;
  originalChecksum?: string;
}

export interface ExportSnapshot {
  projectId: string;
  projectName: string;
  projectVersion: string;
  creator?: string;
  description?: string;
  createdAt: string;

  components: ExportComponentSnapshot[];
  resources: ExportResourceSnapshot[];
  relationships: ComponentRelationship[];
  dependencies: ModDependency[];
  settings: ExportRequest;

  /** The imported mod project this snapshot was derived from, when any. */
  importedProject?: ModProject;
  /** Serialisable builder project source (written when requested). */
  projectSource?: unknown;

  parserVersion: string;
  exporterVersion: string;
}

/* ----------------------------- validation ---------------------------- */

export type Severity = "error" | "warning" | "info";

export interface ExportValidationResult {
  id: string;
  severity: Severity;
  code: string;
  message: string;
  componentId?: string;
  resourceId?: string;
  fieldPath?: string;
  canAutoFix: boolean;
  autoFixAction?: string;
}

export interface RoundTripReport {
  preservedResources: number;
  modifiedResources: number;
  addedResources: number;
  removedResources: number;
  unsupportedPreserved: number;
  packageComponents: number;
  scriptComponentsPreserved: number;
  unexpectedLosses: string[];
  hashMismatches: string[];
}

export interface ExportValidationReport {
  results: ExportValidationResult[];
  roundTrip?: RoundTripReport;
  blocked: boolean;
  generatedAt: string;
}

/* -------------------------------- job -------------------------------- */

export type ExportStatus =
  | "queued"
  | "validating"
  | "resolving-resources"
  | "building-packages"
  | "building-scripts"
  | "assembling-files"
  | "verifying"
  | "ready"
  | "failed"
  | "cancelled";

export const EXPORT_STAGE_ORDER: ExportStatus[] = [
  "queued",
  "validating",
  "resolving-resources",
  "building-packages",
  "building-scripts",
  "assembling-files",
  "verifying",
  "ready",
];

export interface ExportWarning {
  code: string;
  message: string;
  componentId?: string;
}

export interface ExportError {
  code: ExportFailureCode | string;
  message: string;
  stage?: ExportStatus;
  componentId?: string;
  resourceId?: string;
}

export type ExportFailureCode =
  | "DUPLICATE_RESOURCE_KEY"
  | "UNSUPPORTED_RESOURCE_MUTATION"
  | "PACKAGE_WRITE_FAILED"
  | "PACKAGE_REOPEN_FAILED"
  | "SIMDATA_SERIALIZATION_FAILED"
  | "SIMDATA_UNSUPPORTED"
  | "SCRIPT_COMPILATION_FAILED"
  | "SCRIPT_ARCHIVE_INVALID"
  | "SCRIPT_SOURCE_UNAVAILABLE"
  | "MISSING_REQUIRED_COMPONENT"
  | "STBL_REFERENCE_MISSING"
  | "UNEXPECTED_RESOURCE_LOSS"
  | "TUNING_SERIALIZATION_FAILED"
  | "INVALID_FILE_NAME"
  | "ZIP_VERIFY_FAILED"
  | "NOTHING_TO_EXPORT"
  | "EXPORT_CANCELLED";

export type ExportedFileKind =
  | "package"
  | "ts4script"
  | "zip"
  | "manifest"
  | "documentation"
  | "project-source"
  | "report";

export interface ExportedFile {
  name: string;
  kind: ExportedFileKind;
  bytes: Uint8Array;
  size: number;
  checksum: string;
  /** True when the bytes are the untouched originals. */
  verbatim: boolean;
  verified: boolean;
  verifyNotes: string[];
}

export interface ExportJob {
  id: string;
  projectId: string;
  request: ExportRequest;
  status: ExportStatus;
  progress: number;
  warnings: ExportWarning[];
  errors: ExportError[];
  outputFiles: ExportedFile[];
  validationReport?: ExportValidationReport;
  logs: ExportLogEntry[];
  createdAt: string;
  completedAt?: string;
}

export interface ExportLogEntry {
  at: string;
  stage: ExportStatus;
  level: "debug" | "info" | "warn" | "error";
  message: string;
}

/* ------------------------------ manifest ----------------------------- */

export interface ExportedModManifest {
  schemaVersion: string;
  mod: {
    name: string;
    creator?: string;
    version?: string;
    description?: string;
  };
  components: {
    fileName: string;
    type: string;
    role: string;
    required: boolean;
    checksum: string;
  }[];
  dependencies: {
    name: string;
    required: boolean;
    version?: string;
    included: boolean;
  }[];
  gameCompatibility?: {
    gameVersion?: string;
    requiredPacks?: string[];
    optionalPacks?: string[];
  };
  builder?: {
    projectId: string;
    exporterVersion: string;
  };
}

/* ------------------------------ history ------------------------------ */

export interface ExportHistoryEntry {
  id: string;
  projectId: string;
  version?: string;
  exportType: string;
  exportMode: string;
  outputFiles: { fileName: string; checksum: string; size: number }[];
  warnings: number;
  errors: number;
  exporterVersion: string;
  createdAt: string;
}
