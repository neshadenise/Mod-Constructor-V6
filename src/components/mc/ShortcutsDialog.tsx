import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

const GROUPS: { title: string; items: { keys: string[]; label: string }[] }[] = [
  {
    title: "Global",
    items: [
      { keys: ["⌘/Ctrl", "K"], label: "Open command palette" },
      { keys: ["⌘/Ctrl", "P"], label: "Quick open project" },
      { keys: ["⌘/Ctrl", "/"], label: "Show keyboard shortcuts" },
      { keys: ["Esc"], label: "Close dialog / cancel" },
    ],
  },
  {
    title: "Navigation",
    items: [
      { keys: ["G", "D"], label: "Go to Dashboard" },
      { keys: ["G", "P"], label: "Go to Projects" },
      { keys: ["G", "C"], label: "Go to Career Builder" },
      { keys: ["G", "T"], label: "Go to Trait Builder" },
      { keys: ["G", "V"], label: "Go to Validation Center" },
    ],
  },
  {
    title: "Editing",
    items: [
      { keys: ["⌘/Ctrl", "S"], label: "Save current project" },
      { keys: ["⌘/Ctrl", "Z"], label: "Undo" },
      { keys: ["⌘/Ctrl", "⇧", "Z"], label: "Redo" },
      { keys: ["⌘/Ctrl", "D"], label: "Duplicate selection" },
    ],
  },
  {
    title: "Build",
    items: [
      { keys: ["⌘/Ctrl", "B"], label: "Build current project" },
      { keys: ["⌘/Ctrl", "⇧", "V"], label: "Run full validation" },
      { keys: ["⌘/Ctrl", "E"], label: "Export .package" },
    ],
  },
];

export function ShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setOpen((s) => !s);
      }
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-[var(--blue)]" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {g.title}
              </div>
              <ul className="space-y-1.5">
                {g.items.map((it, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 text-xs">
                    <span>{it.label}</span>
                    <span className="flex items-center gap-1">
                      {it.keys.map((k, j) => (
                        <kbd
                          key={j}
                          className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-2 border-t border-border pt-3 text-[10px] text-muted-foreground">
          Tip: Press <kbd className="rounded border border-border bg-background px-1 font-mono">?</kbd> anywhere to reopen this help.
        </div>
      </DialogContent>
    </Dialog>
  );
}
