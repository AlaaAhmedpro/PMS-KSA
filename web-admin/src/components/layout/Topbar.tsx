import { useEffect, useRef, useState } from "react";
import { LogOut, Menu, Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "../../store/ThemeContext";
import { useAuth } from "../../store/AuthContext";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const [openUser, setOpenUser] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node))
        setOpenUser(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
            منصة إدارة الاشتراكات
          </p>
          <p className="text-[11px] text-steel-400">
            Super Admin — نماء للتطوير
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

        <div className="relative" ref={userRef}>
          <button
            onClick={() => setOpenUser((v) => !v)}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-steel-100 dark:hover:bg-steel-800"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
              {user?.name?.charAt(0) || "؟"}
            </span>
            <span className="hidden text-start leading-tight md:block">
              <span className="block text-sm font-bold text-steel-800 dark:text-steel-100">
                {user?.name}
              </span>
              <span className="block text-[11px] text-steel-400">مسؤول المنصة</span>
            </span>
          </button>

          <AnimatePresence>
            {openUser && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute left-0 top-full z-40 mt-2 w-52 overflow-hidden rounded-2xl border border-steel-200 bg-white shadow-card dark:border-steel-700 dark:bg-steel-900"
              >
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setOpenUser(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
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
