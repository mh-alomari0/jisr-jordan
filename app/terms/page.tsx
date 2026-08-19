export const metadata = {
  title: "الشروط والأحكام | جسر الأردن",
  description: "الشروط الأساسية لاستخدام منصة جسر الأردن وحجز الخدمات المنزلية.",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto p-6 max-w-3xl space-y-8 dir-rtl text-right">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">الشروط والأحكام</h1>
        <p className="text-gray-600 text-sm">القواعد الأساسية لاستخدام منصة جسر الأردن وحجز الخدمات.</p>
      </div>

      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
        هذه صياغة تشغيلية أولية، ويجب اعتمادها من مالك المنصة ومراجع قانوني أردني قبل الإطلاق التجاري.
      </p>

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
            طريقة الدفع المتاحة حالياً هي الدفع النقدي عند إكمال الخدمة. لا تعالج المنصة مدفوعات إلكترونية في الوقت الحالي، وتخضع طلبات الإلغاء أو الاسترداد لمراجعة الإدارة وفق حالة الحجز والدفع.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-900">4. تنفيذ الخدمة</h2>
          <p>
            يلتزم المستخدم بتوفير معلومات الموعد والعنوان اللازمة لتنفيذ الطلب. ويظهر لمزود الخدمة المعيّن فقط ما يلزم لتنفيذ الحجز، ولا يجوز له استخدام تلك المعلومات لغرض آخر.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-900">5. السلوك المقبول</h2>
          <p>
            يُحظر إساءة استخدام المنصة، أو تقديم معلومات مضللة، أو محاولة الوصول إلى حسابات أو حجوزات الغير، أو استخدام الخدمة في نشاط مخالف للقانون.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-900">6. التواصل والاستفسارات</h2>
          <p>
            يمكن إرسال الاستفسارات المتعلقة بهذه الشروط عبر صفحة تواصل معنا. وتوضح سياسة الخصوصية بصورة منفصلة كيفية التعامل مع البيانات الشخصية.
          </p>
        </section>
      </div>
    </div>
  );
}
