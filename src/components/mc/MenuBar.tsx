import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Circle, Minus, Square, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CreditsContent } from "@/components/mc/CreditsContent";
import { useImportPackage } from "@/components/mc/ImportPackageDialog";


type MenuDef = {
  label: string;
  items: { label: string; shortcut?: string; onClick?: () => void; separator?: boolean }[];
};

export function MenuBar() {
  const [open, setOpen] = useState<string | null>(null);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const importer = useImportPackage();


  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const fire = (msg: string) => {
    setOpen(null);
    toast(msg);
  };

  const menus: MenuDef[] = [
    {
      label: "File",
      items: [
        { label: "New Project…", shortcut: "Ctrl+N", onClick: () => fire("New project wizard opened") },
        { label: "Open Project…", shortcut: "Ctrl+O", onClick: () => fire("Open project dialog") },
        { label: "Save", shortcut: "Ctrl+S", onClick: () => fire("Project saved") },
        { label: "Save As…", shortcut: "Ctrl+Shift+S", onClick: () => fire("Save As dialog") },
        { separator: true, label: "" },
        { label: "Import Package…", onClick: () => { setOpen(null); importer.openImport(); } },
        { label: "Export .package", onClick: () => fire("Exporting DBPF…") },
        { separator: true, label: "" },
        { label: "Exit", shortcut: "Alt+F4", onClick: () => fire("Would exit app") },
      ],
    },
    {
      label: "Edit",
      items: [
        { label: "Undo", shortcut: "Ctrl+Z", onClick: () => fire("Undo") },
        { label: "Redo", shortcut: "Ctrl+Y", onClick: () => fire("Redo") },
        { separator: true, label: "" },
        { label: "Cut", shortcut: "Ctrl+X" },
        { label: "Copy", shortcut: "Ctrl+C" },
        { label: "Paste", shortcut: "Ctrl+V" },
        { separator: true, label: "" },
        { label: "Preferences…", onClick: () => fire("Preferences") },
      ],
    },
    {
      label: "View",
      items: [
        { label: "Toggle Theme", shortcut: "Ctrl+T", onClick: () => fire("Theme toggled") },
        { label: "Reset Layout", onClick: () => fire("Layout reset") },
        { label: "Zoom In", shortcut: "Ctrl+=" },
        { label: "Zoom Out", shortcut: "Ctrl+-" },
      ],
    },
    {
      label: "Build",
      items: [
        { label: "Compile Current", shortcut: "F5", onClick: () => fire("Compiling…") },
        { label: "Validate All", shortcut: "F7", onClick: () => fire("Running validation") },
        { label: "Clean Build Cache", onClick: () => fire("Cache cleared") },
      ],
    },
    {
      label: "Tools",
      items: [
        { label: "Career Builder", onClick: () => fire("Opened Career Builder") },
        { label: "Trait Builder", onClick: () => fire("Opened Trait Builder") },
        { label: "Aspiration Builder", onClick: () => fire("Opened Aspiration Builder") },
        { label: "Tuning Editor", onClick: () => fire("Opened Tuning Editor") },
        { separator: true, label: "" },
        { label: "Check lot51.cc Updates", onClick: () => fire("Reaching out to lot51.cc…") },
      ],
    },
    {
      label: "Help",
      items: [
        { label: "Documentation", onClick: () => fire("Docs opened") },
        { label: "Keyboard Shortcuts", shortcut: "Ctrl+/" },
        { separator: true, label: "" },
        { label: "Credits & Acknowledgements", onClick: () => { setOpen(null); setCreditsOpen(true); } },
        { label: "About Mod Constructor V6", onClick: () => { setOpen(null); setCreditsOpen(true); } },
      ],
    },
  ];


  return (
    <div
      ref={ref}
      className="flex h-8 select-none items-center border-b border-border bg-card/80 pl-2 pr-3 text-[12px] mr-[var(--preview-w,0px)] transition-[margin] duration-200"
    >
      <div className="mr-3 flex items-center gap-1.5">
        <Circle className="h-2.5 w-2.5 fill-[var(--destructive,#ef4444)] text-[var(--destructive,#ef4444)]" />
        <Circle className="h-2.5 w-2.5 fill-[var(--orange)] text-[var(--orange)]" />
        <Circle className="h-2.5 w-2.5 fill-[var(--green)] text-[var(--green)]" />
      </div>
      <div className="flex items-center">
        {menus.map((m) => (
          <div key={m.label} className="relative">
            <button
              onMouseEnter={() => open && setOpen(m.label)}
              onClick={() => setOpen(open === m.label ? null : m.label)}
              className={
                "rounded px-2.5 py-1 font-medium transition-colors " +
                (open === m.label ? "bg-accent text-foreground" : "text-foreground/85 hover:bg-accent/70")
              }
            >
              {m.label}
            </button>
            {open === m.label && (
              <div className="absolute left-0 top-full z-50 mt-0.5 min-w-[220px] rounded-md border border-border bg-popover p-1 shadow-lg">
                {m.items.map((it, i) =>
                  it.separator ? (
                    <div key={i} className="my-1 h-px bg-border" />
                  ) : (
                    <button
                      key={i}
                      onClick={it.onClick}
                      className="flex w-full items-center justify-between gap-6 rounded px-2 py-1.5 text-left text-xs text-popover-foreground hover:bg-accent"
                    >
                      <span>{it.label}</span>
                      {it.shortcut && (
                        <span className="font-mono text-[10px] text-muted-foreground">{it.shortcut}</span>
                      )}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-1 text-muted-foreground">
        <span className="mr-2 font-mono text-[10.5px]">Mod Constructor V6 — Epic Careers Overhaul</span>
        <WinBtn>
          <Minus className="h-3 w-3" />
        </WinBtn>
        <WinBtn>
          <Square className="h-2.5 w-2.5" />
        </WinBtn>
        <WinBtn danger>
          <X className="h-3 w-3" />
        </WinBtn>
      </div>
      {importer.dialog}
      <Dialog open={creditsOpen} onOpenChange={setCreditsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Credits & Acknowledgements</DialogTitle>
            <DialogDescription>
              Factual attribution for external work that inspired or informed Mod Constructor V6.
            </DialogDescription>
          </DialogHeader>
          <CreditsContent />
        </DialogContent>
      </Dialog>
    </div>
  );
}


function WinBtn({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      className={
        "flex h-6 w-8 items-center justify-center rounded-sm transition-colors " +
        (danger ? "hover:bg-destructive hover:text-destructive-foreground" : "hover:bg-accent")
      }
    >
      {children}
    </button>
  );
}
