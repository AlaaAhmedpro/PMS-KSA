import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input, Textarea } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { useHierarchy } from "../store/HierarchyStore";
import { useAuth } from "../store/AuthContext";
import { useCan } from "../store/RbacContext";
import { useConfirm } from "../store/ConfirmContext";
import { useLocale } from "../store/LocaleContext";
import { projectsForProgram } from "../lib/hierarchyLinks";
import type { Program } from "../models/domain";

export function ProgramsPage() {
  const { t } = useLocale();
  const {
    programs,
    portfolios,
    initiatives,
    projects,
    addProgram,
    updateProgram,
    removeProgram,
  } = useHierarchy();
  const { user, organization, users } = useAuth();
  const can = useCan();
  const canManage = can.manageProgram(user?.role);
  const confirm = useConfirm();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [projectsFor, setProjectsFor] = useState<Program | null>(null);
  const [initiativeView, setInitiativeView] = useState<{
    programName: string;
    text: string;
  } | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [initiativeId, setInitiativeId] = useState("");
  const [managerUserId, setManagerUserId] = useState(user?.id ?? "");
  const [error, setError] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return programs.filter((prg) => {
      if (!q) return true;
      const initiativeName =
        initiatives.find((i) => i.id === prg.initiativeId)?.name ?? "";
      const portfolioName =
        portfolios.find((p) => p.id === prg.portfolioId)?.name ?? "";
      const managerName =
        users.find((u) => u.id === prg.managerUserId)?.name ?? "";
      return (
        prg.name.toLowerCase().includes(q) ||
        prg.description.toLowerCase().includes(q) ||
        initiativeName.toLowerCase().includes(q) ||
        portfolioName.toLowerCase().includes(q) ||
        managerName.toLowerCase().includes(q)
      );
    });
  }, [programs, initiatives, portfolios, users, query]);

  const projectsModalList = projectsFor
    ? projectsForProgram(projects, projectsFor.id)
    : [];

  const selectedInitiative = initiatives.find((i) => i.id === initiativeId);
  const derivedPortfolio = selectedInitiative?.portfolioId
    ? portfolios.find((p) => p.id === selectedInitiative.portfolioId)
    : undefined;

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setInitiativeId("");
    setManagerUserId(user?.id ?? "");
    setError("");
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (prg: Program) => {
    setEditingId(prg.id);
    setName(prg.name);
    setDescription(prg.description);
    setInitiativeId(prg.initiativeId ?? "");
    setManagerUserId(prg.managerUserId || user?.id || "");
    setError("");
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  const save = () => {
    if (!name.trim() || !initiativeId || !managerUserId) {
      setError(t("programs.error.required"));
      return;
    }
    const initiative = initiatives.find((i) => i.id === initiativeId);
    if (!initiative?.portfolioId) {
      setError(t("programs.error.initiativeNoPortfolio"));
      return;
    }
    const payload = {
      name: name.trim(),
      description: description.trim(),
      initiativeId,
      portfolioId: initiative.portfolioId,
      managerUserId,
    };
    if (editingId) {
      updateProgram(editingId, payload);
    } else {
      addProgram({
        organizationId: organization?.id || "org-namaa",
        ...payload,
      });
    }
    closeModal();
  };

  const onDelete = async (prg: Program) => {
    const kids = projectsForProgram(projects, prg.id);
    const msg =
      kids.length > 0
        ? t("programs.delete.withProjects", { name: prg.name })
        : t("programs.delete.plain", { name: prg.name });
    const ok = await confirm({
      title: t("common.confirmDeleteTitle"),
      message: msg,
      danger: true,
      confirmLabel: t("common.delete"),
    });
    if (!ok) return;
    removeProgram(prg.id);
  };

  const colSpan = canManage ? 6 : 5;

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("programs.title")}
        subtitle={t("programs.subtitle")}
        actions={
          canManage ? (
            <Button onClick={openCreate}>{t("programs.add")}</Button>
          ) : null
        }
      />

      <Input
        placeholder={t("programs.searchPlaceholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={t("programs.searchAria")}
      />

      <Card className="overflow-hidden p-0">
        <table className="w-full min-w-[860px] table-fixed text-sm">
          <colgroup>
            <col className="w-[26%]" />
            <col className="w-[22%]" />
            <col className="w-[16%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            {canManage ? <col className="w-[12%]" /> : null}
          </colgroup>
          <thead>
            <tr className="border-b border-steel-200 bg-steel-50 text-start dark:border-steel-700 dark:bg-steel-800/60">
              <th className="px-4 py-3 text-start font-bold">{t("programs.col.program")}</th>
              <th className="px-4 py-3 text-start font-bold">{t("programs.col.initiative")}</th>
              <th className="px-4 py-3 text-start font-bold">{t("programs.col.portfolio")}</th>
              <th className="px-4 py-3 text-start font-bold">{t("programs.col.projects")}</th>
              <th className="px-4 py-3 text-start font-bold">{t("programs.col.manager")}</th>
              {canManage ? (
                <th className="px-4 py-3 text-start font-bold"> </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {programs.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-8 text-center text-sm text-steel-500"
                >
                  {t("programs.empty")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-8 text-center text-sm text-steel-500"
                >
                  {t("common.searchNoResults")}
                </td>
              </tr>
            ) : (
              rows.map((prg) => {
                const initiative = initiatives.find(
                  (i) => i.id === prg.initiativeId,
                );
                const portfolio = portfolios.find(
                  (p) => p.id === prg.portfolioId,
                );
                const kids = projectsForProgram(projects, prg.id);
                const manager =
                  users.find((u) => u.id === prg.managerUserId)?.name ?? "—";
                return (
                  <tr
                    key={prg.id}
                    className="border-b border-steel-100 dark:border-steel-800"
                  >
                    <td className="px-4 py-3 align-middle">
                      <p className="truncate font-semibold text-steel-800 dark:text-steel-100">
                        {prg.name}
                      </p>
                      {prg.description ? (
                        <p className="mt-0.5 truncate text-[11px] text-steel-400">
                          {prg.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {initiative ? (
                        <button
                          type="button"
                          onClick={() =>
                            setInitiativeView({
                              programName: prg.name,
                              text: initiative.name,
                            })
                          }
                          title={initiative.name}
                          className="block w-full truncate text-start text-sm font-semibold text-brand-700 hover:underline"
                        >
                          {initiative.name}
                        </button>
                      ) : (
                        <span className="text-steel-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {portfolio ? (
                        <Link
                          to={`/portfolios/${portfolio.id}`}
                          className="block truncate font-semibold text-brand-700 hover:underline"
                          title={portfolio.name}
                        >
                          {portfolio.name}
                        </Link>
                      ) : (
                        <span className="text-steel-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {kids.length === 0 ? (
                        <span className="text-[12px] text-steel-400">—</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setProjectsFor(prg)}
                          className="inline-flex items-center rounded border border-steel-200 bg-steel-50 px-2 py-0.5 text-[11px] font-bold text-steel-700 hover:border-brand-300 hover:bg-brand-500/5 hover:text-brand-700 dark:border-steel-700 dark:bg-steel-800/60 dark:text-steel-200"
                        >
                          {t("programs.projectCount", { n: kids.length })}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="block truncate text-steel-700 dark:text-steel-200">
                        {manager}
                      </span>
                    </td>
                    {canManage ? (
                      <td className="whitespace-nowrap px-3 py-3 align-middle">
                        <div className="inline-flex flex-nowrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(prg)}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-steel-400 transition-colors hover:bg-brand-500/10 hover:text-brand-600"
                            title={t("common.edit")}
                            aria-label={t("common.edit")}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(prg)}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-steel-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
                            title={t("common.delete")}
                            aria-label={t("common.delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>

      <Modal
        open={open}
        onClose={closeModal}
        title={editingId ? t("programs.modal.edit") : t("programs.modal.add")}
        subtitle={editingId ? undefined : t("programs.modal.addSub")}
        footer={
          <>
            <Button variant="outline" onClick={closeModal}>
              {t("common.cancel")}
            </Button>
            <Button onClick={save}>{t("common.save")}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t("programs.field.name")} required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={t("common.description")} hint={t("common.fieldHintOneSentence")}>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field label={t("programs.field.initiative")} required>
            <SearchableSelect
              value={initiativeId}
              onChange={setInitiativeId}
              placeholder={t("programs.field.chooseInitiative")}
              options={initiatives.map((i) => ({
                value: i.id,
                label: i.name,
              }))}
            />
          </Field>
          {derivedPortfolio ? (
            <p className="text-[11px] text-steel-400">
              {t("common.underPortfolio", { name: derivedPortfolio.name })}
            </p>
          ) : null}
          <Field label={t("programs.field.manager")} required>
            <SearchableSelect
              value={managerUserId}
              onChange={setManagerUserId}
              placeholder={t("common.chooseManager")}
              options={users.map((u) => ({ value: u.id, label: u.name }))}
            />
          </Field>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </Modal>

      <Modal
        open={!!initiativeView}
        onClose={() => setInitiativeView(null)}
        title={
          initiativeView
            ? t("programs.initiativeModal.title", { name: initiativeView.programName })
            : t("programs.initiativeModal.titleFallback")
        }
        size="sm"
        footer={
          <Button variant="outline" onClick={() => setInitiativeView(null)}>
            {t("common.close")}
          </Button>
        }
      >
        <Field label={t("programs.initiativeModal.field")}>
          <Textarea value={initiativeView?.text ?? ""} readOnly rows={3} />
        </Field>
      </Modal>

      <Modal
        open={!!projectsFor}
        onClose={() => setProjectsFor(null)}
        title={
          projectsFor
            ? t("programs.projectsModal.title", { name: projectsFor.name })
            : t("programs.projectsModal.titleFallback")
        }
        footer={
          <Button variant="outline" onClick={() => setProjectsFor(null)}>
            {t("common.close")}
          </Button>
        }
      >
        {projectsModalList.length === 0 ? (
          <p className="text-sm text-steel-500">{t("programs.projectsModal.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {projectsModalList.map((p) => {
              const manager =
                users.find((u) => u.id === p.managerUserId)?.name ?? "—";
              return (
                <li
                  key={p.id}
                  className="rounded-lg border border-steel-200 px-3 py-2.5 dark:border-steel-700"
                >
                  <Link
                    to={`/projects/${p.id}`}
                    className="font-semibold text-brand-700 hover:underline"
                    onClick={() => setProjectsFor(null)}
                  >
                    {p.name}
                  </Link>
                  <p className="mt-1 text-[11px] text-steel-400">
                    {t("common.managerLabel", { name: manager })}
                    <span className="mx-1.5 text-steel-300">·</span>
                    {t("common.progressLabel", { n: p.progress })}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </div>
  );
}
