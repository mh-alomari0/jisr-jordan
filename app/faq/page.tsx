export const metadata = {
  title: "الأسئلة الشائعة | جسر الأردن",
};

export default function FAQPage() {
  const faqs = [
    {
      q: "كيف يمكنني حجز خدمة عبر منصة جسر الأردن؟",
      a: "يمكنك تصفح دليل الخدمات، اختيار الخدمة المطلوبة، وتحديد التاريخ والوقت المناسبين مع كتابة العنوان التفصيلي، ثم تأكيد الحجز وإتمام الدفع بسهولة.",
    },
    {
      q: "ما هي وسائل الدفع المتاحة؟",
      a: "نوفر الدفع الإلكتروني الآمن عبر البطاقات البنكية وبوابات الدفع المحلية المعتمدة في الأردن، بالإضافة للخيار النظير عند استكمال الخدمة إذا أتيح ذلك.",
    },
    {
      q: "كيف يتم اختيار وتأهيل الفنيين ومزودي الخدمات؟",
      a: "يخضع جميع المزودين المسجلين في منصتنا لعملية تحقق من الهوية والخبرة الفنية قبل اعتماد حساباتهم لضمان تقديم أعلى مستويات الجودة والأمان.",
    },
    {
      q: "هل يمكنني إلغاء أو تعديل موعد الحجز؟",
      a: "نعم، يمكنك متابعة وإدارة أو إلغاء حجوزاتك من خلال صفحة 'حجوزاتي' قبل الموعد المحدد وفقاً لسياسة الإلغاء المعتمدة.",
    },
  ];

  return (
    <div className="container mx-auto p-6 max-w-3xl space-y-8 dir-rtl text-right">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">الأسئلة الشائعة</h1>
        <p className="text-gray-600 text-sm">إجابات على أكثر الاستفسارات تكراراً حول كيفية استخدام المنصة والدفع</p>
      </div>

      <div className="space-y-4">
        {faqs.map((item, idx) => (
          <div key={idx} className="bg-white border rounded-xl p-5 shadow-sm space-y-2">
            <h3 className="font-bold text-base text-gray-900">{item.q}</h3>
            <p className="text-gray-600 text-xs leading-relaxed">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}