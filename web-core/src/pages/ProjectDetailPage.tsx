import { type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/common/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ProjectContextualNav } from "../components/nav/ProjectContextualNav";
import { ProjectLifecycleStepper } from "../components/project/ProjectLifecycleStepper";
import { ProjectWorkPanel } from "../components/project/ProjectWorkPanel";
import { ProjectTeamPanel } from "../components/project/ProjectTeamPanel";
import { ProjectExpensesPanel } from "../components/project/ProjectExpensesPanel";
import { ProjectMaterialsPanel } from "../components/project/ProjectMaterialsPanel";
import { ProjectDocumentsPanel } from "../components/project/ProjectDocumentsPanel";
import { ProjectActivityPanel } from "../components/project/ProjectActivityPanel";
import { useHierarchy } from "../store/HierarchyStore";
import { useAuth } from "../store/AuthContext";
import { useCan } from "../store/RbacContext";
import { useConfirm } from "../store/ConfirmContext";
import { useLocale } from "../store/LocaleContext";
import { priorityLabel, projectStatusLabel } from "../i18n/label";
import { projectRelationships } from "../lib/hierarchyLinks";
import { cn } from "../lib/cn";

const PROJECT_STATUS_BADGE: Record<string, string> = {
  draft:
    "border-steel-200 bg-steel-50 text-steel-600 dark:border-steel-700 dark:bg-steel-800/50 dark:text-steel-300",
  planned:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300",
  active:
    "border-brand-200 bg-brand-500/10 text-brand-700 dark:border-brand-800 dark:text-brand-300",
  on_hold:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  completed:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  cancelled:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
};

export function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLocale();
  const {
    projects,
    portfolios,
    programs,
    initiatives,
    removeProject,
  } = useHierarchy();
  const { user, users } = useAuth();
  const can = useCan();
  const confirm = useConfirm();

  const formatSar = (amount: number) =>
    `${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${t("common.currencySar")}`;

  const project = projects.find((p) => p.id === id);
  const hash = (location.hash || "#overview").replace("#", "");
  const showOverview = hash === "overview" || !hash;
  const showStages = hash === "stages" || hash === "work";
  const showTeam = hash === "team";
  const showExpenses = hash === "expenses";
  const showMaterials = hash === "materials";
  const showDocuments = hash === "documents";
  const showActivity = hash === "activity";

  if (!project) {
    return (
      <Card className="p-6">
        <p className="text-sm text-steel-500">{t("projectDetail.notFound")}</p>
        <Button className="mt-3" onClick={() => navigate("/projects")}>
          {t("projectDetail.backToList")}
        </Button>
      </Card>
    );
  }

  const { portfolio, program, linkedInitiatives } = projectRelationships(
    project,
    portfolios,
    programs,
    initiatives,
  );
  const manager =
    users.find((u) => u.id === project.managerUserId)?.name ?? "—";
  const remaining = (project.budgetSar || 0) - (project.spentSar || 0);
  const spendPct =
    project.budgetSar > 0
      ? Math.min(100, Math.round((project.spentSar / project.budgetSar) * 100))
      : 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title={project.name}
        subtitle={t("projectDetail.subtitle", {
          code: project.code,
          status: projectStatusLabel(t, project.status),
          progress: project.progress,
        })}
        actions={
          can.manageRecords(user?.role) ? (
            <Button
              variant="outline"
              onClick={async () => {
                const ok = await confirm({
                  title: t("common.confirmDeleteTitle"),
                  message: t("projectDetail.deleteConfirm"),
                  danger: true,
                  confirmLabel: t("common.delete"),
                });
                if (!ok) return;
                removeProject(project.id);
                navigate("/projects");
              }}
            >
              {t("common.delete")}
            </Button>
          ) : undefined
        }
      />

      <ProjectContextualNav
        project={project}
        portfolios={portfolios}
        programs={programs}
        initiatives={initiatives}
      />

      {showOverview ? (
        <div className="space-y-3">
          <Card className="space-y-3 p-4">
            <h3 className="text-sm font-extrabold">{t("projectDetail.lifecycle")}</h3>
            <ProjectLifecycleStepper status={project.status} />
          </Card>

          <Card className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex rounded border px-1.5 py-0.5 text-[11px] font-bold",
                  PROJECT_STATUS_BADGE[project.status] ??
                    PROJECT_STATUS_BADGE.draft,
                )}
              >
                {projectStatusLabel(t, project.status)}
              </span>
              <span className="inline-flex rounded border border-steel-200 bg-steel-50 px-1.5 py-0.5 text-[11px] font-bold text-steel-600 dark:border-steel-700 dark:bg-steel-800/60 dark:text-steel-300">
                {priorityLabel(t, project.priority)}
              </span>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-steel-400">
                <span>{t("common.progress")}</span>
                <span className="tabular-nums font-bold text-steel-600">
                  {project.progress}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-steel-100 dark:bg-steel-800">
                <div
                  className="h-1.5 rounded-full bg-brand-500"
                  style={{
                    width: `${Math.min(100, Math.max(0, project.progress))}%`,
                  }}
                />
              </div>
            </div>
            <p className="text-sm text-steel-600 dark:text-steel-300">
              {project.description?.trim()
                ? project.description
                : t("projectDetail.noDescription")}
            </p>
          </Card>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card className="space-y-3 p-4">
              <h3 className="text-sm font-extrabold">{t("projectDetail.links")}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Meta label={t("projectDetail.program")}>
                  {program ? (
                    <Link
                      to="/programs"
                      className="text-brand-700 hover:underline"
                    >
                      {program.name}
                    </Link>
                  ) : (
                    <span className="font-normal text-steel-400">
                      {t("projectDetail.standalone")}
                    </span>
                  )}
                </Meta>
                <Meta label={t("projectDetail.portfolio")}>
                  {portfolio ? (
                    <Link
                      to={`/portfolios/${portfolio.id}`}
                      className="text-brand-700 hover:underline"
                    >
                      {portfolio.name}
                    </Link>
                  ) : (
                    <span className="font-normal text-steel-400">—</span>
                  )}
                </Meta>
                <Meta label={t("projectDetail.initiative")}>
                  {linkedInitiatives[0] ? (
                    <Link
                      to={`/initiatives?id=${linkedInitiatives[0].id}`}
                      className="text-brand-700 hover:underline"
                    >
                      {linkedInitiatives[0].name}
                    </Link>
                  ) : (
                    <span className="font-normal text-steel-400">—</span>
                  )}
                </Meta>
                <Meta label={t("projectDetail.manager")}>{manager}</Meta>
                <Meta label={t("projectDetail.period")}>
                  <span className="tabular-nums font-normal">
                    {project.startDate} → {project.endDate}
                  </span>
                </Meta>
              </div>
            </Card>

            <Card className="space-y-3 p-4">
              <h3 className="text-sm font-extrabold">{t("projectDetail.finance")}</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <Meta label={t("common.budget")}>
                  <span className="tabular-nums text-[13px]">
                    {formatSar(project.budgetSar || 0)}
                  </span>
                </Meta>
                <Meta label={t("common.spent")}>
                  <span className="tabular-nums text-[13px]">
                    {formatSar(project.spentSar || 0)}
                  </span>
                </Meta>
                <Meta label={t("projectDetail.remaining")}>
                  <span
                    className={cn(
                      "tabular-nums text-[13px]",
                      remaining < 0 && "text-red-600",
                    )}
                  >
                    {formatSar(remaining)}
                  </span>
                </Meta>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-steel-400">
                  <span>{t("projectDetail.budgetBurn")}</span>
                  <span className="tabular-nums">{spendPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-steel-100 dark:bg-steel-800">
                  <div
                    className={cn(
                      "h-1.5 rounded-full",
                      spendPct >= 100 ? "bg-red-500" : "bg-brand-500",
                    )}
                    style={{ width: `${spendPct}%` }}
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {showStages ? <ProjectWorkPanel projectId={project.id} /> : null}
      {showTeam ? <ProjectTeamPanel project={project} /> : null}
      {showExpenses ? <ProjectExpensesPanel project={project} /> : null}
      {showMaterials ? <ProjectMaterialsPanel project={project} /> : null}
      {showDocuments ? <ProjectDocumentsPanel project={project} /> : null}
      {showActivity ? <ProjectActivityPanel project={project} /> : null}
    </div>
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-steel-400">{label}</p>
      <div className="mt-0.5 text-sm font-semibold text-steel-800 dark:text-steel-100">
        {children}
      </div>
    </div>
  );
}
