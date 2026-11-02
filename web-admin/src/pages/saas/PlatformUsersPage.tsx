import { useState } from "react";
import { PageScaffold } from "../../components/sa/PageScaffold";
import { StatusPill } from "../../components/sa/StatusPill";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { useAuth } from "../../store/AuthContext";
import { usePlatform } from "../../store/PlatformStore";
import {
  PLATFORM_ROLE_LABELS,
  type PlatformRoleId,
} from "../../lib/platformDomain";
import { normalizePlatformRole } from "../../lib/platformRbac";

export function PlatformUsersPage() {
  const { users, toggleActive, setUserRole } = useAuth();
  const { invites, invitePlatformUser, revokeInvite, loginHistory } =
    usePlatform();
  const [tab, setTab] = useState<"users" | "invites" | "logins">("users");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "platform_admin" as PlatformRoleId,
  });

  return (
    <PageScaffold
      title="مستخدمو المنصة والصلاحيات"
      subtitle="منفصلون تماماً عن مستخدمي منشآت الكور"
      actions={
        <Button onClick={() => setOpen(true)}>دعوة مستخدم</Button>
      }
    >
      <div className="flex gap-1 border-b border-slate-200">
        {(
          [
            ["users", "المستخدمون"],
            ["invites", "الدعوات"],
            ["logins", "سجل الدخول"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3 py-2 text-xs font-bold ${
              tab === id ? "border-b-2 border-blue-600 text-blue-700" : "text-slate-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <div className="sa-surface overflow-x-auto">
          <table className="sa-table w-full min-w-[720px]">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-start">الاسم</th>
                <th className="px-3 py-2 text-start">البريد</th>
                <th className="px-3 py-2 text-start">الدور</th>
                <th className="px-3 py-2 text-start">الحالة</th>
                <th className="px-3 py-2 text-start">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const role = normalizePlatformRole(u.role);
                return (
                  <tr key={u.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-semibold">{u.name}</td>
                    <td className="px-3 py-2 text-sm">{u.email}</td>
                    <td className="px-3 py-2">
                      <SearchableSelect
                        value={role}
                        onChange={(v) => setUserRole(u.id, v)}
                        options={Object.entries(PLATFORM_ROLE_LABELS).map(
                          ([value, label]) => ({ value, label }),
                        )}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill
                        label={u.active === false ? "موقوف" : "نشط"}
                        tone={u.active === false ? "danger" : "success"}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Button size="sm" variant="outline" onClick={() => toggleActive(u.id)}>
                        {u.active === false ? "تفعيل" : "إيقاف"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "invites" && (
        <div className="sa-surface overflow-x-auto">
          <table className="sa-table w-full">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-start">الاسم</th>
                <th className="px-3 py-2 text-start">البريد</th>
                <th className="px-3 py-2 text-start">الدور</th>
                <th className="px-3 py-2 text-start">الحالة</th>
                <th className="px-3 py-2 text-start">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((i) => (
                <tr key={i.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">{i.name}</td>
                  <td className="px-3 py-2">{i.email}</td>
                  <td className="px-3 py-2">{PLATFORM_ROLE_LABELS[i.role]}</td>
                  <td className="px-3 py-2">{i.status}</td>
                  <td className="px-3 py-2">
                    {i.status === "pending" ? (
                      <Button size="sm" variant="ghost" onClick={() => revokeInvite(i.id)}>
                        إلغاء
                      </Button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "logins" && (
        <div className="sa-surface overflow-x-auto">
          <table className="sa-table w-full">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-start">الوقت</th>
                <th className="px-3 py-2 text-start">المستخدم</th>
                <th className="px-3 py-2 text-start">IP</th>
                <th className="px-3 py-2 text-start">النتيجة</th>
                <th className="px-3 py-2 text-start">التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {loginHistory.map((l) => (
                <tr key={l.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 text-xs">
                    {l.at.replace("T", " ").slice(0, 16)}
                  </td>
                  <td className="px-3 py-2">{l.userName}</td>
                  <td className="px-3 py-2 font-mono text-xs">{l.ip}</td>
                  <td className="px-3 py-2">
                    <StatusPill
                      label={l.success ? "نجاح" : "فشل"}
                      tone={l.success ? "success" : "danger"}
                    />
                  </td>
                  <td className="px-3 py-2 text-sm">{l.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="دعوة مستخدم منصة">
        <div className="space-y-3">
          <Field label="الاسم">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="البريد">
            <Input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="الدور">
            <SearchableSelect
              value={form.role}
              onChange={(v) => setForm({ ...form, role: v as PlatformRoleId })}
              options={Object.entries(PLATFORM_ROLE_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={() => {
                invitePlatformUser(form);
                setOpen(false);
              }}
            >
              إرسال الدعوة
            </Button>
          </div>
        </div>
      </Modal>
    </PageScaffold>
  );
}
