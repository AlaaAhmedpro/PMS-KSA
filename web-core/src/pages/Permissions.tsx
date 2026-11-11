import { useMemo, useState } from "react";
import {
  ShieldCheck,
  Check,
  Plus,
  Trash2,
  Users,
  RotateCcw,
  Pencil,
  Copy,
  Search,
  UserRound,
} from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Input";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import {
  Modal,
  ModalEmpty,
  ModalPanel,
  ModalToolbar,
} from "../components/ui/Modal";
import { Pagination } from "../components/ui/Pagination";
import { usePagination, PAGE_SIZE_DEFAULT } from "../hooks/usePagination";
import { useRbac } from "../store/RbacContext";
import { useAuth } from "../store/AuthContext";
import { useConfirm } from "../store/ConfirmContext";
import { DEFAULT_MATRIX } from "../lib/constants";
import { cn } from "../lib/cn";
import type { AnyRoleId, PermissionKey, Role } from "../lib/types";
import { useLocale } from "../store/LocaleContext";
import {
  permissionLabel,
  roleDescriptionDisplay,
  roleDisplayName,
} from "../lib/i18nDisplay";
import type { TFn } from "../lib/i18nDisplay";

type TabId = "roles" | "users";

const PERMISSION_GROUPS: {
  id: string;
  keys: PermissionKey[];
}[] = [
  {
    id: "workspace",
    keys: ["dashboard", "viewStrategic"],
  },
  {
    id: "execution",
    keys: ["manageRecords", "execute", "close", "urgent"],
  },
  {
    id: "strategic",
    keys: ["managePortfolio", "manageProgram", "manageInitiative"],
  },
  {
    id: "admin",
    keys: ["managePeople", "settings"],
  },
];

const iconBtn =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-steel-400 transition-colors duration-150";
const iconBtnEdit = `${iconBtn} hover:bg-brand-500/10 hover:text-brand-600`;
const iconBtnDelete = `${iconBtn} hover:bg-red-500/10 hover:text-red-500`;

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
      title={
        active ? t("people.toggle.disableAccount") : t("people.toggle.enableAccount")
      }
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

export function Permissions() {
  const { t } = useLocale();
  const confirm = useConfirm();
  const {
    roles,
    matrix,
    togglePermission,
    addRole,
    updateRole,
    duplicateRole,
    removeRole,
    resetRolePermissions,
    resetRbac,
  } = useRbac();
  const { user, users, setUserRole, toggleActive } = useAuth();

  const [tab, setTab] = useState<TabId>("roles");
  const [selectedRoleId, setSelectedRoleId] = useState<AnyRoleId>(
    () => roles[0]?.id ?? "org_admin",
  );
  const [roleQuery, setRoleQuery] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">(
    "all",
  );

  const [roleFormOpen, setRoleFormOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<AnyRoleId | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [usersMsg, setUsersMsg] = useState("");

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) ?? roles[0] ?? null,
    [roles, selectedRoleId],
  );

  const usersByRole = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of users) {
      const key = String(u.role);
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [users]);

  const orgAdminCount = useMemo(
    () => users.filter((u) => u.role === "org_admin" && u.active !== false).length,
    [users],
  );

  const filteredRoles = useMemo(() => {
    const term = roleQuery.trim().toLowerCase();
    if (!term) return roles;
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term) ||
        String(r.id).toLowerCase().includes(term),
    );
  }, [roles, roleQuery]);

  const filteredUsers = useMemo(() => {
    const term = userQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && String(u.role) !== roleFilter) return false;
      if (statusFilter === "active" && u.active === false) return false;
      if (statusFilter === "disabled" && u.active !== false) return false;
      if (!term) return true;
      return (
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
      );
    });
  }, [users, userQuery, roleFilter, statusFilter]);

  const pagination = usePagination(filteredUsers, PAGE_SIZE_DEFAULT, [
    userQuery,
    roleFilter,
    statusFilter,
    filteredUsers.length,
  ]);

  const selectedPerms = selectedRole
    ? (matrix[selectedRole.id] ?? [])
    : [];

  const openCreateRole = () => {
    setEditingRoleId(null);
    setRoleName("");
    setRoleDescription("");
    setFormError("");
    setRoleFormOpen(true);
  };

  const openEditRole = (role: Role) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleDescription(role.description || "");
    setFormError("");
    setRoleFormOpen(true);
  };

  const submitRoleForm = () => {
    setFormError("");
    const name = roleName.trim();
    if (!name) {
      setFormError(t("permissions.error.roleName"));
      return;
    }
    if (editingRoleId) {
      const res = updateRole(editingRoleId, {
        name,
        description: roleDescription,
      });
      if (!res.ok) {
        setFormError(res.reason || t("permissions.error.updateRole"));
        return;
      }
    } else {
      const created = addRole(name, roleDescription.trim());
      setSelectedRoleId(created.id);
    }
    setRoleFormOpen(false);
  };

  const handleDeleteRole = async (role: Role) => {
    if (!role.custom) return;
    const assigned = usersByRole.get(String(role.id)) || 0;
    if (assigned > 0) {
      await confirm({
        title: t("permissions.delete.blockedTitle"),
        message: t("permissions.delete.blockedMsg", {
          name: role.name,
          n: assigned,
        }),
        confirmLabel: t("common.ok"),
        cancelLabel: t("common.close"),
      });
      return;
    }
    const ok = await confirm({
      title: t("permissions.delete.title"),
      message: t("permissions.delete.message", { name: role.name }),
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      danger: true,
    });
    if (!ok) return;
    const res = removeRole(role.id);
    if (!res.ok) {
      await confirm({
        title: t("permissions.delete.blockedTitle"),
        message: res.reason || t("permissions.delete.failed"),
        confirmLabel: t("common.ok"),
        cancelLabel: t("common.close"),
      });
      return;
    }
    if (selectedRoleId === role.id) {
      setSelectedRoleId(roles.find((r) => r.id !== role.id)?.id ?? "org_admin");
    }
  };

  const handleDuplicateRole = (role: Role) => {
    const res = duplicateRole(role.id);
    if (res.ok && res.role) setSelectedRoleId(res.role.id);
  };

  const handleResetRolePerms = async (role: Role) => {
    if (!DEFAULT_MATRIX[role.id]) return;
    const ok = await confirm({
      title: t("permissions.resetRole.title"),
      message: t("permissions.resetRole.message", { name: role.name }),
      confirmLabel: t("permissions.resetRole.confirm"),
      cancelLabel: t("common.cancel"),
    });
    if (!ok) return;
    resetRolePermissions(role.id);
  };

  const handleResetAll = async () => {
    const ok = await confirm({
      title: t("permissions.resetAll.title"),
      message: t("permissions.resetAll.message"),
      confirmLabel: t("permissions.resetAll.confirm"),
      cancelLabel: t("common.cancel"),
      danger: true,
    });
    if (!ok) return;
    resetRbac();
    setSelectedRoleId("org_admin");
  };

  const canToggleUser = (userId: string) => {
    if (user?.id === userId) return false;
    return true;
  };

  const canChangeRole = (targetId: string, nextRole: string) => {
    if (user?.id !== targetId) return true;
    if (user.role === "org_admin" && nextRole !== "org_admin" && orgAdminCount <= 1) {
      return false;
    }
    return true;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("permissions.title")}
        subtitle={t("permissions.subtitle")}
        icon={<ShieldCheck className="h-6 w-6" />}
        actions={
          <Button variant="outline" onClick={() => void handleResetAll()}>
            <RotateCcw className="h-4 w-4" />
            {t("permissions.resetRoles")}
          </Button>
        }
      />

      <div className="flex flex-wrap gap-1 rounded-md border border-steel-200 bg-white p-1 dark:border-steel-700 dark:bg-steel-900">
        <button
          type="button"
          onClick={() => setTab("roles")}
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold transition-colors duration-150",
            tab === "roles"
              ? "bg-brand-500/10 text-brand-700 dark:text-brand-300"
              : "text-steel-500 hover:bg-steel-50 dark:hover:bg-steel-800",
          )}
        >
          <ShieldCheck className="h-4 w-4" />
          {t("permissions.tab.roles")}
        </button>
        <button
          type="button"
          onClick={() => setTab("users")}
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold transition-colors duration-150",
            tab === "users"
              ? "bg-brand-500/10 text-brand-700 dark:text-brand-300"
              : "text-steel-500 hover:bg-steel-50 dark:hover:bg-steel-800",
          )}
        >
          <Users className="h-4 w-4" />
          {t("permissions.tab.users")}
        </button>
      </div>

      {tab === "roles" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <Card className="overflow-hidden p-0">
            <div className="space-y-3 border-b border-steel-100 p-3 dark:border-steel-800">
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
                <Input
                  className="ps-9"
                  value={roleQuery}
                  onChange={(e) => setRoleQuery(e.target.value)}
                  placeholder={t("permissions.searchRoles")}
                />
              </div>
              <Button className="w-full" size="sm" onClick={openCreateRole}>
                <Plus className="h-4 w-4" />
                {t("permissions.addRole")}
              </Button>
            </div>
            <div className="max-h-[34rem] overflow-y-auto">
              {filteredRoles.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-steel-500">
                  {t("permissions.noRoles")}
                </p>
              ) : (
                filteredRoles.map((role) => {
                  const count = usersByRole.get(String(role.id)) || 0;
                  const permCount = matrix[role.id]?.length ?? 0;
                  const active = selectedRole?.id === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRoleId(role.id)}
                      className={cn(
                        "flex w-full flex-col gap-1 border-b border-steel-100 px-3 py-3 text-start transition-colors duration-150 last:border-b-0 dark:border-steel-800",
                        active
                          ? "bg-brand-500/10"
                          : "hover:bg-steel-50 dark:hover:bg-steel-800/40",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-steel-800 dark:text-steel-100">
                          {roleDisplayName(t, role)}
                        </span>
                        {role.custom ? (
                          <span className="shrink-0 rounded border border-brand-200 bg-brand-500/10 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 dark:border-brand-800 dark:text-brand-300">
                            {t("common.customRole")}
                          </span>
                        ) : (
                          <span className="shrink-0 rounded border border-steel-200 bg-steel-50 px-1.5 py-0.5 text-[10px] font-bold text-steel-500 dark:border-steel-700 dark:bg-steel-800 dark:text-steel-300">
                            {t("common.systemRole")}
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-2 text-[11px] text-steel-500">
                        {roleDescriptionDisplay(t, role) || t("common.noDescription")}
                      </p>
                      <p className="text-[11px] font-bold text-steel-400">
                        {t("permissions.permCount", { n: permCount, count })}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          <Card className="space-y-4 p-4">
            {selectedRole ? (
              <>
                <div className="flex flex-col gap-3 border-b border-steel-100 pb-4 sm:flex-row sm:items-start sm:justify-between dark:border-steel-800">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-steel-800 dark:text-steel-100">
                        {roleDisplayName(t, selectedRole)}
                      </h3>
                      {selectedRole.custom ? (
                        <span className="rounded border border-brand-200 bg-brand-500/10 px-1.5 py-0.5 text-[11px] font-bold text-brand-700">
                          {t("common.customRole")}
                        </span>
                      ) : (
                        <span className="rounded border border-steel-200 bg-steel-50 px-1.5 py-0.5 text-[11px] font-bold text-steel-500 dark:border-steel-700 dark:bg-steel-800">
                          {t("common.systemRoleFull")}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-steel-500">
                      {roleDescriptionDisplay(t, selectedRole) ||
                        t("common.noDescription")}
                    </p>
                    <p className="mt-1 text-[11px] font-bold text-steel-400">
                      {t("permissions.permActiveCount", {
                        n: selectedPerms.length,
                        count: usersByRole.get(String(selectedRole.id)) || 0,
                      })}
                    </p>
                  </div>
                  <div className="inline-flex flex-nowrap items-center gap-0.5">
                    <button
                      type="button"
                      className={iconBtnEdit}
                      title={t("common.edit")}
                      aria-label={t("common.edit")}
                      onClick={() => openEditRole(selectedRole)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className={iconBtnEdit}
                      title={t("permissions.duplicate")}
                      aria-label={t("permissions.duplicate")}
                      onClick={() => handleDuplicateRole(selectedRole)}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    {DEFAULT_MATRIX[selectedRole.id] ? (
                      <button
                        type="button"
                        className={iconBtnEdit}
                        title={t("permissions.resetDefault")}
                        aria-label={t("permissions.resetDefault")}
                        onClick={() => void handleResetRolePerms(selectedRole)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    ) : null}
                    {selectedRole.custom ? (
                      <button
                        type="button"
                        className={iconBtnDelete}
                        title={t("common.delete")}
                        aria-label={t("common.delete")}
                        onClick={() => void handleDeleteRole(selectedRole)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-4">
                  {PERMISSION_GROUPS.map((group) => (
                    <div key={group.id}>
                      <p className="mb-2 text-xs font-bold text-steel-500">
                        {t(`permissionGroup.${group.id}`)}
                      </p>
                      <div className="space-y-2">
                        {group.keys.map((key) => {
                          const enabled = selectedPerms.includes(key);
                          const lockSettings =
                            selectedRole.id === "org_admin" &&
                            key === "settings" &&
                            enabled;
                          return (
                            <div
                              key={key}
                              className="flex items-center justify-between gap-3 rounded-md border border-steel-200 bg-steel-50/60 px-3 py-2.5 dark:border-steel-700 dark:bg-steel-800/40"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-steel-800 dark:text-steel-100">
                                  {permissionLabel(t, key)}
                                </p>
                                <p className="text-[11px] text-steel-400">
                                  {key}
                                </p>
                              </div>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={enabled}
                                disabled={lockSettings}
                                title={
                                  lockSettings
                                    ? t("permissions.settingsLockHint")
                                    : enabled
                                      ? t("permissions.toggle.revoke")
                                      : t("permissions.toggle.grant")
                                }
                                onClick={() =>
                                  togglePermission(selectedRole.id, key)
                                }
                                className={cn(
                                  "relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors duration-150",
                                  enabled
                                    ? "border-brand-500 bg-brand-500"
                                    : "border-steel-300 bg-steel-200 dark:border-steel-600 dark:bg-steel-700",
                                  lockSettings &&
                                    "cursor-not-allowed opacity-60",
                                )}
                              >
                                <span
                                  className={cn(
                                    "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-[inset-inline-start] duration-150",
                                    enabled
                                      ? "end-0.5 start-auto"
                                      : "start-0.5",
                                  )}
                                />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <ModalEmpty>{t("permissions.selectRole")}</ModalEmpty>
            )}
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <ModalToolbar className="items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
              <Input
                className="ps-9"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder={t("permissions.searchUsers")}
              />
            </div>
            <SearchableSelect
              className="min-w-[12rem]"
              value={roleFilter}
              onChange={setRoleFilter}
              options={[
                { value: "all", label: t("common.allRoles") },
                ...roles.map((r) => ({
                  value: String(r.id),
                  label: roleDisplayName(t, r),
                })),
              ]}
            />
            <SearchableSelect
              className="min-w-[10rem]"
              value={statusFilter}
              onChange={(v) =>
                setStatusFilter(v as "all" | "active" | "disabled")
              }
              options={[
                { value: "all", label: t("common.allStatuses") },
                { value: "active", label: t("common.active") },
                { value: "disabled", label: t("common.disabled") },
              ]}
            />
          </ModalToolbar>
          {usersMsg ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">{usersMsg}</p>
          ) : null}

          <Card className="overflow-hidden p-0">
            <ModalPanel className="border-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] table-fixed text-sm">
                  <colgroup>
                    <col className="w-[28%]" />
                    <col className="w-[24%]" />
                    <col className="w-[22%]" />
                    <col className="w-[16%]" />
                    <col className="w-[10%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-steel-200 bg-steel-50/90 dark:border-steel-700 dark:bg-steel-800/60">
                      <th className="px-4 py-3 text-start text-xs font-bold text-steel-500">
                        {t("common.user")}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-bold text-steel-500">
                        {t("common.email")}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-bold text-steel-500">
                        {t("common.role")}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-bold text-steel-500">
                        {t("common.status")}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-bold text-steel-500">
                        {" "}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagination.paginated.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center text-sm text-steel-500"
                        >
                          {t("permissions.noUsers")}
                        </td>
                      </tr>
                    ) : (
                      pagination.paginated.map((u) => {
                        const isSelf = user?.id === u.id;
                        const active = u.active !== false;
                        const disableToggle = !canToggleUser(u.id);
                        return (
                          <tr
                            key={u.id}
                            className="border-b border-steel-100 last:border-b-0 dark:border-steel-800"
                          >
                            <td className="px-4 py-3 align-middle">
                              <div className="flex min-w-0 items-center gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-brand-200 bg-brand-500/10 text-xs font-bold text-brand-700 dark:border-brand-800 dark:text-brand-300">
                                  {u.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-steel-800 dark:text-steel-100">
                                    {u.name}
                                  </p>
                                  {isSelf ? (
                                    <span className="mt-0.5 inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300">
                                      <UserRound className="h-3 w-3" />
                                      {t("common.you")}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 align-middle">
                              <span
                                className="block truncate text-xs text-steel-600 dark:text-steel-300"
                                dir="ltr"
                              >
                                {u.email}
                              </span>
                            </td>
                            <td className="px-4 py-3 align-middle">
                              <SearchableSelect
                                value={String(u.role)}
                                onChange={(roleId) => {
                                  if (!canChangeRole(u.id, roleId)) {
                                    setUsersMsg(t("permissions.cannotDemoteSelf"));
                                    return;
                                  }
                                  setUsersMsg("");
                                  setUserRole(u.id, roleId);
                                }}
                                options={roles.map((r) => ({
                                  value: String(r.id),
                                  label: roleDisplayName(t, r),
                                }))}
                                className="min-w-[10rem]"
                                searchPlaceholder={t("permissions.searchRoles")}
                              />
                            </td>
                            <td className="px-4 py-3 align-middle">
                              <div className="flex items-center gap-2">
                                <StatusToggle
                                  active={active}
                                  disabled={disableToggle}
                                  onToggle={() => toggleActive(u.id)}
                                  t={t}
                                />
                                <span className="text-[11px] font-bold text-steel-500">
                                  {active ? t("common.active") : t("common.disabled")}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 py-3 align-middle">
                              {isSelf ? (
                                <span className="text-[11px] font-bold text-steel-400">
                                  {t("common.yourAccount")}
                                </span>
                              ) : (
                                <span className="text-steel-300">—</span>
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
                total={pagination.total}
                rangeStart={pagination.rangeStart}
                rangeEnd={pagination.rangeEnd}
              />
            </ModalPanel>
          </Card>
        </div>
      )}

      <Modal
        open={roleFormOpen}
        onClose={() => setRoleFormOpen(false)}
        title={
          editingRoleId
            ? t("permissions.roleForm.edit")
            : t("permissions.roleForm.add")
        }
        subtitle={
          editingRoleId
            ? t("permissions.roleForm.editSub")
            : t("permissions.roleForm.addSub")
        }
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setRoleFormOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={submitRoleForm}>
              <Check className="h-4 w-4" />
              {t("common.save")}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t("permissions.roleForm.name")} required>
            <Input
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder={t("permissions.roleForm.namePlaceholder")}
            />
          </Field>
          <Field label={t("permissions.roleForm.desc")}>
            <Input
              value={roleDescription}
              onChange={(e) => setRoleDescription(e.target.value)}
              placeholder={t("permissions.roleForm.descPlaceholder")}
            />
          </Field>
          {formError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
