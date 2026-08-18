"use server";

import { createServerSupabaseClient, getAuthenticatedUser, isAdminRole } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Get admin payments list with pagination and filters.
 */
export async function getAdminPaymentsAction(params?: {
  page?: number;
  limit?: number;
  status?: string;
  method?: string;
}) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "غير مصرح" };
    if (!(await isAdminRole())) return { success: false, error: "غير مصرح: للمسؤولين فقط" };

    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const offset = (page - 1) * limit;

    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from("payments")
      .select("*, bookings(id, booking_date, status, services(title)), users(full_name, email)", { count: "exact" })
      .order("created_at", { ascending: false });

    if (params?.status) {
      query = query.eq("status", params.status);
    }
    if (params?.method) {
      query = query.eq("payment_method", params.method);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      logger.error("Failed to fetch admin payments", { context: "AdminPayments", error });
      return { success: false, error: "تعذر تحميل سجل المدفوعات" };
    }

    return {
      success: true,
      payments: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (err) {
    logger.error("Admin payments error", { context: "AdminPayments", error: err });
    return { success: false, error: "حدث خطأ غير متوقع" };
  }
}
