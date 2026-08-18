import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import BookingDetailClient from "./_components/booking-detail-client";
import { getBookingDetailAction } from "@/lib/actions/booking-detail";

export const metadata = {
  title: "تفاصيل الحجز | جسر الأردن",
};

export default async function BookingDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await getBookingDetailAction(id);

  if (!result.success) {
    if (result.code === "FORBIDDEN") {
      return <div className="max-w-3xl mx-auto py-12 px-4 text-center text-red-600"><p>غير مصرح لك بعرض هذا الحجز</p></div>;
    }
    return <div className="max-w-3xl mx-auto py-12 px-4 text-center text-red-600"><p>{result.error || "الحجز غير موجود"}</p></div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <BookingDetailClient
        booking={result.booking}
        payment={result.payment ?? null}
        hasReviewed={result.hasReviewed ?? false}
      />
    </div>
  );
}
