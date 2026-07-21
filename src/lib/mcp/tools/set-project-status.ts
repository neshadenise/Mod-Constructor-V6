import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { bundleSchema, normalizeBundle, jsonContent, projectStatusSchema, newId, now } from "../shared";

export default defineTool({
  name: "set_project_status",
  title: "Set project status",
  description: "Set the project's lifecycle status. Moving to complete/tested/released auto-appends a changelog entry.",
  inputSchema: {
    bundle: bundleSchema.optional(),
    status: projectStatusSchema,
    notes: z.string().optional().describe("Changelog note appended when marking complete/tested/released."),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: ({ bundle, status, notes }) => {
    const b = normalizeBundle(bundle as z.infer<typeof bundleSchema> | undefined);
    const t = now();
    b.project.status = status;
    b.project.updatedAt = t;
    if (["complete", "tested", "released"].includes(status)) {
      b.project.changelog = [
        {
          id: newId("cl"),
          version: b.project.version,
          status,
          notes: notes ?? `Marked ${status}`,
          createdAt: t,
          auto: true,
        },
        ...b.project.changelog,
      ];
    }
    return jsonContent({ bundle: b, project: b.project });
  },
});
