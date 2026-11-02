import { useMemo, useState } from "react";
import { PageScaffold } from "../../components/sa/PageScaffold";
import { StatusPill } from "../../components/sa/StatusPill";
import { Input } from "../../components/ui/Input";
import { usePlatform } from "../../store/PlatformStore";

export function AuditPage() {
  const { auditEvents } = usePlatform();
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
      title="الأمن والتدقيق"
      subtitle="كل إجراء إداري حسّاس قابل للتتبع"
      actions={
        <Input
          className="w-64"
          placeholder="بحث في السجل…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      }
    >
      <div className="sa-surface overflow-x-auto">
        <table className="sa-table w-full min-w-[960px]">
          <thead>
            <tr className="border-b">
              <th className="px-3 py-2 text-start">الوقت</th>
              <th className="px-3 py-2 text-start">المنفّذ</th>
              <th className="px-3 py-2 text-start">الإجراء</th>
              <th className="px-3 py-2 text-start">الهدف</th>
              <th className="px-3 py-2 text-start">قبل</th>
              <th className="px-3 py-2 text-start">بعد</th>
              <th className="px-3 py-2 text-start">IP</th>
              <th className="px-3 py-2 text-start">النتيجة</th>
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
                <td className="px-3 py-2 text-xs text-slate-500">{e.before || "—"}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{e.after || "—"}</td>
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
                  لا سجلات مطابقة.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </PageScaffold>
  );
}
