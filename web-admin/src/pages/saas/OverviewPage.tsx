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
import { usePlatform } from "../../store/PlatformStore";
import { formatSar } from "../../lib/format";
import { useLocale } from "../../store/LocaleContext";
import { usePlatformLabels } from "../../lib/platformI18n";

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
  const { t } = useLocale();
  const { orgStatus, customerKind } = usePlatformLabels();
  const [range, setRange] = useState<"7" | "30" | "90">("30");

  const monthLabels = useMemo(
    () => [
      t("month.may"),
      t("month.jun"),
      t("month.jul"),
      t("month.aug"),
      t("month.sep"),
      t("month.oct"),
    ],
    [t],
  );

  const kpis = useMemo(() => {
    const activeOrgs = organizations.filter((o) => o.status === "active").length;
    const trial = subscriptions.filter((s) => s.status === "trial").length;
    const suspended = organizations.filter((o) => o.status === "suspended").length;
    const activeSubs = subscriptions.filter(
      (s) => s.status === "active" || s.status === "trial",
    ).length;
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
    return {
      activeOrgs,
      trial,
      suspended,
      activeSubs,
      mrr,
      arr: mrr * 12,
      users,
      projects,
      expiring,
      total: organizations.length,
    };
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
      const name = customerKind(o.customerKind);
      map.set(name, (map.get(name) || 0) + 1);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [organizations, customerKind]);

  const growth = useMemo(() => {
    return monthLabels.map((name, i) => ({
      name,
      orgs: Math.max(2, Math.round(organizations.length * ((i + 3) / 8))),
      mrr: Math.round(kpis.mrr * ((i + 4) / 10)),
    }));
  }, [organizations.length, kpis.mrr, monthLabels]);

  const recentOrgs = [...organizations]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  const failed = invoices.filter((i) => i.status === "failed");
  const openTickets = tickets.filter((tkt) =>
    ["open", "in_progress", "escalated"].includes(tkt.status),
  );
  const pendingLeads = leads.filter((l) =>
    ["new", "qualified", "demo"].includes(l.status),
  );

  return (
    <PageScaffold
      title={t("page.overview.title")}
      subtitle={t("page.overview.subtitle", { range })}
      actions={
        <div className="flex rounded-md border border-slate-200 p-0.5 text-xs font-bold">
          {(["7", "30", "90"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded px-2.5 py-1.5 ${range === r ? "bg-slate-900 text-white" : "text-slate-500"}`}
            >
              {r}
              {t("common.daySuffix")}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiStat
          label={t("page.overview.kpi.totalOrgs")}
          value={kpis.total}
          to="/organizations"
        />
        <KpiStat
          label={t("page.overview.kpi.activeOrgs")}
          value={kpis.activeOrgs}
          to="/organizations?status=active"
          tone="success"
        />
        <KpiStat
          label={t("page.overview.kpi.activeSubs")}
          value={kpis.activeSubs}
          to="/subscriptions"
        />
        <KpiStat label="MRR" value={formatSar(kpis.mrr)} to="/billing" />
        <KpiStat label="ARR" value={formatSar(kpis.arr)} to="/analytics" />
        <KpiStat
          label={t("page.overview.kpi.tenantUsers")}
          value={kpis.users}
        />
        <KpiStat
          label={t("page.overview.kpi.tenantProjects")}
          value={kpis.projects}
        />
        <KpiStat
          label={t("page.overview.kpi.trials")}
          value={kpis.trial}
          to="/organizations?status=trial"
          tone="warning"
        />
        <KpiStat
          label={t("page.overview.kpi.renewalsSoon")}
          value={kpis.expiring}
          to="/subscriptions"
          tone="warning"
        />
        <KpiStat
          label={t("page.overview.kpi.suspended")}
          value={kpis.suspended}
          to="/organizations?status=suspended"
          tone="danger"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="sa-surface p-4">
          <h3 className="text-sm font-extrabold">{t("page.overview.chart.growth")}</h3>
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar
                  dataKey="orgs"
                  name={t("page.overview.chart.orgs")}
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                />
                <Bar dataKey="mrr" name="MRR" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sa-surface p-4">
            <h3 className="text-sm font-extrabold">{t("page.overview.chart.planMix")}</h3>
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
            <h3 className="text-sm font-extrabold">{t("page.overview.chart.customerKind")}</h3>
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
            <h3 className="text-sm font-extrabold">{t("page.overview.recentOrgs")}</h3>
            <Link to="/organizations" className="text-xs font-bold text-blue-600">
              {t("common.all")}
            </Link>
          </div>
          <ul className="space-y-2">
            {recentOrgs.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2 text-sm">
                <Link
                  to={`/organizations/${o.id}`}
                  className="font-semibold text-slate-800 hover:underline"
                >
                  {o.name}
                </Link>
                <StatusPill label={orgStatus(o.status)} tone={orgStatusTone(o.status)} />
              </li>
            ))}
          </ul>
        </div>
        <div className="sa-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-extrabold">{t("page.overview.failedPayments")}</h3>
            <Link to="/billing" className="text-xs font-bold text-blue-600">
              {t("common.billingLink")}
            </Link>
          </div>
          {failed.length === 0 ? (
            <p className="text-sm text-slate-400">{t("page.overview.noFailedPayments")}</p>
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
            <h3 className="text-sm font-extrabold">{t("page.overview.openTickets")}</h3>
            <Link to="/support" className="text-xs font-bold text-blue-600">
              {t("common.supportLink")}
            </Link>
          </div>
          <p className="text-2xl font-extrabold">{openTickets.length}</p>
          <p className="mt-1 text-xs text-slate-400">{t("page.overview.openTicketsHint")}</p>
        </div>
        <div className="sa-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-extrabold">{t("page.overview.systemHealth")}</h3>
            <Link to="/monitoring" className="text-xs font-bold text-blue-600">
              {t("common.monitoringLink")}
            </Link>
          </div>
          <p className="text-sm font-semibold text-slate-700">
            {t("page.overview.apiAvail", { pct: monitoring.apiAvailabilityPct })}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {t("page.overview.apiMetrics", {
              ms: monitoring.avgResponseMs,
              err: monitoring.errorRatePct,
            })}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {t("page.overview.pendingLeads", { n: pendingLeads.length })}
          </p>
        </div>
      </div>
    </PageScaffold>
  );
}