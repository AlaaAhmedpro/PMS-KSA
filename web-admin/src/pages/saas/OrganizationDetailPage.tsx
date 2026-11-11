import { useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { PageScaffold } from "../../components/sa/PageScaffold";
import {
  OrgStatusPill,
  SubStatusPill,
} from "../../components/sa/orgs/OrgStatusPill";
import { UsageCell } from "../../components/sa/orgs/UsageCell";
import { StatusPill } from "../../components/sa/StatusPill";
import { Button } from "../../components/ui/Button";
import { Field, Input, Textarea } from "../../components/ui/Input";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { usePlatform, formatSar } from "../../store/PlatformStore";
import { useAuth } from "../../store/AuthContext";
import { can } from "../../lib/platformRbac";
import {
  CUSTOMER_KIND_LABELS,
  DEPLOYMENT_LABELS,
  ENTITLEMENT_LABELS,
  SUB_STATUS_LABELS,
  effectiveLimits,
  type EntitlementKey,
  type LimitOverrides,
} from "../../lib/platformDomain";
import { daysUntil } from "../../lib/orgLifecycle";

const TABS = [
  { id: "overview", label: "نظرة عامة" },
  { id: "profile", label: "الملف" },
  { id: "subscription", label: "الاشتراك" },
  { id: "users", label: "المستخدمون" },
  { id: "usage", label: "الاستخدام والحدود" },
  { id: "billing", label: "الفوترة" },
  { id: "integrations", label: "التكاملات" },
  { id: "activity", label: "النشاط" },
  { id: "settings", label: "الإعدادات" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type ModalKind =
  | "suspend"
  | "reactivate"
  | "archive"
  | "support"
  | "limits"
  | "invite"
  | "more"
  | null;

export function OrganizationDetailPage() {
  const { id } = useParams();
  const {
    organizations,
    plans,
    subscriptions,
    invoices,
    tickets,
    auditEvents,
    orgUsers,
    supportSessions,
    updateOrganization,
    changeOrganizationPlan,
    extendTrial,
    assignOrgAdmin,
    updateTenantModules,
    suspendOrganization,
    reactivateOrganization,
    archiveOrganization,
    setLimitOverrides,
    startSupportAccess,
    endSupportAccess,
  } = usePlatform();
  const { user } = useAuth();
  const writable = can(user?.role, "organizations.write");
  const org = organizations.find((o) => o.id === id);
  const [tab, setTab] = useState<TabId>("overview");
  const [modal, setModal] = useState<ModalKind>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [suspendForm, setSuspendForm] = useState({
    reason: "",
    category: "billing",
    notes: "",
  });
  const [archiveReason, setArchiveReason] = useState("");
  const [supportForm, setSupportForm] = useState({
    reason: "",
    minutes: 60,
    readOnly: true,
  });
  const [limitsForm, setLimitsForm] = useState<LimitOverrides>({});
  const [adminForm, setAdminForm] = useState({
    name: "",
    email: "",
  });
  const [profileDraft, setProfileDraft] = useState<Record<string, string>>({});
  const [comparePlanId, setComparePlanId] = useState("");
  const [applyAtRenewal, setApplyAtRenewal] = useState(false);

  const plan = plans.find((p) => p.id === org?.planId);
  const sub = subscriptions.find((s) => s.organizationId === org?.id);
  const orgInvoices = invoices.filter((i) => i.organizationId === org?.id);
  const orgTickets = tickets.filter((t) => t.organizationId === org?.id);
  const orgAudit = auditEvents.filter((a) => a.organizationId === org?.id);
  const users = orgUsers.filter((u) => u.organizationId === org?.id);
  const sessions = supportSessions.filter(
    (s) => s.organizationId === org?.id && !s.endedAt,
  );
  const limits = effectiveLimits(plan, org?.limitOverrides);
  const comparePlan = plans.find((p) => p.id === (comparePlanId || org?.planId));

  const alerts = useMemo(() => {
    if (!org) return [] as string[];
    const list: string[] = [];
    if (org.status === "suspended") {
      list.push(
        `معلّقة: ${org.suspension?.reason || "بدون سبب مسجّل"}`,
      );
    }
    if (sub?.status === "past_due") list.push("اشتراك متأخر السداد.");
    if (sub?.status === "trial") {
      const d = daysUntil(org.trialEndsAt || sub.renewAt);
      if (d !== null && d <= 7)
        list.push(`الفترة التجريبية تنتهي خلال ${d} يوماً.`);
    }
    if (org.usage.storageGb / Math.max(1, limits.maxStorageGb) >= 0.85) {
      list.push("التخزين يقترب من الحد.");
    }
    if (org.provisioningStatus === "failed") {
      list.push("فشل تجهيز البيئة.");
    }
    const failedInv = orgInvoices.filter((i) => i.status === "failed");
    if (failedInv.length)
      list.push(`${failedInv.length} فاتورة بفشل دفع.`);
    return list;
  }, [org, sub, limits, orgInvoices]);

  if (!org) {
    return (
      <PageScaffold title="المنشأة غير موجودة">
        <Link to="/organizations" className="text-sm font-bold text-blue-600">
          العودة للقائمة
        </Link>
      </PageScaffold>
    );
  }

  const draft = {
    legalName: profileDraft.legalName ?? org.legalName ?? org.name,
    crNumber: profileDraft.crNumber ?? org.crNumber ?? "",
    vatNumber: profileDraft.vatNumber ?? org.vatNumber ?? "",
    nationalAddress: profileDraft.nationalAddress ?? org.nationalAddress ?? "",
    website: profileDraft.website ?? org.website ?? "",
    contactName: profileDraft.contactName ?? org.contactName ?? "",
    contactEmail: profileDraft.contactEmail ?? org.contactEmail ?? "",
    contactPhone: profileDraft.contactPhone ?? org.contactPhone ?? "",
    city: profileDraft.city ?? org.city,
    accountManagerName:
      profileDraft.accountManagerName ?? org.accountManagerName ?? "",
  };

  return (
    <PageScaffold
      title={org.name}
      subtitle={`${CUSTOMER_KIND_LABELS[org.customerKind]} · ${org.city} · ${DEPLOYMENT_LABELS[org.deploymentType]}`}
      actions={
        writable ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setTab("profile");
                setNotice(null);
              }}
            >
              تعديل
            </Button>
            <Button variant="outline" onClick={() => setTab("subscription")}>
              إدارة الاشتراك
            </Button>
            <Button variant="outline" onClick={() => setModal("invite")}>
              دعوة مسؤول
            </Button>
            <div className="relative">
              <Button variant="ghost" onClick={() => setModal(modal === "more" ? null : "more")}>
                المزيد
              </Button>
              {modal === "more" ? (
                <div className="absolute end-0 z-30 mt-1 w-52 rounded-md border border-slate-200 bg-white py-1 shadow-sm">
                  <MenuBtn
                    label="تعديل الحدود"
                    onClick={() => {
                      setLimitsForm({ ...org.limitOverrides });
                      setModal("limits");
                    }}
                  />
                  {org.status === "suspended" ? (
                    <MenuBtn
                      label="إعادة تفعيل"
                      onClick={() => setModal("reactivate")}
                    />
                  ) : org.status !== "archived" ? (
                    <MenuBtn
                      label="تعليق"
                      onClick={() => setModal("suspend")}
                    />
                  ) : null}
                  <MenuBtn
                    label="وصول دعم"
                    onClick={() => setModal("support")}
                  />
                  {org.status !== "archived" ? (
                    <MenuBtn
                      label="أرشفة"
                      danger
                      onClick={() => setModal("archive")}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null
      }
    >
      <div className="sa-surface flex flex-wrap items-center gap-3 p-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-100 text-sm font-extrabold text-slate-700">
          {org.logoInitials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-slate-900">{org.name}</p>
          <p className="text-xs text-slate-400">
            {org.id}
            {org.organizationId ? ` · ${org.organizationId}` : ""}
            {org.crNumber ? ` · س.ت ${org.crNumber}` : ""}
          </p>
        </div>
        <OrgStatusPill status={org.status} />
        {sub ? <SubStatusPill status={sub.status} /> : null}
        <StatusPill label={plan?.name || org.planId} tone="neutral" />
      </div>

      {sessions.length > 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          جلسة دعم نشطة حتى {sessions[0].endsAt.replace("T", " ").slice(0, 16)} —{" "}
          {sessions[0].readOnly ? "قراءة فقط" : "صلاحية موسّعة"} ·{" "}
          {sessions[0].reason}
          {writable ? (
            <button
              type="button"
              className="ms-2 font-bold underline"
              onClick={() => endSupportAccess(sessions[0].id)}
            >
              إنهاء الجلسة
            </button>
          ) : null}
        </div>
      ) : null}

      {notice ? (
        <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          {notice}
        </p>
      ) : null}

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-t-md px-3 py-2 text-xs font-bold ${
              tab === t.id
                ? "border border-b-white border-slate-200 bg-white text-blue-700"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="sa-surface p-4">
        {tab === "overview" && (
          <div className="space-y-4">
            {alerts.length > 0 ? (
              <ul className="space-y-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {alerts.map((a) => (
                  <li key={a}>• {a}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">لا تنبيهات تشغيلية حالياً.</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <UsageCell used={org.usage.users} max={limits.maxUsers} />
              <UsageCell used={org.usage.projects} max={limits.maxProjects} />
              <UsageCell
                used={org.usage.storageGb}
                max={limits.maxStorageGb}
                unit="GB"
              />
              <div className="text-sm">
                <p className="text-xs font-semibold text-slate-500">التجهيز</p>
                <p className="mt-1 font-bold">
                  {org.provisioningStatus === "succeeded"
                    ? "ناجح"
                    : org.provisioningStatus === "running"
                      ? "جارٍ"
                      : org.provisioningStatus === "failed"
                        ? "فشل"
                        : "خامل"}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  التجديد: {(org.renewalAt || org.trialEndsAt || "—").slice(0, 10)}
                </p>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-extrabold">آخر الفواتير</h4>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                {orgInvoices.slice(0, 3).map((inv) => (
                  <li key={inv.id}>
                    {inv.number} · {formatSar(inv.totalSar)} · {inv.status}
                  </li>
                ))}
                {orgInvoices.length === 0 ? <li>لا فواتير.</li> : null}
              </ul>
            </div>
          </div>
        )}

        {tab === "profile" && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["legalName", "الاسم القانوني"],
                  ["crNumber", "السجل التجاري"],
                  ["vatNumber", "الرقم الضريبي"],
                  ["nationalAddress", "العنوان الوطني"],
                  ["website", "الموقع"],
                  ["city", "المدينة"],
                  ["contactName", "جهة الاتصال"],
                  ["contactEmail", "بريد التواصل"],
                  ["contactPhone", "الجوال"],
                  ["accountManagerName", "مدير الحساب"],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <Input
                    disabled={!writable}
                    value={draft[key]}
                    onChange={(e) =>
                      setProfileDraft({ ...profileDraft, [key]: e.target.value })
                    }
                  />
                </Field>
              ))}
            </div>
            {writable ? (
              <Button
                onClick={() => {
                  updateOrganization(org.id, {
                    legalName: draft.legalName,
                    crNumber: draft.crNumber,
                    vatNumber: draft.vatNumber,
                    nationalAddress: draft.nationalAddress,
                    website: draft.website,
                    city: draft.city,
                    contactName: draft.contactName,
                    contactEmail: draft.contactEmail,
                    contactPhone: draft.contactPhone,
                    accountManagerName: draft.accountManagerName,
                  });
                  setNotice("تم حفظ الملف وتسجيل التدقيق.");
                  setProfileDraft({});
                }}
              >
                حفظ الملف
              </Button>
            ) : null}
          </div>
        )}

        {tab === "subscription" && (
          <div className="space-y-4">
            <p className="text-sm">
              الحالة:{" "}
              <strong>
                {sub ? SUB_STATUS_LABELS[sub.status] : "—"}
              </strong>{" "}
              · الدورة: {sub?.billingCycle === "annual" ? "سنوي" : "شهري"} · MRR{" "}
              {formatSar(sub?.mrrSar || 0)}
            </p>
            {sub?.status === "trial" && writable ? (
              <Button variant="outline" onClick={() => extendTrial(org.id, 14)}>
                تمديد التجربة 14 يوماً
              </Button>
            ) : null}
            {writable ? (
              <div className="rounded-md border border-slate-200 p-3">
                <h4 className="text-sm font-extrabold">تغيير الخطة</h4>
                <div className="mt-2 grid gap-3 lg:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-semibold text-slate-500">
                      الحالية
                    </p>
                    <PlanCard planId={org.planId} plans={plans} />
                  </div>
                  <div>
                    <Field label="الخطة المقترحة">
                      <SearchableSelect
                        value={comparePlanId || org.planId}
                        onChange={setComparePlanId}
                        options={plans.map((p) => ({
                          value: p.id,
                          label: p.name,
                        }))}
                      />
                    </Field>
                    {comparePlan ? (
                      <PlanCard planId={comparePlan.id} plans={plans} />
                    ) : null}
                  </div>
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={applyAtRenewal}
                    onChange={(e) => setApplyAtRenewal(e.target.checked)}
                  />
                  تطبيق عند التجديد (تسجيل نية فقط في الديمو)
                </label>
                <Button
                  className="mt-3"
                  disabled={!comparePlanId || comparePlanId === org.planId}
                  onClick={() => {
                    if (applyAtRenewal) {
                      setNotice(
                        `تم تسجيل تغيير الخطة إلى ${comparePlan?.name} عند التجديد.`,
                      );
                    } else {
                      changeOrganizationPlan(org.id, comparePlanId);
                      setNotice("تم تغيير الخطة فوراً.");
                    }
                  }}
                >
                  تأكيد تغيير الخطة
                </Button>
              </div>
            ) : null}
            <ul className="space-y-1 text-sm text-slate-600">
              {(sub?.history || []).map((h, i) => (
                <li key={i}>
                  {h.at.slice(0, 10)} — {h.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "users" && (
          <div className="space-y-3">
            <table className="sa-table w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-start">الاسم</th>
                  <th className="py-2 text-start">البريد</th>
                  <th className="py-2 text-start">الدور</th>
                  <th className="py-2 text-start">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100">
                    <td className="py-2">
                      <span className="font-semibold">{u.name}</span>
                      {u.jobTitle ? (
                        <span className="block text-[11px] text-slate-400">
                          {u.jobTitle}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2">{u.email}</td>
                    <td className="py-2">{u.role}</td>
                    <td className="py-2">
                      <StatusPill
                        label={
                          u.status === "active"
                            ? "نشط"
                            : u.status === "invited"
                              ? "مدعو"
                              : "محظور"
                        }
                        tone={
                          u.status === "active"
                            ? "success"
                            : u.status === "invited"
                              ? "info"
                              : "danger"
                        }
                      />
                    </td>
                  </tr>
                ))}
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-slate-400">
                      لا مستخدمين مسجّلين لهذه المنشأة.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            {writable ? (
              <Button variant="outline" onClick={() => setModal("invite")}>
                دعوة مسؤول
              </Button>
            ) : null}
          </div>
        )}

        {tab === "usage" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Metric
                label={`مستخدمون (حد ${limits.maxUsers})`}
                value={String(org.usage.users)}
                pct={Math.min(
                  100,
                  Math.round(
                    (org.usage.users / Math.max(1, limits.maxUsers)) * 100,
                  ),
                )}
              />
              <Metric
                label={`مشاريع (حد ${limits.maxProjects})`}
                value={String(org.usage.projects)}
                pct={Math.min(
                  100,
                  Math.round(
                    (org.usage.projects / Math.max(1, limits.maxProjects)) * 100,
                  ),
                )}
              />
              <Metric
                label={`تخزين (حد ${limits.maxStorageGb} GB)`}
                value={`${org.usage.storageGb}`}
                pct={Math.min(
                  100,
                  Math.round(
                    (org.usage.storageGb / Math.max(1, limits.maxStorageGb)) *
                      100,
                  ),
                )}
              />
              <Metric
                label={`API (حد ${limits.maxApiRequests})`}
                value={String(org.usage.apiRequests)}
                pct={Math.min(
                  100,
                  Math.round(
                    (org.usage.apiRequests /
                      Math.max(1, limits.maxApiRequests)) *
                      100,
                  ),
                )}
              />
            </div>
            {org.limitOverrides ? (
              <p className="text-xs text-slate-500">
                تجاوز حدود نشط
                {org.limitOverrides.reason
                  ? `: ${org.limitOverrides.reason}`
                  : ""}
                {org.limitOverrides.at
                  ? ` · ${org.limitOverrides.at.slice(0, 10)}`
                  : ""}
              </p>
            ) : null}
            {writable ? (
              <Button
                variant="outline"
                onClick={() => {
                  setLimitsForm({ ...org.limitOverrides });
                  setModal("limits");
                }}
              >
                تعديل التجاوزات
              </Button>
            ) : null}
          </div>
        )}

        {tab === "billing" && (
          <table className="sa-table w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-start">الفاتورة</th>
                <th className="py-2 text-start">الاستحقاق</th>
                <th className="py-2 text-start">المبلغ</th>
                <th className="py-2 text-start">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {orgInvoices.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-100">
                  <td className="py-2">{inv.number}</td>
                  <td className="py-2">{inv.dueDate}</td>
                  <td className="py-2">{formatSar(inv.totalSar)}</td>
                  <td className="py-2">
                    <StatusPill
                      label={inv.status}
                      tone={
                        inv.status === "paid"
                          ? "success"
                          : inv.status === "failed"
                            ? "danger"
                            : inv.status === "open"
                              ? "warning"
                              : "neutral"
                      }
                    />
                  </td>
                </tr>
              ))}
              {orgInvoices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-slate-400">
                    لا فواتير.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}

        {tab === "integrations" && (
          <ul className="space-y-2 text-sm">
            {[
              "Qiwa",
              "GOSI",
              "Mudad",
              "Muqeem",
              "Absher",
              "ZATCA (جاهزية)",
            ].map((name) => (
              <li
                key={name}
                className="flex justify-between rounded-md border border-slate-200 px-3 py-2"
              >
                <span className="font-semibold">{name}</span>
                <StatusPill label="جاهزية / تسمية" tone="info" />
              </li>
            ))}
            <p className="text-xs text-slate-400">
              لا تُعرض أسرار أو مفاتيح في هذه الشاشة.
            </p>
          </ul>
        )}

        {tab === "activity" && (
          <ul className="space-y-2 text-sm">
            {[
              ...orgAudit.map((a) => ({
                id: a.id,
                at: a.at,
                text: a.action,
                meta: `${a.actorName} · ${a.result}`,
              })),
              ...(sub?.history || []).map((h, i) => ({
                id: `sub-${i}`,
                at: h.at,
                text: h.text,
                meta: "اشتراك",
              })),
            ]
              .sort((a, b) => (a.at < b.at ? 1 : -1))
              .map((e) => (
                <li
                  key={e.id}
                  className="rounded-md border border-slate-100 px-3 py-2"
                >
                  <span className="font-semibold">{e.text}</span>
                  <span className="ms-2 text-slate-400">
                    {e.at.replace("T", " ").slice(0, 16)}
                  </span>
                  <p className="text-xs text-slate-500">{e.meta}</p>
                </li>
              ))}
            {orgAudit.length === 0 && !(sub?.history || []).length ? (
              <li className="text-slate-400">لا نشاط مسجّل.</li>
            ) : null}
          </ul>
        )}

        {tab === "settings" && (
          <div className="space-y-3">
            <Field label="لغة الواجهة">
              <SearchableSelect
                value={org.settings?.language || "ar"}
                onChange={(v) =>
                  updateOrganization(org.id, {
                    settings: {
                      language: v as "ar" | "en",
                      timezone: org.settings?.timezone || "Asia/Riyadh",
                      notifyBilling: org.settings?.notifyBilling ?? true,
                    },
                  })
                }
                options={[
                  { value: "ar", label: "العربية" },
                  { value: "en", label: "English" },
                ]}
              />
            </Field>
            <Field label="المنطقة الزمنية">
              <Input
                value={org.settings?.timezone || "Asia/Riyadh"}
                onChange={(e) =>
                  updateOrganization(org.id, {
                    settings: {
                      language: org.settings?.language || "ar",
                      timezone: e.target.value,
                      notifyBilling: org.settings?.notifyBilling ?? true,
                    },
                  })
                }
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={org.settings?.notifyBilling ?? true}
                onChange={(e) =>
                  updateOrganization(org.id, {
                    settings: {
                      language: org.settings?.language || "ar",
                      timezone: org.settings?.timezone || "Asia/Riyadh",
                      notifyBilling: e.target.checked,
                    },
                  })
                }
              />
              إشعارات الفوترة
            </label>
            <p className="mt-4 text-sm font-extrabold">وحدات الكور</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  "portfolio",
                  "program",
                  "initiative",
                  "strategicObjectives",
                ] as EntitlementKey[]
              ).map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    disabled={!writable}
                    checked={
                      !!org.enabledModules[
                        key as keyof typeof org.enabledModules
                      ]
                    }
                    onChange={(e) =>
                      updateTenantModules(org.id, {
                        [key]: e.target.checked,
                      })
                    }
                  />
                  {ENTITLEMENT_LABELS[key]}
                </label>
              ))}
            </div>
            {orgTickets.length > 0 ? (
              <div>
                <p className="mt-4 text-sm font-extrabold">تذاكر مرتبطة</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {orgTickets.slice(0, 5).map((t) => (
                    <li key={t.id}>
                      <Link
                        to="/support"
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        {t.number} — {t.subject}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {modal === "suspend" ? (
        <ModalShell
          title="تعليق المنشأة"
          onClose={() => setModal(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setModal(null)}>
                إلغاء
              </Button>
              <Button
                variant="danger"
                disabled={!suspendForm.reason.trim()}
                onClick={() => {
                  const res = suspendOrganization(org.id, {
                    reason: suspendForm.reason.trim(),
                    category: suspendForm.category,
                    notes: suspendForm.notes,
                    at: new Date().toISOString(),
                    notifyAdmin: true,
                  });
                  setNotice(
                    res.ok
                      ? "تم التعليق ومنع دخول الكور."
                      : res.reason || "تعذّر التعليق",
                  );
                  setModal(null);
                }}
              >
                تأكيد التعليق
              </Button>
            </>
          }
        >
          <p className="mb-3 text-sm text-slate-600">
            سيُمنع مستخدمو المنشأة من دخول الكور دون حذف البيانات.
          </p>
          <Field label="الفئة">
            <SearchableSelect
              value={suspendForm.category}
              onChange={(v) =>
                setSuspendForm({ ...suspendForm, category: v })
              }
              options={[
                { value: "billing", label: "فوترة" },
                { value: "policy", label: "سياسة / امتثال" },
                { value: "security", label: "أمن" },
                { value: "request", label: "طلب العميل" },
                { value: "other", label: "أخرى" },
              ]}
            />
          </Field>
          <Field label="السبب" className="mt-3">
            <Input
              value={suspendForm.reason}
              onChange={(e) =>
                setSuspendForm({ ...suspendForm, reason: e.target.value })
              }
            />
          </Field>
          <Field label="ملاحظات" className="mt-3">
            <Textarea
              value={suspendForm.notes}
              onChange={(e) =>
                setSuspendForm({ ...suspendForm, notes: e.target.value })
              }
            />
          </Field>
        </ModalShell>
      ) : null}

      {modal === "reactivate" ? (
        <ModalShell
          title="إعادة تفعيل المنشأة"
          onClose={() => setModal(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setModal(null)}>
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  const res = reactivateOrganization(org.id);
                  setNotice(
                    res.ok
                      ? "تم إعادة التفعيل."
                      : res.reason || "تعذّر التفعيل",
                  );
                  setModal(null);
                }}
              >
                تأكيد
              </Button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            سيتم التحقق من حالة الاشتراك والفواتير قبل التفعيل. الاشتراك المتأخر
            يمنع التفعيل.
          </p>
          <p className="mt-2 text-sm">
            الاشتراك:{" "}
            <strong>{sub ? SUB_STATUS_LABELS[sub.status] : "—"}</strong>
          </p>
        </ModalShell>
      ) : null}

      {modal === "archive" ? (
        <ModalShell
          title="أرشفة المنشأة"
          onClose={() => setModal(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setModal(null)}>
                إلغاء
              </Button>
              <Button
                variant="danger"
                disabled={!archiveReason.trim()}
                onClick={() => {
                  const openInv = orgInvoices.filter(
                    (i) => i.status === "open" || i.status === "failed",
                  );
                  if (openInv.length && !archiveReason.includes("مراجعة")) {
                    setNotice(
                      `تنبيه: يوجد ${openInv.length} فاتورة مفتوحة/فاشلة. أضف «مراجعة» في السبب للمتابعة إن لزم.`,
                    );
                  }
                  const res = archiveOrganization(org.id, archiveReason.trim());
                  setNotice(
                    res.ok ? "تمت الأرشفة." : res.reason || "تعذّرت الأرشفة",
                  );
                  setModal(null);
                }}
              >
                أرشفة
              </Button>
            </>
          }
        >
          <p className="mb-2 text-sm text-slate-600">
            الفواتير المفتوحة:{" "}
            {
              orgInvoices.filter(
                (i) => i.status === "open" || i.status === "failed",
              ).length
            }
          </p>
          <Field label="سبب الأرشفة">
            <Input
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
            />
          </Field>
        </ModalShell>
      ) : null}

      {modal === "support" ? (
        <ModalShell
          title="وصول الدعم"
          onClose={() => setModal(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setModal(null)}>
                إلغاء
              </Button>
              <Button
                disabled={!supportForm.reason.trim()}
                onClick={() => {
                  const session = startSupportAccess({
                    organizationId: org.id,
                    reason: supportForm.reason,
                    minutes: supportForm.minutes,
                    readOnly: supportForm.readOnly,
                  });
                  setNotice(
                    session
                      ? `جلسة دعم مسجّلة (${session.id}). الدخول الصامت للكور غير مفعّل في هذه المرحلة — استخدم السجل والتعليمات الداخلية.`
                      : "تعذّر إنشاء الجلسة.",
                  );
                  setModal(null);
                }}
              >
                بدء الجلسة
              </Button>
            </>
          }
        >
          <Field label="السبب">
            <Input
              value={supportForm.reason}
              onChange={(e) =>
                setSupportForm({ ...supportForm, reason: e.target.value })
              }
            />
          </Field>
          <Field label="المدة (دقيقة)" className="mt-3">
            <Input
              type="number"
              value={supportForm.minutes}
              onChange={(e) =>
                setSupportForm({
                  ...supportForm,
                  minutes: Number(e.target.value) || 60,
                })
              }
            />
          </Field>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={supportForm.readOnly}
              onChange={(e) =>
                setSupportForm({
                  ...supportForm,
                  readOnly: e.target.checked,
                })
              }
            />
            قراءة فقط (افتراضي)
          </label>
        </ModalShell>
      ) : null}

      {modal === "limits" ? (
        <ModalShell
          title="تجاوز حدود الخطة"
          onClose={() => setModal(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setModal(null)}>
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  setLimitOverrides(org.id, {
                    ...limitsForm,
                    at: new Date().toISOString(),
                  });
                  setNotice("تم حفظ تجاوزات الحدود.");
                  setModal(null);
                }}
              >
                حفظ
              </Button>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["maxUsers", "المستخدمون"],
                ["maxProjects", "المشاريع"],
                ["maxStorageGb", "التخزين GB"],
                ["maxApiRequests", "طلبات API"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <Input
                  type="number"
                  value={limitsForm[key] ?? limits[key]}
                  onChange={(e) =>
                    setLimitsForm({
                      ...limitsForm,
                      [key]: Number(e.target.value),
                    })
                  }
                />
              </Field>
            ))}
          </div>
          <Field label="السبب" className="mt-3">
            <Input
              value={limitsForm.reason || ""}
              onChange={(e) =>
                setLimitsForm({ ...limitsForm, reason: e.target.value })
              }
            />
          </Field>
        </ModalShell>
      ) : null}

      {modal === "invite" ? (
        <ModalShell
          title="دعوة مسؤول منشأة"
          onClose={() => setModal(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setModal(null)}>
                إلغاء
              </Button>
              <Button
                onClick={async () => {
                  const res = await assignOrgAdmin({
                    tenantId: org.id,
                    name: adminForm.name,
                    email: adminForm.email,
                  });
                  setNotice(
                    res.ok
                      ? "تم تعيين المسؤول ومزامنة الكور (دعوة بدون كلمة مرور في الديمو)."
                      : res.reason || "فشل",
                  );
                  setModal(null);
                }}
              >
                إرسال الدعوة
              </Button>
            </>
          }
        >
          <Field label="الاسم">
            <Input
              value={adminForm.name}
              onChange={(e) =>
                setAdminForm({ ...adminForm, name: e.target.value })
              }
            />
          </Field>
          <Field label="البريد" className="mt-3">
            <Input
              value={adminForm.email}
              onChange={(e) =>
                setAdminForm({ ...adminForm, email: e.target.value })
              }
            />
          </Field>
        </ModalShell>
      ) : null}
    </PageScaffold>
  );
}

function MenuBtn({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={`block w-full px-3 py-1.5 text-start text-xs font-semibold hover:bg-slate-50 ${
        danger ? "text-red-600" : "text-slate-700"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function ModalShell({
  title,
  children,
  footer,
  onClose,
}: {
  title: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="إغلاق"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-md border border-slate-200 bg-white p-4 shadow-lg">
        <h3 className="text-sm font-extrabold">{title}</h3>
        <div className="mt-3">{children}</div>
        <div className="mt-4 flex justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}

function PlanCard({
  planId,
  plans,
}: {
  planId: string;
  plans: ReturnType<typeof usePlatform>["plans"];
}) {
  const p = plans.find((x) => x.id === planId);
  if (!p) return null;
  return (
    <div className="mt-2 rounded-md border border-slate-200 p-3 text-xs">
      <p className="font-extrabold text-sm">{p.name}</p>
      <p className="mt-1 text-slate-500">
        {formatSar(p.priceMonthly)} / شهر
        {p.priceAnnual != null
          ? ` · ${formatSar(p.priceAnnual)} / سنة`
          : ""}
      </p>
      <p className="mt-2 text-slate-600">
        حدود: {p.limits.maxUsers} مستخدم · {p.limits.maxProjects} مشروع ·{" "}
        {p.limits.maxStorageGb} GB
      </p>
      <ul className="mt-2 space-y-0.5 text-slate-500">
        {p.features.slice(0, 4).map((f) => (
          <li key={f}>• {f}</li>
        ))}
      </ul>
    </div>
  );
}

function Metric({
  label,
  value,
  pct,
}: {
  label: string;
  value: string;
  pct: number;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="font-semibold text-slate-600">{label}</span>
        <span className="font-extrabold tabular-nums">{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-100">
        <div
          className={`h-full rounded ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-blue-600"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-slate-400">{pct}% من الحد</p>
    </div>
  );
}
