import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import BookingDetailClient from "./_components/booking-detail-client";
import { getBookingDetailAction } from "@/lib/actions/booking-detail";

export const metadata = { title: "تفاصيل الحجز | جسر الأردن" };

export default async function BookingDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await getBookingDetailAction(id);

  if (!result.success || !result.booking) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-[1.8rem] border border-theme bg-surface p-8 text-center text-sm text-[rgb(var(--danger))]">
          {result.code === "FORBIDDEN" ? "غير مصرح لك بعرض هذا الحجز" : result.error || "الحجز غير موجود"}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <BookingDetailClient booking={result.booking} payment={result.payment ?? null} hasReviewed={result.hasReviewed ?? false} />
    </main>
  );
}
