/**
 * Rebuild contentEn.ts from web-core map + SaaS seed Arabic strings.
 * Identity (AR→AR) entries are rewritten via EXTRA or left for manual EXTRA.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const coreContentPath = path.join(root, "../web-core/src/i18n/contentEn.ts");
const outPath = path.join(root, "src/i18n/contentEn.ts");

const ARABIC_RE = /[\u0600-\u06FF]/;

/** SaaS-specific translations (and fixes for seed phrases). */
const EXTRA = {
  "شركة نماء للتطوير": "Namaa Development Company",
  "مجموعة أفق للمقاولات": "Afaq Contracting Group",
  "أرامكو للخدمات التقنية": "Aramco Technical Services",
  "هيئة تطوير المنطقة الشرقية": "Eastern Region Development Authority",
  "جامعة الملك سعود — قطاع المشاريع": "King Saud University — Projects Sector",
  "شركة الرياض للتمويل": "Riyadh Finance Company",
  "مؤسسة بِناء للتقنية": "Binaa Technology Foundation",
  "شركة الخليج للاستشارات": "Gulf Consulting Company",
  "وزارة البلديات والإسكان": "Ministry of Municipalities and Housing",
  "الهيئة الملكية لمدينة الرياض": "Royal Commission for Riyadh City",
  "تذكرة دعم — بطء لوحة المؤشرات": "Support ticket — dashboard slowness",
  "تذكرة دعم — تفعيل SSO": "Support ticket — SSO activation",
  "مشكلة في ربط ZATCA": "ZATCA integration issue",
  "طلب زيادة مقاعد": "Seat increase request",
  "استفسار عن ترقية الخطة": "Plan upgrade inquiry",
  "عبدالله محمد العتيبي": "Abdullah Mohammed Al-Otaibi",
  "مسؤول المنصة": "Platform administrator",
  "النظام": "System",
  "إيقاف التجديد التلقائي من بوابة المنصة":
    "Auto-renew disabled from platform portal",
  "تفعيل التجديد التلقائي من بوابة المنصة":
    "Auto-renew enabled from platform portal",
  "تحويل فرصة إلى اشتراك تجريبي": "Converted lead to trial subscription",
  "تغيير حالة الاشتراك إلى": "Subscription status changed to",
  "المنشأة غير موجودة.": "Organization not found.",
  "الاشتراك غير موجود.": "Subscription not found.",
  "انتقال حالة الاشتراك غير مسموح.":
    "Subscription status transition not allowed.",
  "لا يمكن تعليق المنشأة من حالتها الحالية.":
    "Cannot suspend organization from its current state.",
  "لا يمكن إعادة التفعيل من الحالة الحالية.":
    "Cannot reactivate from current state.",
  "يوجد اشتراك متأخر السداد. عالج الفوترة أولاً.":
    "Subscription is past due. Resolve billing first.",
  "اسم المنشأة مطلوب.": "Organization name is required.",
  "منشأة بنفس الاسم أو السجل التجاري موجودة.":
    "An organization with the same name or CR number exists.",
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
  "للمؤسسات المتوسطة وبرامج متعددة.":
    "For mid-size organizations with multiple programs.",
  "لمكاتب إدارة المشاريع والاستشارات.": "For PMO and consulting firms.",
  "للجهات الحكومية والمؤسسات الكبرى مع نشر مخصص.":
    "For government and large institutions with dedicated deployment.",
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
  "الدمام": "Dammam",
  "المدينة المنورة": "Madinah",
  "مكة المكرمة": "Makkah",
  "إنشاء اشتراك على خطة": "Created subscription on plan",
  "السعودية": "Saudi Arabia",
  "إدارة مشاريع": "Project management",
  "قطاع خاص": "Private sector",
  "جهة حكومية": "Government entity",
  "غير ربحي": "Non-profit",
  "حوكمة مشاريع": "Project governance",
  "برمجيات وخدمات": "Software and services",
  "مناطق اقتصادية": "Economic zones",
  "تقنية معلومات": "Information technology",
  "تنمية مجتمعية": "Community development",
  "تطوير إقليمي": "Regional development",
  "هيئة تنموية": "Development authority",
  "تطوير سياحي": "Tourism development",
  "خدمات بلدية": "Municipal services",
  "PMO استشاري": "Consulting PMO",
  "تطوير عقاري": "Real estate development",
  "صناعة وطاقة": "Industry and energy",
  "خدمات عامة": "Public services",
  "تطوير حضري": "Urban development",
  "نقل وتوريد": "Transport and supply",
  "إحالة شريك": "Partner referral",
  "تطوير مدن": "City development",
  "برمجيات": "Software",
  "طلب عرض": "Demo request",
  "صلاحيات": "Permissions",
  "استخدام": "Usage",
  "عقارات": "Real estate",
  "اشتراك": "Subscription",
  "محاولة": "Attempt",
  "سياحة": "Tourism",
  "الخبر": "Khobar",
  "موقع إلكتروني": "Website",
  "منسق المشاريع": "Project coordinator",
  "مشرف التقنية": "Technology supervisor",
  "مدير العقود": "Contracts manager",
  "مكتب التحول": "Transformation office",
  "مزود البريد": "Email provider",
  "تسجيل دخول ناجح": "Successful sign-in",
  "كلمة مرور غير صحيحة": "Incorrect password",
  "بوابة الدفع (تجريبي)": "Payment gateway (demo)",
  "تعثر سداد الفاتورة": "Invoice payment failure",
  "تعليق الحساب بعد فشل الدفع": "Account suspended after payment failure",
  "فشل دفع INV-2026-00172": "Payment failed for INV-2026-00172",
  "هيئة كفاءة الإنفاق والمشروعات الحكومية":
    "Spending Efficiency and Government Projects Authority",
  "أمانة منطقة المدينة المنورة": "Madinah Region Municipality",
  "أمانة منطقة مكة المكرمة": "Makkah Region Municipality",
  "شركة نيوم للمناطق الصناعية": "NEOM Industrial Zones Company",
  "شركة البحر الأحمر للتطوير": "Red Sea Global",
  "شركة تطوير العقارات المتقدمة": "Advanced Real Estate Development Company",
  "شركة مسار للخدمات اللوجستية": "Masar Logistics Services",
  "مكتب إنجاز لإدارة المشاريع": "Enjaz Project Management Office",
  "مؤسسة أفق للاستشارات": "Ofuq Consulting Firm",
  "مجموعة أصيل الصناعية": "Aseel Industrial Group",
  "مكتب رواد للاستشارات": "Ruwad Consulting Office",
  "شركة رؤية للمقاولات": "Rouya Contracting Company",
  "شركة نسج للتقنية": "Nasj Technology Company",
  "مؤسسة بناء الوطن": "Binaa Al-Watan Foundation",
  "شركة واحة الطاقة": "Waha Energy Company",
  "شركة جبل للتطوير العقاري": "Jabal Real Estate Development",
  "هيئة تطوير عسير": "Aseer Development Authority",
  "غرفة الرياض": "Riyadh Chamber of Commerce",
  "جارٍ التحقق من قالب الصلاحيات للمستأجر. سنعود خلال يوم عمل.":
    "Verifying the tenant permission template. We will return within one business day.",
  "تم تعليق الحساب رغم تحويل بنكي. نرجو إعادة التفعيل.":
    "Account was suspended despite a bank transfer. Please reactivate.",
  "هل يمكن تفعيل تسمية تكامل Qiwa ضمن إعدادات المنشأة؟":
    "Can the Qiwa integration label be enabled in organization settings?",
  "عند محاولة ربط مستخدم مورد تظهر رسالة رفض صلاحية.":
    "Linking a vendor user shows a permission denied message.",
  "طلب عرض لمنظومة إدارة المشاريع وربط المبادرات.":
    "Demo request for the project management system and initiative linking.",
  "انتهت مهلة مهمة مزامنة الفواتير للمستأجر t7":
    "Invoice sync job timed out for tenant t7",
  "أهداف ← مبادرات · محفظة → برامج → مشاريع":
    "Objectives ← Initiatives · Portfolio → Programs → Projects",
  "تجاوز حد طلبات API لمستأجر t2 خلال دقيقة":
    "API request limit exceeded for tenant t2 within one minute",
  "اختاروا منافساً لوجود تكامل داخلي قائم.":
    "They chose a competitor due to an existing internal integration.",
  "يتطلب نشراً مخصصاً واتفاقية مستوى خدمة.":
    "Requires dedicated deployment and an SLA.",
  "كيف تظهر مؤشرات الميزانية لدور المشاهد؟":
    "How do budget indicators appear for the viewer role?",
  "نحتاج فاتورة سبتمبر بصيغة PDF للمالية.":
    "We need the September invoice as PDF for finance.",
  "اهتمام بخطة احترافية لـ 60 مستخدماً.":
    "Interest in a professional plan for 60 users.",
  "عرض سعر سنوي قيد المراجعة القانونية.":
    "Annual quote under legal review.",
  "طلب نسخة فاتورة ضريبية لشهر سبتمبر":
    "Request a tax invoice copy for September",
  "تم توضيح الصلاحيات وإغلاق التذكرة.":
    "Permissions clarified and ticket closed.",
  "منصة إدارة المشاريع — لوحة المنصة":
    "Project management platform — console",
  "تعذر إضافة دور مورد لمشروع محدد":
    "Unable to add a vendor role for a specific project",
  "أهداف → محافظ → برامج → مشاريع":
    "Objectives → Portfolios → Programs → Projects",
  "محفظة اختيارية → مشروع → مهام":
    "Optional portfolio → Project → Tasks",
  "استفسار عن خطاف Qiwa (جاهزية)":
    "Inquiry about Qiwa hook (readiness)",
  "تجربة محدودة لمدة 14 يوماً.": "Limited trial for 14 days.",
  "شرح صلاحيات لوحة المؤشرات": "Explain dashboard permission scopes",
  "استفسار أولي عن التسعير.": "Initial pricing inquiry.",
  "محفظة → برنامج → مشاريع": "Portfolio → Program → Projects",
  "مشروع → مهام": "Project → Tasks",
  "Qiwa (تسمية جاهزية)": "Qiwa (readiness label)",
  "GOSI (تسمية جاهزية)": "GOSI (readiness label)",
  "سلطان عبدالعزيز الحربي": "Sultan Abdulaziz Al-Harbi",
  "سعد فهد الدوسري": "Saad Fahd Al-Dosari",
  "نورة فهد الشمري": "Noura Fahd Al-Shammari",
  "نورة العتيبي": "Noura Al-Otaibi",
  "هند القحطاني": "Hind Al-Qahtani",
  "ماجد العتيبي": "Majed Al-Otaibi",
  "مشعل الدوسري": "Meshal Al-Dosari",
  "فهد العتيبي": "Fahd Al-Otaibi",
  "نورة الحربي": "Noura Al-Harbi",
  "خالد الشمري": "Khalid Al-Shammari",
  "عمر الأسمري": "Omar Al-Asmari",
  "فهد الشمري": "Fahd Al-Shammari",
};

function loadCoreMap() {
  const src = fs.readFileSync(coreContentPath, "utf8");
  const map = {};
  const re = /"((?:\\.|[^"\\])*)"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  let m;
  while ((m = re.exec(src))) {
    const k = JSON.parse(`"${m[1]}"`);
    const v = JSON.parse(`"${m[2]}"`);
    if (ARABIC_RE.test(k)) map[k] = v;
  }
  return map;
}

function extractArabicFromAdmin() {
  const dirs = [
    path.join(root, "src/lib"),
    path.join(root, "src/pages"),
    path.join(root, "src/store"),
  ];
  const found = new Set();
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(name)) {
        const text = fs.readFileSync(p, "utf8");
        const re = /["'`]([^"'`\n]*[\u0600-\u06FF][^"'`\n]*)["'`]/g;
        let m;
        while ((m = re.exec(text))) {
          const s = m[1].trim();
          if (s.length >= 2 && ARABIC_RE.test(s)) found.add(s);
        }
      }
    }
  };
  dirs.forEach(walk);
  return [...found];
}

const core = loadCoreMap();
const phrases = extractArabicFromAdmin();
const out = { ...core, ...EXTRA };

let missing = 0;
for (const p of phrases) {
  if (out[p]) continue;
  // Prefer longest core substring replacements later via localizeContent
  if (EXTRA[p]) out[p] = EXTRA[p];
  else {
    // keep as English placeholder via transliteration-ish: skip identity
    missing++;
  }
}

// Drop identity mappings
for (const [k, v] of Object.entries(out)) {
  if (k === v && ARABIC_RE.test(k)) {
    if (EXTRA[k]) out[k] = EXTRA[k];
    else delete out[k];
  }
}

const keys = Object.keys(out).sort((a, b) => b.length - a.length || a.localeCompare(b, "ar"));
const body = keys
  .map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(out[k])},`)
  .join("\n");

const file = `/** Arabic source string → English display (display-only; never mutate stored Arabic). */
export const CONTENT_EN: Record<string, string> = {
${body}
};
`;

fs.writeFileSync(outPath, file, "utf8");
console.log("wrote", keys.length, "entries; admin phrases", phrases.length, "unmapped", missing);
