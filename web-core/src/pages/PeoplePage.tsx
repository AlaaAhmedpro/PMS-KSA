import { useMemo, useState } from "react";
import { Mail, UserPlus, Users } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input, NativeSelect } from "../components/ui/Input";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { useAuth } from "../store/AuthContext";
import { useHierarchy } from "../store/HierarchyStore";
import { useCan, useRbac } from "../store/RbacContext";
import type { CoreRoleId, UserProvisionMethod } from "../models/domain";
import type { User } from "../lib/types";
import { cn } from "../lib/cn";
import { useLocale } from "../store/LocaleContext";
import { roleDisplayName } from "../lib/i18nDisplay";
import type { TFn } from "../lib/i18nDisplay";
import { listSentMail, type DemoMailMessage } from "../lib/demoMail";

type StatusFilter = "all" | "active" | "pending" | "must_change" | "disabled";

function provisionMethodOf(u: User): UserProvisionMethod | null {
  if (u.provisionMethod === "temp_password" || u.provisionMethod === "activation_link") {
    return u.provisionMethod;
  }
  if (u.emailVerified === false || u.activationToken) return "activation_link";
  if (u.mustChangePassword) return "temp_password";
  return null;
}

function activationLabel(u: User, t: TFn): { label: string; className: string } {
  if (u.active === false) {
    return {
      label: t("people.status.disabled"),
      className:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:text-red-300",
    };
  }
  if (u.emailVerified === false) {
    return {
      label: t("people.status.notActivated"),
      className:
        "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:text-amber-200",
    };
  }
  if (u.mustChangePassword) {
    return {
      label: t("people.status.pendingPassword"),
      className:
        "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:text-sky-300",
    };
  }
  return {
    label: t("people.status.active"),
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300",
  };
}

function statusBucket(u: User): StatusFilter {
  if (u.active === false) return "disabled";
  if (u.emailVerified === false) return "pending";
  if (u.mustChangePassword) return "must_change";
  return "active";
}

function methodLabel(method: UserProvisionMethod | null, t: TFn): string {
  if (method === "temp_password") return t("people.method.tempPassword");
  if (method === "activation_link") return t("people.method.activationLink");
  return t("common.emDash");
}

function resendActionLabel(method: UserProvisionMethod | null, u: User, t: TFn): string {
  const m = method ?? (u.emailVerified === false ? "activation_link" : "temp_password");
  return m === "activation_link" ? t("people.resend.link") : t("people.resend.password");
}

function ActiveToggle({
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
      title={active ? t("people.toggle.disableAccount") : t("people.toggle.enableAccount")}
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

export function PeoplePage() {
  const { t, L } = useLocale();
  const {
    users,
    setUserRole,
    toggleActive,
    provisionUser,
    resendProvisionMail,
    organization,
  } = useAuth();
  const { projects, addProjectMember } = useHierarchy();
  const can = useCan();
  const { roles } = useRbac();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CoreRoleId>("member");
  const [projectId, setProjectId] = useState("");
  const [method, setMethod] = useState<UserProvisionMethod>("temp_password");
  const [msg, setMsg] = useState("");
  const [mailPreview, setMailPreview] = useState("");
  const [mailTick, setMailTick] = useState(0);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);

  const sentMail = useMemo(() => listSentMail(), [mailTick, msg]);

  const lastMailByEmail = useMemo(() => {
    const map = new Map<string, DemoMailMessage>();
    for (const m of sentMail) {
      const key = m.to.toLowerCase();
      if (!map.has(key)) map.set(key, m);
    }
    return map;
  }, [sentMail]);

  const orgUsers = useMemo(() => {
    const base = users.filter(
      (u) =>
        !organization?.id ||
        u.organizationId === organization.id ||
        !u.organizationId,
    );
    if (user?.role === "vendor_admin" && user.vendorId) {
      return base.filter((u) => u.vendorId === user.vendorId);
    }
    return base;
  }, [users, organization?.id, user?.role, user?.vendorId]);

  const filteredUsers = useMemo(() => {
    const term = q.trim().toLowerCase();
    return orgUsers.filter((u) => {
      if (statusFilter !== "all" && statusBucket(u) !== statusFilter) return false;
      if (!term) return true;
      return (
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
      );
    });
  }, [orgUsers, q, statusFilter]);

  if (!can.managePeople(user?.role)) {
    return (
      <Card className="p-6">
        <p className="text-sm text-steel-500">{t("people.noAccess")}</p>
      </Card>
    );
  }

  const createUser = () => {
    setMsg("");
    setMailPreview("");
    const res = provisionUser({
      name,
      email,
      role,
      projectId: projectId || undefined,
      method,
    });
    if (!res.ok || !res.user) {
      setMsg(L(res.reason) || t("people.error.createUser"));
      return;
    }
    if (projectId) addProjectMember(projectId, res.user.id);
    setMsg(
      method === "temp_password"
        ? t("people.msg.createdTemp")
        : t("people.msg.createdActivation"),
    );
    setMailPreview(res.mailPreview || "");
    setMailTick((n) => n + 1);
    setPreviewUserId(res.user.id);
    setName("");
    setEmail("");
  };

  const statusTabs: { id: StatusFilter; label: string }[] = [
    { id: "all", label: t("common.all") },
    { id: "active", label: t("people.status.active") },
    { id: "pending", label: t("people.status.notActivated") },
    { id: "must_change", label: t("people.filter.mustChange") },
    { id: "disabled", label: t("people.status.disabled") },
  ];

  const previewUser = previewUserId
    ? filteredUsers.find((u) => u.id === previewUserId) ||
      orgUsers.find((u) => u.id === previewUserId)
    : null;
  const previewMail = previewUser
    ? lastMailByEmail.get(previewUser.email.toLowerCase())
    : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("people.title")}
        subtitle={t("people.subtitle")}
        icon={<Users className="h-6 w-6" />}
      />

      <Card className="space-y-3 p-4">
        <p className="flex items-center gap-2 text-sm font-bold">
          <UserPlus className="h-4 w-4" />
          {t("people.addUser")}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={t("people.field.name")} required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={t("people.field.email")} required>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              placeholder="name@company.sa"
            />
          </Field>
          <Field label={t("people.field.role")}>
            <SearchableSelect
              value={role}
              onChange={(v) => setRole(v as CoreRoleId)}
              options={roles
                .filter((r) =>
                  ["member", "project_manager", "external", "pr"].includes(
                    String(r.id),
                  ),
                )
                .map((r) => ({
                  value: String(r.id),
                  label: roleDisplayName(t, r),
                }))}
            />
          </Field>
          <Field label={t("people.field.projectOptional")}>
            <SearchableSelect
              value={projectId}
              onChange={setProjectId}
              options={[
                { value: "", label: t("people.projectNone") },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </Field>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold text-steel-500">
            {t("people.provisionMethod")}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMethod("temp_password")}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors",
                method === "temp_password"
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-steel-200 text-steel-600 hover:bg-steel-50 dark:border-steel-700 dark:text-steel-300",
              )}
            >
              {t("people.method.tempPassword")}
            </button>
            <button
              type="button"
              onClick={() => setMethod("activation_link")}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors",
                method === "activation_link"
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-steel-200 text-steel-600 hover:bg-steel-50 dark:border-steel-700 dark:text-steel-300",
              )}
            >
              {t("people.method.activationLink")}
            </button>
          </div>
        </div>

        {msg ? <p className="text-sm text-brand-700">{msg}</p> : null}
        {mailPreview ? (
          <div className="rounded-md border border-steel-200 bg-steel-50 p-3 dark:border-steel-700 dark:bg-steel-800/50">
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-steel-500">
              <Mail className="h-3.5 w-3.5" />
              {t("common.mailPreview")}
            </p>
            <pre className="whitespace-pre-wrap text-xs text-steel-700 dark:text-steel-200">
              {mailPreview}
            </pre>
          </div>
        ) : null}

        <Button onClick={createUser}>{t("common.createAndSend")}</Button>
      </Card>

      <div className="flex flex-wrap gap-2">
        {statusTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setStatusFilter(t.id)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors",
              statusFilter === t.id
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-steel-200 text-steel-600 hover:bg-steel-50 dark:border-steel-700 dark:text-steel-300",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("people.searchPlaceholder")}
        aria-label={t("people.searchAria")}
      />

      <Card className="overflow-hidden p-0">
        <table className="w-full min-w-[980px] table-fixed text-sm">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[18%]" />
            <col className="w-[10%]" />
            <col className="w-[22%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-steel-200 bg-steel-50 text-start dark:border-steel-700 dark:bg-steel-800/60">
              <th className="px-4 py-3 text-start font-bold">{t("people.col.user")}</th>
              <th className="px-4 py-3 text-start font-bold">{t("people.col.role")}</th>
              <th className="px-4 py-3 text-start font-bold">{t("people.col.provision")}</th>
              <th className="px-4 py-3 text-start font-bold">{t("people.col.activation")}</th>
              <th className="px-4 py-3 text-start font-bold">{t("people.col.account")}</th>
              <th className="px-4 py-3 text-start font-bold">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-steel-500"
                >
                  {t("people.empty")}
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const methodOf = provisionMethodOf(u);
                const act = activationLabel(u, t);
                const isSelf = user?.id === u.id;
                return (
                  <tr
                    key={u.id}
                    className="border-b border-steel-100 dark:border-steel-800"
                  >
                    <td className="px-4 py-3 align-middle">
                      <p className="truncate font-semibold text-steel-800 dark:text-steel-100">
                        {u.name}
                      </p>
                      <p
                        className="mt-0.5 truncate text-[11px] text-steel-400"
                        dir="ltr"
                      >
                        {u.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <NativeSelect
                        value={String(u.role)}
                        onChange={(e) => setUserRole(u.id, e.target.value)}
                        className="min-w-[8rem]"
                        aria-label={t("people.roleAria", { name: u.name })}
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={String(r.id)}>
                            {roleDisplayName(t, r)}
                          </option>
                        ))}
                      </NativeSelect>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="inline-flex rounded border border-steel-200 bg-steel-50 px-1.5 py-0.5 text-[11px] font-bold text-steel-600 dark:border-steel-700 dark:bg-steel-800 dark:text-steel-300">
                        {methodLabel(methodOf, t)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span
                        className={cn(
                          "inline-flex max-w-full rounded border px-1.5 py-0.5 text-[11px] font-bold",
                          act.className,
                        )}
                      >
                        {act.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        <ActiveToggle
                          active={u.active !== false}
                          disabled={isSelf}
                          onToggle={() => toggleActive(u.id)}
                          t={t}
                        />
                        <span className="text-[11px] font-bold text-steel-500">
                          {u.active === false
                            ? t("people.status.disabled")
                            : t("people.status.active")}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="inline-flex flex-wrap items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const res = resendProvisionMail(u.id);
                            if (!res.ok) {
                              setMsg(
                                L(res.reason) || t("people.msg.resendFailed"),
                              );
                              return;
                            }
                            setMsg(
                              methodOf === "activation_link" ||
                                u.emailVerified === false
                                ? t("people.msg.resendActivation")
                                : t("people.msg.resendPassword"),
                            );
                            setMailPreview(res.mailPreview || "");
                            setMailTick((n) => n + 1);
                            setPreviewUserId(u.id);
                          }}
                        >
                          {resendActionLabel(methodOf, u, t)}
                        </Button>
                        {lastMailByEmail.has(u.email.toLowerCase()) ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setPreviewUserId(
                                previewUserId === u.id ? null : u.id,
                              )
                            }
                          >
                            {previewUserId === u.id
                              ? t("common.hideMail")
                              : t("common.preview")}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>

      {previewUserId && (mailPreview || previewMail) ? (
        <Card className="space-y-2 p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold text-steel-500">
            <Mail className="h-3.5 w-3.5" />
            {t("people.mailPreviewFor", {
              email: previewUser?.email ?? "",
            })}
          </p>
          <pre className="whitespace-pre-wrap rounded-md border border-steel-200 bg-steel-50 p-3 text-xs text-steel-700 dark:border-steel-700 dark:bg-steel-800/50 dark:text-steel-200">
            {mailPreview || previewMail?.body || ""}
          </pre>
        </Card>
      ) : null}
    </div>
  );
}
