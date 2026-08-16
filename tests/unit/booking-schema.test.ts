import { describe, it, expect } from "vitest";
import { CreateBookingSchema } from "@/lib/schemas/booking-schema";

describe("CreateBookingSchema Validation Unit Tests", () => {
  it("ينبغي قبول بيانات الحجز الأردنية الصحيحة", () => {
    const validPayload = {
      serviceId: "123e4567-e89b-12d3-a456-426614174000",
      providerId: "123e4567-e89b-12d3-a456-426614174001",
      bookingDate: "2026-09-01",
      startTime: "10:00:00",
      endTime: "11:00:00",
      phone: "0791234567",
      address: "عمان - شارع مكة - عمارة 12",
      idempotencyKey: "unique_key_1234567890",
    };

    const result = CreateBookingSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("ينبغي رفض رقم الهاتف غير الأردني", () => {
    const invalidPayload = {
      serviceId: "123e4567-e89b-12d3-a456-426614174000",
      bookingDate: "2026-09-01",
      startTime: "10:00:00",
      endTime: "11:00:00",
      phone: "0123456789", // مقدمة غير أردنية
      address: "عمان - شارع مكة",
      idempotencyKey: "unique_key_1234567890",
    };

    const result = CreateBookingSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });
});