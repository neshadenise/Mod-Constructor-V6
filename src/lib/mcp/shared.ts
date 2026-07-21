/**
 * Shared types and helpers for MCP tools.
 *
 * MCP tools are pure/stateless. Callers (ChatGPT, Claude, etc.) pass a
 * ProjectBundle (or omit it for a fresh workspace) and receive an updated
 * bundle back. The tools do not read from or write to the browser store.
 */

import { z } from "zod";
import type {
  Project,
  ProjectBundle,
  Career,
  Trait,
  Aspiration,
  NotificationTemplate,
  ProjectStatus,
} from "@/lib/types";

/** Loose shape for a serialized ProjectBundle passed over MCP. */
export const bundleSchema = z
  .object({
    version: z.literal(2).optional(),
    project: z.record(z.string(), z.unknown()).optional(),
    careers: z.array(z.record(z.string(), z.unknown())).optional(),
    traits: z.array(z.record(z.string(), z.unknown())).optional(),
    aspirations: z.array(z.record(z.string(), z.unknown())).optional(),
    notifications: z.array(z.record(z.string(), z.unknown())).optional(),
    assets: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();

export type LooseBundle = z.infer<typeof bundleSchema>;

/** JSON-safe text content wrapper for MCP responses. */
export function jsonContent(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload as Record<string, unknown>,
  };
}

export function errorContent(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

export function now(): number {
  return Date.now();
}

let idCounter = 0;
export function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}`;
}

/** Normalize an incoming bundle-ish payload into a full ProjectBundle. */
export function normalizeBundle(input: LooseBundle | undefined): ProjectBundle {
  const t = now();
  const project: Project = {
    id: (input?.project?.id as string) ?? newId("proj"),
    name: (input?.project?.name as string) ?? "Untitled Mod",
    author: (input?.project?.author as string) ?? "",
    description: (input?.project?.description as string) ?? "",
    version: (input?.project?.version as string) ?? "0.1.0",
    status: ((input?.project?.status as ProjectStatus) ?? "draft"),
    changelog: (input?.project?.changelog as Project["changelog"]) ?? [],
    createdAt: (input?.project?.createdAt as number) ?? t,
    updatedAt: (input?.project?.updatedAt as number) ?? t,
    careerIds: (input?.project?.careerIds as string[]) ?? [],
    traitIds: (input?.project?.traitIds as string[]) ?? [],
    aspirationIds: (input?.project?.aspirationIds as string[]) ?? [],
    notificationIds: (input?.project?.notificationIds as string[]) ?? [],
    assetIds: (input?.project?.assetIds as string[]) ?? [],
    tags: (input?.project?.tags as string[]) ?? [],
    favorite: (input?.project?.favorite as boolean) ?? false,
  };
  return {
    version: 2,
    exportedAt: t,
    exportedFrom: "chatgpt",
    project,
    careers: ((input?.careers as unknown) as Career[]) ?? [],
    traits: ((input?.traits as unknown) as Trait[]) ?? [],
    aspirations: ((input?.aspirations as unknown) as Aspiration[]) ?? [],
    notifications:
      ((input?.notifications as unknown) as NotificationTemplate[]) ?? [],
    assets: [],
  };
}

export const projectStatusSchema = z.enum([
  "draft",
  "in-progress",
  "complete",
  "tested",
  "released",
]);
