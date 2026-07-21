import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { bundleSchema, normalizeBundle, jsonContent } from "../shared";

export default defineTool({
  name: "get_project",
  title: "Get project",
  description: "Get full metadata (name, author, version, status, changelog, item counts) for the project in a bundle.",
  inputSchema: {
    bundle: bundleSchema.optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ bundle }) => {
    const b = normalizeBundle(bundle as z.infer<typeof bundleSchema> | undefined);
    return jsonContent({
      project: b.project,
      counts: {
        careers: b.careers.length,
        traits: b.traits.length,
        aspirations: b.aspirations.length,
        notifications: b.notifications.length,
      },
    });
  },
});
