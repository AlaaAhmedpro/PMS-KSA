import { useMemo, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Input";
import {
  Modal,
  ModalCard,
  ModalEmpty,
  ModalPanel,
  ModalToolbar,
} from "../components/ui/Modal";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { Pagination } from "../components/ui/Pagination";
import { usePagination, PAGE_SIZE_DEFAULT } from "../hooks/usePagination";
import { useAuth } from "../store/AuthContext";
import { useHierarchy } from "../store/HierarchyStore";
import { useConfirm } from "../store/ConfirmContext";
import { PROJECT_STATUS_LABELS, ROLES } from "../lib/constants";
import { cn } from "../lib/cn";
import type { Vendor, VendorStatus } from "../models/domain";
import type { User } from "../lib/types";

const CITY_OPTIONS = [
  "الرياض",
  "جدة",
  "الدمام",
  "المدينة المنورة",
  "أبها",
];

const COL = {
  vendor: { width: "22%" },
  city: { width: "9%" },
  status: { width: "12%" },
  projects: { width: "10%" },
  staff: { width: "10%" },
  contact: { width: "15%" },
  email: { width: "14%" },
  actions: { width: "8%" },
} as const;

const cell = "vendors-td px-4 py-3.5";
const head = "vendors-th px-4 py-3";

const PROJECT_STATUS_BADGE: Record<string, string> = {
  draft:
    "border-steel-200 bg-steel-50 text-steel-600 dark:border-steel-700 dark:bg-steel-800/50 dark:text-steel-300",
  planned:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300",
  active:
    "border-brand-200 bg-brand-500/10 text-brand-700 dark:border-brand-800 dark:text-brand-300",
  on_hold:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  completed:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300",
  cancelled:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:text-red-300",
};

const iconBtn =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-steel-400 transition-colors duration-150";
const iconBtnEdit = `${iconBtn} hover:bg-brand-500/10 hover:text-brand-600`;
const iconBtnDelete = `${iconBtn} hover:bg-red-500/10 hover:text-red-500`;

function roleLabel(role: string): string {
  return ROLES.find((r) => String(r.id) === role)?.name ?? role;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return phone;
}

function StatusToggle({
  active,
  disabled,
  onToggle,
}: {
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled}
      onClick={onToggle}
      title={active ? "تعطيل المورد" : "تفعيل المورد"}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors duration-150",
        active
          ? "border-brand-500 bg-brand-500"
          : "border-steel-300 bg-steel-200 dark:border-steel-600 dark:bg-steel-700",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-[inset-inline-start] duration-150",
          active ? "end-0.5 start-auto" : "start-0.5",
        )}
      />
    </button>
  );
}

type PeekKind = "projects" | "staff";

export function VendorsPage() {
  const confirm = useConfirm();
  const {
    user,
    users,
    organization,
    grantVendorAdminAccess,
    syncVendorStaffScopes,
    detachVendorUsers,
  } = useAuth();
  const {
    vendors,
    projects,
    addVendor,
    updateVendor,
    removeVendor,
    setVendorProjects,
    addProjectMember,
  } = useHierarchy();

  const isOrgAdmin = user?.role === "org_admin";

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | VendorStatus>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [mailPreview, setMailPreview] = useState("");
  const [name, setName] = useState("");
  const [commercialRegister, setCommercialRegister] = useState("");
  const [city, setCity] = useState("الرياض");
  const [contactUserId, setContactUserId] = useState("");
  const [website, setWebsite] = useState("");
  const [projectPick, setProjectPick] = useState("");
  const [peek, setPeek] = useState<{ kind: PeekKind; vendorId: string } | null>(
    null,
  );
  const [contactCard, setContactCard] = useState<Vendor | null>(null);

  const visibleVendors = useMemo(() => {
    if (user?.role === "vendor_admin" && user.vendorId) {
      return vendors.filter((v) => v.id === user.vendorId);
    }
    return vendors;
  }, [vendors, user?.role, user?.vendorId]);

  const staffByVendor = useMemo(() => {
    const map = new Map<string, User[]>();
    for (const u of users) {
      if (!u.vendorId) continue;
      if (
        organization?.id &&
        u.organizationId &&
        u.organizationId !== organization.id
      ) {
        continue;
      }
      const list = map.get(u.vendorId) ?? [];
      list.push(u);
      map.set(u.vendorId, list);
    }
    return map;
  }, [users, organization?.id]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return visibleVendors.filter((v) => {
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      if (!term) return true;
      return (
        v.name.toLowerCase().includes(term) ||
        v.city.toLowerCase().includes(term) ||
        v.commercialRegister.includes(term) ||
        v.contactName.toLowerCase().includes(term) ||
        v.contactEmail.toLowerCase().includes(term) ||
        (v.contactPhone || "").includes(term)
      );
    });
  }, [visibleVendors, q, statusFilter]);

  const pagination = usePagination(filtered, PAGE_SIZE_DEFAULT, [
    q,
    statusFilter,
    filtered.length,
  ]);

  const peekVendor = useMemo(() => {
    if (!peek) return null;
    return vendors.find((v) => v.id === peek.vendorId) ?? null;
  }, [peek, vendors]);

  const peekProjects = useMemo(() => {
    if (!peekVendor || peek?.kind !== "projects") return [];
    return projects.filter((p) => peekVendor.projectIds.includes(p.id));
  }, [peek, peekVendor, projects]);

  const availableProjects = useMemo(() => {
    if (!peekVendor) return [];
    return projects.filter((p) => !peekVendor.projectIds.includes(p.id));
  }, [peekVendor, projects]);

  const peekStaff = useMemo(() => {
    if (!peekVendor || peek?.kind !== "staff") return [];
    return staffByVendor.get(peekVendor.id) ?? [];
  }, [peek, peekVendor, staffByVendor]);

  const contactLinkedUser = useMemo(() => {
    if (!contactCard) return undefined;
    if (contactCard.contactUserId) {
      return users.find((u) => u.id === contactCard.contactUserId);
    }
    return users.find(
      (u) =>
        u.vendorId === contactCard.id &&
        u.email.toLowerCase() === contactCard.contactEmail.toLowerCase(),
    );
  }, [contactCard, users]);

  const contactCandidates = useMemo(() => {
    return users.filter((u) => {
      if (u.active === false) return false;
      if (u.role === "org_admin") return false;
      if (
        organization?.id &&
        u.organizationId &&
        u.organizationId !== organization.id
      ) {
        return false;
      }
      if (u.vendorId) return false;
      return true;
    });
  }, [users, organization?.id]);

  const selectedContact = useMemo(
    () => contactCandidates.find((u) => u.id === contactUserId),
    [contactCandidates, contactUserId],
  );

  if (!isOrgAdmin && user?.role !== "vendor_admin") {
    return (
      <Card className="p-6">
        <p className="text-sm text-steel-500">ليس لديك صلاحية عرض الموردين.</p>
      </Card>
    );
  }

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setCommercialRegister("");
    setCity("الرياض");
    setContactUserId("");
    setWebsite("");
    setError("");
    setMailPreview("");
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (v: Vendor) => {
    setEditingId(v.id);
    setName(v.name);
    setCommercialRegister(v.commercialRegister);
    setCity(v.city);
    setContactUserId(v.contactUserId || "");
    setWebsite(v.website || "");
    setError("");
    setMailPreview("");
    setFormOpen(true);
  };

  const submit = () => {
    setError("");
    setMailPreview("");
    const trimmedName = name.trim();
    const cr = commercialRegister.trim();
    const site = website.trim();
    if (!trimmedName) {
      setError("اسم المورد مطلوب.");
      return;
    }
    if (!/^\d{10}$/.test(cr)) {
      setError("السجل التجاري يجب أن يكون 10 أرقام.");
      return;
    }
    if (site && !/^https?:\/\//i.test(site)) {
      setError("رابط الموقع يجب أن يبدأ بـ http:// أو https://");
      return;
    }

    if (editingId) {
      updateVendor(editingId, {
        name: trimmedName,
        commercialRegister: cr,
        city,
        website: site || undefined,
      });
      setFormOpen(false);
      resetForm();
      return;
    }

    if (!selectedContact) {
      setError("اختر جهة الاتصال من موظفي المنشأة.");
      return;
    }
    if (!selectedContact.phone || !/^05\d{8}$/.test(selectedContact.phone)) {
      setError("جهة الاتصال لا تملك جوالاً صالحاً بصيغة 05XXXXXXXX.");
      return;
    }

    const orgId = organization?.id;
    if (!orgId) {
      setError("تعذّر تحديد المنشأة الحالية.");
      return;
    }

    const vendor = addVendor({
      organizationId: orgId,
      name: trimmedName,
      commercialRegister: cr,
      city,
      contactName: selectedContact.name,
      contactEmail: selectedContact.email,
      contactPhone: selectedContact.phone,
      contactUserId: selectedContact.id,
      website: site || undefined,
      status: "active",
      projectIds: [],
    });

    const res = grantVendorAdminAccess(selectedContact.id, vendor.id, {
      website: site || undefined,
      vendorName: trimmedName,
    });
    if (!res.ok) {
      setError(res.reason || "تم إنشاء المورد وتعذّر تفعيل حساب مسؤول المورد.");
      return;
    }

    setMailPreview(res.mailPreview || "");
    setFormOpen(false);
    resetForm();
  };

  const handleDelete = async (v: Vendor) => {
    const ok = await confirm({
      title: "حذف المورد",
      message: `هل تريد حذف المورد «${v.name}»؟ لن يمكن التراجع عن هذا الإجراء.`,
      confirmLabel: "حذف",
      cancelLabel: "إلغاء",
      danger: true,
    });
    if (!ok) return;
    removeVendor(v.id);
    detachVendorUsers(v.id);
    if (peek?.vendorId === v.id) setPeek(null);
  };

  const openPeek = (e: MouseEvent, kind: PeekKind, vendor: Vendor) => {
    e.stopPropagation();
    setProjectPick("");
    setPeek({ kind, vendorId: vendor.id });
  };

  const openContactCard = (e: MouseEvent, vendor: Vendor) => {
    e.stopPropagation();
    setContactCard(vendor);
  };

  const linkProject = () => {
    if (!peekVendor || !projectPick || !isOrgAdmin) return;
    const nextIds = [...peekVendor.projectIds, projectPick];
    setVendorProjects(peekVendor.id, nextIds);
    syncVendorStaffScopes(peekVendor.id, nextIds);
    for (const u of staffByVendor.get(peekVendor.id) ?? []) {
      addProjectMember(projectPick, u.id);
    }
    setProjectPick("");
  };

  const unlinkProject = async (projectId: string) => {
    if (!peekVendor || !isOrgAdmin) return;
    const project = projects.find((p) => p.id === projectId);
    const ok = await confirm({
      title: "فك ربط المشروع",
      message: `هل تريد فك ربط المشروع «${project?.name ?? projectId}» عن هذا المورد؟`,
      confirmLabel: "فك الربط",
      cancelLabel: "إلغاء",
      danger: true,
    });
    if (!ok) return;
    const nextIds = peekVendor.projectIds.filter((id) => id !== projectId);
    setVendorProjects(peekVendor.id, nextIds);
    syncVendorStaffScopes(peekVendor.id, nextIds);
  };

  const editingVendor = editingId
    ? vendors.find((v) => v.id === editingId)
    : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="الموردون"
        subtitle="إدارة شركات الموردين وربطها بمشاريع المنشأة"
        icon={<Building2 className="h-6 w-6" />}
        actions={
          isOrgAdmin ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              إضافة مورد
            </Button>
          ) : undefined
        }
      />

      <Card className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
          <Input
            className="ps-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث بالاسم أو المدينة أو السجل…"
          />
        </div>
        <SearchableSelect
          className="min-w-[12rem]"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as "all" | VendorStatus)}
          options={[
            { value: "all", label: "كل الحالات" },
            { value: "active", label: "نشط" },
            { value: "inactive", label: "غير نشط" },
          ]}
        />
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="vendors-table w-full min-w-[1180px] text-sm">
            <colgroup>
              <col style={COL.vendor} />
              <col style={COL.city} />
              <col style={COL.status} />
              <col style={COL.projects} />
              <col style={COL.staff} />
              <col style={COL.contact} />
              <col style={COL.email} />
              <col style={COL.actions} />
            </colgroup>
            <thead>
              <tr className="border-b border-steel-200 bg-steel-50/90 dark:border-steel-700 dark:bg-steel-800/60">
                <th className={head}>المورد</th>
                <th className={head}>المدينة</th>
                <th className={head}>الحالة</th>
                <th className={head}>المشاريع</th>
                <th className={head}>الموظفون</th>
                <th className={head}>جهة الاتصال</th>
                <th className={head}>البريد</th>
                <th className={head}> </th>
              </tr>
            </thead>
            <tbody>
              {pagination.paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-sm text-steel-500"
                  >
                    لا موردين مطابقين. أضف مورداً لربط المشاريع والموظفين.
                  </td>
                </tr>
              ) : (
                pagination.paginated.map((v) => {
                  const staffCount = staffByVendor.get(v.id)?.length ?? 0;
                  const projectCount = v.projectIds.length;
                  return (
                    <tr
                      key={v.id}
                      className="border-b border-steel-100 last:border-b-0 hover:bg-steel-50/80 dark:border-steel-800 dark:hover:bg-steel-800/35"
                    >
                      <td className={cell}>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-steel-800 dark:text-steel-100">
                            {v.name}
                          </p>
                          <span className="vendors-ltr mt-0.5 font-mono text-[11px] text-steel-400">
                            {v.commercialRegister}
                          </span>
                        </div>
                      </td>
                      <td className={cell}>
                        <span className="truncate text-steel-700 dark:text-steel-200">
                          {v.city}
                        </span>
                      </td>
                      <td className={cell}>
                        <div className="flex items-center gap-2">
                          <StatusToggle
                            active={v.status === "active"}
                            disabled={!isOrgAdmin}
                            onToggle={() =>
                              updateVendor(v.id, {
                                status:
                                  v.status === "active" ? "inactive" : "active",
                              })
                            }
                          />
                          <span className="text-[11px] font-bold text-steel-500">
                            {v.status === "active" ? "نشط" : "غير نشط"}
                          </span>
                        </div>
                      </td>
                      <td className={cell}>
                        <button
                          type="button"
                          className="ui-count-chip"
                          onClick={(e) => openPeek(e, "projects", v)}
                        >
                          <span className="tabular-nums">{projectCount}</span>
                          <span>
                            {projectCount === 1 ? "مشروع" : "مشاريع"}
                          </span>
                        </button>
                      </td>
                      <td className={cell}>
                        <button
                          type="button"
                          className="ui-count-chip"
                          onClick={(e) => openPeek(e, "staff", v)}
                        >
                          <span className="tabular-nums">{staffCount}</span>
                          <span>
                            {staffCount === 1 ? "موظف" : "موظفون"}
                          </span>
                        </button>
                      </td>
                      <td className={cell}>
                        <button
                          type="button"
                          className="max-w-full truncate text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
                          onClick={(e) => openContactCard(e, v)}
                        >
                          {v.contactName}
                        </button>
                      </td>
                      <td className={cell}>
                        <span className="vendors-ltr text-xs text-steel-600 dark:text-steel-300">
                          {v.contactEmail}
                        </span>
                      </td>
                      <td className="vendors-td whitespace-nowrap px-2 py-3.5">
                        {isOrgAdmin ? (
                          <div className="inline-flex flex-nowrap items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => openEdit(v)}
                              className={iconBtnEdit}
                              title="تعديل"
                              aria-label="تعديل"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(v)}
                              className={iconBtnDelete}
                              title="حذف"
                              aria-label="حذف"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-steel-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={pagination.setPage}
          rangeStart={pagination.rangeStart}
          rangeEnd={pagination.rangeEnd}
          total={pagination.total}
        />
      </Card>

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          resetForm();
        }}
        title={editingId ? "تعديل مورد" : "إضافة مورد"}
        subtitle={
          editingId
            ? name || undefined
            : "تسجيل مورد وربطه بجهة اتصال من موظفي المنشأة"
        }
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setFormOpen(false);
                resetForm();
              }}
            >
              إلغاء
            </Button>
            <Button onClick={submit}>حفظ</Button>
          </>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="اسم المورد" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="السجل التجاري" required>
            <Input
              value={commercialRegister}
              onChange={(e) => setCommercialRegister(e.target.value)}
              dir="ltr"
              placeholder="1010897452"
              maxLength={10}
            />
          </Field>
          <Field label="المدينة" required>
            <SearchableSelect
              value={city}
              onChange={setCity}
              options={CITY_OPTIONS.map((c) => ({ value: c, label: c }))}
            />
          </Field>
          <Field label="موقع المورد (اختياري)">
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              dir="ltr"
              placeholder="https://vendor.sa"
            />
          </Field>
          {editingId ? (
            <>
              <Field label="جهة الاتصال">
                <Input value={editingVendor?.contactName || ""} readOnly disabled />
              </Field>
              <Field label="البريد">
                <Input
                  value={editingVendor?.contactEmail || ""}
                  readOnly
                  disabled
                  dir="ltr"
                />
              </Field>
              <Field label="الجوال">
                <Input
                  value={editingVendor?.contactPhone || ""}
                  readOnly
                  disabled
                  dir="ltr"
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="جهة الاتصال" required>
                <SearchableSelect
                  value={contactUserId}
                  onChange={setContactUserId}
                  searchPlaceholder="بحث بالاسم أو البريد…"
                  placeholder="اختر موظفاً من المنشأة"
                  truncateLabel={false}
                  options={contactCandidates.map((u) => ({
                    value: u.id,
                    label: `${u.name} — ${u.email}`,
                  }))}
                />
              </Field>
              <Field label="البريد">
                <Input
                  value={selectedContact?.email || ""}
                  readOnly
                  disabled
                  dir="ltr"
                  placeholder="يُعبَّأ تلقائياً عند الاختيار"
                />
              </Field>
              <Field label="الجوال">
                <Input
                  value={selectedContact?.phone || ""}
                  readOnly
                  disabled
                  dir="ltr"
                  placeholder="يُعبَّأ تلقائياً عند الاختيار"
                />
              </Field>
            </>
          )}
        </div>
        {!editingId ? (
          <p className="mt-3 text-xs text-steel-500">
            سيتم تعيين جهة الاتصال كمسؤول مورد، وإنشاء كلمة مرور مؤقتة وإرسالها
            بالبريد مع رابط تسجيل الدخول وتعيين كلمة مرور جديدة
            {website.trim() ? " ورابط موقع المورد" : ""}.
          </p>
        ) : null}
        {error ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        {mailPreview ? (
          <pre className="mt-2 whitespace-pre-wrap rounded-md border border-steel-200 bg-steel-50 p-3 text-xs text-steel-700 dark:border-steel-700 dark:bg-steel-800/50 dark:text-steel-200">
            {mailPreview}
          </pre>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(peek)}
        onClose={() => {
          setPeek(null);
          setProjectPick("");
        }}
        title={
          peek?.kind === "projects" ? "مشاريع المورد" : "موظفو المورد"
        }
        subtitle={peekVendor?.name}
        size="lg"
        footer={
          <Button
            variant="outline"
            onClick={() => {
              setPeek(null);
              setProjectPick("");
            }}
          >
            إغلاق
          </Button>
        }
      >
        {peek?.kind === "projects" && peekVendor ? (
          <div className="space-y-4">
            {isOrgAdmin ? (
              <ModalToolbar>
                <Field label="إضافة مشروع مرتبط" className="min-w-0 flex-1">
                  <SearchableSelect
                    value={projectPick}
                    onChange={setProjectPick}
                    options={[
                      { value: "", label: "اختر مشروعاً من مشاريع المنشأة" },
                      ...availableProjects.map((p) => ({
                        value: p.id,
                        label: `${p.name} (${p.code})`,
                      })),
                    ]}
                  />
                </Field>
                <Button
                  onClick={linkProject}
                  disabled={!projectPick}
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  ربط
                </Button>
              </ModalToolbar>
            ) : null}

            {peekProjects.length === 0 ? (
              <ModalEmpty>لا مشاريع مربوطة بهذا المورد.</ModalEmpty>
            ) : (
              <ModalPanel>
                <table className="vendors-table w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-steel-200 bg-steel-50/90 dark:border-steel-700 dark:bg-steel-800/60">
                      <th className={head}>المشروع</th>
                      <th className={cn(head, "w-[18%]")}>الرمز</th>
                      <th className={cn(head, "w-[16%]")}>الحالة</th>
                      {isOrgAdmin ? (
                        <th className={cn(head, "w-[10%]")}> </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {peekProjects.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-steel-100 last:border-b-0 dark:border-steel-800"
                      >
                        <td className={cell}>
                          <Link
                            to={`/projects/${p.id}`}
                            className="block truncate font-semibold text-brand-700 hover:underline dark:text-brand-300"
                            title={p.name}
                          >
                            {p.name}
                          </Link>
                        </td>
                        <td className={cell}>
                          <span className="vendors-ltr font-mono text-[11px] text-steel-500">
                            {p.code}
                          </span>
                        </td>
                        <td className={cell}>
                          <span
                            className={cn(
                              "inline-flex rounded border px-1.5 py-0.5 text-[11px] font-bold",
                              PROJECT_STATUS_BADGE[p.status] ??
                                PROJECT_STATUS_BADGE.draft,
                            )}
                          >
                            {PROJECT_STATUS_LABELS[p.status] ?? p.status}
                          </span>
                        </td>
                        {isOrgAdmin ? (
                          <td className="vendors-td whitespace-nowrap px-2 py-3.5">
                            <button
                              type="button"
                              onClick={() => void unlinkProject(p.id)}
                              className={iconBtnDelete}
                              title="فك الربط"
                              aria-label="فك الربط"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ModalPanel>
            )}
          </div>
        ) : null}

        {peek?.kind === "staff" ? (
          peekStaff.length === 0 ? (
            <ModalEmpty>لا موظفون مسجّلون لهذا المورد.</ModalEmpty>
          ) : (
            <ModalPanel>
              <table className="vendors-table w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-steel-200 bg-steel-50/90 dark:border-steel-700 dark:bg-steel-800/60">
                    <th className={head}>المستخدم</th>
                    <th className={head}>البريد</th>
                    <th className={cn(head, "w-[28%]")}>الدور</th>
                  </tr>
                </thead>
                <tbody>
                  {peekStaff.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-steel-100 last:border-b-0 dark:border-steel-800"
                    >
                      <td className={cn(cell, "font-semibold text-steel-800 dark:text-steel-100")}>
                        {u.name}
                      </td>
                      <td className={cell}>
                        <span className="vendors-ltr text-xs text-steel-600 dark:text-steel-300">
                          {u.email}
                        </span>
                      </td>
                      <td className={cell}>
                        <span className="inline-flex rounded border border-steel-200 bg-steel-50 px-1.5 py-0.5 text-[11px] font-bold text-steel-600 dark:border-steel-700 dark:bg-steel-800 dark:text-steel-300">
                          {roleLabel(String(u.role))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ModalPanel>
          )
        ) : null}
      </Modal>

      <Modal
        open={Boolean(contactCard)}
        onClose={() => setContactCard(null)}
        title="بطاقة جهة الاتصال"
        subtitle={contactCard?.name}
        size="sm"
        footer={
          <Button variant="outline" onClick={() => setContactCard(null)}>
            إغلاق
          </Button>
        }
      >
        {contactCard ? (
          <ModalCard>
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-brand-200 bg-brand-500/10 text-brand-700 dark:border-brand-800 dark:text-brand-300">
                <UserRound className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="truncate text-base font-bold text-steel-900 dark:text-steel-50">
                  {contactCard.contactName}
                </p>
                <span className="inline-flex rounded border border-steel-200 bg-white px-1.5 py-0.5 text-[11px] font-bold text-steel-600 dark:border-steel-700 dark:bg-steel-900 dark:text-steel-300">
                  {roleLabel(
                    String(contactLinkedUser?.role ?? "vendor_admin"),
                  )}
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-2.5 border-t border-steel-200 pt-3 dark:border-steel-700">
              <div className="flex items-center gap-2 text-sm text-steel-700 dark:text-steel-200">
                <Phone className="h-4 w-4 shrink-0 text-steel-400" />
                <span className="tabular-nums" dir="ltr">
                  {formatPhone(
                    contactLinkedUser?.phone || contactCard.contactPhone || "—",
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-steel-700 dark:text-steel-200">
                <Mail className="h-4 w-4 shrink-0 text-steel-400" />
                <span className="truncate" dir="ltr">
                  {contactLinkedUser?.email || contactCard.contactEmail}
                </span>
              </div>
              {contactCard.website ? (
                <div className="flex items-center gap-2 text-sm text-steel-700 dark:text-steel-200">
                  <Building2 className="h-4 w-4 shrink-0 text-steel-400" />
                  <a
                    href={contactCard.website}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-brand-700 hover:underline dark:text-brand-300"
                    dir="ltr"
                  >
                    {contactCard.website}
                  </a>
                </div>
              ) : null}
            </div>
          </ModalCard>
        ) : null}
      </Modal>
    </div>
  );
}
