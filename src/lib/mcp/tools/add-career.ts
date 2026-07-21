import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { bundleSchema, normalizeBundle, jsonContent, newId, now } from "../shared";
import type { Career } from "@/lib/types";

const levelSchema = z.object({
  rank: z.number().int().min(1),
  title: z.string(),
  salary: z.number().nonnegative(),
  workStart: z.string().default("09:00"),
  workEnd: z.string().default("17:00"),
  workDays: z.array(z.enum(["mon","tue","wed","thu","fri","sat","sun"])).default(["mon","tue","wed","thu","fri"]),
  objectives: z.array(z.string()).default([]),
  perks: z.array(z.string()).default([]),
});

const branchSchema = z.object({
  name: z.string(),
  description: z.string().default(""),
  levels: z.array(levelSchema).min(1),
});

export default defineTool({
  name: "add_career",
  title: "Add career",
  description: "Add a Sims 4 career (with branches, levels, salary, schedule) to a bundle. Returns the updated bundle.",
  inputSchema: {
    bundle: bundleSchema.optional(),
    name: z.string().min(1),
    internalId: z.string().describe("Snake-case identifier used in tuning (e.g. career_astronaut)."),
    description: z.string().default(""),
    careerType: z.enum(["standard","part-time","freelance","active","military"]).default("standard"),
    ageGates: z.array(z.enum(["teen","young-adult","adult","elder"])).default(["young-adult","adult"]),
    branches: z.array(branchSchema).min(1),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: ({ bundle, name, internalId, description, careerType, ageGates, branches }) => {
    const b = normalizeBundle(bundle as z.infer<typeof bundleSchema> | undefined);
    const t = now();
    const career: Career = {
      id: newId("career"),
      projectId: b.project.id,
      name,
      internalId,
      description,
      careerType,
      ageGates,
      branches: branches.map((br, i) => ({
        id: newId(`branch_${i}`),
        name: br.name,
        description: br.description,
        levels: br.levels.map((lv, j) => ({ id: newId(`lvl_${j}`), ...lv })),
      })),
      messageOverrides: [],
      workFromHomeEvents: [],
      createdAt: t,
      updatedAt: t,
    };
    b.careers.push(career);
    b.project.careerIds.push(career.id);
    b.project.updatedAt = t;
    return jsonContent({ bundle: b, career });
  },
});
