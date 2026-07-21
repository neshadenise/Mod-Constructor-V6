import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

export type NotificationKind = "info" | "success" | "warning" | "error" | "build" | "validation" | "export" | "update";

export type Notification = {
  id: string;
  kind: NotificationKind;
  title: string;
  description?: string;
  createdAt: number;
  read: boolean;
  action?: { label: string; onClick: () => void };
};

type Ctx = {
  items: Notification[];
  unread: number;
  push: (n: Omit<Notification, "id" | "createdAt" | "read">) => string;
  markAllRead: () => void;
  clear: () => void;
  remove: (id: string) => void;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
};

const NotificationsCtx = createContext<Ctx | null>(null);

function id() {
  return `n_${Math.random().toString(36).slice(2, 10)}`;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Notification[]>(() => seed());
  const [drawerOpen, setDrawerOpen] = useState(false);

  const push = useCallback<Ctx["push"]>((n) => {
    const record: Notification = { ...n, id: id(), createdAt: Date.now(), read: false };
    setItems((prev) => [record, ...prev].slice(0, 100));
    // Fan out to toast
    const t = { description: n.description };
    if (n.kind === "success") toast.success(n.title, t);
    else if (n.kind === "error") toast.error(n.title, t);
    else if (n.kind === "warning") toast.warning(n.title, t);
    else toast(n.title, t);
    return record.id;
  }, []);

  const markAllRead = useCallback(() => setItems((p) => p.map((i) => ({ ...i, read: true }))), []);
  const clear = useCallback(() => setItems([]), []);
  const remove = useCallback((rid: string) => setItems((p) => p.filter((i) => i.id !== rid)), []);

  const value = useMemo<Ctx>(
    () => ({
      items,
      unread: items.filter((i) => !i.read).length,
      push,
      markAllRead,
      clear,
      remove,
      drawerOpen,
      setDrawerOpen,
    }),
    [items, push, markAllRead, clear, remove, drawerOpen],
  );

  return <NotificationsCtx.Provider value={value}>{children}</NotificationsCtx.Provider>;
}

export function useNotifications() {
  const v = useContext(NotificationsCtx);
  if (!v) throw new Error("useNotifications must be used within NotificationsProvider");
  return v;
}

function seed(): Notification[] {
  const now = Date.now();
  return [
    {
      id: id(),
      kind: "build",
      title: "Build completed",
      description: "Epic Careers Overhaul · 12 files · 428 KB",
      createdAt: now - 1000 * 60 * 4,
      read: false,
    },
    {
      id: id(),
      kind: "validation",
      title: "3 validation warnings",
      description: "Career Builder · missing localized strings",
      createdAt: now - 1000 * 60 * 22,
      read: false,
    },
    {
      id: id(),
      kind: "update",
      title: "Lot51 Core Library v1.108.318",
      description: "You are up to date.",
      createdAt: now - 1000 * 60 * 90,
      read: true,
    },
  ];
}
