# منظومة إدارة وتنظيم المشاريع

بوابة إدارة المشاريع — **Brains Valley** ([brains-rs.com](https://brains-rs.com/)).

مشروع React لمنظومة المنشأة (هرمية المحافظ / البرامج / المشاريع / المهام).

## التشغيل

```bash
cd web-core
npm install
npm run dev
```

الرابط: **http://127.0.0.1:5174**

عيّن `VITE_DEMO_MODE=true` (الافتراضي) لطبقة العرض التجريبي.

## Demo Mode — مصادقة محاكاة فقط

ليست أماناً إنتاجياً. الخدمات قابلة للاستبدال لاحقاً بـ HTTP.

| السلوك | التفاصيل |
|--------|-----------|
| كلمة المرور | التحقق من البذرة؛ الافتراضي `demo1234` |
| حساب معطّل | رسالة محددة (`inactive@namaa.sa`) |
| MFA | إن `mfaRequired` → أي 4 أرقام |
| نسيت كلمة المرور | نموذج Demo يعيد تعيين كلمة المرور محلياً |
| Rate limit | بعد 5 محاولات فاشلة خلال 15 دقيقة |
| الجلسة | token + orgId + permissions في localStorage |
| إعادة الضبط | قائمة المستخدم → «إعادة ضبط Demo» |

## حسابات تجريبية (web-core)

| الدور | البريد |
|--------|--------|
| مسؤول المؤسسة | `admin@namaa.sa` (MFA) |
| مدير مشروع | `pm@namaa.sa` |
| عضو فريق | `employee@namaa.sa` |
| مستخدم خارجي | `external@partner.sa` |
| الإدارة العليا | `executive@namaa.sa` |
| تواصل مؤسسي | `pr@namaa.sa` |

كلمة المرور: `demo1234`

تسجيل منشأة جديدة: `/register` (ينشئ منظمة + أول Org Admin).

## هرمية البيانات

Organization → Strategic Objectives + Portfolio → Initiative / Program / Standalone Projects → Projects → Tasks & Milestones

## ملاحظة

منصة Platform Admin في المجلد `../web-admin` على المنفذ **5175** (`platform@namaa.sa`).
