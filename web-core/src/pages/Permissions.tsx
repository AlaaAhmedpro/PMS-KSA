import { useState } from "react";
import {
  ShieldCheck,
  Check,
  Plus,
  Trash2,
  Users,
  RotateCcw,
  X,
} from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { useRbac } from "../store/RbacContext";
import { useAuth } from "../store/AuthContext";
import { useData } from "../store/DataStore";
import { useNotifications } from "../store/NotificationStore";
import { PERMISSION_DEFS } from "../lib/constants";
import { cn } from "../lib/cn";
import { usePagination, PAGE_SIZE_DEFAULT } from "../hooks/usePagination";
import { Pagination } from "../components/ui/Pagination";

export function Permissions() {
  const { roles, matrix, togglePermission, addRole, removeRole, resetRbac } =
    useRbac();
  const { users, setUserRole, toggleActive } = useAuth();
  const { resetDemo, branches, departments } = useData();
  const { resetNotifications } = useNotifications();
  const [newRole, setNewRole] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const handleAddRole = () => {
    if (!newRole.trim()) return;
    addRole(newRole.trim());
    setNewRole("");
    setShowAdd(false);
  };

  const {
    paginated: pageUsers,
    page,
    setPage,
    totalPages,
    total,
    rangeStart,
    rangeEnd,
  } = usePagination(users, PAGE_SIZE_DEFAULT, [users.length]);

  return (
    <div>
      <PageHeader
        title="الصلاحيات والأدوار"
        subtitle="تحكم كامل في صلاحيات كل دور وإدارة المستخدمين (RBAC)"
        icon={<ShieldCheck className="h-6 w-6" />}
        actions={
          <Button
            variant="outline"
            onClick={() => {
              resetRbac();
              resetDemo();
              resetNotifications();
            }}
            className="no-print"
          >
            <RotateCcw className="h-4 w-4" />
            إعادة الضبط
          </Button>
        }
      />

      {/* Permission matrix */}
      <Card className="mb-4 overflow-hidden">
        <CardHeader
          title="مصفوفة الصلاحيات حسب الدور"
          subtitle="اضغط على الخلية لتفعيل/إلغاء الصلاحية"
          action={
            showAdd ? (
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddRole()}
                  placeholder="اسم الدور الجديد"
                  className="h-9 w-44"
                />
                <Button size="sm" onClick={handleAddRole}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => setShowAdd(true)} className="no-print">
                <Plus className="h-4 w-4" />
                إضافة دور
              </Button>
            )
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-y border-steel-100 bg-steel-50 text-xs text-steel-500 dark:border-steel-800 dark:bg-steel-800/40">
                <th className="sticky right-0 z-10 bg-steel-50 px-4 py-3 font-bold dark:bg-steel-800/40">
                  الدور
                </th>
                {PERMISSION_DEFS.map((p) => (
                  <th
                    key={p.key}
                    className="px-3 py-3 text-center font-bold"
                  >
                    <span className="block max-w-[110px] leading-tight">
                      {p.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-steel-50 dark:border-steel-800/60"
                >
                  <td className="sticky right-0 z-10 bg-white px-4 py-3 dark:bg-steel-900">
                    <div className="flex items-center gap-2">
                      <span className="whitespace-nowrap font-bold text-steel-700 dark:text-steel-200">
                        {r.name}
                      </span>
                      {r.custom && (
                        <>
                          <span className="rounded bg-brand-500/10 px-1.5 py-0.5 text-[10px] font-bold text-brand-500">
                            مخصص
                          </span>
                          <button
                            onClick={() => removeRole(r.id)}
                            className="rounded p-0.5 text-steel-400 hover:bg-red-500/10 hover:text-red-500"
                            title="حذف الدور"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                  {PERMISSION_DEFS.map((p) => {
                    const enabled = matrix[r.id]?.includes(p.key) ?? false;
                    return (
                      <td key={p.key} className="px-3 py-2 text-center">
                        <button
                          onClick={() => togglePermission(r.id, p.key)}
                          className={cn(
                            "mx-auto flex h-7 w-7 items-center justify-center rounded-lg border transition-all",
                            enabled
                              ? "border-brand-500 bg-brand-500 text-white shadow-soft"
                              : "border-steel-200 bg-steel-50 text-transparent hover:border-brand-400 dark:border-steel-700 dark:bg-steel-800",
                          )}
                          title={enabled ? "مفعّلة" : "غير مفعّلة"}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Users table */}
      <Card className="overflow-hidden">
        <CardHeader
          title="إدارة المستخدمين"
          subtitle={`${users.length} مستخدم — تعيين الأدوار وتفعيل/تعطيل الحسابات`}
          icon={<Users className="h-5 w-5" />}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-y border-steel-100 bg-steel-50 text-xs text-steel-500 dark:border-steel-800 dark:bg-steel-800/40">
                <th className="px-4 py-3 font-bold">اسم المستخدم</th>
                <th className="px-4 py-3 font-bold">البريد الإلكتروني</th>
                <th className="px-4 py-3 font-bold">الفرع / المنطقة</th>
                <th className="px-4 py-3 font-bold">الأدارات / الفروع</th>
                <th className="px-4 py-3 font-bold">الدور</th>
                <th className="px-4 py-3 text-center font-bold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {pageUsers.map((u) => {
                const active = u.active !== false;
                return (
                  <tr
                    key={u.id}
                    className="border-b border-steel-50 dark:border-steel-800/60"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                          {u.name.charAt(0)}
                        </div>
                        <span className="font-bold text-steel-700 dark:text-steel-200">
                          {u.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-steel-500" dir="ltr">
                      {u.email}
                    </td>
                    <td className="px-4 py-3 text-steel-500">
                      {branches.find((b) => b.id === u.branchId)?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-steel-500">
                      {departments.find((d) => d.id === u.departmentId)?.name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <SearchableSelect
                        value={u.role}
                        onChange={(roleId) => setUserRole(u.id, roleId)}
                        options={roles.map((r) => ({ value: r.id, label: r.name }))}
                        className="w-48"
                        searchPlaceholder="بحث في الأدوار..."
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => toggleActive(u.id)}
                          className={cn(
                            "relative h-7 w-12 rounded-full transition-colors",
                            active
                              ? "bg-brand-500"
                              : "bg-steel-300 dark:bg-steel-700",
                          )}
                          title={active ? "تعطيل المستخدم" : "تفعيل المستخدم"}
                        >
                          <span
                            className={cn(
                              "absolute top-1 h-5 w-5 rounded-full bg-white transition-all",
                              active ? "right-1" : "right-6",
                            )}
                          />
                        </button>
                        <span
                          className={cn(
                            "w-12 text-xs font-bold",
                            active
                              ? "text-brand-600 dark:text-brand-400"
                              : "text-steel-400",
                          )}
                        >
                          {active ? "مُفعّل" : "معطّل"}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {users.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            total={total}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
          />
        )}
      </Card>
    </div>
  );
}
