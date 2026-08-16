import { z } from "zod";

export const CreateBookingSchema = z.object({
  serviceId: z.string().uuid("معرف الخدمة غير صالح"),
  providerId: z.string().uuid("معرف مزود الخدمة غير صالح").optional().nullable(),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ الحجز غير صالح (YYYY-MM-DD)"),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "وقت البدء غير صالح"),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "وقت الانتهاء غير صالح"),
  notes: z.string().max(500, "الملاحظات يجب ألا تتجاوز 500 حرف").optional(),
  phone: z.string().regex(/^(077|078|079)\d{7}$/, "يرجى إدخال رقم هاتف أردني صحيح (مثال: 0791234567)"),
  address: z.string().min(5, "العنوان يجب أن يتكون من 5 حروف على الأقل"),
  idempotencyKey: z.string().min(10, "مفتاح التكرار غير صالح"),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;