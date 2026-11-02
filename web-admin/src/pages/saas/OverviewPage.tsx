import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageScaffold } from "../../components/sa/PageScaffold";
import { KpiStat } from "../../components/sa/KpiStat";
import { StatusPill, orgStatusTone } from "../../components/sa/StatusPill";
import { usePlatform, formatSar } from "../../store/PlatformStore";
import {
  CUSTOMER_KIND_LABELS,
  ORG_STATUS_LABELS,
} from "../../lib/platformDomain";

const PIE = ["#2563eb", "#0ea5e9", "#15803d", "#b45309", "#b91c1c", "#64748b"];

export function OverviewPage() {
  const {
    organizations,
    subscriptions,
    invoices,
    leads,
    tickets,
    monitoring,
    plans,
  } = usePlatform();
  const [range, setRange] = useState<"7" | "30" | "90">("30");

  const kpis = useMemo(() => {
    const activeOrgs = organizations.filter((o) => o.status === "active").length;
    const trial = subscriptions.filter((s) => s.status === "trial").length;
    const suspended = organizations.filter((o) => o.status === "suspended").length;
    const activeSubs = subscriptions.filter((s) => s.status === "active" || s.status === "trial").length;
    const mrr = subscriptions
      .filter((s) => s.status === "active" || s.status === "trial")
      .reduce((a, s) => a + s.mrrSar, 0);
    const users = organizations.reduce((a, o) => a + o.usage.users, 0);
    const projects = organizations.reduce((a, o) => a + o.usage.projects, 0);
    const expiring = organizations.filter((o) => {
      if (!o.renewalAt) return false;
      const d = (new Date(o.renewalAt).getTime() - Date.now()) / 86400000;
      return d >= 0 && d <= 45;
    }).length;
    return { activeOrgs, trial, suspended, activeSubs, mrr, arr: mrr * 12, users, projects, expiring, total: organizations.length };
  }, [organizations, subscriptions]);

  const byPlan = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of organizations) {
      const name = plans.find((p) => p.id === o.planId)?.name || o.planId;
      map.set(name, (map.get(name) || 0) + 1);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [organizations, plans]);

  const byKind = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of organizations) {
      const name = CUSTOMER_KIND_LABELS[o.customerKind];
      map.set(name, (map.get(name) || 0) + 1);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [organizations]);

  const growth = useMemo(() => {
    const months = ["مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر"];
    return months.map((name, i) => ({
      name,
      orgs: Math.max(2, Math.round(organizations.length * ((i + 3) / 8))),
      mrr: Math.round(kpis.mrr * ((i + 4) / 10)),
    }));
  }, [organizations.length, kpis.mrr]);

  const recentOrgs = [...organizations]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  const failed = invoices.filter((i) => i.status === "failed");
  const openTickets = tickets.filter((t) =>
    ["open", "in_progress", "escalated"].includes(t.status),
  );
  const pendingLeads = leads.filter((l) =>
    ["new", "qualified", "demo"].includes(l.status),
  );

  return (
    <PageScaffold
      title="نظرة عامة على المنصة"
      subtitle={`نافذة ${range} يوماً — مؤشرات تشغيلية عبر كل المستأجرين`}
      actions={
        <div className="flex rounded-md border border-slate-200 p-0.5 text-xs font-bold">
          {(["7", "30", "90"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded px-2.5 py-1.5 ${range === r ? "bg-slate-900 text-white" : "text-slate-500"}`}
            >
              {r}ي
            </button>
          ))}
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiStat label="إجمالي المنشآت" value={kpis.total} to="/organizations" />
        <KpiStat label="منشآت نشطة" value={kpis.activeOrgs} to="/organizations?status=active" tone="success" />
        <KpiStat label="اشتراكات فعّالة" value={kpis.activeSubs} to="/subscriptions" />
        <KpiStat label="MRR" value={formatSar(kpis.mrr)} to="/billing" />
        <KpiStat label="ARR" value={formatSar(kpis.arr)} to="/analytics" />
        <KpiStat label="مستخدمو المنصة (عبر المستأجرين)" value={kpis.users} />
        <KpiStat label="مشاريع عبر المستأجرين" value={kpis.projects} />
        <KpiStat label="تجارب" value={kpis.trial} to="/organizations?status=trial" tone="warning" />
        <KpiStat label="تجديدات قريبة" value={kpis.expiring} to="/subscriptions" tone="warning" />
        <KpiStat label="معلّقة" value={kpis.suspended} to="/organizations?status=suspended" tone="danger" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="sa-surface p-4">
          <h3 className="text-sm font-extrabold">نمو المنشآت والإيراد</h3>
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="orgs" name="منشآت" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="mrr" name="MRR" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sa-surface p-4">
            <h3 className="text-sm font-extrabold">توزيع الخطط</h3>
            <div className="mt-2 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byPlan} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
                    {byPlan.map((_, i) => (
                      <Cell key={i} fill={PIE[i % PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="sa-surface p-4">
            <h3 className="text-sm font-extrabold">نوع العميل</h3>
            <div className="mt-2 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byKind} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
                    {byKind.map((_, i) => (
                      <Cell key={i} fill={PIE[(i + 2) % PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <div className="sa-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-extrabold">أحدث المنشآت</h3>
            <Link to="/organizations" className="text-xs font-bold text-blue-600">الكل</Link>
          </div>
          <ul className="space-y-2">
            {recentOrgs.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2 text-sm">
                <Link to={`/organizations/${o.id}`} className="font-semibold text-slate-800 hover:underline">
                  {o.name}
                </Link>
                <StatusPill label={ORG_STATUS_LABELS[o.status]} tone={orgStatusTone(o.status)} />
              </li>
            ))}
          </ul>
        </div>
        <div className="sa-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-extrabold">مدفوعات فاشلة</h3>
            <Link to="/billing" className="text-xs font-bold text-blue-600">الفوترة</Link>
          </div>
          {failed.length === 0 ? (
            <p className="text-sm text-slate-400">لا مدفوعات فاشلة.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {failed.map((f) => (
                <li key={f.id} className="flex justify-between gap-2">
                  <span className="font-semibold">{f.number}</span>
                  <span className="text-red-600">{formatSar(f.totalSar)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="sa-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-extrabold">تذاكر مفتوحة</h3>
            <Link to="/support" className="text-xs font-bold text-blue-600">الدعم</Link>
          </div>
          <p className="text-2xl font-extrabold">{openTickets.length}</p>
          <p className="mt-1 text-xs text-slate-400">يشمل التصعيد وقيد المعالجة</p>
        </div>
        <div className="sa-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-extrabold">صحة النظام</h3>
            <Link to="/monitoring" className="text-xs font-bold text-blue-600">المراقبة</Link>
          </div>
          <p className="text-sm font-semibold text-slate-700">
            توفر API {monitoring.apiAvailabilityPct}%
          </p>
          <p className="mt-1 text-xs text-slate-400">
            استجابة {monitoring.avgResponseMs}ms · أخطاء {monitoring.errorRatePct}%
          </p>
          <p className="mt-2 text-xs text-slate-500">
            فرص معلّقة: {pendingLeads.length}
          </p>
        </div>
      </div>
    </PageScaffold>
  );
}
