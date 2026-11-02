/** صور خلفية صفحات المصادقة — public/Slide show img */
import { publicAsset } from "./assets";

export const AUTH_SLIDESHOW = Array.from(
  { length: 7 },
  (_, i) => publicAsset(`/Slide show img/${i + 1}.jpg`),
);

/** مدة عرض كل صورة قبل الانتقال للتالية */
export const AUTH_SLIDE_INTERVAL_MS = 6500;

/** مدة انتقال التلاشي بين الصور (ثوانٍ) */
export const AUTH_SLIDE_TRANSITION_S = 3.2;
