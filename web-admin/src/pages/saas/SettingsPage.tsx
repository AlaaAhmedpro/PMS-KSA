import { useState } from "react";
import { PageScaffold } from "../../components/sa/PageScaffold";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Input";
import { usePlatform } from "../../store/PlatformStore";
import { useAuth } from "../../store/AuthContext";
import { can } from "../../lib/platformRbac";

const TABS = [
  "عام",
  "التوطين",
  "الهوية",
  "الإشعارات",
  "قوالب البريد",
  "التكاملات",
  "Feature Flags",
  "الصيانة",
] as const;

export function SettingsPage() {
  const { settings, updateSettings, setFeatureFlag, resetPlatformDemo } =
    usePlatform();
  const { user } = useAuth();
  const writable = can(user?.role, "settings.write");
  const [tab, setTab] = useState<(typeof TABS)[number]>("عام");
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);

  const save = () => {
    if (!writable) return;
    updateSettings(draft);
    setSaved(true);
  };

  return (
    <PageScaffold
      title="إعدادات المنصة"
      subtitle="تكوين عام للمنصة — آسيا/الرياض · ر.س"
      actions={
        writable ? (
          <Button onClick={save}>{saved ? "تم الحفظ" : "حفظ"}</Button>
        ) : null
      }
    >
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 px-3 py-2 text-xs font-bold ${
              tab === t ? "border-b-2 border-blue-600 text-blue-700" : "text-slate-500"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="sa-surface p-4">
        {tab === "عام" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="اسم المنصة">
              <Input
                disabled={!writable}
                value={draft.platformName}
                onChange={(e) =>
                  setDraft({ ...draft, platformName: e.target.value })
                }
              />
            </Field>
            <Field label="المنطقة الزمنية">
              <Input disabled value={draft.defaultTimezone} />
            </Field>
            <Field label="العملة">
              <Input disabled value={draft.defaultCurrency} />
            </Field>
            <Field label="نسبة الضريبة">
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
            <Field label="بريد النظام">
              <Input
                disabled={!writable}
                value={draft.emailFrom}
                onChange={(e) =>
                  setDraft({ ...draft, emailFrom: e.target.value })
                }
              />
            </Field>
            <Field label="بريد الدعم">
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

        {tab === "التوطين" && (
          <ul className="space-y-2 text-sm text-slate-700">
            <li>العربية (افتراضي) مع RTL كامل</li>
            <li>الإنجليزية مع LTR</li>
            <li>تنسيق أرقام وتواريخ حسب لغة الواجهة</li>
            <li>العملة: ر.س مع خانتين عشريتين</li>
          </ul>
        )}

        {tab === "الهوية" && (
          <p className="text-sm text-slate-600">
            شعار المنصة وألوان البريد وشاشة الدخول تُدار من أصول العلامة الحالية
            (نماء). التعديل البصري التفصيلي خارج نطاق هذا الديمو.
          </p>
        )}

        {tab === "الإشعارات" && (
          <ul className="space-y-2 text-sm">
            {[
              "تذكير الاشتراك",
              "فشل الدفع",
              "تنبيهات النظام",
              "إشعارات داخل المنصة",
            ].map((n) => (
              <li key={n} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                <span className="font-semibold">{n}</span>
                <span className="text-xs text-emerald-700">مفعّل (ديمو)</span>
              </li>
            ))}
          </ul>
        )}

        {tab === "قوالب البريد" && (
          <ul className="space-y-2 text-sm">
            {[
              "ترحيب",
              "دعوة",
              "إعادة تعيين كلمة المرور",
              "تأكيد اشتراك",
              "فاتورة",
              "فشل دفع",
              "انتهاء تجربة",
            ].map((t) => (
              <li key={t} className="rounded-md border border-slate-200 px-3 py-2 font-semibold">
                قالب: {t}
              </li>
            ))}
          </ul>
        )}

        {tab === "التكاملات" && (
          <ul className="space-y-2 text-sm">
            {[
              "بوابة دفع (تجريبي)",
              "مزود بريد",
              "SMS",
              "Webhooks",
              "Muqeem / Qiwa / GOSI (تسميات جاهزية)",
            ].map((t) => (
              <li key={t} className="flex justify-between rounded-md border border-slate-200 px-3 py-2">
                <span className="font-semibold">{t}</span>
                <span className="text-xs text-slate-400">إعدادات ديمو</span>
              </li>
            ))}
          </ul>
        )}

        {tab === "Feature Flags" && (
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

        {tab === "الصيانة" && (
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
              وضع الصيانة
            </label>
            {writable ? (
              <Button variant="danger" onClick={() => resetPlatformDemo()}>
                إعادة ضبط بيانات الديمو
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </PageScaffold>
  );
}
