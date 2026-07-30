import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PERMISSION_LABELS, PERMISSIONS } from "@/lib/server/mod-service";

type OAuthClient = { name?: string; redirect_uri?: string };
type Details = {
  client?: OAuthClient;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};

const authOAuth = () =>
  (supabase.auth as unknown as {
    oauth: {
      getAuthorizationDetails: (id: string) => Promise<{ data: Details | null; error: any }>;
      approveAuthorization: (id: string) => Promise<{ data: Details | null; error: any }>;
      denyAuthorization: (id: string) => Promise<{ data: Details | null; error: any }>;
    };
  }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth", search: { next: location.pathname + location.searchStr } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await authOAuth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  errorComponent: ({ error }) => (
    <main className="min-h-screen grid place-items-center p-6 text-sm text-muted-foreground">
      Could not load this authorization request: {String((error as Error)?.message ?? error)}
    </main>
  ),
  component: Consent,
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "ChatGPT";

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error: err } = approve
      ? await authOAuth().approveAuthorization(authorization_id)
      : await authOAuth().denyAuthorization(authorization_id);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen grid place-items-center bg-background p-6">
      <Card className="w-full max-w-md p-6 space-y-5">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Connect {clientName} to Mod Constructor</h1>
          <p className="text-sm text-muted-foreground">
            This lets {clientName} use Mod Constructor as you, on the projects you authorize.
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Permissions requested
          </p>
          <ul className="space-y-1 text-sm">
            {PERMISSIONS.map((p) => (
              <li key={p} className="flex gap-2">
                <span aria-hidden>•</span>
                <span>{PERMISSION_LABELS[p]}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Destructive actions such as undo and build requests still require your explicit
            approval in the conversation. You can revoke this connection any time from Connect to
            ChatGPT.
          </p>
        </div>
        {details?.client?.redirect_uri && (
          <p className="text-xs text-muted-foreground break-all">
            Redirects to {details.client.redirect_uri}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
            Approve
          </Button>
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
            Cancel connection
          </Button>
        </div>
      </Card>
    </main>
  );
}
