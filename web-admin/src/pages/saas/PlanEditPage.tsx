import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageScaffold } from "../../components/sa/PageScaffold";
import { Button } from "../../components/ui/Button";
import { Field, Input, Textarea } from "../../components/ui/Input";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { usePlatform } from "../../store/PlatformStore";
import { useAuth } from "../../store/AuthContext";
import { can } from "../../lib/platformRbac";
import {
  entitlementsToModules,
  type EntitlementKey,
  type PlanEntitlements,
  type SubscriptionPlan,
} from "../../lib/platformDomain";
import { useLocale } from "../../store/LocaleContext";
import { usePlatformLabels } from "../../lib/platformI18n";

const ENT_KEYS: EntitlementKey[] = [
  "portfolio",
  "program",
  "initiative",
  "strategicObjectives",
  "advancedReporting",
  "resourceManagement",
  "customWorkflows",
  "advancedRbac",
  "apiAccess",
  "aiFeatures",
  "advancedAnalytics",
  "customBranding",
  "sso",
  "dedicatedDatabase",
  "prioritySupport",
];

function emptyPlan(): SubscriptionPlan {
  const entitlements = Object.fromEntries(
    ENT_KEYS.map((k) => [k, false]),
  ) as PlanEntitlements;
  return {
    id: `plan-${crypto.randomUUID().slice(0, 6)}`,
    name: "",
    description: "",
    workflow: "",
    clientType: "small",
    priceMonthly: 0,
    priceAnnual: 0,
    trialDays: 14,
    seatsIncluded: 25,
    limits: { maxUsers: 25, maxProjects: 40, maxStorageGb: 50, maxApiRequests: 20000 },
    entitlements,
    enabledModules: entitlementsToModules(entitlements),
    features: [],
    active: true,
    billingCycleDefault: "monthly",
  };
}

export function PlanEditPage() {
  const { id } = useParams();
  const isNew = id === "new";
  const { plans, upsertPlan, updatePlan } = usePlatform();
  const { user } = useAuth();
  const { t } = useLocale();
  const { entitlement, clientLabel } = usePlatformLabels();
  const writable = can(user?.role, "plans.write");
  const navigate = useNavigate();
  const existing = plans.find((p) => p.id === id);

  const [draft, setDraft] = useState<SubscriptionPlan>(() =>
    isNew ? emptyPlan() : existing ? structuredClone(existing) : emptyPlan(),
  );
  const [featuresText, setFeaturesText] = useState(
    (existing?.features || []).join("\n"),
  );
  const [saved, setSaved] = useState(false);

  const title = useMemo(
  () =>
      isNew
        ? t("page.planEdit.create")
        : `${t("page.planEdit.title")}: ${existing?.name || id}`,
    [isNew, existing, id, t],
  );

  if (!isNew && !existing) {
    return (
      <PageScaffold title={t("page.planEdit.notFound")}>
        <Link to="/plans" className="text-sm font-bold text-blue-600">
          {t("common.back")}
        </Link>
      </PageScaffold>
    );
  }

  const save = () => {
    if (!writable) return;
    const next: SubscriptionPlan = {
      ...draft,
      features: featuresText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      enabledModules: entitlementsToModules(draft.entitlements),
    };
    if (isNew) upsertPlan(next);
    else updatePlan(next.id, next);
    setSaved(true);
    navigate("/plans");
  };

  return (
    <PageScaffold
      title={title}
      subtitle={t("page.planEdit.subtitle")}
      actions={
        writable ? (
          <Button onClick={save}>{t("common.save")}</Button>
        ) : (
          <StatusReadonly label={t("domain.platformRole.readonly_admin")} />
        )
      }
    >
      <div className="sa-surface grid gap-4 p-4 lg:grid-cols-2">
        <Field label={t("common.name")}>
          <Input
            disabled={!writable}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </Field>
        <Field label={t("page.planEdit.clientType")}>
          <SearchableSelect
            value={draft.clientType}
            onChange={(v) =>
              setDraft({
                ...draft,
                clientType: v as SubscriptionPlan["clientType"],
              })
            }
            options={(
              ["small", "enterprise", "government"] as const
            ).map((v) => ({ value: v, label: clientLabel(v) }))}
          />
        </Field>
        <Field label={t("common.description")} className="lg:col-span-2">
          <Textarea
            disabled={!writable}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </Field>
        <Field label={t("page.planEdit.priceMonthly")}>
          <Input
            type="number"
            disabled={!writable}
            value={draft.priceMonthly}
            onChange={(e) =>
              setDraft({ ...draft, priceMonthly: Number(e.target.value) || 0 })
            }
          />
        </Field>
        <Field label={t("page.planEdit.priceAnnual")}>
          <Input
            type="number"
            disabled={!writable}
            value={draft.priceAnnual}
            onChange={(e) =>
              setDraft({ ...draft, priceAnnual: Number(e.target.value) || 0 })
            }
          />
        </Field>
        <Field label={t("page.planEdit.trialDays")}>
          <Input
            type="number"
            disabled={!writable}
            value={draft.trialDays}
            onChange={(e) =>
              setDraft({ ...draft, trialDays: Number(e.target.value) || 0 })
            }
          />
        </Field>
        <Field label={t("page.planEdit.seats")}>
          <Input
            type="number"
            disabled={!writable}
            value={draft.seatsIncluded}
            onChange={(e) =>
              setDraft({ ...draft, seatsIncluded: Number(e.target.value) || 0 })
            }
          />
        </Field>
        {(
          [
            ["maxUsers", t("page.planEdit.limit.users")],
            ["maxProjects", t("page.planEdit.limit.projects")],
            ["maxStorageGb", t("page.planEdit.limit.storage")],
            ["maxApiRequests", t("page.planEdit.limit.api")],
          ] as const
        ).map(([key, label]) => (
          <Field key={key} label={label}>
            <Input
              type="number"
              disabled={!writable}
              value={draft.limits[key]}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  limits: {
                    ...draft.limits,
                    [key]: Number(e.target.value) || 0,
                  },
                })
              }
            />
          </Field>
        ))}
        <Field label={t("page.planEdit.features")} className="lg:col-span-2">
          <Textarea
            disabled={!writable}
            rows={4}
            value={featuresText}
            onChange={(e) => setFeaturesText(e.target.value)}
          />
        </Field>
      </div>

      <div className="sa-surface p-4">
        <h3 className="text-sm font-extrabold">{t("page.planEdit.entitlements")}</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ENT_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={!writable}
                checked={!!draft.entitlements[key]}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    entitlements: {
                      ...draft.entitlements,
                      [key]: e.target.checked,
                    },
                  })
                }
              />
              {entitlement(key)}
            </label>
          ))}
        </div>
      </div>
      {saved ? null : null}
    </PageScaffold>
  );
}

function StatusReadonly({ label }: { label: string }) {
  return <span className="text-xs font-semibold text-slate-400">{label}</span>;
}