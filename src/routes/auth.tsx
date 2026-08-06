import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { checkPassword, PASSWORD_RULES } from "@/lib/password";


function safeNext(value: unknown): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ next: safeNext(s.next) }),
  head: () => ({
    meta: [
      { title: "Sign in · Mod Constructor Account" },
      {
        name: "description",
        content:
          "Sign in or create a Mod Constructor account to own your Sims 4 mod projects, resources, builds, and ChatGPT connections.",
      },
      { property: "og:title", content: "Sign in · Mod Constructor Account" },
      {
        property: "og:description",
        content: "Your Mod Constructor account owns your projects, builds, and ChatGPT authorizations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.replace(next);
    });
  }, [next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const check = checkPassword(password);
        if (!check.ok) {
          toast.error(`Password is not strong enough: ${check.failures.join(" · ")}`);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + next },
        });
        if (error) throw error;
        toast.success("Account created. Check your email if confirmation is required.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) window.location.replace(next);
      else navigate({ to: "/auth", search: { next } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    if (!email) {
      toast.error("Enter your email first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success(`Reset link sent to ${email}.`);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm p-6 space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Mod Constructor account</h1>
          <p className="text-sm text-muted-foreground">
            Your account owns your projects, resources, builds, and ChatGPT authorizations. This is
            not your ChatGPT login.
          </p>
        </div>
        <form className="space-y-3" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} required onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              required
              minLength={mode === "signup" ? 10 : 1}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {mode === "signup" && (
            <ul className="space-y-1">
              {PASSWORD_RULES.map((rule) => {
                const pass = rule.test(password);
                return (
                  <li
                    key={rule.id}
                    className={`text-[11px] ${pass ? "text-[var(--green)]" : "text-muted-foreground"}`}
                  >
                    {pass ? "✓" : "•"} {rule.label}
                  </li>
                );
              })}
            </ul>
          )}
          <Button className="w-full" type="submit" disabled={busy}>
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
          onClick={() => void forgot()}
        >
          Forgot your password?
        </button>

      </Card>
    </main>
  );
}
