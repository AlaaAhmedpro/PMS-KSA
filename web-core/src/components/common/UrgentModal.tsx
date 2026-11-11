import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, Send, CheckCircle2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, Input, Textarea } from "../ui/Input";
import { useAuth } from "../../store/AuthContext";
import { useData } from "../../store/DataStore";
import { useNotifications } from "../../store/NotificationStore";
import {
  assigneeEmail,
  buildUrgentNotification,
  sendDemoUrgentEmail,
} from "../../lib/notifications";
import type { RecordItem } from "../../lib/types";
import { useLocale } from "../../store/LocaleContext";

export function UrgentModal({
  record,
  open,
  onClose,
  onSent,
}: {
  record: RecordItem | null;
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
}) {
  const { t } = useLocale();
  const { users, user } = useAuth();
  const { updateRecord, entities } = useData();
  const { addNotification } = useNotifications();
  const [sent, setSent] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastInfo, setToastInfo] = useState<{
    assignee: string;
    regNumber: string;
  } | null>(null);
  const [message, setMessage] = useState(() => t("urgent.defaultMessage"));
  const [email, setEmail] = useState("");

  const entity = entities.find((e) => e.id === record?.entityId);
  const noun =
    record?.kind === "task"
      ? t("record.kind.task")
      : t("record.kind.project");

  useEffect(() => {
    if (!open || !record) return;
    setSent(false);
    setShowSuccessToast(false);
    setToastInfo(null);
    setMessage(t("urgent.defaultMessage"));
    setEmail(assigneeEmail(users, record.assignee));
  }, [open, record?.id, users, t]);

  const handleClose = () => {
    if (sent) return;
    onClose();
  };

  const handleSend = () => {
    if (!record || !email.trim()) return;

    const mailSubject = t("urgent.mailSubject", {
      noun,
      reg: record.regNumber,
      subject: record.subject,
    });
    const mailBody = [
      t("urgent.mailGreeting", { name: record.assignee }),
      "",
      message.trim(),
      "",
      `— ${noun}: ${record.subject}`,
      t("urgent.mailReg", { reg: record.regNumber }),
      record.outNumber
        ? t("urgent.mailOut", { out: record.outNumber })
        : "",
      entity?.name ? t("urgent.mailEntity", { name: entity.name }) : "",
      "",
      user?.name ? t("urgent.mailFrom", { name: user.name }) : "",
    ]
      .filter(Boolean)
      .join("\n");

    const notification = buildUrgentNotification(users, {
      assigneeName: record.assignee,
      recordId: record.id,
      kind: record.kind,
      subject: record.subject,
      regNumber: record.regNumber,
      message: message.trim(),
      sentBy: user?.name,
    });
    if (notification) addNotification(notification);

    sendDemoUrgentEmail({
      to: email.trim(),
      subject: mailSubject,
      body: mailBody,
      recordId: record.id,
      recordKind: record.kind,
      sentBy: user?.name,
    });

    updateRecord(record.id, (r) => ({
      log: [
        ...r.log,
        {
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
          actor: user?.name || t("urgent.logActor"),
          text: t("urgent.logText", {
            assignee: record.assignee,
            email: email.trim(),
          }),
        },
      ],
    }));

    setSent(true);
    setTimeout(() => {
      setToastInfo({
        assignee: record.assignee,
        regNumber: record.regNumber,
      });
      setSent(false);
      setShowSuccessToast(true);
      onSent?.();
      onClose();
      setTimeout(() => {
        setShowSuccessToast(false);
        setToastInfo(null);
      }, 4500);
    }, 2800);
  };

  return (
    <>
    <Modal
      open={open}
      onClose={handleClose}
      title={
        <span className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-red-500" />
          {t("urgent.title")}
        </span>
      }
      footer={
        !sent && (
          <>
            <Button variant="ghost" onClick={handleClose}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={handleSend}
              disabled={!email.trim() || !message.trim() || !record?.assignee}
            >
              <Send className="h-4 w-4" />
              {t("urgent.send")}
            </Button>
          </>
        )
      }
    >
      {sent ? (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-500/10">
            <CheckCircle2 className="h-12 w-12 text-brand-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-steel-800 dark:text-steel-100">
              {t("urgent.success")}
            </p>
            <p className="mt-2 text-sm text-steel-500 dark:text-steel-400">
              {t("urgent.notifyInApp", { name: record?.assignee ?? "" })}
            </p>
            <p className="mt-1 text-sm text-steel-500 dark:text-steel-400">
              {t("urgent.emailSentTo")}{" "}
              <span className="font-semibold text-brand-600 dark:text-brand-400">
                {email}
              </span>
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl bg-steel-50 p-4 text-sm dark:bg-steel-800/60">
            <div className="grid grid-cols-2 gap-2">
              <Info label={t("urgent.regNumber")} value={record?.regNumber} />
              <Info label={t("urgent.assignee")} value={record?.assignee} />
              <Info label={t("urgent.entity")} value={entity?.name} />
              <Info label={t("urgent.subject")} value={record?.subject} />
            </div>
          </div>

          <Field
            label={t("urgent.emailField")}
            required
            hint={
              email ? t("urgent.emailHintFound") : t("urgent.emailHintMissing")
            }
          >
            <Input
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@namaa.sa"
            />
          </Field>

          <Field label={t("urgent.messageField")}>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Field>

          <p className="text-xs text-steel-400">
            * {t("urgent.demoNote")}
          </p>
        </div>
      )}
    </Modal>

    <AnimatePresence>
      {showSuccessToast && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          className="fixed bottom-6 left-1/2 z-[70] flex w-[min(92vw,420px)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-brand-500/30 bg-white px-5 py-4 shadow-lg dark:border-brand-500/40 dark:bg-steel-900"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500/10">
            <CheckCircle2 className="h-6 w-6 text-brand-500" />
          </div>
          <div className="min-w-0 text-right">
            <p className="font-bold text-steel-800 dark:text-steel-100">
              {t("urgent.success")}
            </p>
            <p className="mt-0.5 truncate text-xs text-steel-500 dark:text-steel-400">
              {toastInfo?.assignee} — {toastInfo?.regNumber}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  const { t } = useLocale();
  return (
    <div>
      <p className="text-xs text-steel-400">{label}</p>
      <p className="font-semibold text-steel-700 dark:text-steel-200">
        {value || t("common.emDash")}
      </p>
    </div>
  );
}
