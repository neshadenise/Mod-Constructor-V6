import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { checkPassword, PASSWORD_RULES } from "@/lib/password";
import { Check, X } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset password · Mod Constructor" },
      {
        name: "description",
        content:
          "Choose a new password for your Mod Constructor account and get back to building your Sims 4 mods.",
      },
      { property: "og:title", content: "Reset password · Mod Constructor" },
      {
        property: "og:description",
        content: "Set a new password for your Mod Constructor creator account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const check = checkPassword(password);

  useEffect(() => {
    const hash = window.location.hash;
    const isRecovery = hash.includes("type=recovery");
    supabase.auth.getSession().then(({ data }) => {
      setRecovery(isRecovery || Boolean(data.session));
      setReady(true);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!check.ok) {
      toast.error("Password does not meet the requirements yet.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success("Password updated. You can continue building.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm p-6 space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Set a new password</h1>
          <p className="text-sm text-muted-foreground">
            Choose a strong password for your Mod Constructor account.
          </p>
        </div>

        {!ready ? (
          <p className="text-sm text-muted-foreground">Checking your reset link…</p>
        ) : done ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your password has been changed. You can close this tab and keep working.
            </p>
            <Button className="w-full" onClick={() => window.location.replace("/")}>
              Back to Mod Constructor
            </Button>
          </div>
        ) : !recovery ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This reset link is missing or has expired. Request a new one from the account menu.
            </p>
            <Button className="w-full" onClick={() => window.location.replace("/auth")}>
              Go to sign in
            </Button>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={submit}>
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <ul className="space-y-1">
              {PASSWORD_RULES.map((rule) => {
                const pass = rule.test(password);
                return (
                  <li
                    key={rule.id}
                    className={`flex items-center gap-1.5 text-[11px] ${
                      pass ? "text-[var(--green)]" : "text-muted-foreground"
                    }`}
                  >
                    {pass ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {rule.label}
                  </li>
                );
              })}
            </ul>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                required
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <Button className="w-full" type="submit" disabled={busy || !check.ok}>
              Update password
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}
