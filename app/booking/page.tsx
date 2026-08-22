import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import BookingFlow from "./booking-flow";

export default async function BookingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/booking");
  }

  const { data: services } = await supabase
    .from("services")
    .select("id, title, price")
    .eq("is_active", true)
    .order("title");

  const serviceOptions = (services || []).map((service) => ({
    id: service.id,
    title: service.title,
    price: Number(service.price) || 0,
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-6 sm:pt-8">
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-brand">طلب جديد</p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-.045em] sm:text-4xl">
            احجزها بدون لف ودوران.
          </h1>
          <p className="mt-2 max-w-xl text-xs leading-6 text-muted sm:text-sm">
            اختار الخدمة والوقت، واحكيلنا وين بدك إياها. الباقي بنتابعه معك من صفحة طلباتك.
          </p>
        </div>

        <Link
          href="/bookings"
          className="hidden shrink-0 items-center gap-1.5 text-xs font-bold text-brand sm:inline-flex"
        >
          طلباتي
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="mb-5 flex items-center gap-2 border-y border-theme py-3 text-[10px] text-muted sm:hidden">
        <CalendarDays size={14} className="text-brand" />
        الطلب رح يضل ظاهر عندك من أول تأكيد لحد ما يخلص.
      </div>

      <Suspense
        fallback={
          <div className="mx-auto max-w-3xl py-16 text-center text-xs text-muted">
            بنجهز نموذج الحجز...
          </div>
        }
      >
        <BookingFlow services={serviceOptions} />
      </Suspense>
    </main>
  );
}
