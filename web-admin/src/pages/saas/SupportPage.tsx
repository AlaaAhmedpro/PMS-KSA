import { useMemo, useState } from "react";
import { PageScaffold } from "../../components/sa/PageScaffold";
import { StatusPill } from "../../components/sa/StatusPill";
import { Button } from "../../components/ui/Button";
import { Textarea } from "../../components/ui/Input";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { usePlatform } from "../../store/PlatformStore";
import { useAuth } from "../../store/AuthContext";
import { can } from "../../lib/platformRbac";
import type { TicketStatus } from "../../lib/platformDomain";

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "مفتوحة",
  in_progress: "قيد المعالجة",
  pending_customer: "بانتظار العميل",
  escalated: "مصعّدة",
  resolved: "محلولة",
  closed: "مغلقة",
};

export function SupportPage() {
  const {
    tickets,
    organizations,
    updateTicketStatus,
    updateTicketPriority,
    assignTicket,
    replyTicket,
  } = usePlatform();
  const { user } = useAuth();
  const writable = can(user?.role, "support");
  const [status, setStatus] = useState("all");
  const [activeId, setActiveId] = useState<string | null>(tickets[0]?.id || null);
  const [reply, setReply] = useState("");

  const rows = useMemo(
    () => tickets.filter((t) => status === "all" || t.status === status),
    [tickets, status],
  );
  const active = tickets.find((t) => t.id === activeId) || rows[0];

  return (
    <PageScaffold
      title="دعم العملاء"
      subtitle="تذاكر الدعم عبر المنشآت"
      actions={
        <SearchableSelect
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "كل الحالات" },
            ...Object.entries(STATUS_LABEL).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
        />
      }
    >
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="sa-surface max-h-[70vh] overflow-y-auto divide-y divide-slate-100">
          {rows.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveId(t.id)}
              className={`block w-full px-3 py-3 text-start hover:bg-slate-50 ${
                active?.id === t.id ? "bg-blue-50" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-400">{t.number}</span>
                <StatusPill
                  label={STATUS_LABEL[t.status]}
                  tone={
                    t.status === "escalated"
                      ? "danger"
                      : t.status === "resolved"
                        ? "success"
                        : "info"
                  }
                />
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-800">{t.subject}</p>
              <p className="text-[11px] text-slate-400">
                {organizations.find((o) => o.id === t.organizationId)?.name}
              </p>
            </button>
          ))}
          {rows.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">لا تذاكر.</p>
          ) : null}
        </div>

        {active ? (
          <div className="sa-surface flex max-h-[70vh] flex-col p-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold">{active.subject}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {active.number} · {active.requesterName} · أولوية {active.priority}
              </p>
              {writable ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <SearchableSelect
                    value={active.status}
                    onChange={(v) =>
                      updateTicketStatus(active.id, v as TicketStatus)
                    }
                    options={Object.entries(STATUS_LABEL).map(([value, label]) => ({
                      value,
                      label,
                    }))}
                  />
                  <SearchableSelect
                    value={active.priority}
                    onChange={(v) =>
                      updateTicketPriority(
                        active.id,
                        v as "low" | "normal" | "high" | "critical",
                      )
                    }
                    options={[
                      { value: "low", label: "منخفضة" },
                      { value: "normal", label: "عادية" },
                      { value: "high", label: "عالية" },
                      { value: "critical", label: "حرجة" },
                    ]}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      assignTicket(active.id, user?.name || "وكيل الدعم")
                    }
                  >
                    تعيين لي
                  </Button>
                </div>
              ) : null}
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto py-3">
              {active.messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-md border px-3 py-2 text-sm ${
                    m.authorKind === "agent"
                      ? "border-blue-100 bg-blue-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <p className="text-[11px] font-bold text-slate-500">
                    {m.authorName} · {m.at.replace("T", " ").slice(0, 16)}
                  </p>
                  <p className="mt-1 text-slate-800">{m.text}</p>
                </div>
              ))}
            </div>
            {writable ? (
              <div className="border-t border-slate-100 pt-3">
                <Textarea
                  rows={3}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="رد الوكيل…"
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    onClick={() => {
                      replyTicket(active.id, reply);
                      setReply("");
                    }}
                  >
                    إرسال
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </PageScaffold>
  );
}
