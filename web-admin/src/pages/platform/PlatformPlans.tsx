import { useMemo, useState } from "react";
import { Check, CreditCard, Plus, X } from "lucide-react";
import { PageHeader } from "../../components/common/PageHeader";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Input";
import { usePlatform } from "../../store/PlatformStore";
import { formatNumber } from "../../lib/format";
import {
  MODULE_DESCRIPTIONS,
  MODULE_LABELS,
  normalizeOrgModules,
  type OrgModuleKey,
} from "../../lib/orgModules";
import { cn } from "../../lib/cn";
import type { SubscriptionPlan, TenantPlanId } from "../../lib/types";

export function PlatformPlans() {
  const { plans, togglePlanActive, updatePlan } = usePlatform();
  const [selectedId, setSelectedId] = useState<TenantPlanId>(
    plans[0]?.id ?? "starter",
  );
  const [featureDraft, setFeatureDraft] = useState("");

  const selected = useMemo(
    () => plans.find((p) => p.id === selectedId) ?? plans[0],
    [plans, selectedId],
  );

  if (!selected) {
    return (
      <div>
        <PageHeader
          title="الخطط والاشتراكات"
          subtitle="لا توجد خطط"
          icon={<CreditCard className="h-6 w-6" />}
        />
      </div>
    );
  }

  const modules = normalizeOrgModules(selected.enabledModules);

  const patch = (partial: Partial<SubscriptionPlan>) => {
    updatePlan(selected.id, partial);
  };

  const toggleModule = (key: OrgModuleKey) => {
    const next = { ...modules, [key]: !modules[key] };
    if (key === "portfolio" && modules.portfolio) next.program = false;
    if (key === "program" && !modules.program) {
      next.portfolio = true;
      next.program = true;
    }
    if (key === "initiative" || key === "strategicObjectives") {
      const on = !modules[key];
      next.initiative = on;
      next.strategicObjectives = on;
    }
    patch({ enabledModules: normalizeOrgModules(next) });
  };

  const addFeature = () => {
    const text = featureDraft.trim();
    if (!text) return;
    if (selected.features.includes(text)) {
      setFeatureDraft("");
      return;
    }
    patch({ features: [...selected.features, text] });
    setFeatureDraft("");
  };

  const removeFeature = (f: string) => {
    patch({ features: selected.features.filter((x) => x !== f) });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="الخطط والاشتراكات"
        subtitle="كل فئة جهة لها المميزات ومسار العمل والوحدات — تُطبَّق على المستأجر عند الاشتراك"
        icon={<CreditCard className="h-6 w-6" />}
      />

      <div className="grid gap-3 lg:grid-cols-3">
        {plans.map((plan) => {
          const active = plan.id === selected.id;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedId(plan.id)}
              className={cn(
                "rounded-xl border p-4 text-start transition-colors",
                active
                  ? "border-brand-500 bg-brand-500/10"
                  : "border-steel-200 hover:bg-steel-50 dark:border-steel-700 dark:hover:bg-steel-800",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-extrabold text-steel-800 dark:text-steel-100">
                  {plan.name}
                </p>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold",
                    plan.active
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-steel-200 text-steel-500",
                  )}
                >
                  {plan.active ? "متاحة" : "متوقفة"}
                </span>
              </div>
              <p className="mt-1 text-xs text-steel-500">{plan.description}</p>
              <p className="mt-2 text-[10px] font-bold text-brand-700 dark:text-brand-300">
                {plan.workflow}
              </p>
              <p className="mt-3 text-lg font-extrabold text-steel-800 dark:text-steel-100">
                {formatNumber(plan.priceMonthly)}{" "}
                <span className="text-xs font-semibold text-steel-500">ر.س/شهر</span>
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="space-y-4 p-4">
          <CardHeader
            title="بيانات الخطة"
            subtitle={`${selected.name} · ${selected.seatsIncluded} مقعد`}
          />
          <Field label="اسم العرض">
            <Input
              value={selected.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </Field>
          <Field label="الوصف">
            <Input
              value={selected.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </Field>
          <Field label="مسار العمل (Workflow)">
            <Input
              value={selected.workflow}
              onChange={(e) => patch({ workflow: e.target.value })}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="السعر الشهري (ر.س)">
              <Input
                type="number"
                value={String(selected.priceMonthly)}
                onChange={(e) =>
                  patch({ priceMonthly: Number(e.target.value) || 0 })
                }
              />
            </Field>
            <Field label="المقاعد المشمولة">
              <Input
                type="number"
                value={String(selected.seatsIncluded)}
                onChange={(e) =>
                  patch({ seatsIncluded: Number(e.target.value) || 0 })
                }
              />
            </Field>
          </div>
          <Button
            variant={selected.active ? "outline" : "primary"}
            onClick={() => togglePlanActive(selected.id)}
          >
            {selected.active ? "إيقاف العرض" : "تفعيل العرض"}
          </Button>
        </Card>

        <Card className="space-y-4 p-4">
          <CardHeader
            title="الوحدات (Modules)"
            subtitle="ما يظهر في منظومة المستأجر عند الاشتراك بهذه الخطة"
          />
          <div className="divide-y divide-steel-100 dark:divide-steel-800">
            {(Object.keys(MODULE_LABELS) as OrgModuleKey[]).map((key) => {
              const on = modules[key];
              return (
                <div
                  key={key}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-bold text-steel-800 dark:text-steel-100">
                      {MODULE_LABELS[key]}
                    </p>
                    <p className="text-[11px] text-steel-500">
                      {MODULE_DESCRIPTIONS[key]}
                    </p>
                  </div>
                  <Button
                    variant={on ? "primary" : "outline"}
                    size="sm"
                    onClick={() => toggleModule(key)}
                  >
                    {on ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        مفعّلة
                      </>
                    ) : (
                      "معطّلة"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-steel-400">
            المشاريع والمهام متاحة دائماً خارج هذه الوحدات.
          </p>
        </Card>
      </div>

      <Card className="space-y-3 p-4">
        <CardHeader
          title="المميزات المعروضة في الاشتراك"
          subtitle="قائمة الميزات الظاهرة لفريق المبيعات والمستأجر"
        />
        <ul className="space-y-2">
          {selected.features.map((f) => (
            <li
              key={f}
              className="flex items-center justify-between gap-2 rounded-xl border border-steel-200 px-3 py-2 text-sm dark:border-steel-700"
            >
              <span className="text-steel-700 dark:text-steel-200">{f}</span>
              <button
                type="button"
                className="rounded-lg p-1 text-steel-400 hover:bg-steel-100 hover:text-red-500 dark:hover:bg-steel-800"
                onClick={() => removeFeature(f)}
                aria-label="حذف الميزة"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={featureDraft}
            onChange={(e) => setFeatureDraft(e.target.value)}
            placeholder="ميزة جديدة…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addFeature();
              }
            }}
          />
          <Button variant="outline" onClick={addFeature}>
            <Plus className="h-4 w-4" />
            إضافة
          </Button>
        </div>
      </Card>
    </div>
  );
}
