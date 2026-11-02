import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLocale } from "../../store/LocaleContext";
import { Button } from "../ui/Button";

export function PageHeader({
  title,
  subtitle,
  actions,
  icon,
  showBack,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: ReactNode;
  /** Show history back control. Default: true except on home `/`. */
  showBack?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { dir } = useLocale();
  const isHome = location.pathname === "/";
  const backVisible = showBack ?? !isHome;

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/", { replace: true });
  };

  return (
    <div className="page-header mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {backVisible ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={goBack}
            className="shrink-0"
            aria-label="رجوع"
            title="رجوع للصفحة السابقة"
          >
            {dir === "rtl" ? (
              <ArrowRight className="h-4 w-4" />
            ) : (
              <ArrowLeft className="h-4 w-4" />
            )}
            رجوع
          </Button>
        ) : null}
        {icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold text-steel-800 dark:text-steel-50 sm:text-xl md:text-2xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-sm text-steel-500 dark:text-steel-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="page-header__actions flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          {actions}
        </div>
      )}
    </div>
  );
}
