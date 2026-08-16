"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { CreateBookingSchema, type CreateBookingInput } from "@/lib/schemas/booking-schema";
import { notificationService } from "@/lib/notifications";

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
    notificationService
      .dispatch({
        recipient: {
          userId: user.id,
          email: user.email,
          phone: validated.phone,
        },
        event: "BOOKING_CREATED",
        details: {
          bookingId: data.booking_id,
          serviceTitle: "خدمة صيانة منزلية",
          bookingDate: validated.bookingDate,
          startTime: validated.startTime,
          address: validated.address,
        },
        channels: ["EMAIL", "WHATSAPP", "IN_APP"],
      })
      .catch(() => {
        // فشل التنبيه لا يعطل العملية التي نجحت في قاعدة البيانات
      });

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