# نظام عفيفي للوجستيات

افتح الملف `index.html` بالمتصفح مباشرة (Chrome) — مفيش سيرفر ولا تثبيت.

## هيكل الملفات
```
index.html                      ← هيكل الصفحة (HTML) + ترتيب تحميل الملفات
css/                            ← الأنماط (الترتيب بالأرقام مهم، لأن اللي بعد بيغلب اللي قبل)
  01-base … 14-sales
js/
  storage.js                    ← الحفظ في المتصفح (localStorage) + النسخ الاحتياطي
  core/                         ← الوظائف الأساسية (بالترتيب في index.html)
    state · ui-helpers · calculation · calculator-ui · navigation-general
    customers · customer-accounts · confirm-modal · quotes · company
    printing · backup-migration · auth · users · lightbox-documents
    collections · login-extras-init  (آخر ملف فيه init())
  data/suppliers-seed.js        ← بيانات الموردين الابتدائية
  modules/
    suppliers-cubic-party.js    ← الموردين والمشتريات والتكعيب ونموذج العميل/المورد
    statements-print-xlsx.js    ← ضريبة الحاسبة + كشوف الحساب + تصدير Excel
    sales.js                    ← قسم المبيعات (عرض سعر ← أمر توريد ← أمر تصنيع ← إذن مخازن)
```

## ملاحظات
- ترتيب `<script>` في آخر `index.html` مهم: لا تغيّره، وأي ملف جديد ضيفه قبل `</body>` بعد الملفات الأساسية.
- كل ملف في `modules/` مغلّف بدالة مستقلة (IIFE) فمقدرش يتقسم أكتر من كده.
