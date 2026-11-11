import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Briefcase,
  CircleDollarSign,
} from "lucide-react";
import { KpiCard } from "../common/KpiCard";
import { Card } from "../ui/Card";
import { SearchableSelect } from "../ui/SearchableSelect";
import { useHierarchy } from "../../store/HierarchyStore";
import { useAuth } from "../../store/AuthContext";
import { useData } from "../../store/DataStore";
import { useLocale } from "../../store/LocaleContext";
import {
  remainingBudget,
  type PortfolioStatus,
} from "../../lib/portfolioDomain";
import {
  priorityLabel,
  projectStatusLabel,
} from "../../i18n/label";
type PortfolioPriority = "critical" | "high" | "medium" | "low";
import { cn } from "../../lib/cn";

const PORTFOLIO_STATUS_KEYS = [
  "draft",
  "submitted",
  "under_review",
  "returned",
  "pending_approval",
  "approved",
  "active",
  "on_hold",
  "rejected",
  "closed",
  "archived",
] as const;

const PORTFOLIO_PRIORITY_KEYS: PortfolioPriority[] = [
  "critical",
  "high",
  "medium",
  "low",
];

/** Full portfolio dashboard body (filters, KPIs, charts) — used as a tab panel. */
export function PortfolioDashboardPanel({
  onOpenManage,
}: {
  onOpenManage?: (status?: string) => void;
}) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { portfolios, projects, objectives, relationships } = useHierarchy();
  const { users } = useAuth();
  const { departments } = useData();
  const [year, setYear] = useState("all");
  const [dept, setDept] = useState("all");
  const [owner, setOwner] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");

  const formatSar = (amount: number) =>
    `${amount.toLocaleString("en-US")} ${t("common.currencySar")}`;

  const portfolioStatusLabel = (id: string) => {
    const key = `portfolio.status.${id}`;
    const v = t(key);
    return v === key ? id : v;
  };

  const portfolioPriorityLabel = (id: string) => {
    const key = `portfolio.priority.${id}`;
    const v = t(key);
    return v === key ? id : v;
  };

  const portfolioHealthLabel = (id: string) => {
    const key = `portfolio.health.${id}`;
    const v = t(key);
    return v === key ? id : v;
  };

  const filtered = useMemo(() => {
    return portfolios.filter((p) => {
      if (year !== "all" && String(p.fiscalYear) !== year) return false;
      if (dept !== "all" && p.departmentId !== dept) return false;
      if (owner !== "all" && p.ownerUserId !== owner) return false;
      if (status !== "all" && p.status !== status) return false;
      if (priority !== "all" && p.priority !== priority) return false;
      return true;
    });
  }, [portfolios, year, dept, owner, status, priority]);

  const totals = useMemo(() => {
    const approved = filtered.reduce((s, p) => s + (p.approvedBudgetSar ?? 0), 0);
    const actual = filtered.reduce((s, p) => s + (p.actualSpendSar ?? 0), 0);
    return {
      total: filtered.length,
      active: filtered.filter((p) => p.status === "active").length,
      draft: filtered.filter((p) => p.status === "draft").length,
      pending: filtered.filter((p) =>
        ["submitted", "under_review", "pending_approval"].includes(p.status || ""),
      ).length,
      approved,
      actual,
      remaining: remainingBudget(approved, actual),
      criticalRisks: filtered.filter(
        (p) => p.health === "red" || p.priority === "critical",
      ).length,
    };
  }, [filtered]);

  const byStatus = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of filtered) {
      const k = p.status || "draft";
      map.set(k, (map.get(k) || 0) + 1);
    }
    return [...map.entries()];
  }, [filtered]);

  const byPriority = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of filtered) {
      const k = p.priority || "medium";
      map.set(k, (map.get(k) || 0) + 1);
    }
    return [...map.entries()];
  }, [filtered]);

  const years = useMemo(() => {
    const set = new Set(portfolios.map((p) => String(p.fiscalYear || "")));
    return [...set].filter(Boolean).sort();
  }, [portfolios]);

  const attentionProjects = useMemo(() => {
    const pfIds = new Set(filtered.map((p) => p.id));
    return projects
      .filter(
        (p) =>
          p.portfolioId &&
          pfIds.has(p.portfolioId) &&
          (p.status === "on_hold" || p.priority === "critical"),
      )
      .slice(0, 6);
  }, [projects, filtered]);

  const alignedObjectives = useMemo(() => {
    const ids = new Set(filtered.flatMap((p) => p.objectiveIds || []));
    return objectives.filter((o) => ids.has(o.id));
  }, [filtered, objectives]);

  const goManage = (s?: string) => {
    if (onOpenManage) onOpenManage(s);
    else if (s) navigate(`/portfolios?tab=manage&status=${s}`);
    else navigate("/portfolios?tab=manage");
  };

  return (
    <div className="space-y-4">
      <Card className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-5">
        <SearchableSelect
          value={year}
          onChange={setYear}
          options={[
            { value: "all", label: t("portfolioDashboard.filter.allYears") },
            ...years.map((y) => ({ value: y, label: y })),
          ]}
        />
        <SearchableSelect
          value={dept}
          onChange={setDept}
          options={[
            { value: "all", label: t("portfolioDashboard.filter.allDepts") },
            ...departments.map((d) => ({ value: d.id, label: d.name })),
          ]}
        />
        <SearchableSelect
          value={owner}
          onChange={setOwner}
          options={[
            { value: "all", label: t("portfolioDashboard.filter.allOwners") },
            ...users.map((u) => ({ value: u.id, label: u.name })),
          ]}
        />
        <SearchableSelect
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: t("common.filterAllStatuses") },
            ...PORTFOLIO_STATUS_KEYS.map((value) => ({
              value,
              label: portfolioStatusLabel(value),
            })),
          ]}
        />
        <SearchableSelect
          value={priority}
          onChange={setPriority}
          options={[
            { value: "all", label: t("common.filterAllPriorities") },
            ...PORTFOLIO_PRIORITY_KEYS.map((value) => ({
              value,
              label: portfolioPriorityLabel(value),
            })),
          ]}
        />
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button type="button" onClick={() => goManage()}>
          <KpiCard
            label={t("portfolioDashboard.kpi.total")}
            value={String(totals.total)}
            icon={<Briefcase className="h-4 w-4" />}
            tone="brand"
          />
        </button>
        <button type="button" onClick={() => goManage("active")}>
          <KpiCard
            label={t("portfolioDashboard.kpi.active")}
            value={String(totals.active)}
            icon={<Briefcase className="h-4 w-4" />}
            tone="sky"
          />
        </button>
        <button type="button" onClick={() => goManage("draft")}>
          <KpiCard
            label={t("portfolioDashboard.kpi.drafts")}
            value={String(totals.draft)}
            icon={<Briefcase className="h-4 w-4" />}
            tone="steel"
          />
        </button>
        <button type="button" onClick={() => goManage("pending_approval")}>
          <KpiCard
            label={t("portfolio.status.pending_approval")}
            value={String(totals.pending)}
            icon={<AlertTriangle className="h-4 w-4" />}
            tone="amber"
          />
        </button>
        <KpiCard
          label={t("portfolioDashboard.kpi.approvedBudget")}
          value={formatSar(totals.approved)}
          icon={<CircleDollarSign className="h-4 w-4" />}
          tone="brand"
        />
        <KpiCard
          label={t("portfolioDashboard.kpi.actualSpend")}
          value={formatSar(totals.actual)}
          icon={<CircleDollarSign className="h-4 w-4" />}
          tone="amber"
        />
        <KpiCard
          label={t("projectDetail.remaining")}
          value={formatSar(totals.remaining)}
          icon={<CircleDollarSign className="h-4 w-4" />}
          tone="sky"
        />
        <KpiCard
          label={t("portfolioDashboard.kpi.criticalHealth")}
          value={String(totals.criticalRisks)}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone="red"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="text-sm font-extrabold">
            {t("portfolioDashboard.byStatus")}
          </h3>
          <ul className="mt-3 space-y-2">
            {byStatus.map(([k, n]) => (
              <li key={k} className="flex items-center justify-between text-sm">
                <span>{portfolioStatusLabel(k as PortfolioStatus)}</span>
                <span className="font-bold tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-extrabold">
            {t("portfolioDashboard.byPriority")}
          </h3>
          <ul className="mt-3 space-y-2">
            {byPriority.map(([k, n]) => (
              <li key={k} className="flex items-center justify-between text-sm">
                <span>{portfolioPriorityLabel(k)}</span>
                <span className="font-bold tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-extrabold">
            {t("portfolioDashboard.budgetVsSpend")}
          </h3>
          <div className="mt-3 space-y-3">
            {filtered.slice(0, 6).map((p) => {
              const approved = p.approvedBudgetSar || p.plannedBudgetSar || 0;
              const actual = p.actualSpendSar || 0;
              const pct =
                approved > 0
                  ? Math.min(100, Math.round((actual / approved) * 100))
                  : 0;
              return (
                <div key={p.id}>
                  <div className="mb-1 flex justify-between text-xs">
                    <Link
                      to={`/portfolios/${p.id}`}
                      className="font-bold text-brand-700 hover:underline"
                    >
                      {p.name}
                    </Link>
                    <span className="tabular-nums text-steel-500">{pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-steel-100 dark:bg-steel-800">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        pct > 90 ? "bg-red-500" : "bg-brand-500",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-extrabold">
            {t("portfolioDashboard.strategicAlignment")}
          </h3>
          <p className="mt-1 text-xs text-steel-500">
            {t("portfolioDashboard.alignmentSummary", {
              objectives: alignedObjectives.length,
              relations: relationships.filter(
                (r) =>
                  r.isActive &&
                  (r.sourceType === "portfolio" || r.targetType === "portfolio"),
              ).length,
            })}
          </p>
          <ul className="mt-3 space-y-2">
            {alignedObjectives.map((o) => (
              <li
                key={o.id}
                className="rounded-lg border border-steel-100 px-3 py-2 text-sm dark:border-steel-800"
              >
                {o.title}
              </li>
            ))}
            {alignedObjectives.length === 0 ? (
              <li className="text-xs text-steel-400">
                {t("portfolioDashboard.noObjectivesInFilters")}
              </li>
            ) : null}
          </ul>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="text-sm font-extrabold">
          {t("portfolioDashboard.attentionTitle")}
        </h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-steel-200 text-start dark:border-steel-700">
                <th className="px-2 py-2 font-bold">{t("kind.project")}</th>
                <th className="px-2 py-2 font-bold">{t("common.status")}</th>
                <th className="px-2 py-2 font-bold">{t("common.priority")}</th>
                <th className="px-2 py-2 font-bold">
                  {t("entity.portfolio")}
                </th>
              </tr>
            </thead>
            <tbody>
              {attentionProjects.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-2 py-6 text-center text-steel-400"
                  >
                    {t("portfolioDashboard.noUrgentInFilters")}
                  </td>
                </tr>
              ) : (
                attentionProjects.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-steel-100 dark:border-steel-800"
                  >
                    <td className="px-2 py-2">
                      <Link
                        to={`/projects/${p.id}`}
                        className="font-semibold text-brand-700 hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-2 py-2">
                      {projectStatusLabel(t, p.status)}
                    </td>
                    <td className="px-2 py-2">
                      {priorityLabel(t, p.priority)}
                    </td>
                    <td className="px-2 py-2">
                      {portfolios.find((x) => x.id === p.portfolioId)?.name ??
                        "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-steel-400">
          {t("portfolioDashboard.healthFootnote")}:{" "}
          {filtered
            .map(
              (p) =>
                `${p.code}=${portfolioHealthLabel(p.health || "unknown")}`,
            )
            .join(" · ") || "—"}
        </p>
      </Card>
    </div>
  );
}
