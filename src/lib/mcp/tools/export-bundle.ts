import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { bundleSchema, normalizeBundle, jsonContent, now } from "../shared";

export default defineTool({
  name: "export_bundle",
  title: "Export .mcbundle.json",
  description: "Return the bundle as a downloadable .mcbundle.json string plus a suggested filename. The user re-imports it into Mod Constructor V6 via File → Import.",
  inputSchema: { bundle: bundleSchema.optional() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ bundle }) => {
    const b = normalizeBundle(bundle as z.infer<typeof bundleSchema> | undefined);
    b.exportedAt = now();
    const slug = (b.project.name || "mod").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "mod";
    const filename = `${slug}-v${b.project.version}.mcbundle.json`;
    return jsonContent({
      filename,
      mimeType: "application/json",
      contents: JSON.stringify(b, null, 2),
    });
  },
});
