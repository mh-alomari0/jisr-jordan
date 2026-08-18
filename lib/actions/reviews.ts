"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ReviewSchema = z.object({
  serviceId: z.string().uuid("معرف الخدمة غير صالح"),
  rating: z.number().int().min(1, "يرجى تحديد تقييم صحيح بين 1 و 5 نجوم").max(5, "يرجى تحديد تقييم صحيح بين 1 و 5 نجوم"),
  comment: z.string().trim().max(1000, "التعليق طويل جداً"),
});

export interface ReviewItem {
  id: string;
  service_id: string;
  customer_id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
  users?: {
    full_name?: string | null;
  } | null;
}

export async function submitServiceReviewAction(serviceId: string, rating: number, comment: string) {
  try {
    const parsed = ReviewSchema.safeParse({ serviceId, rating, comment });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "بيانات التقييم غير صالحة" };

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "يجب تسجيل الدخول لإضافة تقييم" };
    }

    // التحقق من أن المستخدم قد حجز هذه الخدمة سابقاً (منع التقييمات العشوائية)
    const { data: pastBooking } = await supabase
      .from("bookings")
      .select("id")
      .eq("customer_id", user.id)
      .eq("service_id", parsed.data.serviceId)
      .in("status", ["COMPLETED"])
      .limit(1)
      .maybeSingle();

    if (!pastBooking) {
      return { success: false, error: "لا يمكنك تقييم خدمة لم تستخدمها" };
    }

    const { error } = await supabase.from("reviews").upsert(
      {
        service_id: parsed.data.serviceId,
        customer_id: user.id,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
      },
      { onConflict: "service_id,customer_id" }
    );

    if (error) {
      return { success: false, error: "تعذر حفظ التقييم حالياً" };
    }

    revalidatePath(`/services/${parsed.data.serviceId}`);
    revalidatePath("/services");
    return { success: true };
  } catch {
    return { success: false, error: "فشل حفظ التقييم" };
  }
}

export async function getServiceReviewsAction(serviceId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );

    const { data: reviews, error } = await supabase
      .from("reviews")
      .select("id, service_id, customer_id, rating, comment, created_at, users(full_name)")
      .eq("service_id", serviceId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return { success: true, reviews: [], averageRating: 0 };
    }

    const typedReviews = (reviews || []) as unknown as ReviewItem[];
    const total = typedReviews.reduce((acc, r) => acc + r.rating, 0);
    const averageRating = typedReviews.length > 0 ? Number((total / typedReviews.length).toFixed(1)) : 0;

    return { success: true, reviews: typedReviews, averageRating };
  } catch {
    return { success: false, error: "فشل جلب التقييمات" };
  }
}
