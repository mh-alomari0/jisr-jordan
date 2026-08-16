"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export type AdminBookingStatus = "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

async function getAdminSupabase() {
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
  if (!user) return { supabase: null, role: null };

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role || user.app_metadata?.role;
  return { supabase, role };
}

export async function adminCancelBookingAction(bookingId: string) {
  try {
    const { supabase, role } = await getAdminSupabase();
    if (!supabase || !["ADMIN", "SUPER_ADMIN"].includes(role || "")) {
      return { success: false, error: "غير مصرح لك بإلغاء الحجوزات" };
    }

    const { error } = await supabase
      .from("bookings")
      .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
      .eq("id", bookingId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/bookings");
    return { success: true };
  } catch {
    return { success: false, error: "فشل إلغاء الحجز" };
  }
}