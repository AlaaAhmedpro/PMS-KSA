import { useState } from "react";
import {
  List,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Building2,
  Factory,
  Landmark,
  Tags,
} from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Input";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { EmptyState } from "../components/ui/EmptyState";
import { useData } from "../store/DataStore";
import { categoryLabel } from "../lib/categoryHelpers";
import { usePagination, PAGE_SIZE_DEFAULT } from "../hooks/usePagination";
import { Pagination } from "../components/ui/Pagination";
import { cn } from "../lib/cn";

type TabId = "branches" | "departments" | "categories" | "entities";

const TABS: { id: TabId; label: string; icon: typeof Factory }[] = [
  { id: "branches", label: "الفروع / المناطق", icon: Factory },
  { id: "departments", label: "الإدارات", icon: Building2 },
  { id: "categories", label: "تصنيفات الإدارات", icon: Tags },
  { id: "entities", label: "الجهات المعنية", icon: Landmark },
];

export function LookupsAdmin() {
  const [tab, setTab] = useState<TabId>("branches");

  return (
    <div>
      <PageHeader
        title="إدارة القوائم المرجعية"
        subtitle="إضافة وتعديل وحذف وعرض كل القوائم المنسدلة في النظام"
        icon={<List className="h-6 w-6" />}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors",
              tab === t.id
                ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                : "border-steel-200 text-steel-600 hover:bg-steel-50 dark:border-steel-700 dark:text-steel-300 dark:hover:bg-steel-800",
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "branches" && <BranchesPanel />}
      {tab === "departments" && <DepartmentsPanel />}
      {tab === "categories" && <CategoriesPanel />}
      {tab === "entities" && <EntitiesPanel />}
    </div>
  );
}

function BranchesPanel() {
  const { branches, addBranch, updateBranch, removeBranch } = useData();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addBranch(name);
    setName("");
    setError("");
  };

  const saveEdit = (id: string) => {
    if (!editName.trim()) return;
    updateBranch(id, editName);
    setEditingId(null);
    setEditName("");
  };

  const handleDelete = (id: string) => {
    const res = removeBranch(id);
    if (!res.ok) setError(res.reason || "تعذر الحذف");
    else setError("");
  };

  return (
    <LookupCard
      title="الفرع / المنطقة"
      subtitle={`${branches.length} فرع — يظهر في نموذج تسجيل المشاريع والمهام`}
      onSubmit={submit}
      name={name}
      onNameChange={setName}
      placeholder="مثال: فرع الرياض"
      error={error}
    >
      <LookupTable
        items={branches}
        editingId={editingId}
        editName={editName}
        onStartEdit={(item) => {
          setEditingId(item.id);
          setEditName(item.name);
          setError("");
        }}
        onEditNameChange={setEditName}
        onSaveEdit={saveEdit}
        onCancelEdit={() => setEditingId(null)}
        onDelete={handleDelete}
        emptyMessage="لا توجد مقار مصانع مسجلة"
      />
    </LookupCard>
  );
}

function CategoriesPanel() {
  const { categories, addCategory, updateCategory, removeCategory } = useData();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addCategory(name);
    setName("");
    setError("");
  };

  const saveEdit = (id: string) => {
    if (!editName.trim()) return;
    updateCategory(id, editName);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const res = removeCategory(id);
    if (!res.ok) setError(res.reason || "تعذر الحذف");
    else setError("");
  };

  return (
    <LookupCard
      title="تصنيفات الإدارات"
      subtitle={`${categories.length} تصنيف — يظهر عند إضافة إدارة وفي تصنيف السجل`}
      onSubmit={submit}
      name={name}
      onNameChange={setName}
      placeholder="مثال: شؤون بيئية"
      error={error}
    >
      <LookupTable
        items={categories}
        editingId={editingId}
        editName={editName}
        onStartEdit={(item) => {
          setEditingId(item.id);
          setEditName(item.name);
          setError("");
        }}
        onEditNameChange={setEditName}
        onSaveEdit={saveEdit}
        onCancelEdit={() => setEditingId(null)}
        onDelete={handleDelete}
        emptyMessage="لا توجد تصنيفات مسجلة"
      />
    </LookupCard>
  );
}

function DepartmentsPanel() {
  const {
    departments,
    categories,
    addDepartment,
    updateDepartment,
    removeDepartment,
  } = useData();
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0]?.id ?? "admin");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState(categories[0]?.id ?? "admin");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addDepartment(name, category);
    setName("");
    setError("");
  };

  const saveEdit = (id: string) => {
    if (!editName.trim()) return;
    updateDepartment(id, { name: editName, category: editCategory });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const res = removeDepartment(id);
    if (!res.ok) setError(res.reason || "تعذر الحذف");
    else setError("");
  };

  const deptPagination = usePagination(
    departments,
    PAGE_SIZE_DEFAULT,
    [departments.length],
  );

  return (
    <Card>
      <CardHeader
        title="الأدارات / الفروع"
        subtitle={`${departments.length} أدارة / فرع — مرتبطة بالفرع / المنطقة والمسؤولين`}
      />
      <form onSubmit={submit} className="space-y-3 border-b border-steel-100 p-5 dark:border-steel-800">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="اسم الأدارة / الفرع" required className="md:col-span-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: الشؤون الإدارية"
            />
          </Field>
          <Field label="التصنيف">
            <SearchableSelect
              value={category}
              onChange={setCategory}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              searchPlaceholder="بحث في التصنيفات..."
            />
          </Field>
        </div>
        {error && <p className="text-sm font-semibold text-red-500">{error}</p>}
        <Button type="submit" size="sm">
          <Plus className="h-4 w-4" />
          إضافة
        </Button>
      </form>
      <div className="overflow-x-auto p-5 pt-3">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="border-b border-steel-100 text-xs text-steel-500 dark:border-steel-800">
              <th className="px-3 py-2 font-bold">الاسم</th>
              <th className="px-3 py-2 font-bold">التصنيف</th>
              <th className="px-3 py-2 font-bold w-28">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {departments.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 text-center text-steel-400">
                  لا توجد إدارات/فروع مسجلة
                </td>
              </tr>
            ) : (
              deptPagination.paginated.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-steel-50 dark:border-steel-800/60"
                >
                  <td className="px-3 py-2.5">
                    {editingId === d.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-9"
                      />
                    ) : (
                      <span className="font-semibold text-steel-700 dark:text-steel-200">
                        {d.name}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-steel-500">
                    {editingId === d.id ? (
                      <SearchableSelect
                        value={editCategory}
                        onChange={setEditCategory}
                        className="h-9"
                        options={categories.map((c) => ({
                          value: c.id,
                          label: c.name,
                        }))}
                        searchPlaceholder="بحث..."
                      />
                    ) : (
                      categoryLabel(categories, d.category)
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <RowActions
                      isEditing={editingId === d.id}
                      onEdit={() => {
                        setEditingId(d.id);
                        setEditName(d.name);
                        setEditCategory(d.category);
                        setError("");
                      }}
                      onSave={() => saveEdit(d.id)}
                      onCancel={() => setEditingId(null)}
                      onDelete={() => handleDelete(d.id)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {departments.length > 0 && (
        <Pagination
          page={deptPagination.page}
          totalPages={deptPagination.totalPages}
          onPageChange={deptPagination.setPage}
          total={deptPagination.total}
          rangeStart={deptPagination.rangeStart}
          rangeEnd={deptPagination.rangeEnd}
        />
      )}
    </Card>
  );
}

function EntitiesPanel() {
  const { entities, addEntity, updateEntity, removeEntity } = useData();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addEntity(name);
    setName("");
    setError("");
  };

  const saveEdit = (id: string) => {
    if (!editName.trim()) return;
    updateEntity(id, editName);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const res = removeEntity(id);
    if (!res.ok) setError(res.reason || "تعذر الحذف");
    else setError("");
  };

  return (
    <LookupCard
      title="الجهات المرسلة"
      subtitle={`${entities.length} جهة — تظهر في نموذج السجل والفلاتر`}
      onSubmit={submit}
      name={name}
      onNameChange={setName}
      placeholder="مثال: وزارة الصناعة"
      error={error}
    >
      <LookupTable
        items={entities}
        editingId={editingId}
        editName={editName}
        onStartEdit={(item) => {
          setEditingId(item.id);
          setEditName(item.name);
          setError("");
        }}
        onEditNameChange={setEditName}
        onSaveEdit={saveEdit}
        onCancelEdit={() => setEditingId(null)}
        onDelete={handleDelete}
        emptyMessage="لا توجد جهات مسجلة"
      />
    </LookupCard>
  );
}

function LookupCard({
  title,
  subtitle,
  onSubmit,
  name,
  onNameChange,
  placeholder,
  error,
  children,
}: {
  title: string;
  subtitle: string;
  onSubmit: (e: React.FormEvent) => void;
  name: string;
  onNameChange: (v: string) => void;
  placeholder: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-3 border-b border-steel-100 p-5 dark:border-steel-800 sm:flex-row sm:items-end"
      >
        <Field label="الاسم" required className="flex-1">
          <Input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={placeholder}
          />
        </Field>
        <Button type="submit" className="shrink-0">
          <Plus className="h-4 w-4" />
          إضافة
        </Button>
      </form>
      {error && (
        <p className="px-5 pt-3 text-sm font-semibold text-red-500">{error}</p>
      )}
      <div className="p-5 pt-3">{children}</div>
    </Card>
  );
}

function LookupTable({
  items,
  editingId,
  editName,
  onStartEdit,
  onEditNameChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  emptyMessage,
}: {
  items: { id: string; name: string }[];
  editingId: string | null;
  editName: string;
  onStartEdit: (item: { id: string; name: string }) => void;
  onEditNameChange: (v: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  emptyMessage: string;
}) {
  const pagination = usePagination(items, PAGE_SIZE_DEFAULT, [items.length]);

  if (items.length === 0) {
    return <EmptyState title={emptyMessage} />;
  }

  const { paginated, page, setPage, totalPages, total, rangeStart, rangeEnd } =
    pagination;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="border-b border-steel-100 text-xs text-steel-500 dark:border-steel-800">
              <th className="px-3 py-2 font-bold">#</th>
              <th className="px-3 py-2 font-bold">الاسم</th>
              <th className="px-3 py-2 font-bold w-28">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((item, i) => (
              <tr
                key={item.id}
                className="border-b border-steel-50 dark:border-steel-800/60"
              >
                <td className="px-3 py-2.5 font-mono text-steel-400">
                  {rangeStart + i}
                </td>
              <td className="px-3 py-2.5">
                {editingId === item.id ? (
                  <Input
                    value={editName}
                    onChange={(e) => onEditNameChange(e.target.value)}
                    className="h-9"
                  />
                ) : (
                  <span className="font-semibold text-steel-700 dark:text-steel-200">
                    {item.name}
                  </span>
                )}
              </td>
              <td className="px-3 py-2.5">
                <RowActions
                  isEditing={editingId === item.id}
                  onEdit={() => onStartEdit(item)}
                  onSave={() => onSaveEdit(item.id)}
                  onCancel={onCancelEdit}
                  onDelete={() => onDelete(item.id)}
                />
              </td>
            </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        total={total}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
      />
    </div>
  );
}

function RowActions({
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: {
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  if (isEditing) {
    return (
      <div className="flex gap-1">
        <button
          type="button"
          onClick={onSave}
          className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-500/10"
          title="حفظ"
        >
          <Save className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1.5 text-steel-400 hover:bg-steel-100 dark:hover:bg-steel-800"
          title="إلغاء"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-1">
      <button
        type="button"
        onClick={onEdit}
        className="rounded-lg p-1.5 text-steel-400 hover:bg-brand-500/10 hover:text-brand-600"
        title="تعديل"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="rounded-lg p-1.5 text-steel-400 hover:bg-red-500/10 hover:text-red-500"
        title="حذف"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
