import { usePlatform } from "../../store/PlatformStore";

const STATIC_NEWS = [
  { id: "1", cat: "تنبيه", text: "مراجعة طلبات العرض الجديدة خلال 24 ساعة عمل." },
  { id: "2", cat: "أهداف", text: "هدف الربع: تفعيل 12 مستأجراً جديداً على خطة احترافي." },
  { id: "3", cat: "إنجازات", text: "اكتمال ترحيل بيانات 3 جهات حكومية إلى خطة مؤسسات." },
];

export function NewsTicker() {
  const { demoRequests } = usePlatform();
  const newCount = demoRequests.filter((d) => d.status === "new").length;
  const items = [
    {
      id: "dyn",
      cat: "تنبيه",
      text: `يوجد ${newCount} طلب عرض بحالة «جديد» بانتظار المتابعة.`,
    },
    ...STATIC_NEWS,
  ];
  const loop = [...items, ...items];

  return (
    <div
      role="region"
      aria-label="شريط أخبار المنصة"
      className="relative z-20 border-t border-steel-800/40 bg-steel-950/90 text-steel-100 backdrop-blur-xl"
    >
      <div className="flex items-stretch">
        <div className="flex shrink-0 items-center gap-2 bg-brand-600 px-4 py-2 text-xs font-extrabold text-white">
          <span>آخر الأخبار</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">مباشر</span>
        </div>
        <div className="relative min-w-0 flex-1 overflow-hidden py-2">
          <div className="animate-marquee flex w-max gap-8 whitespace-nowrap pe-8 ps-4 text-sm">
            {loop.map((item, i) => (
              <span key={`${item.id}-${i}`} className="inline-flex items-center gap-2">
                <span className="rounded-md border border-brand-500/30 bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold text-brand-300">
                  {item.cat}
                </span>
                <span className="text-steel-200">{item.text}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
