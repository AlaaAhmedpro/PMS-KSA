import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(root, "..", "src", "pages", "saas", "OrganizationDetailPage.tsx");
let s = fs.readFileSync(file, "utf8");

if (!s.includes("useLocale")) {
  s = s.replace(
    'import { daysUntil } from "../../lib/orgLifecycle";',
    `import { useLocale } from "../../store/LocaleContext";
import { usePlatformLabels } from "../../lib/platformI18n";
import { formatSar } from "../../lib/format";
import { daysUntil } from "../../lib/orgLifecycle";`,
  );
  s = s.replace(
    "import { usePlatform, formatSar } from \"../../store/PlatformStore\";",
    'import { usePlatform } from "../../store/PlatformStore";',
  );
  s = s.replace(
    `import {
  CUSTOMER_KIND_LABELS,
  DEPLOYMENT_LABELS,
  ENTITLEMENT_LABELS,
  SUB_STATUS_LABELS,
  effectiveLimits,
  type EntitlementKey,
  type LimitOverrides,
} from "../../lib/platformDomain";`,
    `import {
  effectiveLimits,
  type EntitlementKey,
  type LimitOverrides,
} from "../../lib/platformDomain";`,
  );
}

s = s.replace(
  /const TABS = \[[\s\S]*?\] as const;\n\ntype TabId = \(typeof TABS\)\[number\]\["id"\];/,
  `const TAB_IDS = [
  "overview",
  "profile",
  "subscription",
  "users",
  "usage",
  "billing",
  "integrations",
  "activity",
  "settings",
] as const;
type TabId = (typeof TAB_IDS)[number];`,
);

if (!s.includes("const tabs = useMemo")) {
  s = s.replace(
    "  const { user } = useAuth();",
    `  const { t, L } = useLocale();
  const {
    customerKind,
    deployment,
    subStatus,
    entitlement,
    provisioning,
  } = usePlatformLabels();
  const tabs = useMemo(
    () => TAB_IDS.map((id) => ({ id, label: t(\`org.tab.\${id}\`) })),
    [t],
  );
  const { user } = useAuth();`,
  );
}

s = s.replaceAll("TABS.map", "tabs.map");
s = s.replaceAll("TABS.find", "tabs.find");

const jsxMap = {
  "العودة للقائمة": '{t("common.back")}',
  "تعديل": '{t("common.edit")}',
  "إلغاء": '{t("common.cancel")}',
  "تأكيد": '{t("common.confirm")}',
  "حفظ": '{t("common.save")}',
  "أرشفة": '{t("org.action.archive")}',
  "إدارة الاشتراك": '{t("org.tab.subscription")}',
  "تغيير الخطة": '{t("org.changePlan")}',
  "تعديل التجاوزات": '{t("org.action.limits")}',
  "تمديد التجربة 14 يوماً": '{t("org.extendTrial")}',
  "دعوة مسؤول": '{t("org.inviteAdmin")}',
  "المزيد": '{t("common.more")}',
  "آخر الفواتير": '{t("org.lastInvoices")}',
  "لا تنبيهات تشغيلية حالياً.": '{t("org.noAlerts")}',
  "التجهيز": '{t("org.provisioning")}',
  "حفظ الملف": '{t("org.saveProfile")}',
  "لا فواتير.": '{t("org.noInvoices")}',
  "لا مستخدمين مسجّلين لهذه المنشأة.": '{t("org.noUsers")}',
  "لا نشاط مسجّل.": '{t("org.noActivity")}',
  "تذاكر مرتبطة": '{t("org.relatedTickets")}',
  "وحدات الكور": '{t("org.coreModules")}',
  "الاسم": '{t("common.name")}',
  "البريد": '{t("common.email")}',
  "الدور": '{t("org.col.role")}',
  "الحالة": '{t("common.status")}',
  "الفاتورة": '{t("org.invoice")}',
  "الاستحقاق": '{t("page.billing.col.due")}',
  "المبلغ": '{t("org.amount")}',
  "إرسال الدعوة": '{t("org.sendInvite")}',
  "بدء الجلسة": '{t("org.startSession")}',
  "إنهاء الجلسة": '{t("org.endSession")}',
  "قراءة فقط (افتراضي)": '{t("org.readOnlyDefault")}',
  "تأكيد التعليق": '{t("org.confirmSuspend")}',
  "تأكيد تغيير الخطة": '{t("org.confirmPlanChange")}',
  "الحالية": '{t("org.current")}',
  "إشعارات الفوترة": '{t("org.notifyBilling")}',
};

for (const [ar, en] of Object.entries(jsxMap)) {
  s = s.replaceAll(`>${ar}<`, `>${en}<`);
}

s = s.replace(
  'title="المنشأة غير موجودة"',
  'title={t("org.notFound")}',
);
s = s.replace(
  'subtitle={`${CUSTOMER_KIND_LABELS[org.customerKind]} · ${org.city} · ${DEPLOYMENT_LABELS[org.deploymentType]}`}',
  "subtitle={`${customerKind(org.customerKind)} · ${org.city} · ${deployment(org.deploymentType)}`}",
);

s = s.replaceAll("SUB_STATUS_LABELS[sub.status]", "subStatus(sub.status)");
s = s.replaceAll("ENTITLEMENT_LABELS[key]", "entitlement(key)");

s = s.replace(
  /list\.push\(\s*`معلّقة: \$\{org\.suspension\?\.reason \|\| "بدون سبب مسجّل"\}`,\s*\);/,
  `list.push(
        t("org.alert.suspended", {
          reason: org.suspension?.reason || t("org.alert.noReason"),
        }),
      );`,
);
s = s.replace(
  'list.push("اشتراك متأخر السداد.");',
  'list.push(t("org.alert.pastDue"));',
);
s = s.replace(
  /list\.push\("التخزين يقترب من الحد\."\);/,
  'list.push(t("org.alert.storage"));',
);
s = s.replace(
  'list.push("فشل تجهيز البيئة.");',
  'list.push(t("org.alert.provisionFail"));',
);

const attrMap = {
  'label="تعديل الحدود"': 'label={t("org.action.limits")}',
  'label="إعادة تفعيل"': 'label={t("org.action.reactivate")}',
  'label="تعليق"': 'label={t("org.action.suspend")}',
  'label="وصول دعم"': 'label={t("org.action.supportAccess")}',
  'label="أرشفة"': 'label={t("org.action.archive")}',
  'title="تعليق المنشأة"': 'title={t("org.suspend.title")}',
  'title="إعادة تفعيل المنشأة"': 'title={t("org.reactivate.title")}',
  'title="أرشفة المنشأة"': 'title={t("org.archive.title")}',
  'title="وصول الدعم"': 'title={t("org.supportAccess.title")}',
  'title="تجاوز حدود الخطة"': 'title={t("org.limits.title")}',
  'title="دعوة مسؤول منشأة"': 'title={t("org.inviteOrgAdmin")}',
  'label="الخطة المقترحة"': 'label={t("org.suggestedPlan")}',
  'label="لغة الواجهة"': 'label={t("org.uiLanguage")}',
  'label="المنطقة الزمنية"': 'label={t("org.timezone")}',
  'label="الفئة"': 'label={t("org.suspend.category")}',
  'label="السبب"': 'label={t("org.suspend.reason")}',
  'label="ملاحظات"': 'label={t("org.suspend.notes")}',
  'label="سبب الأرشفة"': 'label={t("org.archive.reason")}',
  'label="المدة (دقيقة)"': 'label={t("org.support.durationMin")}',
  'label="الاسم"': 'label={t("common.name")}',
  'label="البريد"': 'label={t("common.email")}',
  'aria-label="إغلاق"': 'aria-label={t("common.cancel")}',
  'label="جاهزية / تسمية"': 'label={t("org.integrations.readiness")}',
};

for (const [from, to] of Object.entries(attrMap)) {
  s = s.replaceAll(from, to);
}

s = s.replace(
  /\["legalName", "الاسم القانوني"\],[\s\S]*?\["accountManagerName", "مدير الحساب"\],/,
  `["legalName", t("org.field.legalName")],
                  ["crNumber", t("org.field.cr")],
                  ["vatNumber", t("org.field.vat")],
                  ["nationalAddress", t("org.field.nationalAddress")],
                  ["website", t("org.field.website")],
                  ["city", t("org.field.city")],
                  ["contactName", t("org.field.contact")],
                  ["contactEmail", t("org.field.contactEmail")],
                  ["contactPhone", t("org.field.contactPhone")],
                  ["accountManagerName", t("org.field.accountManager")],`,
);

s = s.replace(
  `list.push(\`الفترة التجريبية تنتهي خلال \${d} يوماً.\`);`,
  'list.push(t("org.alert.trialEnding", { d }));',
);
s = s.replace(
  "list.push(`${failedInv.length} فاتورة بفشل دفع.`);",
  'list.push(t("org.alert.failedInvoices", { n: failedInv.length }));',
);

s = s.replace(
  /"ناجح"|"جارٍ"|"فشل"|"خامل"/g,
  (m) => {
    const map = {
      '"ناجح"': 'provisioning("succeeded")',
      '"جارٍ"': 'provisioning("running")',
      '"فشل"': 'provisioning("failed")',
      '"خامل"': 'provisioning("idle")',
    };
    return map[m] || m;
  },
);

fs.writeFileSync(file, s, "utf8");
console.log("patched OrganizationDetailPage");