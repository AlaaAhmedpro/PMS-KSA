import { useMemo, useState, type ReactNode } from "react";
import { useLocale } from "../store/LocaleContext";
import type { Locale } from "../i18n/messages";
import {
  CreditCard,
  RefreshCw,
  ArrowUpRight,
  Wallet,
  FileText,
  Settings2,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  Ban,
  ChevronLeft,
  Plus,
  MoreHorizontal,
  Building2,
  Smartphone,
  Upload,
} from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input, Textarea } from "../components/ui/Input";
import { useAuth } from "../store/AuthContext";
import { cn } from "../lib/cn";
import {
  findTenantForCoreOrg,
  formatSar,
  loadBillingPrefs,
  loadInvoicesForTenant,
  loadPlans,
  loadSubscriptionForTenant,
  loadUpgradeRequests,
  saveBillingPrefs,
  setSubscriptionAutoRenewNote,
  submitUpgradeRequest,
  cancelUpgradeRequest,
  updateInvoiceStatus,
  type BillingPrefs,
  type BillingPlan,
  type SavedPaymentCard,
} from "../lib/billingBridge";

type TabId =
  | "overview"
  | "invoices"
  | "payment"
  | "autorenew"
  | "upgrade"
  | "settings";

type TFn = (key: string, vars?: Record<string, string | number>) => string;

function billingTabs(t: TFn) {
  return [
    { id: "overview" as const, label: t("billing.k019"), hint: t("billing.k029"), icon: Wallet },
    { id: "invoices" as const, label: t("billing.k043"), hint: t("billing.k040"), icon: FileText },
    { id: "payment" as const, label: t("billing.k138"), hint: t("billing.k032"), icon: CreditCard },
    { id: "autorenew" as const, label: t("billing.k033"), hint: t("billing.k075"), icon: RefreshCw },
    { id: "upgrade" as const, label: t("billing.k073"), hint: t("billing.k069"), icon: ArrowUpRight },
    { id: "settings" as const, label: t("billing.k059"), hint: t("billing.k030"), icon: Settings2 },
  ];
}

function invoiceStatusLabel(t: TFn, status: string): string {
  const key = `billing.invoiceStatus.${status}`;
  const v = t(key);
  return v === key ? status : v;
}

function subStatusLabel(t: TFn, status: string): string {
  const key = `billing.subStatus.${status}`;
  const v = t(key);
  return v === key ? status : v;
}

function invoiceListCaption(
  t: TFn,
  inv: { status: string; dueDate?: string; paidAt?: string },
  locale: Locale,
  dueDays: number | null,
  needsPay: boolean,
  overdue: boolean,
): string {
  if (needsPay) {
    if (overdue) {
      return t("billing.k273", {
        date: formatBillingDate(inv.dueDate, locale),
      });
    }
    if (dueDays === 0) return t("billing.k005");
    if (dueDays !== null && dueDays <= 7) {
      return t("billing.k274", {
        days: dueDays,
        date: formatBillingDate(inv.dueDate, locale),
      });
    }
    return t("billing.k275", {
      date: formatBillingDate(inv.dueDate, locale),
    });
  }
  if (inv.status === "paid") {
    const paidOn = inv.paidAt
      ? t("billing.k277", {
          date: formatBillingDate(inv.paidAt, locale),
        })
      : "";
    return `${t("billing.k276")}${paidOn}.`;
  }
  return t("billing.k278", {
    status: invoiceStatusLabel(t, inv.status),
  });
}

function usagePct(used: number, max: number): number {
  if (!max) return 0;
  return Math.min(100, Math.round((used / max) * 100));
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.ceil((ts - Date.now()) / 86400000);
}

function formatBillingDate(iso: string | undefined, locale: Locale): string {
  if (!iso) return "—";
  const d = new Date(iso.slice(0, 10));
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const tag = locale === "ar" ? "ar-SA-u-nu-latn" : "en-GB-u-nu-latn";
  try {
    return d.toLocaleDateString(tag, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function statusTone(
  t: TFn,
  status: string,
): {
  banner: string;
  pill: string;
  icon: typeof CheckCircle2;
  title: string;
  body: string;
} {
  switch (status) {
    case "trial":
      return {
        banner:
          "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100",
        pill: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200",
        icon: Clock3,
        title: t("billing.k050"),
        body: t("billing.k141"),
      };
    case "past_due":
      return {
        banner:
          "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100",
        pill: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100",
        icon: AlertTriangle,
        title: t("billing.k143"),
        body: t("billing.k013"),
      };
    case "expired":
    case "cancelled":
      return {
        banner:
          "border-red-200 bg-red-50 text-red-950 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100",
        pill: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200",
        icon: Ban,
        title: status === "cancelled" ? t("billing.k026") : t("billing.k027"),
        body: t("billing.k090"),
      };
    case "suspended":
      return {
        banner:
          "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100",
        pill: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100",
        icon: Ban,
        title: t("billing.k048"),
        body: t("billing.k108"),
      };
    default:
      return {
        banner:
          "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100",
        pill: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
        icon: CheckCircle2,
        title: t("billing.k018"),
        body: t("billing.k121"),
      };
  }
}

export function OrganizationBillingPage() {
  const { t, L, locale } = useLocale();
  const tabs = useMemo(() => billingTabs(t), [t]);
  const { organization, user } = useAuth();
  const coreOrgId = organization?.id || "org-namaa";
  const [tab, setTab] = useState<TabId>("overview");
  const [tick, setTick] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [invoiceFilter, setInvoiceFilter] = useState<
    "needs_action" | "paid" | "all"
  >("needs_action");
  const [cardEditor, setCardEditor] = useState<
    null | { mode: "add" | "replace" | "edit"; cardId?: string }
  >(null);
  const [cardMenuId, setCardMenuId] = useState<string | null>(null);
  const [activatePrompt, setActivatePrompt] = useState<
    null | "apple_pay" | "stc_pay" | "fawry"
  >(null);
  const [accountDetailsOpen, setAccountDetailsOpen] = useState(false);
  const [comparePlanId, setComparePlanId] = useState<string | null>(null);
  const [confirmPlan, setConfirmPlan] = useState<BillingPlan | null>(null);
  const [applyAtRenewal, setApplyAtRenewal] = useState(false);
  const [prefs, setPrefs] = useState<BillingPrefs>(() =>
    loadBillingPrefs(coreOrgId, user?.email),
  );
  const [cardForm, setCardForm] = useState({
    pan: "",
    expiry: "",
    cvv: "",
    brand: "Visa" as string,
    holderName: "",
  });

  const refresh = () => setTick((n) => n + 1);

  const tenant = useMemo(
    () => findTenantForCoreOrg(coreOrgId, organization?.name),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [coreOrgId, organization?.name, tick],
  );
  const plans = useMemo(() => loadPlans(), [tick]);
  const plan = plans.find((p) => p.id === tenant.planId) || plans[0];
  const subscription = useMemo(
    () => loadSubscriptionForTenant(tenant.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tenant.id, tick],
  );
  const invoices = useMemo(
    () => loadInvoicesForTenant(tenant.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tenant.id, tick],
  );
  const upgradeRequests = useMemo(
    () => loadUpgradeRequests(coreOrgId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [coreOrgId, tick],
  );

  const limits = plan?.limits;
  const usage = tenant.usage || {
    users: 0,
    projects: 0,
    storageGb: 0,
    apiRequests: 0,
  };

  const subStatus =
    subscription?.status ||
    (tenant.status === "suspended" ? "suspended" : "active");
  const tone = statusTone(t, subStatus);
  const StatusIcon = tone.icon;
  const renewIso = subscription?.renewAt || tenant.renewalAt || tenant.trialEndsAt;
  const renewDays = daysUntil(renewIso);
  const openInvoices = invoices.filter(
    (i) => i.status === "open" || i.status === "failed",
  );
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const dueTotalSar = openInvoices.reduce((a, i) => a + i.totalSar, 0);
  const paidTotalSar = paidInvoices.reduce((a, i) => a + i.totalSar, 0);
  const filteredInvoices = invoices.filter((i) => {
    if (invoiceFilter === "needs_action")
      return i.status === "open" || i.status === "failed";
    if (invoiceFilter === "paid") return i.status === "paid";
    return true;
  });
  const nearLimit =
    usagePct(usage.users, limits?.maxUsers || tenant.seats) >= 85 ||
    usagePct(usage.projects, limits?.maxProjects || 100) >= 85 ||
    usagePct(usage.storageGb, limits?.maxStorageGb || 100) >= 85;

  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 3200);
  };

  const persistPrefs = (next: BillingPrefs) => {
    setPrefs(next);
    saveBillingPrefs(coreOrgId, next);
  };

  const payInvoice = (invoiceId: string) => {
    const ok = updateInvoiceStatus(invoiceId, "paid");
    flash(
      ok
        ? t("billing.k078")
        : t("billing.k070"),
    );
    refresh();
  };

  const payAllOpen = () => {
    if (openInvoices.length === 0) {
      flash(t("billing.k118"));
      return;
    }
    let okCount = 0;
    for (const inv of openInvoices) {
      if (updateInvoiceStatus(inv.id, "paid")) okCount += 1;
    }
    flash(
      okCount > 0
        ? t("billing.tpl.paidCount", { count: okCount })
        : t("billing.k071"),
    );
    refresh();
  };

  const toggleAutoRenew = () => {
    const next = { ...prefs, autoRenew: !prefs.autoRenew };
    persistPrefs(next);
    setSubscriptionAutoRenewNote(tenant.id, next.autoRenew);
    flash(
      next.autoRenew
        ? t("billing.k080")
        : t("billing.k076"),
    );
    refresh();
  };

  const cards = prefs.cards || [];
  const defaultCard =
    cards.find((c) => c.id === prefs.defaultCardId) || cards[0] || null;
  const otherCards = cards.filter((c) => c.id !== defaultCard?.id);

  const daysToCardExpiry = (c: SavedPaymentCard) => {
    const end = new Date(c.expYear, c.expMonth, 0).getTime();
    return Math.ceil((end - Date.now()) / 86400000);
  };

  const syncDefaultCard = (
    nextCards: SavedPaymentCard[],
    defaultId: string | null,
  ): BillingPrefs => {
    const primary = nextCards.find((c) => c.id === defaultId) || nextCards[0] || null;
    return {
      ...prefs,
      cards: nextCards,
      defaultCardId: primary?.id || null,
      defaultCard: primary
        ? {
            brand: primary.brand,
            last4: primary.last4,
            expMonth: primary.expMonth,
            expYear: primary.expYear,
            holderName: primary.holderName,
          }
        : null,
    };
  };

  const openCardEditor = (
    mode: "add" | "replace" | "edit",
    cardId?: string,
  ) => {
    const existing =
      mode === "edit" && cardId
        ? cards.find((c) => c.id === cardId)
        : mode === "replace"
          ? defaultCard
          : null;
    const mm = existing
      ? String(existing.expMonth).padStart(2, "0")
      : "";
    const yy = existing ? String(existing.expYear).slice(-2) : "";
    setCardForm({
      // edit/replace: show masked placeholder digits ending with last4 (demo)
      pan: existing ? `••••••••••••${existing.last4}` : "",
      expiry: existing ? `${mm}/${yy}` : "",
      cvv: "",
      brand: existing?.brand || "Visa",
      holderName: existing?.holderName || user?.name || "",
    });
    setCardEditor({ mode, cardId: cardId || existing?.id });
    setCardMenuId(null);
  };

  const onPanChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 16);
    const brand = detectCardBrand(digits) || cardForm.brand;
    setCardForm((s) => ({ ...s, pan: formatPanGroups(digits), brand }));
  };

  const onExpiryChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    let next = digits;
    if (digits.length >= 3) next = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    else if (digits.length >= 1 && raw.includes("/") && digits.length <= 2)
      next = digits;
    setCardForm((s) => ({ ...s, expiry: next }));
  };

  const saveCard = () => {
    if (!cardEditor) return;
    const panDigits = cardForm.pan.replace(/\D/g, "");
    const isMaskedEdit =
      cardForm.pan.includes("•") && cardEditor.mode !== "add";
    if (!isMaskedEdit && (panDigits.length < 14 || panDigits.length > 16)) {
      flash(t("billing.k009"));
      return;
    }
    const exp = parseExpiry(cardForm.expiry);
    if (!exp) {
      flash(t("billing.k061"));
      return;
    }
    if (!/^\d{3,4}$/.test(cardForm.cvv)) {
      flash(t("billing.k010"));
      return;
    }
    const last4 = isMaskedEdit
      ? cards.find((c) => c.id === cardEditor.cardId)?.last4 ||
        panDigits.slice(-4)
      : panDigits.slice(-4);
    const brand =
      (!isMaskedEdit && detectCardBrand(panDigits)) ||
      cardForm.brand ||
      t("billing.k057");

    const payload: SavedPaymentCard = {
      id:
        cardEditor.mode === "add"
          ? `card-${crypto.randomUUID().slice(0, 6)}`
          : cardEditor.cardId ||
            defaultCard?.id ||
            `card-${crypto.randomUUID().slice(0, 6)}`,
      brand,
      last4,
      expMonth: exp.month,
      expYear: exp.year,
      holderName: cardForm.holderName.trim() || "CARD HOLDER",
    };

    let nextCards = [...cards];
    if (cardEditor.mode === "add") {
      nextCards = [...nextCards, payload];
    } else {
      const idx = nextCards.findIndex((c) => c.id === payload.id);
      if (idx >= 0) nextCards[idx] = payload;
      else nextCards = [payload, ...nextCards];
    }

    const defaultId =
      cardEditor.mode === "add" && !defaultCard
        ? payload.id
        : cardEditor.mode === "replace"
          ? payload.id
          : prefs.defaultCardId;

    const next = syncDefaultCard(nextCards, defaultId);
    if (cardEditor.mode === "replace") next.paymentFailure = null;
    persistPrefs(next);
    setCardEditor(null);
    flash(
      cardEditor.mode === "add" ? t("billing.k087") : t("billing.k077"),
    );
  };

  const uploadBankReceipt = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      flash(t("billing.k014"));
      return;
    }
    if (file.size > 2_500_000) {
      flash(t("billing.k092"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      persistPrefs({
        ...prefs,
        altMethods: {
          ...prefs.altMethods,
          bank: {
            enabled: true,
            status: "review",
            receiptName: file.name,
            receiptDataUrl: dataUrl,
          },
        },
      });
      flash(t("billing.k086"));
    };
    reader.readAsDataURL(file);
  };

  const confirmActivateWallet = () => {
    if (!activatePrompt) return;
    const key = activatePrompt;
    persistPrefs({
      ...prefs,
      altMethods: {
        ...prefs.altMethods,
        [key]: { enabled: true },
      },
    });
    setActivatePrompt(null);
    flash(
      key === "apple_pay"
        ? t("billing.k081")
        : key === "stc_pay"
          ? t("billing.k083")
          : t("billing.k082"),
    );
  };

  const removeCardById = (cardId: string) => {
    const nextCards = cards.filter((c) => c.id !== cardId);
    const nextDefault =
      prefs.defaultCardId === cardId
        ? nextCards[0]?.id || null
        : prefs.defaultCardId;
    const next = syncDefaultCard(nextCards, nextDefault);
    if (defaultCard?.id === cardId) next.paymentFailure = null;
    persistPrefs(next);
    setCardMenuId(null);
    setCardEditor(null);
    flash(t("billing.k084"));
  };

  const setDefaultCard = (cardId: string) => {
    persistPrefs({
      ...syncDefaultCard(cards, cardId),
      paymentFailure: null,
    });
    setCardMenuId(null);
    flash(t("billing.k079"));
  };

  const dismissFailureTryOther = () => {
    persistPrefs({ ...prefs, paymentFailure: null });
    openCardEditor("add");
  };

  const pendingUpgradeFor = (planId: string) =>
    upgradeRequests.some(
      (r) => r.toPlanId === planId && r.status === "pending",
    );

  const requestUpgrade = (
    toPlan: BillingPlan,
    applyAt: "immediate" | "renewal" = "immediate",
  ) => {
    if (toPlan.id === tenant.planId) {
      flash(t("billing.k137"));
      return;
    }
    if (pendingUpgradeFor(toPlan.id)) {
      flash(t("billing.k142"));
      return;
    }
    submitUpgradeRequest({
      tenantId: tenant.id,
      coreOrgId,
      fromPlanId: tenant.planId,
      toPlanId: toPlan.id,
      note: t("billing.tpl.upgradeNote", {
        name: user?.name || t("billing.tpl.orgAdminFallback"),
      }),
      applyAt,
    });
    flash(
      t("billing.tpl.upgradeSent", { plan: toPlan.name }),
    );
    setConfirmPlan(null);
    setComparePlanId(null);
    refresh();
    setTab("upgrade");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("billing.k027")}
        subtitle={t("billing.k055")}
        icon={<CreditCard className="h-6 w-6" />}
      />

      {message ? (
        <div
          role="status"
          className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200"
        >
          {message}
        </div>
      ) : null}

      <nav
        aria-label={t("billing.k024")}
        className="flex gap-1 overflow-x-auto border-b border-steel-200 pb-px dark:border-steel-700"
      >
        {tabs.map((tabItem) => {
          const active = tab === tabItem.id;
          const TabIcon = tabItem.icon;
          return (
            <button
              key={tabItem.id}
              type="button"
              onClick={() => setTab(tabItem.id)}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2 text-start transition",
                active
                  ? "border-brand-500 text-brand-700 dark:text-brand-300"
                  : "border-transparent text-steel-500 hover:text-steel-800 dark:hover:text-steel-200",
              )}
            >
              <span className="flex items-center gap-1.5 text-sm font-bold">
                <TabIcon className="h-3.5 w-3.5 opacity-70" />
                {tabItem.label}
              </span>
              <span className="mt-0.5 block text-[11px] font-medium text-steel-400">
                {tabItem.hint}
              </span>
            </button>
          );
        })}
      </nav>

      {tab === "overview" && (
        <div className="space-y-4">
          {/* 1) Status — answer in 5 seconds */}
          <div className={cn("rounded-xl border px-4 py-3", tone.banner)}>
            <div className="flex flex-wrap items-start gap-3">
              <StatusIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-extrabold">{tone.title}</p>
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-[11px] font-bold",
                      tone.pill,
                    )}
                  >
                    {subStatusLabel(t, subStatus)}
                  </span>
                </div>
                <p className="mt-1 text-sm opacity-90">{tone.body}</p>
              </div>
              {openInvoices.length > 0 ? (
                <Button size="sm" onClick={() => setTab("invoices")}>
                  {t("billing.k144", { count: openInvoices.length })}
                </Button>
              ) : null}
            </div>
          </div>

          {/* 2) Plan at a glance */}
          <Card className="overflow-hidden p-0">
            <div className="grid lg:grid-cols-[1.4fr_1fr]">
              <div className="space-y-4 p-5">
                <div>
                  <p className="text-xs font-semibold text-steel-400">{t("billing.k054")}</p>
                  <h2 className="mt-1 text-2xl font-extrabold text-steel-900 dark:text-steel-50">
                    {L(plan?.name) || "—"}
                  </h2>
                  <p className="mt-1 text-sm text-steel-500">
                    {L(plan?.description) || t("billing.k053")}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Fact
                    label={t("billing.k043")}
                    value={formatSar(
                      subscription?.mrrSar || plan?.priceMonthly || 0,
                    )}
                    hint={
                      subscription?.billingCycle === "annual"
                        ? t("billing.k104")
                        : t("billing.k139")
                    }
                  />
                  <Fact
                    label={t("billing.k134")}
                    value={formatBillingDate(renewIso, locale)}
                    hint={
                      renewDays === null
                        ? t("billing.k109")
                        : renewDays < 0
                          ? t("billing.k063")
                          : renewDays === 0
                            ? t("billing.k048")
                            : t("billing.tpl.renewInDays", { days: renewDays })
                    }
                  />
                  <Fact
                    label={t("billing.k095")}
                    value={
                      subscription?.billingCycle === "annual"
                        ? t("billing.k097")
                        : t("billing.k098")
                    }
                    hint={
                      prefs.autoRenew
                        ? t("billing.k034")
                        : t("billing.k036")
                    }
                  />
                </div>

                {(plan?.features || []).length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold text-steel-400">{t("billing.k145")}</p>
                    <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                      {(plan?.features || []).slice(0, 6).map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2 text-sm text-steel-700 dark:text-steel-200"
                        >
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          <span>{L(f)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-steel-100 bg-steel-50/80 p-5 dark:border-steel-800 dark:bg-steel-900/40 lg:border-s lg:border-t-0">
                <p className="text-xs font-semibold text-steel-400">{t("billing.k146")}</p>
                <div className="mt-3 space-y-2">
                  {openInvoices.length > 0 ? (
                    <ActionRow
                      title={t("billing.k013")}
                      desc={t("billing.k262", { count: openInvoices.length })}
                      onClick={() => setTab("invoices")}
                      primary
                    />
                  ) : null}
                  <ActionRow
                    title={t("billing.k108")}
                    desc={
                      nearLimit
                        ? t("billing.k023")
                        : t("billing.k067")
                    }
                    onClick={() => setTab("upgrade")}
                    primary={nearLimit && openInvoices.length === 0}
                  />
                  <ActionRow
                    title={t("billing.k008")}
                    desc={
                      prefs.autoRenew
                        ? t("billing.k131")
                        : t("billing.k125")
                    }
                    onClick={() => setTab("autorenew")}
                  />
                  <ActionRow
                    title={t("billing.k065")}
                    desc={
                      prefs.defaultCard
                        ? `${prefs.defaultCard.brand} •••• ${prefs.defaultCard.last4}`
                        : t("billing.k123")
                    }
                    onClick={() => setTab("payment")}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* 3) Usage — plain language */}
          <Card className="p-5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-steel-900 dark:text-steel-50">{t("billing.k147")}</h3>
                <p className="mt-0.5 text-xs text-steel-500">
                  {t("billing.k148", { plan: L(plan?.name) || "—" })}
                </p>
              </div>
              {nearLimit ? (
                <Button size="sm" variant="outline" onClick={() => setTab("upgrade")}>{t("billing.k099")}</Button>
              ) : null}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <UsageBar
                t={t}
                label={t("billing.k045")}
                used={usage.users}
                max={limits?.maxUsers || tenant.seats}
              />
              <UsageBar
                t={t}
                label={t("billing.k046")}
                used={usage.projects}
                max={limits?.maxProjects || 100}
              />
              <UsageBar
                t={t}
                label={t("billing.k037")}
                used={usage.storageGb}
                max={limits?.maxStorageGb || 100}
                unit={t("billing.k090")}
              />
            </div>
          </Card>

          {/* 4) Latest invoices preview */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold">{t("billing.k149")}</h3>
                <p className="text-xs text-steel-500">{t("billing.k150")}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setTab("invoices")}>{t("billing.k151")}<ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            </div>
            <ul className="mt-3 divide-y divide-steel-100 dark:divide-steel-800">
              {invoices.slice(0, 3).map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-semibold">{inv.number}</p>
                    <p className="text-xs text-steel-400">
                      {t("billing.k152")}{" "}
                      {formatBillingDate(inv.dueDate, locale)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums font-bold">
                      {formatSar(inv.totalSar)}
                    </span>
                    <InvoicePill t={t} status={inv.status} />
                    {inv.status === "open" || inv.status === "failed" ? (
                      <Button size="sm" onClick={() => payInvoice(inv.id)}>{t("billing.k153")}</Button>
                    ) : null}
                  </div>
                </li>
              ))}
              {invoices.length === 0 ? (
                <li className="py-6 text-center text-sm text-steel-400">{t("billing.k154")}</li>
              ) : null}
            </ul>
          </Card>

          {/* 5) Quiet history */}
          <div className="rounded-xl border border-steel-200 dark:border-steel-700">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-start text-sm font-bold text-steel-700 dark:text-steel-200"
              onClick={() => setShowHistory((v) => !v)}
            >{t("billing.k155")}<span className="text-xs font-semibold text-steel-400">
                {showHistory ? t("billing.k007") : t("billing.k103")}
              </span>
            </button>
            {showHistory ? (
              <ul className="space-y-2 border-t border-steel-100 px-4 py-3 text-sm dark:border-steel-800">
                {(subscription?.history || []).map((h, i) => (
                  <li
                    key={`${h.at}-${i}`}
                    className="flex flex-wrap justify-between gap-2 text-steel-600 dark:text-steel-300"
                  >
                    <span>{L(h.text)}</span>
                    <span className="text-xs text-steel-400">
                      {h.at.slice(0, 16).replace("T", " ")}
                    </span>
                  </li>
                ))}
                {!subscription?.history?.length ? (
                  <li className="text-steel-400">{t("billing.k156")}</li>
                ) : null}
              </ul>
            ) : null}
          </div>
        </div>
      )}

      {tab === "invoices" && (
        <div className="space-y-4">
          {/* 1) Status — what should I do? */}
          <div
            className={cn(
              "rounded-xl border px-4 py-3",
              openInvoices.length > 0
                ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
                : invoices.length === 0
                  ? "border-steel-200 bg-steel-50 text-steel-800 dark:border-steel-700 dark:bg-steel-800/40 dark:text-steel-100"
                  : "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100",
            )}
          >
            <div className="flex flex-wrap items-start gap-3">
              {openInvoices.length > 0 ? (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold">
                  {openInvoices.length > 0
                    ? t("billing.k263", { count: openInvoices.length })
                    : invoices.length === 0
                      ? t("billing.k115")
                      : t("billing.k114")}
                </p>
                <p className="mt-1 text-sm opacity-90">
                  {openInvoices.length > 0
                    ? t("billing.k264", { amount: formatSar(dueTotalSar) })
                    : invoices.length === 0
                      ? t("billing.k105")
                      : t("billing.k121")}
                </p>
              </div>
              {openInvoices.length > 0 ? (
                <Button size="sm" onClick={payAllOpen}>
                  {t("billing.k265", { count: openInvoices.length })}
                </Button>
              ) : null}
            </div>
          </div>

          {/* 2) Summary + actions */}
          <Card className="overflow-hidden p-0">
            <div className="grid lg:grid-cols-[1.4fr_1fr]">
              <div className="space-y-4 p-5">
                <div>
                  <p className="text-xs font-semibold text-steel-400">{t("billing.k157")}</p>
                  <h2 className="mt-1 text-xl font-extrabold text-steel-900 dark:text-steel-50">{t("billing.k158")}</h2>
                  <p className="mt-1 text-sm text-steel-500">{t("billing.k159")}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Fact
                    label={t("billing.k129")}
                    value={formatSar(dueTotalSar)}
                    hint={
                      openInvoices.length
                        ? t("billing.k266", { count: openInvoices.length })
                        : t("billing.k119")
                    }
                  />
                  <Fact
                    label={t("billing.k126")}
                    value={formatSar(paidTotalSar)}
                    hint={t("billing.k267", { count: paidInvoices.length })}
                  />
                  <Fact
                    label={t("billing.k006")}
                    value={String(invoices.length)}
                    hint={t("billing.k113")}
                  />
                </div>
              </div>

              <div className="border-t border-steel-100 bg-steel-50/80 p-5 dark:border-steel-800 dark:bg-steel-900/40 lg:border-s lg:border-t-0">
                <p className="text-xs font-semibold text-steel-400">{t("billing.k146")}</p>
                <div className="mt-3 space-y-2">
                  {openInvoices.length > 0 ? (
                    <ActionRow
                      title={t("billing.k012")}
                      desc={`${formatSar(dueTotalSar)} · ${t("billing.k267", { count: openInvoices.length })}`}
                      onClick={payAllOpen}
                      primary
                    />
                  ) : null}
                  <ActionRow
                    title={t("billing.k093")}
                    desc={
                      prefs.defaultCard
                        ? `${prefs.defaultCard.brand} •••• ${prefs.defaultCard.last4}`
                        : t("billing.k021")
                    }
                    onClick={() => setTab("payment")}
                    primary={openInvoices.length === 0 && !prefs.defaultCard}
                  />
                  <ActionRow
                    title={t("billing.k058")}
                    desc={t("billing.k030")}
                    onClick={() => setTab("settings")}
                  />
                  <ActionRow
                    title={t("billing.k041")}
                    desc={t("billing.k268", {
                      name: L(plan?.name) || t("billing.k038"),
                    })}
                    onClick={() => setTab("overview")}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* 3) Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                {
                  id: "all" as const,
                  label: t("billing.k269", { count: invoices.length }),
                },
                {
                  id: "needs_action" as const,
                  label: t("billing.k270", { count: openInvoices.length }),
                },
                {
                  id: "paid" as const,
                  label: t("billing.k271", { count: paidInvoices.length }),
                },
              ]
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setInvoiceFilter(f.id)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-bold transition",
                  invoiceFilter === f.id
                    ? "border-brand-300 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                    : "border-steel-200 text-steel-500 hover:border-steel-300 dark:border-steel-700",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* 4) Invoice cards — self explanatory */}
          <div className="space-y-3">
            {filteredInvoices.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-sm font-semibold text-steel-500">
                  {invoices.length === 0
                    ? t("billing.k117")
                    : t("billing.k116")}
                </p>
                {invoiceFilter !== "all" ? (
                  <Button
                    className="mt-3"
                    size="sm"
                    variant="outline"
                    onClick={() => setInvoiceFilter("all")}
                  >{t("billing.k272")}</Button>
                ) : null}
              </Card>
            ) : (
              filteredInvoices.map((inv) => {
                const needsPay =
                  inv.status === "open" || inv.status === "failed";
                const dueDays = daysUntil(inv.dueDate);
                const overdue = needsPay && dueDays !== null && dueDays < 0;
                return (
                  <Card
                    key={inv.id}
                    className={cn(
                      "p-4",
                      needsPay && "border-amber-200 dark:border-amber-500/30",
                      overdue && "border-red-300 dark:border-red-500/40",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-extrabold text-steel-900 dark:text-steel-50">
                            {inv.number}
                          </p>
                          <InvoicePill t={t} status={inv.status} />
                          {overdue ? (
                            <span className="rounded bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-800 dark:bg-red-500/20 dark:text-red-200">{t("billing.k160")}</span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-steel-500">
                          {invoiceListCaption(
                            t,
                            inv,
                            locale,
                            dueDays,
                            needsPay,
                            overdue,
                          )}
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="text-xl font-extrabold tabular-nums text-steel-900 dark:text-steel-50">
                          {formatSar(inv.totalSar)}
                        </p>
                        <p className="text-[11px] text-steel-400">
                          {t("billing.k161", { vat: formatSar(inv.vatSar) })}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 border-t border-steel-100 pt-3 text-xs text-steel-500 dark:border-steel-800 sm:grid-cols-3">
                      <div>
                        <p className="font-semibold text-steel-400">{t("billing.k162")}</p>
                        <p className="mt-0.5 font-bold text-steel-700 dark:text-steel-200">
                          {formatBillingDate(inv.issueDate, locale)}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-steel-400">{t("billing.k163")}</p>
                        <p className="mt-0.5 font-bold text-steel-700 dark:text-steel-200">
                          {formatBillingDate(inv.dueDate, locale)}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-steel-400">{t("billing.k164")}</p>
                        <p className="mt-0.5 font-bold tabular-nums text-steel-700 dark:text-steel-200">
                          {formatSar(inv.subtotalSar)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] text-steel-400">
                        {needsPay
                          ? prefs.defaultCard
                            ? t("billing.k165", {
                                brand: prefs.defaultCard.brand,
                                last4: prefs.defaultCard.last4,
                              })
                            : t("billing.k140")
                          : t("billing.k122")}
                      </p>
                      {needsPay ? (
                        <Button onClick={() => payInvoice(inv.id)}>
                          {t("billing.k166", {
                            amount: formatSar(inv.totalSar),
                          })}
                        </Button>
                      ) : null}
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* 5) Quiet help */}
          <div className="rounded-xl border border-steel-200 px-4 py-3 text-sm text-steel-600 dark:border-steel-700 dark:text-steel-300">
            <p className="font-bold text-steel-800 dark:text-steel-100">{t("billing.k167")}</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• {t("billing.k168")}</li>
              <li>• {t("billing.k169")}</li>
              <li>• {t("billing.k170")}</li>
              <li>• {t("billing.k171")}</li>
            </ul>
          </div>
        </div>
      )}

      {tab === "payment" && (
        <div className="space-y-4">
          {/* Failure alert */}
          {prefs.paymentFailure ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-red-800 dark:text-red-200">{t("billing.k172")}</p>
                <p className="mt-1 text-sm text-red-700/90 dark:text-red-100/90">
                  {t("billing.k173", {
                    last4: prefs.paymentFailure.cardLast4,
                    retryAt: formatBillingDate(
                      prefs.paymentFailure.retryAt,
                      locale,
                    ),
                    accessUntil: L(prefs.paymentFailure.accessUntil),
                  })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={dismissFailureTryOther}
                >{t("billing.k174")}</Button>
                {defaultCard ? (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => removeCardById(defaultCard.id)}
                  >{t("billing.k175")}</Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Default card hero */}
          <Card className="p-5">
            {defaultCard ? (
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                <PaymentCardVisual card={defaultCard} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">{t("billing.k031")}</span>
                    {daysToCardExpiry(defaultCard) <= 45 ? (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">
                        {t("billing.k176")}{" "}
                        {Math.max(0, daysToCardExpiry(defaultCard))}{" "}
                        {t("billing.k177")}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-base font-extrabold text-steel-900 dark:text-steel-50">{t("billing.k178")}</p>
                  <p className="mt-1 text-sm text-steel-500">
                    {t("billing.k179")}{" "}
                    {formatBillingDate(renewIso, locale)} ·{" "}
                    {formatSar(
                      subscription?.mrrSar || plan?.priceMonthly || 0,
                    )}
                    {prefs.autoRenew
                      ? t("billing.k002")
                      : t("billing.k001")}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      onClick={() =>
                        openCardEditor("replace", defaultCard.id)
                      }
                    >{t("billing.k180")}</Button>
                    <Button
                      variant="secondary"
                      onClick={() => openCardEditor("edit", defaultCard.id)}
                    >{t("billing.k181")}</Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <CreditCard className="h-8 w-8 text-steel-300" />
                <p className="mt-3 text-sm font-extrabold">{t("billing.k182")}</p>
                <p className="mt-1 text-sm text-steel-500">{t("billing.k183")}</p>
                <Button className="mt-4" onClick={() => openCardEditor("add")}>{t("billing.k019")}</Button>
              </div>
            )}
          </Card>

          {/* Other cards */}
          <Card className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-steel-100 px-5 py-4 dark:border-steel-800">
              <div>
                <h3 className="text-sm font-extrabold text-steel-900 dark:text-steel-50">{t("billing.k184")}</h3>
                <p className="mt-0.5 text-xs text-steel-400">{t("billing.k185")}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openCardEditor("add")}
              >
                <Plus className="h-3.5 w-3.5" />{t("billing.k019")}</Button>
            </div>
            <ul>
              {otherCards.length === 0 ? (
                <li className="px-5 py-8 text-center text-sm text-steel-400">{t("billing.k186")}</li>
              ) : (
                otherCards.map((c, idx) => (
                  <li
                    key={c.id}
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-3 px-5 py-3.5",
                      idx < otherCards.length - 1 &&
                        "border-b border-steel-100 dark:border-steel-800",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-14 items-center justify-center rounded-xl border border-steel-200 bg-white dark:border-steel-700 dark:bg-steel-900">
                        <CardBrandMark brand={c.brand} />
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-steel-900 dark:text-steel-50">
                          {c.brand}{" "}
                          <span className="font-mono font-bold tracking-wide text-steel-600 dark:text-steel-300">
                            •••• {c.last4}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-steel-400">
                          {t("billing.k187")}{" "}
                          {String(c.expMonth).padStart(2, "0")}/{c.expYear}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setDefaultCard(c.id)}
                      >{t("billing.k188")}</Button>
                      <div className="relative">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={t("billing.k044")}
                          onClick={() =>
                            setCardMenuId(cardMenuId === c.id ? null : c.id)
                          }
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        {cardMenuId === c.id ? (
                          <div className="absolute end-0 z-20 mt-1 w-36 rounded-xl border border-steel-200 bg-white py-1 shadow-soft dark:border-steel-700 dark:bg-steel-900">
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-start text-xs font-semibold hover:bg-steel-50 dark:hover:bg-steel-800"
                              onClick={() => openCardEditor("edit", c.id)}
                            >{t("billing.k189")}</button>
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-start text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                              onClick={() => removeCardById(c.id)}
                            >{t("billing.k190")}</button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </Card>

          {/* Alt methods */}
          <div>
            <h3 className="text-sm font-extrabold text-steel-900 dark:text-steel-50">{t("billing.k191")}</h3>
            <p className="mt-1 text-xs text-steel-500">{t("billing.k192")}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <AltMethodTile
                title={t("billing.k066")}
                icon={<Building2 className="h-5 w-5" />}
                active={prefs.altMethods.bank.enabled}
                status={
                  prefs.altMethods.bank.status === "review"
                    ? t("billing.k112")
                    : prefs.altMethods.bank.status === "active"
                      ? t("billing.k130")
                      : undefined
                }
                actions={
                  <div className="w-full space-y-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-brand-700 dark:text-brand-300">
                      <Upload className="h-3.5 w-3.5" />{t("billing.k193")}<input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) =>
                          uploadBankReceipt(e.target.files?.[0] || null)
                        }
                      />
                    </label>
                    {prefs.altMethods.bank.receiptDataUrl ? (
                      <div className="overflow-hidden rounded-lg border border-steel-200 dark:border-steel-700">
                        <img
                          src={prefs.altMethods.bank.receiptDataUrl}
                          alt={t("billing.k051")}
                          className="h-20 w-full object-cover"
                        />
                        <p className="truncate px-2 py-1 text-[10px] text-steel-400">
                          {prefs.altMethods.bank.receiptName || t("billing.k050")}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-steel-400">{t("billing.k194")}</p>
                    )}
                    <button
                      type="button"
                      className="text-xs font-semibold text-steel-500 hover:underline"
                      onClick={() => setAccountDetailsOpen(true)}
                    >{t("billing.k195")}</button>
                  </div>
                }
              />
              {(
                [
                  {
                    key: "apple_pay" as const,
                    title: "Apple Pay",
                    icon: <Smartphone className="h-5 w-5" />,
                  },
                  {
                    key: "stc_pay" as const,
                    title: "STC Pay",
                    icon: <Smartphone className="h-5 w-5" />,
                  },
                  {
                    key: "fawry" as const,
                    title: "Fawry",
                    icon: <Wallet className="h-5 w-5" />,
                  },
                ] as const
              ).map((m) => {
                const enabled = prefs.altMethods[m.key].enabled;
                return (
                  <AltMethodTile
                    key={m.key}
                    title={m.title}
                    icon={m.icon}
                    active={enabled}
                    actions={
                      enabled ? (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">{t("billing.k196")}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              persistPrefs({
                                ...prefs,
                                altMethods: {
                                  ...prefs.altMethods,
                                  [m.key]: { enabled: false },
                                },
                              });
                              flash(t("billing.k197", { title: m.title }));
                            }}
                          >{t("billing.k198")}</Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setActivatePrompt(m.key)}
                        >{t("billing.k199")}</Button>
                      )
                    }
                  />
                );
              })}
            </div>
          </div>

          {/* Card editor modal */}
          {cardEditor ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
              <button
                type="button"
                className="absolute inset-0"
                aria-label={t("billing.k022")}
                onClick={() => setCardEditor(null)}
              />
              <div className="relative z-10 w-full max-w-md rounded-2xl border border-steel-200 bg-white p-5 shadow-soft dark:border-steel-700 dark:bg-steel-900">
                <h3 className="text-base font-extrabold">
                  {cardEditor.mode === "add"
                    ? t("billing.k019")
                    : cardEditor.mode === "replace"
                      ? t("billing.k064")
                      : t("billing.k069")}
                </h3>
                <p className="mt-1 text-xs text-steel-400">{t("billing.k200")}</p>
                <div className="mt-4 space-y-3">
                  <Field label={t("billing.k016")}>
                    <Input
                      value={cardForm.holderName}
                      onChange={(e) =>
                        setCardForm((s) => ({
                          ...s,
                          holderName: e.target.value,
                        }))
                      }
                    />
                  </Field>

                  <Field label={t("billing.k096")}>
                    <div className="relative">
                      <Input
                        value={cardForm.pan}
                        inputMode="numeric"
                        autoComplete="cc-number"
                        placeholder="XXXX XXXX XXXX XXXX"
                        className="pe-14 font-mono text-base tracking-wider"
                        onChange={(e) => {
                          if (e.target.value.includes("•")) {
                            // clear mask on first edit
                            onPanChange(e.target.value.replace(/[•\s]/g, ""));
                            return;
                          }
                          onPanChange(e.target.value);
                        }}
                        onFocus={() => {
                          if (cardForm.pan.includes("•")) {
                            setCardForm((s) => ({ ...s, pan: "" }));
                          }
                        }}
                      />
                      <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2">
                        <CardBrandMark brand={cardForm.brand} />
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-steel-400">
                      {t("billing.k201")}
                    </p>
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t("billing.k060")}>
                      <Input
                        value={cardForm.expiry}
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        placeholder="MM/YY"
                        className="font-mono tracking-widest"
                        onChange={(e) => onExpiryChange(e.target.value)}
                      />
                    </Field>
                    <Field label="CVV">
                      <Input
                        value={cardForm.cvv}
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        placeholder="•••"
                        maxLength={4}
                        className="font-mono tracking-widest"
                        onChange={(e) =>
                          setCardForm((s) => ({
                            ...s,
                            cvv: e.target.value.replace(/\D/g, "").slice(0, 4),
                          }))
                        }
                      />
                    </Field>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="secondary"
                      onClick={() => setCardEditor(null)}
                    >{t("billing.k202")}</Button>
                    <Button onClick={saveCard}>{t("billing.k203")}</Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Activate wallet explain */}
          {activatePrompt ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
              <button
                type="button"
                className="absolute inset-0"
                aria-label={t("billing.k022")}
                onClick={() => setActivatePrompt(null)}
              />
              <div className="relative z-10 w-full max-w-md rounded-2xl border border-steel-200 bg-white p-5 shadow-soft dark:border-steel-700 dark:bg-steel-900">
                <h3 className="text-base font-extrabold">
                  {t("billing.k204")}
                  {activatePrompt === "apple_pay"
                    ? "Apple Pay"
                    : activatePrompt === "stc_pay"
                      ? "STC Pay"
                      : "Fawry"}
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-steel-600 dark:text-steel-300">
                  <li>• {t("billing.k205")}</li>
                  <li>• {t("billing.k206")}</li>
                  <li>• {t("billing.k207")}</li>
                  <li>• {t("billing.k208")}</li>
                </ul>
                <div className="mt-5 flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setActivatePrompt(null)}
                  >{t("billing.k202")}</Button>
                  <Button onClick={confirmActivateWallet}>{t("billing.k209")}</Button>
                </div>
              </div>
            </div>
          ) : null}

          {accountDetailsOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
              <button
                type="button"
                className="absolute inset-0"
                aria-label={t("billing.k022")}
                onClick={() => setAccountDetailsOpen(false)}
              />
              <div className="relative z-10 w-full max-w-md rounded-2xl border border-steel-200 bg-white p-5 shadow-soft dark:border-steel-700 dark:bg-steel-900">
                <h3 className="text-base font-extrabold">{t("billing.k210")}</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-3 border-b border-steel-100 py-2 dark:border-steel-800">
                    <dt className="text-steel-400">{t("billing.k211")}</dt>
                    <dd className="font-bold">{t("billing.k212")}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-steel-100 py-2 dark:border-steel-800">
                    <dt className="text-steel-400">IBAN</dt>
                    <dd className="font-mono text-xs font-bold">
                      SA00 0000 0000 0000 0000 0000
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 py-2">
                    <dt className="text-steel-400">{t("billing.k213")}</dt>
                    <dd className="font-bold">
                      {L(organization?.name) || t("billing.k133")}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-steel-400">{t("billing.k214")}</p>
                <div className="mt-4 flex justify-end">
                  <Button onClick={() => setAccountDetailsOpen(false)}>{t("billing.k215")}</Button>
                </div>
              </div>
            </div>
          ) : null}

          <p className="text-center text-[11px] text-steel-400">{t("billing.k216")}</p>
        </div>
      )}

      {tab === "autorenew" && (
        <div className="mx-auto max-w-2xl space-y-4">
          <div
            className={cn(
              "rounded-2xl border px-4 py-3",
              prefs.autoRenew
                ? "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
                : "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100",
            )}
          >
            <div className="flex flex-wrap items-start gap-3">
              {prefs.autoRenew ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold">
                  {prefs.autoRenew
                    ? t("billing.k035")
                    : t("billing.k033")}
                </p>
                <p className="mt-1 text-sm opacity-90">
                  {prefs.autoRenew
                    ? t("billing.k217", {
                        date: formatBillingDate(renewIso, locale),
                      })
                    : t("billing.k124")}
                </p>
              </div>
            </div>
          </div>

          <Card className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-steel-100 px-5 py-4 dark:border-steel-800">
              <div>
                <h2 className="text-base font-extrabold text-steel-900 dark:text-steel-50">{t("billing.k218")}</h2>
                <p className="mt-0.5 text-sm text-steel-500">
                  {t("billing.k219")}{" "}
                  {L(plan?.name) || t("billing.k038")} ·{" "}
                  {formatSar(subscription?.mrrSar || plan?.priceMonthly || 0)}{" "}
                  {t("billing.k241")}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.autoRenew}
                onClick={() => {
                  if (!prefs.autoRenew && !defaultCard) {
                    flash(t("billing.k020"));
                    setTab("payment");
                    return;
                  }
                  toggleAutoRenew();
                }}
                className={cn(
                  "relative h-8 w-14 shrink-0 rounded-full transition",
                  prefs.autoRenew ? "bg-brand-500" : "bg-steel-300 dark:bg-steel-600",
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition",
                    prefs.autoRenew ? "start-7" : "start-1",
                  )}
                />
              </button>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-3">
              <div className="rounded-xl border border-steel-200 bg-steel-50/70 px-3 py-3 dark:border-steel-700 dark:bg-steel-900/40">
                <p className="text-[11px] font-semibold text-steel-400">{t("billing.k134")}</p>
                <p className="mt-1 text-sm font-extrabold tabular-nums">
                  {formatBillingDate(renewIso, locale)}
                </p>
                <p className="mt-0.5 text-[11px] text-steel-400">
                  {renewDays === null
                    ? t("billing.k109")
                    : renewDays < 0
                      ? t("billing.k063")
                      : renewDays === 0
                        ? t("billing.k048")
                        : t("billing.tpl.renewInDays", { days: renewDays })}
                </p>
              </div>
              <div className="rounded-xl border border-steel-200 bg-steel-50/70 px-3 py-3 dark:border-steel-700 dark:bg-steel-900/40">
                <p className="text-[11px] font-semibold text-steel-400">{t("billing.k221")}</p>
                <p className="mt-1 text-sm font-extrabold tabular-nums">
                  {formatSar(subscription?.mrrSar || plan?.priceMonthly || 0)}
                </p>
                <p className="mt-0.5 text-[11px] text-steel-400">{t("billing.k222")}</p>
              </div>
              <div className="rounded-xl border border-steel-200 bg-steel-50/70 px-3 py-3 dark:border-steel-700 dark:bg-steel-900/40">
                <p className="text-[11px] font-semibold text-steel-400">{t("billing.k223")}</p>
                {defaultCard ? (
                  <>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-extrabold">
                      <CardBrandMark brand={defaultCard.brand} />
                      <span className="font-mono">•••• {defaultCard.last4}</span>
                    </p>
                    <button
                      type="button"
                      className="mt-0.5 text-[11px] font-bold text-brand-700 hover:underline dark:text-brand-300"
                      onClick={() => setTab("payment")}
                    >{t("billing.k224")}</button>
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-sm font-extrabold text-amber-700">{t("billing.k225")}</p>
                    <button
                      type="button"
                      className="mt-0.5 text-[11px] font-bold text-brand-700 hover:underline dark:text-brand-300"
                      onClick={() => setTab("payment")}
                    >{t("billing.k019")}</button>
                  </>
                )}
              </div>
            </div>

            <div className="border-t border-steel-100 px-5 py-4 dark:border-steel-800">
              <p className="text-xs font-bold text-steel-500">{t("billing.k226")}</p>
              <ul className="mt-2 space-y-2 text-sm text-steel-600 dark:text-steel-300">
                {prefs.autoRenew ? (
                  <>
                    <li className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{t("billing.k227")}</li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{t("billing.k228")}</li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{t("billing.k229")}</li>
                  </>
                ) : (
                  <>
                    <li className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />{t("billing.k230")}</li>
                    <li className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />{t("billing.k231")}</li>
                    <li className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />{t("billing.k232")}</li>
                  </>
                )}
              </ul>
            </div>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={prefs.autoRenew ? "outline" : "primary"}
              onClick={() => {
                if (!prefs.autoRenew && !defaultCard) {
                  flash(t("billing.k020"));
                  setTab("payment");
                  return;
                }
                toggleAutoRenew();
              }}
            >
              {prefs.autoRenew
                ? t("billing.k052")
                : t("billing.k073")}
            </Button>
            <Button variant="secondary" onClick={() => setTab("payment")}>{t("billing.k233")}</Button>
            <Button variant="ghost" onClick={() => setTab("invoices")}>{t("billing.k234")}</Button>
          </div>
        </div>
      )}

      {tab === "upgrade" && (() => {
        const sortedPlans = [...plans]
          .filter((p) => p.active !== false)
          .sort((a, b) => a.priceMonthly - b.priceMonthly);
        const comparePlan =
          sortedPlans.find((p) => p.id === comparePlanId) || null;
        const usageHigh =
          usagePct(usage.users, limits?.maxUsers || tenant.seats) >= 75 ||
          usagePct(usage.projects, limits?.maxProjects || 100) >= 75 ||
          usagePct(usage.storageGb, limits?.maxStorageGb || 100) >= 75;
        const pendingCount = upgradeRequests.filter(
          (r) => r.status === "pending",
        ).length;
        const recommended = sortedPlans.find(
          (p) =>
            p.id !== tenant.planId &&
            (p.priceMonthly || 0) > (plan?.priceMonthly || 0),
        );

        const exceedsLimits = (p: BillingPlan) => {
          const maxU = p.limits?.maxUsers ?? p.seatsIncluded;
          const maxP = p.limits?.maxProjects ?? 9999;
          const maxS = p.limits?.maxStorageGb ?? 9999;
          return (
            usage.users > maxU ||
            usage.projects > maxP ||
            usage.storageGb > maxS
          );
        };

        return (
          <div className="space-y-4">
            <div
              className={cn(
                "rounded-2xl border px-4 py-3",
                usageHigh
                  ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
                  : "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100",
              )}
            >
              <div className="flex flex-wrap items-start gap-3">
                {usageHigh ? (
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold">
                    {t("billing.k235")} {L(plan?.name) || "—"}
                  </p>
                  <p className="mt-1 text-sm opacity-90">
                    {usageHigh
                      ? t("billing.k015")
                      : t("billing.k094")}
                  </p>
                  <p className="mt-2 text-xs opacity-80">
                    {t("billing.k279", {
                      users: usage.users,
                      maxUsers: limits?.maxUsers || tenant.seats,
                      usersLabel: t("billing.k045"),
                      projects: usage.projects,
                      maxProjects: limits?.maxProjects ?? "—",
                      projectsLabel: t("billing.k046"),
                      storage: usage.storageGb,
                      maxStorage: limits?.maxStorageGb ?? "—",
                      storageUnit: t("billing.k090"),
                    })}
                    {pendingCount > 0
                      ? t("billing.k236", { count: pendingCount })
                      : ""}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-steel-500">{t("billing.k237")}</p>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {sortedPlans.map((p) => {
                const current = p.id === tenant.planId;
                const isUpgrade =
                  (p.priceMonthly || 0) > (plan?.priceMonthly || 0);
                const isDowngrade =
                  (p.priceMonthly || 0) < (plan?.priceMonthly || 0);
                const pending = pendingUpgradeFor(p.id);
                const selected = comparePlanId === p.id;
                const blockedDowngrade = isDowngrade && exceedsLimits(p);
                const isRecommended =
                  usageHigh && recommended?.id === p.id && !current;

                return (
                  <Card
                    key={p.id}
                    className={cn(
                      "flex cursor-pointer flex-col p-5 transition",
                      current && "border-brand-400 ring-1 ring-brand-400/40",
                      selected &&
                        !current &&
                        "border-brand-500 ring-1 ring-brand-500/50",
                    )}
                    onClick={() => {
                      if (!current) setComparePlanId(p.id);
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-base font-extrabold">{L(p.name)}</p>
                      <div className="flex flex-wrap gap-1">
                        {current ? (
                          <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-bold text-brand-700">{t("billing.k038")}</span>
                        ) : null}
                        {isRecommended ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">{t("billing.k238")}</span>
                        ) : null}
                        {!current && isUpgrade ? (
                          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-800 dark:bg-sky-500/20 dark:text-sky-200">{t("billing.k239")}</span>
                        ) : null}
                        {!current && isDowngrade ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">{t("billing.k240")}</span>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-steel-500">
                      {L(p.description)}
                    </p>
                    <p className="mt-3 text-2xl font-extrabold tabular-nums">
                      {formatSar(p.priceMonthly)}
                      <span className="text-xs font-semibold text-steel-400">
                        {" "}
                        {t("billing.k241")}
                      </span>
                    </p>
                    {p.priceAnnual ? (
                      <p className="text-[11px] text-steel-400">
                        {t("billing.k242", {
                          amount: formatSar(p.priceAnnual),
                        })}
                      </p>
                    ) : null}

                    <div className="mt-3 space-y-1.5 text-xs text-steel-600 dark:text-steel-300">
                      <p>
                        {t("billing.k243", {
                          users: p.limits?.maxUsers ?? p.seatsIncluded,
                          projects: p.limits?.maxProjects ?? "—",
                          storage: p.limits?.maxStorageGb ?? "—",
                        })}
                      </p>
                      {current ? (
                        <p className="text-steel-400">
                          {t("billing.k244", {
                            users: usage.users,
                            projects: usage.projects,
                            storage: usage.storageGb,
                          })}
                        </p>
                      ) : null}
                      {blockedDowngrade ? (
                        <p className="font-semibold text-amber-700 dark:text-amber-300">{t("billing.k245")}</p>
                      ) : null}
                    </div>

                    <ul className="mt-3 flex-1 space-y-1.5 text-xs text-steel-600 dark:text-steel-300">
                      {p.features.slice(0, 3).map((f) => (
                        <li key={f} className="flex gap-1.5">
                          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                          {L(f)}
                        </li>
                      ))}
                    </ul>

                    <Button
                      className="mt-4 w-full"
                      variant={
                        current || pending
                          ? "outline"
                          : selected
                            ? "primary"
                            : "secondary"
                      }
                      disabled={current || pending || blockedDowngrade}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (current || pending || blockedDowngrade) return;
                        setComparePlanId(p.id);
                        setApplyAtRenewal(false);
                        setConfirmPlan(p);
                      }}
                    >
                      {current
                        ? t("billing.k054")
                        : pending
                          ? t("billing.k101")
                          : blockedDowngrade
                            ? t("billing.k110")
                            : isUpgrade
                              ? t("billing.k099")
                              : t("billing.k100")}
                    </Button>
                  </Card>
                );
              })}
            </div>

            {comparePlan && comparePlan.id !== tenant.planId ? (
              <Card className="p-5">
                <h3 className="text-sm font-extrabold">{t("billing.k246")}</h3>
                <p className="mt-1 text-xs text-steel-500">
                  {L(plan?.name)} ← {L(comparePlan.name)}
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b border-steel-200 text-start dark:border-steel-700">
                        <th className="py-2 font-bold">{t("billing.k247")}</th>
                        <th className="py-2 font-bold">{t("billing.k038")}</th>
                        <th className="py-2 font-bold">{t("billing.k248")}</th>
                      </tr>
                    </thead>
                    <tbody className="text-steel-700 dark:text-steel-200">
                      <tr className="border-b border-steel-100 dark:border-steel-800">
                        <td className="py-2 text-steel-400">{t("billing.k249")}</td>
                        <td className="py-2 tabular-nums">
                          {formatSar(plan?.priceMonthly || 0)}
                        </td>
                        <td className="py-2 tabular-nums font-bold">
                          {formatSar(comparePlan.priceMonthly)}
                          <span className="ms-1 text-xs font-semibold text-steel-400">
                            (
                            {comparePlan.priceMonthly - (plan?.priceMonthly || 0) >
                            0
                              ? "+"
                              : ""}
                            {formatSar(
                              comparePlan.priceMonthly -
                                (plan?.priceMonthly || 0),
                            )}
                            )
                          </span>
                        </td>
                      </tr>
                      <tr className="border-b border-steel-100 dark:border-steel-800">
                        <td className="py-2 text-steel-400">{t("billing.k045")}</td>
                        <td className="py-2">
                          {usage.users} /{" "}
                          {plan?.limits?.maxUsers ?? plan?.seatsIncluded}
                        </td>
                        <td className="py-2 font-bold">
                          {t("billing.k250")}{" "}
                          {comparePlan.limits?.maxUsers ??
                            comparePlan.seatsIncluded}
                        </td>
                      </tr>
                      <tr className="border-b border-steel-100 dark:border-steel-800">
                        <td className="py-2 text-steel-400">{t("billing.k046")}</td>
                        <td className="py-2">
                          {usage.projects} / {plan?.limits?.maxProjects ?? "—"}
                        </td>
                        <td className="py-2 font-bold">
                          {t("billing.k250")}{" "}
                          {comparePlan.limits?.maxProjects ?? "—"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 text-steel-400">{t("billing.k037")}</td>
                        <td className="py-2">
                          {usage.storageGb} /{" "}
                          {plan?.limits?.maxStorageGb ?? "—"}{" "}
                          {t("billing.k090")}
                        </td>
                        <td className="py-2 font-bold">
                          {t("billing.k250")}{" "}
                          {comparePlan.limits?.maxStorageGb ?? "—"}{" "}
                          {t("billing.k090")}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    disabled={
                      pendingUpgradeFor(comparePlan.id) ||
                      exceedsLimits(comparePlan)
                    }
                    onClick={() => {
                      setApplyAtRenewal(false);
                      setConfirmPlan(comparePlan);
                    }}
                  >
                    {t("billing.k251", { name: L(comparePlan.name) })}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setComparePlanId(null)}
                  >{t("billing.k252")}</Button>
                </div>
              </Card>
            ) : null}

            <Card className="p-5">
              <CardHeader
                title={t("billing.k102")}
                subtitle={t("billing.k091")}
              />
              <ul className="mt-3 space-y-2 text-sm">
                {upgradeRequests.length === 0 ? (
                  <li className="text-steel-400">{t("billing.k253")}</li>
                ) : (
                  upgradeRequests.map((r) => {
                    const from =
                      plans.find((p) => p.id === r.fromPlanId)?.name ||
                      r.fromPlanId;
                    const to =
                      plans.find((p) => p.id === r.toPlanId)?.name ||
                      r.toPlanId;
                    return (
                      <li
                        key={r.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-steel-200 px-3 py-2.5 dark:border-steel-700"
                      >
                        <div>
                          <p className="font-semibold">
                            {t("billing.k254", { from, to })}
                          </p>
                          <p className="text-[11px] text-steel-400">
                            {formatBillingDate(r.createdAt, locale)}
                            {r.applyAt === "renewal"
                              ? t("billing.k004")
                              : t("billing.k003")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[11px] font-bold",
                              r.status === "pending"
                                ? "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100"
                                : r.status === "approved"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
                                  : r.status === "cancelled"
                                    ? "bg-steel-100 text-steel-600 dark:bg-steel-800 dark:text-steel-300"
                                    : "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200",
                            )}
                          >
                            {r.status === "pending"
                              ? t("billing.k112")
                              : r.status === "approved"
                                ? t("billing.k088")
                                : r.status === "cancelled"
                                  ? t("billing.k132")
                                  : t("billing.k128")}
                          </span>
                          {r.status === "pending" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (cancelUpgradeRequest(r.id)) {
                                  flash(t("billing.k075"));
                                  refresh();
                                }
                              }}
                            >{t("billing.k202")}</Button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </Card>

            {confirmPlan ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
                <button
                  type="button"
                  className="absolute inset-0"
                  aria-label={t("billing.k022")}
                  onClick={() => setConfirmPlan(null)}
                />
                <div className="relative z-10 w-full max-w-md rounded-2xl border border-steel-200 bg-white p-5 shadow-soft dark:border-steel-700 dark:bg-steel-900">
                  <h3 className="text-base font-extrabold">
                    {t("billing.k255", { name: L(confirmPlan.name) })}
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-steel-600 dark:text-steel-300">
                    <li>• {t("billing.k256")}</li>
                    <li>
                      • {t("billing.k257")}{" "}
                      <strong className="tabular-nums">
                        {formatSar(
                          confirmPlan.priceMonthly - (plan?.priceMonthly || 0),
                        )}
                      </strong>
                    </li>
                    <li>
                      •{" "}
                      {(confirmPlan.priceMonthly || 0) <
                      (plan?.priceMonthly || 0)
                        ? t("billing.k135")
                        : t("billing.k136")}
                    </li>
                  </ul>
                  <label className="mt-4 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={applyAtRenewal}
                      onChange={(e) => setApplyAtRenewal(e.target.checked)}
                    />{t("billing.k258")}</label>
                  <div className="mt-5 flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setConfirmPlan(null)}
                    >{t("billing.k259")}</Button>
                    <Button
                      onClick={() =>
                        requestUpgrade(
                          confirmPlan,
                          applyAtRenewal ? "renewal" : "immediate",
                        )
                      }
                    >{t("billing.k260")}</Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );
      })()}

      {tab === "settings" && (
        <Card className="max-w-2xl p-5">
          <CardHeader
            title={t("billing.k059")}
            subtitle={t("billing.k062")}
          />
          <div className="mt-3 grid gap-3">
            <Field label={t("billing.k056")}>
              <Input
                value={prefs.invoiceEmail}
                onChange={(e) =>
                  setPrefs((s) => ({ ...s, invoiceEmail: e.target.value }))
                }
              />
            </Field>
            <Field label={t("billing.k040")}>
              <Input
                value={prefs.taxNumber}
                onChange={(e) =>
                  setPrefs((s) => ({ ...s, taxNumber: e.target.value }))
                }
              />
            </Field>
            <Field label={t("billing.k106")}>
              <Textarea
                rows={3}
                value={prefs.billingAddress}
                onChange={(e) =>
                  setPrefs((s) => ({ ...s, billingAddress: e.target.value }))
                }
              />
            </Field>
            <Button
              onClick={() => {
                persistPrefs(prefs);
                flash(t("billing.k085"));
              }}
            >{t("billing.k261")}</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Fact({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-steel-200 bg-white px-3 py-2.5 dark:border-steel-700 dark:bg-steel-900/50">
      <p className="text-[11px] font-semibold text-steel-400">{label}</p>
      <p className="mt-1 text-sm font-extrabold tabular-nums text-steel-900 dark:text-steel-50">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[11px] text-steel-400">{hint}</p>
      ) : null}
    </div>
  );
}

function ActionRow({
  title,
  desc,
  onClick,
  primary,
}: {
  title: string;
  desc: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-start transition",
        primary
          ? "border-brand-300 bg-brand-500 text-white hover:bg-brand-600"
          : "border-steel-200 bg-white hover:border-steel-300 dark:border-steel-700 dark:bg-steel-900/40 dark:hover:border-steel-600",
      )}
    >
      <span>
        <span
          className={cn(
            "block text-sm font-bold",
            !primary && "text-steel-800 dark:text-steel-100",
          )}
        >
          {title}
        </span>
        <span
          className={cn(
            "mt-0.5 block text-[11px]",
            primary ? "text-white/80" : "text-steel-400",
          )}
        >
          {desc}
        </span>
      </span>
      <ChevronLeft
        className={cn(
          "h-4 w-4 shrink-0",
          primary ? "text-white/80" : "text-steel-400",
        )}
      />
    </button>
  );
}

function InvoicePill({ status, t }: { status: string; t: TFn }) {
  const label = invoiceStatusLabel(t, status);
  const tone =
    status === "paid"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
      : status === "open"
        ? "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100"
        : status === "failed"
          ? "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200"
          : "bg-steel-100 text-steel-600 dark:bg-steel-800 dark:text-steel-300";
  return (
    <span className={cn("rounded px-2 py-0.5 text-[11px] font-bold", tone)}>
      {label}
    </span>
  );
}

function UsageBar({
  label,
  used,
  max,
  unit = "",
  t,
}: {
  label: string;
  used: number;
  max: number;
  unit?: string;
  t: TFn;
}) {
  const pct = usagePct(used, max);
  const left = Math.max(0, max - used);
  return (
    <div>
      <div className="mb-1 flex justify-between gap-2 text-xs">
        <span className="font-semibold text-steel-600 dark:text-steel-300">
          {label}
        </span>
        <span className="tabular-nums text-steel-400">
          {t("billing.tpl.usageOfMax", {
            used,
            max,
            unitSuffix: unit ? ` ${unit}` : "",
          })}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-steel-100 dark:bg-steel-800">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 90
              ? "bg-red-500"
              : pct >= 70
                ? "bg-amber-500"
                : "bg-brand-500",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-steel-400">
        {pct >= 90
          ? t("billing.k111")
          : t("billing.tpl.usageRemaining", {
              left: `${left}${unit ? ` ${unit}` : ""}`,
              pct,
            })}
      </p>
    </div>
  );
}

function detectCardBrand(panDigits: string): string | null {
  if (!panDigits) return null;
  if (/^4/.test(panDigits)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(panDigits)) return "Mastercard";
  // Saudi Mada BIN ranges overlap Visa; 9xxxx prefix treated as mada (demo)
  if (/^(4405|4406|4464|4578|5433|5249)/.test(panDigits) || /^9/.test(panDigits))
    return "mada";
  return null;
}

function formatPanGroups(digits: string): string {
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function parseExpiry(
  value: string,
): { month: number; year: number } | null {
  const m = value.match(/^(\d{1,2})\s*\/\s*(\d{2}|\d{4})$/);
  if (!m) return null;
  const month = Number(m[1]);
  let year = Number(m[2]);
  if (year < 100) year += 2000;
  if (month < 1 || month > 12) return null;
  if (year < new Date().getFullYear()) return null;
  return { month, year };
}

function CardBrandMark({ brand }: { brand: string }) {
  const b = brand.toLowerCase();
  if (b.includes("visa")) {
    return (
      <svg viewBox="0 0 48 16" className="h-4 w-10" aria-label="Visa">
        <rect width="48" height="16" rx="2" fill="#1A1F71" />
        <text
          x="24"
          y="11.5"
          textAnchor="middle"
          fill="#fff"
          fontSize="8"
          fontWeight="700"
          fontStyle="italic"
          fontFamily="Arial, sans-serif"
        >
          VISA
        </text>
      </svg>
    );
  }
  if (b.includes("master")) {
    return (
      <svg viewBox="0 0 48 30" className="h-5 w-9" aria-label="Mastercard">
        <circle cx="18" cy="15" r="10" fill="#EB001B" />
        <circle cx="30" cy="15" r="10" fill="#F79E1B" />
        <path
          d="M24 7.5a10 10 0 0 1 0 15 10 10 0 0 1 0-15z"
          fill="#FF5F00"
        />
      </svg>
    );
  }
  if (b.includes("mada") || b.includes("\u0645\u062f\u0649")) {
    return (
      <span className="rounded bg-brand-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
        mada
      </span>
    );
  }
  return <CreditCard className="h-4 w-4 text-steel-400" />;
}

function PaymentCardVisual({ card }: { card: SavedPaymentCard }) {
  return (
    <div className="relative h-[148px] w-full max-w-[260px] shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-steel-800 via-steel-900 to-brand-900 p-4 text-white shadow-soft">
      <div className="pointer-events-none absolute -end-6 -top-8 h-28 w-28 rounded-full bg-brand-500/20" />
      <div className="pointer-events-none absolute -bottom-10 -start-4 h-24 w-24 rounded-full bg-white/5" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="rounded bg-white/95 px-1.5 py-1">
            <CardBrandMark brand={card.brand} />
          </div>
        </div>
        <p className="font-mono text-lg tracking-[0.18em]">
          •••• •••• •••• {card.last4}
        </p>
        <div className="flex items-end justify-between gap-2 text-[11px]">
          <div>
            <p className="opacity-60">HOLDER</p>
            <p className="mt-0.5 font-bold uppercase tracking-wide">
              {card.holderName}
            </p>
          </div>
          <div className="text-end">
            <p className="opacity-60">EXP</p>
            <p className="mt-0.5 font-bold tabular-nums">
              {String(card.expMonth).padStart(2, "0")}/
              {String(card.expYear).slice(-2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AltMethodTile({
  title,
  icon,
  active,
  status,
  actions,
}: {
  title: string;
  icon: ReactNode;
  active?: boolean;
  status?: string;
  actions: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[160px] flex-col rounded-2xl border bg-white p-4 dark:bg-steel-900",
        active
          ? "border-brand-400 ring-1 ring-brand-400/30"
          : "border-steel-200 dark:border-steel-700",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-700 dark:text-brand-300">
          {icon}
        </div>
        {status ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">
            {status}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-sm font-extrabold text-steel-900 dark:text-steel-50">
        {title}
      </p>
      <div className="mt-auto flex flex-col items-start gap-1.5 pt-4">
        {actions}
      </div>
    </div>
  );
}
