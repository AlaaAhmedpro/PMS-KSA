import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  Megaphone,
  ShieldCheck,
  FileBarChart,
  Archive,
  List,
  ChevronLeft,
  Building2,
  CreditCard,
  Inbox,
  Layers,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../lib/cn";
import { publicAsset } from "../../lib/assets";
import { useAuth } from "../../store/AuthContext";
import { useCan, useRbac } from "../../store/RbacContext";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  show: boolean;
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const can = useCan();
  const { roles } = useRbac();
  const role = user?.role;

  const items: NavItem[] = [
    { to: "/", label: "لوحة المؤشرات", icon: LayoutDashboard, show: true },
    {
      to: "/projects",
      label: "المشاريع",
      icon: FolderKanban,
      show: can.manageRecords(role) || can.execute(role) || role === "executive",
    },
    {
      to: "/tasks",
      label: "المهام",
      icon: ListTodo,
      show: can.manageRecords(role) || can.execute(role) || role === "executive",
    },
    {
      to: "/news",
      label: "شريط الأخبار",
      icon: Megaphone,
      show: can.manageNews(role, user?.newsAdmin),
    },
    {
      to: "/permissions",
      label: "الصلاحيات",
      icon: ShieldCheck,
      show: can.viewSettings(role),
    },
    {
      to: "/reports",
      label: "التقارير",
      icon: FileBarChart,
      show: can.viewSettings(role),
    },
    {
      to: "/archive",
      label: "الأرشيف الإلكتروني",
      icon: Archive,
      show: can.viewSettings(role),
    },
    {
      to: "/lookups",
      label: "إدارة القوائم",
      icon: List,
      show: can.viewSettings(role),
    },
  ];

  const platformItems: NavItem[] = [
    {
      to: "/platform/tenants",
      label: "المستأجرون",
      icon: Building2,
      show: can.viewPlatform(role),
    },
    {
      to: "/platform/plans",
      label: "خطط الاشتراك",
      icon: CreditCard,
      show: can.viewPlatform(role),
    },
    {
      to: "/platform/demo-requests",
      label: "طلبات العرض",
      icon: Inbox,
      show: can.viewPlatform(role),
    },
  ];

  const roleName = roles.find((r) => r.id === role)?.name;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all",
      isActive
        ? "bg-brand-500/10 text-brand-700 dark:text-brand-300"
        : "text-steel-600 hover:bg-steel-100 dark:text-steel-300 dark:hover:bg-steel-800",
    );

  const renderLink = (item: NavItem) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === "/"}
      onClick={onNavigate}
      className={linkClass}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="nav-active"
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
  );

  return (
    <aside className="flex h-full w-72 flex-col border-l border-steel-200 bg-white dark:border-steel-800 dark:bg-steel-900">
      <div className="flex flex-col items-center gap-3 border-b border-steel-100 px-5 py-6 dark:border-steel-800">
        <img
          src={publicAsset("/logo-2.png")}
          alt="شركة نماء للتطوير — قطاع تقنية المعلومات"
          className="h-24 w-24 object-contain"
        />
        <p className="text-center text-[13px] font-extrabold leading-snug text-steel-800 dark:text-steel-100">
          منظومة إدارة المشاريع والمهام
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.filter((i) => i.show).map(renderLink)}

        {platformItems.some((i) => i.show) && (
          <div className="pt-4">
            <p className="mb-2 flex items-center gap-2 px-3.5 text-[11px] font-bold uppercase tracking-wide text-steel-400">
              <Layers className="h-3.5 w-3.5" />
              المنصة
            </p>
            {platformItems.filter((i) => i.show).map(renderLink)}
          </div>
        )}
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
            <p className="truncate text-[11px] text-steel-400">{roleName}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
