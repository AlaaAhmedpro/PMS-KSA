import { CreditCard } from "lucide-react";
import { PageHeader } from "../../components/common/PageHeader";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { usePlatform } from "../../store/PlatformStore";
import { formatNumber } from "../../lib/format";

export function PlatformPlans() {
  const { plans, togglePlanActive } = usePlatform();

  return (
    <div>
      <PageHeader
        title="خطط الاشتراك"
        subtitle="باقات المنصة — الأسعار والمقاعد والميزات"
        icon={<CreditCard className="h-6 w-6" />}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className="flex flex-col">
            <CardHeader
              title={plan.name}
              subtitle={
                plan.active ? "متاحة للاشتراك" : "غير متاحة حالياً"
              }
            />
            <p className="mb-2 text-2xl font-extrabold text-brand-600 dark:text-brand-400">
              {formatNumber(plan.priceMonthly)}{" "}
              <span className="text-sm font-semibold text-steel-500">ر.س / شهر</span>
            </p>
            <p className="mb-4 text-sm text-steel-600 dark:text-steel-300">
              يشمل {plan.seatsIncluded} مقعداً
            </p>
            <ul className="mb-6 flex-1 space-y-2 text-sm text-steel-700 dark:text-steel-200">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-brand-500">•</span>
                  {f}
                </li>
              ))}
            </ul>
            <Button
              variant={plan.active ? "outline" : "primary"}
              onClick={() => togglePlanActive(plan.id)}
            >
              {plan.active ? "إيقاف العرض" : "تفعيل العرض"}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
