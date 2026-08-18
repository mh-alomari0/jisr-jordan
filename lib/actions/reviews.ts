"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export interface ReviewItem {
  id: string;
  service_id: string;
  customer_id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
  users?: {
    email?: string | null;
  } | null;
}

export async function submitServiceReviewAction(serviceId: string, rating: number, comment: string) {
  try {
    if (!serviceId || rating < 1 || rating > 5) {
      return { success: false, error: "يرجى تحديد تقييم صحيح بين 1 و 5 نجوم" };
    }

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
      .eq("service_id", serviceId)
      .in("status", ["COMPLETED"])
      .limit(1)
      .maybeSingle();

    if (!pastBooking) {
      return { success: false, error: "لا يمكنك تقييم خدمة لم تستخدمها" };
    }

    const { error } = await supabase.from("reviews").upsert(
      {
        service_id: serviceId,
        customer_id: user.id,
        rating,
        comment,
      },
      { onConflict: "service_id,customer_id" }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/services/${serviceId}`);
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
      .select("*, users(full_name)")
      .eq("service_id", serviceId)
      .order("created_at", { ascending: false });

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