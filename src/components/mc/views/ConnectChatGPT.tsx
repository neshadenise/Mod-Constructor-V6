import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PERMISSIONS, PERMISSION_LABELS, type Permission } from "@/lib/permissions";
import {
  listMyProjects,
  listMyConnections,
  setConnectionProject,
  setConnectionPermissions,
  revokeConnection,
  listProjectActivity,
  undoProjectChangeSet,
  createMyProject,
} from "@/lib/cloud.functions";
import { Plug, ShieldCheck, RotateCcw, Loader2, ExternalLink } from "lucide-react";

type ProjectRow = { id: string; name: string; status: string; version: string };
type ConnectionRow = {
  id: string;
  client_name: string;
  client_id: string | null;
  permissions: string[] | null;
  active_project_id: string | null;
  authorized_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

function mcpUrl() {
  if (typeof window === "undefined") return "/mcp";
  return new URL("/mcp", window.location.origin).toString();
}

export function ConnectChatGPT() {
  const [session, setSession] = useState<{ email?: string } | null | undefined>(undefined);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useServerFn(listMyProjects);
  const fetchConnections = useServerFn(listMyConnections);
  const saveProject = useServerFn(setConnectionProject);
  const savePermissions = useServerFn(setConnectionPermissions);
  const revoke = useServerFn(revokeConnection);
  const newProject = useServerFn(createMyProject);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([fetchProjects({}), fetchConnections({})]);
      setProjects(p as ProjectRow[]);
      setConnections(c as ConnectionRow[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load your account data");
    } finally {
      setLoading(false);
    }
  }, [fetchProjects, fetchConnections]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ? { email: data.session.user.email ?? undefined } : null);
      if (data.session) void reload();
      else setLoading(false);
    });
  }, [reload]);

  const live = connections.filter((c) => !c.revoked_at);

  if (session === undefined) {
    return <Loading />;
  }

  if (session === null) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Header />
        <Card className="p-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            Sign in to your Mod Constructor account to manage ChatGPT access. Your Mod Constructor
            account is separate from ChatGPT — we never ask for your ChatGPT password or an API key.
          </p>
          <Button asChild>
            <a href="/auth?next=/">Sign in or create an account</a>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Header email={session.email} />
      <Tabs defaultValue="connection">
        <TabsList>
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="activity">ChatGPT Activity</TabsTrigger>
          <TabsTrigger value="how">How to connect</TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="space-y-4 pt-4">
          {loading && <Loading />}

          {!loading && live.length === 0 && (
            <Card className="p-6 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Plug className="h-4 w-4" /> Not connected
              </div>
              <p className="text-sm text-muted-foreground">
                No ChatGPT connection has been authorized yet. Add Mod Constructor as a connector in
                ChatGPT using the URL below — ChatGPT will send you back here to sign in and approve
                the permissions.
              </p>
              <ConnectButton />
            </Card>
          )}

          {live.map((c) => (
            <ConnectionCard
              key={c.id}
              connection={c}
              projects={projects}
              onSetProject={async (projectId) => {
                await saveProject({ data: { connectionId: c.id, projectId } });
                toast.success("Active project updated");
                void reload();
              }}
              onSetPermissions={async (permissions) => {
                await savePermissions({ data: { connectionId: c.id, permissions } });
                toast.success("Permissions updated");
                void reload();
              }}
              onRevoke={async () => {
                await revoke({ data: { connectionId: c.id } });
                toast.success("Access revoked");
                void reload();
              }}
            />
          ))}

          {projects.length === 0 && !loading && (
            <Card className="p-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                You have no cloud projects yet. ChatGPT can only act on projects in your account.
              </p>
              <Button
                size="sm"
                onClick={async () => {
                  await newProject({ data: { name: "My First Mod" } });
                  toast.success("Project created");
                  void reload();
                }}
              >
                Create a project
              </Button>
            </Card>
          )}

          <PrivacyCard />
        </TabsContent>

        <TabsContent value="activity" className="pt-4">
          <ActivityPanel projects={projects} />
        </TabsContent>

        <TabsContent value="how" className="pt-4">
          <Instructions />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  );
}

function Header({ email }: { email?: string }) {
  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold tracking-tight">Connect to ChatGPT</h1>
      <p className="text-sm text-muted-foreground">
        Connect your Mod Constructor account to ChatGPT so it can build mods in the projects you
        authorize. The AI conversation runs in your own ChatGPT account and uses your own ChatGPT
        allowance — Mod Constructor never uses an OpenAI API key or shared AI credits.
        {email ? ` Signed in as ${email}.` : ""}
      </p>
    </div>
  );
}

function ConnectButton() {
  const url = mcpUrl();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        onClick={() => {
          void navigator.clipboard.writeText(url);
          toast.success("MCP server URL copied");
        }}
      >
        Copy connection URL
      </Button>
      <code className="rounded bg-muted px-2 py-1 text-xs">{url}</code>
      <Button variant="outline" asChild>
        <a href="https://chatgpt.com/#settings/Connectors/Advanced" target="_blank" rel="noreferrer">
          Open ChatGPT connectors <ExternalLink className="ml-1 h-3.5 w-3.5" />
        </a>
      </Button>
    </div>
  );
}

function ConnectionCard({
  connection,
  projects,
  onSetProject,
  onSetPermissions,
  onRevoke,
}: {
  connection: ConnectionRow;
  projects: ProjectRow[];
  onSetProject: (projectId: string) => Promise<void>;
  onSetPermissions: (permissions: string[]) => Promise<void>;
  onRevoke: () => Promise<void>;
}) {
  const granted = new Set(connection.permissions ?? []);
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{connection.client_name}</span>
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="h-3 w-3" /> Connected
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Authorized {new Date(connection.authorized_at).toLocaleString()}
            {connection.last_used_at
              ? ` · last used ${new Date(connection.last_used_at).toLocaleString()}`
              : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void onRevoke()}>
            Disconnect
          </Button>
          <Button variant="destructive" size="sm" onClick={() => void onRevoke()}>
            Revoke access
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Permissions
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PERMISSIONS.map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={granted.has(p)}
                onCheckedChange={(checked) => {
                  const next = new Set(granted);
                  if (checked) next.add(p);
                  else next.delete(p);
                  void onSetPermissions(Array.from(next));
                }}
              />
              {PERMISSION_LABELS[p as Permission]}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Destructive actions (undo, build requests) always require explicit approval in the
          conversation before they run.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Active project for this connection
        </p>
        <Select
          value={connection.active_project_id ?? undefined}
          onValueChange={(v) => void onSetProject(v)}
        >
          <SelectTrigger className="w-[320px]">
            <SelectValue placeholder="No project selected" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} · v{p.version}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          ChatGPT never guesses a project. It reads this selection, or asks you to choose.
        </p>
      </div>
    </Card>
  );
}

function PrivacyCard() {
  return (
    <Card className="p-5 space-y-2">
      <p className="text-sm font-semibold">Privacy</p>
      <ul className="space-y-1 text-sm text-muted-foreground">
        <li>• ChatGPT only sees data from the projects you authorize on this page.</li>
        <li>• We never ask for or store your ChatGPT password or an OpenAI API key.</li>
        <li>• Authorization is OAuth: only hashed/encrypted grant records are stored by the auth server.</li>
        <li>• Every tool call is logged as a change set you can inspect and undo.</li>
        <li>• Database and compiler credentials are never exposed to ChatGPT.</li>
      </ul>
    </Card>
  );
}

function Instructions() {
  const url = mcpUrl();
  return (
    <Card className="p-5 space-y-3 text-sm">
      <p className="font-semibold">Connect in ChatGPT</p>
      <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
        <li>Open ChatGPT settings → Connectors → Advanced, and enable developer mode.</li>
        <li>Choose “Create app” / add a custom connector.</li>
        <li>
          Paste this MCP server URL: <code className="rounded bg-muted px-1.5 py-0.5">{url}</code>
        </li>
        <li>ChatGPT sends you to Mod Constructor to sign in and approve permissions.</li>
        <li>Enable the connector in the composer, then ask ChatGPT to work on your project.</li>
      </ol>
      <p className="text-muted-foreground">
        Example: “Create a Fashion Critic trait in my Vivienne project.” ChatGPT will locate the
        authorized project, inspect it, propose the trait, buffs, interactions, and strings, ask for
        approval, call the tools, validate, and report exactly what was created.
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Activity panel                                                      */
/* ------------------------------------------------------------------ */

type ChangeSet = {
  id: string;
  tool_name: string;
  tool_args: any;
  result: string;
  message: string | null;
  created_at: string;
  undone_at: string | null;
  connection_id: string | null;
  undo_payload: any;
  new_state: any;
};

export function ActivityPanel({ projects }: { projects: ProjectRow[] }) {
  const [projectId, setProjectId] = useState<string | undefined>(projects[0]?.id);
  const [data, setData] = useState<{
    changeSets: ChangeSet[];
    connections: { id: string; client_name: string }[];
    builds: any[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const fetchActivity = useServerFn(listProjectActivity);
  const undo = useServerFn(undoProjectChangeSet);

  useEffect(() => {
    if (!projectId && projects[0]) setProjectId(projects[0].id);
  }, [projects, projectId]);

  const load = useCallback(async () => {
    if (!projectId) return;
    setBusy(true);
    try {
      setData((await fetchActivity({ data: { projectId } })) as any);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load activity");
    } finally {
      setBusy(false);
    }
  }, [projectId, fetchActivity]);

  useEffect(() => {
    void load();
  }, [load]);

  const connectionName = useMemo(() => {
    const map = new Map((data?.connections ?? []).map((c) => [c.id, c.client_name]));
    return (id: string | null) => (id ? (map.get(id) ?? "ChatGPT") : "Website");
  }, [data]);

  if (projects.length === 0)
    return <Card className="p-5 text-sm text-muted-foreground">No cloud projects yet.</Card>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={busy}>
          Refresh
        </Button>
      </div>

      {data?.builds?.length ? (
        <Card className="p-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Build requests
          </p>
          {data.builds.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 text-sm">
              <span>
                <Badge variant="secondary">{b.status}</Badge>{" "}
                <span className="text-muted-foreground">{b.message}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(b.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </Card>
      ) : null}

      <Card className="divide-y">
        {(data?.changeSets ?? []).length === 0 && (
          <div className="p-5 text-sm text-muted-foreground">
            No recorded operations for this project yet.
          </div>
        )}
        {(data?.changeSets ?? []).map((cs) => (
          <div key={cs.id} className="flex items-start justify-between gap-4 p-4">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{cs.tool_name}</code>
                <Badge variant={cs.result === "ok" ? "secondary" : "outline"}>{cs.result}</Badge>
                {cs.undone_at && <Badge variant="outline">undone</Badge>}
                <span className="text-xs text-muted-foreground">
                  {connectionName(cs.connection_id)} · {new Date(cs.created_at).toLocaleString()}
                </span>
              </div>
              {cs.message && <p className="text-xs text-muted-foreground">{cs.message}</p>}
              <p className="truncate text-xs text-muted-foreground">
                change set {cs.id}
              </p>
            </div>
            {!cs.undone_at && cs.undo_payload && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await undo({ data: { changeSetId: cs.id } });
                    toast.success("Change undone");
                    void load();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Undo failed");
                  }
                }}
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Undo
              </Button>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}
