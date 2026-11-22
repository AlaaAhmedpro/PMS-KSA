# PMS-KSA

مشروعان React منفصلان بالكامل — كل واحد فولدر ولينك خاص به.

| المنتج | المجلد | محلي | GitHub Pages |
|--------|--------|------|--------------|
| **Core PMS** (منظومة المنشأة) | [`web-core/`](web-core/) | http://127.0.0.1:5174 | https://alaaahmedpro.github.io/PMS-KSA/ |
| **Super Admin** (منصة الاشتراكات) | [`web-admin/`](web-admin/) | http://127.0.0.1:5175 | https://alaaahmedpro.github.io/PMS-KSA/admin/ |

نفس الهوية البصرية (أخضر brand / glass login / RTL)، مع فصل تام للكود و`localStorage`.

## تشغيل Core

```bash
cd web-core
npm install
npm run dev
```

دخول: `admin@namaa.sa`

## تشغيل Super Admin

```bash
cd web-admin
npm install
npm run dev
```

دخول: `platform@namaa.sa`

## مجلدات قديمة (غير معتمدة)

- `web/` — النسخة الموحّدة السابقة قبل الفصل
- `frontend/` — تجربة Angular سابقة
