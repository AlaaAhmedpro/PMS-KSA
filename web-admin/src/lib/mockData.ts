import { BRANCHES, DEPARTMENTS } from "./constants";
import { buildDemoAttachmentSearchText } from "./attachmentSearch";
import type {
  ActionEntry,
  AppNotification,
  Attachment,
  Category,
  Entity,
  NewsItem,
  RecordItem,
  RecordKind,
  Status,
  User,
} from "./types";

export const ENTITIES: Entity[] = [
  { id: "e1", name: "وزارة البلديات والإسكان" },
  { id: "e2", name: "الهيئة الملكية لمدينة الرياض" },
  { id: "e3", name: "هيئة تطوير المنطقة الشرقية" },
  { id: "e4", name: "صندوق الاستثمارات العامة" },
  { id: "e5", name: "شركة الكهرباء السعودية" },
  { id: "e6", name: "البنك الأهلي السعودي" },
  { id: "e7", name: "هيئة المدن والاقتصاديات الرقمية" },
  { id: "e8", name: "شركة أرامكو السعودية" },
  { id: "e9", name: "الهيئة السعودية للمقاولين" },
  { id: "e10", name: "غرفة الرياض" },
  { id: "e11", name: "المركز الوطني للرقابة على الالتزام البيئي" },
  { id: "e12", name: "هيئة تطوير بوابة الدرعية" },
];

export const USERS: User[] = [
  {
    id: "u1",
    name: "عبدالله محمد العتيبي",
    email: "admin@namaa.sa",
    role: "super_admin",
    branchId: "riyadh",
    newsAdmin: true,
  },
  {
    id: "u0",
    name: "نورة فهد الشمري",
    email: "platform@namaa.sa",
    role: "platform_admin",
    branchId: "riyadh",
  },
  {
    id: "u2",
    name: "ريم سعد الغامدي",
    email: "pmo@namaa.sa",
    role: "planning",
    branchId: "riyadh",
    departmentId: "pm",
    newsAdmin: true,
  },
  {
    id: "u3",
    name: "خالد عبدالرحمن القحطاني",
    email: "manager.riyadh@namaa.sa",
    role: "branch_manager",
    branchId: "riyadh",
    departmentId: "pm",
  },
  {
    id: "u4",
    name: "ياسمين فهد الحربي",
    email: "employee@namaa.sa",
    role: "employee",
    branchId: "jeddah",
    departmentId: "it",
  },
  {
    id: "u5",
    name: "هدى سلمان الدوسري",
    email: "pr@namaa.sa",
    role: "pr",
    branchId: "riyadh",
    newsAdmin: true,
  },
  {
    id: "u6",
    name: "م. طارق إبراهيم الزهراني",
    email: "executive@namaa.sa",
    role: "executive",
    branchId: "riyadh",
  },
  {
    id: "u7",
    name: "محمد حسن الشهري",
    email: "tech.riyadh@namaa.sa",
    role: "employee",
    branchId: "riyadh",
    departmentId: "it",
  },
  {
    id: "u8",
    name: "سارة إبراهيم المطيري",
    email: "finance@namaa.sa",
    role: "branch_manager",
    branchId: "riyadh",
    departmentId: "finance",
  },
  {
    id: "u9",
    name: "عمر نبيل العنزي",
    email: "hr@namaa.sa",
    role: "employee",
    branchId: "riyadh",
    departmentId: "hr",
  },
  {
    id: "u10",
    name: "ليلى أحمد البلوي",
    email: "procure@namaa.sa",
    role: "employee",
    branchId: "riyadh",
    departmentId: "procurement",
  },
  {
    id: "u11",
    name: "كريم سامي المالكي",
    email: "manager.jeddah@namaa.sa",
    role: "branch_manager",
    branchId: "jeddah",
    departmentId: "operations",
  },
  {
    id: "u12",
    name: "نور الدين الحازمي",
    email: "admin.dammam@namaa.sa",
    role: "employee",
    branchId: "dammam",
    departmentId: "planning",
  },
];

const PROJECT_SUBJECTS = [
  "مشروع تطوير البنية التحتية لحي النرجس — المرحلة الثانية",
  "مبادرة ربط شبكات المياه بمشاريع الإسكان التنموي بالرياض",
  "تنفيذ منصة رقمية لإدارة عقود المقاولين — توافق NCA",
  "مشروع إنشاء مركز ابتكار تقني بمدينة الملك عبدالعزيز للعلوم والتقنية",
  "توسعة محطة معالجة مياه الصرف بجدة — ميزانية 42.5 مليون ر.س",
  "مشروع تطوير الواجهة البحرية لكورنيش الدمام",
  "برنامج ترميم المباني التراثية في الدرعية",
  "مشروع شبكة الطرق الداعمة لمستودعات لوجستية NEOM",
  "تجهيز مراكز خدمة موحدة للمستفيدين في المدينة المنورة",
  "مشروع الطاقة الشمسية لمجمع مكاتب نماء — أبها",
  "تطوير نظام GIS لمواقع المشاريع الحكومية",
  "مشروع إسكان منسوبي المنشأة — 180 وحدة بالرياض",
  "تحديث معايير الجودة ISO لمشاريع البنية التحتية",
  "مشروع الربط مع منصة اعتماد للمشتريات الحكومية",
  "مبادرة خفض استهلاك المياه في مواقع التشييد",
  "مشروع data center إقليمي للمنطقة الشرقية",
  "تطوير بوابة موحدة لتقارير PMO التنفيذية",
  "مشروع إنشاء جسر مشاة على طريق الملك فهد",
  "برنامجة ميزانية مشروع مترو الرياض — التكامل المالي",
  "مشروع تأهيل كوادر محلية لبرامج Vision 2030",
];

const TASK_SUBJECTS = [
  "إعداد تقرير تقدم أسبوعي لمشروع حي النرجس",
  "متابعة اعتماد مخططات BIM للمرحلة الأولى",
  "تجهيز عرض تقديمي لمجلس إدارة المشاريع",
  "حصر مخاطر التأخير في توريد مواد البناء",
  "مراجعة عقود المقاولين من الباطن المنتهية",
  "إعداد خطة تدريب فريق الموقع على السلامة",
  "تنفيذ مبادرة توثيق الدروس المستفادة — Q4",
  "تجهيز مستندات المراجعة المالية للمشروع",
  "متابعة بلاغات الجودة وإغلاقها",
  "إعداد دراسة تكلفة-فائدة لتمديد شبكة الكهرباء",
  "تحديث سجل المخاطر في PMO",
  "تنسيق ورشة أصحاب المصلحة — جدة",
  "رفع تقرير الالتزام البيئي الشهري",
  "متابعة طلبات تغيير نطاق العمل (CR)",
  "إعداد جدول زمني محدث لمرحلة التشطيبات",
];

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const sampleAttachment = (
  id: string,
  name: string,
  subject: string,
  notes?: string,
): Attachment => ({
  id,
  name,
  size: 180000 + (id.charCodeAt(id.length - 1) % 8) * 95000,
  mimeType: "application/pdf",
  searchText: buildDemoAttachmentSearchText(name, subject, notes),
});

type StatusTemplate = {
  status: Status;
  deadlineOffset: number;
  notes: string;
  withExecuted?: boolean;
  executedBeforeDeadline?: boolean;
  priority: RecordItem["priority"];
  extraLogs?: string[];
  withActions?: boolean;
};

const STATUS_TEMPLATES: StatusTemplate[] = [
  {
    status: "new",
    deadlineOffset: 14,
    notes: "جديد — بانتظار الإحالة للمختص.",
    priority: "normal",
  },
  {
    status: "new",
    deadlineOffset: 5,
    notes: "جديد عاجل — يحتاج تسجيل وإحالة خلال 48 ساعة.",
    priority: "high",
  },
  {
    status: "active",
    deadlineOffset: 10,
    notes: "تم استلام المهمة وجارٍ العمل على التحديثات.",
    priority: "normal",
    extraLogs: ["تم إحالة السجل لعضو الفريق."],
    withActions: true,
  },
  {
    status: "active",
    deadlineOffset: 3,
    notes: "قيد المراجعة مع PMO قبل الاعتماد.",
    priority: "high",
    withActions: true,
  },
  {
    status: "done",
    deadlineOffset: 7,
    notes: "مكتمل — بانتظار اعتماد الإغلاق.",
    withExecuted: true,
    executedBeforeDeadline: true,
    priority: "normal",
    withActions: true,
  },
  {
    status: "done",
    deadlineOffset: 12,
    notes: "مكتمل — بانتظار توقيع مدير المشروع.",
    withExecuted: true,
    executedBeforeDeadline: true,
    priority: "high",
  },
  {
    status: "closed",
    deadlineOffset: 20,
    notes: "تم الاعتماد وإغلاق السجل نهائياً.",
    withExecuted: true,
    executedBeforeDeadline: true,
    priority: "normal",
    extraLogs: ["اعتماد PMO.", "أُرشِف السجل."],
  },
  {
    status: "closed",
    deadlineOffset: 45,
    notes: "مغلق — لا يلزم متابعة إضافية.",
    withExecuted: true,
    executedBeforeDeadline: true,
    priority: "normal",
  },
  {
    status: "info",
    deadlineOffset: 30,
    notes: "للمتابعة — لا يتطلب إجراءً تنفيذياً فورياً.",
    priority: "normal",
  },
  {
    status: "active",
    deadlineOffset: -2,
    notes: "تجاوز الموعد — مطلوب إنجاز عاجل.",
    priority: "critical",
    withActions: true,
  },
  {
    status: "new",
    deadlineOffset: -5,
    notes: "متأخر — لم يُحال بعد بعد انتهاء المهلة.",
    priority: "critical",
  },
  {
    status: "active",
    deadlineOffset: -8,
    notes: "متأخر — المتابعة مع مدير الفرع.",
    priority: "high",
    extraLogs: ["تنبيه استعجال من PMO."],
  },
];

function buildRecords(): RecordItem[] {
  const rng = seededRng(20261101);
  const now = new Date();
  const records: RecordItem[] = [];
  const categories: Category[] = [
    "infrastructure",
    "housing",
    "tech",
    "financial",
    "admin",
    "consulting",
  ];
  const employees = USERS.filter(
    (u) => u.role === "employee" || u.role === "branch_manager",
  );

  const make = (kind: RecordKind, idx: number): RecordItem => {
    const subjects = kind === "project" ? PROJECT_SUBJECTS : TASK_SUBJECTS;
    const subject = subjects[idx % subjects.length];
    const branch = BRANCHES[idx % BRANCHES.length];
    const dept = DEPARTMENTS[idx % DEPARTMENTS.length];
    const entity = ENTITIES[idx % ENTITIES.length];
    const assignee = employees[idx % employees.length];
    const tpl = STATUS_TEMPLATES[idx % STATUS_TEMPLATES.length];
    const id = `${kind === "project" ? "proj" : "task"}-${String(idx + 1).padStart(3, "0")}`;

    const arrivalOffset = -Math.floor((idx * 2.7) % 90) - (idx % 7);
    const arrivalDate = addDays(now, arrivalOffset);
    const letterDate = addDays(new Date(arrivalDate), -1 - (idx % 4));
    const deadline = addDays(now, tpl.deadlineOffset);

    let executedDate: string | undefined;
    if (tpl.withExecuted) {
      const execOffset = tpl.executedBeforeDeadline
        ? tpl.deadlineOffset - 1 - (idx % 3)
        : tpl.deadlineOffset + 2;
      executedDate = addDays(now, execOffset);
    }

    const attachRoll = rng();
    const attachments: Attachment[] =
      attachRoll > 0.25
        ? [
            sampleAttachment(
              `att-${id}-1`,
              `${subject.slice(0, 22)}.pdf`,
              subject,
              tpl.notes,
            ),
          ]
        : [];
    if (attachRoll > 0.82) {
      attachments.push(
        sampleAttachment(
          `att-${id}-2`,
          `مرفق-تكميلي-${idx + 1}.pdf`,
          subject,
          "مستندات داعمة",
        ),
      );
    }

    const log = [
      {
        id: `log-${id}-0`,
        at: new Date(arrivalDate).toISOString(),
        actor: "مكتب إدارة المشاريع",
        text:
          kind === "project"
            ? "تم تسجيل المشروع وإحالته."
            : "تم إنشاء المهمة وإحالتها.",
      },
      ...(tpl.extraLogs?.map((text, li) => ({
        id: `log-${id}-${li + 1}`,
        at: addDays(new Date(arrivalDate), 1 + li) + "T10:00:00.000Z",
        actor: assignee.name,
        text,
      })) ?? []),
    ];

    let actions: ActionEntry[] | undefined;
    if (tpl.withActions) {
      actions = [
        {
          id: `act-${id}-1`,
          at: addDays(new Date(arrivalDate), 2) + "T14:30:00.000Z",
          actorId: assignee.id,
          actorName: assignee.name,
          actorTitle:
            assignee.role === "branch_manager" ? "مدير فرع" : "عضو فريق",
          text:
            kind === "project"
              ? "تم تحديث خطة المشروع ورفع المرفقات الفنية."
              : "تم تنفيذ جزء من المطلوب ورفع تقرير التقدم.",
          attachments:
            attachments.length > 0
              ? [attachments[0]]
              : [
                  sampleAttachment(
                    `att-${id}-act`,
                    `إجراء-${idx + 1}.pdf`,
                    subject,
                  ),
                ],
        },
      ];
    }

    return {
      id,
      kind,
      regNumber: `${kind === "project" ? "مش" : "مه"}-2026/${String(idx + 1).padStart(4, "0")}`,
      arrivalDate,
      outNumber: `${3400 + idx}`,
      letterDate,
      entityId: entity.id,
      subject,
      category: dept.category ?? pick(categories, rng),
      attachments,
      branchId: branch.id,
      departmentId: dept.id,
      assignee: assignee.name,
      deadline,
      status: tpl.status,
      notes: tpl.notes,
      executedDate,
      priority: tpl.priority,
      createdAt: new Date(arrivalDate).toISOString(),
      log,
      actions,
    };
  };

  const PROJECT_COUNT = 78;
  const TASK_COUNT = 34;
  for (let i = 0; i < PROJECT_COUNT; i++) records.push(make("project", i));
  for (let i = 0; i < TASK_COUNT; i++) records.push(make("task", i));
  return records;
}

function buildSeedNotifications(records: RecordItem[]): AppNotification[] {
  const now = Date.now();
  const day = 86400000;
  const pickRec = (i: number) => records[i % records.length];
  const items: AppNotification[] = [];

  const push = (
    i: number,
    userId: string,
    type: AppNotification["type"],
    title: string,
    detail: string,
    daysAgo: number,
    read: boolean,
  ) => {
    const r = pickRec(i);
    items.push({
      id: `ntf-${String(items.length + 1).padStart(3, "0")}`,
      userId,
      recordId: r.id,
      kind: r.kind,
      type,
      title,
      detail,
      createdAt: new Date(now - daysAgo * day).toISOString(),
      read,
    });
  };

  push(0, "u4", "referral", "إحالة جديدة", "تم إحالة مشروع/مهمة إليك للمتابعة.", 0, false);
  push(1, "u4", "deadline", "موعد قريب", "يتبقى أقل من 3 أيام على الموعد النهائي.", 1, false);
  push(2, "u7", "overdue", "تأخر في الإنجاز", "تجاوز السجل الموعد المحدد.", 2, false);
  push(3, "u7", "referral", "مهمة جديدة", "مهمة من مكتب إدارة المشاريع.", 0, true);
  push(4, "u2", "escalation", "استعجال", "طلب استعجال من الإدارة العليا.", 1, false);
  push(5, "u3", "deadline", "تذكير موعد", "موعد نهائي خلال 48 ساعة.", 3, false);
  push(6, "u8", "overdue", "متابعة متأخرة", "مشروع متأخر يحتاج اعتمادك.", 4, false);
  push(7, "u11", "referral", "إحالة فرع جدة", "متابعة تنفيذ بفرع جدة.", 2, false);
  push(8, "u12", "deadline", "موعد تنفيذ", "مهمة تستحق الإغلاق هذا الأسبوع.", 5, true);
  push(9, "u6", "escalation", "تصعيد تنفيذي", "مؤشرات حرجة على مشروع متأخر.", 0, false);
  push(10, "u1", "overdue", "تنبيه نظام", "5 سجلات متأخرة عبر الفروع.", 1, false);
  push(11, "u9", "referral", "إحالة HR", "متابعة موارد المشروع.", 6, true);
  push(12, "u10", "deadline", "موعد مشتريات", "عقد مورد ينتهي قريباً.", 2, false);
  push(13, "u5", "referral", "للمتابعة", "تحديث للتواصل المؤسسي.", 7, true);
  push(14, "u2", "overdue", "مجموعة متأخرة", "3 مهام متأخرة بانتظار الإغلاق.", 3, false);

  return items;
}

export const SEED_RECORDS: RecordItem[] = buildRecords();
export const SEED_NOTIFICATIONS: AppNotification[] =
  buildSeedNotifications(SEED_RECORDS);

export const SEED_NEWS: NewsItem[] = [
  {
    id: "n1",
    text: "شركة نماء للتطوير تسلّم المرحلة الأولى من مشروع البنية التحتية لحي النرجس ضمن أهداف Vision 2030.",
    category: "goals",
    startDate: addDays(new Date(), -2),
    endDate: addDays(new Date(), 30),
    target: { type: "all" },
    createdBy: "التواصل المؤسسي",
  },
  {
    id: "n2",
    text: "تهنئة لفريق فرع جدة لإنجاز معالم مشروع كورنيش الشمال قبل الموعد بـ 12 يوماً.",
    category: "congrats",
    startDate: addDays(new Date(), -1),
    endDate: addDays(new Date(), 15),
    target: { type: "branch", branchId: "jeddah" },
    createdBy: "التواصل المؤسسي",
  },
  {
    id: "n3",
    text: "تنبيه: بدء تطبيق إجراءات السلامة الميدانية الجديدة في جميع مواقع المشاريع اعتباراً من الأسبوع القادم.",
    category: "alert",
    startDate: addDays(new Date(), 0),
    endDate: addDays(new Date(), 10),
    target: { type: "all" },
    createdBy: "مكتب إدارة المشاريع",
  },
  {
    id: "n4",
    text: "إنجاز: اعتماد 18 مشروعاً بنية تحتية بقيمة تجاوزت 320 مليون ر.س خلال الربع الحالي.",
    category: "sales",
    startDate: addDays(new Date(), -3),
    endDate: addDays(new Date(), 20),
    target: { type: "all" },
    createdBy: "التواصل المؤسسي",
  },
  {
    id: "n5",
    text: "هدف الربع: رفع معدل الالتزام بمواعيد المشاريع إلى 92% في جميع الفروع.",
    category: "goals",
    startDate: addDays(new Date(), -5),
    endDate: addDays(new Date(), 25),
    target: { type: "all" },
    createdBy: "مكتب إدارة المشاريع",
  },
  {
    id: "n6",
    text: "تهنئة بمناسبة اجتياز مشروع الدمام لمراجعة الجودة دون ملاحظات جوهرية.",
    category: "congrats",
    startDate: addDays(new Date(), 0),
    endDate: addDays(new Date(), 12),
    target: { type: "branch", branchId: "dammam" },
    createdBy: "إدارة الجودة",
  },
  {
    id: "n7",
    text: "تنبيه: صيانة مجدولة لمنصة PMO يوم الجمعة — التحديثات لن تتجاوز ساعتين.",
    category: "alert",
    startDate: addDays(new Date(), -1),
    endDate: addDays(new Date(), 7),
    target: { type: "branch", branchId: "riyadh" },
    createdBy: "تقنية المعلومات",
  },
  {
    id: "n8",
    text: "إنجاز: إطلاق لوحة مؤشرات موحدة لمشاريع الإسكان التنموي في المنطقة الشرقية.",
    category: "sales",
    startDate: addDays(new Date(), -4),
    endDate: addDays(new Date(), 18),
    target: { type: "branch", branchId: "dammam" },
    createdBy: "مكتب إدارة المشاريع",
  },
  {
    id: "n9",
    text: "تهنئة لفريق تقنية المعلومات لإطلاق بوابة المشاريع الموحدة.",
    category: "congrats",
    startDate: addDays(new Date(), 0),
    endDate: addDays(new Date(), 14),
    target: { type: "all" },
    createdBy: "التواصل المؤسسي",
  },
  {
    id: "n10",
    text: "تنبيه: موعد نهائي لتقديم تقارير PMO للربع الرابع.",
    category: "alert",
    startDate: addDays(new Date(), -2),
    endDate: addDays(new Date(), 9),
    target: { type: "all" },
    createdBy: "مكتب إدارة المشاريع",
  },
  {
    id: "n11",
    text: "هدف: خفض انحراف التكلفة بنسبة 6% في مشاريع البنية التحتية قبل نهاية العام.",
    category: "goals",
    startDate: addDays(new Date(), -6),
    endDate: addDays(new Date(), 40),
    target: { type: "branch", branchId: "madinah" },
    createdBy: "مكتب إدارة المشاريع",
  },
  {
    id: "n12",
    text: "إنجاز: تفعيل 24 مبادرة رقمية مرتبطة ببرامج Vision 2030 — تحديث أسبوعي.",
    category: "sales",
    startDate: addDays(new Date(), 0),
    endDate: addDays(new Date(), 21),
    target: { type: "all" },
    createdBy: "التواصل المؤسسي",
    link: "https://namaa.sa",
  },
];
