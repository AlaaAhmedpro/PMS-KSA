import { useMemo, useState } from "react";
import {
  Megaphone,
  Plus,
  Trash2,
  Globe,
  Building2,
  ExternalLink,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input, Textarea } from "../components/ui/Input";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { useData } from "../store/DataStore";
import { useAuth } from "../store/AuthContext";
import {
  NEWS_CATEGORY_LABELS,
  NEWS_CATEGORY_STYLE,
} from "../lib/constants";
import { formatShortDate, todayISO } from "../lib/format";
import { cn } from "../lib/cn";
import { usePagination, PAGE_SIZE_DEFAULT } from "../hooks/usePagination";
import { Pagination } from "../components/ui/Pagination";
import type { NewsCategory, NewsItem } from "../lib/types";

export function NewsAdmin() {
  const { news, addNews, updateNews, removeNews, branches } = useData();
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [category, setCategory] = useState<NewsCategory>("goals");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState("");
  const [targetType, setTargetType] = useState<"all" | "branch">("all");
  const [branchId, setBranchId] = useState("hq");

  const today = todayISO();
  const isEditing = editingId !== null;

  const normalizeLink = (raw: string) => {
    const v = raw.trim();
    if (!v) return undefined;
    return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  };

  const resetForm = () => {
    setEditingId(null);
    setText("");
    setLink("");
    setCategory("goals");
    setStartDate(todayISO());
    setEndDate("");
    setTargetType("all");
    setBranchId("hq");
  };

  const startEdit = (n: NewsItem) => {
    setEditingId(n.id);
    setText(n.text);
    setLink(n.link ?? "");
    setCategory(n.category);
    setStartDate(n.startDate);
    setEndDate(n.endDate);
    if (n.target.type === "branch") {
      setTargetType("branch");
      setBranchId(n.target.branchId);
    } else {
      setTargetType("all");
      setBranchId("hq");
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !endDate) return;

    if (isEditing && editingId) {
      updateNews(editingId, {
        text: text.trim(),
        category,
        startDate,
        endDate,
        target:
          targetType === "all" ? { type: "all" } : { type: "branch", branchId },
        link: normalizeLink(link),
      });
    } else {
      addNews({
        id: crypto.randomUUID(),
        text: text.trim(),
        category,
        startDate,
        endDate,
        target:
          targetType === "all" ? { type: "all" } : { type: "branch", branchId },
        createdBy: user?.name || "العلاقات العامة",
        link: normalizeLink(link),
      });
    }
    resetForm();
  };

  const isActive = (n: NewsItem) => n.startDate <= today && n.endDate >= today;

  const sortedNews = useMemo(
    () =>
      [...news].sort(
        (a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
      ),
    [news],
  );

  const {
    paginated: pageNews,
    page,
    setPage,
    totalPages,
    total,
    rangeStart,
    rangeEnd,
  } = usePagination(sortedNews, PAGE_SIZE_DEFAULT, [news.length]);

  return (
    <div>
      <PageHeader
        title="إدارة شريط الأخبار"
        subtitle="نشر أخبار الشركة والتوجيهات على شاشات الموظفين"
        icon={<Megaphone className="h-6 w-6" />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader
            title={isEditing ? "تعديل الخبر" : "إضافة خبر جديد"}
            subtitle={isEditing ? "عدّل البيانات ثم احفظ — تعديل التاريخ يعيد تفعيل الخبر المنتهي" : undefined}
            icon={isEditing ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          />
          <form onSubmit={submit} className="space-y-4 p-5 pt-0">
            <Field label="نص الخبر" required>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="اكتب محتوى الخبر بوضوح..."
              />
            </Field>
            <Field label="رابط الخبر (اختياري)" hint="يفتح عند الضغط على الخبر في الشريط">
              <Input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://example.com"
                dir="ltr"
                className="text-left"
              />
            </Field>
            <Field label="تصنيف الخبر">
              <SearchableSelect
                value={category}
                onChange={(v) => setCategory(v as NewsCategory)}
                options={(Object.keys(NEWS_CATEGORY_LABELS) as NewsCategory[]).map(
                  (c) => ({ value: c, label: NEWS_CATEGORY_LABELS[c] }),
                )}
                searchPlaceholder="بحث في التصنيفات..."
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="تاريخ البداية" required>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Field>
              <Field label="تاريخ النهاية" required hint="يختفي تلقائياً">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </Field>
            </div>
            <Field label="الاستهداف المكاني">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType("all")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                    targetType === "all"
                      ? "border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400"
                      : "border-steel-300 text-steel-500 dark:border-steel-700",
                  )}
                >
                  <Globe className="h-4 w-4" />
                  الشركة بالكامل
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType("branch")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                    targetType === "branch"
                      ? "border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400"
                      : "border-steel-300 text-steel-500 dark:border-steel-700",
                  )}
                >
                  <Building2 className="h-4 w-4" />
                  الفرع / المنطقة
                </button>
              </div>
            </Field>
            {targetType === "branch" && (
              <Field label="اختر الفرع / المنطقة">
                <SearchableSelect
                  value={branchId}
                  onChange={setBranchId}
                  options={branches.map((b) => ({ value: b.id, label: b.name }))}
                  searchPlaceholder="بحث في المقار..."
                />
              </Field>
            )}
            {isEditing ? (
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  <Save className="h-4 w-4" />
                  حفظ التعديلات
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4" />
                  إلغاء
                </Button>
              </div>
            ) : (
              <Button type="submit" className="w-full">
                <Plus className="h-4 w-4" />
                نشر الخبر
              </Button>
            )}
          </form>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="الأخبار المنشورة" subtitle={`${news.length} خبر`} />
          <div className="space-y-3 p-5 pt-0">
            {pageNews.map((n) => {
              const active = isActive(n);
              const target = n.target;
              const targetBranchName =
                target.type === "branch"
                  ? branches.find((b) => b.id === target.branchId)?.name
                  : undefined;
              return (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4",
                    editingId === n.id
                      ? "border-brand-500 bg-brand-500/5 dark:border-brand-500"
                      : "border-steel-200 dark:border-steel-700",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-md border px-2 py-0.5 text-[11px] font-bold",
                          NEWS_CATEGORY_STYLE[n.category],
                        )}
                      >
                        {NEWS_CATEGORY_LABELS[n.category]}
                      </span>
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[11px] font-bold",
                          active
                            ? "bg-brand-500/10 text-brand-600 dark:text-brand-400"
                            : "bg-steel-200 text-steel-500 dark:bg-steel-800",
                        )}
                      >
                        {active ? "فعّال" : "منتهٍ"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-steel-400">
                        {n.target.type === "all" ? (
                          <>
                            <Globe className="h-3 w-3" />
                            الشركة بالكامل
                          </>
                        ) : (
                          <>
                            <Building2 className="h-3 w-3" />
                            {targetBranchName}
                          </>
                        )}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-steel-700 dark:text-steel-200">
                      {n.text}
                    </p>
                    {n.link && (
                      <a
                        href={n.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate" dir="ltr">{n.link}</span>
                      </a>
                    )}
                    <p className="mt-1 text-xs text-steel-400">
                      {formatShortDate(n.startDate)} — {formatShortDate(n.endDate)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => startEdit(n)}
                      title="تعديل الخبر"
                      className="rounded-lg p-2 text-steel-400 hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (editingId === n.id) resetForm();
                        removeNews(n.id);
                      }}
                      title="حذف الخبر"
                      className="rounded-lg p-2 text-steel-400 hover:bg-red-500/10 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {news.length > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              total={total}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
