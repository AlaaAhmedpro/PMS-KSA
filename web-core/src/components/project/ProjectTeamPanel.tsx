import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Field } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { SearchableSelect } from "../ui/SearchableSelect";
import { useHierarchy } from "../../store/HierarchyStore";
import { useAuth } from "../../store/AuthContext";
import { useCan } from "../../store/RbacContext";
import { useConfirm } from "../../store/ConfirmContext";
import type { Project } from "../../models/domain";

export function ProjectTeamPanel({ project }: { project: Project }) {
  const { addProjectMember, removeProjectMember } = useHierarchy();
  const { user, users } = useAuth();
  const can = useCan();
  const confirm = useConfirm();
  const canManage = can.manageRecords(user?.role);
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState("");
  const [error, setError] = useState("");

  const manager = users.find((u) => u.id === project.managerUserId);
  const members = useMemo(
    () =>
      project.memberUserIds
        .map((id) => users.find((u) => u.id === id))
        .filter(
          (u): u is NonNullable<typeof u> =>
            !!u && u.id !== project.managerUserId,
        ),
    [project.memberUserIds, project.managerUserId, users],
  );

  const available = users.filter(
    (u) =>
      u.organizationId === project.organizationId &&
      u.id !== project.managerUserId &&
      !project.memberUserIds.includes(u.id),
  );

  const colSpan = canManage ? 4 : 3;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-steel-500">
          مدير المشروع يُحدَّد عند إنشاء المشروع. الأعضاء يُضافون هنا.
        </p>
        {canManage ? (
          <Button
            size="sm"
            onClick={() => {
              setPick("");
              setError("");
              setOpen(true);
            }}
          >
            إضافة عضو
          </Button>
        ) : null}
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full min-w-[640px] table-fixed text-sm">
          <colgroup>
            <col className="w-[32%]" />
            <col className="w-[34%]" />
            <col className="w-[22%]" />
            {canManage ? <col className="w-[12%]" /> : null}
          </colgroup>
          <thead>
            <tr className="border-b border-steel-200 bg-steel-50 text-start dark:border-steel-700 dark:bg-steel-800/60">
              <th className="px-4 py-3 text-start font-bold">الاسم</th>
              <th className="px-4 py-3 text-start font-bold">البريد</th>
              <th className="px-4 py-3 text-start font-bold">الدور في المشروع</th>
              {canManage ? (
                <th className="px-4 py-3 text-start font-bold"> </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {!manager && members.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-8 text-center text-sm text-steel-500"
                >
                  لا أعضاء في فريق المشروع.
                </td>
              </tr>
            ) : null}
            {manager ? (
              <tr className="border-b border-steel-100 dark:border-steel-800">
                <td className="px-4 py-3 align-middle">
                  <p className="truncate font-semibold text-steel-800 dark:text-steel-100">
                    {manager.name}
                  </p>
                </td>
                <td className="px-4 py-3 align-middle">
                  <span className="block truncate text-steel-600 dark:text-steel-300">
                    {manager.email}
                  </span>
                </td>
                <td className="px-4 py-3 align-middle">
                  <span className="inline-flex rounded border border-brand-200 bg-brand-500/10 px-1.5 py-0.5 text-[11px] font-bold text-brand-700 dark:border-brand-800 dark:text-brand-300">
                    مدير المشروع
                  </span>
                </td>
                {canManage ? (
                  <td className="whitespace-nowrap px-3 py-3 align-middle">
                    <span className="inline-block h-8 w-8" aria-hidden />
                  </td>
                ) : null}
              </tr>
            ) : null}
            {members.map((m) => (
              <tr
                key={m.id}
                className="border-b border-steel-100 dark:border-steel-800"
              >
                <td className="px-4 py-3 align-middle">
                  <p className="truncate font-semibold text-steel-800 dark:text-steel-100">
                    {m.name}
                  </p>
                </td>
                <td className="px-4 py-3 align-middle">
                  <span className="block truncate text-steel-600 dark:text-steel-300">
                    {m.email}
                  </span>
                </td>
                <td className="px-4 py-3 align-middle">
                  <span className="inline-flex rounded border border-steel-200 bg-steel-50 px-1.5 py-0.5 text-[11px] font-bold text-steel-600 dark:border-steel-700 dark:bg-steel-800/60 dark:text-steel-300">
                    عضو
                  </span>
                </td>
                {canManage ? (
                  <td className="whitespace-nowrap px-3 py-3 align-middle">
                    <div className="inline-flex flex-nowrap items-center gap-1">
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-steel-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                        aria-label="إزالة العضو"
                        title="إزالة"
                        onClick={async () => {
                          const ok = await confirm({
                            title: "تأكيد الإزالة",
                            message: `إزالة ${m.name} من فريق المشروع؟`,
                            danger: true,
                            confirmLabel: "إزالة",
                          });
                          if (ok) removeProjectMember(project.id, m.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="إضافة عضو للمشروع"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (!pick) {
                  setError("اختر عضواً.");
                  return;
                }
                addProjectMember(project.id, pick);
                setOpen(false);
              }}
            >
              إضافة
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="العضو" required>
            <SearchableSelect
              value={pick}
              onChange={(v) => {
                setPick(v);
                setError("");
              }}
              placeholder="اختر من مستخدمي المنشأة"
              options={available.map((u) => ({
                value: u.id,
                label: `${u.name} · ${u.email}`,
              }))}
            />
          </Field>
          {available.length === 0 ? (
            <p className="text-xs text-steel-400">
              لا مستخدمين متاحين للإضافة.
            </p>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </Modal>
    </div>
  );
}
