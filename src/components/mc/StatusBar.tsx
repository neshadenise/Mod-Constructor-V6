import { GitBranch, WifiOff, Cpu, HardDrive, Circle } from "lucide-react";
import { SECTION_LABEL, type SectionId } from "./sections";

export function StatusBar({ active }: { active: SectionId }) {
  return (
    <footer className="fixed bottom-0 left-60 right-0 z-30 flex h-6 items-center gap-4 border-t border-border bg-card/90 px-4 text-[10.5px] text-muted-foreground backdrop-blur">
      <span className="inline-flex items-center gap-1.5">
        <Circle className="h-2 w-2 fill-[var(--green)] text-[var(--green)]" />
        Ready · {SECTION_LABEL[active]}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <GitBranch className="h-3 w-3" /> main
      </span>
      <span className="inline-flex items-center gap-1.5">
        <WifiOff className="h-3 w-3" /> Offline · lot51 sync on demand
      </span>
      <span className="ml-auto inline-flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5">
          <Cpu className="h-3 w-3" /> 4% CPU
        </span>
        <span className="inline-flex items-center gap-1.5">
          <HardDrive className="h-3 w-3" /> 428MB
        </span>
        <span className="font-mono">UTF-8 · LF · XML</span>
        <span className="font-mono">Ln 142, Col 18</span>
      </span>
    </footer>
  );
}
