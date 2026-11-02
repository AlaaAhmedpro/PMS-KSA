import { useEffect, useRef, useState } from "react";
import { LogOut, Menu, Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../../store/AuthContext";
import { useLocale } from "../../store/LocaleContext";
import { PLATFORM_ROLE_LABELS } from "../../lib/platformDomain";
import { normalizePlatformRole } from "../../lib/platformRbac";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth();
  const { locale, setLocale } = useLocale();
  const [openUser, setOpenUser] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  const role = normalizePlatformRole(user?.role || "readonly_admin");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node))
        setOpenUser(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          onClick={onMenu}
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          type="button"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="relative hidden max-w-md flex-1 md:block">
          <Search className="pointer-events-none absolute top-1/2 start-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pe-3 ps-9 text-sm outline-none focus:border-blue-500 focus:bg-white"
            placeholder="بحث في المنشآت، الفواتير، التذاكر…"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex rounded-md border border-slate-200 p-0.5 text-xs font-bold">
          <button
            type="button"
            className={`rounded px-2 py-1 ${locale === "ar" ? "bg-slate-900 text-white" : "text-slate-500"}`}
            onClick={() => setLocale("ar")}
          >
            ع
          </button>
          <button
            type="button"
            className={`rounded px-2 py-1 ${locale === "en" ? "bg-slate-900 text-white" : "text-slate-500"}`}
            onClick={() => setLocale("en")}
          >
            EN
          </button>
        </div>

        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => setOpenUser((v) => !v)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-100"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {user?.name?.charAt(0) || "؟"}
            </span>
            <span className="hidden text-start leading-tight md:block">
              <span className="block text-sm font-bold text-slate-800">
                {user?.name}
              </span>
              <span className="block text-[11px] text-slate-400">
                {PLATFORM_ROLE_LABELS[role]}
              </span>
            </span>
          </button>

          <AnimatePresence>
            {openUser && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute end-0 top-full z-40 mt-2 w-52 overflow-hidden rounded-md border border-slate-200 bg-white shadow-md"
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpenUser(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
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
