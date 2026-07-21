import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { bundleSchema, normalizeBundle, jsonContent } from "../shared";

export default defineTool({
  name: "list_projects",
  title: "List projects",
  description:
    "List every project inside a Mod Constructor bundle. A bundle usually holds one project; returns an array either way.",
  inputSchema: {
    bundle: bundleSchema.optional().describe("Serialized .mcbundle.json content. Omit for an empty workspace."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ bundle }) => {
    const b = normalizeBundle(bundle as z.infer<typeof bundleSchema> | undefined);
    return jsonContent({
      projects: [
        {
          id: b.project.id,
          name: b.project.name,
          author: b.project.author,
          version: b.project.version,
          status: b.project.status,
          careers: b.careers.length,
          traits: b.traits.length,
          aspirations: b.aspirations.length,
          notifications: b.notifications.length,
        },
      ],
    });
  },
});
