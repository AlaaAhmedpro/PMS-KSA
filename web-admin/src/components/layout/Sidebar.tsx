import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Inbox,
  ChevronLeft,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../lib/cn";
import { BRAND } from "../../lib/brand";
import { useAuth } from "../../store/AuthContext";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const ITEMS: NavItem[] = [
  { to: "/", label: "لوحة المنصة", icon: LayoutDashboard },
  { to: "/tenants", label: "المستأجرون", icon: Building2 },
  { to: "/plans", label: "الخطط والاشتراكات", icon: CreditCard },
  { to: "/demo-requests", label: "طلبات العرض", icon: Inbox },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();

  return (
    <aside className="flex h-full w-72 flex-col border-l border-steel-200 bg-white dark:border-steel-800 dark:bg-steel-900">
      <div className="flex flex-col items-center gap-3 border-b border-steel-100 px-5 py-6 dark:border-steel-800">
        <img
          src={BRAND.systemLogoLocal}
          alt={BRAND.systemName}
          className="h-24 w-24 rounded-full border border-steel-200 bg-white object-contain p-1 shadow-sm dark:border-steel-700"
        />
        <p className="text-center text-[13px] font-extrabold leading-snug text-steel-800 dark:text-steel-100">
          بوابة إدارة المشاريع
        </p>
        <p className="text-center text-[11px] font-semibold text-steel-400">
          Platform Admin — {BRAND.companyName}
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all",
                isActive
                  ? "bg-brand-500/10 text-brand-700 dark:text-brand-300"
                  : "text-steel-600 hover:bg-steel-100 dark:text-steel-300 dark:hover:bg-steel-800",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-active-admin"
                    className="absolute inset-y-1.5 right-0 w-1 rounded-full bg-brand-500"
                  />
                )}
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                <ChevronLeft
                  className={cn(
                    "h-4 w-4 opacity-0 transition-opacity",
                    isActive && "opacity-60",
                  )}
                />
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-steel-100 p-4 dark:border-steel-800">
        <div className="flex items-center gap-3 rounded-xl bg-steel-50 p-3 dark:bg-steel-800/60">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
            {user?.name?.charAt(0) || "؟"}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-bold text-steel-800 dark:text-steel-100">
              {user?.name}
            </p>
            <p className="truncate text-[11px] text-steel-400">مسؤول المنصة</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
