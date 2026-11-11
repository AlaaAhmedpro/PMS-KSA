import { useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Briefcase } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input, Textarea } from "../components/ui/Input";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { useHierarchy } from "../store/HierarchyStore";
import { useAuth } from "../store/AuthContext";
import { useData } from "../store/DataStore";
import { useCan } from "../store/RbacContext";
import { useConfirm } from "../store/ConfirmContext";
import {
  GOVERNANCE_LABELS,
  generatePortfolioCode,
  normalizePortfolio,
} from "../lib/portfolioDomain";
import { useLocale } from "../store/LocaleContext";
import { labelOf } from "../i18n/label";
import { canCreatePortfolio, canEditPortfolio } from "../lib/portfolioPermissions";
import { validateSubmission } from "../services/portfolioWorkflow";
import { useOrgPortfolioPolicy } from "../hooks/useOrgPortfolioPolicy";
import { isFieldLocked } from "../lib/orgPortfolioPolicy";
import type { Portfolio } from "../models/domain";
import { cn } from "../lib/cn";

type Step = 1 | 2 | 3;

export function PortfolioFormPage() {
  const { t } = useLocale();
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { portfolios, objectives, addPortfolio, updatePortfolio, runPortfolioWorkflow } =
    useHierarchy();
  const { user, users, organization } = useAuth();
  const { departments } = useData();
  const can = useCan();
  const confirm = useConfirm();
  const { policy, profileLabel, workflowLabel } = useOrgPortfolioPolicy();
  const existing = portfolios.find((p) => p.id === id);

  const req = (label: string, required: boolean) =>
    required ? `${label} *` : label;

  const allow = editing
    ? canEditPortfolio(
        { managePortfolio: can.managePortfolio(user?.role), role: user?.role },
        existing?.status,
        policy,
        existing,
      )
    : canCreatePortfolio({
        managePortfolio: can.managePortfolio(user?.role),
        role: user?.role,
      });

  const locked = (field: string) =>
    editing && existing ? isFieldLocked(existing, policy, field) : false;

  const [step, setStep] = useState<Step>(1);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    portfolioType: "strategic",
    departmentId: "",
    fiscalYear: String(new Date().getFullYear()),
    startDate: "",
    endDate: "",
    priority: "medium",
    ownerUserId: user?.id || "",
    sponsorUserId: "",
    governanceModel: "pmo_central",
    teamUserIds: [] as string[],
    objectiveIds: [] as string[],
    expectedBenefits: "",
    successMetrics: "",
    plannedBudgetSar: "",
    currency: "SAR",
    budgetNotes: "",
  });

  useEffect(() => {
    if (!existing) return;
    const p = normalizePortfolio(existing);
    setForm({
      name: p.name,
      code: p.code || "",
      description: p.description,
      portfolioType: p.portfolioType || "strategic",
      departmentId: p.departmentId || "",
      fiscalYear: String(p.fiscalYear || new Date().getFullYear()),
      startDate: p.startDate || "",
      endDate: p.endDate || "",
      priority: p.priority || "medium",
      ownerUserId: p.ownerUserId,
      sponsorUserId: p.sponsorUserId || "",
      governanceModel: p.governanceModel || "pmo_central",
      teamUserIds: p.teamUserIds || [],
      objectiveIds: p.objectiveIds || [],
      expectedBenefits: p.expectedBenefits || "",
      successMetrics: p.successMetrics || "",
      plannedBudgetSar: String(p.plannedBudgetSar || ""),
      currency: p.currency || "SAR",
      budgetNotes: p.budgetNotes || "",
    });
  }, [existing]);

  useEffect(() => {
    if (editing || form.code) return;
    setForm((f) => ({
      ...f,
      code: generatePortfolioCode(
        portfolios,
        Number(f.fiscalYear) || new Date().getFullYear(),
      ),
    }));
  }, [editing, portfolios, form.code, form.fiscalYear]);

  const patch = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setDirty(true);
    setForm((f) => ({ ...f, [key]: value }));
  };

  const built = useMemo((): Omit<Portfolio, "id"> => {
    return {
      organizationId: organization?.id || "org-namaa",
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description.trim(),
      portfolioType: form.portfolioType as Portfolio["portfolioType"],
      departmentId: form.departmentId || undefined,
      fiscalYear: Number(form.fiscalYear) || new Date().getFullYear(),
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      priority: form.priority as Portfolio["priority"],
      ownerUserId: form.ownerUserId,
      sponsorUserId: form.sponsorUserId || undefined,
      governanceModel: form.governanceModel as Portfolio["governanceModel"],
      teamUserIds: form.teamUserIds,
      objectiveIds: form.objectiveIds,
      expectedBenefits: form.expectedBenefits,
      successMetrics: form.successMetrics,
      plannedBudgetSar: Number(form.plannedBudgetSar) || 0,
      currency: form.currency as Portfolio["currency"],
      budgetNotes: form.budgetNotes,
      status: existing?.status || "draft",
      createdByUserId: existing?.createdByUserId || user?.id,
    };
  }, [form, organization, existing, user]);

  const collectStepErrors = (s: Step): Record<string, string> => {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!form.name.trim()) e.name = t("portfolioForm.k011");
      if (!form.description.trim()) e.description = t("portfolioForm.k022");
      if (!form.code.trim()) e.code = t("portfolioForm.k016");
      const dup = portfolios.some(
        (p) => p.code === form.code.trim() && p.id !== id,
      );
      if (dup) e.code = t("portfolioForm.k034");
      if (form.startDate && form.endDate && form.endDate < form.startDate) {
        e.endDate = t("portfolioForm.k025");
      }
      if (
        policy.requiredAtSubmit.includes("startDate") &&
        !form.startDate
      ) {
        e.startDate = t("portfolioForm.k026");
      }
      if (
        policy.requiredAtSubmit.includes("departmentId") &&
        !form.departmentId
      ) {
        e.departmentId = t("portfolioForm.k010");
      }
    }
    if (s === 2) {
      if (!form.ownerUserId) e.ownerUserId = t("portfolioForm.k038");
      if (
        (policy.requireSponsor ||
          policy.requiredAtSubmit.includes("sponsorUserId")) &&
        !form.sponsorUserId
      ) {
        e.sponsorUserId = t("portfolioForm.k014");
      }
    }
    if (s === 3) {
      if (Number(form.plannedBudgetSar) < 0) {
        e.plannedBudgetSar = t("portfolioForm.k035");
      }
      if (
        (policy.requireBudgetOnSubmit ||
          policy.requiredAtSubmit.includes("plannedBudgetSar")) &&
        !(Number(form.plannedBudgetSar) > 0)
      ) {
        e.plannedBudgetSar = t("portfolioForm.k020");
      }
      if (
        (policy.requireObjectivesOnSubmit ||
          policy.requiredAtSubmit.includes("objectiveIds")) &&
        form.objectiveIds.length === 0
      ) {
        e.objectiveIds = t("portfolioForm.k042");
      }
      if (
        policy.requireDocumentsOnSubmit &&
        !(form.budgetNotes || form.successMetrics || form.expectedBenefits)
      ) {
        e.budgetNotes =
          t("portfolioForm.k007");
      }
    }
    return e;
  };

  const isStepValid = (s: Step) => Object.keys(collectStepErrors(s)).length === 0;

  const validateStep = (s: Step): boolean => {
    const e = collectStepErrors(s);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const canGoNext = isStepValid(step);

  const submissionReady = useMemo(() => {
    if (!isStepValid(1) || !isStepValid(2) || !isStepValid(3)) return false;
    const draftLike = {
      ...built,
      id: id || "new",
      status: "draft" as const,
    };
    return validateSubmission(draftLike, policy).ok;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form fields covered via built + isStepValid reads form
  }, [built, policy, id, form]);

  const tryGoStep = (target: Step) => {
    if (target === step) return;
    if (target < step) {
      setStep(target);
      setErrors({});
      return;
    }
    for (let s = step; s < target; s++) {
      if (!validateStep(s as Step)) {
        setStep(s as Step);
        return;
      }
    }
    setStep(target);
    setErrors({});
  };

  const saveDraft = () => {
    if (!allow || saving) return;
    if (!validateStep(1)) {
      setStep(1);
      return;
    }
    setSaving(true);
    try {
      if (editing && id) {
        updatePortfolio(id, built, user?.id);
        setDirty(false);
        navigate(`/portfolios/${id}`);
        return;
      }
      let rowId = "";
      flushSync(() => {
        const row = addPortfolio({ ...built, status: "draft" });
        rowId = row.id;
      });
      setDirty(false);
      navigate(`/portfolios/${rowId}`, { replace: true });
    } finally {
      setSaving(false);
    }
  };

  const submitReview = () => {
    if (!allow || saving || !submissionReady) return;
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }
    const draftLike = { ...built, id: id || "new", status: "draft" as const };
    const v = validateSubmission(draftLike, policy);
    if (!v.ok) {
      setErrors({ general: v.errors.join(" ") });
      setStep(3);
      return;
    }

    setSaving(true);
    try {
      let portfolioId = id;
      let seed: Portfolio | undefined;
      const action =
        editing && existing?.status === "returned" ? "resubmit" : "submit";

      if (!editing) {
        flushSync(() => {
          const row = addPortfolio({ ...built, status: "draft" });
          portfolioId = row.id;
          seed = row;
        });
      } else if (id) {
        updatePortfolio(id, built, user?.id);
        seed = normalizePortfolio({ ...existing!, ...built, id });
      }
      if (!portfolioId) return;

      const res = runPortfolioWorkflow(portfolioId, action, {
        actorUserId: user?.id,
        seed,
      });
      if (!res.ok) {
        setErrors({ general: res.reason || t("portfolioForm.k031") });
        return;
      }
      setDirty(false);
      navigate(`/portfolios/${portfolioId}`, { replace: true });
    } finally {
      setSaving(false);
    }
  };

  if (editing && id && !existing) {
    return (
      <Card className="p-6">
        <p className="text-sm text-steel-500">{t("portfolioForm.k043")}</p>
        <Button className="mt-3" onClick={() => navigate("/portfolios")}>
          {t("common.back")}
        </Button>
      </Card>
    );
  }

  if (!allow) {
    return (
      <Card className="p-6">
        <p className="text-sm text-steel-500">{t("portfolioForm.k044")}</p>
        <Button className="mt-3" onClick={() => navigate("/portfolios")}>
          {t("common.back")}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={editing ? t("portfolioForm.k030") : t("portfolioForm.k023")}
        subtitle={t("portfolioForm.k045", {
          profile: profileLabel,
          workflow: workflowLabel,
        })}
        icon={<Briefcase className="h-6 w-6" />}
      />

      <div className="flex gap-2">
        {([1, 2, 3] as Step[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => tryGoStep(s)}
            className={cn(
              "rounded-xl border px-3 py-2 text-xs font-bold",
              step === s
                ? "border-brand-500 bg-brand-500/10 text-brand-700"
                : "border-steel-200 text-steel-500",
            )}
          >
            {s === 1
              ? t("portfolioForm.k001")
              : s === 2
                ? t("portfolioForm.k002")
                : t("portfolioForm.k003")}
          </button>
        ))}
      </div>

      <Card className="space-y-3 p-4">
        {step === 1 ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label={t("portfolioForm.k006")} required>
              <Input value={form.name} onChange={(e) => patch("name", e.target.value)} />
              {errors.name ? <p className="text-xs text-red-500">{errors.name}</p> : null}
            </Field>
            <Field label={t("portfolioForm.k015")} required>
              <Input
                value={form.code}
                disabled={locked("code")}
                onChange={(e) => patch("code", e.target.value)}
              />
              {errors.code ? <p className="text-xs text-red-500">{errors.code}</p> : null}
            </Field>
            <Field label={t("portfolioForm.k021")} required className="md:col-span-2">
              <Textarea
                value={form.description}
                onChange={(e) => patch("description", e.target.value)}
              />
              {errors.description ? (
                <p className="text-xs text-red-500">{errors.description}</p>
              ) : null}
            </Field>
            <Field label={t("portfolioForm.k041")}>
              <SearchableSelect
                value={form.portfolioType}
                onChange={(v) => patch("portfolioType", v)}
                options={Object.keys({
                  strategic: true,
                  digital: true,
                  operational: true,
                  capital: true,
                  it: true,
                  other: true,
                }).map((value) => ({
                  value,
                  label: labelOf(t, "portfolio.type", value),
                }))}
              />
            </Field>
            <Field
              label={req(
                t("portfolioForm.k046"),
                policy.requiredAtSubmit.includes("departmentId"),
              )}
            >
              <SearchableSelect
                value={form.departmentId}
                onChange={(v) => patch("departmentId", v)}
                options={[
                  { value: "", label: "—" },
                  ...departments.map((d) => ({ value: d.id, label: d.name })),
                ]}
              />
              {errors.departmentId ? (
                <p className="text-xs text-red-500">{errors.departmentId}</p>
              ) : null}
            </Field>
            <Field label={t("portfolioForm.k017")}>
              <Input
                value={form.fiscalYear}
                onChange={(e) => patch("fiscalYear", e.target.value)}
              />
            </Field>
            <Field label={t("portfolioForm.k012")}>
              <SearchableSelect
                value={form.priority}
                onChange={(v) => patch("priority", v)}
                options={Object.keys({
                  critical: true,
                  high: true,
                  medium: true,
                  low: true,
                }).map((value) => ({
                  value,
                  label: labelOf(t, "portfolio.priority", value),
                }))}
              />
            </Field>
            <Field
              label={req(
                t("portfolioForm.k047"),
                policy.requiredAtSubmit.includes("startDate"),
              )}
            >
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => patch("startDate", e.target.value)}
              />
              {errors.startDate ? (
                <p className="text-xs text-red-500">{errors.startDate}</p>
              ) : null}
            </Field>
            <Field label={t("portfolioForm.k024")}>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => patch("endDate", e.target.value)}
              />
              {errors.endDate ? (
                <p className="text-xs text-red-500">{errors.endDate}</p>
              ) : null}
            </Field>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label={t("portfolioForm.k037")} required>
              <SearchableSelect
                value={form.ownerUserId}
                onChange={(v) => patch("ownerUserId", v)}
                options={users.map((u) => ({ value: u.id, label: u.name }))}
              />
              {errors.ownerUserId ? (
                <p className="text-xs text-red-500">{errors.ownerUserId}</p>
              ) : null}
            </Field>
            <Field
              label={req(
                t("portfolioForm.k048"),
                policy.requireSponsor ||
                  policy.requiredAtSubmit.includes("sponsorUserId"),
              )}
            >
              <SearchableSelect
                value={form.sponsorUserId}
                onChange={(v) => patch("sponsorUserId", v)}
                options={[
                  { value: "", label: "—" },
                  ...users.map((u) => ({ value: u.id, label: u.name })),
                ]}
              />
              {errors.sponsorUserId ? (
                <p className="text-xs text-red-500">{errors.sponsorUserId}</p>
              ) : null}
            </Field>
            <Field label={t("portfolioForm.k040")}>
              <SearchableSelect
                value={form.governanceModel}
                onChange={(v) => patch("governanceModel", v)}
                options={Object.keys(GOVERNANCE_LABELS).map((value) => ({
                  value,
                  label: labelOf(t, "portfolio.governance", value),
                }))}
              />
            </Field>
            <Field label={t("portfolioForm.k008")}>
              <SearchableSelect
                value={form.teamUserIds[0] || ""}
                onChange={(v) => {
                  if (!v) return;
                  patch(
                    "teamUserIds",
                    form.teamUserIds.includes(v)
                      ? form.teamUserIds.filter((x) => x !== v)
                      : [...form.teamUserIds, v],
                  );
                }}
                options={users.map((u) => ({
                  value: u.id,
                  label: `${u.name}${form.teamUserIds.includes(u.id) ? " ✓" : ""}`,
                }))}
              />
              <p className="mt-1 text-[11px] text-steel-400">
                {t("portfolioForm.k049")}{" "}
                {form.teamUserIds
                  .map((tid) => users.find((u) => u.id === tid)?.name)
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
            </Field>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label={req(
                t("portfolioForm.k050"),
                policy.requireObjectivesOnSubmit ||
                  policy.requiredAtSubmit.includes("objectiveIds"),
              )}
              className="md:col-span-2"
            >
              <SearchableSelect
                value={form.objectiveIds[0] || ""}
                onChange={(v) => {
                  if (!v || locked("objectiveIds")) return;
                  patch(
                    "objectiveIds",
                    form.objectiveIds.includes(v)
                      ? form.objectiveIds.filter((x) => x !== v)
                      : [...form.objectiveIds, v],
                  );
                }}
                options={objectives.map((o) => ({
                  value: o.id,
                  label: `${o.title}${form.objectiveIds.includes(o.id) ? " ✓" : ""}`,
                }))}
              />
              {errors.objectiveIds ? (
                <p className="text-xs text-red-500">{errors.objectiveIds}</p>
              ) : (
                <p className="mt-1 text-[11px] text-steel-400">
                  {form.objectiveIds
                    .map((oid) => objectives.find((o) => o.id === oid)?.title)
                    .filter(Boolean)
                    .join(" · ") ||
                    (policy.requireObjectivesOnSubmit
                      ? t("portfolioForm.k039")
                      : t("portfolioForm.k004"))}
                </p>
              )}
            </Field>
            <Field label={t("portfolioForm.k019")} className="md:col-span-2">
              <Textarea
                value={form.expectedBenefits}
                onChange={(e) => patch("expectedBenefits", e.target.value)}
              />
            </Field>
            <Field label={t("portfolioForm.k036")} className="md:col-span-2">
              <Textarea
                value={form.successMetrics}
                onChange={(e) => patch("successMetrics", e.target.value)}
              />
            </Field>
            <Field
              label={req(
                t("portfolioForm.k051"),
                policy.requireBudgetOnSubmit ||
                  policy.requiredAtSubmit.includes("plannedBudgetSar"),
              )}
            >
              <Input
                value={form.plannedBudgetSar}
                disabled={locked("plannedBudgetSar")}
                onChange={(e) => patch("plannedBudgetSar", e.target.value)}
              />
              {errors.plannedBudgetSar ? (
                <p className="text-xs text-red-500">{errors.plannedBudgetSar}</p>
              ) : null}
            </Field>
            <Field label={t("portfolioForm.k018")}>
              <SearchableSelect
                value={form.currency}
                onChange={(v) => patch("currency", v)}
                options={[
                  { value: "SAR", label: t("portfolioForm.k033") },
                  { value: "AED", label: t("portfolioForm.k032") },
                ]}
              />
            </Field>
            <Field
              label={req(
                t("portfolioForm.k052"),
                policy.requireDocumentsOnSubmit,
              )}
              className="md:col-span-2"
            >
              <Textarea
                value={form.budgetNotes}
                onChange={(e) => patch("budgetNotes", e.target.value)}
              />
              {errors.budgetNotes ? (
                <p className="text-xs text-red-500">{errors.budgetNotes}</p>
              ) : null}
            </Field>
          </div>
        ) : null}

        {errors.general ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {errors.general}
          </p>
        ) : null}

        {!submissionReady ? (
          <p className="text-[11px] text-steel-400">
            {t("portfolioForm.k053", { profile: profileLabel })}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-steel-100 pt-3 dark:border-steel-800">
          <div className="flex gap-2">
            {step > 1 ? (
              <Button
                variant="outline"
                onClick={() => {
                  setStep((s) => (s - 1) as Step);
                  setErrors({});
                }}
              >
                {t("common.prev")}
              </Button>
            ) : null}
            {step < 3 ? (
              <Button
                variant="outline"
                disabled={!canGoNext}
                onClick={() => {
                  if (validateStep(step)) setStep((s) => (s + 1) as Step);
                }}
              >
                {t("common.next")}
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={async () => {
                if (dirty) {
                  const ok = await confirm({
                    title: t("portfolioForm.k028"),
                    message: t("portfolioForm.k029"),
                    confirmLabel: t("portfolioForm.k027"),
                    cancelLabel: t("portfolioForm.k013"),
                  });
                  if (!ok) return;
                }
                navigate(editing ? `/portfolios/${id}` : "/portfolios?tab=manage");
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button variant="outline" disabled={saving} onClick={saveDraft}>
              {t("portfolioForm.k054")}
            </Button>
            <Button
              disabled={!submissionReady || saving}
              onClick={submitReview}
              title={
                submissionReady
                  ? t("portfolioForm.k005")
                  : t("portfolioForm.k009")
              }
            >
              {t("portfolioForm.k055")}
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-steel-400">
          <Link to="/portfolios?tab=manage" className="text-brand-700 hover:underline">
            {t("common.backToRegistry")}
          </Link>
        </p>
      </Card>
    </div>
  );
}
