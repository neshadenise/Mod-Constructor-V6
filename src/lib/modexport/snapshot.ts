/**
 * Immutable export snapshot.
 *
 * The snapshot freezes everything the compilers need: component layout,
 * resource bytes, rebuilt payloads, resource states, relationships and the
 * settings that produced it. Compilation never reads live UI state.
 */

import { checksum } from "@/lib/modimport/binary";
import { compressionLabel, readDbpf, readDbpfResource } from "@/lib/modimport/dbpf";
import { resourceTypeInfo } from "@/lib/modimport/resource-types";
import { PARSER_VERSION, type ModProject } from "@/lib/modimport/types";
import type { Aspiration, Asset, Career, NotificationTemplate, Project, Trait } from "@/lib/types";
import { GROUP_DEFAULT, ResourceIdService, TYPE_STBL, normalizeKey } from "./ids";
import {
  SERIALIZERS,
  type SerializedTuningResource,
  type SerializerContext,
  type ValidationResult as SerializerIssue,
} from "./serializers";
import { requiresSimData } from "./simdata";
import { FALLBACK_LOCALE, mergeLocalization, serializeStbl, stblInstance, type LocalizationEntry } from "./stbl";
import { versionedName } from "./filenames";
import {
  EXPORTER_VERSION,
  type ExportComponentSnapshot,
  type ExportRequest,
  type ExportResourceSnapshot,
  type ExportSnapshot,
} from "./types";

export interface BuilderContent {
  project: Project;
  careers: Career[];
  traits: Trait[];
  aspirations: Aspiration[];
  notifications: NotificationTemplate[];
  assets: Asset[];
}

export interface ImportedContent {
  project: ModProject;
  /** componentId -> original uploaded bytes. */
  originals: Map<string, Uint8Array>;
}

export interface SnapshotInput {
  request: ExportRequest;
  builder?: BuilderContent;
  imported?: ImportedContent;
}

export interface SnapshotResult {
  snapshot: ExportSnapshot;
  issues: SerializerIssue[];
  /** Builder resources that need SimData this build cannot produce. */
  simDataGaps: { resourceId: string; kind: string; message: string }[];
}

const enc = new TextEncoder();

function namespaceFor(builder: BuilderContent | undefined) {
  const author = builder?.project.author?.trim() || "creator";
  const name = builder?.project.name?.trim() || "mod";
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `${clean(author)}_${clean(name)}` || "mod";
}

export async function buildSnapshot(input: SnapshotInput): Promise<SnapshotResult> {
  const { request, builder, imported } = input;
  const components: ExportComponentSnapshot[] = [];
  const resources: ExportResourceSnapshot[] = [];
  const issues: SerializerIssue[] = [];
  const simDataGaps: SnapshotResult["simDataGaps"] = [];

  const ids = new ResourceIdService(
    (imported?.project.resources ?? []).map((r) => ({ key: r.key, resourceId: r.id })),
  );

  /* ---------------- imported components: preserve or patch -------------- */
  if (imported) {
    for (const component of imported.project.components) {
      const original = imported.originals.get(component.id);
      if (!original) continue;
      if (request.selectedComponentIds?.length && !request.selectedComponentIds.includes(component.id))
        continue;

      const kind: ExportComponentSnapshot["kind"] =
        component.fileType === "package"
          ? "package"
          : component.fileType === "ts4script"
            ? "ts4script"
            : component.role === "documentation"
              ? "documentation"
              : component.role === "configuration"
                ? "configuration"
                : "asset";

      const snapshotComponent: ExportComponentSnapshot = {
        id: component.id,
        fileName: component.originalFileName,
        relativePath: component.relativePath,
        kind,
        role: component.role,
        required: !component.optional && !component.external,
        optional: component.optional,
        external: component.external,
        resourceIds: [],
        bytes: kind === "package" ? undefined : original,
        preserveOriginalBytes: request.mode === "preserve-original" || component.preserveOriginalBytes,
        originalChecksum: component.checksum,
      };

      if (kind === "package") {
        const pkg = readDbpf(original);
        for (const entry of pkg.entries) {
          const meta = (component.resources ?? []).find((r) => r.originalIndex === entry.index);
          const info = resourceTypeInfo(entry.key.type);
          const resourceId = meta?.id ?? `${component.id}:${entry.index}`;
          const originalHash = await checksum(entry.raw);

          let state: ExportResourceSnapshot["state"] = "unchanged";
          let source: ExportResourceSnapshot["source"] = "original-bytes";
          let payload: Uint8Array | undefined;
          let canRebuild = false;
          let notes = meta?.notes;

          const dirty = Boolean(meta?.dirty) && request.mode !== "preserve-original";
          if (dirty) {
            if (meta?.strings && meta.subtype === "String table") {
              const merged = mergeLocalization(meta.strings, []);
              payload = serializeStbl(merged.entries);
              state = "modified";
              source = "builder-model";
              canRebuild = true;
            } else if (meta?.text !== undefined) {
              payload = enc.encode(meta.text);
              state = "modified";
              source = "builder-model";
              canRebuild = true;
            } else {
              state = "invalid";
              canRebuild = false;
              notes = "Edited but this resource type has no serializer — safe mode blocks this export.";
            }
          } else if (!info.decodable) {
            state = "unsupported-preserved";
          }

          resources.push({
            resourceId,
            componentId: component.id,
            resourceKey: normalizeKey(entry.key),
            typeLabel: info.label,
            name: meta?.name,
            state,
            source,
            originalHash,
            currentHash: payload ? await checksum(payload) : originalHash,
            canRebuild,
            preserveRawBytes: !payload,
            raw: entry.raw,
            memSize: entry.memSize,
            compressionType: entry.compressionType,
            payload,
            notes,
          });
          snapshotComponent.resourceIds.push(resourceId);
          void compressionLabel(entry.compressionType);
          void readDbpfResource;
        }
      }

      components.push(snapshotComponent);
    }
  }

  /* ------------------ builder content: rebuild into a package ----------- */
  const wantsBuilderOutput =
    builder && request.mode !== "preserve-original" &&
    (builder.careers.length || builder.traits.length || builder.aspirations.length);

  if (wantsBuilderOutput && builder) {
    const ctx: SerializerContext = { namespace: namespaceFor(builder), ids };
    const tuning: SerializedTuningResource[] = [];

    for (const career of builder.careers) {
      issues.push(...SERIALIZERS.career.validate(career));
      tuning.push(...SERIALIZERS.career.serialize(career, ctx));
    }
    for (const trait of builder.traits) {
      issues.push(...SERIALIZERS.trait.validate(trait));
      tuning.push(...SERIALIZERS.trait.serialize(trait, ctx));
    }
    for (const aspiration of builder.aspirations) {
      issues.push(...SERIALIZERS.aspiration.validate(aspiration));
      tuning.push(...SERIALIZERS.aspiration.serialize(aspiration, ctx));
    }

    const componentId = `builder:${builder.project.id}`;
    const fileName = versionedName(
      request.outputName || builder.project.name,
      "package",
      request.versionedFileNames ? builder.project.version : undefined,
      request.creatorPrefix,
    );
    const component: ExportComponentSnapshot = {
      id: componentId,
      fileName,
      kind: "package",
      role: "tuning",
      required: true,
      resourceIds: [],
      preserveOriginalBytes: false,
    };

    for (const resource of tuning) {
      const payload = enc.encode(resource.xml);
      resources.push({
        resourceId: resource.resourceId,
        componentId,
        resourceKey: resource.key,
        typeLabel: "XML Tuning",
        name: resource.tuningName,
        state: "created",
        source: "builder-model",
        currentHash: await checksum(payload),
        canRebuild: true,
        preserveRawBytes: false,
        payload,
        memSize: payload.byteLength,
        compressionType: 0,
      });
      component.resourceIds.push(resource.resourceId);
      if (requiresSimData(resource.kind)) {
        simDataGaps.push({
          resourceId: resource.resourceId,
          kind: resource.kind,
          message: `${resource.tuningName} (${resource.kind}) requires a SimData companion that this build cannot generate.`,
        });
      }
    }

    // One STBL table per project, fallback locale.
    const locEntries: LocalizationEntry[] = tuning.flatMap((t) =>
      t.strings.map((s) => ({
        id: `${t.resourceId}:${s.key}`,
        key: s.key,
        locale: FALLBACK_LOCALE,
        value: s.value,
        source: "generated" as const,
        state: "created" as const,
      })),
    );
    if (locEntries.length) {
      const merged = mergeLocalization([], locEntries);
      const payload = serializeStbl(merged.entries);
      const base = ids.generateResourceKey({
        namespace: ctx.namespace,
        kind: "stbl",
        name: builder.project.id,
        type: TYPE_STBL,
        group: GROUP_DEFAULT,
        highBit: false,
      });
      const key = normalizeKey({ ...base, instance: stblInstance(base.instance, FALLBACK_LOCALE) });
      ids.reserveKey(key, "stbl:en-US");
      resources.push({
        resourceId: "stbl:en-US",
        componentId,
        resourceKey: key,
        typeLabel: "String Table (STBL)",
        name: `${builder.project.name} strings (en-US)`,
        state: "created",
        source: "generated",
        currentHash: await checksum(payload),
        canRebuild: true,
        preserveRawBytes: false,
        payload,
        memSize: payload.byteLength,
        compressionType: 0,
      });
      component.resourceIds.push("stbl:en-US");
    }

    components.push(component);
  }

  const snapshot: ExportSnapshot = Object.freeze({
    projectId: request.projectId,
    projectName: builder?.project.name ?? imported?.project.name ?? "Mod",
    projectVersion: builder?.project.version ?? imported?.project.version ?? "0.1.0",
    creator: builder?.project.author ?? imported?.project.creator,
    description: builder?.project.description ?? imported?.project.description,
    createdAt: new Date().toISOString(),
    components,
    resources,
    relationships: imported?.project.relationships ?? [],
    dependencies: imported?.project.dependencies ?? [],
    settings: { ...request },
    importedProject: imported?.project,
    projectSource: request.includeProjectSource && builder ? buildProjectSource(builder) : undefined,
    parserVersion: PARSER_VERSION,
    exporterVersion: EXPORTER_VERSION,
  });

  return { snapshot, issues, simDataGaps };
}

export function buildProjectSource(builder: BuilderContent) {
  return {
    schemaVersion: "ts4builder/1",
    exportedAt: new Date().toISOString(),
    applicationVersion: EXPORTER_VERSION,
    project: builder.project,
    careers: builder.careers,
    traits: builder.traits,
    aspirations: builder.aspirations,
    notifications: builder.notifications,
    assets: builder.assets.map((a) => ({ ...a, dataUrl: a.dataUrl })),
  };
}
