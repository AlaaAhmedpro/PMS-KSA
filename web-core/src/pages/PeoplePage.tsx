import { useState } from "react";
import { Users, UserPlus } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Input";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { useAuth } from "../store/AuthContext";
import { useHierarchy } from "../store/HierarchyStore";
import { useCan, useRbac } from "../store/RbacContext";
import type { CoreRoleId } from "../models/domain";

export function PeoplePage() {
  const { users, setUserRole, organization, provisionFromInvite } = useAuth();
  const { invites, projects, addInvite, acceptInvite, addProjectMember } = useHierarchy();
  const can = useCan();
  const { roles } = useRbac();
  const { user } = useAuth();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<CoreRoleId>("member");
  const [projectId, setProjectId] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [msg, setMsg] = useState("");

  if (!can.managePeople(user?.role)) {
    return (
      <Card className="p-6">
        <p className="text-sm text-steel-500">ليس لديك صلاحية إدارة الأعضاء.</p>
      </Card>
    );
  }

  const sendInvite = () => {
    setMsg("");
    if (!email.trim() || !name.trim()) {
      setMsg("الاسم والبريد مطلوبان.");
      return;
    }
    const inv = addInvite({
      organizationId: organization?.id || "org-namaa",
      email: email.trim(),
      name: name.trim(),
      role,
      projectId: projectId || undefined,
    });
    setMsg(`تم إنشاء الدعوة. رمز Demo: ${inv.token}`);
    setEmail("");
    setName("");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="الأعضاء والدعوات"
        subtitle="محاكاة دعوة الموظفين وتحديد الأدوار وعضوية المشاريع"
        icon={<Users className="h-6 w-6" />}
      />

      <Card className="space-y-3">
        <p className="flex items-center gap-2 text-sm font-bold">
          <UserPlus className="h-4 w-4" />
          إرسال دعوة (Demo)
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="الاسم" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="البريد" required>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
          </Field>
          <Field label="الدور">
            <SearchableSelect
              value={role}
              onChange={(v) => setRole(v as CoreRoleId)}
              options={roles
                .filter((r) =>
                  ["member", "project_manager", "external", "pr"].includes(String(r.id)),
                )
                .map((r) => ({ value: String(r.id), label: r.name }))}
            />
          </Field>
          <Field label="مشروع (اختياري لمدير المشروع / خارجي)">
            <SearchableSelect
              value={projectId}
              onChange={setProjectId}
              options={[
                { value: "", label: "بدون مشروع محدد" },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </Field>
        </div>
        {msg && <p className="text-sm text-brand-600">{msg}</p>}
        <Button onClick={sendInvite}>إنشاء دعوة</Button>
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-bold">قبول دعوة (محاكاة العضو)</p>
        <div className="flex flex-wrap gap-2">
          <Input
            value={inviteToken}
            onChange={(e) => setInviteToken(e.target.value)}
            placeholder="الصق رمز الدعوة"
            className="max-w-xs"
            dir="ltr"
          />
          <Button
            variant="outline"
            onClick={() => {
              const res = acceptInvite(inviteToken.trim());
              if (!res.ok || !res.invite) {
                setMsg(res.reason || "فشل");
                return;
              }
              const provisioned = provisionFromInvite(res.invite);
              if (!provisioned.ok) {
                setMsg(provisioned.reason || "تعذّر إنشاء المستخدم.");
                return;
              }
              if (res.invite.projectId && provisioned.user) {
                addProjectMember(res.invite.projectId, provisioned.user.id);
              }
              setMsg("تم قبول الدعوة وإنشاء المستخدم في Demo.");
            }}
          >
            قبول
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-steel-100 px-4 py-3 text-sm font-extrabold dark:border-steel-800">
            المستخدمون
          </div>
          <ul className="divide-y divide-steel-100 dark:divide-steel-800">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold">{u.name}</p>
                  <p className="text-xs text-steel-500" dir="ltr">
                    {u.email}
                  </p>
                </div>
                <SearchableSelect
                  value={String(u.role)}
                  onChange={(v) => setUserRole(u.id, v)}
                  options={roles.map((r) => ({ value: String(r.id), label: r.name }))}
                  className="min-w-[140px]"
                />
              </li>
            ))}
          </ul>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-steel-100 px-4 py-3 text-sm font-extrabold dark:border-steel-800">
            الدعوات
          </div>
          <ul className="divide-y divide-steel-100 dark:divide-steel-800">
            {invites.map((inv) => (
              <li key={inv.id} className="px-4 py-3 text-sm">
                <p className="font-semibold">
                  {inv.name} · {inv.role}
                </p>
                <p className="text-xs text-steel-500" dir="ltr">
                  {inv.email}
                </p>
                <p className="text-[11px] text-steel-400">
                  الحالة: {inv.status} · token: {inv.token}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
