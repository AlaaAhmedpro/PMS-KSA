import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageScaffold } from "../../components/sa/PageScaffold";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Input";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { usePlatform } from "../../store/PlatformStore";
import { useAuth } from "../../store/AuthContext";
import { can } from "../../lib/platformRbac";
import type { OrgCustomerKind, OrgDeploymentType } from "../../lib/platformDomain";
import type { OrgClientType } from "../../lib/types";
import { useLocale } from "../../store/LocaleContext";
import { usePlatformLabels } from "../../lib/platformI18n";
import { formatSar } from "../../lib/format";

const STEP_KEYS = [
  "page.onboard.step.basic",
  "page.onboard.step.subscription",
  "page.onboard.step.admin",
  "page.onboard.step.review",
] as const;

const SEED_CITY = "الرياض";
const SEED_INDUSTRY = "إدارة مشاريع";
const SEED_SECTOR = "قطاع خاص";
const SEED_JOB = "مسؤول المؤسسة";
const SEED_MANAGER = "لمى سعد القحطاني";
const SEED_COUNTRY = "السعودية";

export function OrganizationOnboardPage() {
  const { t, L, locale } = useLocale();
  const { customerKind, deployment, customerKindOptions, deploymentOptions } =
    usePlatformLabels();
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
    city: SEED_CITY,
    website: "",
    industry: SEED_INDUSTRY,
    sector: SEED_SECTOR,
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
    jobTitle: SEED_JOB,
  });
  const [sendInvite, setSendInvite] = useState(true);

  useEffect(() => {
    setBasic((prev) => ({
      ...prev,
      city: L(SEED_CITY),
      industry: L(SEED_INDUSTRY),
      sector: L(SEED_SECTOR),
    }));
    setAdmin((prev) => ({ ...prev, jobTitle: L(SEED_JOB) }));
  }, [locale, L]);

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
      <PageScaffold title={t("page.orgs.onboard")}>
        <p className="text-sm text-slate-500">{t("page.onboard.noPerm")}</p>
        <Link to="/organizations" className="text-sm font-bold text-blue-600">
          {t("common.back")}
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
        country: L(SEED_COUNTRY),
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
        accountManagerName: user?.name ? L(user.name) : L(SEED_MANAGER),
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
      setError(res.reason || t("page.onboard.createFail"));
      setProgress(0);
      return;
    }
    navigate(`/organizations/${res.orgId}`);
  };

  return (
    <PageScaffold
      title={t("page.onboard.title")}
      subtitle={t("page.onboard.subtitle")}
      actions={
        <Link to="/organizations">
          <Button variant="outline">{t('common.cancel')}</Button>
        </Link>
      }
    >
      <ol className="flex flex-wrap gap-2">
        {STEP_KEYS.map((key, i) => (
          <li
            key={key}
            className={`rounded border px-3 py-1.5 text-xs font-bold ${
              i === step
                ? "border-blue-300 bg-blue-50 text-blue-800"
                : i < step
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 text-slate-400"
            }`}
          >
            {i + 1}. {t(key)}
          </li>
        ))}
      </ol>

      <div className="sa-surface space-y-4 p-4">
        {step === 0 && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("page.onboard.orgName")} required>
                <Input
                  value={basic.name}
                  onChange={(e) =>
                    setBasic({ ...basic, name: e.target.value })
                  }
                />
              </Field>
              <Field label={t("org.field.legalName")}>
                <Input
                  value={basic.legalName}
                  onChange={(e) =>
                    setBasic({ ...basic, legalName: e.target.value })
                  }
                />
              </Field>
              <Field label={t("org.field.cr")}>
                <Input
                  value={basic.crNumber}
                  onChange={(e) =>
                    setBasic({ ...basic, crNumber: e.target.value })
                  }
                />
              </Field>
              <Field label={t("org.field.vat")}>
                <Input
                  value={basic.vatNumber}
                  onChange={(e) =>
                    setBasic({ ...basic, vatNumber: e.target.value })
                  }
                />
              </Field>
              <Field label={t("org.field.nationalAddress")} className="sm:col-span-2">
                <Input
                  value={basic.nationalAddress}
                  onChange={(e) =>
                    setBasic({ ...basic, nationalAddress: e.target.value })
                  }
                />
              </Field>
              <Field label={t("org.field.city")}>
                <Input
                  value={basic.city}
                  onChange={(e) =>
                    setBasic({ ...basic, city: e.target.value })
                  }
                />
              </Field>
              <Field label={t("org.field.website")}>
                <Input
                  value={basic.website}
                  onChange={(e) =>
                    setBasic({ ...basic, website: e.target.value })
                  }
                />
              </Field>
              <Field label={t("page.onboard.field.sector")}>
                <Input
                  value={basic.sector}
                  onChange={(e) =>
                    setBasic({ ...basic, sector: e.target.value })
                  }
                />
              </Field>
              <Field label={t("page.onboard.field.industry")}>
                <Input
                  value={basic.industry}
                  onChange={(e) =>
                    setBasic({ ...basic, industry: e.target.value })
                  }
                />
              </Field>
              <Field label={t("page.onboard.field.customerKind")}>
                <SearchableSelect
                  value={basic.customerKind}
                  onChange={(v) =>
                    setBasic({
                      ...basic,
                      customerKind: v as OrgCustomerKind,
                    })
                  }
                  options={customerKindOptions()}
                />
              </Field>
              <Field label={t("org.field.contact")}>
                <Input
                  value={basic.contactName}
                  onChange={(e) =>
                    setBasic({ ...basic, contactName: e.target.value })
                  }
                />
              </Field>
              <Field label={t("org.field.contactEmail")}>
                <Input
                  value={basic.contactEmail}
                  onChange={(e) =>
                    setBasic({ ...basic, contactEmail: e.target.value })
                  }
                />
              </Field>
              <Field label={t("org.field.contactPhone")}>
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
                {t("page.onboard.duplicateWarn", { name: L(duplicate.name) })}{" "}
                {t("page.onboard.duplicateDetail", {
                  id: duplicate.id,
                  cr: duplicate.crNumber
                    ? t("org.crPrefix", { n: duplicate.crNumber })
                    : "",
                })}
              </p>
            ) : null}
          </>
        )}

        {step === 1 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("page.onboard.field.plan")}>
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
            <Field label={t("page.onboard.field.billingCycle")}>
              <SearchableSelect
                value={subForm.billingCycle}
                onChange={(v) =>
                  setSubForm({
                    ...subForm,
                    billingCycle: v as "monthly" | "annual",
                  })
                }
                options={[
                  { value: "monthly", label: t("common.monthlyShort") },
                  { value: "annual", label: t("common.annualShort") },
                ]}
              />
            </Field>
            <Field label={t("page.onboard.field.subMode")}>
              <SearchableSelect
                value={subForm.subscriptionMode}
                onChange={(v) =>
                  setSubForm({
                    ...subForm,
                    subscriptionMode: v as "trial" | "paid",
                  })
                }
                options={[
                  { value: "trial", label: t("page.onboard.subMode.trial") },
                  { value: "paid", label: t("page.onboard.subMode.paid") },
                ]}
              />
            </Field>
            <Field label={t("page.onboard.field.deployment")}>
              <SearchableSelect
                value={subForm.deploymentType}
                onChange={(v) =>
                  setSubForm({
                    ...subForm,
                    deploymentType: v as OrgDeploymentType,
                  })
                }
                options={deploymentOptions()}
              />
            </Field>
            {plan ? (
              <div className="sm:col-span-2 rounded-md border border-slate-200 p-3 text-sm">
                <p className="font-extrabold">{plan.name}</p>
                <p className="mt-1 text-slate-500">
                  {t("page.onboard.planLimits", {
                    price: formatSar(plan.priceMonthly),
                    users: plan.limits.maxUsers,
                    projects: plan.limits.maxProjects,
                    storage: plan.limits.maxStorageGb,
                  })}
                </p>
              </div>
            ) : null}
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("page.onboard.field.adminName")} required>
              <Input
                value={admin.name}
                onChange={(e) => setAdmin({ ...admin, name: e.target.value })}
              />
            </Field>
            <Field label={t("common.email")} required>
              <Input
                value={admin.email}
                onChange={(e) =>
                  setAdmin({ ...admin, email: e.target.value })
                }
              />
            </Field>
            <Field label={t("org.field.contactPhone")}>
              <Input
                value={admin.phone}
                onChange={(e) =>
                  setAdmin({ ...admin, phone: e.target.value })
                }
              />
            </Field>
            <Field label={t("page.onboard.field.jobTitle")}>
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
              {t("page.onboard.inviteCheckbox")}
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 text-sm">
            <dl className="grid gap-2 sm:grid-cols-2">
              <Item label={t("page.onboard.review.org")} value={basic.name} />
              <Item label={t("org.field.cr")} value={basic.crNumber || "—"} />
              <Item
                label={t("page.onboard.review.kind")}
                value={customerKind(basic.customerKind)}
              />
              <Item label={t("page.onboard.field.plan")} value={plan?.name || subForm.planId} />
              <Item
                label={t("page.onboard.review.sub")}
                value={
                  subForm.subscriptionMode === "trial"
                    ? t("page.onboard.subMode.trial")
                    : t("page.onboard.subMode.paid")
                }
              />
              <Item
                label={t("page.onboard.field.deployment")}
                value={deployment(subForm.deploymentType)}
              />
              <Item label={t("page.onboard.review.admin")} value={`${admin.name} · ${admin.email}`} />
              <Item
                label={t("page.onboard.review.invite")}
                value={
                  sendInvite
                    ? t("page.onboard.invite.yes")
                    : t("page.onboard.invite.no")
                }
              />
            </dl>
            {busy ? (
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-500">
                  {t("page.onboard.syncing")}
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
            {t("page.onboard.back")}
          </Button>
          {step < STEP_KEYS.length - 1 ? (
            <Button disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
              {t("page.onboard.next")}
            </Button>
          ) : (
            <Button disabled={busy || !canNext} onClick={submit}>
              {busy ? t("page.onboard.provisioning") : t("page.onboard.submit")}
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
