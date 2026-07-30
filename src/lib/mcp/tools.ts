/**
 * MCP tool catalog for the Sims 4 Mod Constructor.
 *
 * Every tool: verifies the OAuth token, resolves the ChatGPT connection,
 * checks the granted permission, validates arguments with a strict schema,
 * calls the shared service layer, records a change set, and returns the
 * true result (including honest build states).
 */

import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import * as svc from "@/lib/server/mod-service";
import { openSession, requirePermission, ok, fail, type McpSession } from "./service";
import type { Permission } from "@/lib/server/mod-service";

const uuid = z.string().uuid();

async function run<T>(
  permission: Permission | null,
  fn: (session: McpSession) => Promise<T>,
) {
  try {
    const session = await openSession(undefined as never);
    if (permission) requirePermission(session, permission);
    return ok(await fn(session));
  } catch (error) {
    return fail(error);
  }
}

/** Wrap a handler with session + permission handling. */
function handler<A>(
  permission: Permission | null,
  fn: (args: A, session: McpSession) => Promise<unknown>,
) {
  return async (args: A, toolCtx: any) => {
    try {
      const session = await openSession(toolCtx);
      if (permission) requirePermission(session, permission);
      return ok(await fn(args, session));
    } catch (error) {
      return fail(error);
    }
  };
}

/* ---------------------------------------------------------------- */
/* projects & selection                                              */
/* ---------------------------------------------------------------- */

const listProjects = defineTool({
  name: "list_projects",
  title: "List projects",
  description: "List the Mod Constructor projects this authorized account owns.",
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: handler("projects.read", async (_args, s) => ({
    projects: await svc.listProjects(s.ctx),
    activeProjectId: s.connection.active_project_id,
    note: "Never guess a project. Ask the user which project to use when more than one exists.",
  })),
});

const getProject = defineTool({
  name: "get_project",
  title: "Get project",
  description: "Read one project and its resource index.",
  inputSchema: { project_id: uuid },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: handler<{ project_id: string }>("projects.read", (a, s) =>
    svc.getProject(s.ctx, a.project_id),
  ),
});

const getActiveProject = defineTool({
  name: "get_active_project",
  title: "Get active project",
  description: "Read the project currently selected for this ChatGPT connection.",
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: handler("projects.read", async (_a, s) => {
    if (!s.connection.active_project_id)
      return { activeProjectId: null, message: "No active project selected. Ask the user to pick one." };
    return svc.getProject(s.ctx, s.connection.active_project_id);
  }),
});

const setActiveProject = defineTool({
  name: "set_active_project",
  title: "Set active project",
  description: "Set the active project for this authorized session, after the user chose it.",
  inputSchema: { project_id: uuid },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: handler<{ project_id: string }>("projects.read", (a, s) =>
    svc.setActiveProject(s.ctx, s.connection.id, a.project_id),
  ),
});

const createProject = defineTool({
  name: "create_project",
  title: "Create project",
  description: "Create a new Mod Constructor project owned by this account.",
  inputSchema: { name: z.string().min(1), description: z.string().optional() },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: handler<{ name: string; description?: string }>("resources.create", (a, s) =>
    svc.createProject(s.ctx, { name: a.name, description: a.description }),
  ),
});

/* ---------------------------------------------------------------- */
/* resource reads                                                    */
/* ---------------------------------------------------------------- */

const kindEnum = z.enum(svc.RESOURCE_KINDS);

const listProjectResources = defineTool({
  name: "list_project_resources",
  title: "List project resources",
  description: "List resources in a project, optionally filtered by kind.",
  inputSchema: { project_id: uuid, kind: kindEnum.optional() },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: handler<{ project_id: string; kind?: svc.ResourceKind }>("projects.read", async (a, s) => ({
    resources: await svc.listProjectResources(s.ctx, a.project_id, a.kind),
  })),
});

const getResource = defineTool({
  name: "get_resource",
  title: "Get resource",
  description: "Read one resource by its stable UUID.",
  inputSchema: { resource_id: uuid },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: handler<{ resource_id: string }>("projects.read", (a, s) =>
    svc.getResource(s.ctx, a.resource_id),
  ),
});

/* ---------------------------------------------------------------- */
/* authoring                                                         */
/* ---------------------------------------------------------------- */

function creator<S extends z.ZodRawShape>(opts: {
  name: string;
  title: string;
  description: string;
  kind: svc.ResourceKind;
  inputSchema: S;
  build: (args: any) => { name: string; parentId?: string | null; data: Record<string, unknown> };
}) {
  return defineTool({
    name: opts.name,
    title: opts.title,
    description: opts.description,
    inputSchema: { project_id: uuid, ...opts.inputSchema },
    annotations: { readOnlyHint: false, openWorldHint: false },
    handler: handler<any>("resources.create", async (a, s) => {
      const built = opts.build(a);
      const res = await svc.createResource(s.ctx, {
        projectId: a.project_id,
        kind: opts.kind,
        name: built.name,
        parentId: built.parentId ?? null,
        data: built.data,
        toolName: opts.name,
        toolArgs: a,
      });
      return {
        created: "project data",
        resource: res.resource,
        changeSetId: res.changeSetId,
        note: "Project data created in Mod Constructor. No package was compiled by this call.",
      };
    }),
  });
}

function updater(opts: {
  name: string;
  title: string;
  description: string;
  kind: svc.ResourceKind;
  fields: z.ZodRawShape;
}) {
  return defineTool({
    name: opts.name,
    title: opts.title,
    description: opts.description,
    inputSchema: { resource_id: uuid, name: z.string().min(1).optional(), ...opts.fields },
    annotations: { readOnlyHint: false, openWorldHint: false },
    handler: handler<any>("resources.update", async (a, s) => {
      const { resource_id, name, ...rest } = a;
      const data = Object.fromEntries(
        Object.entries(rest).filter(([, v]) => v !== undefined),
      ) as Record<string, unknown>;
      const res = await svc.updateResource(s.ctx, {
        resourceId: resource_id,
        name,
        data,
        expectedKind: opts.kind,
        toolName: opts.name,
        toolArgs: a,
      });
      return { updated: "project data", resource: res.resource, changeSetId: res.changeSetId };
    }),
  });
}

const traitFields = {
  description: z.string().optional(),
  trait_type: z.enum(["personality", "gameplay", "lifestyle", "bonus"]).optional(),
  age_availability: z.array(z.enum(["child", "teen", "young_adult", "adult", "elder"])).optional(),
  icon_key: z.string().optional(),
  notes: z.string().optional(),
};

const buffFields = {
  description: z.string().optional(),
  mood: z.string().optional(),
  mood_weight: z.number().int().optional(),
  duration_hours: z.number().optional(),
  visible: z.boolean().optional(),
  icon_key: z.string().optional(),
};

const interactionFields = {
  description: z.string().optional(),
  interaction_type: z.enum(["social", "object", "terrain", "phone", "computer"]).optional(),
  target: z.string().optional(),
  outcome: z.string().optional(),
};

const careerFields = {
  description: z.string().optional(),
  category: z.string().optional(),
  branch: z.string().optional(),
  icon_key: z.string().optional(),
};

const createTrait = creator({
  name: "create_trait",
  title: "Create trait",
  description: "Create a trait resource in a project. Text should be paired with localized strings.",
  kind: "trait",
  inputSchema: { name: z.string().min(1), ...traitFields },
  build: ({ name, ...data }) => ({ name, data }),
});

const updateTrait = updater({
  name: "update_trait",
  title: "Update trait",
  description: "Update fields on an existing trait resource.",
  kind: "trait",
  fields: traitFields,
});

const createBuff = creator({
  name: "create_buff",
  title: "Create buff",
  description: "Create a buff (moodlet) resource, optionally attached to a trait.",
  kind: "buff",
  inputSchema: { name: z.string().min(1), trait_id: uuid.optional(), ...buffFields },
  build: ({ name, trait_id, ...data }) => ({ name, parentId: trait_id ?? null, data }),
});

const updateBuff = updater({
  name: "update_buff",
  title: "Update buff",
  description: "Update fields on an existing buff resource.",
  kind: "buff",
  fields: buffFields,
});

const createInteraction = creator({
  name: "create_interaction",
  title: "Create interaction",
  description: "Create an interaction resource in a project.",
  kind: "interaction",
  inputSchema: { name: z.string().min(1), ...interactionFields },
  build: ({ name, ...data }) => ({ name, data }),
});

const updateInteraction = updater({
  name: "update_interaction",
  title: "Update interaction",
  description: "Update fields on an existing interaction resource.",
  kind: "interaction",
  fields: interactionFields,
});

const createNotification = creator({
  name: "create_notification",
  title: "Create notification",
  description: "Create an in-game notification resource.",
  kind: "notification",
  inputSchema: {
    name: z.string().min(1),
    text: z.string().min(1),
    title_text: z.string().optional(),
    urgency: z.enum(["default", "urgent"]).optional(),
    icon_key: z.string().optional(),
  },
  build: ({ name, ...data }) => ({ name, data }),
});

const createDialogue = creator({
  name: "create_dialogue",
  title: "Create dialogue",
  description: "Create a dialogue resource (prompt shown to the player).",
  kind: "dialogue",
  inputSchema: {
    name: z.string().min(1),
    text: z.string().min(1),
    title_text: z.string().optional(),
    responses: z.array(z.string()).optional(),
  },
  build: ({ name, ...data }) => ({ name, data }),
});

const createCareer = creator({
  name: "create_career",
  title: "Create career",
  description: "Create a career resource in a project.",
  kind: "career",
  inputSchema: { name: z.string().min(1), ...careerFields },
  build: ({ name, ...data }) => ({ name, data }),
});

const createCareerLevel = creator({
  name: "create_career_level",
  title: "Create career level",
  description: "Create a career level attached to an existing career resource.",
  kind: "career_level",
  inputSchema: {
    career_id: uuid,
    name: z.string().min(1),
    level: z.number().int(),
    salary: z.number().optional(),
    work_days: z.array(z.string()).optional(),
    start_hour: z.number().optional(),
    end_hour: z.number().optional(),
    promotion_notes: z.string().optional(),
  },
  build: ({ name, career_id, ...data }) => ({ name, parentId: career_id, data }),
});

const addLocalizedString = creator({
  name: "add_localized_string",
  title: "Add localized string",
  description: "Add an STBL localized string to a project.",
  kind: "string",
  inputSchema: {
    key: z.string().min(1),
    value: z.string().min(1),
    locale: z.string().optional(),
  },
  build: ({ key, value, locale }) => ({
    name: key,
    data: { key, value, locale: locale ?? "en-US" },
  }),
});

const linkResources = defineTool({
  name: "link_resources",
  title: "Link resources",
  description: "Create a typed link between two resources in the same project (e.g. trait → buff).",
  inputSchema: {
    project_id: uuid,
    from_resource_id: uuid,
    to_resource_id: uuid,
    relation: z.string().min(1),
  },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: handler<any>("resources.update", (a, s) =>
    svc.linkResources(s.ctx, {
      projectId: a.project_id,
      fromResourceId: a.from_resource_id,
      toResourceId: a.to_resource_id,
      relation: a.relation,
    }),
  ),
});

/* ---------------------------------------------------------------- */
/* validation & builds                                               */
/* ---------------------------------------------------------------- */

const validateResource = defineTool({
  name: "validate_resource",
  title: "Validate resource",
  description: "Validate one resource and return its issues.",
  inputSchema: { resource_id: uuid },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: handler<{ resource_id: string }>("projects.validate", (a, s) =>
    svc.validateResource(s.ctx, a.resource_id),
  ),
});

const validateProject = defineTool({
  name: "validate_project",
  title: "Validate project",
  description: "Validate every resource in a project and return errors and warnings.",
  inputSchema: { project_id: uuid },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: handler<{ project_id: string }>("projects.validate", (a, s) =>
    svc.validateProject(s.ctx, a.project_id),
  ),
});

const createBuildManifest = defineTool({
  name: "create_build_manifest",
  title: "Create build manifest",
  description: "Produce the build manifest for a project without compiling anything.",
  inputSchema: { project_id: uuid },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: handler<{ project_id: string }>("builds.read", (a, s) =>
    svc.createBuildManifest(s.ctx, a.project_id),
  ),
});

const requestProjectBuild = defineTool({
  name: "request_project_build",
  title: "Request project build",
  description:
    "Request a package build. Returns the honest state: a package is only produced when the compiler is connected.",
  inputSchema: { project_id: uuid, confirm: z.boolean() },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: handler<{ project_id: string; confirm: boolean }>("builds.request", async (a, s) => {
    if (!a.confirm)
      throw new svc.ServiceError("confirmation_required", "Ask the user to approve the build first.");
    return svc.requestProjectBuild(s.ctx, a.project_id);
  }),
});

const getBuildStatus = defineTool({
  name: "get_build_status",
  title: "Get build status",
  description: "Read the true status of a requested build.",
  inputSchema: { build_id: uuid },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: handler<{ build_id: string }>("builds.read", (a, s) =>
    svc.getBuildStatus(s.ctx, a.build_id),
  ),
});

const undoChangeSet = defineTool({
  name: "undo_change_set",
  title: "Undo change set",
  description: "Undo a previously recorded change set. Destructive — requires explicit approval.",
  inputSchema: { change_set_id: uuid, confirm: z.boolean() },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: handler<{ change_set_id: string; confirm: boolean }>("resources.update", async (a, s) => {
    if (!a.confirm)
      throw new svc.ServiceError("confirmation_required", "Ask the user to approve the undo first.");
    return svc.undoChangeSet(s.ctx, a.change_set_id);
  }),
});

export const tools = [
  listProjects,
  getProject,
  getActiveProject,
  setActiveProject,
  createProject,
  listProjectResources,
  getResource,
  createTrait,
  updateTrait,
  createBuff,
  updateBuff,
  createInteraction,
  updateInteraction,
  createNotification,
  createDialogue,
  createCareer,
  createCareerLevel,
  addLocalizedString,
  linkResources,
  validateResource,
  validateProject,
  createBuildManifest,
  requestProjectBuild,
  getBuildStatus,
  undoChangeSet,
];
