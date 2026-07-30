import { useState } from "react";
import { X, Layers } from "lucide-react";
import { useTabs } from "@/lib/tabs";
import { SECTION_LABEL } from "./sections";
import { cn } from "@/lib/utils";

export function TabStrip() {
  const { tabs, active, open, close, closeOthers, closeAll } = useTabs();
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const { move } = useTabs();

  return (
    <div className="sticky top-14 z-20 flex h-9 items-stretch border-b border-border bg-card/80 backdrop-blur">
      <div className="flex flex-1 items-stretch overflow-x-auto">
        {tabs.map((t, i) => {
          const isActive = t.id === active;
          return (
            <div
              key={t.id}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null) move(dragIndex, i);
                setDragIndex(null);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({ id: t.id, x: e.clientX, y: e.clientY });
              }}
              className={cn(
                "group relative flex shrink-0 items-center gap-2 border-r border-border px-3 text-[11.5px] transition-colors",
                isActive
                  ? "bg-background font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
              title={`${SECTION_LABEL[t.id]}${i < 9 ? ` · Ctrl+${i + 1}` : ""}`}
            >
              {isActive && <span className="absolute inset-x-0 top-0 h-0.5 bg-[var(--teal)]" />}
              <button
                type="button"
                onClick={() => open(t.id)}
                onAuxClick={(e) => {
                  if (e.button === 1) close(t.id);
                }}
                className="max-w-44 truncate py-1.5"
              >
                {t.title}
              </button>
              {t.pinned ? null : (
                <button
                  type="button"
                  onClick={() => close(t.id)}
                  aria-label={`Close ${t.title}`}
                  className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-1 px-2 text-[10.5px] text-muted-foreground">
        <Layers className="h-3 w-3" />
        <span className="hidden sm:inline">
          {tabs.length} open · Ctrl+Tab
        </span>
      </div>

      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div
            className="fixed z-50 min-w-40 rounded-md border border-border bg-popover p-1 text-xs shadow-lg"
            style={{ left: menu.x, top: menu.y }}
          >
            <MenuItem
              label="Close tab"
              onClick={() => {
                close(menu.id as never);
                setMenu(null);
              }}
            />
            <MenuItem
              label="Close others"
              onClick={() => {
                closeOthers(menu.id as never);
                setMenu(null);
              }}
            />
            <MenuItem
              label="Close all"
              onClick={() => {
                closeAll();
                setMenu(null);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded px-2 py-1.5 text-left hover:bg-accent"
    >
      {label}
    </button>
  );
}
