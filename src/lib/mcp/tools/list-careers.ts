import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { bundleSchema, normalizeBundle, jsonContent } from "../shared";

export default defineTool({
  name: "list_careers",
  title: "List careers",
  description: "List every career in the bundle with a compact summary (name, type, branch count, level count).",
  inputSchema: { bundle: bundleSchema.optional() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ bundle }) => {
    const b = normalizeBundle(bundle as z.infer<typeof bundleSchema> | undefined);
    return jsonContent({
      careers: b.careers.map((c) => ({
        id: c.id,
        name: c.name,
        internalId: c.internalId,
        careerType: c.careerType,
        branches: c.branches?.length ?? 0,
        levels: (c.branches ?? []).reduce((n, br) => n + (br.levels?.length ?? 0), 0),
      })),
    });
  },
});
