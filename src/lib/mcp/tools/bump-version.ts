import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { bundleSchema, normalizeBundle, jsonContent, now } from "../shared";

export default defineTool({
  name: "bump_version",
  title: "Bump version",
  description: "Set a new semantic version on the project and reset status to in-progress, enforcing the release lifecycle.",
  inputSchema: {
    bundle: bundleSchema.optional(),
    version: z.string().min(1).describe('Semver-style string, e.g. "0.2.0" or "1.0.0-rc.1".'),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: ({ bundle, version }) => {
    const b = normalizeBundle(bundle as z.infer<typeof bundleSchema> | undefined);
    b.project.version = version;
    b.project.status = "in-progress";
    b.project.updatedAt = now();
    return jsonContent({ bundle: b, project: b.project });
  },
});
