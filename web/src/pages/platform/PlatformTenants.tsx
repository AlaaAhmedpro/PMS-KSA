import { Building2 } from "lucide-react";
import { PageHeader } from "../../components/common/PageHeader";
import { Card } from "../../components/ui/Card";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { usePlatform } from "../../store/PlatformStore";
import { formatShortDate } from "../../lib/format";
import type { TenantStatus } from "../../lib/types";

const STATUS_LABELS: Record<TenantStatus, string> = {
  active: "نشط",
  trial: "تجريبي",
  suspended: "موقوف",
};

export function PlatformTenants() {
  const { tenants, plans, updateTenantStatus } = usePlatform();
  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? id;

  return (
    <div>
      <PageHeader
        title="المستأجرون"
        subtitle="منظمات مسجّلة على المنصة — الخطة والحالة وعدد المقاعد"
        icon={<Building2 className="h-6 w-6" />}
      />

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-steel-200 bg-steel-50 text-start dark:border-steel-700 dark:bg-steel-800/60">
                <th className="px-4 py-3 font-bold text-steel-600 dark:text-steel-300">
                  المنشأة
                </th>
                <th className="px-4 py-3 font-bold text-steel-600 dark:text-steel-300">
                  القطاع
                </th>
                <th className="px-4 py-3 font-bold text-steel-600 dark:text-steel-300">
                  الخطة
                </th>
                <th className="px-4 py-3 font-bold text-steel-600 dark:text-steel-300">
                  المقاعد
                </th>
                <th className="px-4 py-3 font-bold text-steel-600 dark:text-steel-300">
                  الحالة
                </th>
                <th className="px-4 py-3 font-bold text-steel-600 dark:text-steel-300">
                  تاريخ التسجيل
                </th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-steel-100 dark:border-steel-800"
                >
                  <td className="px-4 py-3 font-semibold text-steel-800 dark:text-steel-100">
                    {t.name}
                  </td>
                  <td className="px-4 py-3 text-steel-600 dark:text-steel-300">
                    {t.sector}
                  </td>
                  <td className="px-4 py-3">{planName(t.planId)}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {t.usedSeats} / {t.seats}
                  </td>
                  <td className="px-4 py-3">
                    <SearchableSelect
                      value={t.status}
                      onChange={(v) => updateTenantStatus(t.id, v as TenantStatus)}
                      options={(
                        Object.keys(STATUS_LABELS) as TenantStatus[]
                      ).map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
                      className="max-w-[140px]"
                    />
                  </td>
                  <td className="px-4 py-3 text-steel-500">
                    {formatShortDate(t.createdAt.slice(0, 10))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
