import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageScaffold } from "../../components/sa/PageScaffold";
import { StatusPill } from "../../components/sa/StatusPill";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { usePlatform } from "../../store/PlatformStore";
import { formatSar } from "../../lib/format";
import { useLocale } from "../../store/LocaleContext";
import { usePlatformLabels } from "../../lib/platformI18n";

export function SubscriptionsPage() {
  const { subscriptions, organizations, plans } = usePlatform();
  const { t } = useLocale();
  const { subStatus, subStatusOptions } = usePlatformLabels();
  const [status, setStatus] = useState("all");

  const rows = useMemo(
    () =>
      subscriptions.filter((s) => status === "all" || s.status === status),
    [subscriptions, status],
  );

  return (
    <PageScaffold
      title={t("page.subs.title")}
      subtitle={t("page.subs.subtitle")}
      actions={
        <SearchableSelect
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: t("page.subs.allStatuses") },
            ...subStatusOptions(),
          ]}
        />
      }
    >
      <div className="sa-surface overflow-x-auto">
        <table className="sa-table w-full min-w-[800px]">
          <thead>
            <tr className="border-b">
              <th className="px-3 py-2 text-start">{t("page.subs.col.org")}</th>
              <th className="px-3 py-2 text-start">{t("page.subs.col.plan")}</th>
              <th className="px-3 py-2 text-start">{t("common.status")}</th>
              <th className="px-3 py-2 text-start">{t("page.subs.col.cycle")}</th>
              <th className="px-3 py-2 text-start">MRR</th>
              <th className="px-3 py-2 text-start">{t("page.subs.col.renew")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const org = organizations.find((o) => o.id === s.organizationId);
              const plan = plans.find((p) => p.id === s.planId);
              return (
                <tr key={s.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">
                    <Link
                      to={`/organizations/${s.organizationId}`}
                      className="font-semibold text-blue-700 hover:underline"
                    >
                      {org?.name || s.organizationId}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{plan?.name || s.planId}</td>
                  <td className="px-3 py-2">
                    <StatusPill
                      label={subStatus(s.status)}
                      tone={
                        s.status === "active"
                          ? "success"
                          : s.status === "trial"
                            ? "info"
                            : s.status === "past_due"
                              ? "warning"
                              : "danger"
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    {s.billingCycle === "annual"
                      ? t("common.annualShort")
                      : t("common.monthlyShort")}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{formatSar(s.mrrSar)}</td>
                  <td className="px-3 py-2 text-xs">{s.renewAt.slice(0, 10)}</td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                  {t("page.subs.empty")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </PageScaffold>
  );
}