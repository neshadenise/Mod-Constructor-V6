import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { bundleSchema, normalizeBundle, jsonContent, newId, now } from "../shared";
import type { Trait } from "@/lib/types";

const emotion = z.enum(["flirty","happy","sad","angry","confident","focused","playful","uncomfortable","bored","energized","inspired","dazed","embarrassed","asleep","fine"]);

const buffSchema = z.object({
  name: z.string(),
  description: z.string().default(""),
  emotion,
  weight: z.number().default(1),
  durationHours: z.number().nonnegative().default(4),
});

export default defineTool({
  name: "add_trait",
  title: "Add trait",
  description: "Add a Sims 4 trait (with buffs, age gates, and category) to a bundle. Returns the updated bundle.",
  inputSchema: {
    bundle: bundleSchema.optional(),
    name: z.string().min(1),
    internalId: z.string(),
    description: z.string().default(""),
    category: z.enum(["personality","gameplay","lifestyle","bonus"]).default("personality"),
    ageGates: z.array(z.enum(["teen","young-adult","adult","elder"])).default(["young-adult","adult"]),
    buffs: z.array(buffSchema).default([]),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: ({ bundle, name, internalId, description, category, ageGates, buffs }) => {
    const b = normalizeBundle(bundle as z.infer<typeof bundleSchema> | undefined);
    const t = now();
    const trait: Trait = {
      id: newId("trait"),
      projectId: b.project.id,
      name,
      internalId,
      description,
      category,
      ageGates,
      buffs: buffs.map((bf, i) => ({ id: newId(`buff_${i}`), ...bf })),
      socialInteractions: [],
      buffReplacements: [],
      commodityWeights: [],
      blockedAges: [],
      blockedEmotions: [],
      createdAt: t,
      updatedAt: t,
    };
    b.traits.push(trait);
    b.project.traitIds.push(trait.id);
    b.project.updatedAt = t;
    return jsonContent({ bundle: b, trait });
  },
});
