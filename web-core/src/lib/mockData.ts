import { BRANCHES, DEPARTMENTS } from "./constants";
import { buildDemoAttachmentSearchText } from "./attachmentSearch";
import type {
  ActionEntry,
  AppNotification,
  Attachment,
  Category,
  Entity,
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
  },
  {
    id: "u2",
    name: "ريم سعد الغامدي",
    email: "pmo@namaa.sa",
    role: "planning",
    branchId: "riyadh",
    departmentId: "pm",
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
