"use server";

import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPaymentGatewayAdapter } from "@/lib/payment-gateway";

const BookingIdSchema = z.string().uuid();

/**
 * Electronic payments intentionally fail closed until a real gateway adapter,
 * credentials, callback contract, and reconciliation process are configured.
 * Cash on delivery is implemented separately in cod-payment.ts.
 */
export async function createPaymentIntentAction(bookingId: string) {
  const parsedId = BookingIdSchema.safeParse(bookingId);
  if (!parsedId.success) {
    return { success: false, code: "INVALID_BOOKING_ID", error: "معرف الحجز غير صالح" };
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, code: "UNAUTHORIZED", error: "غير مصرح بالوصول" };
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, customer_id")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (!booking || booking.customer_id !== user.id) {
    return { success: false, code: "FORBIDDEN", error: "الحجز غير موجود أو لا يخص حسابك" };
  }

  if (!getPaymentGatewayAdapter()) {
    return {
      success: false,
      code: "ONLINE_PAYMENT_NOT_CONFIGURED",
      error: "الدفع الإلكتروني غير متاح حالياً. يمكنك اختيار الدفع عند إكمال الخدمة.",
    };
  }

  return {
    success: false,
    code: "ONLINE_PAYMENT_NOT_CONFIGURED",
    error: "الدفع الإلكتروني غير متاح حالياً.",
  };
}
