import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  ChevronDown,
  FolderKanban,
  GitBranch,
  Layers,
  MapPin,
  PieChart,
  Search,
  Target,
} from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useAuth } from "../store/AuthContext";
import { useData } from "../store/DataStore";
import { useHierarchy } from "../store/HierarchyStore";
import { useOrgModules } from "../hooks/useOrgModules";
import {
  initiativesForPortfolio,
  programsForInitiative,
  programsForPortfolio,
  projectsForProgram,
} from "../lib/hierarchyLinks";
import { getProjectPlacement } from "../lib/orgModules";
import { cn } from "../lib/cn";
import { useLocale } from "../store/LocaleContext";
import type { Initiative, Project } from "../models/domain";

type FilterType = "all" | "org" | "chain" | "flexible" | "standalone";

function portfolioOnlyProjects(projects: Project[], portfolioId: string) {
  return projects.filter(
    (p) => p.portfolioId === portfolioId && !p.programId,
  );
}

function orphanStandaloneProjects(
  projects: Project[],
  initiatives: Initiative[],
) {
  const linkedToIni = new Set(
    initiatives.flatMap((i) => i.standaloneProjectIds),
  );
  return projects.filter((p) => {
    if (getProjectPlacement(p) !== "fully_independent") return false;
    if (linkedToIni.has(p.id)) return false;
    return true;
  });
}

export function StructureMapPage() {
  const { t } = useLocale();
  const { organization } = useAuth();
  const { branches, departments } = useData();
  const { portfolios, programs, initiatives, projects } = useHierarchy();
  const { modules, clientMeta } = useOrgModules();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [open, setOpen] = useState<Record<string, boolean>>({
    org: true,
    "org:structure": true,
    "org:strategy": true,
  });

  const term = q.trim().toLowerCase();
  const matches = (name: string) =>
    !term || name.toLowerCase().includes(term);

  const isOpen = (key: string, defaultOpen = true) =>
    open[key] === undefined ? defaultOpen : open[key];

  const toggle = (key: string, defaultOpen = true) =>
    setOpen((prev) => {
      const current = prev[key] === undefined ? defaultOpen : prev[key];
      return { ...prev, [key]: !current };
    });

  const standaloneInitiatives = useMemo(
    () => initiatives.filter((i) => !i.portfolioId),
    [initiatives],
  );

  const orphanProjects = useMemo(
    () => orphanStandaloneProjects(projects, initiatives).filter((p) => matches(p.name)),
    [projects, initiatives, term],
  );

  const visiblePortfolios = useMemo(
    () =>
      portfolios.filter((pf) => {
        if (matches(pf.name)) return true;
        const prgs = programsForPortfolio(programs, pf.id);
        const solo = portfolioOnlyProjects(projects, pf.id);
        const inis = initiativesForPortfolio(initiatives, pf.id);
        return (
          prgs.some((x) => matches(x.name)) ||
          solo.some((x) => matches(x.name)) ||
          inis.some((x) => matches(x.name)) ||
          prgs.some((prg) =>
            projectsForProgram(projects, prg.id).some((p) => matches(p.name)),
          )
        );
      }),
    [portfolios, programs, projects, initiatives, term],
  );

  const showOrg = filter === "all" || filter === "org";
  const showChain = filter === "all" || filter === "chain";
  const showFlexible = filter === "all" || filter === "flexible";
  const showStandalone = filter === "all" || filter === "standalone";

  const sharedDepartments = useMemo(
    () => departments.filter((d) => !d.branchId),
    [departments],
  );

  const filters: { id: FilterType; label: string }[] = [
    { id: "all", label: t("explorer.filter.all") },
    { id: "org", label: t("explorer.filter.org") },
    { id: "chain", label: t("explorer.filter.chain") },
    { id: "flexible", label: t("explorer.filter.flexible") },
    { id: "standalone", label: t("explorer.filter.standalone") },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("explorer.title")}
        subtitle={t("explorer.subtitle", {
          org: organization?.name ?? "",
          client: clientMeta.label,
        })}
        icon={<GitBranch className="h-6 w-6" />}
      />

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
          <Input
            className="ps-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("explorer.searchPlaceholder")}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors",
                filter === f.id
                  ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                  : "border-steel-200 text-steel-500 hover:bg-steel-50 dark:border-steel-700 dark:hover:bg-steel-800",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      <p className="text-xs text-steel-500">{t("explorer.legendNote")}</p>

      <Card className="overflow-hidden border border-steel-200 p-0 dark:border-steel-700">
        <TreeNode
          open={isOpen("org")}
          onToggle={() => toggle("org")}
          tone="org"
          icon={Building2}
          label={t("explorer.node.organization")}
          title={organization?.name ?? t("explorer.node.organizationFallback")}
          meta={t("explorer.meta.org", {
            client: clientMeta.shortLabel,
            branches: branches.length,
            depts: departments.length,
          })}
          hasChildren
          root
        >
          {/* Organizational structure: branches → departments → projects */}
          {showOrg ? (
            <TreeNode
              open={isOpen("org:structure")}
              onToggle={() => toggle("org:structure")}
              tone="org"
              icon={MapPin}
              label={t("explorer.node.structureLabel")}
              title={t("explorer.node.structureTitle")}
              meta={t("explorer.meta.structure", {
                branches: branches.length,
                depts: departments.length,
              })}
              hasChildren={branches.length > 0 || sharedDepartments.length > 0}
            >
              {branches
                .filter(
                  (b) =>
                    matches(b.name) ||
                    departments.some(
                      (d) =>
                        d.branchId === b.id && matches(d.name),
                    ) ||
                    projects.some(
                      (p) => p.branchId === b.id && matches(p.name),
                    ),
                )
                .map((branch) => {
                  const branchDepts = departments.filter(
                    (d) => d.branchId === branch.id,
                  );
                  const branchProjects = projects.filter(
                    (p) => p.branchId === branch.id,
                  );
                  const deptIdsWithProjects = new Set(
                    branchProjects.map((p) => p.departmentId),
                  );
                  const extraDepts = departments.filter(
                    (d) =>
                      !d.branchId &&
                      deptIdsWithProjects.has(d.id) &&
                      !branchDepts.some((x) => x.id === d.id),
                  );
                  const allDepts = [...branchDepts, ...extraDepts];
                  const bKey = `br:${branch.id}`;
                  return (
                    <TreeNode
                      key={branch.id}
                      open={isOpen(bKey, false)}
                      onToggle={() => toggle(bKey, false)}
                      tone="branch"
                      icon={MapPin}
                      label={t("explorer.label.branch")}
                      title={
                        <Link to="/lookups" className="hover:underline">
                          {branch.name}
                        </Link>
                      }
                      meta={t("explorer.meta.branch", {
                        depts: allDepts.length,
                        projects: branchProjects.length,
                      })}
                      hasChildren={
                        allDepts.length > 0 || branchProjects.length > 0
                      }
                    >
                      {allDepts.map((dept) => {
                        const deptProjects = branchProjects.filter(
                          (p) => p.departmentId === dept.id,
                        );
                        const dKey = `${bKey}:dept:${dept.id}`;
                        return (
                          <TreeNode
                            key={dept.id}
                            open={isOpen(dKey, false)}
                            onToggle={() => toggle(dKey, false)}
                            tone="department"
                            icon={Building2}
                            label={t("explorer.label.department")}
                            title={
                              <Link to="/lookups" className="hover:underline">
                                {dept.name}
                              </Link>
                            }
                            badge={!dept.branchId ? t("explorer.badge.shared") : undefined}
                            meta={t("explorer.meta.deptProjects", { n: deptProjects.length })}
                            hasChildren={deptProjects.length > 0}
                          >
                            {deptProjects.map((p, idx) => (
                              <TreeLeaf
                                key={p.id}
                                to={`/projects/${p.id}`}
                                letter={String.fromCharCode(65 + (idx % 26))}
                                name={p.name}
                              />
                            ))}
                          </TreeNode>
                        );
                      })}
                      {branchProjects.filter(
                        (p) => !allDepts.some((d) => d.id === p.departmentId),
                      ).length > 0 ? (
                        <FlexibleGroup label={t("explorer.group.noDeptInBranch")}>
                          {branchProjects
                            .filter(
                              (p) =>
                                !allDepts.some((d) => d.id === p.departmentId),
                            )
                            .map((p) => (
                              <TreeLeaf
                                key={p.id}
                                to={`/projects/${p.id}`}
                                name={p.name}
                              />
                            ))}
                        </FlexibleGroup>
                      ) : null}
                    </TreeNode>
                  );
                })}

              {sharedDepartments.length > 0 ? (
                <FlexibleGroup label={t("explorer.group.sharedDepts")}>
                  {sharedDepartments.map((dept) => {
                    const kids = projects.filter(
                      (p) => p.departmentId === dept.id,
                    );
                    const dKey = `shared-dept:${dept.id}`;
                    return (
                      <TreeNode
                        key={dept.id}
                        open={isOpen(dKey, false)}
                        onToggle={() => toggle(dKey, false)}
                        tone="department"
                        icon={Building2}
                        label={t("explorer.label.department")}
                        title={dept.name}
                        badge={t("explorer.badge.shared")}
                        meta={t("explorer.meta.deptProjects", { n: kids.length })}
                        hasChildren={kids.length > 0}
                      >
                        {kids.map((p) => (
                          <TreeLeaf
                            key={p.id}
                            to={`/projects/${p.id}`}
                            name={p.name}
                          />
                        ))}
                      </TreeNode>
                    );
                  })}
                </FlexibleGroup>
              ) : null}
            </TreeNode>
          ) : null}

          {/* Strategic chain */}
          {(showChain || showFlexible || showStandalone) &&
          (modules.portfolio || modules.initiative) ? (
            <TreeNode
              open={isOpen("org:strategy")}
              onToggle={() => toggle("org:strategy")}
              tone="portfolio"
              icon={PieChart}
              label={t("explorer.label.sequence")}
              title={t("explorer.node.strategyTitle")}
              meta={t("explorer.meta.strategy", {
                portfolios: portfolios.length,
                programs: programs.length,
                initiatives: initiatives.length,
                projects: projects.length,
              })}
              hasChildren
            >
          {modules.portfolio && showChain
            ? visiblePortfolios.map((pf) => {
                const prgs = programsForPortfolio(programs, pf.id);
                const chainInis = initiativesForPortfolio(initiatives, pf.id);
                const linkedProgramIds = new Set(
                  chainInis.flatMap((ini) =>
                    programsForInitiative(programs, ini.id).map((p) => p.id),
                  ),
                );
                const freePrograms = prgs.filter(
                  (p) => !linkedProgramIds.has(p.id),
                );
                const directIniIds = new Set(
                  chainInis.flatMap((i) => i.standaloneProjectIds),
                );
                const solo = portfolioOnlyProjects(projects, pf.id).filter(
                  (p) => !directIniIds.has(p.id),
                );
                const allProjects =
                  prgs.reduce(
                    (n, prg) => n + projectsForProgram(projects, prg.id).length,
                    0,
                  ) + solo.length;
                const pfKey = `pf:${pf.id}`;

                if (
                  term &&
                  !matches(pf.name) &&
                  !chainInis.some((i) => matches(i.name)) &&
                  !prgs.some((p) => matches(p.name)) &&
                  !solo.some((p) => matches(p.name)) &&
                  !prgs.some((prg) =>
                    projectsForProgram(projects, prg.id).some((p) =>
                      matches(p.name),
                    ),
                  )
                ) {
                  return null;
                }

                return (
                  <TreeNode
                    key={pf.id}
                    open={isOpen(pfKey)}
                    onToggle={() => toggle(pfKey)}
                    tone="portfolio"
                    icon={PieChart}
                    label={t("explorer.label.portfolio")}
                    title={
                      <Link to="/portfolios" className="hover:underline">
                        {pf.name}
                      </Link>
                    }
                    meta={t("explorer.meta.portfolio", {
                      initiatives: chainInis.length,
                      programs: prgs.length,
                      projects: allProjects,
                    })}
                    hasChildren={
                      chainInis.length > 0 ||
                      (showFlexible &&
                        (freePrograms.length > 0 || solo.length > 0))
                    }
                  >
                    {/* Reference chain: Portfolio → Initiative → Program → Projects */}
                    {chainInis.map((ini) => {
                      const childPrograms = programsForInitiative(
                        programs,
                        ini.id,
                      );
                      const iniKey = `${pfKey}:ini:${ini.id}`;
                      const prgProjects = childPrograms.flatMap((prg) =>
                        projectsForProgram(projects, prg.id),
                      );
                      const directProjects = projects.filter((p) =>
                        ini.standaloneProjectIds.includes(p.id),
                      );
                      return (
                        <TreeNode
                          key={ini.id}
                          open={isOpen(iniKey)}
                          onToggle={() => toggle(iniKey)}
                          tone="initiative"
                          icon={Target}
                          label={t("explorer.label.initiative")}
                          title={
                            <Link to="/initiatives" className="hover:underline">
                              {ini.name}
                            </Link>
                          }
                          meta={t("explorer.meta.initiative", {
                            programs: childPrograms.length,
                            projects: prgProjects.length + directProjects.length,
                          })}
                          hasChildren={
                            childPrograms.length > 0 || directProjects.length > 0
                          }
                        >
                          {childPrograms.map((prg) => {
                            const kids = projectsForProgram(projects, prg.id);
                            return (
                              <TreeNode
                                key={prg.id}
                                open={isOpen(`${iniKey}:prg:${prg.id}`)}
                                onToggle={() =>
                                  toggle(`${iniKey}:prg:${prg.id}`)
                                }
                                tone="program"
                                icon={Layers}
                                label={t("explorer.label.program")}
                                title={
                                  <Link
                                    to="/programs"
                                    className="hover:underline"
                                  >
                                    {prg.name}
                                  </Link>
                                }
                                meta={t("explorer.meta.program", { n: kids.length })}
                                hasChildren={kids.length > 0}
                              >
                                {kids.map((p, idx) => (
                                  <TreeLeaf
                                    key={p.id}
                                    to={`/projects/${p.id}`}
                                    letter={String.fromCharCode(65 + (idx % 26))}
                                    name={p.name}
                                  />
                                ))}
                              </TreeNode>
                            );
                          })}
                          {directProjects.length > 0 ? (
                            <FlexibleGroup label={t("explorer.group.directToInitiative")}>
                              {directProjects.map((p) => (
                                <TreeLeaf
                                  key={p.id}
                                  to={`/projects/${p.id}`}
                                  name={p.name}
                                  badge={t("explorer.badge.flexLink")}
                                />
                              ))}
                            </FlexibleGroup>
                          ) : null}
                        </TreeNode>
                      );
                    })}

                    {/* Flexible: programs in portfolio without an initiative */}
                    {showFlexible && freePrograms.length > 0 ? (
                      <FlexibleGroup label={t("explorer.group.programsNoInitiative")}>
                        {freePrograms.map((prg) => {
                          const kids = projectsForProgram(projects, prg.id);
                          const pKey = `${pfKey}:free:${prg.id}`;
                          return (
                            <TreeNode
                              key={prg.id}
                              open={isOpen(pKey, false)}
                              onToggle={() => toggle(pKey, false)}
                              tone="program"
                              icon={Layers}
                              label={t("explorer.label.program")}
                              title={
                                <Link
                                  to="/programs"
                                  className="hover:underline"
                                >
                                  {prg.name}
                                </Link>
                              }
                              badge={t("explorer.badge.noInitiative")}
                              meta={t("explorer.meta.program", { n: kids.length })}
                              hasChildren={kids.length > 0}
                            >
                              {kids.map((p, idx) => (
                                <TreeLeaf
                                  key={p.id}
                                  to={`/projects/${p.id}`}
                                  letter={String.fromCharCode(65 + (idx % 26))}
                                  name={p.name}
                                />
                              ))}
                            </TreeNode>
                          );
                        })}
                      </FlexibleGroup>
                    ) : null}

                    {/* Flexible: portfolio-only projects */}
                    {showFlexible && solo.length > 0 ? (
                      <FlexibleGroup label={t("explorer.group.standaloneUnderPortfolio")}>
                        {solo.map((p) => (
                          <TreeLeaf
                            key={p.id}
                            to={`/projects/${p.id}`}
                            name={p.name}
                            badge={t("explorer.badge.standaloneProjects")}
                          />
                        ))}
                      </FlexibleGroup>
                    ) : null}
                  </TreeNode>
                );
              })
            : null}

          {/* Flexible: standalone initiatives (no program) */}
          {modules.initiative &&
          showFlexible &&
          standaloneInitiatives.some(
            (i) =>
              matches(i.name) ||
              i.standaloneProjectIds.some((id) => {
                const p = projects.find((x) => x.id === id);
                return p ? matches(p.name) : false;
              }),
          ) ? (
            <FlexibleGroup label={t("explorer.group.initiativesNoPortfolio")}>
              {standaloneInitiatives
                .filter(
                  (i) =>
                    matches(i.name) ||
                    i.standaloneProjectIds.some((id) => {
                      const p = projects.find((x) => x.id === id);
                      return p ? matches(p.name) : false;
                    }),
                )
                .map((ini) => {
                  const kids = projects.filter((p) =>
                    ini.standaloneProjectIds.includes(p.id),
                  );
                  const key = `st-ini:${ini.id}`;
                  return (
                    <TreeNode
                      key={ini.id}
                      open={isOpen(key, false)}
                      onToggle={() => toggle(key, false)}
                      tone="initiative"
                      icon={Target}
                      label={t("explorer.label.initiative")}
                      title={
                        <Link to="/initiatives" className="hover:underline">
                          {ini.name}
                        </Link>
                      }
                      badge={t("explorer.badge.standaloneInitiative")}
                      meta={t("explorer.meta.deptProjects", { n: kids.length })}
                      hasChildren={kids.length > 0}
                    >
                      {kids.map((p) => (
                        <TreeLeaf
                          key={p.id}
                          to={`/projects/${p.id}`}
                          name={p.name}
                          badge={t("explorer.badge.flexLink")}
                        />
                      ))}
                    </TreeNode>
                  );
                })}
            </FlexibleGroup>
          ) : null}

          {/* Fully independent projects */}
          {showStandalone && orphanProjects.length > 0 ? (
            <FlexibleGroup label={t("explorer.group.fullyIndependent")}>
              {orphanProjects.map((p) => (
                <TreeLeaf
                  key={p.id}
                  to={`/projects/${p.id}`}
                  name={p.name}
                  badge={t("explorer.badge.independent")}
                />
              ))}
            </FlexibleGroup>
          ) : null}

          {modules.portfolio &&
          visiblePortfolios.length === 0 &&
          orphanProjects.length === 0 &&
          standaloneInitiatives.length === 0 ? (
            <p className="px-3 py-4 text-xs text-steel-400">
              {t("explorer.empty.filtered")}
            </p>
          ) : null}
            </TreeNode>
          ) : null}
        </TreeNode>
      </Card>

      <div className="flex flex-wrap gap-3 text-[10px] text-steel-500">
        <LegendSwatch tone="org" label={t("explorer.legend.organization")} />
        <LegendSwatch tone="branch" label={t("explorer.legend.branch")} />
        <LegendSwatch tone="department" label={t("explorer.legend.department")} />
        <LegendSwatch tone="portfolio" label={t("explorer.legend.portfolio")} />
        <LegendSwatch tone="initiative" label={t("explorer.legend.initiative")} />
        <LegendSwatch tone="program" label={t("explorer.legend.program")} />
        <LegendSwatch tone="project" label={t("explorer.legend.project")} />
      </div>
    </div>
  );
}

/* ——— tones (color cues like the reference) ——— */

type Tone =
  | "org"
  | "branch"
  | "department"
  | "portfolio"
  | "initiative"
  | "program"
  | "project";

const toneIcon: Record<Tone, string> = {
  org: "bg-steel-700 text-white dark:bg-steel-200 dark:text-steel-900",
  branch: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  department: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  portfolio: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  initiative: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  program: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  project: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

function LegendSwatch({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-sm", toneIcon[tone])} />
      {label}
    </span>
  );
}

function FlexibleGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="ms-1 mt-1 space-y-0.5 rounded-lg border border-dashed border-amber-300/60 bg-amber-500/[0.03] p-1.5 dark:border-amber-700/50">
      <p className="px-1 text-[10px] font-bold text-amber-700/80 dark:text-amber-300/80">
        {label}
      </p>
      {children}
    </div>
  );
}

function TreeNode({
  open,
  onToggle,
  tone,
  icon: Icon,
  label,
  title,
  meta,
  badge,
  hasChildren,
  children,
  root,
}: {
  open: boolean;
  onToggle: () => void;
  tone: Tone;
  icon: typeof Building2;
  label: string;
  title: ReactNode;
  meta?: string;
  badge?: string;
  hasChildren: boolean;
  children?: ReactNode;
  root?: boolean;
}) {
  return (
    <div className={cn(root && "p-2")}>
      <div className="flex items-start gap-1.5 rounded-lg px-1.5 py-1.5 hover:bg-steel-50 dark:hover:bg-steel-800/40">
        {hasChildren ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-steel-400 hover:bg-steel-100 dark:hover:bg-steel-800"
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-150",
                open ? "rotate-0" : "ltr:-rotate-90 rtl:rotate-90",
              )}
            />
          </button>
        ) : (
          <span className="mt-0.5 inline-block h-5 w-5 shrink-0" />
        )}
        <span
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
            toneIcon[tone],
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-steel-400">
              {label}:
            </span>
            <span className="text-xs font-extrabold text-steel-800 dark:text-steel-100">
              {title}
            </span>
            {badge ? (
              <span className="rounded border border-dashed border-amber-400/70 px-1 py-px text-[9px] font-bold text-amber-700 dark:text-amber-300">
                {badge}
              </span>
            ) : null}
          </div>
          {meta ? (
            <p className="text-[10px] text-steel-400">{meta}</p>
          ) : null}
        </div>
      </div>
      {hasChildren && open ? (
        <div className="ms-4 space-y-0.5 border-s border-steel-200 ps-2 dark:border-steel-700">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function TreeLeaf({
  to,
  name,
  letter,
  badge,
}: {
  to: string;
  name: string;
  letter?: string;
  badge?: string;
}) {
  const { t } = useLocale();
  return (
    <Link
      to={to}
      className="flex items-center gap-1.5 rounded-lg px-1.5 py-1.5 hover:bg-brand-500/5"
    >
      <span className="inline-block h-5 w-5 shrink-0" />
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
          toneIcon.project,
        )}
      >
        <FolderKanban className="h-3.5 w-3.5" />
      </span>
      <span className="text-[10px] font-bold text-steel-400">
        {t("explorer.leaf.project")}
        {letter ? ` ${letter}` : ""}:
      </span>
      <span className="min-w-0 truncate text-xs font-bold text-brand-700 dark:text-brand-300">
        {name}
      </span>
      {badge ? (
        <span className="ms-auto shrink-0 rounded border border-dashed border-amber-400/70 px-1 py-px text-[9px] font-bold text-amber-700 dark:text-amber-300">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
