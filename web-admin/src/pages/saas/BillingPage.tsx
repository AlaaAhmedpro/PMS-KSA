import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageScaffold } from "../../components/sa/PageScaffold";
import { StatusPill } from "../../components/sa/StatusPill";
import { Button } from "../../components/ui/Button";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { usePlatform } from "../../store/PlatformStore";
import { useAuth } from "../../store/AuthContext";
import { can } from "../../lib/platformRbac";
import type { InvoiceStatus } from "../../lib/platformDomain";
import { formatSar } from "../../lib/format";
import { useLocale } from "../../store/LocaleContext";
import { usePlatformLabels } from "../../lib/platformI18n";

export function BillingPage() {
  const { invoices, organizations, settings, updateInvoiceStatus } =
    usePlatform();
  const { user } = useAuth();
  const { t } = useLocale();
  const { invoiceStatus, invoiceStatusOptions } = usePlatformLabels();
  const writable = can(user?.role, "billing.write");
  const [status, setStatus] = useState("all");

  const rows = useMemo(
    () => invoices.filter((i) => status === "all" || i.status === status),
    [invoices, status],
  );

  const totals = useMemo(() => {
    const paid = invoices
      .filter((i) => i.status === "paid")
      .reduce((a, i) => a + i.totalSar, 0);
    const open = invoices
      .filter((i) => i.status === "open")
      .reduce((a, i) => a + i.totalSar, 0);
    const failed = invoices.filter((i) => i.status === "failed").length;
    return { paid, open, failed };
  }, [invoices]);

  const toneFor = (s: InvoiceStatus) =>
    s === "paid"
      ? "success"
      : s === "failed"
        ? "danger"
        : s === "open"
          ? "warning"
          : "neutral";

  return (
    <PageScaffold
      title={t("page.billing.title")}
      subtitle={t("page.billing.subtitle", {
        vat: (settings.vatRate * 100).toFixed(0),
        currency: settings.defaultCurrency,
      })}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sa-kpi p-4">
          <p className="text-xs font-semibold text-slate-500">{t("page.billing.collected")}</p>
          <p className="mt-1 text-xl font-extrabold">{formatSar(totals.paid)}</p>
        </div>
        <div className="sa-kpi p-4">
          <p className="text-xs font-semibold text-slate-500">{t("page.billing.open")}</p>
          <p className="mt-1 text-xl font-extrabold">{formatSar(totals.open)}</p>
        </div>
        <div className="sa-kpi p-4">
          <p className="text-xs font-semibold text-slate-500">{t("page.billing.failed")}</p>
          <p className="mt-1 text-xl font-extrabold text-red-700">{totals.failed}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <SearchableSelect
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: t("page.billing.allInvoices") },
            ...invoiceStatusOptions(),
          ]}
        />
      </div>

      <div className="sa-surface overflow-x-auto">
        <table className="sa-table w-full min-w-[900px]">
          <thead>
            <tr className="border-b">
              <th className="px-3 py-2 text-start">{t("page.billing.col.number")}</th>
              <th className="px-3 py-2 text-start">{t("page.subs.col.org")}</th>
              <th className="px-3 py-2 text-start">{t("page.billing.col.issue")}</th>
              <th className="px-3 py-2 text-start">{t("page.billing.col.due")}</th>
              <th className="px-3 py-2 text-start">{t("page.billing.col.subtotal")}</th>
              <th className="px-3 py-2 text-start">{t("page.billing.col.vat")}</th>
              <th className="px-3 py-2 text-start">{t("page.billing.col.total")}</th>
              <th className="px-3 py-2 text-start">{t("common.status")}</th>
              <th className="px-3 py-2 text-start">{t("page.billing.col.action")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => {
              const org = organizations.find((o) => o.id === inv.organizationId);
              return (
                <tr key={inv.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-semibold">{inv.number}</td>
                  <td className="px-3 py-2">
                    <Link
                      to={`/organizations/${inv.organizationId}`}
                      className="text-blue-700 hover:underline"
                    >
                      {org?.name || inv.organizationId}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs">{inv.issueDate}</td>
                  <td className="px-3 py-2 text-xs">{inv.dueDate}</td>
                  <td className="px-3 py-2 tabular-nums">{formatSar(inv.subtotalSar)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatSar(inv.vatSar)}</td>
                  <td className="px-3 py-2 tabular-nums font-bold">
                    {formatSar(inv.totalSar)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill label={invoiceStatus(inv.status)} tone={toneFor(inv.status)} />
                  </td>
                  <td className="px-3 py-2">
                    {writable && inv.status === "open" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateInvoiceStatus(inv.id, "paid")}
                      >
                        {t("page.billing.recordPayment")}
                      </Button>
                    ) : writable && inv.status === "failed" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateInvoiceStatus(inv.id, "open")}
                      >
                        {t("page.billing.reopen")}
                      </Button>
                    ) : (
                      t("common.dash")
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PageScaffold>
  );
}