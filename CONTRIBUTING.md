# 🤝 دليل المساهمة والتطوير في منصة "جسر" (Jisr Jordan)

أهلاً بك في الفريق البرمجي لمنصة **جسر**. يهدف هذا المستند إلى تنظيم عملية التطوير وضمان أعلى معايير الأمان والجودة الهندسية قبل دمج أي كود في البيئة الإنتاجية.

---

## 🌿 استراتيجية الفروع (Branching Strategy)

نتبع نمط **Feature Branch Workflow**:
* `main` / `master`: البيئة الإنتاجية المستقرة فقط (Production).
* `staging`: بيئة التجربة والاختبار المبكر.
* **الفروع الفرعية (Feature Branches):** يتم إنشاؤها من `main` بالصيغة التالية:
  * `feature/name-of-feature` للميزات الجديدة.
  * `fix/issue-description` لإصلاح الأخطاء.
  * `security/patch-details` للترقيعات الأمنية.

---

## 📝 معايير رسائل الـ Commit (Conventional Commits)

يجب أن تبدأ جميع رسائل الـ Git Commit ببادئة صريحة توضح طبيعة التغيير:

* `feat:` إضافة ميزة جديدة (مثل: `feat(auth): add OTP verification flow`).
* `fix:` إصلاح خلل وظيفي (مثل: `fix(booking): resolve duplicate slot selection`).
* `security:` تعزيز الأمان أو سد ثغرة (مثل: `security(payments): enforce HMAC verification`).
* `test:` إضافة أو تحديث اختبارات آلية (مثل: `test(e2e): add playwright booking suite`).
* `ci:` تعديل إعدادات الـ CI/CD (مثل: `ci(github): add tsc typecheck step`).
* `docs:` تحديث التوثيق والملفات التوضيحية (مثل: `docs: update setup guide`).

---

## 🛡️ القواعد الأمنية والهندسية الصارمة (Engineering Standards)

1. **TypeScript Strictly:** يمنع استخدام `any` الصريحة، ويجب تعريف جميع الأنواع والـ Interfaces بوضوح.
2. **Fail-Fast Environment:** يمنع وضع قيم افتراضية وهمية (placeholders) للمفاتيح الأمنية في كود التطبيق.
3. **Defense-in-Depth:** يجب ألا تعتمد الـ Server Actions الحساسة على RLS فقط؛ بل يجب تضمين فحص الصلاحيات والرتبة (`role`) صراحة داخل الكود.
4. **Secret Scanning:** يمنع رفع أي API Key أو Secret إلى الريبو تحت أي ظرف.

---

## 🧪 قائمة التحقق قبل فتح طلب الدمج (Pre-PR Checklist)

قبل فتح أي **Pull Request (PR)**، قم بتشغيل الفحوصات التالية محلياً التأكد من عدم كسر أي جزء من النظام:

```bash
# 1. فحص جودة الكود
npm run lint

# 2. الفحص الاستاتيكي للأنواع (Type Checking)
npx tsc --noEmit

# 3. تشغيل اختبارات الوحدات والأمان
npm run test

# 4. التأكد من نجاح بناء النسخة الإنتاجية
npm run build