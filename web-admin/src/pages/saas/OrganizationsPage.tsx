import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageScaffold } from "../../components/sa/PageScaffold";
import { KpiStat } from "../../components/sa/KpiStat";
import { ConfirmDialog } from "../../components/sa/ConfirmDialog";
import {
  OrgStatusPill,
  SubStatusPill,
} from "../../components/sa/orgs/OrgStatusPill";
import { UsageCell } from "../../components/sa/orgs/UsageCell";
import {
  SavedViewsBar,
  type SavedViewDef,
} from "../../components/sa/orgs/SavedViewsBar";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Input";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { usePlatform } from "../../store/PlatformStore";
import { useAuth } from "../../store/AuthContext";
import { can } from "../../lib/platformRbac";
import { PLATFORM_LS } from "../../lib/demoSeed";
import { loadJson, saveJson } from "../../demo-mode/storage";
import { isExpiringSoon } from "../../lib/orgLifecycle";
import { effectiveLimits } from "../../lib/platformDomain";
import { useLocale } from "../../store/LocaleContext";
import { usePlatformLabels } from "../../lib/platformI18n";

type AdvancedFilters = {
  customerKind: string;
  industry: string;
  orgStatus: string;
  subStatus: string;
  planId: string;
  city: string;
  deployment: string;
  accountManager: string;
};

const EMPTY_FILTERS: AdvancedFilters = {
  customerKind: "all",
  industry: "all",
  orgStatus: "all",
  subStatus: "all",
  planId: "all",
  city: "all",
  deployment: "all",
  accountManager: "all",
};

const BUILTIN_VIEW_DEFS: { id: string; labelKey: string; builtin?: boolean }[] = [
  { id: "all", labelKey: "views.all", builtin: true },
  { id: "enterprise", labelKey: "views.enterprise", builtin: true },
  { id: "government", labelKey: "views.government", builtin: true },
  { id: "renewals_month", labelKey: "views.renewals_month", builtin: true },
  { id: "trial_ending", labelKey: "views.trial_ending", builtin: true },
  { id: "high_storage", labelKey: "views.high_storage", builtin: true },
  { id: "payment_issues", labelKey: "views.payment_issues", builtin: true },
  { id: "recent", labelKey: "views.recent", builtin: true },
];

type CustomView = SavedViewDef & { filters: AdvancedFilters; q: string };

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) =>
      r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function OrganizationsPage() {
  const {
    organizations,
    plans,
    subscriptions,
    invoices,
    archiveOrganization,
    updateOrganization,
  } = usePlatform();
  const { t, L } = useLocale();
  const {
    customerKind,
    deployment,
    orgStatus,
    subStatus,
    customerKindOptions,
    deploymentOptions,
    orgStatusOptions,
    subStatusOptions,
  } = usePlatformLabels();
  const builtinViews: SavedViewDef[] = useMemo(
    () =>
      BUILTIN_VIEW_DEFS.map((v) => ({
        id: v.id,
        builtin: v.builtin,
        label: t(v.labelKey),
      })),
    [t],
  );
  const { user } = useAuth();
  const writable = can(user?.role, "organizations.write");
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [qInput, setQInput] = useState(params.get("q") || "");
  const [q, setQ] = useState(params.get("q") || "");
  const [filters, setFilters] = useState<AdvancedFilters>({
    ...EMPTY_FILTERS,
    orgStatus: params.get("status") || "all",
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<string>("all");
  const [customViews, setCustomViews] = useState<CustomView[]>(() =>
    loadJson(PLATFORM_LS.savedOrgViews, []),
  );
  const [loading, setLoading] = useState(true);
  const [bulkArchive, setBulkArchive] = useState(false);
  const [assignMgrOpen, setAssignMgrOpen] = useState(false);
  const defaultMgr = useMemo(() => L("لمى سعد القحطاني"), [L]);
  const [mgrName, setMgrName] = useState(defaultMgr);
  const [menuId, setMenuId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setMgrName(L("لمى سعد القحطاني"));
  }, [L]);

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 280);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    saveJson(PLATFORM_LS.savedOrgViews, customViews);
  }, [customViews]);

  const cities = useMemo(
    () => Array.from(new Set(organizations.map((o) => o.city))).sort(),
    [organizations],
  );
  const industries = useMemo(
    () => Array.from(new Set(organizations.map((o) => o.industry))).sort(),
    [organizations],
  );
  const managers = useMemo(
    () =>
      Array.from(
        new Set(
          organizations
            .map((o) => o.accountManagerName)
            .filter(Boolean) as string[],
        ),
      ).sort(),
    [organizations],
  );

  const subByOrg = useMemo(() => {
    const m = new Map(subscriptions.map((s) => [s.organizationId, s]));
    return m;
  }, [subscriptions]);

  const rows = useMemo(() => {
    const now = Date.now();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    return organizations.filter((o) => {
      const sub = subByOrg.get(o.id);
      const plan = plans.find((p) => p.id === o.planId);
      const limits = effectiveLimits(plan, o.limitOverrides);

      if (activeView === "enterprise" && o.customerKind !== "enterprise")
        return false;
      if (activeView === "government" && o.customerKind !== "government")
        return false;
      if (activeView === "renewals_month") {
        const renew = o.renewalAt || sub?.renewAt;
        if (!renew) return false;
        const t = new Date(renew).getTime();
        if (t < monthStart.getTime() || t >= monthEnd.getTime()) return false;
      }
      if (activeView === "trial_ending") {
        if (sub?.status !== "trial") return false;
        if (!isExpiringSoon(o.trialEndsAt || sub.renewAt, 14)) return false;
      }
      if (activeView === "high_storage") {
        const pct =
          (o.usage.storageGb / Math.max(1, limits.maxStorageGb)) * 100;
        if (pct < 75) return false;
      }
      if (activeView === "payment_issues") {
        if (sub?.status !== "past_due" && o.status !== "suspended") return false;
      }
      if (activeView === "recent") {
        const created = new Date(o.createdAt).getTime();
        if (now - created > 30 * 86400000) return false;
      }

      const custom = customViews.find((v) => v.id === activeView);
      const f = custom ? custom.filters : filters;
      const search = custom ? custom.q : q;

      if (f.orgStatus !== "all" && o.status !== f.orgStatus) return false;
      if (f.subStatus !== "all" && sub?.status !== f.subStatus) return false;
      if (f.customerKind !== "all" && o.customerKind !== f.customerKind)
        return false;
      if (f.industry !== "all" && o.industry !== f.industry) return false;
      if (f.planId !== "all" && o.planId !== f.planId) return false;
      if (f.city !== "all" && o.city !== f.city) return false;
      if (f.deployment !== "all" && o.deploymentType !== f.deployment)
        return false;
      if (
        f.accountManager !== "all" &&
        o.accountManagerName !== f.accountManager
      )
        return false;

      if (search.trim()) {
        const needle = search.trim().toLowerCase();
        const invMatch = invoices.some(
          (inv) =>
            inv.organizationId === o.id &&
            inv.number.toLowerCase().includes(needle),
        );
        const hay = [
          o.name,
          o.legalName,
          o.id,
          o.organizationId,
          o.orgAdminEmail,
          o.crNumber,
          o.contactEmail,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle) && !invMatch) return false;
      }
      return true;
    });
  }, [
    organizations,
    subByOrg,
    plans,
    invoices,
    activeView,
    filters,
    q,
    customViews,
  ]);

  const kpis = useMemo(() => {
    const total = organizations.length;
    const active = organizations.filter((o) => o.status === "active").length;
    const trial = subscriptions.filter((s) => s.status === "trial").length;
    const pending = organizations.filter(
      (o) => o.status === "pending" || o.status === "provisioning",
    ).length;
    const suspended = organizations.filter(
      (o) => o.status === "suspended",
    ).length;
    const expiring = organizations.filter((o) => {
      const sub = subByOrg.get(o.id);
      return isExpiringSoon(o.renewalAt || sub?.renewAt, 30);
    }).length;
    return { total, active, trial, pending, suspended, expiring };
  }, [organizations, subscriptions, subByOrg]);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const toggleAll = () => {
    if (selected.length === rows.length) setSelected([]);
    else setSelected(rows.map((r) => r.id));
  };

  const exportRows = (ids?: string[]) => {
    const list = ids
      ? organizations.filter((o) => ids.includes(o.id))
      : rows;
    downloadCsv("organizations.csv", [
      [
        "id",
        "name",
        "org_id",
        "type",
        "city",
        "plan",
        "org_status",
        "sub_status",
        "users",
        "projects",
        "storage_gb",
        "cr",
        "renewal",
      ],
      ...list.map((o) => {
        const sub = subByOrg.get(o.id);
        const plan = plans.find((p) => p.id === o.planId);
        return [
          o.id,
          o.name,
          o.organizationId || "",
          customerKind(o.customerKind),
          o.city,
          plan?.name || o.planId,
          orgStatus(o.status),
          sub ? subStatus(sub.status) : "",
          String(o.usage.users),
          String(o.usage.projects),
          String(o.usage.storageGb),
          o.crNumber || "",
          (o.renewalAt || o.trialEndsAt || "").slice(0, 10),
        ];
      }),
    ]);
  };

  const applyKpi = (key: string) => {
    setActiveView("all");
    if (key === "all") {
      setFilters(EMPTY_FILTERS);
      return;
    }
    if (key === "active") {
      setFilters({ ...EMPTY_FILTERS, orgStatus: "active" });
      return;
    }
    if (key === "trial") {
      setFilters({ ...EMPTY_FILTERS, subStatus: "trial" });
      return;
    }
    if (key === "pending") {
      setFilters({ ...EMPTY_FILTERS, orgStatus: "pending" });
      return;
    }
    if (key === "suspended") {
      setFilters({ ...EMPTY_FILTERS, orgStatus: "suspended" });
      return;
    }
    if (key === "expiring") {
      setActiveView("renewals_month");
    }
  };

  const saveCurrentView = () => {
    const label = window.prompt(t("page.orgs.saveViewPrompt"));
    if (!label?.trim()) return;
    const id = `cv-${crypto.randomUUID().slice(0, 6)}`;
    setCustomViews((prev) => [
      ...prev,
      { id, label: label.trim(), filters: { ...filters }, q },
    ]);
    setActiveView(id);
  };

  const allViews: SavedViewDef[] = [...builtinViews, ...customViews];

  return (
    <PageScaffold
      title={t("page.orgs.title")}
      subtitle={t("page.orgs.subtitleCount", { n: organizations.length })}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportRows()}>
            {t("common.exportCsv")}
          </Button>
          {writable ? (
            <Button onClick={() => navigate("/organizations/new")}>
              {t("page.orgs.onboard")}
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <button type="button" className="text-start" onClick={() => applyKpi("all")}>
          <KpiStat label={t("page.orgs.kpi.total")} value={kpis.total} />
        </button>
        <button type="button" className="text-start" onClick={() => applyKpi("active")}>
          <KpiStat label={t("page.orgs.kpi.active")} value={kpis.active} tone="success" />
        </button>
        <button type="button" className="text-start" onClick={() => applyKpi("trial")}>
          <KpiStat label={t("page.orgs.kpi.trial")} value={kpis.trial} />
        </button>
        <button type="button" className="text-start" onClick={() => applyKpi("pending")}>
          <KpiStat label={t("page.orgs.kpi.pending")} value={kpis.pending} />
        </button>
        <button type="button" className="text-start" onClick={() => applyKpi("suspended")}>
          <KpiStat label={t("page.overview.kpi.suspended")} value={kpis.suspended} tone="danger" />
        </button>
        <button type="button" className="text-start" onClick={() => applyKpi("expiring")}>
          <KpiStat label={t("page.orgs.kpi.expiringSoon")} value={kpis.expiring} tone="warning" />
        </button>
      </div>

      <SavedViewsBar
        views={allViews}
        activeId={activeView}
        onSelect={(id) => {
          setActiveView(id);
          const cv = customViews.find((v) => v.id === id);
          if (cv) {
            setFilters(cv.filters);
            setQInput(cv.q);
            setQ(cv.q);
          } else if (id === "all") {
            setFilters(EMPTY_FILTERS);
          }
        }}
        onSaveCurrent={writable ? saveCurrentView : undefined}
        onDelete={(id) => {
          setCustomViews((prev) => prev.filter((v) => v.id !== id));
          if (activeView === id) setActiveView("all");
        }}
      />

      <div className="sa-surface flex flex-wrap items-end gap-2 p-3">
        <div className="min-w-[220px] flex-1">
          <Input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={t("page.orgs.searchPlaceholder")}
          />
        </div>
        <Button variant="outline" onClick={() => setDrawerOpen(true)}>
          {t("page.orgs.advancedFilters")}
        </Button>
        {writable && selected.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => exportRows(selected)}>
              {t("page.orgs.exportSelected", { n: selected.length })}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAssignMgrOpen(true)}>
              {t("page.orgs.assignManager")}
            </Button>
            <Button size="sm" variant="danger" onClick={() => setBulkArchive(true)}>
              {t("page.orgs.bulkArchive")}
            </Button>
          </div>
        ) : (
          <p className="self-center text-xs text-slate-400">
            {t("page.orgs.results", { n: rows.length })}
          </p>
        )}
      </div>

      <div className="sa-surface overflow-x-auto">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded bg-slate-100"
              />
            ))}
          </div>
        ) : (
          <table className="sa-table w-full min-w-[1180px] text-start">
            <thead>
              <tr className="border-b border-slate-200">
                {writable ? (
                  <th className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={
                        rows.length > 0 && selected.length === rows.length
                      }
                      onChange={toggleAll}
                    />
                  </th>
                ) : null}
                <th className="px-3 py-2">{t("page.orgs.col.org")}</th>
                <th className="px-3 py-2">{t("page.orgs.col.kind")}</th>
                <th className="px-3 py-2">{t("page.orgs.col.industry")}</th>
                <th className="px-3 py-2">{t("page.orgs.col.plan")}</th>
                <th className="px-3 py-2">{t("page.orgs.col.status")}</th>
                <th className="px-3 py-2">{t("page.orgs.col.sub")}</th>
                <th className="px-3 py-2">{t("common.users")}</th>
                <th className="px-3 py-2">{t("common.projects")}</th>
                <th className="px-3 py-2">{t("common.storage")}</th>
                <th className="px-3 py-2">{t("page.orgs.col.registered")}</th>
                <th className="px-3 py-2">{t("page.orgs.col.renewal")}</th>
                <th className="px-3 py-2">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={writable ? 13 : 12}
                    className="px-3 py-10 text-center text-sm text-slate-400"
                  >
                    {organizations.length === 0
                      ? t("page.orgs.empty.none")
                      : t("page.orgs.empty.filter")}
                  </td>
                </tr>
              ) : (
                rows.map((o) => {
                  const sub = subByOrg.get(o.id);
                  const plan = plans.find((p) => p.id === o.planId);
                  const limits = effectiveLimits(plan, o.limitOverrides);
                  return (
                    <tr key={o.id} className="border-b border-slate-100">
                      {writable ? (
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selected.includes(o.id)}
                            onChange={() => toggle(o.id)}
                          />
                        </td>
                      ) : null}
                      <td className="px-3 py-2">
                        <Link
                          to={`/organizations/${o.id}`}
                          className="flex items-center gap-2 font-semibold text-blue-700 hover:underline"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-extrabold text-slate-600">
                            {o.logoInitials}
                          </span>
                          <span>
                            <span className="block">{o.name}</span>
                            <span className="block text-[11px] font-normal text-slate-400">
                              {o.id}
                              {o.organizationId ? ` · ${o.organizationId}` : ""}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {customerKind(o.customerKind)}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">
                        {o.industry}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span className="font-semibold">
                          {plan?.name || o.planId}
                        </span>
                        {sub ? (
                          <span className="block text-[10px] text-slate-400">
                            {sub.billingCycle === "annual"
                              ? t("common.annualShort")
                              : t("common.monthlyShort")}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <OrgStatusPill status={o.status} />
                      </td>
                      <td className="px-3 py-2">
                        {sub ? (
                          <SubStatusPill status={sub.status} />
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <UsageCell
                          used={o.usage.users}
                          max={o.limitOverrides?.maxUsers ?? o.seats}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <UsageCell
                          used={o.usage.projects}
                          max={limits.maxProjects}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <UsageCell
                          used={o.usage.storageGb}
                          max={limits.maxStorageGb}
                          unit="GB"
                        />
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500">
                        {o.createdAt.slice(0, 10)}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500">
                        {(o.renewalAt || o.trialEndsAt || "—").slice(0, 10)}
                      </td>
                      <td className="relative px-3 py-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setMenuId(menuId === o.id ? null : o.id)
                          }
                        >
                          ⋮
                        </Button>
                        {menuId === o.id ? (
                          <div className="absolute end-3 z-20 mt-1 w-40 rounded-md border border-slate-200 bg-white py-1 shadow-sm">
                            <Link
                              to={`/organizations/${o.id}`}
                              className="block px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              onClick={() => setMenuId(null)}
                            >
                              {t("page.orgs.openDetail")}
                            </Link>
                            <button
                              type="button"
                              className="block w-full px-3 py-1.5 text-start text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              onClick={() => {
                                exportRows([o.id]);
                                setMenuId(null);
                              }}
                            >
                              {t("page.orgs.exportRow")}
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/20">
          <button
            type="button"
            className="h-full flex-1"
            aria-label={t("common.cancel")}
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="flex h-full w-full max-w-md flex-col border-s border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-extrabold">{t("page.orgs.filtersTitle")}</h3>
              <Button variant="ghost" size="sm" onClick={() => setDrawerOpen(false)}>
                {t("common.cancel")}
              </Button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <Field label={t("page.orgs.filter.customerKind")}>
                <SearchableSelect
                  value={filters.customerKind}
                  onChange={(v) =>
                    setFilters({ ...filters, customerKind: v })
                  }
                  options={[
                    { value: "all", label: t("common.all") },
                    ...customerKindOptions(),
                  ]}
                />
              </Field>
              <Field label={t("page.orgs.filter.industry")}>
                <SearchableSelect
                  value={filters.industry}
                  onChange={(v) => setFilters({ ...filters, industry: v })}
                  options={[
                    { value: "all", label: t("common.all") },
                    ...industries.map((c) => ({ value: c, label: L(c) })),
                  ]}
                />
              </Field>
              <Field label={t("page.orgs.filter.orgStatus")}>
                <SearchableSelect
                  value={filters.orgStatus}
                  onChange={(v) => {
                    setFilters({ ...filters, orgStatus: v });
                    const next = new URLSearchParams(params);
                    if (v === "all") next.delete("status");
                    else next.set("status", v);
                    setParams(next);
                  }}
                  options={[
                    { value: "all", label: t("common.all") },
                    ...orgStatusOptions(),
                  ]}
                />
              </Field>
              <Field label={t("page.orgs.filter.subStatus")}>
                <SearchableSelect
                  value={filters.subStatus}
                  onChange={(v) => setFilters({ ...filters, subStatus: v })}
                  options={[
                    { value: "all", label: t("common.all") },
                    ...subStatusOptions(),
                  ]}
                />
              </Field>
              <Field label={t("page.orgs.filter.plan")}>
                <SearchableSelect
                  value={filters.planId}
                  onChange={(v) => setFilters({ ...filters, planId: v })}
                  options={[
                    { value: "all", label: t("common.all") },
                    ...plans.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                />
              </Field>
              <Field label={t("page.orgs.filter.city")}>
                <SearchableSelect
                  value={filters.city}
                  onChange={(v) => setFilters({ ...filters, city: v })}
                  options={[
                    { value: "all", label: t("common.all") },
                    ...cities.map((c) => ({ value: c, label: L(c) })),
                  ]}
                />
              </Field>
              <Field label={t("page.orgs.filter.deployment")}>
                <SearchableSelect
                  value={filters.deployment}
                  onChange={(v) => setFilters({ ...filters, deployment: v })}
                  options={[
                    { value: "all", label: t("common.all") },
                    ...deploymentOptions(),
                  ]}
                />
              </Field>
              <Field label={t("page.orgs.col.manager")}>
                <SearchableSelect
                  value={filters.accountManager}
                  onChange={(v) =>
                    setFilters({ ...filters, accountManager: v })
                  }
                  options={[
                    { value: "all", label: t("common.all") },
                    ...managers.map((m) => ({ value: m, label: L(m) })),
                  ]}
                />
              </Field>
            </div>
            <div className="flex gap-2 border-t border-slate-200 p-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setActiveView("all");
                }}
              >
                {t("page.orgs.clearFilters")}
              </Button>
              <Button className="flex-1" onClick={() => setDrawerOpen(false)}>
                {t("page.orgs.applyFilters")}
              </Button>
            </div>
          </aside>
        </div>
      ) : null}

      <ConfirmDialog
        open={bulkArchive}
        title={t("page.orgs.bulkArchiveTitle")}
        message={t("page.orgs.bulkArchiveMsg")}
        danger
        confirmLabel={t("org.action.archive")}
        onConfirm={() => {
          for (const id of selected) {
            archiveOrganization(id, t("page.orgs.bulkArchiveReason"));
          }
          setSelected([]);
          setBulkArchive(false);
        }}
        onClose={() => setBulkArchive(false)}
      />

      {assignMgrOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-md border border-slate-200 bg-white p-4 shadow-lg">
            <h3 className="text-sm font-extrabold">{t("page.orgs.assignManager")}</h3>
            <Field label={t("common.name")} className="mt-3">
              <Input
                value={mgrName}
                onChange={(e) => setMgrName(e.target.value)}
              />
            </Field>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAssignMgrOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={() => {
                  for (const id of selected) {
                    updateOrganization(id, {
                      accountManagerName: mgrName.trim(),
                    });
                  }
                  setAssignMgrOpen(false);
                  setSelected([]);
                }}
              >
                {t("common.save")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </PageScaffold>
  );
}
