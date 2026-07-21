import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonContent, newId, now } from "../shared";
import type { ProjectBundle } from "@/lib/types";

export default defineTool({
  name: "create_project",
  title: "Create project",
  description: "Create a fresh Mod Constructor project bundle. Returns an empty bundle ready for authoring tools.",
  inputSchema: {
    name: z.string().min(1).describe("Project name shown to the mod's audience."),
    author: z.string().optional().describe("Creator display name."),
    description: z.string().optional(),
    version: z.string().optional().describe("Semantic version, defaults to 0.1.0."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: ({ name, author, description, version }) => {
    const t = now();
    const bundle: ProjectBundle = {
      version: 2,
      exportedAt: t,
      exportedFrom: "chatgpt",
      project: {
        id: newId("proj"),
        name,
        author: author ?? "",
        description: description ?? "",
        version: version ?? "0.1.0",
        status: "draft",
        changelog: [],
        createdAt: t,
        updatedAt: t,
        careerIds: [],
        traitIds: [],
        aspirationIds: [],
        notificationIds: [],
        assetIds: [],
        tags: [],
        favorite: false,
      },
      careers: [],
      traits: [],
      aspirations: [],
      notifications: [],
      assets: [],
    };
    return jsonContent({ bundle });
  },
});
