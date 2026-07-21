import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { bundleSchema, normalizeBundle, jsonContent } from "../shared";

export default defineTool({
  name: "list_notifications",
  title: "List notifications",
  description: "List every notification template in the bundle with visual style and title.",
  inputSchema: { bundle: bundleSchema.optional() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ bundle }) => {
    const b = normalizeBundle(bundle as z.infer<typeof bundleSchema> | undefined);
    return jsonContent({
      notifications: b.notifications.map((n) => ({
        id: n.id,
        name: n.name,
        visual: n.visual,
        title: n.title,
        previewKind: n.previewKind,
      })),
    });
  },
});
