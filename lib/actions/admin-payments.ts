"use server";

import { createServerSupabaseClient, getAuthenticatedUser, getUserRole, isAdminRole } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { unstable_rethrow } from "next/navigation";

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
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false, error: "غير مصرح" };
    const role = await getUserRole(supabase, user.id);
    if (!isAdminRole(role)) return { success: false, error: "غير مصرح: للمسؤولين فقط" };

    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("payments")
      .select("id, booking_id, customer_id, amount, currency, payment_method, status, created_at, bookings(id, booking_date, status, service_id, service_title), users(full_name, email)", { count: "exact" })
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

    const payments = (data || []).map((payment) => {
      const booking = Array.isArray(payment.bookings)
        ? payment.bookings[0] || null
        : payment.bookings;
      const customer = Array.isArray(payment.users)
        ? payment.users[0] || null
        : payment.users;

      return {
        ...payment,
        bookings: booking
          ? {
              id: booking.id,
              booking_date: booking.booking_date,
              status: booking.status,
              services: booking.service_title
                ? { title: booking.service_title }
                : null,
            }
          : null,
        users: customer,
      };
    });

    return {
      success: true,
      payments,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (err) {
    unstable_rethrow(err);
    logger.error("Admin payments error", { context: "AdminPayments", error: err });
    return { success: false, error: "حدث خطأ غير متوقع" };
  }
}
