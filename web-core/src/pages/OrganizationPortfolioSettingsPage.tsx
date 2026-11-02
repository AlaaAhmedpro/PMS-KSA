import { useEffect, useMemo, useState } from "react";
import { Settings2 } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input, Textarea } from "../components/ui/Input";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { useAuth } from "../store/AuthContext";
import {
  PORTFOLIO_POLICY_PRESETS,
  PROFILE_TEMPLATE_LABELS,
  WORKFLOW_MODE_LABELS,
  normalizePortfolioPolicy,
  validatePolicyConfig,
} from "../lib/orgPortfolioPolicy";
import { canConfigurePortfolioPolicies } from "../lib/portfolioPermissions";
import { CLIENT_TYPE_META } from "../lib/orgModules";
import type {
  OrgClientType,
  OrgPortfolioPolicy,
  PortfolioProfileTemplate,
  PortfolioWorkflowMode,
  PortfolioWorkflowStageDef,
  RelationshipTypeKey,
} from "../models/domain";
import { cn } from "../lib/cn";

type SectionId =
  | "profile"
  | "policies"
  | "workflow"
  | "finance"
  | "preview";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "profile", label: "ملف المنظمة" },
  { id: "policies", label: "سياسات المحفظة" },
  { id: "workflow", label: "مسار الاعتماد" },
  { id: "finance", label: "الحوكمة المالية" },
  { id: "preview", label: "معاينة قبل الحفظ" },
];

const REL_OPTIONS: { value: RelationshipTypeKey; label: string }[] = [
  { value: "contains", label: "يحتوي / يملك" },
  { value: "aligns_with", label: "يتوافق مع" },
  { value: "depends_on", label: "يعتمد على" },
  { value: "related_to", label: "مرتبط بـ" },
];

export function OrganizationPortfolioSettingsPage() {
  const {
    organization,
    user,
    updateOrganizationPortfolioPolicy,
    updateOrganizationClientType,
  } = useAuth();
  const allow = canConfigurePortfolioPolicies(user?.role);
  const [section, setSection] = useState<SectionId>("profile");
  const [draft, setDraft] = useState<OrgPortfolioPolicy>(() =>
    normalizePortfolioPolicy(
      organization?.portfolioPolicy,
      organization?.clientType ?? "government",
    ),
  );
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [confirmApply, setConfirmApply] = useState(false);

  useEffect(() => {
    setDraft(
      normalizePortfolioPolicy(
        organization?.portfolioPolicy,
        organization?.clientType ?? "government",
      ),
    );
  }, [organization?.portfolioPolicy, organization?.clientType]);

  const active = useMemo(
    () =>
      normalizePortfolioPolicy(
        organization?.portfolioPolicy,
        organization?.clientType ?? "government",
      ),
    [organization?.portfolioPolicy, organization?.clientType],
  );

  const validation = validatePolicyConfig(draft);
  const dirty = JSON.stringify(draft) !== JSON.stringify(active);

  const impactPreview = useMemo(() => {
    const lines: string[] = [];
    if (draft.workflowMode !== active.workflowMode) {
      lines.push(
        `تغيير نمط المسار من «${WORKFLOW_MODE_LABELS[active.workflowMode]}» إلى «${WORKFLOW_MODE_LABELS[draft.workflowMode]}». الطلبات الجارية تحتفظ بانتقالاتها الحالية عبر التحقق عند كل إجراء.`,
      );
    }
    if (JSON.stringify(draft.stages) !== JSON.stringify(active.stages)) {
      lines.push(
        "تغيير مراحل الاعتماد يؤثر على الطلبات الجديدة فقط. الإصدارات السابقة تُسجَّل في سجل التدقيق (رقم السياسة).",
      );
    }
    if (draft.requireObjectivesOnSubmit !== active.requireObjectivesOnSubmit) {
      lines.push(
        draft.requireObjectivesOnSubmit
          ? "سيصبح ربط الأهداف الاستراتيجية إلزامياً عند التقديم."
          : "لن يُطلب ربط الأهداف عند التقديم.",
      );
    }
    if (draft.requireBudgetOnSubmit !== active.requireBudgetOnSubmit) {
      lines.push(
        draft.requireBudgetOnSubmit
          ? "الميزانية المخططة ستصبح إلزامية عند التقديم."
          : "الميزانية عند التقديم اختيارية.",
      );
    }
    if (draft.lockFieldsAfterApproval !== active.lockFieldsAfterApproval) {
      lines.push(
        draft.lockFieldsAfterApproval
          ? "بعد الاعتماد ستُقفل حقول الميزانية/الأهداف/الرمز."
          : "لن تُقفل الحقول بعد الاعتماد.",
      );
    }
    if (!lines.length) {
      lines.push("لا تغييرات جوهرية على الحقول الإلزامية أو المسار.");
    }
    return lines;
  }, [draft, active]);

  const applyTemplate = (key: "small" | "enterprise" | "government") => {
    const preset = structuredClone(PORTFOLIO_POLICY_PRESETS[key]);
    setDraft({
      ...preset,
      countryRegion: draft.countryRegion,
      defaultCurrency: draft.defaultCurrency,
      fiscalYearStartMonth: draft.fiscalYearStartMonth,
      updatedAt: new Date().toISOString(),
    });
    setMessage({
      ok: true,
      text: `تم تحميل قالب «${PROFILE_TEMPLATE_LABELS[key]}». راجع المعاينة ثم احفظ.`,
    });
    setSection("preview");
  };

  const patch = <K extends keyof OrgPortfolioPolicy>(
    key: K,
    value: OrgPortfolioPolicy[K],
  ) => {
    setDraft((d) => ({
      ...d,
      [key]: value,
      profileTemplate:
        key === "workflowMode" || key === "stages"
          ? ("custom" as PortfolioProfileTemplate)
          : d.profileTemplate,
    }));
    setMessage(null);
  };

  const toggleStage = (id: string) => {
    setDraft((d) => ({
      ...d,
      profileTemplate: "custom",
      stages: d.stages.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled } : s,
      ),
    }));
  };

  const renameStage = (id: string, nameAr: string) => {
    setDraft((d) => ({
      ...d,
      profileTemplate: "custom",
      stages: d.stages.map((s) => (s.id === id ? { ...s, nameAr } : s)),
    }));
  };

  const ensureStages = (mode: PortfolioWorkflowMode) => {
    const fromPreset =
      mode === "simple"
        ? PORTFOLIO_POLICY_PRESETS.small.stages
        : mode === "standard"
          ? PORTFOLIO_POLICY_PRESETS.enterprise.stages
          : PORTFOLIO_POLICY_PRESETS.government.stages;
    setDraft((d) => ({
      ...d,
      workflowMode: mode,
      profileTemplate: "custom",
      stages: structuredClone(fromPreset) as PortfolioWorkflowStageDef[],
    }));
  };

  const save = (alsoClientType: boolean) => {
    if (!validation.ok) {
      setMessage({ ok: false, text: validation.errors.join(" ") });
      setSection("workflow");
      return;
    }
    if (!confirmApply) {
      setSection("preview");
      setConfirmApply(true);
      setMessage({
        ok: true,
        text: "راجع أثر التغييرات ثم أكّد الحفظ مرة أخرى.",
      });
      return;
    }
    const res = updateOrganizationPortfolioPolicy(draft, {
      alsoSetClientType: alsoClientType,
    });
    if (!res.ok) {
      setMessage({ ok: false, text: res.reason || "تعذّر الحفظ." });
      return;
    }
    setConfirmApply(false);
    setMessage({
      ok: true,
      text: `تم حفظ السياسة (الإصدار سيُحدَّث عند تغيير المسار). الطلبات قيد التنفيذ لا تُعاد كتابتها صامتة.`,
    });
  };

  if (!allow) {
    return (
      <Card className="p-6">
        <p className="text-sm text-steel-500">
          إعداد سياسات المحفظة متاح لمسؤول المؤسسة فقط (محاكاة صلاحيات الديمو).
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="إعدادات حوكمة المحافظ"
        subtitle={`${organization?.name ?? ""} — ملف تشغيلي قابل للتخصيص دون تكرار للمنتج`}
        icon={<Settings2 className="h-6 w-6" />}
      />

      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={cn(
              "rounded-xl border px-3 py-2 text-xs font-bold",
              section === s.id
                ? "border-brand-500 bg-brand-500/10 text-brand-700"
                : "border-steel-200 text-steel-500",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {message ? (
        <p
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            message.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-600",
          )}
        >
          {message.text}
        </p>
      ) : null}

      {section === "profile" ? (
        <Card className="space-y-4 p-4">
          <CardHeader
            title="ملف المنظمة والقالب"
            subtitle="القوالب نقاط بداية — يمكن تخصيصها بعد التحميل"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="اسم المنظمة">
              <Input value={organization?.name ?? ""} disabled />
            </Field>
            <Field label="نوع المنظمة الحالي">
              <SearchableSelect
                value={organization?.clientType ?? "government"}
                onChange={(v) => {
                  updateOrganizationClientType(v as OrgClientType);
                  setDraft(policyPreset(v as OrgClientType));
                }}
                options={(
                  Object.keys(CLIENT_TYPE_META) as OrgClientType[]
                ).map((k) => ({
                  value: k,
                  label: CLIENT_TYPE_META[k].label,
                }))}
              />
            </Field>
            <Field label="الدولة / المنطقة">
              <Input
                value={draft.countryRegion}
                onChange={(e) => patch("countryRegion", e.target.value)}
              />
            </Field>
            <Field label="العملة الافتراضية">
              <SearchableSelect
                value={draft.defaultCurrency}
                onChange={(v) =>
                  patch("defaultCurrency", v as OrgPortfolioPolicy["defaultCurrency"])
                }
                options={[
                  { value: "SAR", label: "ر.س (SAR)" },
                  { value: "AED", label: "د.إ (AED)" },
                ]}
              />
            </Field>
            <Field label="شهر بداية السنة المالية (1–12)">
              <Input
                value={String(draft.fiscalYearStartMonth)}
                onChange={(e) =>
                  patch("fiscalYearStartMonth", Number(e.target.value) || 1)
                }
              />
            </Field>
            <Field label="القالب النشط">
              <Input
                value={PROFILE_TEMPLATE_LABELS[draft.profileTemplate]}
                disabled
              />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {(
              [
                ["small", "شركة صغيرة"],
                ["enterprise", "مؤسسة كبيرة"],
                ["government", "جهة حكومية"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyTemplate(key)}
                className="rounded-xl border border-steel-200 p-3 text-start hover:border-brand-400 hover:bg-brand-500/5"
              >
                <p className="text-sm font-extrabold">{label}</p>
                <p className="mt-1 text-[11px] text-steel-500">
                  {PORTFOLIO_POLICY_PRESETS[key].notes}
                </p>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {section === "policies" ? (
        <Card className="space-y-3 p-4">
          <CardHeader
            title="سياسات الحقول والعلاقات"
            subtitle="تُفرض عند الإنشاء / التقديم / التفعيل"
          />
          <Toggle
            label="الراعي التنفيذي إلزامي"
            checked={draft.requireSponsor}
            onChange={(v) => patch("requireSponsor", v)}
          />
          <Toggle
            label="الأهداف الاستراتيجية إلزامية عند التقديم"
            checked={draft.requireObjectivesOnSubmit}
            onChange={(v) => patch("requireObjectivesOnSubmit", v)}
          />
          <Toggle
            label="الميزانية إلزامية عند التقديم"
            checked={draft.requireBudgetOnSubmit}
            onChange={(v) => patch("requireBudgetOnSubmit", v)}
          />
          <Toggle
            label="مستندات / معلومات داعمة عند التقديم"
            checked={draft.requireDocumentsOnSubmit}
            onChange={(v) => patch("requireDocumentsOnSubmit", v)}
          />
          <Toggle
            label="السماح بربط مشروع مباشرة بالمحفظة"
            checked={draft.allowDirectProjectLink}
            onChange={(v) => patch("allowDirectProjectLink", v)}
          />
          <Toggle
            label="قفل الحقول الحساسة بعد الاعتماد"
            checked={draft.lockFieldsAfterApproval}
            onChange={(v) => patch("lockFieldsAfterApproval", v)}
          />
          <Toggle
            label="فصل المهام (لا يعتمد مقدّم الطلب)"
            checked={draft.separationOfDuties}
            onChange={(v) => patch("separationOfDuties", v)}
          />
          <Toggle
            label="سبب إلزامي عند الرفض"
            checked={draft.requireReasonOnReject}
            onChange={(v) => patch("requireReasonOnReject", v)}
          />
          <Toggle
            label="سبب إلزامي عند الإعادة للتعديل"
            checked={draft.requireReasonOnReturn}
            onChange={(v) => patch("requireReasonOnReturn", v)}
          />
          <Field label="أنواع العلاقات المسموحة">
            <div className="flex flex-wrap gap-2">
              {REL_OPTIONS.map((r) => {
                const on = draft.allowedRelationshipTypes.includes(r.value);
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => {
                      const next = on
                        ? draft.allowedRelationshipTypes.filter(
                            (x) => x !== r.value,
                          )
                        : [...draft.allowedRelationshipTypes, r.value];
                      patch(
                        "allowedRelationshipTypes",
                        next.length ? next : ["related_to"],
                      );
                    }}
                    className={cn(
                      "rounded-lg border px-2 py-1 text-xs font-semibold",
                      on
                        ? "border-brand-500 bg-brand-500/10 text-brand-700"
                        : "border-steel-200 text-steel-500",
                    )}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="ملاحظات السياسة">
            <Textarea
              value={draft.notes || ""}
              onChange={(e) => patch("notes", e.target.value)}
            />
          </Field>
        </Card>
      ) : null}

      {section === "workflow" ? (
        <Card className="space-y-4 p-4">
          <CardHeader
            title="تكوين مسار الاعتماد"
            subtitle="لا تُعاد كتابة مثيلات المسار الجارية عند الحفظ"
          />
          <Field label="نمط المسار">
            <SearchableSelect
              value={draft.workflowMode}
              onChange={(v) => ensureStages(v as PortfolioWorkflowMode)}
              options={(
                Object.keys(WORKFLOW_MODE_LABELS) as PortfolioWorkflowMode[]
              ).map((k) => ({ value: k, label: WORKFLOW_MODE_LABELS[k] }))}
            />
          </Field>
          <ul className="space-y-2">
            {draft.stages.map((s, idx) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-steel-100 px-3 py-2 dark:border-steel-800"
              >
                <span className="text-xs font-bold text-steel-400">
                  {idx + 1}.
                </span>
                <Input
                  className="min-w-[12rem] flex-1"
                  value={s.nameAr}
                  onChange={(e) => renameStage(s.id, e.target.value)}
                />
                <span className="text-[11px] text-steel-400">
                  دور: {s.requiredRole} · مفتاح: {s.key}
                </span>
                <Button
                  variant={s.enabled ? "primary" : "outline"}
                  size="sm"
                  onClick={() => toggleStage(s.id)}
                >
                  {s.enabled ? "مفعّلة" : "معطّلة"}
                </Button>
              </li>
            ))}
          </ul>
          {!validation.ok ? (
            <p className="text-sm text-red-600">{validation.errors.join(" ")}</p>
          ) : (
            <p className="text-xs text-steel-500">
              المسار صالح للتفعيل. الطلبات الجديدة تستخدم الإصدار بعد الحفظ.
            </p>
          )}
        </Card>
      ) : null}

      {section === "finance" ? (
        <Card className="space-y-3 p-4">
          <CardHeader
            title="الحوكمة المالية"
            subtitle="لا يتم جمع عملات مختلفة دون قاعدة تحويل — الديمو يستخدم عملة المحفظة فقط"
          />
          <Toggle
            label="تغيير الميزانية بعد الاعتماد يتطلب موافقة عند تجاوز العتبة"
            checked={draft.budgetChangeRequiresApproval}
            onChange={(v) => patch("budgetChangeRequiresApproval", v)}
          />
          <Field label="عتبة اعتماد تغيير الميزانية (ر.س)">
            <Input
              value={String(draft.budgetApprovalThresholdSar)}
              onChange={(e) =>
                patch(
                  "budgetApprovalThresholdSar",
                  Number(e.target.value) || 0,
                )
              }
            />
          </Field>
          <Field label="نسبة تحذير انحراف الميزانية (%)">
            <Input
              value={String(draft.varianceWarningPct)}
              onChange={(e) =>
                patch("varianceWarningPct", Number(e.target.value) || 0)
              }
            />
          </Field>
        </Card>
      ) : null}

      {section === "preview" ? (
        <Card className="space-y-3 p-4">
          <CardHeader
            title="معاينة أثر التغيير"
            subtitle="مطلوب تأكيد صريح قبل الحفظ عند وجود أثر على المسار أو الحقول"
          />
          <ul className="list-disc space-y-1 pe-5 text-sm text-steel-600">
            {impactPreview.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div className="rounded-xl border border-steel-100 bg-steel-50 p-3 text-xs dark:border-steel-800 dark:bg-steel-900/40">
            <p>
              القالب: {PROFILE_TEMPLATE_LABELS[draft.profileTemplate]} · المسار:{" "}
              {WORKFLOW_MODE_LABELS[draft.workflowMode]} · مراحل مفعّلة:{" "}
              {draft.stages.filter((s) => s.enabled).length}
            </p>
            <p className="mt-1 text-steel-500">
              الإصدار الحالي المخزّن: {active.version} · آخر تحديث:{" "}
              {active.updatedAt?.slice(0, 19) || "—"}
            </p>
          </div>
          {confirmApply ? (
            <p className="text-sm font-semibold text-amber-700">
              أكّد الحفظ بالضغط على «حفظ السياسة» أدناه.
            </p>
          ) : null}
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="ghost"
          disabled={!dirty}
          onClick={() => {
            setDraft(active);
            setConfirmApply(false);
            setMessage(null);
          }}
        >
          تجاهل
        </Button>
        <Button
          variant="outline"
          disabled={!dirty}
          onClick={() => save(true)}
        >
          حفظ ومزامنة نوع المنظمة
        </Button>
        <Button disabled={!dirty} onClick={() => save(false)}>
          حفظ السياسة
        </Button>
      </div>
    </div>
  );
}

function policyPreset(client: OrgClientType): OrgPortfolioPolicy {
  if (client === "small") return structuredClone(PORTFOLIO_POLICY_PRESETS.small);
  if (client === "enterprise")
    return structuredClone(PORTFOLIO_POLICY_PRESETS.enterprise);
  return structuredClone(PORTFOLIO_POLICY_PRESETS.government);
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-steel-100 px-3 py-2 dark:border-steel-800">
      <span className="text-sm font-semibold text-steel-700 dark:text-steel-200">
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--color-brand,theme(colors.brand.500))]"
      />
    </label>
  );
}
