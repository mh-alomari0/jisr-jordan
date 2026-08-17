"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export interface DashboardStats {
  totalRevenue: number;
  completedBookingsCount: number;
  pendingBookingsCount: number;
  totalUsersCount: number;
}

export async function getAdminDashboardStatsAction() {
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالوصول" };
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role || user.app_metadata?.role;
    if (!["ADMIN", "SUPER_ADMIN"].includes(role || "")) {
      return { success: false, error: "غير مصرح لك بالوصول لإحصائيات اللوحة" };
    }

    const [bookingsRes, usersRes] = await Promise.all([
      supabase.from("bookings").select("status, services(price)"),
      supabase.from("users").select("id", { count: "exact", head: true }),
    ]);

    const bookings = bookingsRes.data || [];
    const totalUsersCount = usersRes.count || 0;

    let totalRevenue = 0;
    let completedBookingsCount = 0;
    let pendingBookingsCount = 0;

    bookings.forEach((b) => {
      if (b.status === "COMPLETED") {
        completedBookingsCount += 1;
        const servicePrice = (b.services as unknown as { price?: number })?.price || 0;
        totalRevenue += servicePrice;
      } else if (b.status === "PENDING" || b.status === "IN_PROGRESS") {
        pendingBookingsCount += 1;
      }
    });

    const stats: DashboardStats = {
      totalRevenue,
      completedBookingsCount,
      pendingBookingsCount,
      totalUsersCount,
    };

    return { success: true, stats };
  } catch {
    return { success: false, error: "فشل تحميل إحصائيات لوحة التحكم" };
  }
}