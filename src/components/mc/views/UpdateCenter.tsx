import { useState } from "react";
import { RefreshCw, Download, CheckCircle2, Circle, ExternalLink, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Feed = {
  id: string;
  channel: "Lot 51 Core" | "Zerbu Legacy" | "Community";
  version: string;
  released: string;
  installed?: string;
  notes: string;
  update?: boolean;
};

const FEEDS: Feed[] = [
  { id: "lot51-core", channel: "Lot 51 Core", version: "3.14.2", released: "3d ago", installed: "3.14.0", notes: "New buff schema fields, tuning helpers.", update: true },
  { id: "zerbu-legacy", channel: "Zerbu Legacy", version: "5.0.1", released: "6mo ago", installed: "5.0.1", notes: "Frozen upstream. Compatibility layer for V5 imports." },
  { id: "community", channel: "Community", version: "2026.07.18", released: "2d ago", installed: "2026.07.11", notes: "24 new templates, 8 fixed snippets.", update: true },
];

export function UpdateCenter() {
  const [feeds, setFeeds] = useState<Feed[]>(FEEDS);
  const [checking, setChecking] = useState(false);
  const [autoCheck, setAutoCheck] = useState(true);

  const check = () => {
    setChecking(true);
    toast("Checking Lot 51 servers...");
    setTimeout(() => {
      setChecking(false);
      toast.success("You're on the latest metadata");
    }, 1400);
  };

  const install = (id: string) => {
    setFeeds((f) => f.map((x) => (x.id === id ? { ...x, installed: x.version, update: false } : x)));
    toast.success("Update installed");
  };

  const hasUpdates = feeds.some((f) => f.update);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--teal)] text-white shadow-sm">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Framework Updates
            </div>
            <h1 className="text-xl font-bold tracking-tight">Update Center</h1>
          </div>
        </div>
        <button
          onClick={check}
          disabled={checking}
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--blue)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", checking && "animate-spin")} />
          {checking ? "Checking..." : "Check Now"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatusCard title="Sync mode" value={autoCheck ? "Auto (daily)" : "Manual"} tone="teal" />
        <StatusCard title="Available" value={hasUpdates ? `${feeds.filter((f) => f.update).length} updates` : "You're current"} tone={hasUpdates ? "orange" : "green"} />
        <StatusCard title="Last check" value="2 min ago" tone="blue" />
      </div>

      <section className="rounded-xl border border-border bg-card p-4 card-elevated">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Sources</h2>
          <label className="inline-flex cursor-pointer items-center gap-2 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              checked={autoCheck}
              onChange={(e) => setAutoCheck(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Auto-check daily
          </label>
        </div>
        <div className="space-y-2">
          {feeds.map((f) => (
            <div
              key={f.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-background/40 p-3 md:flex-row md:items-center"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{f.channel}</span>
                  {f.update ? (
                    <span className="rounded-full border border-[var(--orange)]/40 bg-[var(--orange)]/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-[var(--orange)]">
                      Update
                    </span>
                  ) : (
                    <span className="rounded-full border border-[var(--green)]/40 bg-[var(--green)]/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-[var(--green)]">
                      Current
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  Available <span className="font-mono">{f.version}</span> · Installed{" "}
                  <span className="font-mono">{f.installed ?? "—"}</span> · Released {f.released}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{f.notes}</div>
              </div>
              <div className="flex items-center gap-2">
                {f.update ? (
                  <button
                    onClick={() => install(f.id)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[var(--blue)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
                  >
                    <Download className="h-3.5 w-3.5" /> Install
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-[var(--green)]" /> Up to date
                  </span>
                )}
                <a
                  href="https://lot51.cc"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-accent"
                >
                  <ExternalLink className="h-3 w-3" /> Notes
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatusCard({ title, value, tone }: { title: string; value: string; tone: "teal" | "blue" | "green" | "orange" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 card-elevated">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <Circle className="h-2 w-2 fill-current" style={{ color: `var(--${tone})` }} />
        <div className="text-sm font-semibold" style={{ color: `var(--${tone})` }}>
          {value}
        </div>
      </div>
    </div>
  );
}
