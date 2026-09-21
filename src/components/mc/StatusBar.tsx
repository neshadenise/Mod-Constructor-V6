import {
  GitBranch,
  WifiOff,
  Wifi,
  HardDrive,
  Circle,
  Wrench,
  Save,
  Package as PackageIcon,
  ShieldCheck,
  Sparkles,
  Gamepad2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAdvanced } from "@/lib/advanced-mode";
import { useAppHost, PROVIDER_LABEL } from "@/lib/app-host";
import { SECTION_LABEL, type SectionId } from "./sections";
import { cn } from "@/lib/utils";
import { useStore, useActiveProject } from "@/lib/store";
import { scopeProject, analyzeProject } from "@/lib/project-analysis";
import { getCacheMeta } from "@/lib/gamedata/tdesc";

function relative(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function StatusBar({ active }: { active: SectionId }) {
  const { advanced } = useAdvanced();
  const { imageProvider } = useAppHost();
  const store = useStore();
  const project = useActiveProject();
  const issues = useMemo(() => {
    const scope = scopeProject(store.state, project?.id);
    return scope ? analyzeProject(scope) : [];
  }, [store.state, project?.id]);
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const running = store.state.builds.find((b) => b.status === "running");
  const queued = store.state.builds.filter((b) => b.status === "queued").length;
  const [online, setOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [tick, setTick] = useState(0);
  const [storageMb, setStorageMb] = useState<number | null>(null);
  const [gameVersion, setGameVersion] = useState<string | null>(null);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  // Re-render once a second so the "saved" readout stays truthful.
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Real on-device usage for everything this app has written.
  useEffect(() => {
    let alive = true;
    const measure = async () => {
      try {
        const est = await navigator.storage?.estimate?.();
        if (alive && est?.usage != null) setStorageMb(est.usage / (1024 * 1024));
      } catch {
        /* storage estimate unavailable */
      }
    };
    void measure();
    const id = window.setInterval(measure, 30_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  // Game version comes from the cached Lot 51 game-data snapshot.
  useEffect(() => {
    let alive = true;
    void getCacheMeta()
      .then((meta) => {
        if (alive && meta?.version) setGameVersion(meta.version);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const savedLabel = project?.updatedAt
    ? relative(Date.now() - new Date(project.updatedAt).getTime())
    : "no project";
  void tick;

  return (
    <footer className="fixed bottom-0 left-60 right-[var(--preview-w,0px)] z-30 flex h-7 items-center gap-4 border-t border-border bg-card/95 px-4 text-[10.5px] text-muted-foreground backdrop-blur">
      <StatusChip>
        <Circle className="h-2 w-2 fill-[var(--green)] text-[var(--green)]" />
        <span>Ready · {SECTION_LABEL[active]}</span>
      </StatusChip>

      <StatusChip>
        <ShieldCheck className="h-3 w-3 text-[var(--green)]" />
        <span>Validation: <span className="text-foreground/80">{errors} errors · {warnings} warnings</span></span>
      </StatusChip>

      <StatusChip>
        <PackageIcon className="h-3 w-3 text-[var(--blue)]" />
        <span>Build: <span className="text-foreground/80">{running ? `${running.label} · ${Math.round(running.progress)}%` : queued ? `${queued} queued` : "idle"}</span></span>
      </StatusChip>

      <StatusChip>
        <Save className="h-3 w-3 text-[var(--teal)]" />
        <span>Saved · {savedLabel}</span>
      </StatusChip>

      {advanced && (
        <StatusChip className="text-[var(--orange)]">
          <Wrench className="h-3 w-3" /> Advanced mode
        </StatusChip>
      )}

      <span className="ml-auto flex items-center gap-3">
        <StatusChip>
          <Sparkles className="h-3 w-3 text-[var(--violet)]" />
          <span>Provider: <span className="text-foreground/80">{PROVIDER_LABEL[imageProvider]}</span></span>
        </StatusChip>
        <StatusChip>
          {online ? (
            <Wifi className="h-3 w-3 text-[var(--green)]" />
          ) : (
            <WifiOff className="h-3 w-3 text-muted-foreground" />
          )}
          <span>{online ? "Online" : "Offline"}</span>
        </StatusChip>
        {storageMb !== null && (
          <StatusChip>
            <HardDrive className="h-3 w-3" /> {storageMb < 1 ? `${Math.round(storageMb * 1024)} KB` : `${storageMb.toFixed(1)} MB`}
          </StatusChip>
        )}
        {gameVersion && (
          <StatusChip>
            <Gamepad2 className="h-3 w-3" /> Game {gameVersion}
          </StatusChip>
        )}
        <StatusChip>
          <GitBranch className="h-3 w-3" /> {project?.name ?? "no project"}
        </StatusChip>
        {project && <span className="tabular-nums">v{project.version}</span>}
      </span>
    </footer>
  );
}

function StatusChip({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1.5", className)}>{children}</span>;
}

