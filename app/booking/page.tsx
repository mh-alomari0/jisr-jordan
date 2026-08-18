import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import BookingFlow from "./booking-flow";
import { Suspense } from "react";

export default async function BookingPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: services } = await supabase
    .from("services")
    .select("id, title, price")
    .eq("is_active", true)
    .order("title");

  const serviceOptions = (services || []).map((s) => ({
    id: s.id,
    title: s.title,
    price: Number(s.price) || 0,
  }));

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <Suspense fallback={<div className="text-center py-12 text-slate-500">جاري تحميل نموذج الحجز...</div>}>
        <BookingFlow services={serviceOptions} />
      </Suspense>
    </div>
  );
}
