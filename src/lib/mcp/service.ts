/**
 * MCP ⇄ application service bridge.
 *
 * The MCP tools never touch the database directly: they build a
 * user-scoped Supabase client from the verified OAuth bearer token and
 * call the shared service layer in `src/lib/server/mod-service.ts`.
 *
 * Import-safe: no env reads or I/O at module scope.
 */

import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";
import {
  ServiceError,
  getOrCreateConnection,
  assertPermission,
  type Permission,
  type ServiceCtx,
} from "@/lib/server/mod-service";

type RuntimeGlobals = typeof globalThis & {
  Deno?: { env?: { get?: (name: string) => string | undefined } };
  process?: { env?: Record<string, string | undefined> };
};

function runtimeEnv(name: string): string | undefined {
  const runtime = globalThis as RuntimeGlobals;
  return runtime.Deno?.env?.get?.(name) ?? runtime.process?.env?.[name];
}

function configuredEnv(names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = runtimeEnv(name)?.trim();
    if (value) return value;
  }
  return undefined;
}

function supabaseProjectUrl(): string {
  const url = configuredEnv(["SUPABASE_URL", "VITE_SUPABASE_URL"]);
  if (!url) throw new ServiceError("config", "SUPABASE_URL is not configured.");
  return url;
}

function supabasePublishableKey(): string {
  const direct = configuredEnv(["SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY"]);
  if (direct) return direct;
  const keyset = runtimeEnv("SUPABASE_PUBLISHABLE_KEYS");
  if (keyset) {
    try {
      const parsed: unknown = JSON.parse(keyset);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const keys = parsed as Record<string, unknown>;
        const key = [keys.default, ...Object.values(keys)]
          .find((v): v is string => typeof v === "string" && v.trim().startsWith("sb_publishable_"))
          ?.trim();
        if (key) return key;
      }
    } catch {
      /* fall through */
    }
  }
  const legacy = configuredEnv(["SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"]);
  if (legacy) return legacy;
  throw new ServiceError("config", "Supabase publishable key is not configured.");
}

function isOpaqueKey(value: string) {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

/** User-scoped client: RLS runs as the signed-in Mod Constructor account. */
export function supabaseForUser(token: string) {
  const url = supabaseProjectUrl();
  const key = supabasePublishableKey();
  return createClient(url, key, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (isOpaqueKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        headers.set("apikey", key);
        return fetch(input as any, { ...init, headers });
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type McpSession = {
  ctx: ServiceCtx;
  connection: {
    id: string;
    permissions: string[] | null;
    active_project_id: string | null;
  };
};

/** Verify the OAuth token, resolve the ChatGPT connection record. */
export async function openSession(toolCtx: ToolContext): Promise<McpSession> {
  if (!toolCtx.isAuthenticated())
    throw new ServiceError("unauthorized", "Connect your Mod Constructor account first.");
  const token = toolCtx.getToken();
  const userId = toolCtx.getUserId();
  if (!token || !userId)
    throw new ServiceError("unauthorized", "Missing a verified Mod Constructor identity.");

  const supabase = supabaseForUser(token);
  const base: ServiceCtx = { supabase, userId, source: "chatgpt", connectionId: null };
  const connection = await getOrCreateConnection(base, {
    clientId: toolCtx.getClientId() ?? "chatgpt",
    clientName: "ChatGPT",
  });
  return {
    ctx: { ...base, connectionId: connection.id },
    connection: connection as McpSession["connection"],
  };
}

export function requirePermission(session: McpSession, permission: Permission) {
  assertPermission(session.connection, permission);
}

export function ok(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload as Record<string, unknown>,
  };
}

export function fail(error: unknown) {
  const code = error instanceof ServiceError ? error.code : "unexpected_error";
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: code, message }, null, 2) }],
    structuredContent: { error: code, message },
    isError: true as const,
  };
}
