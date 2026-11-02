import { Building2, CreditCard, Inbox, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/common/PageHeader";
import { KpiCard } from "../components/common/KpiCard";
import { Card, CardHeader } from "../components/ui/Card";
import { usePlatform } from "../store/PlatformStore";
import { formatNumber } from "../lib/format";

export function AdminDashboard() {
  const { tenants, plans, demoRequests } = usePlatform();

  const active = tenants.filter((t) => t.status === "active").length;
  const trial = tenants.filter((t) => t.status === "trial").length;
  const newDemos = demoRequests.filter((d) => d.status === "new").length;
  const mrr = tenants
    .filter((t) => t.status === "active" || t.status === "trial")
    .reduce((sum, t) => {
      const plan = plans.find((p) => p.id === t.planId);
      return sum + (plan?.priceMonthly ?? 0);
    }, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="لوحة المنصة"
        subtitle="ملخص المستأجرين والاشتراكات وطلبات العرض"
        icon={<Building2 className="h-6 w-6" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          featured
          label="المستأجرون"
          value={formatNumber(tenants.length)}
          icon={<Building2 className="h-5 w-5" />}
          tone="steel"
          hint={`${active} نشط · ${trial} تجريبي`}
          delay={0}
        />
        <KpiCard
          label="الإيراد الشهري الاسترشادي"
          value={`${formatNumber(mrr)} ر.س`}
          icon={<CreditCard className="h-5 w-5" />}
          tone="brand"
          hint="مجموع خطط النشطين والتجريبيين"
          delay={0.05}
        />
        <KpiCard
          label="الخطط المنشورة"
          value={formatNumber(plans.filter((p) => p.active).length)}
          icon={<Users className="h-5 w-5" />}
          tone="steel"
          hint={`من أصل ${plans.length}`}
          delay={0.1}
        />
        <KpiCard
          label="طلبات عرض جديدة"
          value={formatNumber(newDemos)}
          icon={<Inbox className="h-5 w-5" />}
          tone="amber"
          hint={`${demoRequests.length} إجمالي الطلبات`}
          delay={0.15}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="أحدث المستأجرين" subtitle="آخر المنشآت المسجّلة" />
          <ul className="space-y-3">
            {[...tenants]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 5)
              .map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-steel-50 px-3 py-2.5 dark:bg-steel-800/50"
                >
                  <div>
                    <p className="text-sm font-bold text-steel-800 dark:text-steel-100">
                      {t.name}
                    </p>
                    <p className="text-xs text-steel-500">{t.sector}</p>
                  </div>
                  <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                    {t.status === "active"
                      ? "نشط"
                      : t.status === "trial"
                        ? "تجريبي"
                        : "موقوف"}
                  </span>
                </li>
              ))}
          </ul>
          <Link
            to="/tenants"
            className="mt-4 inline-flex text-sm font-bold text-brand-600 hover:underline dark:text-brand-400"
          >
            عرض كل المستأجرين
          </Link>
        </Card>

        <Card>
          <CardHeader title="طلبات العرض" subtitle="بانتظار المتابعة" />
          <ul className="space-y-3">
            {demoRequests.slice(0, 5).map((d) => (
              <li
                key={d.id}
                className="rounded-xl bg-steel-50 px-3 py-2.5 dark:bg-steel-800/50"
              >
                <p className="text-sm font-bold text-steel-800 dark:text-steel-100">
                  {d.orgName}
                </p>
                <p className="text-xs text-steel-500">
                  {d.contactName} · {d.status === "new" ? "جديد" : d.status}
                </p>
              </li>
            ))}
          </ul>
          <Link
            to="/demo-requests"
            className="mt-4 inline-flex text-sm font-bold text-brand-600 hover:underline dark:text-brand-400"
          >
            إدارة الطلبات
          </Link>
        </Card>
      </div>
    </div>
  );
}
