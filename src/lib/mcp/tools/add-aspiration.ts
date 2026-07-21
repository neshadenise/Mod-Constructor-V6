import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { bundleSchema, normalizeBundle, jsonContent, newId, now } from "../shared";
import type { Aspiration } from "@/lib/types";

const milestoneSchema = z.object({
  name: z.string(),
  description: z.string().default(""),
  objectives: z.array(z.string()).default([]),
});

export default defineTool({
  name: "add_aspiration",
  title: "Add aspiration",
  description: "Add a Sims 4 aspiration (with ordered milestones and optional reward trait) to a bundle.",
  inputSchema: {
    bundle: bundleSchema.optional(),
    name: z.string().min(1),
    internalId: z.string(),
    description: z.string().default(""),
    category: z.string().default("Creativity"),
    milestones: z.array(milestoneSchema).min(1),
    rewardTraitId: z.string().optional(),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: ({ bundle, name, internalId, description, category, milestones, rewardTraitId }) => {
    const b = normalizeBundle(bundle as z.infer<typeof bundleSchema> | undefined);
    const t = now();
    const asp: Aspiration = {
      id: newId("asp"),
      projectId: b.project.id,
      name,
      internalId,
      description,
      category,
      milestones: milestones.map((m, i) => ({ id: newId(`ms_${i}`), order: i + 1, ...m })),
      rewardTraitId,
      createdAt: t,
      updatedAt: t,
    };
    b.aspirations.push(asp);
    b.project.aspirationIds.push(asp.id);
    b.project.updatedAt = t;
    return jsonContent({ bundle: b, aspiration: asp });
  },
});
