import { Bell, Hammer, ShieldCheck, Package, Info, AlertTriangle, CheckCircle2, XCircle, RefreshCw, X, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useNotifications, type NotificationKind } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<NotificationKind, React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  build: Hammer,
  validation: ShieldCheck,
  export: Package,
  update: RefreshCw,
};

const KIND_TINT: Record<NotificationKind, string> = {
  info: "text-[var(--blue)] bg-[var(--blue)]/10",
  success: "text-[var(--green)] bg-[var(--green)]/10",
  warning: "text-[var(--orange)] bg-[var(--orange)]/10",
  error: "text-[var(--red)] bg-[var(--red)]/10",
  build: "text-[var(--teal)] bg-[var(--teal)]/10",
  validation: "text-[var(--violet)] bg-[var(--violet)]/10",
  export: "text-[var(--blue)] bg-[var(--blue)]/10",
  update: "text-[var(--teal)] bg-[var(--teal)]/10",
};

function fmtTime(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NotificationCenter() {
  const { items, drawerOpen, setDrawerOpen, markAllRead, clear, remove } = useNotifications();

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent side="right" className="w-[380px] sm:w-[420px] p-0">
        <SheetHeader className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[var(--blue)]" />
            <SheetTitle className="text-sm">Notifications</SheetTitle>
          </div>
          <SheetDescription className="text-xs">
            Background builds, validation, exports, and framework updates.
          </SheetDescription>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={markAllRead}
              className="rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-medium hover:bg-accent"
            >
              Mark all read
            </button>
            <button
              onClick={clear}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent"
            >
              <Trash2 className="h-3 w-3" /> Clear
            </button>
          </div>
        </SheetHeader>

        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto p-3">
          {items.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-center">
              <Bell className="h-6 w-6 text-muted-foreground/50" />
              <div className="text-xs text-muted-foreground">You're all caught up.</div>
            </div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {items.map((n) => {
                const Icon = KIND_ICON[n.kind];
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "group flex gap-3 rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm transition-colors",
                      !n.read && "border-l-2 border-l-[var(--blue)]",
                    )}
                  >
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", KIND_TINT[n.kind])}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="truncate text-xs font-semibold">{n.title}</div>
                        <div className="shrink-0 text-[10px] text-muted-foreground">{fmtTime(n.createdAt)}</div>
                      </div>
                      {n.description && (
                        <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{n.description}</div>
                      )}
                      {n.action && (
                        <button
                          onClick={n.action.onClick}
                          className="mt-1.5 text-[11px] font-medium text-[var(--blue)] hover:underline"
                        >
                          {n.action.label}
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => remove(n.id)}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Dismiss notification"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
