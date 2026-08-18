import { z } from "zod";

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
};

export const CreateBookingSchema = z.object({
  serviceId: z.string().uuid("معرف الخدمة غير صالح"),
  providerId: z.string().uuid("معرف مزود الخدمة غير صالح").optional().nullable(),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ الحجز غير صالح (YYYY-MM-DD)"),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "وقت البدء غير صالح"),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "وقت الانتهاء غير صالح"),
  notes: z.string().trim().max(500, "الملاحظات يجب ألا تتجاوز 500 حرف").optional(),
  phone: z.string().regex(/^(077|078|079)\d{7}$/, "يرجى إدخال رقم هاتف أردني صحيح (مثال: 0791234567)"),
  address: z.string().trim().min(5, "العنوان يجب أن يتكون من 5 حروف على الأقل").max(300, "العنوان طويل جداً"),
  idempotencyKey: z.string().min(10, "مفتاح التكرار غير صالح").max(100, "مفتاح التكرار طويل جداً").regex(/^[A-Za-z0-9_-]+$/, "مفتاح التكرار غير صالح"),
}).superRefine((booking, context) => {
  const todayInJordan = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Amman",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  if (booking.bookingDate < todayInJordan) {
    context.addIssue({
      code: "custom",
      path: ["bookingDate"],
      message: "لا يمكن الحجز في تاريخ سابق",
    });
  }

  if (timeToMinutes(booking.endTime) <= timeToMinutes(booking.startTime)) {
    context.addIssue({
      code: "custom",
      path: ["endTime"],
      message: "وقت انتهاء الخدمة يجب أن يكون بعد وقت البدء",
    });
  }
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
