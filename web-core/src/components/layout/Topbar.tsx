import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  LogOut,
  Menu,
  Moon,
  Sun,
  AlertTriangle,
  Clock,
  UserCheck,
  Mail,
  RotateCcw,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "../../store/ThemeContext";
import { useAuth } from "../../store/AuthContext";
import { useData } from "../../store/DataStore";
import { useRbac } from "../../store/RbacContext";
import { useNotifications } from "../../store/NotificationStore";
import { useHierarchy } from "../../store/HierarchyStore";
import { useConfirm } from "../../store/ConfirmContext";
import { buildAlerts } from "../../lib/alerts";
import { formatNotificationDateTime } from "../../lib/format";
import { cn } from "../../lib/cn";
import type { AppNotification } from "../../lib/types";
import { isDemoMode } from "../../demo-mode/config";
import { resetAllDemoData } from "../../demo-mode/reset";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { theme, toggle } = useTheme();
  const { user, logout, organization } = useAuth();
  const { records, resetDemo } = useData();
  const { roles, resetRbac } = useRbac();
  const { forUser, markRead, unreadForUser, resetNotifications } = useNotifications();
  const { resetHierarchy } = useHierarchy();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [openBell, setOpenBell] = useState(false);
  const [openUser, setOpenUser] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const alerts = useMemo(() => buildAlerts(records), [records]);
  const userNotifications = useMemo(
    () => forUser(user?.id),
    [forUser, user?.id],
  );
  const unreadCount = unreadForUser(user?.id);
  const dangerCount = alerts.filter((a) => a.level === "danger").length;
  const hasBellActivity = unreadCount > 0 || alerts.length > 0;

  const openRecord = (kind: AppNotification["kind"] | "project" | "task", recordId: string) => {
    navigate(
      kind === "task"
        ? `/tasks/${recordId}`
        : `/projects/${recordId}`,
    );
    setOpenBell(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node))
        setOpenBell(false);
      if (userRef.current && !userRef.current.contains(e.target as Node))
        setOpenUser(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const roleName = roles.find((r) => r.id === user?.role)?.name;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-steel-200 bg-white/80 px-4 backdrop-blur-xl dark:border-steel-800 dark:bg-steel-900/80 md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          className="rounded-lg p-2 text-steel-500 hover:bg-steel-100 dark:hover:bg-steel-800 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden sm:block">
          <p className="text-sm font-bold text-steel-800 dark:text-steel-100">
            منظومة إدارة وتنظيم المشاريع
          </p>
          <p className="text-[11px] text-steel-400">
            بوابة إدارة المشاريع — {organization?.name ?? "Brains Valley"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={toggle}
          className="rounded-xl p-2.5 text-steel-500 transition-colors hover:bg-steel-100 dark:text-steel-300 dark:hover:bg-steel-800"
          title={theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setOpenBell((o) => !o)}
            className="relative rounded-xl p-2.5 text-steel-500 transition-colors hover:bg-steel-100 dark:text-steel-300 dark:hover:bg-steel-800"
          >
            <Bell className="h-5 w-5" />
            {hasBellActivity && (
              <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
            )}
            {unreadCount > 0 && (
              <span className="absolute -left-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <AnimatePresence>
            {openBell && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                className="absolute left-0 mt-2 w-80 overflow-hidden rounded-2xl border border-steel-200 bg-white shadow-card dark:border-steel-700 dark:bg-steel-900"
              >
                <div className="flex items-center justify-between border-b border-steel-100 px-4 py-3 dark:border-steel-800">
                  <p className="text-sm font-bold text-steel-800 dark:text-steel-100">
                    التنبيهات
                  </p>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-bold text-brand-600 dark:text-brand-400">
                        {unreadCount} جديد
                      </span>
                    )}
                    {dangerCount > 0 && (
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-500">
                        {dangerCount} عاجل
                      </span>
                    )}
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {userNotifications.length === 0 && alerts.length === 0 && (
                    <p className="px-4 py-8 text-center text-sm text-steel-400">
                      لا توجد تنبيهات حالياً
                    </p>
                  )}

                  {userNotifications.slice(0, 15).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        markRead(n.id);
                        openRecord(n.kind, n.recordId);
                      }}
                      className={cn(
                        "flex w-full gap-3 border-b border-steel-50 px-4 py-3 text-right transition-colors last:border-0 hover:bg-steel-50 dark:border-steel-800/60 dark:hover:bg-steel-800/60",
                        !n.read && "bg-brand-500/5",
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          n.type === "escalation"
                            ? "bg-red-500/10 text-red-500"
                            : "bg-brand-500/10 text-brand-600 dark:text-brand-400",
                        )}
                      >
                        {n.type === "escalation" ? (
                          <Mail className="h-4 w-4" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-steel-700 dark:text-steel-200">
                          {n.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-steel-400">
                          {n.detail}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-steel-500 dark:text-steel-400">
                          {formatNotificationDateTime(n.createdAt)}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                      )}
                    </button>
                  ))}

                  {userNotifications.length > 0 && alerts.length > 0 && (
                    <div className="border-b border-steel-100 px-4 py-2 text-[11px] font-bold text-steel-400 dark:border-steel-800">
                      تنبيهات النظام
                    </div>
                  )}

                  {alerts.slice(0, 12).map((a) => (
                    <button
                      key={a.id}
                      onClick={() => openRecord(a.kind, a.recordId)}
                      className="flex w-full gap-3 border-b border-steel-50 px-4 py-3 text-right transition-colors last:border-0 hover:bg-steel-50 dark:border-steel-800/60 dark:hover:bg-steel-800/60"
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          a.level === "danger"
                            ? "bg-red-500/10 text-red-500"
                            : "bg-amber-500/10 text-amber-500",
                        )}
                      >
                        {a.level === "danger" ? (
                          <AlertTriangle className="h-4 w-4" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-steel-700 dark:text-steel-200">
                          {a.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-steel-400">
                          {a.detail}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setOpenUser((o) => !o)}
            className="flex items-center gap-2 rounded-xl p-1.5 pl-3 transition-colors hover:bg-steel-100 dark:hover:bg-steel-800"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
              {user?.name?.charAt(0)}
            </div>
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-xs font-bold text-steel-800 dark:text-steel-100">
                {user?.name}
              </p>
              <p className="text-[10px] text-steel-400">{roleName}</p>
            </div>
          </button>
          <AnimatePresence>
            {openUser && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                className="absolute left-0 mt-2 w-56 overflow-hidden rounded-2xl border border-steel-200 bg-white shadow-card dark:border-steel-700 dark:bg-steel-900"
              >
                <div className="border-b border-steel-100 px-4 py-3 dark:border-steel-800">
                  <p className="text-sm font-bold text-steel-800 dark:text-steel-100">
                    {user?.name}
                  </p>
                  <p className="text-xs text-steel-400">{user?.email}</p>
                  {organization && (
                    <p className="mt-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                      {organization.name}
                    </p>
                  )}
                </div>
                {isDemoMode() && (
                  <button
                    onClick={async () => {
                      const ok = await confirm({
                        title: "إعادة ضبط البيانات",
                        message:
                          "إعادة ضبط كل بيانات العرض التجريبي؟ سيتم تسجيل الخروج.",
                        danger: true,
                        confirmLabel: "إعادة الضبط",
                      });
                      if (!ok) return;
                      resetAllDemoData();
                      resetDemo();
                      resetNotifications();
                      resetRbac();
                      resetHierarchy();
                      logout();
                      navigate("/login");
                      window.location.reload();
                    }}
                    className="flex w-full items-center gap-2 border-b border-steel-100 px-4 py-3 text-sm font-semibold text-steel-600 transition-colors hover:bg-steel-50 dark:border-steel-800 dark:text-steel-300 dark:hover:bg-steel-800"
                  >
                    <RotateCcw className="h-4 w-4" />
                    إعادة ضبط Demo
                  </button>
                )}
                <button
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-red-500 transition-colors hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  تسجيل الخروج
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
