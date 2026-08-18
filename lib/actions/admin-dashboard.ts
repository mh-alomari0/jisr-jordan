"use server";

import { createServerSupabaseClient, getUserRole, isAdminRole } from "@/lib/supabase/server";

export interface DashboardStats {
  totalRevenue: number;
  completedBookingsCount: number;
  pendingBookingsCount: number;
  totalUsersCount: number;
}

export async function getAdminDashboardStatsAction() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "غير مصرح بالوصول" };

    if (!isAdminRole(await getUserRole(supabase, user.id))) {
      return { success: false, error: "غير مصرح لك بالوصول لإحصائيات اللوحة" };
    }

    const { data, error } = await supabase.rpc("get_admin_dashboard_metrics");
    if (error || !data) {
      return { success: false, error: "فشل تحميل إحصائيات لوحة التحكم" };
    }

    const stats: DashboardStats = {
      totalRevenue: Number(data.totalRevenue) || 0,
      completedBookingsCount: Number(data.completedBookingsCount) || 0,
      pendingBookingsCount: Number(data.pendingBookingsCount) || 0,
      totalUsersCount: Number(data.totalUsersCount) || 0,
    };
    return { success: true, stats };
  } catch {
    return { success: false, error: "فشل تحميل إحصائيات لوحة التحكم" };
  }
}
