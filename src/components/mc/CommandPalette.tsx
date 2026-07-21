import { useEffect, useMemo, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { COMMANDS, SEARCH_INDEX, type CommandItem as Cmd, type SearchEntry } from "@/lib/command-registry";
import { useAppNavigation } from "@/lib/navigation";
import { useAdvanced } from "@/lib/advanced-mode";
import { useNotifications } from "@/lib/notifications";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

export function CommandPalette({ open, onOpenChange }: Props) {
  const { navigate } = useAppNavigation();
  const { advanced, toggle: toggleAdvanced } = useAdvanced();
  const { push } = useNotifications();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const commandsByGroup = useMemo(() => {
    const groups = new Map<Cmd["group"], Cmd[]>();
    for (const c of COMMANDS) {
      const arr = groups.get(c.group) ?? [];
      arr.push(c);
      groups.set(c.group, arr);
    }
    return Array.from(groups.entries());
  }, []);

  const searchByKind = useMemo(() => {
    const groups = new Map<SearchEntry["kind"], SearchEntry[]>();
    for (const s of SEARCH_INDEX) {
      const arr = groups.get(s.kind) ?? [];
      arr.push(s);
      groups.set(s.kind, arr);
    }
    return Array.from(groups.entries());
  }, []);

  const runCommand = (c: Cmd) => {
    onOpenChange(false);
    if (c.action === "navigate" && c.section) {
      navigate(c.section);
      return;
    }
    // custom actions
    switch (c.id) {
      case "tool.advanced":
        toggleAdvanced();
        push({
          kind: "info",
          title: advanced ? "Simple mode" : "Advanced mode enabled",
          description: advanced ? "Technical fields are hidden." : "Tuning, XML, and validation are visible.",
        });
        break;
      case "build.run":
        push({ kind: "build", title: "Build queued", description: "Epic Careers Overhaul · running…" });
        break;
      case "build.xml":
        push({ kind: "success", title: "XML generated", description: "12 tuning files updated." });
        break;
      case "proj.save":
        push({ kind: "success", title: "Project saved", description: "All builders committed to disk." });
        break;
      case "proj.duplicate":
        push({ kind: "info", title: "Duplicate branch", description: "Pick a source branch from the Career Builder." });
        navigate("career");
        break;
      case "proj.findRefs":
        push({ kind: "info", title: "Find References", description: "Select an item to see its reference graph." });
        break;
      case "ai.icon":
        push({ kind: "info", title: "AI icon generator", description: "Opening icon field in current builder…" });
        break;
      case "ai.description":
        push({ kind: "info", title: "Improve description", description: "Select a description field to rewrite." });
        break;
      case "tool.reload":
        push({ kind: "update", title: "Contacting lot51.cc…", description: "Checking for framework updates." });
        setTimeout(
          () => push({ kind: "success", title: "Up to date", description: "Lot51 Core Library v1.108.318." }),
          1200,
        );
        break;
      default:
        push({ kind: "info", title: c.title });
    }
  };

  const runSearch = (s: SearchEntry) => {
    onOpenChange(false);
    navigate(s.section);
    push({ kind: "info", title: `Opening ${s.title}`, description: s.subtitle });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search projects, careers, traits, assets, or type a command…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results for “{query}”.</CommandEmpty>

        {commandsByGroup.map(([group, items], idx) => (
          <div key={group}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {items.map((c) => {
                const Icon = c.icon;
                return (
                  <CommandItem
                    key={c.id}
                    value={`${c.title} ${c.keywords?.join(" ") ?? ""} ${c.group}`}
                    onSelect={() => runCommand(c)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{c.title}</span>
                    {c.subtitle && (
                      <span className="ml-2 text-xs text-muted-foreground">{c.subtitle}</span>
                    )}
                    {c.shortcut && <CommandShortcut>{c.shortcut}</CommandShortcut>}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ))}

        <CommandSeparator />

        {searchByKind.map(([kind, items]) => (
          <CommandGroup key={kind} heading={kind}>
            {items.map((s) => {
              const Icon = s.icon;
              return (
                <CommandItem
                  key={s.id}
                  value={`${s.title} ${s.subtitle ?? ""} ${s.keywords?.join(" ") ?? ""} ${s.kind}`}
                  onSelect={() => runSearch(s)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <div className="flex flex-1 items-baseline justify-between gap-2">
                    <span>{s.title}</span>
                    {s.subtitle && (
                      <span className="ml-2 text-xs text-muted-foreground">{s.subtitle}</span>
                    )}
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

/** Hook for Ctrl/Cmd+K binding. */
export function useCommandPaletteHotkey(onToggle: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onToggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onToggle]);
}
