import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const corePath = path.join(root, "..", "web-core", "src", "i18n", "contentEn.ts");
const coreSrc = fs.readFileSync(corePath, "utf8");
const coreMatch = coreSrc.match(/export const CONTENT_EN[^=]*=\s*(\{[\s\S]*\});/);
if (!coreMatch) {
  console.error("Could not parse web-core contentEn");
  process.exit(1);
}

/** Admin-specific Arabic → English (extends web-core). */
const ADMIN_EN = {
  "شركة نماء للتطوير": "Namaa Development Company",
  "مجموعة أفق للمقاولات": "Afaq Contracting Group",
  "أرامكو للخدمات التقنية": "Aramco Technical Services",
  "هيئة تطوير المنطقة الشرقية": "Eastern Region Development Authority",
  "جامعة الملك سعود — قطاع المشاريع": "King Saud University — Projects Sector",
  "شركة الرياض للتمويل": "Riyadh Finance Company",
  "مؤسسة بِناء للتقنية": "Binaa Technology Foundation",
  "شركة الخليج للاستشارات": "Gulf Consulting Company",
  "تذكرة دعم — بطء لوحة المؤشرات": "Support ticket — dashboard slowness",
  "تذكرة دعم — تفعيل SSO": "Support ticket — SSO activation",
  "مشكلة في ربط ZATCA": "ZATCA integration issue",
  "طلب زيادة مقاعد": "Seat increase request",
  "استفسار عن ترقية الخطة": "Plan upgrade inquiry",
  "لمى سعد القحطاني": "Lama Saad Al-Qahtani",
  "عبدالله محمد العتيبي": "Abdullah Mohammed Al-Otaibi",
  "مسؤول المنصة": "Platform administrator",
  "النظام": "System",
  "إيقاف التجديد التلقائي من بوابة المنصة": "Auto-renew disabled from platform portal",
  "تفعيل التجديد التلقائي من بوابة المنصة": "Auto-renew enabled from platform portal",
  "تحويل فرصة إلى اشتراك تجريبي": "Converted lead to trial subscription",
  "تغيير حالة الاشتراك إلى": "Subscription status changed to",
  "المنشأة غير موجودة.": "Organization not found.",
  "الاشتراك غير موجود.": "Subscription not found.",
  "انتقال حالة الاشتراك غير مسموح.": "Subscription status transition not allowed.",
  "لا يمكن تعليق المنشأة من حالتها الحالية.": "Cannot suspend organization from its current state.",
  "لا يمكن إعادة التفعيل من الحالة الحالية.": "Cannot reactivate from current state.",
  "يوجد اشتراك متأخر السداد. عالج الفوترة أولاً.": "Subscription is past due. Resolve billing first.",
  "اسم المنشأة مطلوب.": "Organization name is required.",
  "منشأة بنفس الاسم أو السجل التجاري موجودة.": "An organization with the same name or CR number exists.",
  "مقاولات": "Contracting",
  "تمويل": "Finance",
  "حكومي": "Government",
  "تعليم": "Education",
  "صحة": "Healthcare",
  "طاقة": "Energy",
  "تجزئة": "Retail",
  "لوجستيات": "Logistics",
  "جدة": "Jeddah",
  "أبها": "Abha",
  "تجريبي": "Trial",
  "أساسي": "Starter",
  "احترافي": "Professional",
  "أعمال": "Business",
  "مؤسسي / حكومي": "Enterprise / Government",
  "للشركات الصغيرة وفرق التنفيذ.": "For small companies and delivery teams.",
  "للمؤسسات المتوسطة وبرامج متعددة.": "For mid-size organizations with multiple programs.",
  "لمكاتب إدارة المشاريع والاستشارات.": "For PMO and consulting firms.",
  "للجهات الحكومية والمؤسسات الكبرى مع نشر مخصص.": "For government and large institutions with dedicated deployment.",
  "مشاريع محدودة": "Limited projects",
  "لوحة مؤشرات": "Dashboard",
  "دعم عبر البريد": "Email support",
  "محفظة مبسّطة": "Simplified portfolio",
  "مشاريع ومهام": "Projects and tasks",
  "تقارير أساسية": "Core reports",
  "محافظ وبرامج": "Portfolios and programs",
  "أهداف": "Objectives",
  "تحليلات": "Analytics",
  "مبادرات": "Initiatives",
  "هوية مخصصة": "Custom branding",
  "دعم أولوية": "Priority support",
  "قاعدة مخصصة": "Dedicated database",
  "امتثال وحوكمة": "Compliance and governance",
  "دعم مؤسسي": "Enterprise support",
};

// Parse existing CORE object (eval in isolated way)
const coreObj = Function(`return ${coreMatch[1]}`)();
const merged = { ...coreObj, ...ADMIN_EN };

// Harvest quoted Arabic from saasSeed
const seedSrc = fs.readFileSync(path.join(root, "src/lib/saasSeed.ts"), "utf8");
const re = /["']([^"']*[\u0600-\u06FF][^"']*)["']/g;
let m;
while ((m = re.exec(seedSrc))) {
  const ar = m[1];
  if (!merged[ar]) merged[ar] = ar; // placeholder: same string flags missing translation
}

const lines = Object.entries(merged)
  .sort(([a], [b]) => b.length - a.length)
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`);

const out = `/** Arabic source string → English display (display-only; never mutate stored Arabic). */
export const CONTENT_EN: Record<string, string> = {
${lines.join("\n")}
};
`;

fs.writeFileSync(path.join(root, "src/i18n/contentEn.ts"), out, "utf8");
const placeholders = Object.values(merged).filter((v, i) => {
  const k = Object.keys(merged)[i];
  return /[\u0600-\u06FF]/.test(String(v)) && /[\u0600-\u06FF]/.test(k);
});
console.log("Wrote contentEn.ts entries:", Object.keys(merged).length);
console.log("Placeholder (untranslated) entries:", placeholders.length);