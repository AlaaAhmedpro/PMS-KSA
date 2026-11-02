/** صور خلفية صفحة الدخول — مشاريع / إدارة / تنظيم في بيئة أعمال سعودية */
import { publicAsset } from "./assets";

export const AUTH_SLIDESHOW = [
  publicAsset("/slides/kingdom-tower.jpg"),
  publicAsset("/slides/corporate-towers.jpg"),
  publicAsset("/slides/project-planning.jpg"),
  publicAsset("/slides/management-meeting.jpg"),
  publicAsset("/slides/architecture-plans.jpg"),
  publicAsset("/slides/construction-site.jpg"),
  publicAsset("/slides/7.jpg"),
];

/** مدة عرض كل صورة قبل الانتقال للتالية */
export const AUTH_SLIDE_INTERVAL_MS = 6500;

/** مدة انتقال التلاشي بين الصور (ثوانٍ) */
export const AUTH_SLIDE_TRANSITION_S = 3.2;
