import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Briefcase, LayoutDashboard, Plus, Search } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { PortfolioDashboardPanel } from "../components/portfolio/PortfolioDashboardPanel";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { Pagination } from "../components/ui/Pagination";
import { useHierarchy } from "../store/HierarchyStore";
import { useAuth } from "../store/AuthContext";
import { useData } from "../store/DataStore";
import { useCan } from "../store/RbacContext";
import { usePagination, PAGE_SIZE_DEFAULT } from "../hooks/usePagination";
import {
  type PortfolioHealth,
  type PortfolioPriority,
  type PortfolioStatus,
  type PortfolioType,
  remainingBudget,
} from "../lib/portfolioDomain";
import { useLocale } from "../store/LocaleContext";
import { PortfolioStatusBadge } from "../components/portfolio/PortfolioStatusBadge";
import { canCreatePortfolio } from "../lib/portfolioPermissions";
import { cn } from "../lib/cn";

type TabId = "dashboard" | "manage";

const PORTFOLIO_STATUS_IDS: PortfolioStatus[] = [
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
];

const PORTFOLIO_PRIORITY_IDS: PortfolioPriority[] = [
  "critical",
  "high",
  "medium",
  "low",
];

export function PortfoliosPage() {
  const { t } = useLocale();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { portfolios, objectives } = useHierarchy();
  const { user, users } = useAuth();
  const { departments } = useData();
  const can = useCan();

  const tab: TabId =
    params.get("tab") === "manage" ? "manage" : "dashboard";

  const [q, setQ] = useState("");
  const [status, setStatus] = useState(params.get("status") || "all");
  const [priority, setPriority] = useState("all");
  const [view, setView] = useState<"table" | "cards">("table");

  useEffect(() => {
    const s = params.get("status");
    if (s) setStatus(s);
  }, [params]);

  const allowCreate = canCreatePortfolio({
    managePortfolio: can.managePortfolio(user?.role),
    role: user?.role,
  });

  const setTab = (next: TabId, statusFilter?: string) => {
    const p = new URLSearchParams(params);
    p.set("tab", next);
    if (statusFilter) {
      p.set("status", statusFilter);
      setStatus(statusFilter);
    } else if (next === "dashboard") {
      p.delete("status");
    }
    setParams(p, { replace: true });
  };

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return portfolios.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (priority !== "all" && p.priority !== priority) return false;
      if (
        term &&
        !p.name.toLowerCase().includes(term) &&
        !(p.code || "").toLowerCase().includes(term)
      ) {
        return false;
      }
      return true;
    });
  }, [portfolios, q, status, priority]);

  const pagination = usePagination(rows, PAGE_SIZE_DEFAULT, [
    rows.length,
    q,
    status,
    priority,
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("portfolios.title")}
        subtitle={t("portfolios.subtitle")}
        icon={<Briefcase className="h-6 w-6" />}
        actions={
          allowCreate ? (
            <Button onClick={() => navigate("/portfolios/new")}>
              <Plus className="h-4 w-4" />
              {t("portfolios.create")}
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-1 rounded-xl border border-steel-200 bg-white p-1 dark:border-steel-700 dark:bg-steel-900">
        <button
          type="button"
          onClick={() => setTab("dashboard")}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold",
            tab === "dashboard"
              ? "bg-brand-500/10 text-brand-700 dark:text-brand-300"
              : "text-steel-500 hover:bg-steel-50 dark:hover:bg-steel-800",
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          {t("portfolios.tab.dashboard")}
        </button>
        <button
          type="button"
          onClick={() => setTab("manage")}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold",
            tab === "manage"
              ? "bg-brand-500/10 text-brand-700 dark:text-brand-300"
              : "text-steel-500 hover:bg-steel-50 dark:hover:bg-steel-800",
          )}
        >
          <Briefcase className="h-4 w-4" />
          {t("portfolios.tab.manage")}
        </button>
      </div>

      {tab === "dashboard" ? (
        <PortfolioDashboardPanel
          onOpenManage={(s) => setTab("manage", s || undefined)}
        />
      ) : (
        <div className="space-y-4">
          <Card className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
              <Input
                className="ps-9"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("portfolios.searchPlaceholder")}
              />
            </div>
            <SearchableSelect
              className="min-w-[16rem] sm:min-w-[18rem]"
              truncateLabel={false}
              value={status}
              onChange={(v) => {
                setStatus(v);
                const p = new URLSearchParams(params);
                p.set("tab", "manage");
                if (v === "all") p.delete("status");
                else p.set("status", v);
                setParams(p, { replace: true });
              }}
              options={[
                { value: "all", label: t("common.allStatuses") },
                ...PORTFOLIO_STATUS_IDS.map((value) => ({
                  value,
                  label: t(`portfolio.status.${value}`),
                })),
              ]}
            />
            <SearchableSelect
              className="min-w-[10rem]"
              value={priority}
              onChange={setPriority}
              options={[
                { value: "all", label: t("common.allPriorities") },
                ...PORTFOLIO_PRIORITY_IDS.map((value) => ({
                  value,
                  label: t(`portfolio.priority.${value}`),
                })),
              ]}
            />
            <div className="flex gap-1 rounded-xl border border-steel-200 p-1 dark:border-steel-700">
              <button
                type="button"
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-bold",
                  view === "table"
                    ? "bg-brand-500/10 text-brand-700"
                    : "text-steel-500",
                )}
                onClick={() => setView("table")}
              >
                {t("common.table")}
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-bold",
                  view === "cards"
                    ? "bg-brand-500/10 text-brand-700"
                    : "text-steel-500",
                )}
                onClick={() => setView("cards")}
              >
                {t("common.cards")}
              </button>
            </div>
          </Card>

          {view === "table" ? (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead>
                    <tr className="border-b border-steel-200 bg-steel-50 text-start dark:border-steel-700 dark:bg-steel-800/60">
                      <th className="px-3 py-3 font-bold">{t("portfolios.col.portfolio")}</th>
                      <th className="px-3 py-3 font-bold">{t("portfolios.col.type")}</th>
                      <th className="px-3 py-3 font-bold">{t("portfolios.col.owner")}</th>
                      <th className="px-3 py-3 font-bold">{t("portfolios.col.sponsor")}</th>
                      <th className="px-3 py-3 font-bold">{t("portfolios.col.department")}</th>
                      <th className="px-3 py-3 font-bold">{t("portfolios.col.status")}</th>
                      <th className="px-3 py-3 font-bold">{t("portfolios.col.priority")}</th>
                      <th className="px-3 py-3 font-bold">{t("portfolios.col.approved")}</th>
                      <th className="px-3 py-3 font-bold">{t("portfolios.col.spent")}</th>
                      <th className="px-3 py-3 font-bold">{t("portfolios.col.health")}</th>
                      <th className="px-3 py-3 font-bold">{t("portfolios.col.objective")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagination.paginated.length === 0 ? (
                      <tr>
                        <td
                          colSpan={11}
                          className="px-4 py-10 text-center text-steel-500"
                        >
                          {t("portfolios.empty.manage")}
                        </td>
                      </tr>
                    ) : (
                      pagination.paginated.map((p) => (
                        <tr
                          key={p.id}
                          className="cursor-pointer border-b border-steel-100 hover:bg-steel-50 dark:border-steel-800 dark:hover:bg-steel-800/40"
                          onClick={() => navigate(`/portfolios/${p.id}`)}
                        >
                          <td className="px-3 py-3">
                            <p className="font-semibold">{p.name}</p>
                            <p className="text-[11px] text-steel-400">{p.code}</p>
                          </td>
                          <td className="px-3 py-3">
                            {t(
                              `portfolio.type.${(p.portfolioType || "other") as PortfolioType}`,
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {users.find((u) => u.id === p.ownerUserId)?.name ??
                              "—"}
                          </td>
                          <td className="px-3 py-3">
                            {users.find((u) => u.id === p.sponsorUserId)?.name ??
                              "—"}
                          </td>
                          <td className="px-3 py-3">
                            {departments.find((d) => d.id === p.departmentId)
                              ?.name ?? "—"}
                          </td>
                          <td className="px-3 py-3">
                            <PortfolioStatusBadge status={p.status} />
                          </td>
                          <td className="px-3 py-3">
                            {t(
                              `portfolio.priority.${(p.priority || "medium") as PortfolioPriority}`,
                            )}
                          </td>
                          <td className="px-3 py-3 tabular-nums">
                            {(p.approvedBudgetSar || 0).toLocaleString("en-US")}
                          </td>
                          <td className="px-3 py-3 tabular-nums">
                            {(p.actualSpendSar || 0).toLocaleString("en-US")}
                          </td>
                          <td className="px-3 py-3">
                            {t(
                              `portfolio.health.${(p.health || "unknown") as PortfolioHealth}`,
                            )}
                          </td>
                          <td className="px-3 py-3 text-xs">
                            {(p.objectiveIds || [])
                              .map(
                                (id) =>
                                  objectives.find((o) => o.id === id)?.title,
                              )
                              .filter(Boolean)
                              .slice(0, 1)
                              .join("") || "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={pagination.setPage}
                total={pagination.total}
                rangeStart={pagination.rangeStart}
                rangeEnd={pagination.rangeEnd}
              />
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {pagination.paginated.map((p) => (
                <Link key={p.id} to={`/portfolios/${p.id}`}>
                  <Card className="h-full space-y-2 p-4 hover:border-brand-500/40">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-extrabold text-steel-800 dark:text-steel-100">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-steel-400">{p.code}</p>
                      </div>
                      <PortfolioStatusBadge status={p.status} />
                    </div>
                    <p className="line-clamp-2 text-xs text-steel-500">
                      {p.description}
                    </p>
                    <p className="text-[11px] text-steel-400">
                      {t("common.remainingAmount", {
                        amount: remainingBudget(
                          p.approvedBudgetSar || 0,
                          p.actualSpendSar || 0,
                        ).toLocaleString("en-US"),
                      })}
                    </p>
                  </Card>
                </Link>
              ))}
              {pagination.paginated.length === 0 ? (
                <Card className="p-8 text-center text-sm text-steel-500 md:col-span-2 xl:col-span-3">
                  {t("portfolios.empty.cards")}
                </Card>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

