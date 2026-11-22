import { useMemo, useState } from "react";
import { PageScaffold } from "../../components/sa/PageScaffold";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Input";
import { usePlatform } from "../../store/PlatformStore";
import { useAuth } from "../../store/AuthContext";
import { can } from "../../lib/platformRbac";
import { useLocale } from "../../store/LocaleContext";

const TAB_IDS = [
  "general",
  "locale",
  "branding",
  "notifications",
  "email",
  "integrations",
  "flags",
  "maintenance",
] as const;

type TabId = (typeof TAB_IDS)[number];

export function SettingsPage() {
  const { settings, updateSettings, setFeatureFlag, resetPlatformDemo } =
    usePlatform();
  const { user } = useAuth();
  const { t } = useLocale();
  const writable = can(user?.role, "settings.write");
  const [tab, setTab] = useState<TabId>("general");
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);

  const tabLabel = useMemo(
    () =>
      ({
        general: t("page.settings.tab.general"),
        locale: t("page.settings.tab.locale"),
        branding: t("page.settings.tab.branding"),
        notifications: t("page.settings.tab.notifications"),
        email: t("page.settings.tab.email"),
        integrations: t("page.settings.tab.integrations"),
        flags: t("page.settings.tab.flags"),
        maintenance: t("page.settings.tab.maintenance"),
      }) satisfies Record<TabId, string>,
    [t],
  );

  const save = () => {
    if (!writable) return;
    updateSettings(draft);
    setSaved(true);
  };

  return (
    <PageScaffold
      title={t("page.settings.title")}
      subtitle={t("page.settings.subtitle")}
      actions={
        writable ? (
          <Button onClick={save}>{saved ? t("common.saved") : t("common.save")}</Button>
        ) : null
      }
    >
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TAB_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`shrink-0 px-3 py-2 text-xs font-bold ${
              tab === id ? "border-b-2 border-blue-600 text-blue-700" : "text-slate-500"
            }`}
          >
            {tabLabel[id]}
          </button>
        ))}
      </div>

      <div className="sa-surface p-4">
        {tab === "general" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("page.settings.field.platformName")}>
              <Input
                disabled={!writable}
                value={draft.platformName}
                onChange={(e) =>
                  setDraft({ ...draft, platformName: e.target.value })
                }
              />
            </Field>
            <Field label={t("page.settings.field.timezone")}>
              <Input disabled value={draft.defaultTimezone} />
            </Field>
            <Field label={t("page.settings.field.currency")}>
              <Input disabled value={draft.defaultCurrency} />
            </Field>
            <Field label={t("page.settings.field.vat")}>
              <Input
                type="number"
                step="0.01"
                disabled={!writable}
                value={draft.vatRate}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    vatRate: Number(e.target.value) || 0,
                  })
                }
              />
            </Field>
            <Field label={t("page.settings.field.emailFrom")}>
              <Input
                disabled={!writable}
                value={draft.emailFrom}
                onChange={(e) =>
                  setDraft({ ...draft, emailFrom: e.target.value })
                }
              />
            </Field>
            <Field label={t("page.settings.field.supportEmail")}>
              <Input
                disabled={!writable}
                value={draft.supportEmail}
                onChange={(e) =>
                  setDraft({ ...draft, supportEmail: e.target.value })
                }
              />
            </Field>
          </div>
        )}

        {tab === "locale" && (
          <ul className="space-y-2 text-sm text-slate-700">
            <li>{t("page.settings.locale.bullet1")}</li>
            <li>{t("page.settings.locale.bullet2")}</li>
            <li>{t("page.settings.locale.bullet3")}</li>
            <li>{t("page.settings.locale.bullet4")}</li>
          </ul>
        )}

        {tab === "branding" && (
          <p className="text-sm text-slate-600">{t("page.settings.branding.body")}</p>
        )}

        {tab === "notifications" && (
          <ul className="space-y-2 text-sm">
            {[
              t("page.settings.notify.subReminder"),
              t("page.settings.notify.payFail"),
              t("page.settings.notify.system"),
              t("page.settings.notify.inApp"),
            ].map((n) => (
              <li
                key={n}
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
              >
                <span className="font-semibold">{n}</span>
                <span className="text-xs text-emerald-700">
                  {t("page.settings.notify.enabled")}
                </span>
              </li>
            ))}
          </ul>
        )}

        {tab === "email" && (
          <ul className="space-y-2 text-sm">
            {[
              t("page.settings.email.welcome"),
              t("page.settings.email.invite"),
              t("page.settings.email.reset"),
              t("page.settings.email.subConfirm"),
              t("page.settings.email.invoice"),
              t("page.settings.email.payFail"),
              t("page.settings.email.trialEnd"),
            ].map((name) => (
              <li
                key={name}
                className="rounded-md border border-slate-200 px-3 py-2 font-semibold"
              >
                {t("page.settings.email.template", { name })}
              </li>
            ))}
          </ul>
        )}

        {tab === "integrations" && (
          <ul className="space-y-2 text-sm">
            {[
              t("page.settings.integ.pay"),
              t("page.settings.integ.mail"),
              t("page.settings.integ.sms"),
              t("page.settings.integ.webhooks"),
              t("page.settings.integ.gov"),
            ].map((name) => (
              <li
                key={name}
                className="flex justify-between rounded-md border border-slate-200 px-3 py-2"
              >
                <span className="font-semibold">{name}</span>
                <span className="text-xs text-slate-400">{t("page.settings.integ.demo")}</span>
              </li>
            ))}
          </ul>
        )}

        {tab === "flags" && (
          <div className="space-y-2">
            {Object.entries(settings.featureFlags).map(([key, value]) => (
              <label
                key={key}
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                <span className="font-semibold">{key}</span>
                <input
                  type="checkbox"
                  disabled={!writable}
                  checked={value}
                  onChange={(e) => setFeatureFlag(key, e.target.checked)}
                />
              </label>
            ))}
          </div>
        )}

        {tab === "maintenance" && (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                disabled={!writable}
                checked={draft.maintenanceMode}
                onChange={(e) =>
                  setDraft({ ...draft, maintenanceMode: e.target.checked })
                }
              />
              {t("page.settings.maint.mode")}
            </label>
            {writable ? (
              <Button variant="danger" onClick={() => resetPlatformDemo()}>
                {t("page.settings.maint.reset")}
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </PageScaffold>
  );
}