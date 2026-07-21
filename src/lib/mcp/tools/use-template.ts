import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { bundleSchema, normalizeBundle, jsonContent, errorContent, newId, now } from "../shared";
import { BUILT_IN_TEMPLATES } from "@/lib/builtin-templates";
import type { Career, Trait, Aspiration, NotificationTemplate } from "@/lib/types";

export default defineTool({
  name: "use_template",
  title: "Scaffold from template",
  description: "Scaffold a built-in template's records into a bundle. Use list_templates first to get valid IDs.",
  inputSchema: {
    bundle: bundleSchema.optional(),
    templateId: z.string().describe("ID returned by list_templates."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: ({ bundle, templateId }) => {
    const tpl = BUILT_IN_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return errorContent(`Unknown template: ${templateId}`);
    const b = normalizeBundle(bundle as z.infer<typeof bundleSchema> | undefined);
    const t = now();
    const payload = tpl.payload as Record<string, unknown>;

    if (tpl.kind === "Career") {
      const rec: Career = { ...(payload as Omit<Career,"id"|"projectId"|"createdAt"|"updatedAt">), id: newId("career"), projectId: b.project.id, createdAt: t, updatedAt: t };
      b.careers.push(rec);
      b.project.careerIds.push(rec.id);
    } else if (tpl.kind === "Trait") {
      const rec: Trait = { ...(payload as Omit<Trait,"id"|"projectId"|"createdAt"|"updatedAt">), id: newId("trait"), projectId: b.project.id, createdAt: t, updatedAt: t };
      b.traits.push(rec);
      b.project.traitIds.push(rec.id);
    } else if (tpl.kind === "Aspiration") {
      const rec: Aspiration = { ...(payload as Omit<Aspiration,"id"|"projectId"|"createdAt"|"updatedAt">), id: newId("asp"), projectId: b.project.id, createdAt: t, updatedAt: t };
      b.aspirations.push(rec);
      b.project.aspirationIds.push(rec.id);
    } else if (tpl.kind === "Notification") {
      const rec: NotificationTemplate = { ...(payload as Omit<NotificationTemplate,"id"|"projectId"|"createdAt"|"updatedAt">), id: newId("note"), projectId: b.project.id, createdAt: t, updatedAt: t };
      b.notifications.push(rec);
      b.project.notificationIds.push(rec.id);
    }
    b.project.updatedAt = t;
    return jsonContent({ bundle: b, appliedTemplate: { id: tpl.id, name: tpl.name, kind: tpl.kind } });
  },
});
