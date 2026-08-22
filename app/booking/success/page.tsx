import Link from "next/link";
import { ArrowLeft, Check, Clock3 } from "lucide-react";

export const metadata = {
  title: "تم استلام الحجز | جسر الأردن",
};

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const bookingId = id && /^[0-9a-f-]{36}$/i.test(id) ? id : null;

  return (
    <main className="mx-auto flex min-h-[72vh] max-w-3xl items-center px-4 py-10 sm:px-6">
      <div className="w-full">
        <div className="border-b border-theme pb-7">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--primary-soft))] text-brand">
            <Check size={24} strokeWidth={2.6} />
          </span>

          <p className="mt-6 text-[10px] font-bold text-brand">تم استلام الطلب</p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-.045em] sm:text-4xl">
            تمام، طلبك صار عندنا.
          </h1>
          <p className="mt-3 max-w-xl text-xs leading-6 text-muted sm:text-sm">
            رح تقدر تتابع أي تغيير على حالة الحجز من صفحة الطلب، وما في داعي تعيد الحجز أو تتواصل من برّا جسر.
          </p>
        </div>

        <div className="grid gap-0 border-b border-theme sm:grid-cols-2">
          <div className="border-b border-theme py-5 sm:border-b-0 sm:border-e sm:pe-6">
            <p className="text-[10px] font-bold text-muted">رقم الطلب</p>
            <p className="mt-1 font-mono text-sm font-bold">
              #{bookingId ? bookingId.slice(0, 8).toUpperCase() : "JISR"}
            </p>
          </div>

          <div className="py-5 sm:ps-6">
            <p className="flex items-center gap-1.5 text-[10px] font-bold text-muted">
              <Clock3 size={13} className="text-brand" />
              الحالة الحالية
            </p>
            <p className="mt-1 text-sm font-bold">بانتظار التأكيد</p>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link
            href={bookingId ? `/bookings/${bookingId}` : "/bookings"}
            className="brand-button flex-1 text-xs"
          >
            فتح الطلب
            <ArrowLeft size={14} />
          </Link>

          <Link
            href="/bookings"
            className="secondary-button flex-1 text-xs"
          >
            كل طلباتي
          </Link>
        </div>
      </div>
    </main>
  );
}
