import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import BookingDetailClient from "./_components/booking-detail-client";
import { getBookingDetailAction } from "@/lib/actions/booking-detail";

export const metadata = { title: "تفاصيل الطلب | جسر الأردن" };

export default async function BookingDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const result = await getBookingDetailAction(id);

  if (!result.success || !result.booking) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <Link
          href="/bookings"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-brand"
        >
          <ArrowRight size={14} />
          طلباتي
        </Link>

        <div className="border-y border-theme py-12 text-center">
          <h1 className="text-lg font-bold">
            {result.code === "FORBIDDEN"
              ? "ما بتقدر تفتح هذا الطلب"
              : "ما لقينا الطلب"}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-muted">
            {result.code === "FORBIDDEN"
              ? "هذا الطلب مش مرتبط بحسابك، لذلك تفاصيله مش متاحة إلك."
              : result.error || "ممكن يكون الرابط غلط أو الطلب لم يعد متاحاً."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-7 sm:px-6 sm:py-10">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-theme pb-5">
        <div>
          <Link
            href="/bookings"
            className="inline-flex items-center gap-1 text-[10px] font-bold text-brand"
          >
            <ArrowRight size={13} />
            كل الطلبات
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-[-.035em] sm:text-3xl">
            تفاصيل الطلب
          </h1>
          <p className="mt-1 text-[10px] text-muted">#{id.slice(0, 8)}</p>
        </div>
      </div>

      <BookingDetailClient
        booking={result.booking}
        payment={result.payment ?? null}
        hasReviewed={result.hasReviewed ?? false}
      />
    </main>
  );
}
