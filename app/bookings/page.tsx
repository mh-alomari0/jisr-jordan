import { CalendarDays } from "lucide-react";
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
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-[1.8rem] border border-theme bg-surface p-8 text-center text-sm text-[rgb(var(--danger))]">
          {result.error || "تعذر تحميل قائمة الطلبات"}
        </div>
      </main>
    );
  }

  const typedBookings =
    result.bookings as unknown as CustomerBookingItem[];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="relative overflow-hidden rounded-[2.1rem] bg-[#0b817a] px-6 py-8 text-white sm:px-8">
        <div className="pointer-events-none absolute -left-16 -top-20 h-52 w-52 rounded-full border-[22px] border-white/10" />

        <div className="relative">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
            <CalendarDays size={20} />
          </span>

          <p className="mt-6 text-[10px] font-bold text-[#c9eee8]">
            رحلتك مع جسر
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-[-.05em] sm:text-5xl">
            طلباتك كلها،
            <span className="text-[#ffc985]"> بمكان واحد.</span>
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d9f2ee]">
            تابع الطلب من لحظة إنشائه لحد التنفيذ والتقييم،
            واعرف كل تحديث عليه.
          </p>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5">
          <p className="text-[10px] font-bold text-brand">
            متابعة الطلبات
          </p>
          <h2 className="mt-1 text-2xl font-bold">
            طلباتي
          </h2>
          <p className="mt-1 text-xs text-muted">
            {typedBookings.length} طلب مسجل
          </p>
        </div>

        <CustomerBookingsClient
          initialBookings={typedBookings}
        />
      </section>
    </main>
  );
}
