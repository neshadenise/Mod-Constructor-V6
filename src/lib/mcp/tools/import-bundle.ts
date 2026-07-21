import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { normalizeBundle, jsonContent, errorContent } from "../shared";

export default defineTool({
  name: "import_bundle",
  title: "Import .mcbundle.json",
  description: "Parse and validate a .mcbundle.json string. Returns the normalized bundle if valid.",
  inputSchema: {
    contents: z.string().min(2).describe("Raw JSON text of a .mcbundle.json file."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ contents }) => {
    try {
      const parsed = JSON.parse(contents);
      const bundle = normalizeBundle(parsed);
      return jsonContent({
        bundle,
        summary: {
          project: bundle.project.name,
          version: bundle.project.version,
          careers: bundle.careers.length,
          traits: bundle.traits.length,
          aspirations: bundle.aspirations.length,
          notifications: bundle.notifications.length,
        },
      });
    } catch (err) {
      return errorContent(`Invalid bundle JSON: ${(err as Error).message}`);
    }
  },
});
