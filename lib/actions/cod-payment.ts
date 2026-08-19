"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

const BookingIdSchema = z.string().uuid();

/** Create an idempotent cash-on-completion payment atomically in PostgreSQL. */
export async function createCODPaymentAction(bookingId: string) {
  const parsedId = BookingIdSchema.safeParse(bookingId);
  if (!parsedId.success) {
    return { success: false, error: "معرف الحجز غير صالح" };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "يجب تسجيل الدخول أولاً" };

    const rateLimit = await checkRateLimit(`payment:cod:${user.id}`, { limit: 5, windowMs: 10 * 60_000 });
    if (!rateLimit.success) return { success: false, error: rateLimit.error };

    const { data, error } = await supabase.rpc("create_cod_payment", {
      p_booking_id: parsedId.data,
    });

    if (error || !data?.success) {
      const messages: Record<string, string> = {
        BOOKING_NOT_FOUND: "الحجز غير موجود أو لا يخص حسابك",
        INVALID_STATUS: "حالة الحجز لا تسمح بإنشاء طلب دفع",
        PAYMENT_EXISTS: "يوجد طلب دفع نشط لهذا الحجز",
        INVALID_AMOUNT: "قيمة الخدمة غير صالحة",
      };
      logger.warn("COD payment request rejected", {
        context: "CODPayment",
        userId: user.id,
        metadata: { bookingId: parsedId.data, code: data?.error || error?.code },
      });
      return { success: false, error: messages[data?.error] || "فشل إنشاء طلب الدفع" };
    }

    revalidatePath("/bookings");
    revalidatePath(`/bookings/${parsedId.data}`);
    return { success: true, payment: data.payment };
  } catch (error) {
    logger.error("COD payment error", { context: "CODPayment", error });
    return { success: false, error: "حدث خطأ غير متوقع" };
  }
}
