"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { CreateBookingSchema, type CreateBookingInput } from "@/lib/schemas/booking-schema";
import { logger } from "@/lib/logger";

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
};

export async function createBookingAction(
  input: CreateBookingInput
): Promise<ActionResponse<{ bookingId: string }>> {
  try {
    // 1. التحقق من صحة البيانات سيرفرياً بـ Zod
    const validated = CreateBookingSchema.parse(input);
    const cookieStore = await cookies();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Handled in middleware
          }
        },
      },
    });

    // 2. التثبت من هوية المستخدم المسجل
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "يجب تسجيل الدخول أولاً لإتمام الحجز",
        code: "UNAUTHORIZED",
      };
    }

    // 3. استدعاء الإجراء المخزن في Postgres لمنع التضارب والحجز المزدوج
    const { data, error } = await supabase.rpc("create_booking_atomic", {
      p_customer_id: user.id,
      p_service_id: validated.serviceId,
      p_provider_id: validated.providerId || null,
      p_booking_date: validated.bookingDate,
      p_start_time: validated.startTime,
      p_end_time: validated.endTime,
      p_idempotency_key: validated.idempotencyKey,
      p_phone: validated.phone,
      p_address: validated.address,
      p_notes: validated.notes || null,
    });

    if (error) {
      if (error.message.includes("SLOT_OCCUPIED")) {
        return {
          success: false,
          error: "عذراً، هذا الموعد تم حجزه للتو من قبل عميل آخر. يرجى اختيار موعد آخر.",
          code: "SLOT_TAKEN",
        };
      }
      return {
        success: false,
        error: "حدث خطأ أثناء معالجة الحجز، يرجى المحاولة لاحقاً.",
        code: "DATABASE_ERROR",
      };
    }

    // 4. إرسال الإشعارات تلقائياً في الخلفية (Email, WhatsApp, In-App) دون تعطيل الاستجابة
    try {
      const { error: notificationError } = await supabase.from("notifications").insert({
        user_id: user.id,
        title: `تم استلام طلب حجزك #${String(data.booking_id).slice(0, 8)}`,
        message: `تم استلام حجز خدمة ${data.service_title || "منزلية"} بتاريخ ${validated.bookingDate} في ${validated.startTime}.`,
        type: "BOOKING",
      });
      if (notificationError) {
        logger.warn("Booking created without in-app notification", {
          context: "CreateBooking",
          userId: user.id,
          metadata: { bookingId: data.booking_id },
        });
      }
    } catch (notificationError) {
      logger.warn("Booking notification persistence failed", {
        context: "CreateBooking",
        userId: user.id,
        metadata: { bookingId: data.booking_id },
        error: notificationError,
      });
    }

    return {
      success: true,
      data: { bookingId: data.booking_id },
    };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "name" in err && err.name === "ZodError") {
      return {
        success: false,
        error: "البيانات المدخلة غير صالحة. يرجى التأكد من رقم الهاتف والعنوان.",
        code: "VALIDATION_ERROR",
      };
    }

    return {
      success: false,
      error: "حدث خطأ غير متوقع في النظام.",
      code: "INTERNAL_ERROR",
    };
  }
}
