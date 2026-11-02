import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  Headphones,
  CreditCard,
  Receipt,
  BarChart3,
  Target,
  Activity,
  Shield,
  Settings2,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { BRAND } from "../../lib/brand";
import { useAuth } from "../../store/AuthContext";
import { can, type PlatformPermission } from "../../lib/platformRbac";
import { PLATFORM_ROLE_LABELS, type PlatformRoleId } from "../../lib/platformDomain";
import { normalizePlatformRole } from "../../lib/platformRbac";
import { useLocale } from "../../store/LocaleContext";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  perm: PlatformPermission;
  end?: boolean;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

const GROUPS: NavGroup[] = [
  {
    id: "main",
    label: "الرئيسية",
    items: [
      { to: "/", label: "نظرة عامة", icon: LayoutDashboard, perm: "overview", end: true },
    ],
  },
  {
    id: "customers",
    label: "العملاء",
    items: [
      { to: "/organizations", label: "المنشآت / المستأجرون", icon: Building2, perm: "organizations" },
      { to: "/platform-users", label: "المستخدمون والصلاحيات", icon: Users, perm: "platform_users" },
      { to: "/support", label: "دعم العملاء", icon: Headphones, perm: "support" },
    ],
  },
  {
    id: "commerce",
    label: "التجارة",
    items: [
      { to: "/plans", label: "الخطط والاشتراكات", icon: CreditCard, perm: "plans" },
      { to: "/subscriptions", label: "الاشتراكات", icon: Receipt, perm: "subscriptions" },
      { to: "/billing", label: "الفوترة والمالية", icon: Receipt, perm: "billing" },
      { to: "/analytics", label: "التحليلات والتقارير", icon: BarChart3, perm: "analytics" },
      { to: "/leads", label: "الفرص والمبيعات", icon: Target, perm: "leads" },
    ],
  },
  {
    id: "system",
    label: "النظام",
    items: [
      { to: "/monitoring", label: "مراقبة النظام", icon: Activity, perm: "monitoring" },
      { to: "/audit", label: "الأمن والتدقيق", icon: Shield, perm: "audit" },
      { to: "/settings", label: "إعدادات المنصة", icon: Settings2, perm: "settings" },
    ],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const { dir } = useLocale();
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    main: true,
    customers: true,
    commerce: true,
    system: true,
  });

  const role = normalizePlatformRole(user?.role || "readonly_admin");

  const groups = useMemo(
    () =>
      GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((i) => can(role, i.perm)),
      })).filter((g) => g.items.length > 0),
    [role],
  );

  return (
    <aside
      dir={dir}
      className={cn(
        "sa-sidebar flex h-full flex-col transition-[width] duration-150",
        collapsed ? "w-[72px]" : "w-72",
      )}
    >
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
        <img
          src={BRAND.systemLogoLocal}
          alt=""
          className="h-10 w-10 rounded-md bg-white object-contain p-1"
        />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-white">
              Super Admin
            </p>
            <p className="truncate text-[11px] text-slate-400">
              {BRAND.companyName}
            </p>
          </div>
        )}
      </div>

      {!collapsed && user && (
        <div className="border-b border-white/10 px-4 py-3">
          <p className="truncate text-sm font-bold text-slate-100">{user.name}</p>
          <p className="truncate text-[11px] text-slate-400">{user.email}</p>
          <p className="mt-1 text-[10px] font-semibold text-blue-300">
            {PLATFORM_ROLE_LABELS[role as PlatformRoleId]}
          </p>
        </div>
      )}

      <nav className="flex-1 space-y-3 overflow-y-auto p-3">
        {groups.map((group) => (
          <div key={group.id}>
            {!collapsed && (
              <button
                type="button"
                className="sa-sidebar__group-label mb-1 flex w-full items-center justify-between px-2 py-1"
                onClick={() =>
                  setOpenGroups((s) => ({ ...s, [group.id]: !s[group.id] }))
                }
              >
                <span>{group.label}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition",
                    !openGroups[group.id] && "-rotate-90",
                  )}
                />
              </button>
            )}
            {(collapsed || openGroups[group.id]) && (
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    title={item.label}
                    className={({ isActive }) =>
                      cn(
                        "sa-nav-link flex items-center gap-3 px-3 py-2.5 text-sm font-semibold",
                        isActive && "is-active",
                        collapsed && "justify-center px-2",
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="sa-nav-link flex w-full items-center justify-center gap-2 px-3 py-2 text-xs font-semibold"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" />
              طي القائمة
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
