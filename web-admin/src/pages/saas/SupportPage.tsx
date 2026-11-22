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
import { useLocale } from "../../store/LocaleContext";
import { usePlatformLabels } from "../../lib/platformI18n";

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
  const { t, L } = useLocale();
  const { ticketStatus, ticketStatusOptions, ticketPriority, ticketPriorityOptions } =
    usePlatformLabels();
  const writable = can(user?.role, "support");
  const [status, setStatus] = useState("all");
  const [activeId, setActiveId] = useState<string | null>(tickets[0]?.id || null);
  const [reply, setReply] = useState("");

  const rows = useMemo(
    () => tickets.filter((tkt) => status === "all" || tkt.status === status),
    [tickets, status],
  );
  const active = tickets.find((tkt) => tkt.id === activeId) || rows[0];

  const priorityOptions =
    ticketPriorityOptions?.() ??
    (["low", "normal", "high", "critical"] as const).map((p) => ({
      value: p,
      label: ticketPriority(p),
    }));

  return (
    <PageScaffold
      title={t("page.support.title")}
      subtitle={t("page.support.subtitle")}
      actions={
        <SearchableSelect
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: t("page.subs.allStatuses") },
            ...ticketStatusOptions(),
          ]}
        />
      }
    >
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="sa-surface max-h-[70vh] overflow-y-auto divide-y divide-slate-100">
          {rows.map((tkt) => (
            <button
              key={tkt.id}
              type="button"
              onClick={() => setActiveId(tkt.id)}
              className={`block w-full px-3 py-3 text-start hover:bg-slate-50 ${
                active?.id === tkt.id ? "bg-blue-50" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-400">{tkt.number}</span>
                <StatusPill
                  label={ticketStatus(tkt.status)}
                  tone={
                    tkt.status === "escalated"
                      ? "danger"
                      : tkt.status === "resolved"
                        ? "success"
                        : "info"
                  }
                />
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-800">{tkt.subject}</p>
              <p className="text-[11px] text-slate-400">
                {organizations.find((o) => o.id === tkt.organizationId)?.name}
              </p>
            </button>
          ))}
          {rows.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">{t("page.support.empty")}</p>
          ) : null}
        </div>

        {active ? (
          <div className="sa-surface flex max-h-[70vh] flex-col p-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold">{active.subject}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {active.number} · {active.requesterName} ·{" "}
                {t("page.support.priority", { p: ticketPriority(active.priority) })}
              </p>
              {writable ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <SearchableSelect
                    value={active.status}
                    onChange={(v) =>
                      updateTicketStatus(active.id, v as TicketStatus)
                    }
                    options={ticketStatusOptions()}
                  />
                  <SearchableSelect
                    value={active.priority}
                    onChange={(v) =>
                      updateTicketPriority(
                        active.id,
                        v as "low" | "normal" | "high" | "critical",
                      )
                    }
                    options={priorityOptions}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      assignTicket(active.id, user?.name || t("domain.platformRole.support_agent"))
                    }
                  >
                    {t("page.support.assignMe")}
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
                    {L(m.authorName)} · {m.at.replace("T", " ").slice(0, 16)}
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
                  placeholder={t("page.support.agentReply")}
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    onClick={() => {
                      replyTicket(active.id, reply);
                      setReply("");
                    }}
                  >
                    {t("page.support.send")}
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