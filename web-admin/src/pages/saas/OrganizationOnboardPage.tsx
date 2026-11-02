import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageScaffold } from "../../components/sa/PageScaffold";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Input";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { usePlatform } from "../../store/PlatformStore";
import { useAuth } from "../../store/AuthContext";
import { can } from "../../lib/platformRbac";
import {
  CUSTOMER_KIND_LABELS,
  DEPLOYMENT_LABELS,
  formatSar,
  type OrgCustomerKind,
  type OrgDeploymentType,
} from "../../lib/platformDomain";
import type { OrgClientType } from "../../lib/types";

const STEPS = [
  "البيانات الأساسية",
  "الاشتراك والنشر",
  "المسؤول الرئيسي",
  "مراجعة وإنشاء",
] as const;

export function OrganizationOnboardPage() {
  const { organizations, plans, onboardOrganization } = usePlatform();
  const { user } = useAuth();
  const writable = can(user?.role, "organizations.write");
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const [basic, setBasic] = useState({
    name: "",
    legalName: "",
    crNumber: "",
    vatNumber: "",
    nationalAddress: "",
    city: "الرياض",
    website: "",
    industry: "إدارة مشاريع",
    sector: "قطاع خاص",
    customerKind: "standard" as OrgCustomerKind,
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });

  const [subForm, setSubForm] = useState({
    planId: "starter",
    billingCycle: "monthly" as "monthly" | "annual",
    subscriptionMode: "trial" as "trial" | "paid",
    deploymentType: "shared" as OrgDeploymentType,
    clientType: "small" as OrgClientType,
  });

  const [admin, setAdmin] = useState({
    name: "",
    email: "",
    phone: "",
    jobTitle: "مسؤول المؤسسة",
  });
  const [sendInvite, setSendInvite] = useState(true);

  const plan = plans.find((p) => p.id === subForm.planId) || plans[0];

  const duplicate = useMemo(() => {
    const name = basic.name.trim();
    const cr = basic.crNumber.trim();
    if (!name && !cr) return null;
    return organizations.find(
      (o) =>
        (name && o.name === name) || (cr && o.crNumber && o.crNumber === cr),
    );
  }, [organizations, basic.name, basic.crNumber]);

  if (!writable) {
    return (
      <PageScaffold title="إضافة منشأة">
        <p className="text-sm text-slate-500">لا صلاحية للإنشاء.</p>
        <Link to="/organizations" className="text-sm font-bold text-blue-600">
          العودة
        </Link>
      </PageScaffold>
    );
  }

  const canNext =
    step === 0
      ? basic.name.trim().length > 1 && !duplicate
      : step === 1
        ? !!subForm.planId
        : step === 2
          ? admin.name.trim() && admin.email.includes("@")
          : true;

  const submit = async () => {
    setBusy(true);
    setError(null);
    setProgress(15);
    const tick = window.setInterval(() => {
      setProgress((p) => Math.min(90, p + 12));
    }, 200);
    const res = await onboardOrganization({
      org: {
        name: basic.name.trim(),
        legalName: basic.legalName.trim() || basic.name.trim(),
        logoInitials: basic.name.trim().slice(0, 2),
        sector: basic.sector,
        industry: basic.industry,
        country: "السعودية",
        city: basic.city,
        website: basic.website || undefined,
        crNumber: basic.crNumber || undefined,
        vatNumber: basic.vatNumber || undefined,
        nationalAddress: basic.nationalAddress || undefined,
        contactName: basic.contactName || admin.name,
        contactEmail: basic.contactEmail || admin.email,
        contactPhone: basic.contactPhone || admin.phone,
        customerKind: basic.customerKind,
        clientType: subForm.clientType,
        deploymentType: subForm.deploymentType,
        planId: subForm.planId,
        accountManagerName: user?.name || "لمى سعد القحطاني",
      },
      subscriptionMode: subForm.subscriptionMode,
      billingCycle: subForm.billingCycle,
      admin: {
        name: admin.name.trim(),
        email: admin.email.trim(),
        phone: admin.phone,
        jobTitle: admin.jobTitle,
      },
      sendInvite,
    });
    window.clearInterval(tick);
    setProgress(100);
    setBusy(false);
    if (!res.ok || !res.orgId) {
      setError(res.reason || "تعذّر الإنشاء");
      setProgress(0);
      return;
    }
    navigate(`/organizations/${res.orgId}`);
  };

  return (
    <PageScaffold
      title="تهيئة منشأة جديدة"
      subtitle="معالج تسجيل عميل مع محاكاة التجهيز ومزامنة الكور"
      actions={
        <Link to="/organizations">
          <Button variant="outline">إلغاء</Button>
        </Link>
      }
    >
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`rounded border px-3 py-1.5 text-xs font-bold ${
              i === step
                ? "border-blue-300 bg-blue-50 text-blue-800"
                : i < step
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 text-slate-400"
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      <div className="sa-surface space-y-4 p-4">
        {step === 0 && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="اسم المنشأة" required>
                <Input
                  value={basic.name}
                  onChange={(e) =>
                    setBasic({ ...basic, name: e.target.value })
                  }
                />
              </Field>
              <Field label="الاسم القانوني">
                <Input
                  value={basic.legalName}
                  onChange={(e) =>
                    setBasic({ ...basic, legalName: e.target.value })
                  }
                />
              </Field>
              <Field label="السجل التجاري">
                <Input
                  value={basic.crNumber}
                  onChange={(e) =>
                    setBasic({ ...basic, crNumber: e.target.value })
                  }
                />
              </Field>
              <Field label="الرقم الضريبي">
                <Input
                  value={basic.vatNumber}
                  onChange={(e) =>
                    setBasic({ ...basic, vatNumber: e.target.value })
                  }
                />
              </Field>
              <Field label="العنوان الوطني" className="sm:col-span-2">
                <Input
                  value={basic.nationalAddress}
                  onChange={(e) =>
                    setBasic({ ...basic, nationalAddress: e.target.value })
                  }
                />
              </Field>
              <Field label="المدينة">
                <Input
                  value={basic.city}
                  onChange={(e) =>
                    setBasic({ ...basic, city: e.target.value })
                  }
                />
              </Field>
              <Field label="الموقع">
                <Input
                  value={basic.website}
                  onChange={(e) =>
                    setBasic({ ...basic, website: e.target.value })
                  }
                />
              </Field>
              <Field label="القطاع">
                <Input
                  value={basic.sector}
                  onChange={(e) =>
                    setBasic({ ...basic, sector: e.target.value })
                  }
                />
              </Field>
              <Field label="الصناعة">
                <Input
                  value={basic.industry}
                  onChange={(e) =>
                    setBasic({ ...basic, industry: e.target.value })
                  }
                />
              </Field>
              <Field label="نوع العميل">
                <SearchableSelect
                  value={basic.customerKind}
                  onChange={(v) =>
                    setBasic({
                      ...basic,
                      customerKind: v as OrgCustomerKind,
                    })
                  }
                  options={Object.entries(CUSTOMER_KIND_LABELS).map(
                    ([value, label]) => ({ value, label }),
                  )}
                />
              </Field>
              <Field label="جهة الاتصال">
                <Input
                  value={basic.contactName}
                  onChange={(e) =>
                    setBasic({ ...basic, contactName: e.target.value })
                  }
                />
              </Field>
              <Field label="بريد التواصل">
                <Input
                  value={basic.contactEmail}
                  onChange={(e) =>
                    setBasic({ ...basic, contactEmail: e.target.value })
                  }
                />
              </Field>
              <Field label="الجوال">
                <Input
                  value={basic.contactPhone}
                  onChange={(e) =>
                    setBasic({ ...basic, contactPhone: e.target.value })
                  }
                />
              </Field>
            </div>
            {duplicate ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                تكرار محتمل: منشأة موجودة «{duplicate.name}» (
                {duplicate.id}
                {duplicate.crNumber ? ` · س.ت ${duplicate.crNumber}` : ""}).
              </p>
            ) : null}
          </>
        )}

        {step === 1 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="الخطة">
              <SearchableSelect
                value={subForm.planId}
                onChange={(v) => {
                  const p = plans.find((x) => x.id === v);
                  setSubForm({
                    ...subForm,
                    planId: v,
                    clientType: p?.clientType || subForm.clientType,
                  });
                }}
                options={plans
                  .filter((p) => p.active)
                  .map((p) => ({ value: p.id, label: p.name }))}
              />
            </Field>
            <Field label="دورة الفوترة">
              <SearchableSelect
                value={subForm.billingCycle}
                onChange={(v) =>
                  setSubForm({
                    ...subForm,
                    billingCycle: v as "monthly" | "annual",
                  })
                }
                options={[
                  { value: "monthly", label: "شهري" },
                  { value: "annual", label: "سنوي" },
                ]}
              />
            </Field>
            <Field label="وضع الاشتراك">
              <SearchableSelect
                value={subForm.subscriptionMode}
                onChange={(v) =>
                  setSubForm({
                    ...subForm,
                    subscriptionMode: v as "trial" | "paid",
                  })
                }
                options={[
                  { value: "trial", label: "تجريبي" },
                  { value: "paid", label: "مدفوع" },
                ]}
              />
            </Field>
            <Field label="النشر">
              <SearchableSelect
                value={subForm.deploymentType}
                onChange={(v) =>
                  setSubForm({
                    ...subForm,
                    deploymentType: v as OrgDeploymentType,
                  })
                }
                options={Object.entries(DEPLOYMENT_LABELS).map(
                  ([value, label]) => ({ value, label }),
                )}
              />
            </Field>
            {plan ? (
              <div className="sm:col-span-2 rounded-md border border-slate-200 p-3 text-sm">
                <p className="font-extrabold">{plan.name}</p>
                <p className="mt-1 text-slate-500">
                  {formatSar(plan.priceMonthly)} / شهر · حدود:{" "}
                  {plan.limits.maxUsers} مستخدم · {plan.limits.maxProjects}{" "}
                  مشروع · {plan.limits.maxStorageGb} GB
                </p>
              </div>
            ) : null}
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="اسم المسؤول" required>
              <Input
                value={admin.name}
                onChange={(e) => setAdmin({ ...admin, name: e.target.value })}
              />
            </Field>
            <Field label="البريد" required>
              <Input
                value={admin.email}
                onChange={(e) =>
                  setAdmin({ ...admin, email: e.target.value })
                }
              />
            </Field>
            <Field label="الجوال">
              <Input
                value={admin.phone}
                onChange={(e) =>
                  setAdmin({ ...admin, phone: e.target.value })
                }
              />
            </Field>
            <Field label="المسمى الوظيفي">
              <Input
                value={admin.jobTitle}
                onChange={(e) =>
                  setAdmin({ ...admin, jobTitle: e.target.value })
                }
              />
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={sendInvite}
                onChange={(e) => setSendInvite(e.target.checked)}
              />
              إرسال دعوة بدون كلمة مرور (تسجيل في النشاط)
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 text-sm">
            <dl className="grid gap-2 sm:grid-cols-2">
              <Item label="المنشأة" value={basic.name} />
              <Item label="السجل التجاري" value={basic.crNumber || "—"} />
              <Item
                label="النوع"
                value={CUSTOMER_KIND_LABELS[basic.customerKind]}
              />
              <Item label="الخطة" value={plan?.name || subForm.planId} />
              <Item
                label="الاشتراك"
                value={
                  subForm.subscriptionMode === "trial" ? "تجريبي" : "مدفوع"
                }
              />
              <Item
                label="النشر"
                value={DEPLOYMENT_LABELS[subForm.deploymentType]}
              />
              <Item label="المسؤول" value={`${admin.name} · ${admin.email}`} />
              <Item
                label="الدعوة"
                value={sendInvite ? "ستُسجَّل دعوة" : "بدون دعوة"}
              />
            </dl>
            {busy ? (
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-500">
                  جارٍ التجهيز والمزامنة…
                </p>
                <div className="h-2 overflow-hidden rounded bg-slate-100">
                  <div
                    className="h-full rounded bg-blue-600 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
        )}

        <div className="flex justify-between gap-2 border-t border-slate-100 pt-4">
          <Button
            variant="outline"
            disabled={step === 0 || busy}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            السابق
          </Button>
          {step < STEPS.length - 1 ? (
            <Button disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
              التالي
            </Button>
          ) : (
            <Button disabled={busy || !canNext} onClick={submit}>
              {busy ? "جارٍ الإنشاء…" : "إنشاء وتجهيز"}
            </Button>
          )}
        </div>
      </div>
    </PageScaffold>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-100 px-3 py-2">
      <dt className="text-[11px] font-semibold text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-semibold text-slate-800">{value}</dd>
    </div>
  );
}
