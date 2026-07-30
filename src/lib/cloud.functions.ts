import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as svc from "@/lib/server/mod-service";

function ctxFrom(context: any): svc.ServiceCtx {
  return { supabase: context.supabase, userId: context.userId, source: "web", connectionId: null };
}

export const listMyProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => svc.listProjects(ctxFrom(context)));

export const createMyProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; description?: string }) => input)
  .handler(async ({ data, context }) => svc.createProject(ctxFrom(context), data));

export const listMyConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("chatgpt_connections")
      .select("*")
      .eq("user_id", context.userId)
      .order("authorized_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setConnectionProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { connectionId: string; projectId: string }) => input)
  .handler(async ({ data, context }) =>
    svc.setActiveProject(ctxFrom(context), data.connectionId, data.projectId),
  );

export const setConnectionPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { connectionId: string; permissions: string[] }) => input)
  .handler(async ({ data, context }) => {
    const allowed = data.permissions.filter((p) =>
      (svc.PERMISSIONS as readonly string[]).includes(p),
    );
    const { error } = await context.supabase
      .from("chatgpt_connections")
      .update({ permissions: allowed })
      .eq("id", data.connectionId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, permissions: allowed };
  });

export const revokeConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { connectionId: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("chatgpt_connections")
      .update({ revoked_at: new Date().toISOString(), permissions: [] })
      .eq("id", data.connectionId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listProjectActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data, context }) => {
    const ctx = ctxFrom(context);
    const [changeSets, connections, builds] = await Promise.all([
      svc.listChangeSets(ctx, data.projectId),
      context.supabase
        .from("chatgpt_connections")
        .select("id, client_name")
        .eq("user_id", context.userId),
      context.supabase
        .from("builds")
        .select("*")
        .eq("project_id", data.projectId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    return {
      changeSets,
      connections: connections.data ?? [],
      builds: builds.data ?? [],
    };
  });

export const undoProjectChangeSet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { changeSetId: string }) => input)
  .handler(async ({ data, context }) => svc.undoChangeSet(ctxFrom(context), data.changeSetId));

export const listProjectResourcesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data, context }) =>
    svc.listProjectResources(ctxFrom(context), data.projectId),
  );
