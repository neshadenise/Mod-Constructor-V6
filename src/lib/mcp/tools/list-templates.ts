import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonContent } from "../shared";
import { BUILT_IN_TEMPLATES } from "@/lib/builtin-templates";

export default defineTool({
  name: "list_templates",
  title: "List built-in templates",
  description: "List Mod Constructor V6's built-in starter templates (careers, traits, aspirations, notifications) with metadata.",
  inputSchema: {
    kind: z.enum(["Career", "Trait", "Aspiration", "Notification"]).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ kind }) => {
    const list = BUILT_IN_TEMPLATES
      .filter((t) => !kind || t.kind === kind)
      .map((t) => ({
        id: t.id,
        name: t.name,
        kind: t.kind,
        summary: t.summary,
        difficulty: t.difficulty,
        requiredPacks: t.requiredPacks,
        includes: t.includes,
        targetGameVersion: t.targetGameVersion,
        tested: t.tested,
        source: t.source,
      }));
    return jsonContent({ templates: list });
  },
});
