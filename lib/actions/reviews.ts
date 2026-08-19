"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";

const ReviewSchema = z.object({
  serviceId: z.string().uuid("معرف الخدمة غير صالح"),
  bookingId: z.string().uuid("معرف الحجز غير صالح"),
  rating: z.number().int().min(1, "يرجى تحديد تقييم صحيح بين 1 و 5 نجوم").max(5, "يرجى تحديد تقييم صحيح بين 1 و 5 نجوم"),
  comment: z.string().trim().max(1000, "التعليق طويل جداً"),
});

export interface ReviewItem {
  id: string;
  service_id: string;
  booking_id?: string | null;
  rating: number;
  comment?: string | null;
  created_at: string;
  users?: { full_name?: string | null } | null;
}

async function createReviewsClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );
}

export async function submitServiceReviewAction(serviceId: string, rating: number, comment: string, bookingId: string) {
  try {
    const parsed = ReviewSchema.safeParse({ serviceId, bookingId, rating, comment });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "بيانات التقييم غير صالحة" };
    const supabase = await createReviewsClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "يجب تسجيل الدخول لإضافة تقييم" };

    const rateLimit = await checkRateLimit(`review:submit:${user.id}`, { limit: 5, windowMs: 60 * 60_000 });
    if (!rateLimit.success) return { success: false, error: rateLimit.error };

    const { data: booking } = await supabase.from("bookings").select("id")
      .eq("id", parsed.data.bookingId).eq("customer_id", user.id)
      .eq("service_id", parsed.data.serviceId).eq("status", "COMPLETED").maybeSingle();
    if (!booking) return { success: false, error: "لا يمكنك تقييم حجز غير مكتمل أو لا يخص حسابك" };

    const { error } = await supabase.from("reviews").upsert({
      booking_id: parsed.data.bookingId,
      service_id: parsed.data.serviceId,
      customer_id: user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    }, { onConflict: "booking_id" });
    if (error) return { success: false, error: "تعذر حفظ التقييم حالياً" };

    revalidatePath(`/services/${parsed.data.serviceId}`);
    revalidatePath(`/bookings/${parsed.data.bookingId}`);
    return { success: true };
  } catch {
    return { success: false, error: "فشل حفظ التقييم" };
  }
}

export async function canReviewBookingAction(serviceId: string, bookingId: string) {
  if (!z.string().uuid().safeParse(serviceId).success || !z.string().uuid().safeParse(bookingId).success) return false;
  try {
    const supabase = await createReviewsClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const [{ data: booking }, { data: review }] = await Promise.all([
      supabase.from("bookings").select("id").eq("id", bookingId).eq("customer_id", user.id)
        .eq("service_id", serviceId).eq("status", "COMPLETED").maybeSingle(),
      supabase.from("reviews").select("id").eq("booking_id", bookingId).maybeSingle(),
    ]);
    return Boolean(booking && !review);
  } catch {
    return false;
  }
}

export async function getServiceReviewsAction(serviceId: string) {
  try {
    if (!z.string().uuid().safeParse(serviceId).success) return { success: false, error: "معرف الخدمة غير صالح" };
    const supabase = await createReviewsClient();
    const { data: reviews, error } = await supabase.from("reviews")
      .select("id, booking_id, service_id, rating, comment, created_at, users(full_name)")
      .eq("service_id", serviceId).order("created_at", { ascending: false }).limit(100);
    if (error) return { success: true, reviews: [], averageRating: 0 };
    const typedReviews = (reviews || []) as unknown as ReviewItem[];
    const total = typedReviews.reduce((acc, review) => acc + review.rating, 0);
    const averageRating = typedReviews.length ? Number((total / typedReviews.length).toFixed(1)) : 0;
    return { success: true, reviews: typedReviews, averageRating };
  } catch {
    return { success: false, error: "فشل جلب التقييمات" };
  }
}
