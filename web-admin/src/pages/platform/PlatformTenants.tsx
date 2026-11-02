import { useMemo, useState } from "react";
import { Building2, UserCog } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Input";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { usePlatform } from "../../store/PlatformStore";
import { formatShortDate } from "../../lib/format";
import type { TenantPlanId, TenantStatus } from "../../lib/types";
import { CLIENT_TYPE_META, MODULE_LABELS } from "../../lib/orgModules";

const STATUS_LABELS: Record<TenantStatus, string> = {
  active: "نشط",
  trial: "تجريبي",
  suspended: "موقوف",
};

export function PlatformTenants() {
  const {
    tenants,
    plans,
    orgAdminAssignments,
    updateTenantStatus,
    createOrganization,
    assignOrgAdmin,
  } = usePlatform();
  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? id;

  const [orgName, setOrgName] = useState("");
  const [sector, setSector] = useState("قطاع خاص");
  const [planId, setPlanId] = useState<TenantPlanId>("professional");
  const [createMsg, setCreateMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === planId),
    [plans, planId],
  );

  const [assignTenantId, setAssignTenantId] = useState(tenants[0]?.id ?? "");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [assignMsg, setAssignMsg] = useState("");

  const onCreate = async () => {
    setCreateMsg("");
    setBusy(true);
    const res = await createOrganization({
      name: orgName,
      sector,
      planId,
      seats: selectedPlan?.seatsIncluded ?? 25,
    });
    setBusy(false);
    if (!res.ok) {
      setCreateMsg(res.reason || "فشل الإنشاء.");
      return;
    }
    const typeLabel =
      CLIENT_TYPE_META[res.tenant?.clientType ?? "small"]?.label ?? "";
    setCreateMsg(
      `تم إنشاء المنشأة على خطة «${selectedPlan?.name}» (${typeLabel}). Org: ${res.tenant?.organizationId}`,
    );
    setOrgName("");
    if (res.tenant) setAssignTenantId(res.tenant.id);
  };

  const onAssign = async () => {
    setAssignMsg("");
    setBusy(true);
    const res = await assignOrgAdmin({
      tenantId: assignTenantId,
      name: adminName,
      email: adminEmail,
    });
    setBusy(false);
    if (!res.ok) {
      setAssignMsg(res.reason || "فشل التعيين.");
      return;
    }
    setAssignMsg("تم تعيين مسؤول المؤسسة.");
    setAdminName("");
    setAdminEmail("");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="المستأجرون"
        subtitle="إنشاء منشأة وتعيين مسؤول — نوع الجهة والوحدات تُعرَّف من الخطط والاشتراكات"
        icon={<Building2 className="h-6 w-6" />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 p-4">
          <p className="text-sm font-extrabold text-steel-800 dark:text-steel-100">
            إنشاء منظمة / مستأجر
          </p>
          <Field label="اسم المنشأة" required>
            <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          </Field>
          <Field label="القطاع">
            <Input value={sector} onChange={(e) => setSector(e.target.value)} />
          </Field>
          <Field label="خطة الاشتراك (تحدد الفئة والوحدات)" required>
            <SearchableSelect
              value={planId}
              onChange={(v) => setPlanId(v as TenantPlanId)}
              options={plans.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Field>
          {selectedPlan && (
            <div className="rounded-xl border border-steel-200 bg-steel-50 p-3 text-xs dark:border-steel-700 dark:bg-steel-800/50">
              <p className="font-bold text-steel-700 dark:text-steel-200">
                {CLIENT_TYPE_META[selectedPlan.clientType]?.label}
              </p>
              <p className="mt-1 text-steel-500">{selectedPlan.workflow}</p>
              <p className="mt-2 text-steel-500">
                وحدات:{" "}
                {Object.entries(selectedPlan.enabledModules)
                  .filter(([, on]) => on)
                  .map(([k]) => MODULE_LABELS[k as keyof typeof MODULE_LABELS])
                  .join(" · ") || "مشاريع ومهام فقط"}
              </p>
              <Link
                to="/plans"
                className="mt-2 inline-block font-bold text-brand-700 hover:underline dark:text-brand-300"
              >
                تعديل الخطط والوحدات
              </Link>
            </div>
          )}
          {createMsg && <p className="text-sm text-brand-600">{createMsg}</p>}
          <Button onClick={onCreate} disabled={busy}>
            إنشاء
          </Button>
        </Card>

        <Card className="space-y-3 p-4">
          <p className="flex items-center gap-2 text-sm font-extrabold text-steel-800 dark:text-steel-100">
            <UserCog className="h-4 w-4" />
            تعيين مسؤول المؤسسة
          </p>
          <Field label="المستأجر">
            <SearchableSelect
              value={assignTenantId}
              onChange={setAssignTenantId}
              options={tenants.map((t) => ({ value: t.id, label: t.name }))}
            />
          </Field>
          <Field label="اسم المسؤول" required>
            <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} />
          </Field>
          <Field label="البريد" required>
            <Input
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              dir="ltr"
            />
          </Field>
          {assignMsg && <p className="text-sm text-brand-600">{assignMsg}</p>}
          <Button variant="outline" onClick={onAssign} disabled={busy}>
            تعيين Org Admin
          </Button>
          {orgAdminAssignments.length > 0 && (
            <ul className="space-y-1 border-t border-steel-100 pt-3 text-xs text-steel-500 dark:border-steel-800">
              {orgAdminAssignments.slice(0, 5).map((a) => (
                <li key={a.id}>
                  {a.name} · {a.email} · {a.organizationId}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="border-b border-steel-200 bg-steel-50 text-start dark:border-steel-700 dark:bg-steel-800/60">
              <th className="px-4 py-3 font-bold">المنشأة</th>
              <th className="px-4 py-3 font-bold">الخطة / الفئة</th>
              <th className="px-4 py-3 font-bold">الوحدات</th>
              <th className="px-4 py-3 font-bold">الحالة</th>
              <th className="px-4 py-3 font-bold">المقاعد</th>
              <th className="px-4 py-3 font-bold">تاريخ الإنشاء</th>
              <th className="px-4 py-3 font-bold">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => {
              const plan = plans.find((p) => p.id === t.planId);
              const modules = t.enabledModules ?? plan?.enabledModules;
              return (
                <tr key={t.id} className="border-b border-steel-100 dark:border-steel-800">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-xs text-steel-500">{t.sector}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{planName(t.planId)}</p>
                    <p className="text-[11px] text-steel-400">
                      {CLIENT_TYPE_META[t.clientType]?.shortLabel ?? t.clientType}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-steel-500">
                    {modules
                      ? Object.entries(modules)
                          .filter(([, on]) => on)
                          .map(([k]) => MODULE_LABELS[k as keyof typeof MODULE_LABELS])
                          .join(" · ") || "مشاريع فقط"
                      : "—"}
                  </td>
                  <td className="px-4 py-3">{STATUS_LABELS[t.status]}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {t.usedSeats}/{t.seats}
                  </td>
                  <td className="px-4 py-3 text-xs text-steel-500">
                    {formatShortDate(t.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(Object.keys(STATUS_LABELS) as TenantStatus[]).map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant={t.status === s ? "primary" : "outline"}
                          onClick={() => updateTenantStatus(t.id, s)}
                        >
                          {STATUS_LABELS[s]}
                        </Button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
