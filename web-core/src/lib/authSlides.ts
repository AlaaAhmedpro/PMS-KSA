/** صور خلفية صفحة الدخول — إدارة مشاريع وبيئة أعمال سعودية بألوان فاتحة */
import { publicAsset } from "./assets";

export const AUTH_SLIDESHOW = [
  publicAsset("/slides/auth-riyadh-skyline.jpg"),
  publicAsset("/slides/auth-pm-workshop.jpg"),
  publicAsset("/slides/auth-pmo-room.jpg"),
  publicAsset("/slides/auth-ksa-infra.jpg"),
  publicAsset("/slides/auth-portfolio-screen.jpg"),
  publicAsset("/slides/auth-vision-district.jpg"),
];

/** مدة عرض كل صورة قبل الانتقال للتالية */
export const AUTH_SLIDE_INTERVAL_MS = 6500;

/** مدة انتقال التلاشي بين الصور (ثوانٍ) */
export const AUTH_SLIDE_TRANSITION_S = 3.2;
