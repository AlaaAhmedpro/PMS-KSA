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
    { id: "all", label: "الكل" },
    { id: "org", label: "الفروع والإدارات" },
    { id: "chain", label: "التسلسل المتكامل" },
    { id: "flexible", label: "ارتباطات مرنة" },
    { id: "standalone", label: "مستقلة تماماً" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="مستكشف العمل"
        subtitle={`${organization?.name ?? ""} — ${clientMeta.label} · تسلسل مرن وليس شجرة إلزامية`}
        icon={<GitBranch className="h-6 w-6" />}
      />

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
          <Input
            className="ps-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث بالاسم عبر المحافظ والمبادرات والبرامج والمشاريع…"
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

      <p className="text-xs text-steel-500">
        المؤسسة ← فروع ← إدارات · وبالتوازي: محفظة ← مبادرة ← برنامج ← مشاريع.
        الكيانات غير المرتبطة تظهر في فروع مرنة أو كمشاريع مستقلة.
      </p>

      <Card className="overflow-hidden border border-steel-200 p-0 dark:border-steel-700">
        <TreeNode
          open={isOpen("org")}
          onToggle={() => toggle("org")}
          tone="org"
          icon={Building2}
          label="المؤسسة"
          title={organization?.name ?? "المؤسسة"}
          meta={`${clientMeta.shortLabel} · ${branches.length} فروع · ${departments.length} إدارات`}
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
              label="هيكل"
              title="الفروع والإدارات"
              meta={`${branches.length} فرع · ${departments.length} إدارة`}
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
                      label="فرع"
                      title={
                        <Link to="/lookups" className="hover:underline">
                          {branch.name}
                        </Link>
                      }
                      meta={`${allDepts.length} إدارة · ${branchProjects.length} مشروع`}
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
                            label="إدارة"
                            title={
                              <Link to="/lookups" className="hover:underline">
                                {dept.name}
                              </Link>
                            }
                            badge={!dept.branchId ? "مشتركة" : undefined}
                            meta={`${deptProjects.length} مشروع`}
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
                        <FlexibleGroup label="مشاريع بلا إدارة مطابقة في هذا الفرع">
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
                <FlexibleGroup label="إدارات مشتركة على مستوى المؤسسة">
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
                        label="إدارة"
                        title={dept.name}
                        badge="مشتركة"
                        meta={`${kids.length} مشروع`}
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
              label="تسلسل"
              title="التسلسل الاستراتيجي والتنفيذي"
              meta={`${portfolios.length} محفظة · ${programs.length} برنامج · ${initiatives.length} مبادرة · ${projects.length} مشروع`}
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
                    label="محفظة"
                    title={
                      <Link to="/portfolios" className="hover:underline">
                        {pf.name}
                      </Link>
                    }
                    meta={`${chainInis.length} مبادرة · ${prgs.length} برنامج · ${allProjects} مشروع`}
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
                          label="مبادرة"
                          title={
                            <Link to="/initiatives" className="hover:underline">
                              {ini.name}
                            </Link>
                          }
                          meta={`${childPrograms.length} برنامج · ${prgProjects.length + directProjects.length} مشروع`}
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
                                label="برنامج"
                                title={
                                  <Link
                                    to="/programs"
                                    className="hover:underline"
                                  >
                                    {prg.name}
                                  </Link>
                                }
                                meta={`${kids.length} مشروع`}
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
                            <FlexibleGroup label="مشاريع مرتبطة مباشرة بالمبادرة">
                              {directProjects.map((p) => (
                                <TreeLeaf
                                  key={p.id}
                                  to={`/projects/${p.id}`}
                                  name={p.name}
                                  badge="ارتباط مرن"
                                />
                              ))}
                            </FlexibleGroup>
                          ) : null}
                        </TreeNode>
                      );
                    })}

                    {/* Flexible: programs in portfolio without an initiative */}
                    {showFlexible && freePrograms.length > 0 ? (
                      <FlexibleGroup label="برامج بلا مبادرة (ارتباط مرن)">
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
                              label="برنامج"
                              title={
                                <Link
                                  to="/programs"
                                  className="hover:underline"
                                >
                                  {prg.name}
                                </Link>
                              }
                              badge="بلا مبادرة"
                              meta={`${kids.length} مشروع`}
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
                      <FlexibleGroup label="مشاريع مستقلة تحت المحفظة">
                        {solo.map((p) => (
                          <TreeLeaf
                            key={p.id}
                            to={`/projects/${p.id}`}
                            name={p.name}
                            badge="مشاريع مستقلة"
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
            <FlexibleGroup label="مبادرات بلا محفظة">
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
                      label="مبادرة"
                      title={
                        <Link to="/initiatives" className="hover:underline">
                          {ini.name}
                        </Link>
                      }
                      badge="مبادرة مستقلة"
                      meta={`${kids.length} مشروع`}
                      hasChildren={kids.length > 0}
                    >
                      {kids.map((p) => (
                        <TreeLeaf
                          key={p.id}
                          to={`/projects/${p.id}`}
                          name={p.name}
                          badge="ارتباط مرن"
                        />
                      ))}
                    </TreeNode>
                  );
                })}
            </FlexibleGroup>
          ) : null}

          {/* Fully independent projects */}
          {showStandalone && orphanProjects.length > 0 ? (
            <FlexibleGroup label="مشاريع مستقلة تماماً (بلا محفظة أو برنامج أو مبادرة)">
              {orphanProjects.map((p) => (
                <TreeLeaf
                  key={p.id}
                  to={`/projects/${p.id}`}
                  name={p.name}
                  badge="مستقل"
                />
              ))}
            </FlexibleGroup>
          ) : null}

          {modules.portfolio &&
          visiblePortfolios.length === 0 &&
          orphanProjects.length === 0 &&
          standaloneInitiatives.length === 0 ? (
            <p className="px-3 py-4 text-xs text-steel-400">
              لا كيانات للعرض حسب البحث أو الفلاتر.
            </p>
          ) : null}
            </TreeNode>
          ) : null}
        </TreeNode>
      </Card>

      <div className="flex flex-wrap gap-3 text-[10px] text-steel-500">
        <LegendSwatch tone="org" label="مؤسسة" />
        <LegendSwatch tone="branch" label="فرع" />
        <LegendSwatch tone="department" label="إدارة" />
        <LegendSwatch tone="portfolio" label="محفظة" />
        <LegendSwatch tone="initiative" label="مبادرة" />
        <LegendSwatch tone="program" label="برنامج" />
        <LegendSwatch tone="project" label="مشروع" />
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
      <span className="text-[10px] font-bold text-steel-400">مشروع{letter ? ` ${letter}` : ""}:</span>
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
