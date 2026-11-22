import { useMemo, useState } from "react";
import { PageScaffold } from "../../components/sa/PageScaffold";
import { StatusPill } from "../../components/sa/StatusPill";
import { Input } from "../../components/ui/Input";
import { usePlatform } from "../../store/PlatformStore";
import { useLocale } from "../../store/LocaleContext";

export function AuditPage() {
  const { auditEvents } = usePlatform();
  const { t } = useLocale();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim();
    if (!needle) return auditEvents;
    return auditEvents.filter((e) =>
      `${e.action} ${e.actorName} ${e.targetType} ${e.targetId}`.includes(needle),
    );
  }, [auditEvents, q]);

  return (
    <PageScaffold
      title={t("page.audit.title")}
      subtitle={t("page.audit.subtitle")}
      actions={
        <Input
          className="w-64"
          placeholder={t("page.audit.search")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      }
    >
      <div className="sa-surface overflow-x-auto">
        <table className="sa-table w-full min-w-[960px]">
          <thead>
            <tr className="border-b">
              <th className="px-3 py-2 text-start">{t("page.audit.col.time")}</th>
              <th className="px-3 py-2 text-start">{t("page.audit.col.actor")}</th>
              <th className="px-3 py-2 text-start">{t("page.audit.col.action")}</th>
              <th className="px-3 py-2 text-start">{t("page.audit.col.target")}</th>
              <th className="px-3 py-2 text-start">{t("page.audit.col.before")}</th>
              <th className="px-3 py-2 text-start">{t("page.audit.col.after")}</th>
              <th className="px-3 py-2 text-start">IP</th>
              <th className="px-3 py-2 text-start">{t("common.status")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className="border-b border-slate-100">
                <td className="px-3 py-2 text-xs whitespace-nowrap">
                  {e.at.replace("T", " ").slice(0, 16)}
                </td>
                <td className="px-3 py-2 text-sm">{e.actorName}</td>
                <td className="px-3 py-2 font-semibold text-sm">{e.action}</td>
                <td className="px-3 py-2 text-xs">
                  {e.targetType}/{e.targetId}
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">{e.before || t("common.dash")}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{e.after || t("common.dash")}</td>
                <td className="px-3 py-2 font-mono text-xs">{e.ip}</td>
                <td className="px-3 py-2">
                  <StatusPill
                    label={e.result}
                    tone={
                      e.result === "success"
                        ? "success"
                        : e.result === "denied"
                          ? "warning"
                          : "danger"
                    }
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-400">
                  {t("page.audit.empty")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </PageScaffold>
  );
}