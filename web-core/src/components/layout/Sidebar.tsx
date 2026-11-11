import { NavLink } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../lib/cn";
import { BRAND } from "../../lib/brand";
import { useAuth } from "../../store/AuthContext";
import { useLocale } from "../../store/LocaleContext";
import { useSidebarNav } from "../../hooks/useSidebarNav";
import type { NavSectionId } from "../../nav/types";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, organization } = useAuth();
  const { t } = useLocale();
  const { sections, expanded, toggleSection, isActive, clientType } =
    useSidebarNav();
  const roleLabel = user?.role ? t(`role.${user.role}`) : "";
  const clientShort = t(`client.${clientType}.short`);

  return (
    <aside className="flex h-full w-72 flex-col border-e border-steel-200 bg-white dark:border-steel-800 dark:bg-steel-900">
      <div className="flex flex-col items-center gap-2 border-b border-steel-100 px-5 py-5 dark:border-steel-800">
        <img
          src={BRAND.systemLogoLocal}
          alt={t("brand.systemName")}
          className="h-16 w-16 rounded-full border border-steel-200 bg-white object-contain p-1 shadow-sm dark:border-steel-700"
        />
        <p className="text-center text-[13px] font-extrabold leading-snug text-steel-800 dark:text-steel-100">
          {organization?.name ?? t("brand.systemName")}
        </p>
        <span className="rounded-full border border-brand-500/30 bg-brand-500/10 px-2.5 py-0.5 text-[10px] font-bold text-brand-700 dark:text-brand-300">
          {clientShort}
        </span>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto p-3" aria-label={t("nav.main")}>
        {sections.map((section) => {
          const open = expanded[section.id] !== false;
          return (
            <div key={section.id} className="space-y-0.5">
              <button
                type="button"
                onClick={() => toggleSection(section.id as NavSectionId)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start hover:bg-steel-50 dark:hover:bg-steel-800/60"
              >
                <span>
                  <span className="block text-[10px] font-bold tracking-wide text-steel-400">
                    {t(section.labelKey)}
                  </span>
                  {section.captionKey ? (
                    <span className="block text-[9px] text-steel-400/80">
                      {t(section.captionKey)}
                    </span>
                  ) : null}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-steel-400 transition-transform",
                    open && "rotate-180",
                  )}
                />
              </button>

              {open
                ? section.items.map((item) => {
                    const active = isActive(item);
                    const label = t(item.labelKey);
                    return (
                      <NavLink
                        key={item.id}
                        to={item.to}
                        end={item.to === "/"}
                        onClick={onNavigate}
                        title={label}
                        className={cn(
                          "group relative flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
                          active
                            ? "bg-brand-500/10 text-brand-700 dark:text-brand-300"
                            : "text-steel-600 hover:bg-steel-100 dark:text-steel-300 dark:hover:bg-steel-800",
                        )}
                      >
                        {active ? (
                          <motion.span
                            layoutId="sidebar-active"
                            className="absolute inset-y-1 start-0 w-1 rounded-e-full bg-brand-500"
                          />
                        ) : null}
                        <item.icon className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />
                        <span className="min-w-0 truncate leading-snug">
                          <span className="block truncate">{label}</span>
                          {item.hintKey ? (
                            <span className="mt-0.5 block truncate text-[9px] font-medium text-steel-400">
                              {t(item.hintKey)}
                            </span>
                          ) : null}
                        </span>
                      </NavLink>
                    );
                  })
                : null}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-steel-100 p-4 dark:border-steel-800">
        <div className="flex items-center gap-3 rounded-xl bg-steel-50 p-3 dark:bg-steel-800/60">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
            {user?.name?.charAt(0) || "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-steel-800 dark:text-steel-100">
              {user?.name}
            </p>
            <p className="truncate text-[11px] text-steel-400">{roleLabel}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
