import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { getCustomerBookingsAction } from "@/lib/actions/customer-bookings";
import CustomerBookingsClient, {
  CustomerBookingItem,
} from "./_components/customer-bookings-client";

export const metadata = {
  title: "طلباتي | جسر الأردن",
};

export const dynamic = "force-dynamic";

export default async function CustomerBookingsPage() {
  const result = await getCustomerBookingsAction();

  if (!result.success || !result.bookings) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="border-y border-[rgb(var(--danger)/0.25)] py-8 text-center">
          <p className="text-sm font-bold text-[rgb(var(--danger))]">
            {result.error || "تعذر تحميل قائمة الطلبات"}
          </p>
          <Link href="/" className="mt-4 inline-block text-xs font-bold text-brand">
            العودة للرئيسية
          </Link>
        </div>
      </main>
    );
  }

  const typedBookings = result.bookings as unknown as CustomerBookingItem[];

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <header className="flex flex-col gap-5 border-b border-theme pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand">
            <CalendarDays size={17} />
            <p className="text-[10px] font-bold">طلباتك</p>
          </div>

          <h1 className="mt-2 text-3xl font-bold tracking-[-.045em] sm:text-4xl">
            كل شغلك مع جسر هون.
          </h1>
          <p className="mt-2 max-w-xl text-xs leading-6 text-muted sm:text-sm">
            من أول طلب لآخر تحديث. افتح أي طلب وشوف حالته وتفاصيله بدون ما تدور بين الصفحات.
          </p>
        </div>

        <Link href="/booking" className="brand-button shrink-0 text-xs">
          <Plus size={15} />
          طلب جديد
        </Link>
      </header>

      <section className="mt-7">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">الطلبات</h2>
            <p className="mt-1 text-[10px] text-muted">
              {typedBookings.length === 0
                ? "ما عندك طلبات لسا"
                : `${typedBookings.length} طلب بحسابك`}
            </p>
          </div>
        </div>

        <CustomerBookingsClient initialBookings={typedBookings} />
      </section>
    </main>
  );
}
