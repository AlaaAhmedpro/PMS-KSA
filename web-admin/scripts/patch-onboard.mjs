import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const file = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "pages",
  "saas",
  "OrganizationOnboardPage.tsx",
);
let s = fs.readFileSync(file, "utf8");

if (!s.includes("useLocale")) {
  s = s.replace(
    'import type { OrgClientType } from "../../lib/types";',
    `import type { OrgClientType } from "../../lib/types";
import { useLocale } from "../../store/LocaleContext";
import { usePlatformLabels } from "../../lib/platformI18n";
import { formatSar } from "../../lib/format";`,
  );
  s = s.replace(
    `import {
  CUSTOMER_KIND_LABELS,
  DEPLOYMENT_LABELS,
  formatSar,
  type OrgCustomerKind,
  type OrgDeploymentType,
} from "../../lib/platformDomain";`,
    `import type { OrgCustomerKind, OrgDeploymentType } from "../../lib/platformDomain";`,
  );
}

s = s.replace(
  `const STEPS = [
  "البيانات الأساسية",
  "الاشتراك والنشر",
  "المسؤول الرئيسي",
  "مراجعة وإنشاء",
] as const;`,
  `const STEP_KEYS = [
  "page.onboard.step.basic",
  "page.onboard.step.subscription",
  "page.onboard.step.admin",
  "page.onboard.step.review",
] as const;`,
);

if (!s.includes("const { t, L } = useLocale")) {
  s = s.replace(
    "export function OrganizationOnboardPage() {",
    `export function OrganizationOnboardPage() {
  const { t, L } = useLocale();
  const { customerKind, deployment, customerKindOptions, deploymentOptions, clientLabel } =
    usePlatformLabels();`,
  );
}

s = s.replaceAll("STEPS.map", "STEP_KEYS.map");
s = s.replace(
  /STEP_KEYS\.map\(\(label, i\)/g,
  "STEP_KEYS.map((key, i)",
);
s = s.replace(
  /key=\{label\}/g,
  "key={key}",
);
s = s.replace(
  /\{i \+ 1\}\. \{label\}/g,
  "{i + 1}. {t(key)}",
);

const attr = {
  'title="إضافة منشأة"': 'title={t("page.orgs.onboard")}',
  'title="تهيئة منشأة جديدة"': 'title={t("page.onboard.title")}',
  'subtitle="معالج تسجيل عميل مع محاكاة التجهيز ومزامنة الكور"':
    'subtitle={t("page.onboard.subtitle")}',
  ">إلغاء<": ">{t('common.cancel')}<",
  ">العودة<": ">{t('common.back')}<",
  'label="اسم المنشأة"': 'label={t("page.onboard.orgName")}',
  'label="الاسم القانوني"': 'label={t("org.field.legalName")}',
  'label="السجل التجاري"': 'label={t("org.field.cr")}',
};

for (const [a, b] of Object.entries(attr)) {
  s = s.replaceAll(a, b);
}

s = s.replace(
  'setError(res.reason || "تعذّر الإنشاء");',
  'setError(res.reason || t("page.onboard.createFail"));',
);
s = s.replace(
  '<p className="text-sm text-slate-500">لا صلاحية للإنشاء.</p>',
  '<p className="text-sm text-slate-500">{t("page.onboard.noPerm")}</p>',
);

s = s.replaceAll(
  "Object.entries(CUSTOMER_KIND_LABELS)",
  "customerKindOptions().map((o) => [o.value, o.label] as const).concat() ? customerKindOptions() : customerKindOptions()",
);
// fix broken - do simpler
s = s.replaceAll(
  /options=\{Object\.entries\(CUSTOMER_KIND_LABELS\)\.map\(\s*\(\[value, label\]\) => \(\{ value, label \}\),\s*\)\}/g,
  "options={customerKindOptions()}",
);
s = s.replaceAll(
  /options=\{Object\.entries\(DEPLOYMENT_LABELS\)\.map\(\s*\(\[value, label\]\) => \(\{ value, label \}\),\s*\)\}/g,
  "options={deploymentOptions()}",
);
s = s.replaceAll("CUSTOMER_KIND_LABELS[basic.customerKind]", "customerKind(basic.customerKind)");

fs.writeFileSync(file, s, "utf8");
console.log("patched OrganizationOnboardPage");