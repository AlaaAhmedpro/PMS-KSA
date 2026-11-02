import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  SEED_BRANCHES,
  SEED_CATEGORIES,
  SEED_DEPARTMENTS,
} from "../lib/constants";
import { ENTITIES, SEED_NEWS, SEED_RECORDS } from "../lib/mockData";
import { enrichRecordAttachmentSearch } from "../lib/attachmentSearch";
import { applyDemoDataMigration } from "../lib/demoSeed";
import type {
  Branch,
  CategoryItem,
  Department,
  Entity,
  NewsItem,
  RecordItem,
} from "../lib/types";

const LS_RECORDS = "pms_records_v1";
const LS_NEWS = "pms_news_v1";
const LS_ENTITIES = "pms_entities_v1";
const LS_BRANCHES = "pms_branches_v1";
const LS_DEPARTMENTS = "pms_departments_v1";
const LS_CATEGORIES = "pms_categories_v1";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors in demo */
  }
}

/** دمج عناصر البذرة الجديدة مع المحفوظ محلياً دون حذف الموجود */
function mergeById<T extends { id: string }>(stored: T[], seed: T[]): T[] {
  const ids = new Set(stored.map((item) => item.id));
  const missing = seed.filter((item) => !ids.has(item.id));
  return missing.length ? [...stored, ...missing] : stored;
}

interface DataContextValue {
  records: RecordItem[];
  news: NewsItem[];
  entities: Entity[];
  branches: Branch[];
  departments: Department[];
  categories: CategoryItem[];
  addRecord: (r: RecordItem) => void;
  updateRecord: (
    id: string,
    patch:
      | Partial<RecordItem>
      | ((record: RecordItem) => Partial<RecordItem>),
  ) => void;
  removeRecord: (id: string) => void;
  getRecord: (id: string) => RecordItem | undefined;
  addEntity: (name: string) => Entity;
  updateEntity: (id: string, name: string) => void;
  removeEntity: (id: string) => { ok: boolean; reason?: string };
  addBranch: (name: string) => Branch;
  updateBranch: (id: string, name: string) => void;
  removeBranch: (id: string) => { ok: boolean; reason?: string };
  addDepartment: (name: string, category: Department["category"]) => Department;
  updateDepartment: (
    id: string,
    patch: { name?: string; category?: Department["category"] },
  ) => void;
  removeDepartment: (id: string) => { ok: boolean; reason?: string };
  addCategory: (name: string) => CategoryItem;
  updateCategory: (id: string, name: string) => void;
  removeCategory: (id: string) => { ok: boolean; reason?: string };
  addNews: (n: NewsItem) => void;
  updateNews: (id: string, patch: Partial<NewsItem>) => void;
  removeNews: (id: string) => void;
  resetDemo: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  applyDemoDataMigration();

  const [records, setRecords] = useState<RecordItem[]>(() =>
    load(LS_RECORDS, SEED_RECORDS).map(enrichRecordAttachmentSearch),
  );
  const [news, setNews] = useState<NewsItem[]>(() => load(LS_NEWS, SEED_NEWS));
  const [entities, setEntities] = useState<Entity[]>(() =>
    load(LS_ENTITIES, ENTITIES),
  );
  const [branches, setBranches] = useState<Branch[]>(() =>
    load(LS_BRANCHES, SEED_BRANCHES),
  );
  const [departments, setDepartments] = useState<Department[]>(() =>
    mergeById(load(LS_DEPARTMENTS, SEED_DEPARTMENTS), SEED_DEPARTMENTS),
  );
  const [categories, setCategories] = useState<CategoryItem[]>(() =>
    load(LS_CATEGORIES, SEED_CATEGORIES),
  );

  useEffect(() => save(LS_RECORDS, records), [records]);
  useEffect(() => save(LS_NEWS, news), [news]);
  useEffect(() => save(LS_ENTITIES, entities), [entities]);
  useEffect(() => save(LS_BRANCHES, branches), [branches]);
  useEffect(() => save(LS_DEPARTMENTS, departments), [departments]);
  useEffect(() => save(LS_CATEGORIES, categories), [categories]);

  const addRecord = useCallback((r: RecordItem) => {
    setRecords((prev) => [r, ...prev]);
  }, []);

  const updateRecord = useCallback(
    (
      id: string,
      patch:
        | Partial<RecordItem>
        | ((record: RecordItem) => Partial<RecordItem>),
    ) => {
      setRecords((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const nextPatch = typeof patch === "function" ? patch(r) : patch;
          const merged = { ...r, ...nextPatch };
          if (!("actions" in nextPatch) || nextPatch.actions === undefined) {
            merged.actions = r.actions ?? [];
          }
          return merged;
        }),
      );
    },
    [],
  );

  const removeRecord = useCallback((id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const getRecord = useCallback(
    (id: string) => records.find((r) => r.id === id),
    [records],
  );

  const addEntity = useCallback(
    (name: string): Entity => {
      const trimmed = name.trim();
      const existing = entities.find((e) => e.name === trimmed);
      if (existing) return existing;
      const ent: Entity = { id: crypto.randomUUID(), name: trimmed };
      setEntities((prev) => [...prev, ent]);
      return ent;
    },
    [entities],
  );

  const updateEntity = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setEntities((prev) =>
      prev.map((e) => (e.id === id ? { ...e, name: trimmed } : e)),
    );
  }, []);

  const removeEntity = useCallback(
    (id: string): { ok: boolean; reason?: string } => {
      const inUse = records.some((r) => r.entityId === id);
      if (inUse) {
        return { ok: false, reason: "الجهة مستخدمة في سجلات مسجلة" };
      }
      setEntities((prev) => prev.filter((e) => e.id !== id));
      return { ok: true };
    },
    [records],
  );

  const addBranch = useCallback((name: string): Branch => {
    const trimmed = name.trim();
    const branch: Branch = { id: crypto.randomUUID(), name: trimmed };
    setBranches((prev) => [...prev, branch]);
    return branch;
  }, []);

  const updateBranch = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBranches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, name: trimmed } : b)),
    );
  }, []);

  const removeBranch = useCallback(
    (id: string): { ok: boolean; reason?: string } => {
      const inRecords = records.some((r) => r.branchId === id);
      const inNews = news.some(
        (n) => n.target.type === "branch" && n.target.branchId === id,
      );
      if (inRecords || inNews) {
        return {
          ok: false,
          reason: "الفرع مستخدم في سجلات أو أخبار",
        };
      }
      setBranches((prev) => prev.filter((b) => b.id !== id));
      return { ok: true };
    },
    [records, news],
  );

  const addDepartment = useCallback(
    (name: string, category: Department["category"]): Department => {
      const dept: Department = {
        id: crypto.randomUUID(),
        name: name.trim(),
        category,
      };
      setDepartments((prev) => [...prev, dept]);
      return dept;
    },
    [],
  );

  const updateDepartment = useCallback(
    (
      id: string,
      patch: { name?: string; category?: Department["category"] },
    ) => {
      setDepartments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...patch } : d)),
      );
    },
    [],
  );

  const removeDepartment = useCallback(
    (id: string): { ok: boolean; reason?: string } => {
      const inUse = records.some((r) => r.departmentId === id);
      if (inUse) {
        return { ok: false, reason: "الإدارة مستخدمة في سجلات مسجلة" };
      }
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      return { ok: true };
    },
    [records],
  );

  const addCategory = useCallback((name: string): CategoryItem => {
    const trimmed = name.trim();
    const existing = categories.find((c) => c.name === trimmed);
    if (existing) return existing;
    const item: CategoryItem = { id: crypto.randomUUID(), name: trimmed };
    setCategories((prev) => [...prev, item]);
    return item;
  }, [categories]);

  const updateCategory = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: trimmed } : c)),
    );
  }, []);

  const removeCategory = useCallback(
    (id: string): { ok: boolean; reason?: string } => {
      const inDepts = departments.some((d) => d.category === id);
      const inRecords = records.some((r) => r.category === id);
      if (inDepts || inRecords) {
        return {
          ok: false,
          reason: "التصنيف مستخدم في إدارات أو سجلات مسجلة",
        };
      }
      setCategories((prev) => prev.filter((c) => c.id !== id));
      return { ok: true };
    },
    [departments, records],
  );

  const addNews = useCallback((n: NewsItem) => {
    setNews((prev) => [n, ...prev]);
  }, []);

  const updateNews = useCallback((id: string, patch: Partial<NewsItem>) => {
    setNews((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, []);

  const removeNews = useCallback((id: string) => {
    setNews((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const resetDemo = useCallback(() => {
    setRecords(SEED_RECORDS.map(enrichRecordAttachmentSearch));
    setNews(SEED_NEWS);
    setEntities(ENTITIES);
    setBranches(SEED_BRANCHES);
    setDepartments(SEED_DEPARTMENTS);
    setCategories(SEED_CATEGORIES);
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      records,
      news,
      entities,
      branches,
      departments,
      categories,
      addRecord,
      updateRecord,
      removeRecord,
      getRecord,
      addEntity,
      updateEntity,
      removeEntity,
      addBranch,
      updateBranch,
      removeBranch,
      addDepartment,
      updateDepartment,
      removeDepartment,
      addCategory,
      updateCategory,
      removeCategory,
      addNews,
      updateNews,
      removeNews,
      resetDemo,
    }),
    [
      records,
      news,
      entities,
      branches,
      departments,
      categories,
      addRecord,
      updateRecord,
      removeRecord,
      getRecord,
      addEntity,
      updateEntity,
      removeEntity,
      addBranch,
      updateBranch,
      removeBranch,
      addDepartment,
      updateDepartment,
      removeDepartment,
      addCategory,
      updateCategory,
      removeCategory,
      addNews,
      updateNews,
      removeNews,
      resetDemo,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
