import { useMemo, useState, type ReactNode } from "react";
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
  INVOICE_STATUS_LABELS,
  loadBillingPrefs,
  loadInvoicesForTenant,
  loadPlans,
  loadSubscriptionForTenant,
  loadUpgradeRequests,
  saveBillingPrefs,
  setSubscriptionAutoRenewNote,
  submitUpgradeRequest,
  cancelUpgradeRequest,
  SUB_STATUS_LABELS,
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

const TABS: { id: TabId; label: string; hint: string; icon: typeof CreditCard }[] =
  [
    { id: "overview", label: "اشتراكي", hint: "الباقة والحالة", icon: Wallet },
    { id: "invoices", label: "الفواتير", hint: "الدفع والمستحقات", icon: FileText },
    { id: "payment", label: "وسيلة الدفع", hint: "البطاقة الافتراضية", icon: CreditCard },
    { id: "autorenew", label: "التجديد", hint: "تلقائي أو يدوي", icon: RefreshCw },
    { id: "upgrade", label: "تغيير الباقة", hint: "ترقية أو تخفيض", icon: ArrowUpRight },
    { id: "settings", label: "بيانات الفاتورة", hint: "البريد والعنوان", icon: Settings2 },
  ];

function usagePct(used: number, max: number): number {
  if (!max) return 0;
  return Math.min(100, Math.round((used / max) * 100));
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
}

function formatDateAr(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso.slice(0, 10));
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  try {
    return d.toLocaleDateString("ar-SA-u-nu-latn", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function statusTone(status: string): {
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
        title: "أنت في فترة تجريبية",
        body: "يمكنك استخدام النظام الآن. بعد انتهاء التجربة تُحوَّل الباقة إلى اشتراك مدفوع أو تُوقف تلقائياً حسب إعداداتك.",
      };
    case "past_due":
      return {
        banner:
          "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100",
        pill: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100",
        icon: AlertTriangle,
        title: "يوجد مبلغ متأخر",
        body: "ادفع الفاتورة المستحقة من تبويب الفواتير لاستمرار الخدمة دون انقطاع.",
      };
    case "expired":
    case "cancelled":
      return {
        banner:
          "border-red-200 bg-red-50 text-red-950 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100",
        pill: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200",
        icon: Ban,
        title: status === "cancelled" ? "الاشتراك ملغى" : "الاشتراك منتهٍ",
        body: "تواصل مع مسؤول المنصة أو اطلب باقة جديدة من تبويب تغيير الباقة.",
      };
    case "suspended":
      return {
        banner:
          "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100",
        pill: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100",
        icon: Ban,
        title: "الوصول معلّق مؤقتاً",
        body: "غالباً بسبب فاتورة غير مدفوعة أو إجراء من لوحة المنصة. راجع الفواتير أو تواصل مع الدعم.",
      };
    default:
      return {
        banner:
          "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100",
        pill: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
        icon: CheckCircle2,
        title: "اشتراكك يعمل بشكل طبيعي",
        body: "لا يلزم إجراء الآن. ستُجدَّد الباقة في الموعد المحدد أدناه إذا كان التجديد التلقائي مفعّلاً.",
      };
  }
}

export function OrganizationBillingPage() {
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
  const tone = statusTone(subStatus);
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
        ? "تم تسجيل الدفع. ستتحدث حالة الفاتورة فوراً."
        : "تعذّر تحديث الفاتورة. تأكد من تشغيل بيانات المنصة في نفس المتصفح.",
    );
    refresh();
  };

  const payAllOpen = () => {
    if (openInvoices.length === 0) {
      flash("لا توجد فواتير مستحقة.");
      return;
    }
    let okCount = 0;
    for (const inv of openInvoices) {
      if (updateInvoiceStatus(inv.id, "paid")) okCount += 1;
    }
    flash(
      okCount > 0
        ? `تم تسجيل دفع ${okCount} فاتورة.`
        : "تعذّر تحديث الفواتير.",
    );
    refresh();
  };

  const toggleAutoRenew = () => {
    const next = { ...prefs, autoRenew: !prefs.autoRenew };
    persistPrefs(next);
    setSubscriptionAutoRenewNote(tenant.id, next.autoRenew);
    flash(
      next.autoRenew
        ? "تم تفعيل التجديد التلقائي."
        : "تم إيقاف التجديد التلقائي.",
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
      flash("أدخل رقم البطاقة كاملاً (14–16 رقماً).");
      return;
    }
    const exp = parseExpiry(cardForm.expiry);
    if (!exp) {
      flash("تاريخ الانتهاء غير صالح. استخدم الصيغة MM/YY.");
      return;
    }
    if (!/^\d{3,4}$/.test(cardForm.cvv)) {
      flash("أدخل رمز الأمان CVV (3 أو 4 أرقام).");
      return;
    }
    const last4 = isMaskedEdit
      ? cards.find((c) => c.id === cardEditor.cardId)?.last4 ||
        panDigits.slice(-4)
      : panDigits.slice(-4);
    const brand =
      (!isMaskedEdit && detectCardBrand(panDigits)) ||
      cardForm.brand ||
      "بطاقة";

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
      cardEditor.mode === "add" ? "تمت إضافة البطاقة." : "تم تحديث البطاقة.",
    );
  };

  const uploadBankReceipt = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      flash("ارفع صورة للإيصال (JPG أو PNG).");
      return;
    }
    if (file.size > 2_500_000) {
      flash("حجم الصورة كبير. استخدم صورة أقل من 2.5 م.ب.");
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
      flash("تم رفع إيصال التحويل وهو قيد المراجعة.");
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
        ? "تم تفعيل Apple Pay للدفع اليدوي للفواتير."
        : key === "stc_pay"
          ? "تم تفعيل STC Pay للدفع اليدوي للفواتير."
          : "تم تفعيل Fawry للدفع اليدوي للفواتير.",
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
    flash("تم حذف البطاقة.");
  };

  const setDefaultCard = (cardId: string) => {
    persistPrefs({
      ...syncDefaultCard(cards, cardId),
      paymentFailure: null,
    });
    setCardMenuId(null);
    flash("تم تعيين البطاقة الافتراضية.");
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
      flash("هذه هي باقتك الحالية.");
      return;
    }
    if (pendingUpgradeFor(toPlan.id)) {
      flash("يوجد طلب قيد المراجعة لنفس الباقة.");
      return;
    }
    submitUpgradeRequest({
      tenantId: tenant.id,
      coreOrgId,
      fromPlanId: tenant.planId,
      toPlanId: toPlan.id,
      note: `طلب من ${user?.name || "مسؤول المنشأة"}`,
      applyAt,
    });
    flash(
      `تم إرسال طلب الانتقال إلى «${toPlan.name}». سيراجعه فريق المنصة.`,
    );
    setConfirmPlan(null);
    setComparePlanId(null);
    refresh();
    setTab("upgrade");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="الاشتراك والفوترة"
        subtitle="باقتك، فواتيرك، ووسيلة الدفع في مكان واحد"
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
        aria-label="أقسام الفوترة"
        className="flex gap-1 overflow-x-auto border-b border-steel-200 pb-px dark:border-steel-700"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2 text-start transition",
                active
                  ? "border-brand-500 text-brand-700 dark:text-brand-300"
                  : "border-transparent text-steel-500 hover:text-steel-800 dark:hover:text-steel-200",
              )}
            >
              <span className="flex items-center gap-1.5 text-sm font-bold">
                <t.icon className="h-3.5 w-3.5 opacity-70" />
                {t.label}
              </span>
              <span className="mt-0.5 block text-[11px] font-medium text-steel-400">
                {t.hint}
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
                    {SUB_STATUS_LABELS[subStatus] || subStatus}
                  </span>
                </div>
                <p className="mt-1 text-sm opacity-90">{tone.body}</p>
              </div>
              {openInvoices.length > 0 ? (
                <Button size="sm" onClick={() => setTab("invoices")}>
                  عرض الفواتير المستحقة ({openInvoices.length})
                </Button>
              ) : null}
            </div>
          </div>

          {/* 2) Plan at a glance */}
          <Card className="overflow-hidden p-0">
            <div className="grid lg:grid-cols-[1.4fr_1fr]">
              <div className="space-y-4 p-5">
                <div>
                  <p className="text-xs font-semibold text-steel-400">
                    باقتك الحالية
                  </p>
                  <h2 className="mt-1 text-2xl font-extrabold text-steel-900 dark:text-steel-50">
                    {plan?.name || "—"}
                  </h2>
                  <p className="mt-1 text-sm text-steel-500">
                    {plan?.description ||
                      "باقة إدارة المشاريع لمنشأتك على المنصة."}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Fact
                    label="المبلغ"
                    value={formatSar(
                      subscription?.mrrSar || plan?.priceMonthly || 0,
                    )}
                    hint={
                      subscription?.billingCycle === "annual"
                        ? "على أساس شهري · الفوترة سنوية"
                        : "يُحسب شهرياً"
                    }
                  />
                  <Fact
                    label="موعد التجديد"
                    value={formatDateAr(renewIso)}
                    hint={
                      renewDays === null
                        ? "غير محدد"
                        : renewDays < 0
                          ? "تجاوز الموعد"
                          : renewDays === 0
                            ? "اليوم"
                            : `بعد ${renewDays} يوماً`
                    }
                  />
                  <Fact
                    label="دورة الفوترة"
                    value={
                      subscription?.billingCycle === "annual"
                        ? "سنوية"
                        : "شهرية"
                    }
                    hint={
                      prefs.autoRenew
                        ? "التجديد التلقائي مفعّل"
                        : "التجديد اليدوي"
                    }
                  />
                </div>

                {(plan?.features || []).length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold text-steel-400">
                      ماذا تشمل الباقة
                    </p>
                    <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                      {(plan?.features || []).slice(0, 6).map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2 text-sm text-steel-700 dark:text-steel-200"
                        >
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-steel-100 bg-steel-50/80 p-5 dark:border-steel-800 dark:bg-steel-900/40 lg:border-s lg:border-t-0">
                <p className="text-xs font-semibold text-steel-400">
                  ماذا تريد أن تفعل؟
                </p>
                <div className="mt-3 space-y-2">
                  {openInvoices.length > 0 ? (
                    <ActionRow
                      title="ادفع فاتورة مستحقة"
                      desc={`${openInvoices.length} فاتورة تحتاج إجراء`}
                      onClick={() => setTab("invoices")}
                      primary
                    />
                  ) : null}
                  <ActionRow
                    title="غيّر الباقة"
                    desc={
                      nearLimit
                        ? "اقتربت من حدود الاستخدام — قد تحتاج ترقية"
                        : "ترقية أو الانتقال لباقة أخرى"
                    }
                    onClick={() => setTab("upgrade")}
                    primary={nearLimit && openInvoices.length === 0}
                  />
                  <ActionRow
                    title="إدارة التجديد التلقائي"
                    desc={
                      prefs.autoRenew
                        ? "مفعّل — سيتم الخصم في موعد التجديد"
                        : "متوقف — ستحتاج تجديداً يدوياً"
                    }
                    onClick={() => setTab("autorenew")}
                  />
                  <ActionRow
                    title="تحديث وسيلة الدفع"
                    desc={
                      prefs.defaultCard
                        ? `${prefs.defaultCard.brand} •••• ${prefs.defaultCard.last4}`
                        : "لم تُحفظ بطاقة بعد"
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
                <h3 className="text-sm font-extrabold text-steel-900 dark:text-steel-50">
                  استخدامك الحالي
                </h3>
                <p className="mt-0.5 text-xs text-steel-500">
                  مقارنة بحدود باقة «{plan?.name}». عند الاقتراب من 100٪ قد تحتاج
                  ترقية.
                </p>
              </div>
              {nearLimit ? (
                <Button size="sm" variant="outline" onClick={() => setTab("upgrade")}>
                  طلب ترقية
                </Button>
              ) : null}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <UsageBar
                label="المستخدمون"
                used={usage.users}
                max={limits?.maxUsers || tenant.seats}
              />
              <UsageBar
                label="المشاريع"
                used={usage.projects}
                max={limits?.maxProjects || 100}
              />
              <UsageBar
                label="التخزين"
                used={usage.storageGb}
                max={limits?.maxStorageGb || 100}
                unit="ج.ب"
              />
            </div>
          </Card>

          {/* 4) Latest invoices preview */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold">آخر الفواتير</h3>
                <p className="text-xs text-steel-500">
                  المبالغ تشمل ضريبة القيمة المضافة 15٪
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setTab("invoices")}>
                كل الفواتير
                <ChevronLeft className="h-3.5 w-3.5" />
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
                      استحقاق {formatDateAr(inv.dueDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums font-bold">
                      {formatSar(inv.totalSar)}
                    </span>
                    <InvoicePill status={inv.status} />
                    {inv.status === "open" || inv.status === "failed" ? (
                      <Button size="sm" onClick={() => payInvoice(inv.id)}>
                        ادفع
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
              {invoices.length === 0 ? (
                <li className="py-6 text-center text-sm text-steel-400">
                  لا توجد فواتير بعد.
                </li>
              ) : null}
            </ul>
          </Card>

          {/* 5) Quiet history */}
          <div className="rounded-xl border border-steel-200 dark:border-steel-700">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-start text-sm font-bold text-steel-700 dark:text-steel-200"
              onClick={() => setShowHistory((v) => !v)}
            >
              سجل التغييرات على الاشتراك
              <span className="text-xs font-semibold text-steel-400">
                {showHistory ? "إخفاء" : "عرض"}
              </span>
            </button>
            {showHistory ? (
              <ul className="space-y-2 border-t border-steel-100 px-4 py-3 text-sm dark:border-steel-800">
                {(subscription?.history || []).map((h, i) => (
                  <li
                    key={`${h.at}-${i}`}
                    className="flex flex-wrap justify-between gap-2 text-steel-600 dark:text-steel-300"
                  >
                    <span>{h.text}</span>
                    <span className="text-xs text-steel-400">
                      {h.at.slice(0, 16).replace("T", " ")}
                    </span>
                  </li>
                ))}
                {!subscription?.history?.length ? (
                  <li className="text-steel-400">لا يوجد سجل بعد.</li>
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
                    ? `لديك ${openInvoices.length} فاتورة تحتاج دفعاً`
                    : invoices.length === 0
                      ? "لا توجد فواتير بعد"
                      : "كل الفواتير مسدّدة"}
                </p>
                <p className="mt-1 text-sm opacity-90">
                  {openInvoices.length > 0
                    ? `المبلغ المطلوب الآن ${formatSar(dueTotalSar)} (شامل ضريبة القيمة المضافة 15٪). ادفع من البطاقات أدناه.`
                    : invoices.length === 0
                      ? "عند إصدار فاتورة من المنصة ستظهر هنا مع المبلغ وآخر موعد للدفع."
                      : "لا يلزم إجراء الآن. يمكنك مراجعة الفواتير المدفوعة في القائمة أسفل الصفحة."}
                </p>
              </div>
              {openInvoices.length > 0 ? (
                <Button size="sm" onClick={payAllOpen}>
                  ادفع الكل ({openInvoices.length})
                </Button>
              ) : null}
            </div>
          </div>

          {/* 2) Summary + actions */}
          <Card className="overflow-hidden p-0">
            <div className="grid lg:grid-cols-[1.4fr_1fr]">
              <div className="space-y-4 p-5">
                <div>
                  <p className="text-xs font-semibold text-steel-400">
                    ملخص الفوترة
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold text-steel-900 dark:text-steel-50">
                    فواتير منشأتك
                  </h2>
                  <p className="mt-1 text-sm text-steel-500">
                    كل مبلغ ظاهر هنا نهائي ويشمل الضريبة. ادفع المستحق قبل آخر
                    موعد لتجنّب تعليق الخدمة.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Fact
                    label="مطلوب الآن"
                    value={formatSar(dueTotalSar)}
                    hint={
                      openInvoices.length
                        ? `${openInvoices.length} فاتورة مفتوحة`
                        : "لا مستحقات"
                    }
                  />
                  <Fact
                    label="مدفوع سابقاً"
                    value={formatSar(paidTotalSar)}
                    hint={`${paidInvoices.length} فاتورة`}
                  />
                  <Fact
                    label="إجمالي الفواتير"
                    value={String(invoices.length)}
                    hint="كل الحالات"
                  />
                </div>
              </div>

              <div className="border-t border-steel-100 bg-steel-50/80 p-5 dark:border-steel-800 dark:bg-steel-900/40 lg:border-s lg:border-t-0">
                <p className="text-xs font-semibold text-steel-400">
                  ماذا تريد أن تفعل؟
                </p>
                <div className="mt-3 space-y-2">
                  {openInvoices.length > 0 ? (
                    <ActionRow
                      title="ادفع المستحقات"
                      desc={`${formatSar(dueTotalSar)} · ${openInvoices.length} فاتورة`}
                      onClick={payAllOpen}
                      primary
                    />
                  ) : null}
                  <ActionRow
                    title="حدّث وسيلة الدفع"
                    desc={
                      prefs.defaultCard
                        ? `${prefs.defaultCard.brand} •••• ${prefs.defaultCard.last4}`
                        : "أضف بطاقة قبل الدفع التالي"
                    }
                    onClick={() => setTab("payment")}
                    primary={openInvoices.length === 0 && !prefs.defaultCard}
                  />
                  <ActionRow
                    title="بيانات الفاتورة"
                    desc="البريد والعنوان الضريبي الظاهران على الفاتورة"
                    onClick={() => setTab("settings")}
                  />
                  <ActionRow
                    title="العودة للاشتراك"
                    desc={`باقة ${plan?.name || "الحالية"}`}
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
                  label: `الكل (${invoices.length})`,
                },
                {
                  id: "needs_action" as const,
                  label: `تحتاج دفعاً (${openInvoices.length})`,
                },
                {
                  id: "paid" as const,
                  label: `مدفوعة (${paidInvoices.length})`,
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
                    ? "لا توجد فواتير لهذه المنشأة."
                    : "لا توجد فواتير في هذا التصنيف."}
                </p>
                {invoiceFilter !== "all" ? (
                  <Button
                    className="mt-3"
                    size="sm"
                    variant="outline"
                    onClick={() => setInvoiceFilter("all")}
                  >
                    عرض كل الفواتير
                  </Button>
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
                          <InvoicePill status={inv.status} />
                          {overdue ? (
                            <span className="rounded bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-800 dark:bg-red-500/20 dark:text-red-200">
                              متأخرة
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-steel-500">
                          {needsPay
                            ? overdue
                              ? `تجاوزت آخر موعد للدفع (${formatDateAr(inv.dueDate)}). ادفع في أقرب وقت.`
                              : dueDays === 0
                                ? "آخر موعد للدفع هو اليوم."
                                : dueDays !== null && dueDays <= 7
                                  ? `آخر موعد للدفع بعد ${dueDays} يوماً (${formatDateAr(inv.dueDate)}).`
                                  : `ادفع قبل ${formatDateAr(inv.dueDate)}.`
                            : inv.status === "paid"
                              ? `مدفوعة${inv.paidAt ? ` في ${formatDateAr(inv.paidAt)}` : ""}.`
                              : `الحالة: ${INVOICE_STATUS_LABELS[inv.status] || inv.status}.`}
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="text-xl font-extrabold tabular-nums text-steel-900 dark:text-steel-50">
                          {formatSar(inv.totalSar)}
                        </p>
                        <p className="text-[11px] text-steel-400">
                          شامل الضريبة · ضريبة {formatSar(inv.vatSar)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 border-t border-steel-100 pt-3 text-xs text-steel-500 dark:border-steel-800 sm:grid-cols-3">
                      <div>
                        <p className="font-semibold text-steel-400">
                          تاريخ الإصدار
                        </p>
                        <p className="mt-0.5 font-bold text-steel-700 dark:text-steel-200">
                          {formatDateAr(inv.issueDate)}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-steel-400">
                          آخر موعد للدفع
                        </p>
                        <p className="mt-0.5 font-bold text-steel-700 dark:text-steel-200">
                          {formatDateAr(inv.dueDate)}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-steel-400">
                          قبل الضريبة
                        </p>
                        <p className="mt-0.5 font-bold tabular-nums text-steel-700 dark:text-steel-200">
                          {formatSar(inv.subtotalSar)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] text-steel-400">
                        {needsPay
                          ? prefs.defaultCard
                            ? `سيتم التسجيل على ${prefs.defaultCard.brand} •••• ${prefs.defaultCard.last4} (ديمو)`
                            : "يفضّل حفظ بطاقة من «وسيلة الدفع» قبل الدفع المتكرر"
                          : "لا يلزم إجراء على هذه الفاتورة"}
                      </p>
                      {needsPay ? (
                        <Button onClick={() => payInvoice(inv.id)}>
                          ادفع {formatSar(inv.totalSar)}
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
            <p className="font-bold text-steel-800 dark:text-steel-100">
              كيف تقرأ الفاتورة؟
            </p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>
                • <strong>مستحقة</strong> = لم تُدفع بعد — يظهر زر الدفع.
              </li>
              <li>
                • <strong>فشل الدفع</strong> = حاول الدفع مرة أخرى أو حدّث البطاقة.
              </li>
              <li>
                • <strong>مدفوعة</strong> = اكتمل السداد — لا إجراء مطلوب.
              </li>
              <li>• المبلغ النهائي دائماً شامل ضريبة القيمة المضافة 15٪.</li>
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
                <p className="text-sm font-extrabold text-red-800 dark:text-red-200">
                  فشل تجديد الاشتراك
                </p>
                <p className="mt-1 text-sm text-red-700/90 dark:text-red-100/90">
                  رفض البنك العملية من البطاقة المنتهية بـ{" "}
                  {prefs.paymentFailure.cardLast4}. سنعيد المحاولة في{" "}
                  {formatDateAr(prefs.paymentFailure.retryAt)}. يتوقف الوصول بعد{" "}
                  {prefs.paymentFailure.accessUntil}.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={dismissFailureTryOther}
                >
                  جرّب بطاقة أخرى
                </Button>
                {defaultCard ? (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => removeCardById(defaultCard.id)}
                  >
                    حذف البطاقة
                  </Button>
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
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                      البطاقة الافتراضية
                    </span>
                    {daysToCardExpiry(defaultCard) <= 45 ? (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">
                        تنتهي خلال {Math.max(0, daysToCardExpiry(defaultCard))}{" "}
                        يوماً
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-base font-extrabold text-steel-900 dark:text-steel-50">
                    سيُخصم الاشتراك من هذه البطاقة
                  </p>
                  <p className="mt-1 text-sm text-steel-500">
                    التجديد القادم {formatDateAr(renewIso)} ·{" "}
                    {formatSar(
                      subscription?.mrrSar || plan?.priceMonthly || 0,
                    )}
                    {prefs.autoRenew
                      ? " · التجديد التلقائي مفعّل"
                      : " · التجديد التلقائي متوقف"}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      onClick={() =>
                        openCardEditor("replace", defaultCard.id)
                      }
                    >
                      تحديث البطاقة
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => openCardEditor("edit", defaultCard.id)}
                    >
                      تعديل البيانات
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <CreditCard className="h-8 w-8 text-steel-300" />
                <p className="mt-3 text-sm font-extrabold">لا بطاقة افتراضية</p>
                <p className="mt-1 text-sm text-steel-500">
                  أضف بطاقة لاستخدامها في التجديد ودفع الفواتير.
                </p>
                <Button className="mt-4" onClick={() => openCardEditor("add")}>
                  إضافة بطاقة
                </Button>
              </div>
            )}
          </Card>

          {/* Other cards */}
          <Card className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-steel-100 px-5 py-4 dark:border-steel-800">
              <div>
                <h3 className="text-sm font-extrabold text-steel-900 dark:text-steel-50">
                  بطاقات أخرى
                </h3>
                <p className="mt-0.5 text-xs text-steel-400">
                  بطاقات احتياطية — عيّن واحدة كافتراضية عند الحاجة
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openCardEditor("add")}
              >
                <Plus className="h-3.5 w-3.5" />
                إضافة بطاقة
              </Button>
            </div>
            <ul>
              {otherCards.length === 0 ? (
                <li className="px-5 py-8 text-center text-sm text-steel-400">
                  لا توجد بطاقات إضافية بعد.
                </li>
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
                          تنتهي {String(c.expMonth).padStart(2, "0")}/
                          {c.expYear}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setDefaultCard(c.id)}
                      >
                        تعيين كافتراضي
                      </Button>
                      <div className="relative">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="المزيد"
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
                            >
                              تعديل
                            </button>
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-start text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                              onClick={() => removeCardById(c.id)}
                            >
                              حذف
                            </button>
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
            <h3 className="text-sm font-extrabold text-steel-900 dark:text-steel-50">
              وسائل دفع أخرى
            </h3>
            <p className="mt-1 text-xs text-steel-500">
              للدفع اليدوي فقط — لا تجدّد الاشتراك تلقائياً.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <AltMethodTile
                title="تحويل بنكي"
                icon={<Building2 className="h-5 w-5" />}
                active={prefs.altMethods.bank.enabled}
                status={
                  prefs.altMethods.bank.status === "review"
                    ? "قيد المراجعة"
                    : prefs.altMethods.bank.status === "active"
                      ? "مفعّل"
                      : undefined
                }
                actions={
                  <div className="w-full space-y-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-brand-700 dark:text-brand-300">
                      <Upload className="h-3.5 w-3.5" />
                      رفع إيصال التحويل
                      <input
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
                          alt="إيصال التحويل"
                          className="h-20 w-full object-cover"
                        />
                        <p className="truncate px-2 py-1 text-[10px] text-steel-400">
                          {prefs.altMethods.bank.receiptName || "إيصال"}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-steel-400">
                        ارفع صورة الإيصال بعد التحويل.
                      </p>
                    )}
                    <button
                      type="button"
                      className="text-xs font-semibold text-steel-500 hover:underline"
                      onClick={() => setAccountDetailsOpen(true)}
                    >
                      عرض بيانات الحساب
                    </button>
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
                          <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                            جاهز للدفع اليدوي
                          </p>
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
                              flash(`تم إيقاف ${m.title}.`);
                            }}
                          >
                            إيقاف
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setActivatePrompt(m.key)}
                        >
                          تفعيل
                        </Button>
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
                aria-label="إغلاق"
                onClick={() => setCardEditor(null)}
              />
              <div className="relative z-10 w-full max-w-md rounded-2xl border border-steel-200 bg-white p-5 shadow-soft dark:border-steel-700 dark:bg-steel-900">
                <h3 className="text-base font-extrabold">
                  {cardEditor.mode === "add"
                    ? "إضافة بطاقة"
                    : cardEditor.mode === "replace"
                      ? "تحديث البطاقة الافتراضية"
                      : "تعديل بيانات البطاقة"}
                </h3>
                <p className="mt-1 text-xs text-steel-400">
                  أدخل بيانات البطاقة كاملة. لا نُخزّن الرقم الكامل أو CVV بعد
                  الحفظ (ديمو).
                </p>
                <div className="mt-4 space-y-3">
                  <Field label="اسم حامل البطاقة">
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

                  <Field label="رقم البطاقة">
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
                      14–16 رقماً · يُكتشف النوع تلقائياً (Visa / Mastercard /
                      مدى)
                    </p>
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="تاريخ الانتهاء">
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
                    >
                      إلغاء
                    </Button>
                    <Button onClick={saveCard}>حفظ</Button>
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
                aria-label="إغلاق"
                onClick={() => setActivatePrompt(null)}
              />
              <div className="relative z-10 w-full max-w-md rounded-2xl border border-steel-200 bg-white p-5 shadow-soft dark:border-steel-700 dark:bg-steel-900">
                <h3 className="text-base font-extrabold">
                  تفعيل{" "}
                  {activatePrompt === "apple_pay"
                    ? "Apple Pay"
                    : activatePrompt === "stc_pay"
                      ? "STC Pay"
                      : "Fawry"}
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-steel-600 dark:text-steel-300">
                  <li>
                    • تُربط الوسيلة بحساب منشأتك لاستخدامها عند دفع فاتورة يدوياً.
                  </li>
                  <li>
                    • لن تُستخدم للتجديد التلقائي — التجديد يبقى على البطاقة
                    الافتراضية فقط.
                  </li>
                  <li>
                    • عند الدفع ستظهر هذه الوسيلة كخيار إضافي في شاشة الفاتورة.
                  </li>
                  <li>• يمكنك إيقافها في أي وقت من نفس المكان.</li>
                </ul>
                <div className="mt-5 flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setActivatePrompt(null)}
                  >
                    إلغاء
                  </Button>
                  <Button onClick={confirmActivateWallet}>تأكيد التفعيل</Button>
                </div>
              </div>
            </div>
          ) : null}

          {accountDetailsOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
              <button
                type="button"
                className="absolute inset-0"
                aria-label="إغلاق"
                onClick={() => setAccountDetailsOpen(false)}
              />
              <div className="relative z-10 w-full max-w-md rounded-2xl border border-steel-200 bg-white p-5 shadow-soft dark:border-steel-700 dark:bg-steel-900">
                <h3 className="text-base font-extrabold">بيانات التحويل البنكي</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-3 border-b border-steel-100 py-2 dark:border-steel-800">
                    <dt className="text-steel-400">البنك</dt>
                    <dd className="font-bold">البنك الأهلي السعودي (تجريبي)</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-steel-100 py-2 dark:border-steel-800">
                    <dt className="text-steel-400">IBAN</dt>
                    <dd className="font-mono text-xs font-bold">
                      SA00 0000 0000 0000 0000 0000
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 py-2">
                    <dt className="text-steel-400">المستفيد</dt>
                    <dd className="font-bold">
                      {organization?.name || "منشأة المنصة"}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-steel-400">
                  بعد التحويل ارفع صورة الإيصال من بطاقة «تحويل بنكي».
                </p>
                <div className="mt-4 flex justify-end">
                  <Button onClick={() => setAccountDetailsOpen(false)}>
                    حسناً
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <p className="text-center text-[11px] text-steel-400">
            ديمو للعرض — لا تُرسل بيانات البطاقة لبوابة دفع حقيقية
          </p>
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
                    ? "التجديد التلقائي يعمل"
                    : "التجديد التلقائي متوقف"}
                </p>
                <p className="mt-1 text-sm opacity-90">
                  {prefs.autoRenew
                    ? `في ${formatDateAr(renewIso)} سيُخصم مبلغ الباقة من بطاقتك الافتراضية دون إجراء منك.`
                    : "لن يُخصم شيء تلقائياً. إذا انتهى الاشتراك دون تجديد يدوي قد يتوقف الوصول."}
                </p>
              </div>
            </div>
          </div>

          <Card className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-steel-100 px-5 py-4 dark:border-steel-800">
              <div>
                <h2 className="text-base font-extrabold text-steel-900 dark:text-steel-50">
                  التحكم بالتجديد
                </h2>
                <p className="mt-0.5 text-sm text-steel-500">
                  باقة {plan?.name || "الحالية"} ·{" "}
                  {formatSar(subscription?.mrrSar || plan?.priceMonthly || 0)} /
                  شهر
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.autoRenew}
                onClick={() => {
                  if (!prefs.autoRenew && !defaultCard) {
                    flash("أضف بطاقة افتراضية أولاً من تاب وسيلة الدفع.");
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
                <p className="text-[11px] font-semibold text-steel-400">
                  موعد التجديد
                </p>
                <p className="mt-1 text-sm font-extrabold tabular-nums">
                  {formatDateAr(renewIso)}
                </p>
                <p className="mt-0.5 text-[11px] text-steel-400">
                  {renewDays === null
                    ? "غير محدد"
                    : renewDays < 0
                      ? "تجاوز الموعد"
                      : renewDays === 0
                        ? "اليوم"
                        : `بعد ${renewDays} يوماً`}
                </p>
              </div>
              <div className="rounded-xl border border-steel-200 bg-steel-50/70 px-3 py-3 dark:border-steel-700 dark:bg-steel-900/40">
                <p className="text-[11px] font-semibold text-steel-400">
                  المبلغ المتوقع
                </p>
                <p className="mt-1 text-sm font-extrabold tabular-nums">
                  {formatSar(subscription?.mrrSar || plan?.priceMonthly || 0)}
                </p>
                <p className="mt-0.5 text-[11px] text-steel-400">
                  شامل ضريبة القيمة المضافة حسب الفاتورة
                </p>
              </div>
              <div className="rounded-xl border border-steel-200 bg-steel-50/70 px-3 py-3 dark:border-steel-700 dark:bg-steel-900/40">
                <p className="text-[11px] font-semibold text-steel-400">
                  وسيلة الخصم
                </p>
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
                    >
                      تغيير البطاقة
                    </button>
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-sm font-extrabold text-amber-700">
                      لا بطاقة
                    </p>
                    <button
                      type="button"
                      className="mt-0.5 text-[11px] font-bold text-brand-700 hover:underline dark:text-brand-300"
                      onClick={() => setTab("payment")}
                    >
                      إضافة بطاقة
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="border-t border-steel-100 px-5 py-4 dark:border-steel-800">
              <p className="text-xs font-bold text-steel-500">ماذا يحدث؟</p>
              <ul className="mt-2 space-y-2 text-sm text-steel-600 dark:text-steel-300">
                {prefs.autoRenew ? (
                  <>
                    <li className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      في موعد التجديد تُصدر فاتورة وتُخصم من البطاقة الافتراضية.
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      إذا فشل الدفع ستصلك تنبيهاً ويمكنك تحديث البطاقة.
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      يمكنك الإيقاف في أي وقت قبل يوم التجديد.
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      لن يُخصم أي مبلغ تلقائياً في موعد التجديد.
                    </li>
                    <li className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      ستحتاج دفع الفاتورة يدوياً من تاب الفواتير لتجديد الاشتراك.
                    </li>
                    <li className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      التفعيل يتطلب بطاقة افتراضية محفوظة.
                    </li>
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
                  flash("أضف بطاقة افتراضية أولاً من تاب وسيلة الدفع.");
                  setTab("payment");
                  return;
                }
                toggleAutoRenew();
              }}
            >
              {prefs.autoRenew
                ? "إيقاف التجديد التلقائي"
                : "تفعيل التجديد التلقائي"}
            </Button>
            <Button variant="secondary" onClick={() => setTab("payment")}>
              إدارة وسيلة الدفع
            </Button>
            <Button variant="ghost" onClick={() => setTab("invoices")}>
              عرض الفواتير
            </Button>
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
                    باقتك الحالية: {plan?.name || "—"}
                  </p>
                  <p className="mt-1 text-sm opacity-90">
                    {usageHigh
                      ? "استخدامك يقترب من حدود الباقة. الترقية تمنحك مساحة أكبر بعد موافقة المنصة."
                      : "حدود الباقة كافية حالياً. يمكنك المقارنة وطلب تغيير عند الحاجة."}
                  </p>
                  <p className="mt-2 text-xs opacity-80">
                    المستخدمون {usage.users}/
                    {limits?.maxUsers || tenant.seats} · المشاريع{" "}
                    {usage.projects}/{limits?.maxProjects || "—"} · التخزين{" "}
                    {usage.storageGb}/{limits?.maxStorageGb || "—"} ج.ب
                    {pendingCount > 0
                      ? ` · ${pendingCount} طلب قيد المراجعة`
                      : ""}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-steel-500">
              اختر باقة للمقارنة. الطلب يُرسل لفريق المنصة للموافقة — لا يتغيّر
              اشتراكك فوراً.
            </p>

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
                      <p className="text-base font-extrabold">{p.name}</p>
                      <div className="flex flex-wrap gap-1">
                        {current ? (
                          <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                            الحالية
                          </span>
                        ) : null}
                        {isRecommended ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                            موصى بها
                          </span>
                        ) : null}
                        {!current && isUpgrade ? (
                          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-800 dark:bg-sky-500/20 dark:text-sky-200">
                            ترقية
                          </span>
                        ) : null}
                        {!current && isDowngrade ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">
                            تخفيض
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-steel-500">
                      {p.description}
                    </p>
                    <p className="mt-3 text-2xl font-extrabold tabular-nums">
                      {formatSar(p.priceMonthly)}
                      <span className="text-xs font-semibold text-steel-400">
                        {" "}
                        / شهر
                      </span>
                    </p>
                    {p.priceAnnual ? (
                      <p className="text-[11px] text-steel-400">
                        أو {formatSar(p.priceAnnual)} / سنة
                      </p>
                    ) : null}

                    <div className="mt-3 space-y-1.5 text-xs text-steel-600 dark:text-steel-300">
                      <p>
                        حتى {p.limits?.maxUsers ?? p.seatsIncluded} مستخدم ·{" "}
                        {p.limits?.maxProjects ?? "—"} مشروع ·{" "}
                        {p.limits?.maxStorageGb ?? "—"} ج.ب
                      </p>
                      {current ? (
                        <p className="text-steel-400">
                          استخدامك الآن: {usage.users} مستخدم · {usage.projects}{" "}
                          مشروع · {usage.storageGb} ج.ب
                        </p>
                      ) : null}
                      {blockedDowngrade ? (
                        <p className="font-semibold text-amber-700 dark:text-amber-300">
                          استخدامك أعلى من حدود هذه الباقة.
                        </p>
                      ) : null}
                    </div>

                    <ul className="mt-3 flex-1 space-y-1.5 text-xs text-steel-600 dark:text-steel-300">
                      {p.features.slice(0, 3).map((f) => (
                        <li key={f} className="flex gap-1.5">
                          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                          {f}
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
                        ? "باقتك الحالية"
                        : pending
                          ? "طلب قيد المراجعة"
                          : blockedDowngrade
                            ? "غير مناسبة للاستخدام الحالي"
                            : isUpgrade
                              ? "طلب ترقية"
                              : "طلب تغيير الباقة"}
                    </Button>
                  </Card>
                );
              })}
            </div>

            {comparePlan && comparePlan.id !== tenant.planId ? (
              <Card className="p-5">
                <h3 className="text-sm font-extrabold">مقارنة سريعة</h3>
                <p className="mt-1 text-xs text-steel-500">
                  {plan?.name} ← {comparePlan.name}
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b border-steel-200 text-start dark:border-steel-700">
                        <th className="py-2 font-bold">البند</th>
                        <th className="py-2 font-bold">الحالية</th>
                        <th className="py-2 font-bold">المقترحة</th>
                      </tr>
                    </thead>
                    <tbody className="text-steel-700 dark:text-steel-200">
                      <tr className="border-b border-steel-100 dark:border-steel-800">
                        <td className="py-2 text-steel-400">السعر الشهري</td>
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
                        <td className="py-2 text-steel-400">المستخدمون</td>
                        <td className="py-2">
                          {usage.users} /{" "}
                          {plan?.limits?.maxUsers ?? plan?.seatsIncluded}
                        </td>
                        <td className="py-2 font-bold">
                          حد {comparePlan.limits?.maxUsers ?? comparePlan.seatsIncluded}
                        </td>
                      </tr>
                      <tr className="border-b border-steel-100 dark:border-steel-800">
                        <td className="py-2 text-steel-400">المشاريع</td>
                        <td className="py-2">
                          {usage.projects} / {plan?.limits?.maxProjects ?? "—"}
                        </td>
                        <td className="py-2 font-bold">
                          حد {comparePlan.limits?.maxProjects ?? "—"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 text-steel-400">التخزين</td>
                        <td className="py-2">
                          {usage.storageGb} /{" "}
                          {plan?.limits?.maxStorageGb ?? "—"} ج.ب
                        </td>
                        <td className="py-2 font-bold">
                          حد {comparePlan.limits?.maxStorageGb ?? "—"} ج.ب
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
                    متابعة طلب «{comparePlan.name}»
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setComparePlanId(null)}
                  >
                    إخفاء المقارنة
                  </Button>
                </div>
              </Card>
            ) : null}

            <Card className="p-5">
              <CardHeader
                title="طلباتك المرسلة"
                subtitle="حالة طلبات تغيير الباقة لدى فريق المنصة"
              />
              <ul className="mt-3 space-y-2 text-sm">
                {upgradeRequests.length === 0 ? (
                  <li className="text-steel-400">لم تُرسل طلبات بعد.</li>
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
                            من {from} إلى {to}
                          </p>
                          <p className="text-[11px] text-steel-400">
                            {formatDateAr(r.createdAt)}
                            {r.applyAt === "renewal"
                              ? " · يُطبَّق عند التجديد"
                              : " · يُطبَّق بعد الموافقة"}
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
                              ? "قيد المراجعة"
                              : r.status === "approved"
                                ? "تمت الموافقة"
                                : r.status === "cancelled"
                                  ? "ملغى"
                                  : "مرفوض"}
                          </span>
                          {r.status === "pending" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (cancelUpgradeRequest(r.id)) {
                                  flash("تم إلغاء الطلب.");
                                  refresh();
                                }
                              }}
                            >
                              إلغاء
                            </Button>
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
                  aria-label="إغلاق"
                  onClick={() => setConfirmPlan(null)}
                />
                <div className="relative z-10 w-full max-w-md rounded-2xl border border-steel-200 bg-white p-5 shadow-soft dark:border-steel-700 dark:bg-steel-900">
                  <h3 className="text-base font-extrabold">
                    تأكيد طلب «{confirmPlan.name}»
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-steel-600 dark:text-steel-300">
                    <li>
                      • يُرسل الطلب لفريق المنصة — لا يتغيّر اشتراكك مباشرة.
                    </li>
                    <li>
                      • الفرق الشهري:{" "}
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
                        ? "هذا تخفيض — تأكد أن حدود الباقة الجديدة تكفي استخدامك."
                        : "هذا ترقية — ستحصل على حدود أعلى بعد الموافقة."}
                    </li>
                  </ul>
                  <label className="mt-4 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={applyAtRenewal}
                      onChange={(e) => setApplyAtRenewal(e.target.checked)}
                    />
                    تطبيق عند التجديد القادم بدل التطبيق بعد الموافقة مباشرة
                  </label>
                  <div className="mt-5 flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setConfirmPlan(null)}
                    >
                      رجوع
                    </Button>
                    <Button
                      onClick={() =>
                        requestUpgrade(
                          confirmPlan,
                          applyAtRenewal ? "renewal" : "immediate",
                        )
                      }
                    >
                      إرسال الطلب
                    </Button>
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
            title="بيانات تظهر على الفاتورة"
            subtitle="تأكد أن البريد والعنوان صحيحان قبل إصدار الفواتير القادمة"
          />
          <div className="mt-3 grid gap-3">
            <Field label="بريد استلام الفواتير">
              <Input
                value={prefs.invoiceEmail}
                onChange={(e) =>
                  setPrefs((s) => ({ ...s, invoiceEmail: e.target.value }))
                }
              />
            </Field>
            <Field label="الرقم الضريبي">
              <Input
                value={prefs.taxNumber}
                onChange={(e) =>
                  setPrefs((s) => ({ ...s, taxNumber: e.target.value }))
                }
              />
            </Field>
            <Field label="عنوان الفوترة">
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
                flash("تم حفظ بيانات الفاتورة.");
              }}
            >
              حفظ البيانات
            </Button>
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

function InvoicePill({ status }: { status: string }) {
  const label = INVOICE_STATUS_LABELS[status] || status;
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
}: {
  label: string;
  used: number;
  max: number;
  unit?: string;
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
          {used}
          {unit ? ` ${unit}` : ""} من {max}
          {unit ? ` ${unit}` : ""}
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
          ? "قارب الحد الأقصى"
          : `متبقّي ${left}${unit ? ` ${unit}` : ""} · ${pct}% مستخدم`}
      </p>
    </div>
  );
}

function detectCardBrand(panDigits: string): string | null {
  if (!panDigits) return null;
  if (/^4/.test(panDigits)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(panDigits)) return "Mastercard";
  // Saudi Mada ranges often overlap; treat 4405/4406/4464 etc. as مدى when known,
  // otherwise if starts with 9 treat as مدى (demo heuristic)
  if (/^(4405|4406|4464|4578|5433|5249)/.test(panDigits) || /^9/.test(panDigits))
    return "مدى";
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
  if (b.includes("مدى") || b.includes("mada")) {
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
