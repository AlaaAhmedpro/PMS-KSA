import { Link } from "react-router-dom";
import { PageScaffold } from "../../components/sa/PageScaffold";
import { StatusPill } from "../../components/sa/StatusPill";
import { Button } from "../../components/ui/Button";
import { usePlatform, formatSar } from "../../store/PlatformStore";
import { useAuth } from "../../store/AuthContext";
import { can } from "../../lib/platformRbac";
import { CLIENT_TYPE_META } from "../../lib/orgModules";

export function PlansPage() {
  const { plans, togglePlanActive } = usePlatform();
  const { user } = useAuth();
  const writable = can(user?.role, "plans.write");

  return (
    <PageScaffold
      title="الخطط والباقات"
      subtitle="تعريف التسعير والحدود والامتيازات — دون قيود ثابتة في الواجهة"
      actions={
        writable ? (
          <Link to="/plans/new">
            <Button>خطة جديدة</Button>
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
                  {CLIENT_TYPE_META[p.clientType].shortLabel}
                </p>
              </div>
              <StatusPill
                label={p.active ? "نشطة" : "متوقفة"}
                tone={p.active ? "success" : "neutral"}
              />
            </div>
            <p className="mt-3 text-sm text-slate-600">{p.description}</p>
            <p className="mt-3 text-lg font-extrabold text-slate-900">
              {formatSar(p.priceMonthly)}
              <span className="text-xs font-semibold text-slate-400"> / شهرياً</span>
            </p>
            <p className="text-xs text-slate-500">
              {p.priceAnnual != null
                ? `سنوي ${formatSar(p.priceAnnual)} · `
                : ""}
              تجربة {p.trialDays} يوماً
            </p>
            <ul className="mt-3 space-y-1 text-xs text-slate-600">
              <li>مستخدمون: {p.limits.maxUsers}</li>
              <li>مشاريع: {p.limits.maxProjects}</li>
              <li>تخزين: {p.limits.maxStorageGb} GB</li>
            </ul>
            <div className="mt-4 flex gap-2">
              <Link to={`/plans/${p.id}`} className="flex-1">
                <Button variant="outline" className="w-full" size="sm">
                  {writable ? "تعديل" : "عرض"}
                </Button>
              </Link>
              {writable ? (
                <Button size="sm" variant="ghost" onClick={() => togglePlanActive(p.id)}>
                  {p.active ? "إيقاف" : "تفعيل"}
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </PageScaffold>
  );
}
