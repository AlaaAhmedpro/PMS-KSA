import { useState } from "react";
import { PageScaffold } from "../../components/sa/PageScaffold";
import { StatusPill } from "../../components/sa/StatusPill";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { useAuth } from "../../store/AuthContext";
import { usePlatform } from "../../store/PlatformStore";
import type { PlatformRoleId } from "../../lib/platformDomain";
import { normalizePlatformRole } from "../../lib/platformRbac";
import { useLocale } from "../../store/LocaleContext";
import { usePlatformLabels } from "../../lib/platformI18n";

export function PlatformUsersPage() {
  const { users, toggleActive, setUserRole } = useAuth();
  const { invites, invitePlatformUser, revokeInvite, loginHistory } =
    usePlatform();
  const { t, L } = useLocale();
  const { platformRole, platformRoleOptions } = usePlatformLabels();
  const [tab, setTab] = useState<"users" | "invites" | "logins">("users");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "platform_admin" as PlatformRoleId,
  });

  const inviteStatus = (s: string) => {
    if (s === "pending") return t("page.platformUsers.invitePending");
    if (s === "accepted") return t("page.platformUsers.inviteAccepted");
    return t("page.platformUsers.inviteRevoked");
  };

  return (
    <PageScaffold
      title={t("page.platformUsers.title")}
      subtitle={t("page.platformUsers.subtitle")}
      actions={<Button onClick={() => setOpen(true)}>{t("page.platformUsers.invite")}</Button>}
    >
      <div className="flex gap-1 border-b border-slate-200">
        {(
          [
            ["users", t("page.platformUsers.tab.users")],
            ["invites", t("page.platformUsers.tab.invites")],
            ["logins", t("page.platformUsers.tab.logins")],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3 py-2 text-xs font-bold ${
              tab === id ? "border-b-2 border-blue-600 text-blue-700" : "text-slate-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <div className="sa-surface overflow-x-auto">
          <table className="sa-table w-full min-w-[720px]">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-start">{t("common.name")}</th>
                <th className="px-3 py-2 text-start">{t("common.email")}</th>
                <th className="px-3 py-2 text-start">{t("page.platformUsers.col.role")}</th>
                <th className="px-3 py-2 text-start">{t("common.status")}</th>
                <th className="px-3 py-2 text-start">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const role = normalizePlatformRole(u.role);
                return (
                  <tr key={u.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-semibold">{L(u.name)}</td>
                    <td className="px-3 py-2 text-sm">{u.email}</td>
                    <td className="px-3 py-2">
                      <SearchableSelect
                        value={role}
                        onChange={(v) => setUserRole(u.id, v)}
                        options={platformRoleOptions()}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill
                        label={
                          u.active === false ? t("common.inactive") : t("common.active")
                        }
                        tone={u.active === false ? "danger" : "success"}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Button size="sm" variant="outline" onClick={() => toggleActive(u.id)}>
                        {u.active === false ? t("common.enable") : t("common.disable")}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "invites" && (
        <div className="sa-surface overflow-x-auto">
          <table className="sa-table w-full">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-start">{t("common.name")}</th>
                <th className="px-3 py-2 text-start">{t("common.email")}</th>
                <th className="px-3 py-2 text-start">{t("page.platformUsers.col.role")}</th>
                <th className="px-3 py-2 text-start">{t("common.status")}</th>
                <th className="px-3 py-2 text-start">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((i) => (
                <tr key={i.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">{L(i.name)}</td>
                  <td className="px-3 py-2">{i.email}</td>
                  <td className="px-3 py-2">{platformRole(i.role)}</td>
                  <td className="px-3 py-2">{inviteStatus(i.status)}</td>
                  <td className="px-3 py-2">
                    {i.status === "pending" ? (
                      <Button size="sm" variant="ghost" onClick={() => revokeInvite(i.id)}>
                        {t("common.cancel")}
                      </Button>
                    ) : (
                      t("common.dash")
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "logins" && (
        <div className="sa-surface overflow-x-auto">
          <table className="sa-table w-full">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-start">{t("page.platformUsers.col.time")}</th>
                <th className="px-3 py-2 text-start">{t("page.platformUsers.col.user")}</th>
                <th className="px-3 py-2 text-start">IP</th>
                <th className="px-3 py-2 text-start">{t("page.platformUsers.col.result")}</th>
                <th className="px-3 py-2 text-start">{t("page.platformUsers.col.detail")}</th>
              </tr>
            </thead>
            <tbody>
              {loginHistory.map((l) => (
                <tr key={l.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 text-xs">
                    {l.at.replace("T", " ").slice(0, 16)}
                  </td>
                  <td className="px-3 py-2">{L(l.userName)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{l.ip}</td>
                  <td className="px-3 py-2">
                    <StatusPill
                      label={
                        l.success
                          ? t("page.platformUsers.loginSuccess")
                          : t("page.platformUsers.loginFail")
                      }
                      tone={l.success ? "success" : "danger"}
                    />
                  </td>
                  <td className="px-3 py-2 text-sm">{L(l.detail)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t("page.platformUsers.inviteModal")}>
        <div className="space-y-3">
          <Field label={t("common.name")}>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label={t("common.email")}>
            <Input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label={t("page.platformUsers.col.role")}>
            <SearchableSelect
              value={form.role}
              onChange={(v) => setForm({ ...form, role: v as PlatformRoleId })}
              options={platformRoleOptions()}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                invitePlatformUser(form);
                setOpen(false);
              }}
            >
              {t("page.platformUsers.sendInvite")}
            </Button>
          </div>
        </div>
      </Modal>
    </PageScaffold>
  );
}