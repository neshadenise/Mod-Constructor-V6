import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { bundleSchema, normalizeBundle, jsonContent, newId, now } from "../shared";
import type { NotificationTemplate } from "@/lib/types";

export default defineTool({
  name: "add_notification",
  title: "Add notification template",
  description: "Add an in-game notification template (toast, modal, banner, milestone, or phone) to a bundle.",
  inputSchema: {
    bundle: bundleSchema.optional(),
    name: z.string().min(1),
    title: z.string(),
    body: z.string(),
    visual: z.enum(["toast","modal","banner","milestone","phone"]).default("toast"),
    previewKind: z.enum(["success","warning","error","info","promotion","reward","relationship","buff","trait","career","aging"]).optional(),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: ({ bundle, name, title, body, visual, previewKind }) => {
    const b = normalizeBundle(bundle as z.infer<typeof bundleSchema> | undefined);
    const t = now();
    const note: NotificationTemplate = {
      id: newId("note"),
      projectId: b.project.id,
      name,
      visual,
      title,
      body,
      previewKind,
      actions: [{ label: "OK", kind: "primary" }],
      createdAt: t,
      updatedAt: t,
    };
    b.notifications.push(note);
    b.project.notificationIds.push(note.id);
    b.project.updatedAt = t;
    return jsonContent({ bundle: b, notification: note });
  },
});
