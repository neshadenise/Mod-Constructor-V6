/**
 * Import orchestrator.
 *
 * One upload action = one ImportSession. Every submitted file is collected and
 * analysed as a batch *before* any mod project is created, so companion files
 * are recognised instead of becoming separate imports.
 *
 * This module is a plain service (no React) so it can also run inside a worker.
 */

import { checksum, looksLikeText, utf8 } from "./binary";
import { compressionLabel, isDbpf, readDbpf, readDbpfResource } from "./dbpf";
import {
  dependencyFromImport,
  dependencyFromLibrary,
  matchLibraryByFileName,
  GAME_MODULES,
} from "./dependencies";
import { groupCandidates, type GroupCandidate } from "./grouping";
import { isStbl, parseStbl, resourceTypeInfo } from "./resource-types";
import { isXmlText, parseTuning, type ParsedTuning } from "./tuning";
import { parseScriptArchive } from "./ts4script";
import {
  IMPORT_STAGES,
  LIMITS,
  PARSER_VERSION,
  type ComponentRelationship,
  type FileType,
  type FolderNode,
  type ImportLogEntry,
  type ImportSession,
  type ImportStage,
  type ImportWarning,
  type ImportedResource,
  type ModComponent,
  type ModDependency,
  type ModProject,
  type ResourceKey,
  type SessionFile,
  type ValidationResult,
} from "./types";
import { isZip, readZipEntry, readZipIndex } from "./zip";

export interface UploadInput {
  name: string;
  relativePath: string;
  bytes: Uint8Array;
}

export interface AnalyzeResult {
  session: ImportSession;
  /** componentId -> original uploaded bytes (never mutated). */
  bytes: Map<string, Uint8Array>;
}

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

function detectFileType(name: string, bytes: Uint8Array): FileType {
  const lower = name.toLowerCase();
  if (isDbpf(bytes)) return "package";
  if (isZip(bytes)) return lower.endsWith(".ts4script") ? "ts4script" : "archive";
  if (/\.(png|jpe?g|webp|gif|dds|bmp)$/.test(lower)) return "image";
  const text = looksLikeText(bytes) ? utf8(bytes.subarray(0, 4096)) : "";
  if (text && isXmlText(text)) return "xml";
  if (text && /^\s*[[{]/.test(text)) return "json";
  if (/\.(cfg|ini|toml|yaml|yml)$/.test(lower)) return "config";
  if (text) return "text";
  return "unknown";
}

function roleFor(type: FileType, name: string): ModComponent["role"] {
  const lower = name.toLowerCase();
  if (type === "package") return "tuning";
  if (type === "ts4script") return "script";
  if (type === "xml") return "tuning";
  if (type === "image") return "assets";
  if (type === "config" || type === "json") return "configuration";
  if (/readme|install|licen[cs]e|changelog|\.md$|\.txt$/.test(lower)) return "documentation";
  return "unknown";
}

const folderOf = (relativePath: string) => relativePath.split("/").slice(0, -1).join("/");

function buildFolderTree(paths: string[]): FolderNode[] {
  const root: FolderNode = { name: "", path: "", children: [], files: [] };
  for (const p of paths) {
    const parts = p.split("/").filter(Boolean);
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const name = parts[i]!;
      let child = node.children.find((c) => c.name === name);
      if (!child) {
        child = { name, path: [node.path, name].filter(Boolean).join("/"), children: [], files: [] };
        node.children.push(child);
      }
      node = child;
    }
    node.files.push(parts[parts.length - 1] ?? p);
  }
  return root.children.length || root.files.length ? [root] : [];
}

interface Analyzed {
  file: SessionFile;
  bytes: Uint8Array;
  component: ModComponent;
  candidate: GroupCandidate;
  tunings: { resourceId: string; parsed: ParsedTuning }[];
  stblKeys: Set<string>;
  simdataInstances: Set<string>;
  scriptImports: string[];
  classNames: string[];
  manifest?: Record<string, string>;
}

/** Flattens uploads, expanding ZIP archives (depth limited, path sanitised). */
async function expand(
  inputs: UploadInput[],
  log: (level: ImportLogEntry["level"], stage: ImportStage, message: string, detail?: string) => void,
  warn: (w: Omit<ImportWarning, "id">) => void,
): Promise<UploadInput[]> {
  const out: UploadInput[] = [];
  const queue = inputs.map((i) => ({ input: i, depth: 0, archive: undefined as string | undefined }));
  let total = 0;

  while (queue.length) {
    const { input, depth, archive } = queue.shift()!;
    total += input.bytes.byteLength;
    if (total > LIMITS.maxTotalBytes) {
      warn({ level: "error", code: "upload-too-large", message: "Upload exceeds the total size limit — remaining files were skipped." });
      break;
    }
    const lower = input.name.toLowerCase();
    const treatAsArchive = isZip(input.bytes) && !lower.endsWith(".ts4script");
    if (!treatAsArchive) {
      out.push(archive ? { ...input, relativePath: input.relativePath } : input);
      continue;
    }
    if (depth >= LIMITS.maxNestedArchiveDepth) {
      warn({
        level: "warning",
        code: "nested-archive",
        message: `Nested archive "${input.name}" was kept as a file instead of being expanded (depth limit ${LIMITS.maxNestedArchiveDepth}).`,
      });
      out.push(input);
      continue;
    }
    try {
      const { entries, warnings } = readZipIndex(input.bytes);
      warnings.forEach((message) =>
        warn({ level: "warning", code: "archive", message, detail: input.name }),
      );
      log("info", "Extracting archive", `Extracting ${input.name}`, `${entries.length} entries`);
      for (const entry of entries) {
        if (entry.directory || entry.encrypted || !entry.safeName) continue;
        if (/(^|\/)(__macosx|\.ds_store|thumbs\.db)/i.test(entry.safeName)) continue;
        try {
          const bytes = await readZipEntry(input.bytes, entry);
          queue.push({
            input: {
              name: entry.safeName.split("/").pop()!,
              relativePath: `${input.name.replace(/\.zip$/i, "")}/${entry.safeName}`,
              bytes,
            },
            depth: depth + 1,
            archive: input.name,
          });
        } catch (e) {
          warn({
            level: "warning",
            code: "archive-entry",
            message: `Could not read "${entry.safeName}" from ${input.name}`,
            detail: (e as Error).message,
          });
        }
      }
    } catch (e) {
      warn({
        level: "error",
        code: "corrupt-archive",
        message: `${input.name} could not be opened as a ZIP archive`,
        detail: (e as Error).message,
      });
      out.push(input);
    }
  }
  return out;
}

export async function analyzeUpload(
  inputs: UploadInput[],
  onProgress?: (stage: ImportStage, index: number, session: ImportSession) => void,
): Promise<AnalyzeResult> {
  const startedAt = Date.now();
  const session: ImportSession = {
    id: uid("session"),
    createdAt: startedAt,
    ...(inputs.length === 1 ? { uploadName: inputs[0]!.name } : {}),
    stage: "Uploading files",
    stageIndex: 0,
    files: [],
    projects: [],
    logs: [],
    warnings: [],
    done: false,
  };
  const bytesById = new Map<string, Uint8Array>();

  const log = (level: ImportLogEntry["level"], stage: ImportStage, message: string, detail?: string) =>
    session.logs.push({ at: Date.now(), level, stage, message, ...(detail ? { detail } : {}) });
  const warn = (w: Omit<ImportWarning, "id">) => session.warnings.push({ id: uid("warn"), ...w });
  const stage = (s: ImportStage) => {
    session.stage = s;
    session.stageIndex = IMPORT_STAGES.indexOf(s);
    log("info", s, s);
    onProgress?.(s, session.stageIndex, session);
  };

  stage("Uploading files");
  stage("Verifying file types");
  const oversize = inputs.filter((i) => i.bytes.byteLength > LIMITS.maxFileBytes);
  oversize.forEach((i) =>
    warn({ level: "error", code: "file-too-large", message: `${i.name} exceeds the per-file size limit and was skipped.` }),
  );
  const accepted = inputs.filter((i) => i.bytes.byteLength <= LIMITS.maxFileBytes);

  stage("Extracting archive");
  const flat = await expand(accepted, log, warn);

  const analyzed: Analyzed[] = [];

  stage("Reading package indexes");
  for (const input of flat) {
    const fileType = detectFileType(input.name, input.bytes);
    const sum = await checksum(input.bytes);
    const componentId = uid("component");
    const extension = input.name.toLowerCase().split(".").pop() ?? "";
    const declared: FileType | undefined =
      extension === "package" ? "package" : extension === "ts4script" ? "ts4script" : undefined;
    if (declared && declared !== fileType) {
      warn({
        level: "warning",
        code: "type-mismatch",
        message: `${input.name} is named .${extension} but its contents are ${fileType}.`,
        componentId,
      });
    }

    const file: SessionFile = {
      id: uid("file"),
      relativePath: input.relativePath,
      fileName: input.name,
      byteSize: input.bytes.byteLength,
      checksum: sum,
      fileType,
      ...(input.relativePath.includes("/") ? { fromArchive: input.relativePath.split("/")[0]! } : {}),
    };
    session.files.push(file);

    const component: ModComponent = {
      id: componentId,
      projectId: "",
      originalFileName: input.name,
      normalizedFileName: input.name.replace(/[^A-Za-z0-9._-]+/g, "_"),
      relativePath: input.relativePath,
      fileType,
      role: roleFor(fileType, input.name),
      byteSize: input.bytes.byteLength,
      checksum: sum,
      parseStatus: "pending",
      isEditable: false,
      preserveOriginalBytes: true,
    };
    bytesById.set(componentId, input.bytes);

    const entry: Analyzed = {
      file,
      bytes: input.bytes,
      component,
      candidate: {
        id: componentId,
        fileName: input.name,
        relativePath: input.relativePath,
        folder: folderOf(input.relativePath),
        fileType,
        checksum: sum,
        ...(file.fromArchive ? { fromArchive: file.fromArchive } : {}),
      },
      tunings: [],
      stblKeys: new Set(),
      simdataInstances: new Set(),
      scriptImports: [],
      classNames: [],
    };
    analyzed.push(entry);

    if (fileType === "package") {
      try {
        const pkg = readDbpf(input.bytes);
        component.resources = pkg.entries.map((e) => {
          const info = resourceTypeInfo(e.key.type);
          const compression = compressionLabel(e.compressionType);
          return {
            id: uid("res"),
            componentId,
            key: e.key,
            typeLabel: info.label,
            byteSize: e.size,
            memSize: e.memSize,
            compression,
            editability:
              info.decodable && compression !== "internal" && compression !== "unknown"
                ? "editable"
                : info.preservable
                  ? "read-only"
                  : "preserved-unsupported",

            originalIndex: e.index,
          } satisfies ImportedResource;
        });
        component.parseStatus = "parsed";
        component.isEditable = component.resources.some((r) => r.editability === "editable");
        log("info", "Reading package indexes", `${input.name}: ${pkg.entries.length} resources`);
      } catch (e) {
        component.parseStatus = "corrupt";
        component.parseError = (e as Error).message;
        warn({
          level: "error",
          code: "corrupt-package",
          message: `${input.name} could not be read as a DBPF package`,
          detail: (e as Error).message,
          componentId,
        });
      }
    }
  }

  stage("Reading script archives");
  for (const a of analyzed) {
    if (a.component.fileType !== "ts4script") continue;
    try {
      const parsed = await parseScriptArchive(a.bytes);
      a.component.modules = parsed.modules;
      a.component.namespaces = parsed.namespaces;
      a.component.parseStatus = parsed.compiledOnly ? "partially-parsed" : "parsed";
      a.component.isEditable = false;
      a.candidate.namespaces = parsed.namespaces;
      a.scriptImports = parsed.imports;
      a.classNames = parsed.classNames;
      if (parsed.manifest) {
        a.manifest = parsed.manifest;
        const name = parsed.manifest["name"] ?? parsed.manifest["mod"];
        if (name) a.candidate.manifestName = name;
        const creator = parsed.manifest["creator"] ?? parsed.manifest["author"];
        if (creator) a.candidate.creatorHint = creator.toLowerCase();
        const version = parsed.manifest["version"];
        if (version) a.candidate.version = version;
      }
      parsed.warnings.forEach((message) =>
        warn({ level: "warning", code: "script", message, componentId: a.component.id }),
      );
      if (parsed.compiledOnly)
        warn({
          level: "info",
          code: "compiled-only",
          message: `${a.component.originalFileName} contains compiled bytecode only — modules can be inspected as metadata, not edited.`,
          componentId: a.component.id,
        });
      log("info", "Reading script archives", `${a.component.originalFileName}: ${parsed.modules.length} modules`);
    } catch (e) {
      a.component.parseStatus = "corrupt";
      a.component.parseError = (e as Error).message;
      warn({
        level: "error",
        code: "corrupt-script",
        message: `${a.component.originalFileName} could not be opened as a script archive`,
        detail: (e as Error).message,
        componentId: a.component.id,
      });
    }
  }

  stage("Parsing supported resources");
  const SNIFF_LIMIT = 8 * 1024 * 1024;
  for (const a of analyzed) {
    if (!a.component.resources?.length) continue;
    const pkg = readDbpf(a.bytes);
    for (const resource of a.component.resources) {
      const entry = pkg.entries[resource.originalIndex];
      if (!entry) continue;
      const info = resourceTypeInfo(resource.key.type);
      const known = isKnownResourceType(resource.key.type);

      // Very large recognised binaries are labelled from the type table only;
      // decompressing them buys nothing because they are preserved anyway.
      if (known && !info.decodable && resource.memSize && resource.memSize > SNIFF_LIMIT) {
        resource.editability = "read-only";
        resource.subtype ??= info.category;
        resource.name ??= `${info.label} · ${resource.key.instance}`;
        resource.notes ??= "Recognised binary format — copied through unchanged on export.";
        continue;
      }

      try {
        const payload = await readDbpfResource(entry);
        const format = sniffFormat(payload);

        if (format === "stbl" && isStbl(payload)) {
          const strings = parseStbl(payload);
          resource.strings = strings;
          resource.editability = "editable";
          resource.subtype = "String table";
          resource.name = `${strings.length} strings`;
          strings.forEach((s) => a.stblKeys.add(s.key));
        } else if (format === "xml" && isXmlText(utf8(payload.subarray(0, 256)))) {
          const text = utf8(payload);
          const parsed = parseTuning(text);
          resource.text = text;
          resource.editability = "editable";
          resource.subtype = parsed.instanceType ?? "tuning";
          resource.name = parsed.name ?? resource.key.instance;
          if (!known) resource.notes = "XML detected from the payload — editable here.";
          a.tunings.push({ resourceId: resource.id, parsed });
          if (parsed.modulePath)
            a.candidate.tuningModules = [...new Set([...(a.candidate.tuningModules ?? []), parsed.modulePath])];
          for (const ref of parsed.references)
            if (ref.kind === "module")
              a.candidate.tuningModules = [...new Set([...(a.candidate.tuningModules ?? []), ref.value])];
        } else if (format === "text" && looksLikeText(payload)) {
          resource.text = utf8(payload);
          resource.editability = "editable";
          resource.subtype = "text";
          resource.name ??= `${info.label} · ${resource.key.instance}`;
        } else if (format === "binary" && !known) {
          // Genuinely unidentifiable payload under an unknown type id.
          resource.editability = "preserved-unsupported";
          resource.subtype ??= "binary";
          resource.name ??= `${info.label} · ${resource.key.instance}`;
          resource.notes = "Unidentified binary payload — copied through unchanged on export.";
        } else {
          resource.editability = "read-only";
          resource.subtype ??= known ? info.category : format;
          resource.name ??= known
            ? `${info.label} · ${resource.key.instance}`
            : `${sniffedFormatLabel(format)} · ${resource.key.instance}`;
          resource.notes ??= known
            ? "Recognised binary format — copied through unchanged on export."
            : `${sniffedFormatLabel(format)} detected from the payload — preserved byte-for-byte on export.`;
        }
      } catch (e) {
        // A payload we cannot even decompress is still exported verbatim.
        resource.editability = known && info.preservable ? "read-only" : "preserved-unsupported";
        resource.subtype ??= info.category;
        resource.name ??= `${info.label} · ${resource.key.instance}`;
        resource.notes = `Preserved unchanged: ${(e as Error).message}`;
      }
      if (info.category === "simdata") a.simdataInstances.add(resource.key.instance);
    }
    for (const r of a.component.resources)
      if (resourceTypeInfo(r.key.type).category === "simdata") a.simdataInstances.add(r.key.instance);
    a.component.isEditable = a.component.resources.some((r) => r.editability === "editable");
    // A package is fully handled when every resource is either editable or a
    // recognised binary we round-trip byte-for-byte. Only genuinely unknown
    // formats leave it partially parsed.
    a.component.parseStatus = a.component.resources.some((r) => r.editability === "preserved-unsupported")
      ? "partially-parsed"
      : "parsed";


  }

  stage("Grouping mod components");
  const groups = groupCandidates(analyzed.map((a) => a.candidate));
  const byId = new Map(analyzed.map((a) => [a.component.id, a]));

  const projects: ModProject[] = groups.map((group) => {
    const members = group.members.map((m) => byId.get(m.id)!).filter(Boolean);
    const projectId = uid("modproject");
    members.forEach((m) => {
      m.component.projectId = projectId;
      m.file.projectId = projectId;
    });
    const manifest = members.find((m) => m.manifest)?.manifest;
    return {
      id: projectId,
      name: group.name,
      ...(manifest?.["creator"] ?? manifest?.["author"]
        ? { creator: manifest?.["creator"] ?? manifest?.["author"] }
        : {}),
      ...(manifest?.["version"] ? { version: manifest["version"] } : {}),
      ...(manifest?.["description"] ? { description: manifest["description"] } : {}),
      components: members.map((m) => m.component),
      resources: members.flatMap((m) => m.component.resources ?? []),
      dependencies: [],
      relationships: [],
      importWarnings: session.warnings.filter((w) =>
        members.some((m) => m.component.id === w.componentId),
      ),
      validationResults: [],
      ...(session.uploadName ? { originalUploadName: session.uploadName } : {}),
      originalFolderStructure: buildFolderTree(members.map((m) => m.component.relativePath ?? m.component.originalFileName)),
      importStatus: "analyzing",
      confidence: group.confidence,
      groupingReasons: group.reasons,
      mutations: [],
      parserVersion: PARSER_VERSION,
      importedAt: Date.now(),
    } satisfies ModProject;
  });

  stage("Detecting dependencies");
  for (const project of projects) {
    const deps = new Map<string, ModDependency>();
    for (const component of project.components) {
      const a = byId.get(component.id)!;
      const lib = matchLibraryByFileName(component.originalFileName);
      if (lib) {
        component.external = true;
        component.role = "dependency";
        component.isEditable = false;
        deps.set(lib.name, dependencyFromLibrary(lib, "filename", "high", component.id));
      }
      for (const imported of a.scriptImports) {
        const dep = dependencyFromImport(imported);
        if (dep && !deps.has(dep.name)) deps.set(dep.name, dep);
      }
      for (const t of a.tunings) {
        for (const ref of t.parsed.references) {
          if (ref.kind !== "module") continue;
          const owned = project.components.some((c) =>
            (c.namespaces ?? []).includes(ref.value.split(".")[0]!),
          );
          if (owned) continue;
          const dep = dependencyFromImport(ref.value);
          if (dep && !deps.has(dep.name)) deps.set(dep.name, { ...dep, detectedFrom: "tuning-reference" });
        }
      }
    }
    // A library that is only referenced (not uploaded) stays a dependency; a
    // library that WAS uploaded is kept out of the owned component list too.
    project.dependencies = [...deps.values()];
  }

  stage("Building reference graph");
  for (const project of projects) {
    const rels: ComponentRelationship[] = [];
    const packages = project.components.filter((c) => c.fileType === "package" && !c.external);
    const scripts = project.components.filter((c) => c.fileType === "ts4script" && !c.external);
    const keyOf = (k: ResourceKey) => `${k.type}:${k.group}:${k.instance}`;
    const resourceIndex = new Map(project.resources.map((r) => [keyOf(r.key), r]));
    const instanceIndex = new Map(project.resources.map((r) => [BigInt(`0x${r.key.instance}`).toString(), r]));
    const stblKeys = new Set(project.resources.flatMap((r) => (r.strings ?? []).map((s) => s.key)));

    for (const pkg of packages) {
      for (const script of scripts) {
        const evidence: string[] = [];
        const a = byId.get(pkg.id)!;
        const b = byId.get(script.id)!;
        const ns = new Set(b.component.namespaces ?? []);
        const modules = a.candidate.tuningModules ?? [];
        const hit = modules.filter((m) => ns.has(m.split(".")[0]!));
        if (hit.length) evidence.push(`Tuning references script modules: ${hit.slice(0, 3).join(", ")}`);
        if (a.candidate.folder && a.candidate.folder === b.candidate.folder)
          evidence.push("Distributed in the same folder");
        if (a.candidate.fromArchive && a.candidate.fromArchive === b.candidate.fromArchive)
          evidence.push("Shipped in the same archive");
        rels.push({
          id: uid("rel"),
          sourceComponentId: pkg.id,
          targetComponentId: script.id,
          relationshipType: hit.length ? "script-handler" : "companion-file",
          confidence: hit.length ? "confirmed" : evidence.length ? "high" : "medium",
          evidence: evidence.length ? evidence : ["Grouped as companion files during import"],
        });
      }
    }

    for (const component of project.components) {
      const a = byId.get(component.id);
      if (!a) continue;
      for (const { resourceId, parsed } of a.tunings) {
        const source = project.resources.find((r) => r.id === resourceId);
        if (!source) continue;
        for (const ref of parsed.references) {
          if (ref.kind === "stbl") {
            if (stblKeys.has(ref.value)) {
              rels.push({
                id: uid("rel"),
                sourceComponentId: component.id,
                sourceResourceKey: source.key,
                relationshipType: "localization-reference",
                confidence: "confirmed",
                evidence: [`STBL key 0x${ref.value} resolved in this project`],
              });
            }
            continue;
          }
          if (ref.kind === "module" || ref.kind === "class" || ref.kind === "instance") continue;
          const target = instanceIndex.get(ref.value);
          if (target) {
            rels.push({
              id: uid("rel"),
              sourceComponentId: component.id,
              sourceResourceKey: source.key,
              targetComponentId: target.componentId,
              targetResourceKey: target.key,
              relationshipType: "tuning-reference",
              confidence: "confirmed",
              evidence: [`${ref.via || ref.kind} -> instance ${ref.value}`],
            });
          }
        }
        // SimData companions share the instance id with their tuning.
        const simdata = project.resources.find(
          (r) =>
            resourceTypeInfo(r.key.type).category === "simdata" && r.key.instance === source.key.instance,
        );
        if (simdata)
          rels.push({
            id: uid("rel"),
            sourceComponentId: component.id,
            sourceResourceKey: source.key,
            targetComponentId: simdata.componentId,
            targetResourceKey: simdata.key,
            relationshipType: "simdata-companion",
            confidence: "confirmed",
            evidence: ["SimData shares the tuning instance id"],
          });
      }
    }
    for (const dep of project.dependencies)
      rels.push({
        id: uid("rel"),
        sourceComponentId: project.components[0]?.id ?? project.id,
        ...(dep.installedComponentId ? { targetComponentId: dep.installedComponentId } : {}),
        relationshipType: "dependency",
        confidence: dep.confidence === "high" ? "high" : dep.confidence === "medium" ? "medium" : "low",
        evidence: [`Detected from ${dep.detectedFrom}: ${dep.name}`],
      });
    project.relationships = rels;
    void resourceIndex;
  }

  stage("Validating project");
  for (const project of projects) {
    const results: ValidationResult[] = [];
    const add = (r: Omit<ValidationResult, "id">) => results.push({ id: uid("val"), ...r });
    const seen = new Map<string, string>();
    for (const r of project.resources) {
      const k = `${r.key.type}:${r.key.group}:${r.key.instance}`;
      const prev = seen.get(k);
      if (prev && prev !== r.componentId)
        add({
          level: "warning",
          code: "duplicate-resource-key",
          message: `Duplicate resource key ${k} appears in more than one package.`,
          componentId: r.componentId,
          suggestion: "Confirm whether one package is an override of the other before exporting.",
        });
      else if (prev)
        add({
          level: "warning",
          code: "duplicate-resource-key",
          message: `Duplicate resource key ${k} inside the same package.`,
          componentId: r.componentId,
        });
      seen.set(k, r.componentId);
    }
    const modulePaths = new Set<string>();
    for (const c of project.components)
      for (const m of c.modules ?? []) {
        if (modulePaths.has(m.path))
          add({
            level: "warning",
            code: "duplicate-module",
            message: `Duplicate script module path "${m.path}".`,
            componentId: c.id,
          });
        modulePaths.add(m.path);
      }

    const hasPackage = project.components.some((c) => c.fileType === "package" && !c.external);
    const hasScript = project.components.some((c) => c.fileType === "ts4script" && !c.external);
    const scriptNamespaces = new Set(
      project.components.flatMap((c) => (c.fileType === "ts4script" ? (c.namespaces ?? []) : [])),
    );
    // Modules shipped by the base game (interactions.*, sims4.*, buffs.* ...) are
    // always present at runtime, so they are never a missing-script problem.
    const referencedModules = new Set(
      project.components
        .flatMap((c) => byId.get(c.id)?.candidate.tuningModules ?? [])
        .filter((m) => !GAME_MODULES.has(m.split(".")[0]!.toLowerCase())),
    );
    for (const m of referencedModules) {
      const top = m.split(".")[0]!;
      if (scriptNamespaces.size && !scriptNamespaces.has(top) && !project.dependencies.some((d) => d.name.toLowerCase().includes(top.toLowerCase())))
        add({
          level: "warning",
          code: "namespace-mismatch",
          message: `Tuning references module "${m}" which no bundled script provides.`,
          suggestion: "Add the companion .ts4script, or record it as a dependency.",
        });
    }
    if (referencedModules.size && !hasScript)
      add({
        level: "error",
        code: "missing-script",
        message: "Tuning references python modules but no .ts4script was uploaded with this mod.",
        suggestion: "Upload the companion script file and add it to this project.",
      });
    if (hasScript && !hasPackage)
      add({
        level: "info",
        code: "missing-package",
        message: "This mod contains a script but no .package companion.",
      });

    const unsupported = project.resources.filter((r) => r.editability === "preserved-unsupported").length;
    if (unsupported)
      add({
        level: "info",
        code: "preserved-unsupported",
        message: `${unsupported} resource${unsupported === 1 ? "" : "s"} use a format this app does not recognise. They are copied through unchanged on export.`,
        suggestion: "You can still edit everything else in this mod — nothing is lost.",
      });

    const preserved = project.resources.filter((r) => r.editability === "read-only").length;
    if (preserved)
      add({
        level: "info",
        code: "preserved-binary",
        message: `${preserved} recognised binary resource${preserved === 1 ? "" : "s"} (art, meshes, SimData) are preserved byte-for-byte.`,
      });

    // Reasons behind a non-ready status, in plain language for the review card.
    const reasons: string[] = [];
    const corruptFiles = project.components.filter((c) => c.parseStatus === "corrupt");
    corruptFiles.forEach((c) =>
      reasons.push(`${c.originalFileName} could not be read: ${c.parseError ?? "unknown error"}`),
    );
    if (unsupported)
      reasons.push(
        `${unsupported} resource${unsupported === 1 ? " uses" : "s use"} an unrecognised format — preserved unchanged, not editable here.`,
      );
    const compiledOnly = project.components.filter(
      (c) => c.fileType === "ts4script" && c.parseStatus === "partially-parsed",
    );
    compiledOnly.forEach((c) =>
      reasons.push(`${c.originalFileName} ships compiled bytecode only — it is bundled as-is, source cannot be edited.`),
    );
    if (project.confidence === "medium" || project.confidence === "low" || project.confidence === "conflict")
      reasons.push("File grouping needs your confirmation before this mod is treated as one project.");

    project.validationResults = results;
    project.supportReasons = reasons;
    const failed = project.components.every((c) => c.parseStatus === "corrupt");
    project.importStatus = failed
      ? "failed"
      : project.confidence === "medium" || project.confidence === "low" || project.confidence === "conflict"
        ? "needs-review"
        : unsupported || corruptFiles.length
          ? "partially-supported"
          : "ready";
  }


  session.projects = projects;
  stage(projects.some((p) => p.importStatus === "needs-review") ? "Awaiting review" : "Import complete");
  session.done = true;
  log("info", session.stage, `Analysis finished in ${Date.now() - startedAt}ms`, `${projects.length} project(s), ${analyzed.length} file(s)`);
  onProgress?.(session.stage, session.stageIndex, session);
  return { session, bytes: bytesById };
}
