import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Briefcase } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input, Textarea } from "../components/ui/Input";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { Modal } from "../components/ui/Modal";
import { AddRelationshipModal } from "../components/strategy/AddRelationshipModal";
import { useHierarchy } from "../store/HierarchyStore";
import { useAuth } from "../store/AuthContext";
import { useData } from "../store/DataStore";
import { useCan } from "../store/RbacContext";
import {
  budgetVariance,
  normalizePortfolio,
  remainingBudget,
  type PortfolioAuditEvent,
  type PortfolioItemEvent,
} from "../lib/portfolioDomain";
import {
  canApplyBudgetChangeDirectly,
  canEditPortfolio,
  canManagePortfolioBudget,
  canRunPortfolioAction,
} from "../lib/portfolioPermissions";
import {
  availableActions,
  type PortfolioWorkflowAction,
} from "../services/portfolioWorkflow";
import { useOrgPortfolioPolicy } from "../hooks/useOrgPortfolioPolicy";
import {
  collectStrategicEntities,
  findEntityName,
} from "../lib/strategicEntities";
import { getRelationshipDef } from "../lib/relationshipRules";
import {
  initiativesForPortfolio,
  programsForInitiative,
  programsForPortfolio,
  projectsForPortfolio,
} from "../lib/hierarchyLinks";
import { PortfolioStatusBadge } from "../components/portfolio/PortfolioStatusBadge";
import { PortfolioLifecycleStepper } from "../components/portfolio/PortfolioLifecycleStepper";
import { useLocale } from "../store/LocaleContext";
import {
  entityTypeLabel,
  labelOf,
  priorityLabel,
  projectStatusLabel,
} from "../i18n/label";
import { cn } from "../lib/cn";

type TFn = (key: string, vars?: Record<string, string | number>) => string;

function projectLinkLabel(t: TFn, link: "direct" | "via_program" | "both"): string {
  return t(`portfolioDetail.projectLink.${link}`);
}

function formatMoney(t: TFn, amount: number, currency?: string): string {
  const unit =
    currency === "AED" ? t("common.currencyAed") : t("common.currencySar");
  return `${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${unit}`;
}

function pctOf(part: number, whole: number): number {
  if (!whole || whole <= 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

const RISK_STATUS_FLOW = ["open", "mitigating", "closed"] as const;
type RiskStatusFlow = (typeof RISK_STATUS_FLOW)[number];

const RISK_SEVERITY_BADGE: Record<string, string> = {
  low: "border-steel-200 bg-steel-50 text-steel-600",
  medium: "border-sky-200 bg-sky-50 text-sky-700",
  high: "border-amber-200 bg-amber-50 text-amber-800",
  critical: "border-red-200 bg-red-50 text-red-700",
};

const RISK_STATUS_BADGE: Record<RiskStatusFlow, string> = {
  open: "border-amber-200 bg-amber-50 text-amber-800",
  mitigating: "border-sky-200 bg-sky-50 text-sky-700",
  closed: "border-steel-200 bg-steel-50 text-steel-600",
};

const BENEFIT_STATUS_FLOW = ["planned", "in_progress", "realized"] as const;
type BenefitStatusFlow = (typeof BENEFIT_STATUS_FLOW)[number];
type BenefitStatusAll = BenefitStatusFlow | "deferred";

const BENEFIT_STATUS_BADGE: Record<BenefitStatusAll, string> = {
  planned: "border-steel-200 bg-steel-50 text-steel-600",
  in_progress: "border-sky-200 bg-sky-50 text-sky-700",
  realized: "border-emerald-200 bg-emerald-50 text-emerald-700",
  deferred: "border-amber-200 bg-amber-50 text-amber-800",
};

const PROJECT_STATUS_BADGE: Record<string, string> = {
  draft:
    "border-steel-200 bg-steel-50 text-steel-600 dark:border-steel-700 dark:bg-steel-800/50 dark:text-steel-300",
  planned:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300",
  active:
    "border-brand-200 bg-brand-500/10 text-brand-700 dark:border-brand-800 dark:text-brand-300",
  on_hold:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-steel-950/40 dark:text-amber-200",
  completed:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  cancelled:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
};

function TinyBadge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap",
        className,
      )}
    >
      {label}
    </span>
  );
}

function SegmentedFilter({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; count: number }[];
  label: string;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <span className="shrink-0 text-[10px] font-bold text-steel-400">{label}</span>
      <div
        role="tablist"
        aria-label={label}
        className="inline-flex flex-wrap rounded border border-steel-200 bg-steel-50 p-0.5 dark:border-steel-700 dark:bg-steel-900"
      >
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-bold transition-colors duration-150",
                active
                  ? "bg-brand-500 text-white"
                  : "text-steel-500 hover:bg-white hover:text-steel-800 dark:hover:bg-steel-800 dark:hover:text-steel-100",
              )}
            >
              {o.label}
              <span
                className={cn(
                  "tabular-nums text-[10px]",
                  active ? "text-white/80" : "text-steel-400",
                )}
              >
                {o.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function nextRiskStatus(current: string): RiskStatusFlow | null {
  const idx = RISK_STATUS_FLOW.indexOf(current as RiskStatusFlow);
  if (idx < 0 || idx >= RISK_STATUS_FLOW.length - 1) return null;
  return RISK_STATUS_FLOW[idx + 1];
}

function nextBenefitStatus(current: string): BenefitStatusAll | null {
  if (current === "deferred") return "in_progress";
  const idx = BENEFIT_STATUS_FLOW.indexOf(current as BenefitStatusFlow);
  if (idx < 0 || idx >= BENEFIT_STATUS_FLOW.length - 1) return null;
  return BENEFIT_STATUS_FLOW[idx + 1];
}

function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type TimelineRow = {
  id: string;
  at: string;
  actorUserId?: string;
  text: string;
};

function riskTimeline(t: TFn, 
  items: Array<{
    title: string;
    status: string;
    ownerUserId?: string;
    createdAt: string;
    events?: PortfolioItemEvent[];
  }>,
): TimelineRow[] {
  const rows: TimelineRow[] = [];
  for (const item of items) {
    const stored = item.events ?? [];
    const hasCreated = stored.some((e) => e.kind === "created");
    const events = hasCreated
      ? stored
      : [
          ...stored,
          {
            id: `created-${item.createdAt}-${item.title}`,
            at: item.createdAt,
            actorUserId: item.ownerUserId,
            kind: "created" as const,
            to: item.status,
          },
        ];
    for (const e of events) {
      const from = e.from
        ? labelOf(t, "portfolio.risk.status", e.from)
        : "";
      const to = e.to ? labelOf(t, "portfolio.risk.status", e.to) : "";
      rows.push({
        id: e.id,
        at: e.at,
        actorUserId: e.actorUserId,
        text:
          e.kind === "created"
            ? t("portfolioDetail.k018", { title: item.title })
            : t("portfolioDetail.k019", {
                title: item.title,
                from,
                to,
              }),
      });
    }
  }
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}

function benefitTimeline(
  t: TFn,
  items: Array<{
    title: string;
    status: string;
    createdAt: string;
    events?: PortfolioItemEvent[];
  }>,
): TimelineRow[] {
  const rows: TimelineRow[] = [];
  for (const item of items) {
    const stored = item.events ?? [];
    const hasCreated = stored.some((e) => e.kind === "created");
    const events = hasCreated
      ? stored
      : [
          ...stored,
          {
            id: `created-${item.createdAt}-${item.title}`,
            at: item.createdAt,
            kind: "created" as const,
            to: item.status,
          },
        ];
    for (const e of events) {
      const from = e.from
        ? labelOf(t, "portfolio.benefit.status", e.from)
        : "";
      const to = e.to ? labelOf(t, "portfolio.benefit.status", e.to) : "";
      rows.push({
        id: e.id,
        at: e.at,
        actorUserId: e.actorUserId,
        text:
          e.kind === "created"
            ? t("portfolioDetail.k020", { title: item.title })
            : t("portfolioDetail.k019", {
                title: item.title,
                from,
                to,
              }),
      });
    }
  }
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}

function ChangeTimeline({
  t,
  rows,
  actorName,
}: {
  t: TFn;
  rows: TimelineRow[];
  actorName: (id?: string) => string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-steel-400">{t("portfolioDetail.timeline.empty")}</p>;
  }
  return (
    <ol className="relative space-y-3 border-s border-steel-200 ps-4 dark:border-steel-700">
      {rows.map((row) => (
        <li key={row.id} className="relative">
          <span
            aria-hidden
            className="absolute top-1.5 h-2 w-2 rounded-full bg-brand-500"
            style={{ insetInlineStart: "calc(-1rem - 4px)" }}
          />
          <p className="text-xs font-semibold text-steel-800 dark:text-steel-100">
            {row.text}
          </p>
          <p className="mt-0.5 text-[11px] text-steel-400">
            {actorName(row.actorUserId)}
            <span className="mx-1.5 text-steel-300">·</span>
            <span className="tabular-nums">{formatStamp(row.at)}</span>
          </p>
        </li>
      ))}
    </ol>
  );
}


type TabId =
  | "overview"
  | "strategy"
  | "structure"
  | "programs"
  | "projects"
  | "financials"
  | "risks"
  | "governance"
  | "history";

export function PortfolioDetailPage() {
  const { t } = useLocale();
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    portfolios,
    programs,
    initiatives,
    projects,
    objectives,
    relationships,
    portfolioRisks,
    portfolioBenefits,
    portfolioAudit,
    updatePortfolio,
    runPortfolioWorkflow,
    removeRelationship,
    addPortfolioRisk,
    updatePortfolioRisk,
    addPortfolioBenefit,
    updatePortfolioBenefit,
  } = useHierarchy();
  const { user, users } = useAuth();
  const { departments } = useData();
  const can = useCan();
  const { policy, profileLabel, workflowLabel } = useOrgPortfolioPolicy();
  
  const TABS = useMemo(
    () => [
      { id: "overview" as const, label: t("portfolioDetail.tab.overview") },
      { id: "strategy" as const, label: t("portfolioDetail.tab.strategy") },
      { id: "structure" as const, label: t("portfolioDetail.tab.structure") },
      { id: "programs" as const, label: t("portfolioDetail.tab.programs") },
      { id: "projects" as const, label: t("portfolioDetail.tab.projects") },
      { id: "financials" as const, label: t("portfolioDetail.tab.financials") },
      { id: "risks" as const, label: t("portfolioDetail.tab.risks") },
      { id: "governance" as const, label: t("portfolioDetail.tab.governance") },
      { id: "history" as const, label: t("portfolioDetail.tab.history") },
    ],
    [t],
  );
  const actionLabel = (action: PortfolioWorkflowAction | string) =>
    t(`portfolio.action.${action}`);
  const riskSeverityLabel = (id: string) =>
    labelOf(t, "portfolio.risk.severity", id);
  const riskStatusLabel = (id: string) =>
    labelOf(t, "portfolio.risk.status", id);
  const benefitStatusLabel = (id: string) =>
    labelOf(t, "portfolio.benefit.status", id);
const [tab, setTab] = useState<TabId>("overview");
  const [reasonOpen, setReasonOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PortfolioWorkflowAction | null>(null);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [relOpen, setRelOpen] = useState(false);
  const [budgetEdit, setBudgetEdit] = useState("");
  const [budgetNotesEdit, setBudgetNotesEdit] = useState<string | null>(null);
  const emptyRiskForm = {
    title: "",
    severity: "medium",
    status: "open",
    mitigation: "",
    ownerUserId: "",
  };
  const emptyBenefitForm = {
    title: "",
    status: "planned",
    targetMetric: "",
  };
  const [riskForm, setRiskForm] = useState(emptyRiskForm);
  const [benefitForm, setBenefitForm] = useState(emptyBenefitForm);
  const [riskModalOpen, setRiskModalOpen] = useState(false);
  const [benefitModalOpen, setBenefitModalOpen] = useState(false);
  const [riskLogOpen, setRiskLogOpen] = useState(false);
  const [benefitLogOpen, setBenefitLogOpen] = useState(false);
  const [riskSeverityFilter, setRiskSeverityFilter] = useState("all");
  const [riskStatusFilter, setRiskStatusFilter] = useState("all");
  const [benefitStatusFilter, setBenefitStatusFilter] = useState("all");
  const [linkObjectiveId, setLinkObjectiveId] = useState("");
  const [projectQuery, setProjectQuery] = useState("");
  const [projectStatusFilter, setProjectStatusFilter] = useState("all");
  const [projectLinkFilter, setProjectLinkFilter] = useState("all");

  const raw = portfolios.find((p) => p.id === id);
  const portfolio = raw ? normalizePortfolio(raw) : null;

  const entities = useMemo(
    () =>
      collectStrategicEntities({
        portfolios,
        initiatives,
        programs,
        projects,
      }),
    [portfolios, initiatives, programs, projects],
  );

  const pfPrograms = useMemo(
    () => (portfolio ? programsForPortfolio(programs, portfolio.id) : []),
    [programs, portfolio],
  );
  const directProjects = useMemo(
    () => (portfolio ? projectsForPortfolio(projects, portfolio.id) : []),
    [projects, portfolio],
  );
  const viaProgramProjects = useMemo(() => {
    const ids = new Set(pfPrograms.map((p) => p.id));
    return projects.filter((p) => p.programId && ids.has(p.programId));
  }, [projects, pfPrograms]);
  const uniqueProjects = useMemo(() => {
    const map = new Map<string, (typeof projects)[0] & { link: "direct" | "via_program" | "both" }>();
    for (const p of directProjects) {
      map.set(p.id, { ...p, link: "direct" });
    }
    for (const p of viaProgramProjects) {
      const prev = map.get(p.id);
      map.set(p.id, prev ? { ...p, link: "both" } : { ...p, link: "via_program" });
    }
    return [...map.values()];
  }, [directProjects, viaProgramProjects]);

  const filteredPortfolioProjects = useMemo(() => {
    const q = projectQuery.trim().toLowerCase();
    return uniqueProjects.filter((p) => {
      if (projectStatusFilter !== "all" && p.status !== projectStatusFilter) {
        return false;
      }
      if (projectLinkFilter !== "all" && p.link !== projectLinkFilter) {
        return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
      );
    });
  }, [uniqueProjects, projectQuery, projectStatusFilter, projectLinkFilter]);

  const projectTabSummary = useMemo(() => {
    const n = filteredPortfolioProjects.length;
    const budget = filteredPortfolioProjects.reduce(
      (sum, p) => sum + (p.budgetSar || 0),
      0,
    );
    const avg =
      n === 0
        ? 0
        : Math.round(
            filteredPortfolioProjects.reduce((sum, p) => sum + p.progress, 0) /
              n,
          );
    return { n, budget, avg };
  }, [filteredPortfolioProjects]);

  const pfInitiatives = useMemo(() => {
    if (!portfolio) return [];
    const byFk = initiativesForPortfolio(initiatives, portfolio.id);
    if (byFk.length > 0) return byFk;
    const active = relationships.filter(
      (r) =>
        r.isActive &&
        r.relationshipType === "contains" &&
        r.sourceType === "portfolio" &&
        r.sourceId === portfolio.id &&
        r.targetType === "initiative",
    );
    return initiatives.filter((i) => active.some((r) => r.targetId === i.id));
  }, [portfolio, relationships, initiatives]);

  const pfRels = useMemo(
    () =>
      relationships.filter(
        (r) =>
          r.isActive &&
          ((r.sourceType === "portfolio" && r.sourceId === portfolio?.id) ||
            (r.targetType === "portfolio" && r.targetId === portfolio?.id)),
      ),
    [relationships, portfolio],
  );

  const risks = portfolioRisks.filter((r) => r.portfolioId === portfolio?.id);
  const benefits = portfolioBenefits.filter((b) => b.portfolioId === portfolio?.id);
  const audit = portfolioAudit.filter((a) => a.portfolioId === portfolio?.id);

  const filteredRisks = useMemo(() => {
    return risks.filter((r) => {
      if (riskSeverityFilter !== "all" && r.severity !== riskSeverityFilter) {
        return false;
      }
      if (riskStatusFilter !== "all" && r.status !== riskStatusFilter) {
        return false;
      }
      return true;
    });
  }, [risks, riskSeverityFilter, riskStatusFilter]);

  const filteredBenefits = useMemo(() => {
    return benefits.filter((b) => {
      if (benefitStatusFilter !== "all" && b.status !== benefitStatusFilter) {
        return false;
      }
      return true;
    });
  }, [benefits, benefitStatusFilter]);

  const riskBenefitSummary = useMemo(() => {
    const open = risks.filter((r) => r.status !== "closed");
    const criticalHigh = open.filter(
      (r) => r.severity === "critical" || r.severity === "high",
    );
    const inProgress = benefits.filter((b) => b.status === "in_progress");
    const realized = benefits.filter((b) => b.status === "realized");
    return {
      open: open.length,
      criticalHigh: criticalHigh.length,
      inProgress: inProgress.length,
      realized: realized.length,
    };
  }, [risks, benefits]);

  const linkedObjectivesFull = useMemo(() => {
    if (!portfolio) return [];
    return (portfolio.objectiveIds || [])
      .map((oid) => objectives.find((o) => o.id === oid))
      .filter((o): o is NonNullable<typeof o> => Boolean(o));
  }, [portfolio, objectives]);

  const linkedObjectives = useMemo(
    () => linkedObjectivesFull.map((o) => ({ id: o.id, title: o.title })),
    [linkedObjectivesFull],
  );

  const availableObjectivesToLink = useMemo(() => {
    if (!portfolio) return [];
    const linked = new Set(portfolio.objectiveIds || []);
    return objectives.filter((o) => !linked.has(o.id));
  }, [portfolio, objectives]);

  const perm = {
    managePortfolio: can.managePortfolio(user?.role),
    role: user?.role,
  };
  // Workflow actions for current status ∩ role; org/super admin sees all valid actions
  const actions = portfolio
    ? availableActions(portfolio, policy).filter((a) =>
        canRunPortfolioAction(a, perm),
      )
    : [];
  const canEdit = portfolio
    ? canEditPortfolio(perm, portfolio.status, policy, portfolio)
    : false;

  if (!portfolio) {
    return (
      <Card className="p-6">
        <p className="text-sm text-steel-500">{t("portfolioDetail.k088")}</p>
        <Button className="mt-3" onClick={() => navigate("/portfolios")}>
          {t("portfolioDetail.ui.backToList")}
        </Button>
      </Card>
    );
  }

  const approved = portfolio.approvedBudgetSar || 0;
  const actual = portfolio.actualSpendSar || 0;
  const remaining = remainingBudget(approved, actual);
  const variance = budgetVariance(approved, actual);
  const currency = portfolio.currency || policy.defaultCurrency || "SAR";
  const planned = portfolio.plannedBudgetSar || 0;
  const allocated = portfolio.allocatedBudgetSar || 0;
  const forecast = portfolio.forecastSpendSar || 0;
  const spendPct = pctOf(actual, approved);
  const allocatedPct = pctOf(allocated, approved);
  const forecastPct = pctOf(forecast, approved);
  const variancePct = pctOf(Math.abs(variance), approved);
  const varianceWarn =
    approved > 0 && variancePct >= policy.varianceWarningPct;
  const spendBarPct = Math.min(100, spendPct);
  const projectBudgetRows = uniqueProjects.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    budget: p.budgetSar || 0,
    spent: p.spentSar || 0,
    spentPct: pctOf(p.spentSar || 0, p.budgetSar || 0),
  }));
  const projectsBudgetTotal = projectBudgetRows.reduce(
    (s, r) => s + r.budget,
    0,
  );
  const projectsSpentTotal = projectBudgetRows.reduce((s, r) => s + r.spent, 0);
  const canEditBudget =
    canManagePortfolioBudget(perm) &&
    portfolio.status !== "closed" &&
    portfolio.status !== "archived";
  const notesValue =
    budgetNotesEdit !== null ? budgetNotesEdit : portfolio.budgetNotes || "";
  const openRisks = risks.filter((r) => r.status !== "closed");
  const criticalRisks = openRisks.filter(
    (r) => r.severity === "critical" || r.severity === "high",
  );
  const lastAudit = audit[0];
  const directOnlyCount = uniqueProjects.filter((p) => p.link === "direct").length;
  const viaProgramOnlyCount = uniqueProjects.filter(
    (p) => p.link === "via_program",
  ).length;
  const bothLinkCount = uniqueProjects.filter((p) => p.link === "both").length;

  const runAction = (action: PortfolioWorkflowAction) => {
    const needsReason = ["return", "reject", "suspend", "close"].includes(action);
    if (needsReason) {
      setPendingAction(action);
      setReason("");
      setReasonOpen(true);
      return;
    }
    const res = runPortfolioWorkflow(portfolio.id, action, { actorUserId: user?.id });
    if (!res.ok) setActionError(res.reason || t("portfolioDetail.k039"));
    else setActionError("");
  };

  const confirmReason = () => {
    if (!pendingAction) return;
    const res = runPortfolioWorkflow(portfolio.id, pendingAction, {
      actorUserId: user?.id,
      reason,
    });
    if (!res.ok) setActionError(res.reason || t("portfolioDetail.k039"));
    else {
      setActionError("");
      setReasonOpen(false);
      setPendingAction(null);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={portfolio.name}
        subtitle={`${portfolio.code} · ${priorityLabel(t, portfolio.priority || "medium")} · ${profileLabel} / ${workflowLabel}`}
        icon={<Briefcase className="h-6 w-6" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PortfolioStatusBadge status={portfolio.status} className="text-xs" />
            {canEdit ? (
              <Button variant="outline" onClick={() => navigate(`/portfolios/${portfolio.id}/edit`)}>
                {t("portfolioDetail.ui.edit")}
              </Button>
            ) : null}
            {actions.map((a) => (
              <Button
                key={a}
                variant={a === "reject" || a === "close" ? "danger" : a === "approve" || a === "activate" ? "primary" : "outline"}
                onClick={() => runAction(a)}
              >
                {actionLabel(a)}
              </Button>
            ))}
          </div>
        }
      />

      <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Meta label={t("portfolioDetail.k040")} value={users.find((u) => u.id === portfolio.ownerUserId)?.name ?? "—"} />
        <Meta label={t("portfolioDetail.k041")} value={users.find((u) => u.id === portfolio.sponsorUserId)?.name ?? "—"} />
        <Meta
          label={t("portfolioDetail.k042")}
          value={formatMoney(t, approved, portfolio.currency)}
        />
        <Meta label={t("portfolioDetail.k043")} value={labelOf(t, "portfolio.health", portfolio.health || "unknown")} />
      </Card>

      <PortfolioLifecycleStepper status={portfolio.status} policy={policy} />

      {actionError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {actionError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-1 rounded-xl border border-steel-200 bg-white p-1 dark:border-steel-700 dark:bg-steel-900">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-lg px-3 py-2 text-xs font-bold",
              tab === t.id
                ? "bg-brand-500/10 text-brand-700 dark:text-brand-300"
                : "text-steel-500 hover:bg-steel-50 dark:hover:bg-steel-800",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="space-y-3 p-4 lg:col-span-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-extrabold">{t("portfolioDetail.k091")}</h3>
                <PortfolioStatusBadge status={portfolio.status} />
              </div>
              <p className="text-sm text-steel-600 dark:text-steel-300">
                {portfolio.description || t("portfolioDetail.k044")}
              </p>
              {portfolio.expectedBenefits ? (
                <p className="text-xs text-steel-500">
                  {t("portfolioDetail.ui.expectedBenefits")} {portfolio.expectedBenefits}
                </p>
              ) : null}
              <div className="grid gap-2 text-xs sm:grid-cols-2">
                <p>
                  <span className="text-steel-400">{t("portfolioDetail.ui.code")}</span>
                  {portfolio.code || "—"}
                </p>
                <p>
                  <span className="text-steel-400">{t("portfolioDetail.ui.type")}</span>
                  {labelOf(t, "portfolio.type", portfolio.portfolioType || "other")}
                </p>
                <p>
                  <span className="text-steel-400">{t("portfolioDetail.ui.priority")}</span>
                  {priorityLabel(t, portfolio.priority || "medium")}
                </p>
                <p>
                  <span className="text-steel-400">{t("portfolioDetail.ui.fiscalYear")}</span>
                  {portfolio.fiscalYear || "—"}
                </p>
                <p>
                  <span className="text-steel-400">{t("portfolioDetail.ui.governance")}</span>
                  {labelOf(t, "governance", portfolio.governanceModel || "pmo_central")}
                </p>
                <p>
                  <span className="text-steel-400">{t("portfolioDetail.ui.department")}</span>
                  {departments.find((d) => d.id === portfolio.departmentId)?.name ??
                    "—"}
                </p>
                <p className="sm:col-span-2">
                  <span className="text-steel-400">{t("portfolioDetail.ui.schedule")}</span>
                  {portfolio.startDate || "—"} → {portfolio.endDate || "—"}
                </p>
              </div>
            </Card>

            <Card className="space-y-3 p-4">
              <h3 className="text-sm font-extrabold">{t("portfolioDetail.k099")}</h3>
              <p className="text-sm font-semibold">
                {labelOf(t, "portfolio.health", portfolio.health || "unknown")}
              </p>
              <p className="text-xs text-steel-500">
                {t("portfolioDetail.ui.openRisks")} {openRisks.length}
                {criticalRisks.length > 0
                  ? t("pf.criticalOf", { count: criticalRisks.length })
                  : ""}
              </p>
              {criticalRisks.length > 0 ? (
                <ul className="space-y-1">
                  {criticalRisks.slice(0, 3).map((r) => (
                    <li
                      key={r.id}
                      className="rounded-lg border border-red-100 bg-red-50 px-2 py-1 text-[11px] text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                    >
                      {r.title}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-steel-400">
                  {t("portfolioDetail.ui.noHighRisks")}
                </p>
              )}
              <button
                type="button"
                className="text-[11px] font-bold text-brand-700 hover:underline"
                onClick={() => setTab("risks")}
              >
                {t("portfolioDetail.ui.viewRisksBenefits")}
              </button>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="space-y-2 p-4">
              <h3 className="text-sm font-extrabold">{t("portfolioDetail.k102")}</h3>
              <div className="grid gap-2 text-xs">
                <p className="flex justify-between gap-2">
                  <span className="text-steel-400">{t("portfolioDetail.k103")}</span>
                  <span className="font-bold tabular-nums">
                    {approved.toLocaleString("en-US")}{" "}
                    {portfolio.currency === "AED" ? t("portfolioDetail.k008") : t("portfolioDetail.k009")}
                  </span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-steel-400">{t("portfolioDetail.k104")}</span>
                  <span className="font-bold tabular-nums">
                    {actual.toLocaleString("en-US")}
                  </span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-steel-400">{t("portfolioDetail.k105")}</span>
                  <span className="font-bold tabular-nums">
                    {remaining.toLocaleString("en-US")}
                  </span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-steel-400">{t("portfolioDetail.k106")}</span>
                  <span className="tabular-nums">
                    {(portfolio.plannedBudgetSar || 0).toLocaleString("en-US")}
                  </span>
                </p>
              </div>
              <button
                type="button"
                className="text-[11px] font-bold text-brand-700 hover:underline"
                onClick={() => setTab("financials")}
              >
                {t("portfolioDetail.ui.financialDetails")}
              </button>
            </Card>

            <Card className="space-y-2 p-4">
              <h3 className="text-sm font-extrabold">{t("portfolioDetail.k108")}</h3>
              <div className="grid gap-1.5 text-xs">
                <p>{t("portfolioDetail.ui.programsCount")} {pfPrograms.length}</p>
                <p>{t("portfolioDetail.ui.initiativesCount")} {pfInitiatives.length}</p>
                <p>{t("portfolioDetail.ui.projectsUnique")} {uniqueProjects.length}</p>
                <p className="text-steel-400">
                  {t("pf.linkBreakdown", {
                    direct: directOnlyCount,
                    via: viaProgramOnlyCount,
                  })}
                  {bothLinkCount
                    ? t("pf.linkBoth", { count: bothLinkCount })
                    : ""}
                </p>
              </div>
              <button
                type="button"
                className="text-[11px] font-bold text-brand-700 hover:underline"
                onClick={() => setTab("structure")}
              >
                {t("portfolioDetail.ui.linkStructure")}
              </button>
            </Card>

            <Card className="space-y-2 p-4">
              <h3 className="text-sm font-extrabold">{t("portfolioDetail.k110")}</h3>
              {linkedObjectives.length === 0 ? (
                <p className="text-xs text-steel-400">{t("portfolioDetail.k111")}</p>
              ) : (
                <ul className="space-y-1.5">
                  {linkedObjectives.slice(0, 3).map((o) => (
                    <li
                      key={o.id}
                      className="text-xs font-semibold text-steel-700 dark:text-steel-200"
                    >
                      {o.title}
                    </li>
                  ))}
                  {linkedObjectives.length > 3 ? (
                    <li className="text-[11px] text-steel-400">
                      {t("pf.andMore", { count: linkedObjectives.length - 3 })}
                    </li>
                  ) : null}
                </ul>
              )}
              <button
                type="button"
                className="text-[11px] font-bold text-brand-700 hover:underline"
                onClick={() => setTab("strategy")}
              >
                {t("portfolioDetail.ui.strategy")}
              </button>
            </Card>
          </div>

          <Card className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-steel-500">
              <p>
                <span className="text-steel-400">{t("portfolioDetail.ui.lastUpdate")}</span>
                {portfolio.updatedAt?.slice(0, 16)?.replace("T", " ") || "—"}
              </p>
              <p className="mt-1">
                <span className="text-steel-400">{t("portfolioDetail.ui.lastActivity")}</span>
                {lastAudit
                  ? `${actionLabel(lastAudit.action as PortfolioWorkflowAction) || lastAudit.action}${
                      lastAudit.toStatus ? ` → ${lastAudit.toStatus}` : ""
                    } · ${lastAudit.createdAt.slice(0, 16).replace("T", " ")}`
                  : t("portfolioDetail.k045")}
              </p>
            </div>
            <button
              type="button"
              className="text-[11px] font-bold text-brand-700 hover:underline"
              onClick={() => setTab("history")}
            >
              {t("portfolioDetail.ui.openHistory")}
            </button>
          </Card>
        </div>
      ) : null}

      {tab === "strategy" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold text-steel-800 dark:text-steel-100">
              {t("portfolioDetail.ui.strategyAlignment")}
            </h3>
            {canEdit && availableObjectivesToLink.length > 0 ? (
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[14rem] sm:min-w-[18rem]">
                  <SearchableSelect
                    value={linkObjectiveId}
                    onChange={setLinkObjectiveId}
                    placeholder={t("portfolioDetail.k046")}
                    truncateLabel={false}
                    options={availableObjectivesToLink.map((o) => ({
                      value: o.id,
                      label: o.title,
                    }))}
                  />
                </div>
                <Button
                  disabled={!linkObjectiveId}
                  onClick={() => {
                    if (!linkObjectiveId) return;
                    updatePortfolio(
                      portfolio.id,
                      {
                        objectiveIds: [
                          ...(portfolio.objectiveIds || []),
                          linkObjectiveId,
                        ],
                      },
                      user?.id,
                    );
                    setLinkObjectiveId("");
                  }}
                >
                  {t("portfolioDetail.ui.linkObjective")}
                </Button>
              </div>
            ) : null}
          </div>

          <Card className="grid gap-3 p-3 sm:grid-cols-3">
            <Meta
              label={t("portfolioDetail.k047")}
              value={String(linkedObjectives.length)}
            />
            <Meta
              label={t("portfolioDetail.k048")}
              value={String(portfolio.fiscalYear || "—")}
            />
            <Meta
              label={t("portfolioDetail.k049")}
              value={
                policy.requireObjectivesOnSubmit ||
                policy.requiredAtSubmit.includes("objectiveIds")
                  ? t("portfolioDetail.k050")
                  : t("portfolioDetail.k051")
              }
            />
          </Card>

          {policy.requireObjectivesOnSubmit &&
          linkedObjectives.length === 0 ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              {t("pf.policyNeedObjective")}
            </p>
          ) : null}

          <Card className="overflow-hidden p-0">
            <div className="border-b border-steel-100 px-4 py-3 dark:border-steel-800">
              <h4 className="text-sm font-extrabold">{t("portfolioDetail.k119")}</h4>
            </div>
            {linkedObjectives.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-steel-500">
                {t("portfolioDetail.k120")}
              </p>
            ) : (
              <ul className="divide-y divide-steel-100 dark:divide-steel-800">
                {linkedObjectivesFull.map((o) => (
                  <li
                    key={o.id}
                    className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-steel-800 dark:text-steel-100">
                        {o.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[13px] text-steel-500">
                        {o.description || "—"}
                      </p>
                      <p className="mt-1 text-[11px] text-steel-400">
                        {t("pf.targetYear", { year: o.targetYear })}
                      </p>
                    </div>
                    {canEdit ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() =>
                          updatePortfolio(
                            portfolio.id,
                            {
                              objectiveIds: (portfolio.objectiveIds || []).filter(
                                (x) => x !== o.id,
                              ),
                            },
                            user?.id,
                          )
                        }
                      >
                        {t("portfolioDetail.ui.unlink")}
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="space-y-2 p-4">
              <h4 className="text-sm font-extrabold">{t("portfolioDetail.k122")}</h4>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-steel-600 dark:text-steel-300">
                {portfolio.expectedBenefits?.trim() || "—"}
              </p>
            </Card>
            <Card className="space-y-2 p-4">
              <h4 className="text-sm font-extrabold">{t("portfolioDetail.k123")}</h4>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-steel-600 dark:text-steel-300">
                {portfolio.successMetrics?.trim() || "—"}
              </p>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === "structure" ? (
        <Card className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold">{t("portfolioDetail.k124")}</h3>
            {perm.managePortfolio ? (
              <Button onClick={() => setRelOpen(true)}>{t("portfolioDetail.k125")}</Button>
            ) : null}
          </div>
          {pfRels.length === 0 ? (
            <p className="text-sm text-steel-400">{t("portfolioDetail.k126")}</p>
          ) : (
            <ul className="space-y-2">
              {pfRels.map((r) => {
                const def = getRelationshipDef(r.relationshipType);
                const otherType =
                  r.sourceId === portfolio.id ? r.targetType : r.sourceType;
                const otherId =
                  r.sourceId === portfolio.id ? r.targetId : r.sourceId;
                return (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-steel-100 px-3 py-2 text-sm dark:border-steel-800"
                  >
                    <span>
                      <span className="text-[10px] font-bold text-steel-400">
                        {def.nameAr}
                      </span>
                      <br />
                      {entityTypeLabel(t, otherType)}:{" "}
                      {findEntityName(entities, otherType, otherId)}
                    </span>
                    {perm.managePortfolio ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          removeRelationship(r.id, {
                            userId: user?.id,
                            reason: t("portfolioDetail.k052"),
                          })
                        }
                      >
                        {t("portfolioDetail.ui.removeRelationship")}
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-[11px] text-steel-400">
            {t("pf.removeRelNote")}{" "}
            <Link to="/strategy" className="text-brand-700 hover:underline">
              {t("pf.strategicOverview")}
            </Link>
            .
          </p>
        </Card>
      ) : null}

      {tab === "programs" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-steel-100 px-4 py-3 text-sm font-extrabold dark:border-steel-800">
              {t("pf.programsCount", { count: pfPrograms.length })}
            </div>
            <ul className="divide-y divide-steel-100 dark:divide-steel-800">
              {pfPrograms.map((prg) => {
                const initiative = initiatives.find(
                  (i) => i.id === prg.initiativeId,
                );
                return (
                  <li key={prg.id} className="px-4 py-3 text-sm">
                    <Link
                      to="/programs"
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      {prg.name}
                    </Link>
                    <p className="text-[11px] text-steel-400">
                      {t("portfolioDetail.ui.initiative")} {initiative?.name ?? "—"}
                      {" · "}
                      {t("portfolioDetail.ui.manager")}{" "}
                      {users.find((u) => u.id === prg.managerUserId)?.name ??
                        "—"}
                    </p>
                  </li>
                );
              })}
              {pfPrograms.length === 0 ? (
                <li className="px-4 py-6 text-xs text-steel-400">{t("portfolioDetail.k129")}</li>
              ) : null}
            </ul>
          </Card>
          <Card className="overflow-hidden p-0">
            <div className="border-b border-steel-100 px-4 py-3 text-sm font-extrabold dark:border-steel-800">
              {t("pf.initiativesCount", { count: pfInitiatives.length })}
            </div>
            <ul className="divide-y divide-steel-100 dark:divide-steel-800">
              {pfInitiatives.map((ini) => {
                const goals = ini.objectiveIds
                  .map((oid) => objectives.find((o) => o.id === oid)?.title)
                  .filter(Boolean)
                  .join(" · ");
                const childPrograms = programsForInitiative(programs, ini.id);
                return (
                  <li key={ini.id} className="px-4 py-3 text-sm">
                    <Link
                      to="/initiatives"
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      {ini.name}
                    </Link>
                    <p className="text-[11px] text-steel-400">
                      {t("portfolioDetail.ui.goal")} {goals || "—"}
                      {" · "}
                      {t("portfolioDetail.ui.programsCount")}{" "}
                      {childPrograms.length
                        ? childPrograms.map((p) => p.name).join(" · ")
                        : "—"}
                    </p>
                  </li>
                );
              })}
              {pfInitiatives.length === 0 ? (
                <li className="px-4 py-6 text-xs text-steel-400">
                  {t("portfolioDetail.k128")}
                </li>
              ) : null}
            </ul>
          </Card>
        </div>
      ) : null}

      {tab === "projects" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-4 text-[12px] text-steel-500">
              <span>
                {t("pf.projectsLabel")}{" "}
                <span className="font-bold tabular-nums text-steel-800 dark:text-steel-100">
                  {projectTabSummary.n}
                </span>
              </span>
              <span>
                {t("pf.avgProgress")}{" "}
                <span className="font-bold tabular-nums text-steel-800 dark:text-steel-100">
                  {projectTabSummary.avg}%
                </span>
              </span>
              <span>
                {t("pf.totalBudget")}{" "}
                <span className="font-bold tabular-nums text-steel-800 dark:text-steel-100">
                  {formatMoney(t, projectTabSummary.budget)}
                </span>
              </span>
            </div>
            {perm.managePortfolio ? (
              <Button onClick={() => setRelOpen(true)}>{t("portfolioDetail.k131")}</Button>
            ) : null}
          </div>

          <Card className="grid gap-2 p-3 sm:grid-cols-3">
            <Input
              placeholder={t("portfolioDetail.k053")}
              value={projectQuery}
              onChange={(e) => setProjectQuery(e.target.value)}
            />
            <SearchableSelect
              value={projectStatusFilter}
              onChange={setProjectStatusFilter}
              options={[
                { value: "all", label: t("portfolioDetail.k054") },
                ...(
                  [
                    "draft",
                    "planned",
                    "active",
                    "on_hold",
                    "completed",
                    "cancelled",
                  ] as const
                ).map((value) => ({
                  value,
                  label: projectStatusLabel(t, value),
                })),
              ]}
            />
            <SearchableSelect
              value={projectLinkFilter}
              onChange={setProjectLinkFilter}
              options={[
                { value: "all", label: t("portfolioDetail.k055") },
                { value: "direct", label: t("portfolioDetail.k005") },
                { value: "via_program", label: t("portfolioDetail.k006") },
                { value: "both", label: t("portfolioDetail.k007") },
              ]}
            />
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b border-steel-200 bg-steel-50 text-start dark:border-steel-700 dark:bg-steel-800/60">
                    <th className="px-3 py-2 font-bold">{t("portfolioDetail.k132")}</th>
                    <th className="px-3 py-2 font-bold">{t("portfolioDetail.k133")}</th>
                    <th className="px-3 py-2 font-bold">{t("portfolioDetail.k134")}</th>
                    <th className="px-3 py-2 font-bold">{t("portfolioDetail.k135")}</th>
                    <th className="px-3 py-2 font-bold">{t("portfolioDetail.k136")}</th>
                    <th className="px-3 py-2 font-bold">{t("portfolioDetail.k137")}</th>
                    <th className="px-3 py-2 font-bold">{t("portfolioDetail.k138")}</th>
                    <th className="px-3 py-2 font-bold">{t("portfolioDetail.k139")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPortfolioProjects.map((p) => {
                    const programName = p.programId
                      ? programs.find((prg) => prg.id === p.programId)?.name
                      : undefined;
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-steel-100 dark:border-steel-800"
                      >
                        <td className="px-3 py-2">
                          <Link
                            to={`/projects/${p.id}`}
                            className="font-semibold text-brand-700 hover:underline"
                          >
                            {p.name}
                          </Link>
                          <p className="font-mono text-[11px] text-steel-400">
                            {p.code}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {programName ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {projectLinkLabel(t, p.link)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              "inline-flex max-w-full items-center rounded border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap",
                              PROJECT_STATUS_BADGE[p.status] ??
                                PROJECT_STATUS_BADGE.draft,
                            )}
                          >
                            {projectStatusLabel(t, p.status) ?? p.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {priorityLabel(t, p.priority) ?? p.priority}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {users.find((u) => u.id === p.managerUserId)?.name ??
                            "—"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex min-w-[5.5rem] items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded bg-steel-100 dark:bg-steel-800">
                              <div
                                className="h-full rounded bg-brand-500 transition-[width] duration-150 ease-out"
                                style={{
                                  width: `${Math.max(0, Math.min(100, p.progress))}%`,
                                }}
                              />
                            </div>
                            <span className="tabular-nums text-[11px] font-bold text-steel-600">
                              {p.progress}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 tabular-nums text-xs">
                          {formatMoney(t, p.budgetSar || 0)}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredPortfolioProjects.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-steel-400"
                      >
                        {uniqueProjects.length === 0
                          ? perm.managePortfolio
                            ? t("portfolioDetail.k056") : t("portfolioDetail.k057") : t("portfolioDetail.k058")}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "financials" ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="space-y-1 border border-steel-200 p-3 dark:border-steel-700">
              <p className="text-[10px] font-bold text-steel-400">{t("portfolioDetail.k140")}</p>
              <p className="text-base font-extrabold tabular-nums text-steel-800 dark:text-steel-100">
                {formatMoney(t, approved, currency)}
              </p>
            </Card>
            <Card className="space-y-1 border border-steel-200 p-3 dark:border-steel-700">
              <p className="text-[10px] font-bold text-steel-400">{t("portfolioDetail.k141")}</p>
              <p className="text-base font-extrabold tabular-nums text-steel-800 dark:text-steel-100">
                {formatMoney(t, actual, currency)}
              </p>
              <p className="text-[11px] tabular-nums text-steel-500">
                {spendPct}% {t("portfolioDetail.ui.pctOfApproved")}
              </p>
            </Card>
            <Card className="space-y-1 border border-steel-200 p-3 dark:border-steel-700">
              <p className="text-[10px] font-bold text-steel-400">{t("portfolioDetail.k142")}</p>
              <p
                className={cn(
                  "text-base font-extrabold tabular-nums",
                  remaining < 0
                    ? "text-red-700 dark:text-red-300"
                    : "text-steel-800 dark:text-steel-100",
                )}
              >
                {formatMoney(t, remaining, currency)}
              </p>
            </Card>
            <Card className="space-y-1 border border-steel-200 p-3 dark:border-steel-700">
              <p className="text-[10px] font-bold text-steel-400">
                {t("portfolioDetail.ui.varianceLabel")}
              </p>
              <p
                className={cn(
                  "text-base font-extrabold tabular-nums",
                  varianceWarn
                    ? "text-amber-800 dark:text-amber-200"
                    : variance > 0
                      ? "text-red-700 dark:text-red-300"
                      : "text-steel-800 dark:text-steel-100",
                )}
              >
                {formatMoney(t, variance, currency)}
              </p>
              <p className="text-[11px] tabular-nums text-steel-500">
                {t("pf.varianceWarn", { pct: variancePct, warn: policy.varianceWarningPct })}
              </p>
            </Card>
          </div>

          {varianceWarn ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              {t("pf.varianceExceed")}
              {policy.varianceWarningPct}%).
            </p>
          ) : null}

          <Card className="space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold">{t("portfolioDetail.k144")}</h3>
              <span className="text-[11px] tabular-nums text-steel-500">
                {spendPct}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-steel-100 dark:bg-steel-800">
              <div
                className={cn(
                  "h-full rounded transition-[width] duration-150 ease-out",
                  varianceWarn ? "bg-amber-500" : "bg-brand-500",
                )}
                style={{ width: `${spendBarPct}%` }}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              <div>
                <p className="text-[10px] font-bold text-steel-400">{t("portfolioDetail.k145")}</p>
                <p className="font-semibold tabular-nums">
                  {formatMoney(t, planned, currency)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-steel-400">
                  {t("portfolioDetail.ui.allocatedToProjects")}
                </p>
                <p className="font-semibold tabular-nums">
                  {formatMoney(t, allocated, currency)}
                </p>
                <p className="text-[11px] text-steel-500">
                  {allocatedPct}% {t("portfolioDetail.ui.pctOfApproved")}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-steel-400">{t("portfolioDetail.k147")}</p>
                <p className="font-semibold tabular-nums">
                  {formatMoney(t, forecast, currency)}
                </p>
                <p className="text-[11px] text-steel-500">
                  {forecastPct}% {t("portfolioDetail.ui.pctOfApproved")}
                </p>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-steel-100 px-4 py-2.5 dark:border-steel-800">
              <h3 className="text-sm font-extrabold">{t("portfolioDetail.k148")}</h3>
              <p className="text-[11px] tabular-nums text-steel-500">
                {t("pf.projectsSpent", { amount: formatMoney(t, projectsSpentTotal, currency) })}
                {" · "}
                {t("pf.projectsBudgetTotal", { amount: formatMoney(t, projectsBudgetTotal, currency) })}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] table-fixed text-sm">
                <colgroup>
                  <col className="w-[36%]" />
                  <col className="w-[20%]" />
                  <col className="w-[20%]" />
                  <col className="w-[24%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-steel-200 bg-steel-50 dark:border-steel-700 dark:bg-steel-800/60">
                    <th className="px-4 py-2.5 text-start text-xs font-bold text-steel-600 dark:text-steel-300">
                      {t("pf.colProject")}
                    </th>
                    <th className="px-4 py-2.5 text-start text-xs font-bold text-steel-600 dark:text-steel-300">
                      {t("pf.colBudget")}
                    </th>
                    <th className="px-4 py-2.5 text-start text-xs font-bold text-steel-600 dark:text-steel-300">
                      {t("pf.colSpent")}
                    </th>
                    <th className="px-4 py-2.5 text-start text-xs font-bold text-steel-600 dark:text-steel-300">
                      {t("pf.colBurn")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projectBudgetRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-steel-100 last:border-b-0 dark:border-steel-800"
                    >
                      <td className="px-4 py-2.5 text-start align-middle">
                        <Link
                          to={`/projects/${row.id}`}
                          className="font-semibold text-brand-700 hover:underline dark:text-brand-300"
                        >
                          {row.name}
                        </Link>
                        <p className="mt-0.5 font-mono text-[11px] text-steel-400">
                          {row.code}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-start align-middle text-xs font-semibold tabular-nums whitespace-nowrap text-steel-800 dark:text-steel-100">
                        {formatMoney(t, row.budget, currency)}
                      </td>
                      <td className="px-4 py-2.5 text-start align-middle text-xs font-semibold tabular-nums whitespace-nowrap text-steel-800 dark:text-steel-100">
                        {formatMoney(t, row.spent, currency)}
                      </td>
                      <td className="px-4 py-2.5 text-start align-middle">
                        <div className="flex max-w-[11rem] items-center gap-2">
                          <span className="w-11 shrink-0 text-start text-[11px] font-bold tabular-nums text-steel-700 dark:text-steel-200">
                            {row.spentPct}%
                          </span>
                          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded bg-steel-100 dark:bg-steel-800">
                            <div
                              className="h-full rounded bg-brand-500"
                              style={{
                                width: `${Math.min(100, row.spentPct)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {projectBudgetRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-steel-400"
                      >
                        {t("pf.budgetEmpty")}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="space-y-2 p-4">
              <h3 className="text-sm font-extrabold">{t("portfolioDetail.k152")}</h3>
              <div className="grid gap-2 text-xs">
                <p className="flex justify-between gap-2">
                  <span className="text-steel-400">{t("portfolioDetail.k153")}</span>
                  <span className="font-bold tabular-nums">
                    {policy.varianceWarningPct}%
                  </span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-steel-400">{t("portfolioDetail.k154")}</span>
                  <span className="font-bold">
                    {policy.budgetChangeRequiresApproval ? t("portfolioDetail.k059") : t("portfolioDetail.k060")}
                  </span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-steel-400">{t("portfolioDetail.k155")}</span>
                  <span className="font-bold tabular-nums">
                    {formatMoney(t, policy.budgetApprovalThresholdSar || 0, currency)}
                  </span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-steel-400">{t("portfolioDetail.k156")}</span>
                  <span className="font-bold">{currency}</span>
                </p>
              </div>
            </Card>

            <Card className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold">{t("portfolioDetail.k157")}</h3>
                {canEditBudget && budgetNotesEdit === null ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setBudgetNotesEdit(portfolio.budgetNotes || "")
                    }
                  >
                    {t("portfolioDetail.ui.edit")}
                  </Button>
                ) : null}
              </div>
              {budgetNotesEdit !== null ? (
                <div className="space-y-2">
                  <Textarea
                    value={notesValue}
                    onChange={(e) => setBudgetNotesEdit(e.target.value)}
                    rows={4}
                  />
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBudgetNotesEdit(null)}
                    >
                      {t("portfolioDetail.ui.cancel")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        updatePortfolio(
                          portfolio.id,
                          { budgetNotes: notesValue.trim() },
                          user?.id,
                        );
                        setBudgetNotesEdit(null);
                      }}
                    >
                      {t("portfolioDetail.ui.editNotes")}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-steel-500">
                  {portfolio.budgetNotes?.trim()
                    ? portfolio.budgetNotes
                    : t("portfolioDetail.k061")}
                </p>
              )}
            </Card>
          </div>

          {canEditBudget ? (
            <Card className="flex flex-wrap items-end gap-2 p-4">
              <Field label={t("portfolioDetail.k062")}>
                <Input
                  value={budgetEdit}
                  onChange={(e) => setBudgetEdit(e.target.value)}
                  placeholder={String(approved)}
                />
              </Field>
              <Button
                onClick={() => {
                  const n = Number(budgetEdit);
                  if (!Number.isFinite(n) || n < 0) {
                    setActionError(t("portfolioDetail.k063"));
                    return;
                  }
                  const gate = canApplyBudgetChangeDirectly(
                    perm,
                    policy,
                    portfolio,
                    n,
                  );
                  if (!gate.ok) {
                    setActionError(gate.reason || t("portfolioDetail.k064"));
                    return;
                  }
                  updatePortfolio(
                    portfolio.id,
                    { approvedBudgetSar: n },
                    user?.id,
                  );
                  setBudgetEdit("");
                  setActionError("");
                }}
              >
                {t("portfolioDetail.ui.saveBudget")}
              </Button>
            </Card>
          ) : null}

          <p className="text-[11px] text-steel-400">
            {t("pf.spentDemoNote")}
          </p>
        </div>
      ) : null}

      {tab === "risks" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[12px] text-steel-500">
                {t("pf.riskIntro")}
              </p>
              <p className="mt-1 text-[11px] tabular-nums text-steel-400">
                {t("pf.riskSummary", {
                  open: riskBenefitSummary.open,
                  critical: riskBenefitSummary.criticalHigh,
                  progress: riskBenefitSummary.inProgress,
                  realized: riskBenefitSummary.realized,
                })}
              </p>
            </div>
          </div>

          <Card className="overflow-hidden p-0">
            <div className="space-y-2.5 border-b border-steel-100 px-4 py-3 dark:border-steel-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold">
                  {t("pf.portfolioRisks")}
                  <span className="ms-1 font-bold text-steel-400">
                    ({filteredRisks.length})
                  </span>
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRiskLogOpen(true)}
                  >
                    {t("portfolioDetail.ui.changeLog")}
                  </Button>
                  {perm.managePortfolio ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        setRiskForm(emptyRiskForm);
                        setRiskModalOpen(true);
                      }}
                    >
                      {t("portfolioDetail.ui.addRisk")}
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SegmentedFilter
                  label={t("portfolioDetail.k065")}
                  value={riskSeverityFilter}
                  onChange={setRiskSeverityFilter}
                  options={[
                    { value: "all", label: t("portfolioDetail.k066"), count: risks.length },
                    ...(["low", "medium", "high", "critical"] as const).map(
                      (value) => ({
                        value,
                        label: riskSeverityLabel(value),
                        count: risks.filter((r) => r.severity === value).length,
                      }),
                    ),
                  ]}
                />
                <SegmentedFilter
                  label={t("portfolioDetail.k067")}
                  value={riskStatusFilter}
                  onChange={setRiskStatusFilter}
                  options={[
                    { value: "all", label: t("portfolioDetail.k066"), count: risks.length },
                    ...RISK_STATUS_FLOW.map((value) => ({
                      value,
                      label: riskStatusLabel(value),
                      count: risks.filter((r) => r.status === value).length,
                    })),
                  ]}
                />
              </div>
            </div>

            {filteredRisks.length === 0 ? (
              <p className="px-4 py-7 text-center text-sm text-steel-400">
                {risks.length === 0
                  ? t("portfolioDetail.k068") : t("portfolioDetail.k058")}
              </p>
            ) : (
              <ul className="divide-y divide-steel-100 dark:divide-steel-800">
                {filteredRisks.map((r) => {
                  const next = nextRiskStatus(r.status);
                  return (
                    <li
                      key={r.id}
                      className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-steel-800 dark:text-steel-100">
                            {r.title}
                          </p>
                          <TinyBadge
                            label={
                              riskSeverityLabel(
                                r.severity
                              ) ?? r.severity
                            }
                            className={
                              RISK_SEVERITY_BADGE[
                                r.severity as keyof typeof RISK_SEVERITY_BADGE
                              ] ?? RISK_SEVERITY_BADGE.medium
                            }
                          />
                          <TinyBadge
                            label={
                              riskStatusLabel(r.status as RiskStatusFlow) ??
                              r.status
                            }
                            className={
                              RISK_STATUS_BADGE[r.status as RiskStatusFlow] ??
                              RISK_STATUS_BADGE.open
                            }
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-steel-500">
                          {t("portfolioDetail.ui.owner")}{" "}
                          {users.find((u) => u.id === r.ownerUserId)?.name ??
                            "—"}
                          <span className="mx-1.5 text-steel-300">·</span>
                          {t("portfolioDetail.ui.mitigation")} {r.mitigation?.trim() || "—"}
                        </p>
                      </div>
                      {perm.managePortfolio && next ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() =>
                            updatePortfolioRisk(r.id, { status: next }, user?.id)
                          }
                        >
                          {riskStatusLabel(next)}
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="space-y-2.5 border-b border-steel-100 px-4 py-3 dark:border-steel-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold">
                  {t("pf.portfolioBenefits")}
                  <span className="ms-1 font-bold text-steel-400">
                    ({filteredBenefits.length})
                  </span>
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBenefitLogOpen(true)}
                  >
                    {t("portfolioDetail.ui.changeLog")}
                  </Button>
                  {perm.managePortfolio ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        setBenefitForm(emptyBenefitForm);
                        setBenefitModalOpen(true);
                      }}
                    >
                      {t("portfolioDetail.ui.addBenefit")}
                    </Button>
                  ) : null}
                </div>
              </div>
              <SegmentedFilter
                label={t("portfolioDetail.k067")}
                value={benefitStatusFilter}
                onChange={setBenefitStatusFilter}
                options={[
                  { value: "all", label: t("portfolioDetail.k066"), count: benefits.length },
                  ...(
                    [
                      "planned",
                      "in_progress",
                      "realized",
                      "deferred",
                    ] as BenefitStatusAll[]
                  ).map((value) => ({
                    value,
                    label: benefitStatusLabel(value),
                    count: benefits.filter((b) => b.status === value).length,
                  })),
                ]}
              />
            </div>

            {filteredBenefits.length === 0 ? (
              <p className="px-4 py-7 text-center text-sm text-steel-400">
                {benefits.length === 0
                  ? t("portfolioDetail.k069") : t("portfolioDetail.k058")}
              </p>
            ) : (
              <ul className="divide-y divide-steel-100 dark:divide-steel-800">
                {filteredBenefits.map((b) => {
                  const next = nextBenefitStatus(b.status);
                  const canDefer =
                    b.status === "planned" || b.status === "in_progress";
                  return (
                    <li
                      key={b.id}
                      className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-steel-800 dark:text-steel-100">
                            {b.title}
                          </p>
                          <TinyBadge
                            label={
                              benefitStatusLabel(
                                b.status as BenefitStatusAll
                              ) ?? b.status
                            }
                            className={
                              BENEFIT_STATUS_BADGE[
                                b.status as BenefitStatusAll
                              ] ?? BENEFIT_STATUS_BADGE.planned
                            }
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-steel-500">
                          {t("portfolioDetail.ui.targetMetric")} {b.targetMetric?.trim() || "—"}
                        </p>
                      </div>
                      {perm.managePortfolio && (next || canDefer) ? (
                        <div className="flex shrink-0 items-center gap-2">
                          {canDefer ? (
                            <button
                              type="button"
                              onClick={() =>
                                updatePortfolioBenefit(
                                  b.id,
                                  { status: "deferred" },
                                  user?.id,
                                )
                              }
                              className="text-[11px] font-bold text-steel-400 transition-colors duration-150 hover:text-amber-800"
                            >
                              {t("portfolioDetail.ui.defer")}
                            </button>
                          ) : null}
                          {next ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updatePortfolioBenefit(
                                  b.id,
                                  { status: next },
                                  user?.id,
                                )
                              }
                            >
                              {benefitStatusLabel(next)}
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      ) : null}

      {tab === "governance" ? (
        <GovernancePanel
          t={t}
          actionLabel={actionLabel}
          users={users}
          actions={actions}
          audit={audit}
          onAction={runAction}
        />
      ) : null}

      {tab === "history" ? (
        <Card className="p-4">
          <h3 className="text-sm font-extrabold">{t("portfolioDetail.k169")}</h3>
          {audit.length === 0 ? (
            <p className="mt-3 text-sm text-steel-400">{t("portfolioDetail.k170")}</p>
          ) : (
            <ol className="relative mt-4 space-y-4 border-s border-steel-200 ps-4 dark:border-steel-700">
              {[...audit]
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((a) => (
                  <li key={a.id} className="relative">
                    <span
                      aria-hidden
                      className="absolute top-1.5 h-2 w-2 rounded-full bg-brand-500"
                      style={{ insetInlineStart: "calc(-1rem - 4px)" }}
                    />
                    <p className="text-sm font-semibold text-steel-800 dark:text-steel-100">
                      {actionLabel(a.action as PortfolioWorkflowAction) ??
                        (a.action === "created"
                          ? t("portfolioDetail.k070") : a.action === "updated"
                            ? t("portfolioDetail.k071") : a.action)}
                      {a.fromStatus && a.toStatus
                        ? ` · ${labelOf(t, "portfolio.status", a.fromStatus) ?? a.fromStatus} ← ${labelOf(t, "portfolio.status", a.toStatus) ?? a.toStatus}`
                        : ""}
                    </p>
                    <p className="mt-0.5 text-[11px] text-steel-400">
                      {users.find((u) => u.id === a.actorUserId)?.name ?? t("portfolioDetail.k072")}
                      <span className="mx-1.5 text-steel-300">·</span>
                      <span className="tabular-nums">{formatStamp(a.createdAt)}</span>
                    </p>
                    {a.comment ? (
                      <p className="mt-1 text-xs text-steel-500">{a.comment}</p>
                    ) : null}
                  </li>
                ))}
            </ol>
          )}
        </Card>
      ) : null}

      <Modal
        open={reasonOpen}
        onClose={() => setReasonOpen(false)}
        title={t("portfolioDetail.k073")}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReasonOpen(false)}>
              {t("portfolioDetail.ui.cancel")}
            </Button>
            <Button onClick={confirmReason}>{t("portfolioDetail.k171")}</Button>
          </div>
        }
      >
        <Field label={t("portfolioDetail.k074")} required>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </Modal>

      <Modal
        open={riskModalOpen}
        onClose={() => {
          setRiskModalOpen(false);
          setRiskForm(emptyRiskForm);
        }}
        title={t("portfolioDetail.k075")}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRiskModalOpen(false);
                setRiskForm(emptyRiskForm);
              }}
            >
              {t("portfolioDetail.ui.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (!riskForm.title.trim()) return;
                addPortfolioRisk({
                  organizationId: portfolio.organizationId,
                  portfolioId: portfolio.id,
                  title: riskForm.title.trim(),
                  severity: riskForm.severity as
                    | "low"
                    | "medium"
                    | "high"
                    | "critical",
                  status: riskForm.status as "open" | "mitigating" | "closed",
                  ownerUserId: riskForm.ownerUserId || user?.id,
                  mitigation: riskForm.mitigation.trim() || undefined,
                });
                setRiskForm(emptyRiskForm);
                setRiskModalOpen(false);
              }}
            >
              {t("portfolioDetail.ui.saveRisk")}
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("portfolioDetail.k076")} required>
            <Input
              value={riskForm.title}
              onChange={(e) =>
                setRiskForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder={t("portfolioDetail.k077")}
            />
          </Field>
          <Field label={t("portfolioDetail.k065")}>
            <SearchableSelect
              value={riskForm.severity}
              onChange={(v) => setRiskForm((f) => ({ ...f, severity: v }))}
              options={(["low", "medium", "high", "critical"] as const).map(
                (value) => ({ value, label: riskSeverityLabel(value) }),
              )}
            />
          </Field>
          <Field label={t("portfolioDetail.k067")}>
            <SearchableSelect
              value={riskForm.status}
              onChange={(v) => setRiskForm((f) => ({ ...f, status: v }))}
              options={RISK_STATUS_FLOW.map((value) => ({
                value,
                label: riskStatusLabel(value),
              }))}
            />
          </Field>
          <Field label={t("portfolioDetail.k040")}>
            <SearchableSelect
              value={riskForm.ownerUserId}
              onChange={(v) =>
                setRiskForm((f) => ({ ...f, ownerUserId: v }))
              }
              options={[
                { value: "", label: t("portfolioDetail.k078") },
                ...users.map((u) => ({ value: u.id, label: u.name })),
              ]}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("portfolioDetail.k079")}>
              <Input
                value={riskForm.mitigation}
                onChange={(e) =>
                  setRiskForm((f) => ({
                    ...f,
                    mitigation: e.target.value,
                  }))
                }
                placeholder={t("portfolioDetail.k080")}
              />
            </Field>
          </div>
        </div>
      </Modal>

      <Modal
        open={benefitModalOpen}
        onClose={() => {
          setBenefitModalOpen(false);
          setBenefitForm(emptyBenefitForm);
        }}
        title={t("portfolioDetail.k081")}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setBenefitModalOpen(false);
                setBenefitForm(emptyBenefitForm);
              }}
            >
              {t("portfolioDetail.ui.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (!benefitForm.title.trim()) return;
                addPortfolioBenefit({
                  organizationId: portfolio.organizationId,
                  portfolioId: portfolio.id,
                  title: benefitForm.title.trim(),
                  status: benefitForm.status as
                    | "planned"
                    | "in_progress"
                    | "realized"
                    | "deferred",
                  targetMetric: benefitForm.targetMetric.trim() || undefined,
                  actorUserId: user?.id,
                });
                setBenefitForm(emptyBenefitForm);
                setBenefitModalOpen(false);
              }}
            >
              {t("portfolioDetail.ui.saveBenefit")}
            </Button>
          </div>
        }
      >
        <div className="grid gap-3">
          <Field label={t("portfolioDetail.k082")} required>
            <Input
              value={benefitForm.title}
              onChange={(e) =>
                setBenefitForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder={t("portfolioDetail.k083")}
            />
          </Field>
          <Field label={t("portfolioDetail.k067")}>
            <SearchableSelect
              value={benefitForm.status}
              onChange={(v) => setBenefitForm((f) => ({ ...f, status: v }))}
              options={(
                [...BENEFIT_STATUS_FLOW, "deferred"] as BenefitStatusAll[]
              ).map((value) => ({
                value,
                label: benefitStatusLabel(value),
              }))}
            />
          </Field>
          <Field label={t("portfolioDetail.k084")}>
            <Input
              value={benefitForm.targetMetric}
              onChange={(e) =>
                setBenefitForm((f) => ({
                  ...f,
                  targetMetric: e.target.value,
                }))
              }
              placeholder={t("portfolioDetail.k085")}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={riskLogOpen}
        onClose={() => setRiskLogOpen(false)}
        title={t("portfolioDetail.k086")}
        size="lg"
        footer={
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setRiskLogOpen(false)}>
              {t("portfolioDetail.k039")}
            </Button>
          </div>
        }
      >
        <ChangeTimeline
          t={t}
          rows={riskTimeline(t, risks)}
          actorName={(id) => users.find((u) => u.id === id)?.name ?? "—"}
        />
      </Modal>

      <Modal
        open={benefitLogOpen}
        onClose={() => setBenefitLogOpen(false)}
        title={t("portfolioDetail.k087")}
        size="lg"
        footer={
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setBenefitLogOpen(false)}>
              {t("portfolioDetail.k039")}
            </Button>
          </div>
        }
      >
        <ChangeTimeline
          t={t}
          rows={benefitTimeline(t, benefits)}
          actorName={(id) => users.find((u) => u.id === id)?.name ?? "—"}
        />
      </Modal>

      <AddRelationshipModal
        open={relOpen}
        onClose={() => setRelOpen(false)}
        entities={entities}
        presetSource={{ type: "portfolio", id: portfolio.id }}
      />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-steel-400">{label}</p>
      <p className="text-sm font-semibold text-steel-800 dark:text-steel-100">{value}</p>
    </div>
  );
}

const FORWARD_ACTIONS: PortfolioWorkflowAction[] = [
  "submit",
  "resubmit",
  "start_review",
  "recommend_approve",
  "approve",
  "activate",
  "resume",
];

function GovernancePanel({ t, actionLabel, 
  users,
  actions,
  audit,
  onAction,
}: {
  users: { id: string; name: string }[];
  t: TFn;
  actionLabel: (a: PortfolioWorkflowAction | string) => string;
  actions: PortfolioWorkflowAction[];
  audit: PortfolioAuditEvent[];
  onAction: (action: PortfolioWorkflowAction) => void;
}) {
  const nameOf = (id?: string) => users.find((u) => u.id === id)?.name ?? "—";
  const primary = FORWARD_ACTIONS.find((a) => actions.includes(a));
  const rest = actions.filter((a) => a !== primary && a !== "reject");
  const steps = [...audit]
    .filter((a) => a.action !== "updated")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <div className="space-y-3">
      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-extrabold">{t("portfolioDetail.k175")}</h3>
        {actions.length === 0 ? (
          <p className="text-xs text-steel-400">{t("portfolioDetail.k176")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {primary ? (
              <Button onClick={() => onAction(primary)}>{actionLabel(primary)}</Button>
            ) : null}
            {rest.map((a) => (
              <Button key={a} variant="outline" onClick={() => onAction(a)}>
                {actionLabel(a)}
              </Button>
            ))}
            {actions.includes("reject") ? (
              <Button variant="danger" onClick={() => onAction("reject")}>
                {actionLabel("reject")}
              </Button>
            ) : null}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-extrabold">{t("portfolioDetail.k177")}</h3>
        {steps.length === 0 ? (
          <p className="mt-3 text-xs text-steel-400">{t("portfolioDetail.k178")}</p>
        ) : (
          <ol className="relative mt-4 space-y-4 border-s border-steel-200 ps-4">
            {steps.map((event) => (
              <li key={event.id} className="relative">
                <span
                  aria-hidden
                  className="absolute top-1.5 h-2 w-2 rounded-full bg-brand-500"
                  style={{ insetInlineStart: "calc(-1rem - 4px)" }}
                />
                <p className="text-sm font-semibold text-steel-800">
                  {actionLabel(event.action as PortfolioWorkflowAction) ??
                    (event.action === "created" ? t("portfolioDetail.k070") : event.action)}
                </p>
                <p className="mt-0.5 text-[11px] text-steel-400">
                  {nameOf(event.actorUserId)}
                  <span className="mx-1.5 text-steel-300">·</span>
                  <span className="tabular-nums">{formatStamp(event.createdAt)}</span>
                </p>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
