import { useState } from "react";
import { LogIn, LogOut, Cloud, CloudOff, UserRound, ChevronDown } from "lucide-react";
import { useAccount, SYNC_LABEL, SYNC_CONFIGURED, initials } from "@/lib/account";
import { useStore } from "@/lib/store";
import { useNotifications } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export function AccountMenu() {
  const { account, syncState, signIn, signOut } = useAccount();
  const store = useStore();
  const { push } = useNotifications();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const unowned = store.state.projects.filter((p) => !p.isDemo && !p.ownerId).length;

  const doSignIn = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return;
    const acct = signIn(email, name);
    // Attach any device-local projects to the account that just signed in.
    store.state.projects
      .filter((p) => !p.isDemo && !p.ownerId)
      .forEach((p) => store.updateProject(p.id, { ownerId: acct.id }));
    setForm(false);
    setOpen(false);
    setEmail("");
    setName("");
    push({
      kind: "success",
      title: `Signed in as ${acct.displayName}`,
      description: SYNC_CONFIGURED
        ? "Your projects will sync across devices."
        : "Projects are attached to this account on this device. Cloud sync is not configured in this build.",
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
            ) : (
              <CloudOff className="h-2.5 w-2.5" />
            )}
            {account ? (SYNC_CONFIGURED ? "Synced" : "Local account") : "Offline"}
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
                </p>
                <button
                  onClick={() => {
                    signOut();
                    setOpen(false);
                    push({
                      kind: "info",
                      title: "Signed out",
                      description: "The app keeps working offline. Projects stay on this device.",
                    });
                  }}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 font-semibold hover:bg-accent"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </div>
            ) : form ? (
              <div className="space-y-2">
                <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" />
                <Field label="Display name" value={name} onChange={setName} placeholder="Optional" />
                {unowned > 0 && (
                  <p className="text-[10.5px] text-muted-foreground">
                    {unowned} local project{unowned === 1 ? "" : "s"} will be attached to this account.
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={doSignIn}
                    className="flex-1 rounded-md bg-[var(--teal)] px-2 py-1.5 font-semibold text-white hover:opacity-90"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => setForm(false)}
                    className="rounded-md border border-border px-2 py-1.5 hover:bg-accent"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="leading-relaxed text-muted-foreground">
                  You are using Mod Constructor offline as a guest. Everything works — projects are
                  saved on this computer only, so you cannot continue a build from another machine.
                </p>
                <button
                  onClick={() => setForm(true)}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-[var(--teal)] px-2 py-1.5 font-semibold text-white hover:opacity-90"
                >
                  <LogIn className="h-3.5 w-3.5" /> Sign in to attach projects
                </button>
                {!SYNC_CONFIGURED && (
                  <p className="text-[10.5px] text-muted-foreground">
                    Cloud sync is not configured in this build — signing in creates a device account
                    that owns your projects and is ready for sync when the service is enabled.
                  </p>
                )}
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-[var(--teal)]"
      />
    </label>
  );
}
