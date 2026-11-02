import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageScaffold } from "../../components/sa/PageScaffold";
import { StatusPill } from "../../components/sa/StatusPill";
import { Button } from "../../components/ui/Button";
import { usePlatform } from "../../store/PlatformStore";
import { useAuth } from "../../store/AuthContext";
import { can } from "../../lib/platformRbac";
import type { LeadStatus } from "../../lib/platformDomain";

const COLUMNS: { id: LeadStatus; label: string }[] = [
  { id: "new", label: "جديد" },
  { id: "qualified", label: "مؤهل" },
  { id: "demo", label: "عرض" },
  { id: "proposal", label: "عرض سعر" },
  { id: "negotiation", label: "تفاوض" },
  { id: "won", label: "محوّل" },
  { id: "lost", label: "خسارة" },
];

export function LeadsPage() {
  const { leads, updateLeadStatus, convertLeadToOrganization, plans } =
    usePlatform();
  const { user } = useAuth();
  const writable = can(user?.role, "leads.write");
  const navigate = useNavigate();
  const [view, setView] = useState<"board" | "list">("board");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const byStatus = useMemo(() => {
    const map = new Map<LeadStatus, typeof leads>();
    for (const c of COLUMNS) map.set(c.id, []);
    for (const l of leads) map.get(l.status)?.push(l);
    return map;
  }, [leads]);

  return (
    <PageScaffold
      title="الفرص والمبيعات"
      subtitle="خط أنابيب المبيعات قبل التحويل لمنشأة"
      actions={
        <div className="flex rounded-md border border-slate-200 p-0.5 text-xs font-bold">
          <button
            type="button"
            className={`rounded px-2.5 py-1.5 ${view === "board" ? "bg-slate-900 text-white" : "text-slate-500"}`}
            onClick={() => setView("board")}
          >
            كانبان
          </button>
          <button
            type="button"
            className={`rounded px-2.5 py-1.5 ${view === "list" ? "bg-slate-900 text-white" : "text-slate-500"}`}
            onClick={() => setView("list")}
          >
            قائمة
          </button>
        </div>
      }
    >
      {msg ? <p className="text-sm font-semibold text-blue-700">{msg}</p> : null}

      {view === "board" ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              className="sa-surface w-64 shrink-0 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-slate-600">{col.label}</h3>
                <span className="text-[11px] text-slate-400">
                  {byStatus.get(col.id)?.length || 0}
                </span>
              </div>
              <div className="space-y-2">
                {(byStatus.get(col.id) || []).map((lead) => (
                  <div
                    key={lead.id}
                    className="rounded-md border border-slate-200 bg-slate-50 p-2.5"
                  >
                    <p className="text-sm font-bold text-slate-800">
                      {lead.companyName}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {lead.contactName} · {lead.phone}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {plans.find((p) => p.id === lead.interestedPlanId)?.name ||
                        "—"}
                    </p>
                    {writable ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {COLUMNS.filter((c) => c.id !== lead.status)
                          .slice(0, 3)
                          .map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200"
                              onClick={() => updateLeadStatus(lead.id, c.id)}
                            >
                              {c.label}
                            </button>
                          ))}
                        {lead.status !== "won" ? (
                          <Button
                            size="sm"
                            className="mt-1 w-full"
                            disabled={busy === lead.id}
                            onClick={async () => {
                              setBusy(lead.id);
                              const res = await convertLeadToOrganization(lead.id);
                              setBusy(null);
                              if (res.ok && res.orgId) {
                                setMsg("تم التحويل إلى منشأة.");
                                navigate(`/organizations/${res.orgId}`);
                              } else setMsg(res.reason || "تعذّر التحويل");
                            }}
                          >
                            تحويل لمنشأة
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="sa-surface overflow-x-auto">
          <table className="sa-table w-full min-w-[800px]">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-start">الشركة</th>
                <th className="px-3 py-2 text-start">التواصل</th>
                <th className="px-3 py-2 text-start">المصدر</th>
                <th className="px-3 py-2 text-start">الحالة</th>
                <th className="px-3 py-2 text-start">المسؤول</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-semibold">{l.companyName}</td>
                  <td className="px-3 py-2 text-sm">
                    {l.contactName}
                    <br />
                    <span className="text-xs text-slate-400">{l.email}</span>
                  </td>
                  <td className="px-3 py-2 text-sm">{l.source}</td>
                  <td className="px-3 py-2">
                    <StatusPill
                      label={COLUMNS.find((c) => c.id === l.status)?.label || l.status}
                      tone={l.status === "won" ? "success" : l.status === "lost" ? "danger" : "info"}
                    />
                  </td>
                  <td className="px-3 py-2 text-sm">{l.assigneeName || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageScaffold>
  );
}
