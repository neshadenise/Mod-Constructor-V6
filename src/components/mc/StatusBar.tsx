import {
  GitBranch,
  WifiOff,
  Wifi,
  Cpu,
  HardDrive,
  Circle,
  Wrench,
  Save,
  MousePointer2,
  Package as PackageIcon,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAdvanced } from "@/lib/advanced-mode";
import { useAppHost, PROVIDER_LABEL } from "@/lib/app-host";
import { SECTION_LABEL, type SectionId } from "./sections";
import { cn } from "@/lib/utils";

export function StatusBar({ active }: { active: SectionId }) {
  const { advanced } = useAdvanced();
  const { imageProvider } = useAppHost();
  const [online, setOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [savedAgo, setSavedAgo] = useState(12);

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

  useEffect(() => {
    const id = window.setInterval(() => setSavedAgo((s) => (s + 1) % 240), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <footer className="fixed bottom-0 left-60 right-0 z-30 flex h-7 items-center gap-4 border-t border-border bg-card/95 px-4 text-[10.5px] text-muted-foreground backdrop-blur">
      <StatusChip>
        <Circle className="h-2 w-2 fill-[var(--green)] text-[var(--green)]" />
        <span>Ready · {SECTION_LABEL[active]}</span>
      </StatusChip>

      <StatusChip>
        <ShieldCheck className="h-3 w-3 text-[var(--green)]" />
        <span>Validation: <span className="text-foreground/80">0 errors · 3 warnings</span></span>
      </StatusChip>

      <StatusChip>
        <PackageIcon className="h-3 w-3 text-[var(--blue)]" />
        <span>Build: <span className="text-foreground/80">idle</span></span>
      </StatusChip>

      <StatusChip>
        <Save className="h-3 w-3 text-[var(--teal)]" />
        <span>Autosaved · {savedAgo}s ago</span>
      </StatusChip>

      {advanced && (
        <StatusChip className="text-[var(--orange)]">
          <Wrench className="h-3 w-3" /> Advanced mode
        </StatusChip>
      )}

      <span className="ml-auto flex items-center gap-3">
        <StatusChip>
          <MousePointer2 className="h-3 w-3" /> 0 selected
        </StatusChip>
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
        <StatusChip>
          <Cpu className="h-3 w-3" /> 4%
        </StatusChip>
        <StatusChip>
          <HardDrive className="h-3 w-3" /> 428 MB
        </StatusChip>
        <StatusChip>
          <GitBranch className="h-3 w-3" /> main
        </StatusChip>
        <span className="tabular-nums">Game 1.108.318 · Project v0.8.2</span>
        {advanced && <span className="font-mono">UTF-8 · LF · XML · Ln 142, Col 18</span>}
      </span>
    </footer>
  );
}

function StatusChip({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1.5", className)}>{children}</span>;
}
