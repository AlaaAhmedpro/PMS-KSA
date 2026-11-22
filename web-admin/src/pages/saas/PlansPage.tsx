import { Link } from "react-router-dom";
import { PageScaffold } from "../../components/sa/PageScaffold";
import { StatusPill } from "../../components/sa/StatusPill";
import { Button } from "../../components/ui/Button";
import { usePlatform } from "../../store/PlatformStore";
import { useAuth } from "../../store/AuthContext";
import { can } from "../../lib/platformRbac";
import { usePlatformLabels } from "../../lib/platformI18n";
import { formatSar } from "../../lib/format";
import { useLocale } from "../../store/LocaleContext";

export function PlansPage() {
  const { plans, togglePlanActive } = usePlatform();
  const { user } = useAuth();
  const { t } = useLocale();
  const { clientShort } = usePlatformLabels();
  const writable = can(user?.role, "plans.write");

  return (
    <PageScaffold
      title={t("page.plans.title")}
      subtitle={t("page.plans.subtitle")}
      actions={
        writable ? (
          <Link to="/plans/new">
            <Button>{t("page.plans.new")}</Button>
          </Link>
        ) : null
      }
    >
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => (
          <div key={p.id} className="sa-surface flex flex-col p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">{p.name}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {clientShort(p.clientType)}
                </p>
              </div>
              <StatusPill
                label={p.active ? t("common.planActive") : t("common.planInactive")}
                tone={p.active ? "success" : "neutral"}
              />
            </div>
            <p className="mt-3 text-sm text-slate-600">{p.description}</p>
            <p className="mt-3 text-lg font-extrabold text-slate-900">
              {formatSar(p.priceMonthly)}
              <span className="text-xs font-semibold text-slate-400">
                {" "}
                / {t("common.monthly")}
              </span>
            </p>
            <p className="text-xs text-slate-500">
              {p.priceAnnual != null
                ? t("common.annualLine", { amount: formatSar(p.priceAnnual) })
                : ""}
              {t("common.trialLine", { n: p.trialDays })}
            </p>
            <ul className="mt-3 space-y-1 text-xs text-slate-600">
              <li>
                {t("common.users")}: {p.limits.maxUsers}
              </li>
              <li>
                {t("common.projects")}: {p.limits.maxProjects}
              </li>
              <li>
                {t("common.storage")}: {p.limits.maxStorageGb} GB
              </li>
            </ul>
            <div className="mt-4 flex gap-2">
              <Link to={`/plans/${p.id}`} className="flex-1">
                <Button variant="outline" className="w-full" size="sm">
                  {writable ? t("common.edit") : t("common.view")}
                </Button>
              </Link>
              {writable ? (
                <Button size="sm" variant="ghost" onClick={() => togglePlanActive(p.id)}>
                  {p.active ? t("common.disable") : t("common.enable")}
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </PageScaffold>
  );
}