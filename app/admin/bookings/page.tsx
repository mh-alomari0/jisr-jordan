import { getAdminBookingsAction } from "@/lib/actions/admin-bookings";
import AdminBookingsClient from "./_components/admin-bookings-client";
import { AdminPagination } from "@/components/admin-pagination";

export const metadata = {
  title: "إدارة وتتبع الحجوزات | لوحة التحكم",
};

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(
    1,
    Number.parseInt(params.page || "1", 10) || 1,
  );

  const result = await getAdminBookingsAction(page);

  if (!result.success) {
    return (
      <div className="border-b border-[rgb(var(--danger)/0.2)] bg-[rgb(var(--danger)/0.05)] px-4 py-5 text-sm text-[rgb(var(--danger))]">
        {result.error || "تعذر تحميل قائمة الحجوزات"}
      </div>
    );
  }

  const bookings = result.bookings || [];

  return (
    <main className="space-y-7">
      <header className="border-b border-theme pb-5">
        <p className="text-[10px] font-bold text-brand">التشغيل اليومي</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-[-.045em] sm:text-4xl">
              الحجوزات
            </h1>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-muted sm:text-sm">
              تابع حالة الطلب والدفع والتعيين والتنفيذ، وتدخل فقط لما يحتاج الطلب إجراء إداري.
            </p>
          </div>
          <p className="text-xs font-bold text-muted">
            {bookings.length} حجز في هذه الصفحة
          </p>
        </div>
      </header>

      <section>
        <AdminBookingsClient initialBookings={bookings} />

        <div className="mt-5">
          <AdminPagination
            path="/admin/bookings"
            page={result.page || page}
            hasMore={Boolean(result.hasMore)}
          />
        </div>
      </section>
    </main>
  );
}
