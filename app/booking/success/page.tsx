import Link from "next/link";

export const metadata = {
  title: "تم تأكيد الحجز بنجاح | جسر الأردن",
};

export default function BookingSuccessPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 dir-rtl">
      <div className="max-w-md w-full bg-white border rounded-2xl p-8 text-center shadow-sm space-y-6">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
          ✓
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">تم تأكيد حجزك بنجاح!</h1>
          <p className="text-gray-600 text-sm">
            تم استلام طلبك وتأكيد عملية الدفع. تم إرسال التفاصيل لمزود الخدمة المعتمد.
          </p>
        </div>

        <div className="pt-4 border-t flex flex-col gap-3">
          <Link
            href="/bookings"
            className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors block"
          >
            استعراض سجل حجوزاتي
          </Link>
          <Link
            href="/"
            className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors block"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}