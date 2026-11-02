import { Inbox } from "lucide-react";
import { PageHeader } from "../../components/common/PageHeader";
import { Card } from "../../components/ui/Card";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { usePlatform } from "../../store/PlatformStore";
import { formatShortDate } from "../../lib/format";
import type { DemoRequestStatus } from "../../lib/types";

const STATUS_LABELS: Record<DemoRequestStatus, string> = {
  new: "جديد",
  contacted: "تم التواصل",
  scheduled: "مجدول",
  closed: "مغلق",
};

export function PlatformDemoRequests() {
  const { demoRequests, updateDemoRequestStatus } = usePlatform();

  return (
    <div>
      <PageHeader
        title="طلبات العرض التجريبي"
        subtitle="طلبات واردة من جهات مهتمة بمنظومة إدارة المشاريع"
        icon={<Inbox className="h-6 w-6" />}
      />

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-steel-200 bg-steel-50 text-start dark:border-steel-700 dark:bg-steel-800/60">
                <th className="px-4 py-3 font-bold">المنشأة</th>
                <th className="px-4 py-3 font-bold">مسؤول التواصل</th>
                <th className="px-4 py-3 font-bold">البريد</th>
                <th className="px-4 py-3 font-bold">الجوال</th>
                <th className="px-4 py-3 font-bold">الرسالة</th>
                <th className="px-4 py-3 font-bold">الحالة</th>
                <th className="px-4 py-3 font-bold">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {demoRequests.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-steel-100 align-top dark:border-steel-800"
                >
                  <td className="px-4 py-3 font-semibold">{d.orgName}</td>
                  <td className="px-4 py-3">{d.contactName}</td>
                  <td className="px-4 py-3 font-mono text-xs" dir="ltr">
                    {d.email}
                  </td>
                  <td className="px-4 py-3 tabular-nums" dir="ltr">
                    {d.phone}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-steel-600 dark:text-steel-300">
                    {d.message}
                  </td>
                  <td className="px-4 py-3">
                    <SearchableSelect
                      value={d.status}
                      onChange={(v) =>
                        updateDemoRequestStatus(d.id, v as DemoRequestStatus)
                      }
                      options={(
                        Object.keys(STATUS_LABELS) as DemoRequestStatus[]
                      ).map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
                      className="min-w-[130px]"
                    />
                  </td>
                  <td className="px-4 py-3 text-steel-500">
                    {formatShortDate(d.createdAt.slice(0, 10))}
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
