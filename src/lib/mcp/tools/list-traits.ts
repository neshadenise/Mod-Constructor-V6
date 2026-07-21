import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { bundleSchema, normalizeBundle, jsonContent } from "../shared";

export default defineTool({
  name: "list_traits",
  title: "List traits",
  description: "List every trait in the bundle with category, age gates, and buff count.",
  inputSchema: { bundle: bundleSchema.optional() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ bundle }) => {
    const b = normalizeBundle(bundle as z.infer<typeof bundleSchema> | undefined);
    return jsonContent({
      traits: b.traits.map((t) => ({
        id: t.id,
        name: t.name,
        internalId: t.internalId,
        category: t.category,
        ageGates: t.ageGates,
        buffs: t.buffs?.length ?? 0,
      })),
    });
  },
});
