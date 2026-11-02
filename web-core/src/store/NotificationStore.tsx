import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppNotification } from "../lib/types";
import type { NewAppNotification } from "../lib/notifications";
import { applyDemoDataMigration } from "../lib/demoSeed";
import { SEED_NOTIFICATIONS } from "../lib/mockData";

const LS_NOTIFICATIONS = "pms_core_notifications_v1";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

interface NotificationCtx {
  notifications: AppNotification[];
  addNotification: (n: NewAppNotification) => AppNotification;
  markRead: (id: string) => void;
  markAllReadForUser: (userId: string) => void;
  forUser: (userId?: string) => AppNotification[];
  unreadForUser: (userId?: string) => number;
  resetNotifications: () => void;
}

const Ctx = createContext<NotificationCtx | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  applyDemoDataMigration();

  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    load(LS_NOTIFICATIONS, SEED_NOTIFICATIONS),
  );

  useEffect(() => {
    localStorage.setItem(LS_NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = useCallback((n: NewAppNotification) => {
    const item: AppNotification = {
      ...n,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [item, ...prev]);
    return item;
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllReadForUser = useCallback((userId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.userId === userId ? { ...n, read: true } : n)),
    );
  }, []);

  const forUser = useCallback(
    (userId?: string) => {
      if (!userId) return [];
      return notifications
        .filter((n) => n.userId === userId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
    },
    [notifications],
  );

  const unreadForUser = useCallback(
    (userId?: string) => forUser(userId).filter((n) => !n.read).length,
    [forUser],
  );

  const resetNotifications = useCallback(
    () => setNotifications(SEED_NOTIFICATIONS),
    [],
  );

  const value = useMemo<NotificationCtx>(
    () => ({
      notifications,
      addNotification,
      markRead,
      markAllReadForUser,
      forUser,
      unreadForUser,
      resetNotifications,
    }),
    [
      notifications,
      addNotification,
      markRead,
      markAllReadForUser,
      forUser,
      unreadForUser,
      resetNotifications,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
