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
import { cn } from "../lib/cn";
import { useLocale } from "../store/LocaleContext";
import { projectStatusLabel, roleDisplayName } from "../lib/i18nDisplay";
import type { TFn } from "../lib/i18nDisplay";
import type { Vendor, VendorStatus } from "../models/domain";
import type { User } from "../lib/types";

const CITY_KEYS = [
  "city.riyadh",
  "city.jeddah",
  "city.dammam",
  "city.madinah",
  "city.abha",
] as const;

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
  t,
}: {
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
  t: TFn;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled}
      onClick={onToggle}
      title={active ? t("vendors.toggle.disable") : t("vendors.toggle.enable")}
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
  const { t } = useLocale();
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
  const [city, setCity] = useState(() => t("city.riyadh"));
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
        <p className="text-sm text-steel-500">{t("vendors.noAccess")}</p>
      </Card>
    );
  }

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setCommercialRegister("");
    setCity(t("city.riyadh"));
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
      setError(t("vendors.error.nameRequired"));
      return;
    }
    if (!/^\d{10}$/.test(cr)) {
      setError(t("vendors.error.cr"));
      return;
    }
    if (site && !/^https?:\/\//i.test(site)) {
      setError(t("vendors.error.website"));
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
      setError(t("vendors.error.pickContact"));
      return;
    }
    if (!selectedContact.phone || !/^05\d{8}$/.test(selectedContact.phone)) {
      setError(t("vendors.error.contactPhone"));
      return;
    }

    const orgId = organization?.id;
    if (!orgId) {
      setError(t("vendors.error.org"));
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
      setError(res.reason || t("vendors.error.grantAdmin"));
      return;
    }

    setMailPreview(res.mailPreview || "");
    setFormOpen(false);
    resetForm();
  };

  const handleDelete = async (v: Vendor) => {
    const ok = await confirm({
      title: t("vendors.delete.title"),
      message: t("vendors.delete.message", { name: v.name }),
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
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
      title: t("vendors.unlink.title"),
      message: t("vendors.unlink.message", {
        name: project?.name ?? projectId,
      }),
      confirmLabel: t("common.unlink"),
      cancelLabel: t("common.cancel"),
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
        title={t("vendors.title")}
        subtitle={t("vendors.subtitle")}
        icon={<Building2 className="h-6 w-6" />}
        actions={
          isOrgAdmin ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("vendors.add")}
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
            placeholder={t("vendors.searchPlaceholder")}
          />
        </div>
        <SearchableSelect
          className="min-w-[12rem]"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as "all" | VendorStatus)}
          options={[
            { value: "all", label: t("common.allStatuses") },
            { value: "active", label: t("common.enabled") },
            { value: "inactive", label: t("common.inactive") },
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
                <th className={head}>{t("vendors.col.vendor")}</th>
                <th className={head}>{t("vendors.col.city")}</th>
                <th className={head}>{t("vendors.col.status")}</th>
                <th className={head}>{t("vendors.col.projects")}</th>
                <th className={head}>{t("vendors.col.staff")}</th>
                <th className={head}>{t("vendors.col.contact")}</th>
                <th className={head}>{t("vendors.col.email")}</th>
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
                    {t("vendors.empty")}
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
                            t={t}
                          />
                          <span className="text-[11px] font-bold text-steel-500">
                            {v.status === "active"
                              ? t("common.enabled")
                              : t("common.inactive")}
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
                            {projectCount === 1
                              ? t("common.project")
                              : t("common.projects")}
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
                            {staffCount === 1
                              ? t("common.staff")
                              : t("common.staffPlural")}
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
                              title={t("common.edit")}
                              aria-label={t("common.edit")}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(v)}
                              className={iconBtnDelete}
                              title={t("common.delete")}
                              aria-label={t("common.delete")}
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
        title={
          editingId ? t("vendors.modal.edit") : t("vendors.modal.add")
        }
        subtitle={
          editingId ? name || undefined : t("vendors.modal.addSubtitle")
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
              {t("common.cancel")}
            </Button>
            <Button onClick={submit}>{t("common.save")}</Button>
          </>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={t("vendors.field.name")} required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={t("vendors.field.cr")} required>
            <Input
              value={commercialRegister}
              onChange={(e) => setCommercialRegister(e.target.value)}
              dir="ltr"
              placeholder="1010897452"
              maxLength={10}
            />
          </Field>
          <Field label={t("vendors.field.city")} required>
            <SearchableSelect
              value={city}
              onChange={setCity}
              options={CITY_KEYS.map((key) => ({
                value: t(key),
                label: t(key),
              }))}
            />
          </Field>
          <Field label={t("vendors.field.websiteOptional")}>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              dir="ltr"
              placeholder="https://vendor.sa"
            />
          </Field>
          {editingId ? (
            <>
              <Field label={t("vendors.field.contact")}>
                <Input value={editingVendor?.contactName || ""} readOnly disabled />
              </Field>
              <Field label={t("common.email")}>
                <Input
                  value={editingVendor?.contactEmail || ""}
                  readOnly
                  disabled
                  dir="ltr"
                />
              </Field>
              <Field label={t("common.phone")}>
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
              <Field label={t("vendors.field.contactRequired")} required>
                <SearchableSelect
                  value={contactUserId}
                  onChange={setContactUserId}
                  searchPlaceholder={t("vendors.contactSearch")}
                  placeholder={t("vendors.contactPlaceholder")}
                  truncateLabel={false}
                  options={contactCandidates.map((u) => ({
                    value: u.id,
                    label: `${u.name} — ${u.email}`,
                  }))}
                />
              </Field>
              <Field label={t("common.email")}>
                <Input
                  value={selectedContact?.email || ""}
                  readOnly
                  disabled
                  dir="ltr"
                  placeholder={t("vendors.autoFill")}
                />
              </Field>
              <Field label={t("common.phone")}>
                <Input
                  value={selectedContact?.phone || ""}
                  readOnly
                  disabled
                  dir="ltr"
                  placeholder={t("vendors.autoFill")}
                />
              </Field>
            </>
          )}
        </div>
        {!editingId ? (
          <p className="mt-3 text-xs text-steel-500">
            {t("vendors.onboardingNote")}
            {website.trim() ? t("vendors.onboardingWebsite") : ""}.
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
          peek?.kind === "projects"
            ? t("vendors.peek.projects")
            : t("vendors.peek.staff")
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
            {t("common.close")}
          </Button>
        }
      >
        {peek?.kind === "projects" && peekVendor ? (
          <div className="space-y-4">
            {isOrgAdmin ? (
              <ModalToolbar>
                <Field label={t("vendors.peek.addProject")} className="min-w-0 flex-1">
                  <SearchableSelect
                    value={projectPick}
                    onChange={setProjectPick}
                    options={[
                      { value: "", label: t("vendors.peek.pickProject") },
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
                  {t("common.link")}
                </Button>
              </ModalToolbar>
            ) : null}

            {peekProjects.length === 0 ? (
              <ModalEmpty>{t("vendors.peek.noProjects")}</ModalEmpty>
            ) : (
              <ModalPanel>
                <table className="vendors-table w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-steel-200 bg-steel-50/90 dark:border-steel-700 dark:bg-steel-800/60">
                      <th className={head}>{t("vendors.peek.col.project")}</th>
                      <th className={cn(head, "w-[18%]")}>{t("common.code")}</th>
                      <th className={cn(head, "w-[16%]")}>{t("common.status")}</th>
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
                            {projectStatusLabel(t, p.status)}
                          </span>
                        </td>
                        {isOrgAdmin ? (
                          <td className="vendors-td whitespace-nowrap px-2 py-3.5">
                            <button
                              type="button"
                              onClick={() => void unlinkProject(p.id)}
                              className={iconBtnDelete}
                              title={t("common.unlinkTitle")}
                              aria-label={t("common.unlinkTitle")}
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
            <ModalEmpty>{t("vendors.peek.noStaff")}</ModalEmpty>
          ) : (
            <ModalPanel>
              <table className="vendors-table w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-steel-200 bg-steel-50/90 dark:border-steel-700 dark:bg-steel-800/60">
                    <th className={head}>{t("common.user")}</th>
                    <th className={head}>{t("common.email")}</th>
                    <th className={cn(head, "w-[28%]")}>{t("common.role")}</th>
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
                          {roleDisplayName(t, {
                            id: String(u.role),
                            name: String(u.role),
                          })}
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
        title={t("vendors.contactCard.title")}
        subtitle={contactCard?.name}
        size="sm"
        footer={
          <Button variant="outline" onClick={() => setContactCard(null)}>
            {t("common.close")}
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
                  {roleDisplayName(t, {
                    id: String(contactLinkedUser?.role ?? "vendor_admin"),
                    name: String(contactLinkedUser?.role ?? "vendor_admin"),
                  })}
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
