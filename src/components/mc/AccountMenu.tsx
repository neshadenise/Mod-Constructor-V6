import { useState } from "react";
import { LogIn, LogOut, Cloud, CloudOff, UserRound, ChevronDown, RefreshCw } from "lucide-react";
import { useAccount, SYNC_LABEL, initials } from "@/lib/account";
import { useCloudSync } from "@/lib/cloud-sync";
import { useNotifications } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export function AccountMenu() {
  const { account, syncState, signIn, signUp, signOut } = useAccount();
  const sync = useCloudSync();
  const { push } = useNotifications();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<null | "signin" | "signup">(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      push({ kind: "error", title: "Enter a valid email address" });
      return;
    }
    if (password.length < 8) {
      push({ kind: "error", title: "Password must be at least 8 characters" });
      return;
    }
    setBusy(true);
    try {
      if (form === "signup") {
        await signUp(email, password, name);
        push({
          kind: "success",
          title: "Account created",
          description:
            "If email confirmation is required, click the link we sent before your workspace starts syncing.",
        });
      } else {
        await signIn(email, password);
        push({
          kind: "success",
          title: "Signed in",
          description: "Your workspace will sync so you can continue on another device.",
        });
      }
      setForm(null);
      setOpen(false);
      setEmail("");
      setName("");
      setPassword("");
    } catch (err) {
      push({
        kind: "error",
        title: "Sign in failed",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative ml-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1 text-left transition-colors hover:bg-accent"
        aria-label="Account"
      >
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white",
            account
              ? "bg-gradient-to-br from-[var(--violet)] to-[var(--blue)]"
              : "bg-muted-foreground/60",
          )}
        >
          {account ? initials(account.displayName) : <UserRound className="h-3.5 w-3.5" />}
        </div>
        <div className="hidden text-xs leading-tight sm:block">
          <div className="font-semibold">{account ? account.displayName : "Guest"}</div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {syncState === "synced" ? (
              <Cloud className="h-2.5 w-2.5 text-[var(--green)]" />
            ) : syncState === "syncing" ? (
              <RefreshCw className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <CloudOff className="h-2.5 w-2.5" />
            )}
            {account
              ? syncState === "synced"
                ? "Synced"
                : syncState === "syncing"
                  ? "Syncing"
                  : "Sync issue"
              : "Offline"}
          </div>
        </div>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-80 rounded-lg border border-border bg-popover p-3 text-xs shadow-xl">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Account
            </div>

            {account ? (
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-semibold">{account.displayName}</div>
                  <div className="text-muted-foreground">{account.email}</div>
                </div>
                <p className="rounded-md border border-border bg-muted/40 p-2 leading-relaxed text-muted-foreground">
                  {SYNC_LABEL[syncState]}
                  {sync.lastSyncedAt ? ` · last sync ${new Date(sync.lastSyncedAt).toLocaleTimeString()}` : ""}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => void sync.syncNow()}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 font-semibold hover:bg-accent"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Sync now
                  </button>
                  <button
                    onClick={async () => {
                      await signOut();
                      setOpen(false);
                      push({
                        kind: "info",
                        title: "Signed out",
                        description: "The app keeps working offline. Projects stay on this device.",
                      });
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 font-semibold hover:bg-accent"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign out
                  </button>
                </div>
              </div>
            ) : form ? (
              <div className="space-y-2">
                <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" />
                {form === "signup" && (
                  <Field label="Display name" value={name} onChange={setName} placeholder="Optional" />
                )}
                <Field
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  placeholder="At least 8 characters"
                  type="password"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    disabled={busy}
                    onClick={() => void submit()}
                    className="flex-1 rounded-md bg-[var(--teal)] px-2 py-1.5 font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {form === "signup" ? "Create account" : "Sign in"}
                  </button>
                  <button
                    onClick={() => setForm(null)}
                    className="rounded-md border border-border px-2 py-1.5 hover:bg-accent"
                  >
                    Cancel
                  </button>
                </div>
                <button
                  onClick={() => setForm(form === "signup" ? "signin" : "signup")}
                  className="w-full pt-1 text-center text-[10.5px] text-muted-foreground hover:text-foreground"
                >
                  {form === "signup" ? "Already have an account? Sign in" : "Need an account? Sign up"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="leading-relaxed text-muted-foreground">
                  You are using Mod Constructor offline as a guest. Everything works — projects are
                  saved on this computer only. Sign in to carry your workspace to another device.
                </p>
                <button
                  onClick={() => setForm("signin")}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-[var(--teal)] px-2 py-1.5 font-semibold text-white hover:opacity-90"
                >
                  <LogIn className="h-3.5 w-3.5" /> Sign in / create account
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-[var(--teal)]"
      />
    </label>
  );
}
