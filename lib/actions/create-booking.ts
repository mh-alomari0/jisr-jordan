"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { CreateBookingSchema, type CreateBookingInput } from "@/lib/schemas/booking-schema";

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