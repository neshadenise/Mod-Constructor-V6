import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { bundleSchema, normalizeBundle, jsonContent } from "../shared";

export default defineTool({
  name: "list_aspirations",
  title: "List aspirations",
  description: "List every aspiration in the bundle with milestone count and reward-trait reference.",
  inputSchema: { bundle: bundleSchema.optional() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ bundle }) => {
    const b = normalizeBundle(bundle as z.infer<typeof bundleSchema> | undefined);
    return jsonContent({
      aspirations: b.aspirations.map((a) => ({
        id: a.id,
        name: a.name,
        internalId: a.internalId,
        category: a.category,
        milestones: a.milestones?.length ?? 0,
        rewardTraitId: a.rewardTraitId,
      })),
    });
  },
});
