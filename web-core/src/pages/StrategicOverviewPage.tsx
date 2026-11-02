import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  ChevronDown,
  Compass,
  FolderKanban,
  GitBranch,
  Layers,
  Network,
  Plus,
  Search,
  Table2,
} from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { KpiCard } from "../components/common/KpiCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { EmptyState } from "../components/ui/EmptyState";
import { Pagination } from "../components/ui/Pagination";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { AddRelationshipModal } from "../components/strategy/AddRelationshipModal";
import { EntityDetailsPanel } from "../components/strategy/EntityDetailsPanel";
import { useHierarchy } from "../store/HierarchyStore";
import { useAuth } from "../store/AuthContext";
import { useData } from "../store/DataStore";
import { usePagination, PAGE_SIZE_DEFAULT } from "../hooks/usePagination";
import {
  activeRelationships,
  collectStrategicEntities,
  findEntityName,
  formatEntityTitle,
  isIndependentProject,
  primaryPlacement,
  projectsWithoutStrategicAlignment,
  relatedCount,
} from "../lib/strategicEntities";
import {
  RELATIONSHIP_TYPES,
  entityLabelAr,
  getRelationshipDef,
} from "../lib/relationshipRules";
import { PROJECT_STATUS_LABELS } from "../lib/constants";
import type {
  ProjectStatus,
  RelationshipTypeKey,
  StrategicEntityType,
} from "../models/domain";
import { cn } from "../lib/cn";

type ViewId = "hierarchy" | "relationships" | "table";

const ENTITY_TONES: Record<StrategicEntityType, string> = {
  portfolio: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  initiative: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  program: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  project: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

const ENTITY_ICONS = {
  portfolio: Briefcase,
  initiative: Compass,
  program: Layers,
  project: FolderKanban,
};

export function StrategicOverviewPage() {
  const {
    portfolios,
    initiatives,
    programs,
    projects,
    relationships,
  } = useHierarchy();
  const { users } = useAuth();
  const { departments } = useData();

  const [view, setView] = useState<ViewId>("hierarchy");
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<StrategicEntityType | "all">(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [relTypeFilter, setRelTypeFilter] = useState<RelationshipTypeKey | "all">(
    "all",
  );
  const [selected, setSelected] = useState<{
    type: StrategicEntityType;
    id: string;
  } | null>(null);
  const [relModalOpen, setRelModalOpen] = useState(false);
  const [openNodes, setOpenNodes] = useState<Record<string, boolean>>({
    root: true,
    independent: true,
  });
  const [sortKey, setSortKey] = useState<"name" | "type" | "status">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

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

  const term = q.trim().toLowerCase();

  const filteredEntities = useMemo(() => {
    return entities.filter((e) => {
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (deptFilter !== "all" && e.departmentId !== deptFilter) return false;
      if (ownerFilter !== "all" && e.ownerId !== ownerFilter) return false;
      if (term && !e.name.toLowerCase().includes(term) && !e.description.toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });
  }, [entities, typeFilter, statusFilter, deptFilter, ownerFilter, term]);

  const activeRels = useMemo(
    () => activeRelationships(relationships),
    [relationships],
  );

  const filteredRels = useMemo(() => {
    return activeRels.filter((r) => {
      if (relTypeFilter !== "all" && r.relationshipType !== relTypeFilter) {
        return false;
      }
      if (typeFilter !== "all") {
        if (r.sourceType !== typeFilter && r.targetType !== typeFilter) {
          return false;
        }
      }
      if (term) {
        const sn = findEntityName(entities, r.sourceType, r.sourceId).toLowerCase();
        const tn = findEntityName(entities, r.targetType, r.targetId).toLowerCase();
        if (!sn.includes(term) && !tn.includes(term) && !(r.description ?? "").toLowerCase().includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [activeRels, relTypeFilter, typeFilter, term, entities]);

  const unaligned = useMemo(
    () => projectsWithoutStrategicAlignment(projects, relationships),
    [projects, relationships],
  );

  const atRisk = useMemo(
    () =>
      projects.filter(
        (p) =>
          p.status === "on_hold" ||
          (p.status === "active" && p.progress < 30 && p.endDate < "2026-12-01"),
      ),
    [projects],
  );

  const independentProjects = useMemo(
    () => projects.filter((p) => isIndependentProject(p, relationships)),
    [projects, relationships],
  );

  const selectedEntity = selected
    ? entities.find((e) => e.type === selected.type && e.id === selected.id) ??
      null
    : null;

  const tableRows = useMemo(() => {
    const rows = [...filteredEntities];
    rows.sort((a, b) => {
      const av =
        sortKey === "name" ? a.name : sortKey === "type" ? a.type : a.status ?? "";
      const bv =
        sortKey === "name" ? b.name : sortKey === "type" ? b.type : b.status ?? "";
      const cmp = String(av).localeCompare(String(bv), "ar");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [filteredEntities, sortKey, sortDir]);

  const pagination = usePagination(tableRows, PAGE_SIZE_DEFAULT, [
    tableRows.length,
    sortKey,
    sortDir,
    q,
    typeFilter,
  ]);

  const toggleNode = (key: string, defaultOpen = true) =>
    setOpenNodes((prev) => {
      const cur = prev[key] === undefined ? defaultOpen : prev[key];
      return { ...prev, [key]: !cur };
    });
  const isOpen = (key: string, defaultOpen = true) =>
    openNodes[key] === undefined ? defaultOpen : openNodes[key];

  const selectEntity = (type: StrategicEntityType, id: string) =>
    setSelected({ type, id });

  const containsChildren = (
    sourceType: StrategicEntityType,
    sourceId: string,
    targetType: StrategicEntityType,
  ) =>
    activeRels.filter(
      (r) =>
        r.relationshipType === "contains" &&
        r.sourceType === sourceType &&
        r.sourceId === sourceId &&
        r.targetType === targetType,
    );

  return (
    <div className="space-y-4">
      <PageHeader
        title="النظرة الاستراتيجية"
        subtitle="ربط الاستراتيجية بالتنفيذ — تسلسل مرن وعلاقات صريحة دون إجبار شجرة إلزامية"
        icon={<Network className="h-6 w-6" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setRelModalOpen(true)}>
              <GitBranch className="h-4 w-4" />
              إضافة علاقة
            </Button>
            <div className="relative">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-sm font-bold text-white hover:bg-brand-700">
                  <Plus className="h-4 w-4" />
                  إنشاء
                </summary>
                <div className="absolute end-0 z-20 mt-1 w-44 rounded-xl border border-steel-200 bg-white p-1 shadow-lg dark:border-steel-700 dark:bg-steel-900">
                  <Link className="block rounded-lg px-3 py-2 text-sm hover:bg-steel-50 dark:hover:bg-steel-800" to="/portfolios">محفظة</Link>
                  <Link className="block rounded-lg px-3 py-2 text-sm hover:bg-steel-50 dark:hover:bg-steel-800" to="/initiatives">مبادرة</Link>
                  <Link className="block rounded-lg px-3 py-2 text-sm hover:bg-steel-50 dark:hover:bg-steel-800" to="/programs">برنامج</Link>
                  <Link className="block rounded-lg px-3 py-2 text-sm hover:bg-steel-50 dark:hover:bg-steel-800" to="/projects">مشروع</Link>
                </div>
              </details>
            </div>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard label="المحافظ" value={String(portfolios.length)} icon={<Briefcase className="h-4 w-4" />} tone="brand" />
        <KpiCard label="المبادرات" value={String(initiatives.length)} icon={<Compass className="h-4 w-4" />} tone="sky" />
        <KpiCard label="البرامج" value={String(programs.length)} icon={<Layers className="h-4 w-4" />} tone="steel" />
        <KpiCard label="المشاريع" value={String(projects.length)} icon={<FolderKanban className="h-4 w-4" />} tone="amber" />
        <KpiCard label="بلا مواءمة استراتيجية" value={String(unaligned.length)} icon={<GitBranch className="h-4 w-4" />} tone="amber" />
        <KpiCard label="معرّضة / متأخرة" value={String(atRisk.length)} icon={<FolderKanban className="h-4 w-4" />} tone="red" />
      </div>

      <Card className="space-y-3 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
            <Input
              className="ps-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="بحث في المحافظ والمبادرات والبرامج والمشاريع…"
            />
          </div>
          <div className="flex flex-wrap gap-1 rounded-xl border border-steel-200 p-1 dark:border-steel-700">
            {(
              [
                { id: "hierarchy", label: "التسلسل", icon: Layers },
                { id: "relationships", label: "العلاقات", icon: Network },
                { id: "table", label: "الجدول", icon: Table2 },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold",
                  view === v.id
                    ? "bg-brand-500/10 text-brand-700 dark:text-brand-300"
                    : "text-steel-500 hover:bg-steel-50 dark:hover:bg-steel-800",
                )}
              >
                <v.icon className="h-3.5 w-3.5" />
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <SearchableSelect
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as StrategicEntityType | "all")}
            options={[
              { value: "all", label: "كل الأنواع" },
              { value: "portfolio", label: "محفظة" },
              { value: "initiative", label: "مبادرة" },
              { value: "program", label: "برنامج" },
              { value: "project", label: "مشروع" },
            ]}
          />
          <SearchableSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "كل الحالات" },
              ...Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
          <SearchableSelect
            value={deptFilter}
            onChange={setDeptFilter}
            options={[
              { value: "all", label: "كل الإدارات" },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
          <SearchableSelect
            value={ownerFilter}
            onChange={setOwnerFilter}
            options={[
              { value: "all", label: "كل المسؤولين" },
              ...users.map((u) => ({ value: u.id, label: u.name })),
            ]}
          />
        </div>
        {view === "relationships" ? (
          <SearchableSelect
            value={relTypeFilter}
            onChange={(v) => setRelTypeFilter(v as RelationshipTypeKey | "all")}
            options={[
              { value: "all", label: "كل أنواع العلاقات" },
              ...RELATIONSHIP_TYPES.map((t) => ({
                value: t.key,
                label: t.nameAr,
              })),
            ]}
          />
        ) : null}
      </Card>

      <div
        className={cn(
          "grid gap-4",
          selectedEntity ? "xl:grid-cols-[1fr_320px]" : "grid-cols-1",
        )}
      >
        <div className="min-w-0">
          {view === "hierarchy" ? (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-steel-100 px-4 py-3 text-xs text-steel-500 dark:border-steel-800">
                الاحتواء الهرمي فقط. المواءمات والاعتمادات تظهر في تبويب العلاقات ولوحة التفاصيل.
              </div>
              <div className="space-y-1 p-3">
                {portfolios
                  .filter(
                    (pf) =>
                      typeFilter === "all" ||
                      typeFilter === "portfolio" ||
                      containsChildren("portfolio", pf.id, "initiative").length ||
                      containsChildren("portfolio", pf.id, "program").length ||
                      containsChildren("portfolio", pf.id, "project").length,
                  )
                  .filter((pf) => !term || pf.name.toLowerCase().includes(term) || filteredEntities.some((e) => e.name.toLowerCase().includes(term)))
                  .map((pf) => {
                    const key = `pf:${pf.id}`;
                    const inis = containsChildren("portfolio", pf.id, "initiative");
                    const prgs = containsChildren("portfolio", pf.id, "program");
                    const directProjects = containsChildren("portfolio", pf.id, "project");
                    return (
                      <HierarchyNode
                        key={pf.id}
                        open={isOpen(key)}
                        onToggle={() => toggleNode(key)}
                        type="portfolio"
                        name={pf.name}
                        meta={`${inis.length} مبادرة · ${prgs.length} برنامج · ${directProjects.length} مشروع مباشر`}
                        selected={selected?.type === "portfolio" && selected.id === pf.id}
                        onSelect={() => selectEntity("portfolio", pf.id)}
                        hasChildren={inis.length + prgs.length + directProjects.length > 0}
                      >
                        {inis.map((edge) => {
                          const ini = initiatives.find((i) => i.id === edge.targetId);
                          if (!ini) return null;
                          if (typeFilter !== "all" && typeFilter !== "initiative" && typeFilter !== "program" && typeFilter !== "project") return null;
                          const iKey = `${key}:ini:${ini.id}`;
                          const iniPrograms = containsChildren("initiative", ini.id, "program");
                          const iniProjects = containsChildren("initiative", ini.id, "project");
                          return (
                            <HierarchyNode
                              key={ini.id}
                              open={isOpen(iKey, false)}
                              onToggle={() => toggleNode(iKey, false)}
                              type="initiative"
                              name={ini.name}
                              meta={`${iniPrograms.length} برنامج`}
                              selected={selected?.type === "initiative" && selected.id === ini.id}
                              onSelect={() => selectEntity("initiative", ini.id)}
                              hasChildren={iniPrograms.length + iniProjects.length > 0}
                            >
                              {iniPrograms.map((pe) => {
                                const prg = programs.find((p) => p.id === pe.targetId);
                                if (!prg) return null;
                                const pKey = `${iKey}:prg:${prg.id}`;
                                const kids = containsChildren("program", prg.id, "project");
                                return (
                                  <HierarchyNode
                                    key={prg.id}
                                    open={isOpen(pKey, false)}
                                    onToggle={() => toggleNode(pKey, false)}
                                    type="program"
                                    name={prg.name}
                                    meta={`${kids.length} مشروع`}
                                    selected={selected?.type === "program" && selected.id === prg.id}
                                    onSelect={() => selectEntity("program", prg.id)}
                                    hasChildren={kids.length > 0}
                                  >
                                    {kids.map((ke) => {
                                      const proj = projects.find((p) => p.id === ke.targetId);
                                      if (!proj) return null;
                                      if (term && !proj.name.toLowerCase().includes(term)) return null;
                                      return (
                                        <HierarchyLeaf
                                          key={proj.id}
                                          type="project"
                                          name={proj.name}
                                          status={proj.status}
                                          selected={selected?.type === "project" && selected.id === proj.id}
                                          onSelect={() => selectEntity("project", proj.id)}
                                        />
                                      );
                                    })}
                                  </HierarchyNode>
                                );
                              })}
                              {iniProjects.map((pe) => {
                                const proj = projects.find((p) => p.id === pe.targetId);
                                if (!proj) return null;
                                return (
                                  <HierarchyLeaf
                                    key={proj.id}
                                    type="project"
                                    name={proj.name}
                                    status={proj.status}
                                    badge="مواءمة/ارتباط مباشر"
                                    selected={selected?.type === "project" && selected.id === proj.id}
                                    onSelect={() => selectEntity("project", proj.id)}
                                  />
                                );
                              })}
                            </HierarchyNode>
                          );
                        })}
                        {prgs.map((edge) => {
                          const prg = programs.find((p) => p.id === edge.targetId);
                          if (!prg) return null;
                          const alreadyUnderIni = inis.some((i) =>
                            containsChildren("initiative", i.targetId, "program").some(
                              (x) => x.targetId === prg.id,
                            ),
                          );
                          if (alreadyUnderIni) return null;
                          const pKey = `${key}:free-prg:${prg.id}`;
                          const kids = containsChildren("program", prg.id, "project");
                          return (
                            <HierarchyNode
                              key={prg.id}
                              open={isOpen(pKey, false)}
                              onToggle={() => toggleNode(pKey, false)}
                              type="program"
                              name={prg.name}
                              badge="بلا مبادرة"
                              meta={`${kids.length} مشروع`}
                              selected={selected?.type === "program" && selected.id === prg.id}
                              onSelect={() => selectEntity("program", prg.id)}
                              hasChildren={kids.length > 0}
                            >
                              {kids.map((ke) => {
                                const proj = projects.find((p) => p.id === ke.targetId);
                                if (!proj) return null;
                                return (
                                  <HierarchyLeaf
                                    key={proj.id}
                                    type="project"
                                    name={proj.name}
                                    status={proj.status}
                                    selected={selected?.type === "project" && selected.id === proj.id}
                                    onSelect={() => selectEntity("project", proj.id)}
                                  />
                                );
                              })}
                            </HierarchyNode>
                          );
                        })}
                        {directProjects.length > 0 ? (
                          <div className="ms-2 mt-1 space-y-0.5 rounded-lg border border-dashed border-amber-300/70 p-1.5 dark:border-amber-700/50">
                            <p className="px-1 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                              مشاريع مستقلة تحت المحفظة
                            </p>
                            {directProjects.map((edge) => {
                              const proj = projects.find((p) => p.id === edge.targetId);
                              if (!proj) return null;
                              return (
                                <HierarchyLeaf
                                  key={proj.id}
                                  type="project"
                                  name={proj.name}
                                  status={proj.status}
                                  badge="مشاريع مستقلة"
                                  selected={selected?.type === "project" && selected.id === proj.id}
                                  onSelect={() => selectEntity("project", proj.id)}
                                />
                              );
                            })}
                          </div>
                        ) : null}
                      </HierarchyNode>
                    );
                  })}

                <HierarchyNode
                  open={isOpen("independent")}
                  onToggle={() => toggleNode("independent")}
                  type="project"
                  name="مشاريع مستقلة تماماً"
                  meta={`${independentProjects.length} مشروع`}
                  selected={false}
                  onSelect={() => undefined}
                  hasChildren={independentProjects.length > 0}
                >
                  {independentProjects.length === 0 ? (
                    <p className="px-2 py-2 text-xs text-steel-400">لا مشاريع مستقلة بالكامل.</p>
                  ) : (
                    independentProjects.map((p) => (
                      <HierarchyLeaf
                        key={p.id}
                        type="project"
                        name={p.name}
                        status={p.status}
                        badge="مستقل"
                        selected={selected?.type === "project" && selected.id === p.id}
                        onSelect={() => selectEntity("project", p.id)}
                      />
                    ))
                  )}
                </HierarchyNode>
              </div>
            </Card>
          ) : null}

          {view === "relationships" ? (
            <Card className="space-y-3 p-4">
              <div className="flex flex-wrap gap-2 text-[10px]">
                {RELATIONSHIP_TYPES.map((t) => (
                  <span
                    key={t.key}
                    className={cn(
                      "rounded-md border px-2 py-1 font-bold",
                      t.visual === "containment" && "border-emerald-300 text-emerald-700",
                      t.visual === "alignment" && "border-sky-300 text-sky-700",
                      t.visual === "dependency" && "border-amber-300 text-amber-700",
                      t.visual === "association" && "border-steel-300 text-steel-600",
                    )}
                  >
                    {t.nameAr}
                  </span>
                ))}
              </div>
              {filteredRels.length === 0 ? (
                <EmptyState title="لا علاقات" subtitle="عدّل الفلاتر أو أضف علاقة جديدة." />
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {filteredRels.map((r) => {
                    const def = getRelationshipDef(r.relationshipType);
                    const sourceSelected =
                      selected?.type === r.sourceType && selected.id === r.sourceId;
                    const targetSelected =
                      selected?.type === r.targetType && selected.id === r.targetId;
                    const highlight =
                      selected &&
                      ((selected.type === r.sourceType && selected.id === r.sourceId) ||
                        (selected.type === r.targetType && selected.id === r.targetId));
                    return (
                      <div
                        key={r.id}
                        className={cn(
                          "rounded-xl border p-3 transition-colors",
                          highlight
                            ? "border-brand-500 bg-brand-500/5"
                            : "border-steel-200 dark:border-steel-700",
                        )}
                      >
                        <p className="text-[10px] font-bold text-steel-400">
                          {def.nameAr} · {def.visual}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => selectEntity(r.sourceType, r.sourceId)}
                            className={cn(
                              "rounded-lg px-2 py-1 font-bold",
                              ENTITY_TONES[r.sourceType],
                              sourceSelected && "ring-2 ring-brand-500",
                            )}
                          >
                            {formatEntityTitle(
                              r.sourceType,
                              findEntityName(entities, r.sourceType, r.sourceId),
                            )}
                          </button>
                          <span className="text-steel-400">→</span>
                          <button
                            type="button"
                            onClick={() => selectEntity(r.targetType, r.targetId)}
                            className={cn(
                              "rounded-lg px-2 py-1 font-bold",
                              ENTITY_TONES[r.targetType],
                              targetSelected && "ring-2 ring-brand-500",
                            )}
                          >
                            {formatEntityTitle(
                              r.targetType,
                              findEntityName(entities, r.targetType, r.targetId),
                            )}
                          </button>
                        </div>
                        {r.description ? (
                          <p className="mt-2 text-[11px] text-steel-500">{r.description}</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          ) : null}

          {view === "table" ? (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-steel-200 bg-steel-50 text-start dark:border-steel-700 dark:bg-steel-800/60">
                      {(
                        [
                          ["name", "الاسم"],
                          ["type", "النوع"],
                          ["status", "الحالة"],
                        ] as const
                      ).map(([key, label]) => (
                        <th key={key} className="px-3 py-2.5">
                          <button
                            type="button"
                            className="font-bold"
                            onClick={() => {
                              if (sortKey === key) {
                                setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                              } else {
                                setSortKey(key);
                                setSortDir("asc");
                              }
                            }}
                          >
                            {label}
                          </button>
                        </th>
                      ))}
                      <th className="px-3 py-2.5 font-bold">المسؤول</th>
                      <th className="px-3 py-2.5 font-bold">الإدارة</th>
                      <th className="px-3 py-2.5 font-bold">الموضع</th>
                      <th className="px-3 py-2.5 font-bold">علاقات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagination.paginated.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-steel-400">
                          لا نتائج مطابقة للبحث أو الفلاتر.
                        </td>
                      </tr>
                    ) : (
                      pagination.paginated.map((row) => {
                        const place = primaryPlacement(
                          row,
                          relationships,
                          projects,
                          programs,
                        );
                        return (
                          <tr
                            key={`${row.type}:${row.id}`}
                            className={cn(
                              "cursor-pointer border-b border-steel-100 dark:border-steel-800",
                              selected?.type === row.type &&
                                selected.id === row.id &&
                                "bg-brand-500/5",
                            )}
                            onClick={() => selectEntity(row.type, row.id)}
                          >
                            <td className="px-3 py-2.5 font-semibold">{row.name}</td>
                            <td className="px-3 py-2.5">{entityLabelAr(row.type)}</td>
                            <td className="px-3 py-2.5">
                              {row.status
                                ? PROJECT_STATUS_LABELS[row.status as ProjectStatus] ??
                                  row.status
                                : "—"}
                            </td>
                            <td className="px-3 py-2.5">
                              {users.find((u) => u.id === row.ownerId)?.name ?? "—"}
                            </td>
                            <td className="px-3 py-2.5">
                              {departments.find((d) => d.id === row.departmentId)?.name ??
                                "—"}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-steel-500">
                              {place?.label ?? "—"}
                            </td>
                            <td className="px-3 py-2.5 tabular-nums">
                              {relatedCount(relationships, row.type, row.id)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-steel-100 p-3 dark:border-steel-800">
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={pagination.setPage}
                  total={pagination.total}
                  rangeStart={pagination.rangeStart}
                  rangeEnd={pagination.rangeEnd}
                />
              </div>
            </Card>
          ) : null}
        </div>

        {selectedEntity ? (
          <div className="min-h-[420px] overflow-hidden rounded-2xl border border-steel-200 dark:border-steel-700 xl:sticky xl:top-4 xl:max-h-[calc(100vh-6rem)]">
            <EntityDetailsPanel
              entity={selectedEntity}
              entities={entities}
              onClose={() => setSelected(null)}
              onSelectEntity={selectEntity}
              onAddRelationship={() => setRelModalOpen(true)}
            />
          </div>
        ) : null}
      </div>

      <AddRelationshipModal
        open={relModalOpen}
        onClose={() => setRelModalOpen(false)}
        entities={entities}
        presetSource={selected}
      />
    </div>
  );
}

function HierarchyNode({
  open,
  onToggle,
  type,
  name,
  meta,
  badge,
  selected,
  onSelect,
  hasChildren,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  type: StrategicEntityType;
  name: string;
  meta?: string;
  badge?: string;
  selected: boolean;
  onSelect: () => void;
  hasChildren: boolean;
  children?: ReactNode;
}) {
  const Icon = ENTITY_ICONS[type];
  return (
    <div>
      <div
        className={cn(
          "flex items-start gap-1 rounded-lg px-1 py-1",
          selected && "bg-brand-500/10",
        )}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={onToggle}
            className="mt-0.5 flex h-5 w-5 items-center justify-center text-steel-400"
            aria-expanded={open}
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-150",
                open ? "rotate-0" : "ltr:-rotate-90 rtl:rotate-90",
              )}
            />
          </button>
        ) : (
          <span className="inline-block h-5 w-5" />
        )}
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-start gap-2 rounded-lg px-1 py-0.5 text-start hover:bg-steel-50 dark:hover:bg-steel-800/50"
        >
          <span className={cn("mt-0.5 flex h-6 w-6 items-center justify-center rounded-md", ENTITY_TONES[type])}>
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-steel-400">
                {entityLabelAr(type)}:
              </span>
              <span className="text-xs font-extrabold text-steel-800 dark:text-steel-100">
                {name}
              </span>
              {badge ? (
                <span className="rounded border border-dashed border-amber-400/70 px-1 text-[9px] font-bold text-amber-700">
                  {badge}
                </span>
              ) : null}
            </span>
            {meta ? <span className="block text-[10px] text-steel-400">{meta}</span> : null}
          </span>
        </button>
      </div>
      {hasChildren && open ? (
        <div className="ms-4 space-y-0.5 border-s border-steel-200 ps-2 dark:border-steel-700">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function HierarchyLeaf({
  type,
  name,
  status,
  badge,
  selected,
  onSelect,
}: {
  type: StrategicEntityType;
  name: string;
  status?: string;
  badge?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = ENTITY_ICONS[type];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-start hover:bg-steel-50 dark:hover:bg-steel-800/50",
        selected && "bg-brand-500/10",
      )}
    >
      <span className="inline-block h-5 w-5" />
      <span className={cn("flex h-6 w-6 items-center justify-center rounded-md", ENTITY_TONES[type])}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold text-steel-800 dark:text-steel-100">
          {name}
        </span>
        <span className="text-[10px] text-steel-400">
          {status
            ? PROJECT_STATUS_LABELS[status as ProjectStatus] ?? status
            : entityLabelAr(type)}
          {badge ? ` · ${badge}` : ""}
        </span>
      </span>
    </button>
  );
}
