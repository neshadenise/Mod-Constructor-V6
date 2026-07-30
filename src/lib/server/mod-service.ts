/**
 * Mod Constructor application service layer.
 *
 * This is the single source of truth for project / resource / build
 * operations. Both the website (server functions) and the MCP server
 * (ChatGPT) call into these functions — no business logic is duplicated
 * in an MCP route.
 *
 * Every call receives an already-authenticated Supabase client scoped to
 * the acting user, so RLS enforces ownership on top of the explicit
 * ownership checks below.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type ServiceSource = "web" | "chatgpt";

export type ServiceCtx = {
  supabase: SupabaseClient<any, any, any>;
  userId: string;
  /** ChatGPT connection performing the action (null for website actions). */
  connectionId?: string | null;
  source: ServiceSource;
};

export class ServiceError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export const RESOURCE_KINDS = [
  "trait",
  "buff",
  "interaction",
  "notification",
  "dialogue",
  "career",
  "career_level",
  "string",
] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];

export const PERMISSIONS = [
  "projects.read",
  "resources.create",
  "resources.update",
  "projects.validate",
  "builds.request",
  "builds.read",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  "projects.read": "View authorized projects",
  "resources.create": "Create project resources",
  "resources.update": "Edit project resources",
  "projects.validate": "Validate projects",
  "builds.request": "Request package builds",
  "builds.read": "Read build results",
};

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function unwrap<T>(
  res: { data: T | null; error: { message: string } | null },
  what: string,
): any {
  if (res.error) throw new ServiceError("database_error", `${what}: ${res.error.message}`);
  if (res.data === null || res.data === undefined)
    throw new ServiceError("not_found", `${what}: not found`);
  return res.data as any;
}

export async function assertProjectOwned(ctx: ServiceCtx, projectId: string) {
  const { data, error } = await ctx.supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("owner_id", ctx.userId)
    .maybeSingle();
  if (error) throw new ServiceError("database_error", error.message);
  if (!data) throw new ServiceError("project_not_found", "No such project for this account.");
  return data;
}

/** Record one tool invocation as an undoable change set. */
export async function recordChange(
  ctx: ServiceCtx,
  input: {
    projectId: string | null;
    toolName: string;
    toolArgs: unknown;
    previousState?: unknown;
    newState?: unknown;
    undoPayload?: unknown;
    result?: string;
    message?: string;
  },
) {
  const { data, error } = await ctx.supabase
    .from("change_sets")
    .insert({
      user_id: ctx.userId,
      project_id: input.projectId,
      connection_id: ctx.connectionId ?? null,
      source: ctx.source,
      tool_name: input.toolName,
      tool_args: (input.toolArgs ?? {}) as any,
      previous_state: (input.previousState ?? null) as any,
      new_state: (input.newState ?? null) as any,
      undo_payload: (input.undoPayload ?? null) as any,
      result: input.result ?? "ok",
      message: input.message ?? null,
    })
    .select("id")
    .single();
  if (error) throw new ServiceError("database_error", error.message);
  return data.id as string;
}

/* ------------------------------------------------------------------ */
/* projects                                                            */
/* ------------------------------------------------------------------ */

export async function listProjects(ctx: ServiceCtx) {
  const { data, error } = await ctx.supabase
    .from("projects")
    .select("id, name, description, status, version, updated_at")
    .eq("owner_id", ctx.userId)
    .order("updated_at", { ascending: false });
  if (error) throw new ServiceError("database_error", error.message);
  return data ?? [];
}

export async function getProject(ctx: ServiceCtx, projectId: string) {
  const project = await assertProjectOwned(ctx, projectId);
  const { data: resources } = await ctx.supabase
    .from("resources")
    .select("id, kind, name, parent_id, updated_at")
    .eq("project_id", projectId);
  return { project, resources: resources ?? [] };
}

export async function createProject(
  ctx: ServiceCtx,
  input: { name: string; description?: string },
) {
  const row = unwrap(
    await ctx.supabase
      .from("projects")
      .insert({ owner_id: ctx.userId, name: input.name, description: input.description ?? "" })
      .select("*")
      .single(),
    "create project",
  );
  const changeSetId = await recordChange(ctx, {
    projectId: row.id,
    toolName: "create_project",
    toolArgs: input,
    newState: row,
    undoPayload: { op: "delete", table: "projects", id: row.id },
  });
  return { project: row, changeSetId };
}

/* ------------------------------------------------------------------ */
/* resources                                                           */
/* ------------------------------------------------------------------ */

export async function listProjectResources(
  ctx: ServiceCtx,
  projectId: string,
  kind?: ResourceKind,
) {
  await assertProjectOwned(ctx, projectId);
  let q = ctx.supabase
    .from("resources")
    .select("id, kind, name, parent_id, data, updated_at")
    .eq("project_id", projectId);
  if (kind) q = q.eq("kind", kind);
  const { data, error } = await q.order("created_at", { ascending: true });
  if (error) throw new ServiceError("database_error", error.message);
  return data ?? [];
}

export async function getResource(ctx: ServiceCtx, resourceId: string) {
  const { data, error } = await ctx.supabase
    .from("resources")
    .select("*")
    .eq("id", resourceId)
    .eq("owner_id", ctx.userId)
    .maybeSingle();
  if (error) throw new ServiceError("database_error", error.message);
  if (!data) throw new ServiceError("resource_not_found", "No such resource for this account.");
  return data;
}

export async function createResource(
  ctx: ServiceCtx,
  input: {
    projectId: string;
    kind: ResourceKind;
    name: string;
    parentId?: string | null;
    data?: Record<string, unknown>;
    toolName: string;
    toolArgs?: unknown;
  },
) {
  await assertProjectOwned(ctx, input.projectId);
  if (input.parentId) {
    const parent = await getResource(ctx, input.parentId);
    if (parent.project_id !== input.projectId)
      throw new ServiceError("invalid_parent", "Parent resource belongs to a different project.");
  }
  const row = unwrap(
    await ctx.supabase
      .from("resources")
      .insert({
        project_id: input.projectId,
        owner_id: ctx.userId,
        kind: input.kind,
        name: input.name,
        parent_id: input.parentId ?? null,
        data: (input.data ?? {}) as any,
      })
      .select("*")
      .single(),
    "create resource",
  );
  const changeSetId = await recordChange(ctx, {
    projectId: input.projectId,
    toolName: input.toolName,
    toolArgs: input.toolArgs ?? input,
    newState: row,
    undoPayload: { op: "delete", table: "resources", id: row.id },
  });
  return { resource: row, changeSetId };
}

export async function updateResource(
  ctx: ServiceCtx,
  input: {
    resourceId: string;
    name?: string;
    data?: Record<string, unknown>;
    expectedKind?: ResourceKind;
    toolName: string;
    toolArgs?: unknown;
  },
) {
  const previous = await getResource(ctx, input.resourceId);
  if (input.expectedKind && previous.kind !== input.expectedKind)
    throw new ServiceError(
      "wrong_kind",
      `Resource ${input.resourceId} is a ${previous.kind}, not a ${input.expectedKind}.`,
    );
  const nextData = { ...(previous.data as Record<string, unknown>), ...(input.data ?? {}) };
  const row = unwrap(
    await ctx.supabase
      .from("resources")
      .update({ name: input.name ?? previous.name, data: nextData as any })
      .eq("id", input.resourceId)
      .select("*")
      .single(),
    "update resource",
  );
  const changeSetId = await recordChange(ctx, {
    projectId: previous.project_id,
    toolName: input.toolName,
    toolArgs: input.toolArgs ?? input,
    previousState: previous,
    newState: row,
    undoPayload: {
      op: "restore",
      table: "resources",
      id: previous.id,
      values: { name: previous.name, data: previous.data },
    },
  });
  return { resource: row, changeSetId };
}

export async function linkResources(
  ctx: ServiceCtx,
  input: { projectId: string; fromResourceId: string; toResourceId: string; relation: string },
) {
  await assertProjectOwned(ctx, input.projectId);
  const from = await getResource(ctx, input.fromResourceId);
  const to = await getResource(ctx, input.toResourceId);
  if (from.project_id !== input.projectId || to.project_id !== input.projectId)
    throw new ServiceError("invalid_link", "Both resources must belong to the given project.");
  const row = unwrap(
    await ctx.supabase
      .from("resource_links")
      .insert({
        project_id: input.projectId,
        owner_id: ctx.userId,
        from_resource: input.fromResourceId,
        to_resource: input.toResourceId,
        relation: input.relation,
      })
      .select("*")
      .single(),
    "link resources",
  );
  const changeSetId = await recordChange(ctx, {
    projectId: input.projectId,
    toolName: "link_resources",
    toolArgs: input,
    newState: row,
    undoPayload: { op: "delete", table: "resource_links", id: row.id },
  });
  return { link: row, changeSetId };
}

/* ------------------------------------------------------------------ */
/* validation                                                          */
/* ------------------------------------------------------------------ */

export type ValidationIssue = { level: "error" | "warning"; field: string; message: string };

export function validateResourceRow(row: {
  kind: string;
  name: string;
  data: Record<string, unknown>;
}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const data = row.data ?? {};
  const str = (k: string) => (typeof data[k] === "string" ? (data[k] as string) : "");

  if (!row.name.trim()) issues.push({ level: "error", field: "name", message: "Name is required." });

  switch (row.kind) {
    case "trait":
      if (!str("description"))
        issues.push({ level: "warning", field: "description", message: "Traits should have a CAS description." });
      if (!str("trait_type"))
        issues.push({ level: "warning", field: "trait_type", message: "No trait type set (personality / gameplay)." });
      break;
    case "buff":
      if (!str("mood"))
        issues.push({ level: "error", field: "mood", message: "A buff needs an emotion / mood." });
      break;
    case "interaction":
      if (!str("interaction_type"))
        issues.push({ level: "warning", field: "interaction_type", message: "No interaction type set." });
      break;
    case "career":
      if (!data.levels && !str("description"))
        issues.push({ level: "warning", field: "description", message: "Career has no description." });
      break;
    case "career_level":
      if (typeof data.level !== "number")
        issues.push({ level: "error", field: "level", message: "Career level needs a numeric level." });
      if (typeof data.salary !== "number")
        issues.push({ level: "warning", field: "salary", message: "No salary set for this level." });
      break;
    case "notification":
    case "dialogue":
      if (!str("text"))
        issues.push({ level: "error", field: "text", message: "Text content is required." });
      break;
    case "string":
      if (!str("value"))
        issues.push({ level: "error", field: "value", message: "Localized string has no value." });
      if (!str("key"))
        issues.push({ level: "error", field: "key", message: "Localized string has no STBL key." });
      break;
  }
  return issues;
}

export async function validateResource(ctx: ServiceCtx, resourceId: string) {
  const row = await getResource(ctx, resourceId);
  const issues = validateResourceRow(row as any);
  return {
    resourceId,
    kind: row.kind,
    name: row.name,
    status: issues.some((i) => i.level === "error") ? "invalid" : "valid",
    issues,
  };
}

export async function validateProject(ctx: ServiceCtx, projectId: string) {
  const project = await assertProjectOwned(ctx, projectId);
  const rows = await listProjectResources(ctx, projectId);
  const results = rows.map((r: any) => ({
    resourceId: r.id,
    kind: r.kind,
    name: r.name,
    issues: validateResourceRow(r),
  }));
  const errors = results.reduce((n, r) => n + r.issues.filter((i) => i.level === "error").length, 0);
  const warnings = results.reduce((n, r) => n + r.issues.filter((i) => i.level === "warning").length, 0);
  return {
    projectId,
    projectName: project.name,
    resourceCount: rows.length,
    errors,
    warnings,
    status: errors === 0 ? "valid" : "invalid",
    results: results.filter((r) => r.issues.length > 0),
  };
}

/* ------------------------------------------------------------------ */
/* builds                                                              */
/* ------------------------------------------------------------------ */

/** Set to true only when a real .package compiler is wired in. */
export function isCompilerConnected(): boolean {
  return Boolean(process.env.MOD_PACKAGE_COMPILER_URL);
}

export async function createBuildManifest(ctx: ServiceCtx, projectId: string) {
  const project = await assertProjectOwned(ctx, projectId);
  const rows = await listProjectResources(ctx, projectId);
  const validation = await validateProject(ctx, projectId);
  const manifest = {
    manifestVersion: 1,
    project: { id: project.id, name: project.name, version: project.version },
    generatedAt: new Date().toISOString(),
    resources: rows.map((r: any) => ({ id: r.id, kind: r.kind, name: r.name })),
    counts: rows.reduce<Record<string, number>>((acc, r: any) => {
      acc[r.kind] = (acc[r.kind] ?? 0) + 1;
      return acc;
    }, {}),
    validation: { errors: validation.errors, warnings: validation.warnings },
    generatorSupported: rows.every((r: any) => (RESOURCE_KINDS as readonly string[]).includes(r.kind)),
  };
  return manifest;
}

export async function requestProjectBuild(ctx: ServiceCtx, projectId: string) {
  await assertProjectOwned(ctx, projectId);
  const manifest = await createBuildManifest(ctx, projectId);
  const validation = await validateProject(ctx, projectId);
  const compilerConnected = isCompilerConnected();
  const status = validation.errors > 0
    ? "blocked_validation"
    : compilerConnected
      ? "requested"
      : "compiler_unavailable";
  const message =
    validation.errors > 0
      ? `Project data exists but ${validation.errors} validation error(s) must be fixed before a build can run.`
      : compilerConnected
        ? "Build requested. The package compiler will report the result."
        : "Project data is ready, but package compilation is not connected.";

  const row = unwrap(
    await ctx.supabase
      .from("builds")
      .insert({
        project_id: projectId,
        user_id: ctx.userId,
        status,
        manifest: manifest as any,
        message,
      })
      .select("*")
      .single(),
    "request build",
  );
  await recordChange(ctx, {
    projectId,
    toolName: "request_project_build",
    toolArgs: { projectId },
    newState: { buildId: row.id, status },
    result: status,
    message,
  });
  return {
    buildId: row.id,
    status,
    packageCompiled: false,
    downloadUrl: null,
    message,
    manifest,
  };
}

export async function getBuildStatus(ctx: ServiceCtx, buildId: string) {
  const { data, error } = await ctx.supabase
    .from("builds")
    .select("*")
    .eq("id", buildId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (error) throw new ServiceError("database_error", error.message);
  if (!data) throw new ServiceError("build_not_found", "No such build for this account.");
  return {
    buildId: data.id,
    projectId: data.project_id,
    status: data.status,
    packageCompiled: data.status === "compiled",
    downloadUrl: data.artifact_path ?? null,
    message: data.message,
    requestedAt: data.created_at,
    completedAt: data.completed_at,
  };
}

/* ------------------------------------------------------------------ */
/* change sets / undo                                                  */
/* ------------------------------------------------------------------ */

export async function listChangeSets(ctx: ServiceCtx, projectId: string, limit = 100) {
  await assertProjectOwned(ctx, projectId);
  const { data, error } = await ctx.supabase
    .from("change_sets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new ServiceError("database_error", error.message);
  return data ?? [];
}

export async function undoChangeSet(ctx: ServiceCtx, changeSetId: string) {
  const { data: cs, error } = await ctx.supabase
    .from("change_sets")
    .select("*")
    .eq("id", changeSetId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (error) throw new ServiceError("database_error", error.message);
  if (!cs) throw new ServiceError("change_set_not_found", "No such change set for this account.");
  if (cs.undone_at) throw new ServiceError("already_undone", "This change set was already undone.");

  const payload = cs.undo_payload as
    | { op: "delete"; table: string; id: string }
    | { op: "restore"; table: string; id: string; values: Record<string, unknown> }
    | null;
  if (!payload) throw new ServiceError("not_undoable", "This change set cannot be undone.");

  const allowed = ["projects", "resources", "resource_links"];
  if (!allowed.includes(payload.table))
    throw new ServiceError("not_undoable", "Unsupported undo target.");

  if (payload.op === "delete") {
    const { error: delErr } = await ctx.supabase.from(payload.table).delete().eq("id", payload.id);
    if (delErr) throw new ServiceError("database_error", delErr.message);
  } else {
    const { error: updErr } = await ctx.supabase
      .from(payload.table)
      .update(payload.values as any)
      .eq("id", payload.id);
    if (updErr) throw new ServiceError("database_error", updErr.message);
  }

  await ctx.supabase
    .from("change_sets")
    .update({ undone_at: new Date().toISOString() })
    .eq("id", changeSetId);

  return { changeSetId, undone: true, tool: cs.tool_name };
}

/* ------------------------------------------------------------------ */
/* ChatGPT connections                                                 */
/* ------------------------------------------------------------------ */

export async function getOrCreateConnection(
  ctx: ServiceCtx,
  input: { clientId?: string | null; clientName?: string },
) {
  const clientId = input.clientId ?? "chatgpt";
  const { data: existing } = await ctx.supabase
    .from("chatgpt_connections")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("client_id", clientId)
    .is("revoked_at", null)
    .maybeSingle();
  if (existing) {
    await ctx.supabase
      .from("chatgpt_connections")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", existing.id);
    return existing;
  }
  return unwrap(
    await ctx.supabase
      .from("chatgpt_connections")
      .insert({
        user_id: ctx.userId,
        client_id: clientId,
        client_name: input.clientName ?? "ChatGPT",
        last_used_at: new Date().toISOString(),
      })
      .select("*")
      .single(),
    "create connection",
  );
}

export function assertPermission(
  connection: { permissions: string[] | null },
  permission: Permission,
) {
  const granted = connection.permissions ?? [];
  if (!granted.includes(permission))
    throw new ServiceError(
      "permission_denied",
      `This connection is not authorized to "${PERMISSION_LABELS[permission]}". Grant it on the Connect to ChatGPT page.`,
    );
}

export async function setActiveProject(ctx: ServiceCtx, connectionId: string, projectId: string) {
  await assertProjectOwned(ctx, projectId);
  const { error } = await ctx.supabase
    .from("chatgpt_connections")
    .update({ active_project_id: projectId })
    .eq("id", connectionId)
    .eq("user_id", ctx.userId);
  if (error) throw new ServiceError("database_error", error.message);
  return { connectionId, activeProjectId: projectId };
}
