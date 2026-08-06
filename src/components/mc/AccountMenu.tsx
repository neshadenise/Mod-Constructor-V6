import { useEffect, useState } from "react";
import {
  LogIn,
  LogOut,
  Cloud,
  CloudOff,
  UserRound,
  ChevronDown,
  RefreshCw,
  KeyRound,
  Check,
  X,
} from "lucide-react";
import { useAccount, SYNC_LABEL, initials } from "@/lib/account";
import { useCloudSync } from "@/lib/cloud-sync";
import { useNotifications } from "@/lib/notifications";
import { checkPassword, PASSWORD_RULES } from "@/lib/password";
import { cn } from "@/lib/utils";

type Panel = "menu" | "signin" | "signup" | "profile" | "password" | "forgot";

export function AccountMenu() {
  const {
    account,
    syncState,
    signIn,
    signUp,
    signOut,
    updateProfile,
    updatePassword,
    sendPasswordReset,
  } = useAccount();
  const sync = useCloudSync();
  const { push } = useNotifications();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("menu");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (account) {
      setName(account.displayName);
      setEmail(account.email);
    }
  }, [account]);

  const reset = () => {
    setPanel("menu");
    setPassword("");
    setBusy(false);
  };

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const strength = checkPassword(password);

  const submitAuth = async () => {
    if (!emailValid) {
      push({ kind: "error", title: "Enter a valid email address" });
      return;
    }
    // Strength rules apply to new passwords only — existing accounts may have
    // been created before the policy and must still be able to sign in.
    if (panel === "signup" && !strength.ok) {
      push({
        kind: "error",
        title: "Password is not strong enough",
        description: strength.failures.join(" · "),
      });
      return;
    }
    if (panel === "signin" && password.length === 0) {
      push({ kind: "error", title: "Enter your password" });
      return;
    }

    setBusy(true);
    try {
      if (panel === "signup") {
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
      reset();
      setOpen(false);
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

  const saveProfile = async () => {
    setBusy(true);
    try {
      await updateProfile({
        displayName: name,
        email: email.trim() !== account?.email ? email : undefined,
      });
      push({
        kind: "success",
        title: "Profile updated",
        description:
          email.trim() !== account?.email
            ? "Confirm the change from the email we just sent."
            : "Your creator profile has been saved.",
      });
      setPanel("menu");
    } catch (err) {
      push({
        kind: "error",
        title: "Could not update profile",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    if (!strength.ok) {
      push({
        kind: "error",
        title: "Password is not strong enough",
        description: strength.failures.join(" · "),
      });
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      push({ kind: "success", title: "Password changed" });
      reset();
    } catch (err) {
      push({
        kind: "error",
        title: "Could not change password",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async () => {
    if (!emailValid) {
      push({ kind: "error", title: "Enter a valid email address" });
      return;
    }
    setBusy(true);
    try {
      await sendPasswordReset(email);
      push({
        kind: "success",
        title: "Reset link sent",
        description: `Check ${email.trim()} for a link to choose a new password.`,
      });
      setPanel("menu");
    } catch (err) {
      push({
        kind: "error",
        title: "Could not send reset link",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const doSignOut = async () => {
    await signOut();
    reset();
    setOpen(false);
    push({
      kind: "info",
      title: "Signed out",
      description: "The app keeps working offline. Projects stay on this device.",
    });
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
              {panel === "profile"
                ? "Profile settings"
                : panel === "password"
                  ? "Change password"
                  : panel === "forgot"
                    ? "Reset password"
                    : "Account"}
            </div>

            {account && panel === "menu" && (
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-semibold">{account.displayName}</div>
                  <div className="text-muted-foreground">{account.email}</div>
                </div>

                <div className="space-y-2 rounded-md border border-border bg-muted/40 p-2">
                  <p className="leading-relaxed text-muted-foreground">
                    {SYNC_LABEL[syncState]}
                    {sync.lastSyncedAt
                      ? ` · last sync ${new Date(sync.lastSyncedAt).toLocaleTimeString()}`
                      : ""}
                  </p>
                  <label className="flex cursor-pointer items-center justify-between gap-2">
                    <span className="font-semibold">Auto-sync workspace</span>
                    <input
                      type="checkbox"
                      checked={sync.autoSync}
                      onChange={(e) => sync.setAutoSync(e.target.checked)}
                      className="h-3.5 w-3.5 accent-[var(--teal)]"
                    />
                  </label>
                  <p className="text-[10.5px] leading-relaxed text-muted-foreground">
                    {sync.autoSync
                      ? "Changes upload a few seconds after you stop editing."
                      : "Auto-sync is off — use Sync now to upload manually."}
                  </p>
                  <button
                    onClick={() => void sync.syncNow()}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 font-semibold hover:bg-accent"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Sync now
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <MenuAction icon={<UserRound className="h-3.5 w-3.5" />} onClick={() => setPanel("profile")}>
                    Profile
                  </MenuAction>
                  <MenuAction icon={<KeyRound className="h-3.5 w-3.5" />} onClick={() => setPanel("password")}>
                    Password
                  </MenuAction>
                </div>

                <button
                  onClick={() => void doSignOut()}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 font-semibold hover:bg-accent"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </div>
            )}

            {account && panel === "profile" && (
              <div className="space-y-2">
                <Field label="Display name" value={name} onChange={setName} placeholder="Creator name" />
                <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" />
                <p className="text-[10.5px] leading-relaxed text-muted-foreground">
                  Your display name is used for exported mod credits and the creator prefix suggestion.
                </p>
                <Actions
                  busy={busy}
                  confirmLabel="Save profile"
                  onConfirm={() => void saveProfile()}
                  onCancel={reset}
                />
                <button
                  onClick={() => void doSignOut()}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 font-semibold hover:bg-accent"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </div>
            )}

            {account && panel === "password" && (
              <div className="space-y-2">
                <Field
                  label="New password"
                  value={password}
                  onChange={setPassword}
                  placeholder="At least 10 characters"
                  type="password"
                />
                <Rules value={password} />
                <Actions
                  busy={busy || !strength.ok}
                  confirmLabel="Change password"
                  onConfirm={() => void savePassword()}
                  onCancel={reset}
                />
                <button
                  onClick={() => setPanel("forgot")}
                  className="w-full pt-1 text-center text-[10.5px] text-muted-foreground hover:text-foreground"
                >
                  Email me a reset link instead
                </button>
              </div>
            )}

            {!account && (panel === "signin" || panel === "signup") && (
              <div className="space-y-2">
                <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" />
                {panel === "signup" && (
                  <Field label="Display name" value={name} onChange={setName} placeholder="Optional" />
                )}
                <Field
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  placeholder="At least 10 characters"
                  type="password"
                />
                {panel === "signup" && <Rules value={password} />}
                <Actions
                  busy={busy}
                  confirmLabel={panel === "signup" ? "Create account" : "Sign in"}
                  onConfirm={() => void submitAuth()}
                  onCancel={reset}
                />
                <button
                  onClick={() => setPanel(panel === "signup" ? "signin" : "signup")}
                  className="w-full pt-1 text-center text-[10.5px] text-muted-foreground hover:text-foreground"
                >
                  {panel === "signup"
                    ? "Already have an account? Sign in"
                    : "Need an account? Sign up"}
                </button>
                {panel === "signin" && (
                  <button
                    onClick={() => setPanel("forgot")}
                    className="w-full text-center text-[10.5px] text-muted-foreground hover:text-foreground"
                  >
                    Forgot your password?
                  </button>
                )}
              </div>
            )}

            {panel === "forgot" && (
              <div className="space-y-2">
                <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" />
                <p className="text-[10.5px] leading-relaxed text-muted-foreground">
                  We&apos;ll send a secure link that opens the password reset page.
                </p>
                <Actions
                  busy={busy}
                  confirmLabel="Send reset link"
                  onConfirm={() => void sendReset()}
                  onCancel={reset}
                />
              </div>
            )}

            {!account && panel === "menu" && (
              <div className="space-y-3">
                <p className="leading-relaxed text-muted-foreground">
                  You are using Mod Constructor offline as a guest. Everything works — projects are
                  saved on this computer only. Sign in to carry your workspace to another device.
                </p>
                <button
                  onClick={() => setPanel("signin")}
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

function MenuAction({
  icon,
  children,
  onClick,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 font-semibold hover:bg-accent"
    >
      {icon}
      {children}
    </button>
  );
}

function Actions({
  busy,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  busy: boolean;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex gap-2 pt-1">
      <button
        disabled={busy}
        onClick={onConfirm}
        className="flex-1 rounded-md bg-[var(--teal)] px-2 py-1.5 font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {confirmLabel}
      </button>
      <button onClick={onCancel} className="rounded-md border border-border px-2 py-1.5 hover:bg-accent">
        Cancel
      </button>
    </div>
  );
}

function Rules({ value }: { value: string }) {
  return (
    <ul className="space-y-0.5">
      {PASSWORD_RULES.map((rule) => {
        const pass = rule.test(value);
        return (
          <li
            key={rule.id}
            className={cn(
              "flex items-center gap-1.5 text-[10.5px]",
              pass ? "text-[var(--green)]" : "text-muted-foreground",
            )}
          >
            {pass ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            {rule.label}
          </li>
        );
      })}
    </ul>
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
