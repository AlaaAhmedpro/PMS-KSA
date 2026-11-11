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
import { useLocale } from "../store/LocaleContext";
import type { TFn } from "../lib/i18nDisplay";

type SectionId =
  | "profile"
  | "policies"
  | "workflow"
  | "finance"
  | "preview";

const REL_KEYS: RelationshipTypeKey[] = [
  "contains",
  "aligns_with",
  "depends_on",
  "related_to",
];

function workflowModeLabel(t: TFn, mode: PortfolioWorkflowMode): string {
  return t(`portfolioSettings.workflowMode.${mode}`);
}

function profileTemplateLabel(
  t: TFn,
  key: PortfolioProfileTemplate,
): string {
  return t(`portfolioSettings.profileTemplate.${key}`);
}

export function OrganizationPortfolioSettingsPage() {
  const { t, L, locale } = useLocale();
  const SECTIONS: { id: SectionId; label: string }[] = [
    { id: "profile", label: t("portfolioSettings.section.profile") },
    { id: "policies", label: t("portfolioSettings.section.policies") },
    { id: "workflow", label: t("portfolioSettings.section.workflow") },
    { id: "finance", label: t("portfolioSettings.section.finance") },
    { id: "preview", label: t("portfolioSettings.section.preview") },
  ];
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
        t("portfolioSettings.impact.workflowChange", {
          from: workflowModeLabel(t, active.workflowMode),
          to: workflowModeLabel(t, draft.workflowMode),
        }),
      );
    }
    if (JSON.stringify(draft.stages) !== JSON.stringify(active.stages)) {
      lines.push(t("portfolioSettings.impact.stages"));
    }
    if (draft.requireObjectivesOnSubmit !== active.requireObjectivesOnSubmit) {
      lines.push(
        draft.requireObjectivesOnSubmit
          ? t("portfolioSettings.impact.objectivesOn")
          : t("portfolioSettings.impact.objectivesOff"),
      );
    }
    if (draft.requireBudgetOnSubmit !== active.requireBudgetOnSubmit) {
      lines.push(
        draft.requireBudgetOnSubmit
          ? t("portfolioSettings.impact.budgetOn")
          : t("portfolioSettings.impact.budgetOff"),
      );
    }
    if (draft.lockFieldsAfterApproval !== active.lockFieldsAfterApproval) {
      lines.push(
        draft.lockFieldsAfterApproval
          ? t("portfolioSettings.impact.lockOn")
          : t("portfolioSettings.impact.lockOff"),
      );
    }
    if (!lines.length) {
      lines.push(t("portfolioSettings.impact.none"));
    }
    return lines;
  }, [draft, active, t]);

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
      text: t("portfolioSettings.templateLoaded", {
        name: profileTemplateLabel(t, key),
      }),
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
        text: t("portfolioSettings.reviewSave"),
      });
      return;
    }
    const res = updateOrganizationPortfolioPolicy(draft, {
      alsoSetClientType: alsoClientType,
    });
    if (!res.ok) {
      setMessage({
        ok: false,
        text: L(res.reason) || t("common.saveFailed"),
      });
      return;
    }
    setConfirmApply(false);
    setMessage({
      ok: true,
      text: t("portfolioSettings.saved"),
    });
  };

  if (!allow) {
    return (
      <Card className="p-6">
        <p className="text-sm text-steel-500">{t("portfolioSettings.noAccess")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("portfolioSettings.title")}
        subtitle={`${organization?.name ?? ""} — ${t("portfolioSettings.subtitleSuffix")}`}
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
            title={t("portfolioSettings.profile.title")}
            subtitle={t("portfolioSettings.profile.subtitle")}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Field label={t("portfolioSettings.profile.orgName")}>
              <Input value={organization?.name ?? ""} disabled />
            </Field>
            <Field label={t("portfolioSettings.profile.orgType")}>
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
                  label: t(`client.${k}.short`),
                }))}
              />
            </Field>
            <Field label={t("portfolioSettings.profile.region")}>
              <Input
                value={draft.countryRegion}
                onChange={(e) => patch("countryRegion", e.target.value)}
              />
            </Field>
            <Field label={t("portfolioSettings.profile.currency")}>
              <SearchableSelect
                value={draft.defaultCurrency}
                onChange={(v) =>
                  patch("defaultCurrency", v as OrgPortfolioPolicy["defaultCurrency"])
                }
                options={[
                  { value: "SAR", label: t("portfolioSettings.currency.SAR") },
                  { value: "AED", label: t("portfolioSettings.currency.AED") },
                ]}
              />
            </Field>
            <Field label={t("portfolioSettings.profile.fiscalMonth")}>
              <Input
                value={String(draft.fiscalYearStartMonth)}
                onChange={(e) =>
                  patch("fiscalYearStartMonth", Number(e.target.value) || 1)
                }
              />
            </Field>
            <Field label={t("portfolioSettings.profile.activeTemplate")}>
              <Input
                value={profileTemplateLabel(t, draft.profileTemplate)}
                disabled
              />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {(["small", "enterprise", "government"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => applyTemplate(key)}
                className="rounded-xl border border-steel-200 p-3 text-start hover:border-brand-400 hover:bg-brand-500/5"
              >
                <p className="text-sm font-extrabold">
                  {t(`portfolioSettings.template.${key}`)}
                </p>
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
            title={t("portfolioSettings.policies.title")}
            subtitle={t("portfolioSettings.policies.subtitle")}
          />
          <Toggle
            label={t("portfolioSettings.policies.sponsor")}
            checked={draft.requireSponsor}
            onChange={(v) => patch("requireSponsor", v)}
          />
          <Toggle
            label={t("portfolioSettings.policies.objectives")}
            checked={draft.requireObjectivesOnSubmit}
            onChange={(v) => patch("requireObjectivesOnSubmit", v)}
          />
          <Toggle
            label={t("portfolioSettings.policies.budget")}
            checked={draft.requireBudgetOnSubmit}
            onChange={(v) => patch("requireBudgetOnSubmit", v)}
          />
          <Toggle
            label={t("portfolioSettings.policies.documents")}
            checked={draft.requireDocumentsOnSubmit}
            onChange={(v) => patch("requireDocumentsOnSubmit", v)}
          />
          <Toggle
            label={t("portfolioSettings.policies.directProject")}
            checked={draft.allowDirectProjectLink}
            onChange={(v) => patch("allowDirectProjectLink", v)}
          />
          <Toggle
            label={t("portfolioSettings.policies.lockAfterApproval")}
            checked={draft.lockFieldsAfterApproval}
            onChange={(v) => patch("lockFieldsAfterApproval", v)}
          />
          <Toggle
            label={t("portfolioSettings.policies.separation")}
            checked={draft.separationOfDuties}
            onChange={(v) => patch("separationOfDuties", v)}
          />
          <Toggle
            label={t("portfolioSettings.policies.rejectReason")}
            checked={draft.requireReasonOnReject}
            onChange={(v) => patch("requireReasonOnReject", v)}
          />
          <Toggle
            label={t("portfolioSettings.policies.returnReason")}
            checked={draft.requireReasonOnReturn}
            onChange={(v) => patch("requireReasonOnReturn", v)}
          />
          <Field label={t("portfolioSettings.policies.relTypes")}>
            <div className="flex flex-wrap gap-2">
              {REL_KEYS.map((value) => {
                const on = draft.allowedRelationshipTypes.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      const next = on
                        ? draft.allowedRelationshipTypes.filter(
                            (x) => x !== value,
                          )
                        : [...draft.allowedRelationshipTypes, value];
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
                    {t(`portfolioSettings.rel.${value}`)}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label={t("portfolioSettings.policies.notes")}>
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
            title={t("portfolioSettings.workflow.title")}
            subtitle={t("portfolioSettings.workflow.subtitle")}
          />
          <Field label={t("portfolioSettings.workflow.mode")}>
            <SearchableSelect
              value={draft.workflowMode}
              onChange={(v) => ensureStages(v as PortfolioWorkflowMode)}
              options={(["simple", "standard", "formal"] as const).map((k) => ({
                value: k,
                label: workflowModeLabel(t, k),
              }))}
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
                {locale === "en" ? (
                  <span className="min-w-[12rem] flex-1 text-sm font-semibold text-steel-700 dark:text-steel-200">
                    {L(s.nameAr)}
                  </span>
                ) : (
                  <Input
                    className="min-w-[12rem] flex-1"
                    value={s.nameAr}
                    onChange={(e) => renameStage(s.id, e.target.value)}
                  />
                )}
                <span className="text-[11px] text-steel-400">
                  {t("portfolioSettings.workflow.stageMeta", {
                    role: t(
                      `portfolioSettings.workflow.role.${s.requiredRole}`,
                    ),
                    step: t(`portfolioSettings.workflow.step.${s.key}`),
                  })}
                </span>
                <Button
                  variant={s.enabled ? "primary" : "outline"}
                  size="sm"
                  onClick={() => toggleStage(s.id)}
                >
                  {s.enabled
                    ? t("portfolioSettings.workflow.stageEnabled")
                    : t("portfolioSettings.workflow.stageDisabled")}
                </Button>
              </li>
            ))}
          </ul>
          {!validation.ok ? (
            <p className="text-sm text-red-600">{validation.errors.join(" ")}</p>
          ) : (
            <p className="text-xs text-steel-500">
              {t("portfolioSettings.workflow.valid")}
            </p>
          )}
        </Card>
      ) : null}

      {section === "finance" ? (
        <Card className="space-y-3 p-4">
          <CardHeader
            title={t("portfolioSettings.finance.title")}
            subtitle={t("portfolioSettings.finance.subtitle")}
          />
          <Toggle
            label={t("portfolioSettings.finance.budgetApproval")}
            checked={draft.budgetChangeRequiresApproval}
            onChange={(v) => patch("budgetChangeRequiresApproval", v)}
          />
          <Field label={t("portfolioSettings.finance.threshold")}>
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
          <Field label={t("portfolioSettings.finance.variance")}>
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
            title={t("portfolioSettings.preview.title")}
            subtitle={t("portfolioSettings.preview.subtitle")}
          />
          <ul className="list-disc space-y-1 pe-5 text-sm text-steel-600">
            {impactPreview.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div className="rounded-xl border border-steel-100 bg-steel-50 p-3 text-xs dark:border-steel-800 dark:bg-steel-900/40">
            <p>
              {t("portfolioSettings.preview.summary", {
                template: profileTemplateLabel(t, draft.profileTemplate),
                workflow: workflowModeLabel(t, draft.workflowMode),
                n: draft.stages.filter((s) => s.enabled).length,
              })}
            </p>
            <p className="mt-1 text-steel-500">
              {t("portfolioSettings.preview.version", {
                version: active.version,
                at: active.updatedAt?.slice(0, 19) || t("common.emDash"),
              })}
            </p>
          </div>
          {confirmApply ? (
            <p className="text-sm font-semibold text-amber-700">
              {t("portfolioSettings.preview.confirm")}
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
          {t("common.discard")}
        </Button>
        <Button
          variant="outline"
          disabled={!dirty}
          onClick={() => save(true)}
        >
          {t("common.saveAndSyncOrgType")}
        </Button>
        <Button disabled={!dirty} onClick={() => save(false)}>
          {t("common.savePolicy")}
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
