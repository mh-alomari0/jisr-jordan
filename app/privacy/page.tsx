import Link from "next/link";

export const metadata = {
  title: "سياسة الخصوصية | جسر الأردن",
  description: "مسودة سياسة الخصوصية لمنصة جسر الأردن.",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl space-y-8 p-6 text-right" dir="rtl">
      <header className="space-y-2 border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">سياسة الخصوصية</h1>
        <p className="text-sm text-gray-600">كيف تتعامل منصة جسر الأردن مع بيانات الحساب والحجز.</p>
      </header>

      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
        هذه مسودة تشغيلية تحتاج اعتماد مالك المنصة ومراجع قانوني أردني قبل الإطلاق التجاري، ولا تمثل إقراراً باكتمال المتطلبات القانونية.
      </p>

      <div className="space-y-6 rounded-xl border bg-white p-6 text-sm leading-7 text-gray-700 shadow-sm">
        <section>
          <h2 className="font-bold text-gray-900">البيانات التي نعالجها</h2>
          <p>بيانات الحساب والتواصل، وعناوين تنفيذ الخدمة، وتفاصيل الحجوزات، وحالة الدفع النقدي، والمراجعات، وسجلات الأمان والتدقيق اللازمة لتشغيل المنصة.</p>
        </section>
        <section>
          <h2 className="font-bold text-gray-900">أغراض الاستخدام</h2>
          <p>إنشاء الحساب، تنفيذ الحجز، إسناد مزود مناسب، إرسال الإشعارات داخل المنصة، دعم المستخدم، منع إساءة الاستخدام، وحفظ السجلات التشغيلية والمالية اللازمة.</p>
        </section>
        <section>
          <h2 className="font-bold text-gray-900">مشاركة البيانات</h2>
          <p>يُتاح لمزود الخدمة المعيّن فقط ما يلزم لتنفيذ الحجز. وقد تعالج Supabase ومزود الاستضافة البيانات بصفتهم مزودي بنية تقنية وفق إعدادات المشروع وعقوده.</p>
        </section>
        <section>
          <h2 className="font-bold text-gray-900">الاحتفاظ والحذف</h2>
          <p>تُحفظ البيانات للمدة اللازمة للتشغيل والالتزامات النظامية وتسوية النزاعات. حذف الحساب الكامل غير متاح حالياً إلى أن تعتمد سياسة الاحتفاظ بالبيانات المالية وسجلات التدقيق وآلية حذف آمنة.</p>
        </section>
        <section>
          <h2 className="font-bold text-gray-900">الأمان وحقوق المستخدم</h2>
          <p>تطبق المنصة ضوابط وصول بحسب الدور والملكية. يمكن للمستخدم تحديث ملفه، وللاستفسار عن بياناته أو طلب تصحيحها يمكنه التواصل مع الدعم. لا يمكن ضمان انعدام المخاطر بصورة مطلقة.</p>
        </section>
        <p>
          للاستفسارات، انتقل إلى <Link href="/contact" className="font-bold text-primary hover:underline">صفحة تواصل معنا</Link>.
        </p>
      </div>
    </div>
  );
}
