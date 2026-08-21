import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  QrCode,
  Sparkles,
} from "lucide-react";

export const metadata = {
  title: "تم استلام الحجز بنجاح | جسر الأردن",
};

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const bookingId = id && /^[0-9a-f-]{36}$/i.test(id) ? id : null;

  return (
    <main className="min-h-[75vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Celebration Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[rgb(var(--primary-soft))] text-brand shadow-md animate-bounce">
            <Check className="h-8 w-8 stroke-[3]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            تم استلام طلبك بنجاح! 🎉
          </h1>
          <p className="text-xs text-muted leading-6">
            تم تسجيل حجزك داخل منصة جسر، وسيصلك إشعار فوري عند تأكيد الموعد من مقدم الخدمة.
          </p>
        </div>

        {/* 🎫 Digital Perforated Ticket Card */}
        <div className="surface-card relative overflow-hidden !rounded-[2rem] border-2 border-dashed border-[rgb(var(--primary)/0.3)] bg-surface p-6 shadow-lift">
          <div className="flex items-center justify-between border-b border-theme pb-4">
            <div>
              <span className="status-pill bg-[rgb(var(--primary-soft))] text-brand font-black">
                حجز موثق
              </span>
              <p className="text-[10px] font-bold text-muted mt-1.5">
                رقم الحجز: #{bookingId ? bookingId.slice(0, 8) : "JISR-BOOKING"}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-muted text-muted">
              <QrCode size={22} />
            </div>
          </div>

          <div className="py-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted flex items-center gap-1.5">
                <CalendarDays size={14} className="text-brand" /> حالة الطلب
              </span>
              <strong className="text-[rgb(var(--warning))] font-black">
                قيد المراجعة والتأكيد
              </strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted flex items-center gap-1.5">
                <Clock3 size={14} className="text-brand" /> طريقة الدفع
              </span>
              <strong className="font-bold">الدفع عند الاستلام (نقدي)</strong>
            </div>
          </div>

          <div className="border-t border-theme pt-4 text-center">
            <p className="text-[10px] text-muted leading-5">
              💡 يمكنك متابعة حالة الطلب أو مراسلة مقدم الخدمة مباشرة من صفحة تفاصيل الحجز.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <Link
            href={bookingId ? `/bookings/${bookingId}` : "/bookings"}
            className="brand-button w-full text-xs font-black shadow-md"
          >
            فتح تفاصيل وتتبع الحجز <ArrowLeft size={15} />
          </Link>

          <Link
            href="/"
            className="secondary-button w-full text-xs font-bold"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </main>
  );
}