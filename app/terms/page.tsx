export const metadata = {
  title: "الشروط والأحكام وسياسة الخصوصية | جسر الأردن",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto p-6 max-w-3xl space-y-8 dir-rtl text-right">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">الشروط والأحكام وسياسة الخصوصية</h1>
        <p className="text-gray-600 text-sm">تحدد هذه الاتفاقية القواعد والسياسات المتبعة عند استخدام منصة جسر الأردن</p>
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm space-y-6 text-xs text-gray-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-900">1. قبول الشروط</h2>
          <p>
            بوصولك واستخدامك لمنصة جسر الأردن، فإنك توافق على الالتزام بكافة الشروط والأحكام الموضحة هنا. إذا كنت لا توافق على أجزاء من هذه الشروط، فيرجى عدم استخدام خدمات المنصة.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-900">2. مسؤولية الحساب والبيانات</h2>
          <p>
            يتعهد المستخدم بتقديم معلومات صحيحة ودقيقة عند التسجيل وتحديث بيانات التواصل والعنوان الافتراضي لضمان توجيه الفنيين والمزودين بدقة.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-900">3. سياسة الدفع والاسترداد</h2>
          <p>
            تتم المعاملات المالية عبر بوابات دفع إلكترونية مشفرة وآمنة. يتم معالجة طلبات الاسترداد المالي وفقاً لحالة الخدمة والتحقق من التقرير المرفق من قبل الإدارة.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-900">4. حماية الخصوصية</h2>
          <p>
            تلتزم المنصة بحماية خصوصية بيانات المستخدمين وعدم مشاركة التفاصيل الشخصية أو العناوين مع أي أطراف خارجية باستثناء المزود المعتمد الموكل بتنفيذ الحجز.
          </p>
        </section>
      </div>
    </div>
  );
}