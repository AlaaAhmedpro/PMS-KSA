# PMS-KSA

مشروعان React منفصلان بالكامل — كل واحد فولدر ولينك خاص به.

| المنتج | المجلد | المنفذ | الرابط |
|--------|--------|--------|--------|
| **Core PMS** (منظومة المنشأة) | [`web-core/`](web-core/) | 5174 | http://127.0.0.1:5174 |
| **Super Admin** (منصة الاشتراكات) | [`web-admin/`](web-admin/) | 5175 | http://127.0.0.1:5175 |

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
