import { describe, it, expect, vi, beforeEach } from "vitest";
import { createServerClient } from "@supabase/ssr";
import { createBookingAction } from "@/lib/actions/create-booking";
import { deleteAccountAction } from "@/lib/actions/delete-account";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

vi.mock("@/lib/notifications", () => ({
  notificationService: { dispatch: vi.fn().mockResolvedValue({ success: true }) },
}));

const validBookingInput = {
  serviceId: "123e4567-e89b-12d3-a456-426614174000",
  bookingDate: "2026-09-01",
  startTime: "10:00:00",
  endTime: "11:00:00",
  phone: "0791234567",
  address: "عمان - شارع مكة - عمارة 12",
  idempotencyKey: "unique_key_1234567890",
};

describe("createBookingAction — Real Function Security Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  });

  it("ينبغي رفض الحجز بكود UNAUTHORIZED إذا لم توجد جلسة مستخدم صالحة", async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as unknown as ReturnType<typeof createServerClient>);

    const result = await createBookingAction(validBookingInput);

    expect(result.success).toBe(false);
    expect(result.code).toBe("UNAUTHORIZED");
  });

  it("ينبغي رفض الحجز بكود VALIDATION_ERROR عند إدخال رقم هاتف غير أردني، دون استدعاء قاعدة البيانات", async () => {
    const mockRpc = vi.fn();
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "usr_1", email: "client@test.com" } },
          error: null,
        }),
      },
      rpc: mockRpc,
    } as unknown as ReturnType<typeof createServerClient>);

    const result = await createBookingAction({ ...validBookingInput, phone: "0123456789" });

    expect(result.success).toBe(false);
    expect(result.code).toBe("VALIDATION_ERROR");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("ينبغي إنشاء الحجز بنجاح واستدعاء create_booking_atomic بمعرف المستخدم المسجل فعلياً", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: { booking_id: "booking_999" },
      error: null,
    });

    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "usr_1", email: "client@test.com" } },
          error: null,
        }),
      },
      rpc: mockRpc,
    } as unknown as ReturnType<typeof createServerClient>);

    const result = await createBookingAction(validBookingInput);

    expect(result.success).toBe(true);
    expect(result.data?.bookingId).toBe("booking_999");
    expect(mockRpc).toHaveBeenCalledWith(
      "create_booking_atomic",
      expect.objectContaining({ p_customer_id: "usr_1" })
    );
  });

  it("ينبغي إرجاع كود SLOT_TAKEN عند تعارض الموعد بدون كسر التطبيق", async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "usr_1", email: "client@test.com" } },
          error: null,
        }),
      },
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "SLOT_OCCUPIED: الموعد محجوز" },
      }),
    } as unknown as ReturnType<typeof createServerClient>);

    const result = await createBookingAction(validBookingInput);

    expect(result.success).toBe(false);
    expect(result.code).toBe("SLOT_TAKEN");
  });
});

describe("deleteAccountAction — Real Function Security Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  });

  it("ينبغي رفض حذف الحساب برسالة تسجيل الدخول الصريحة دون استدعاء RPC إطلاقاً عند غياب الجلسة", async () => {
    const mockRpc = vi.fn();
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      rpc: mockRpc,
    } as unknown as ReturnType<typeof createServerClient>);

    const result = await deleteAccountAction();

    expect(result.success).toBe(false);
    expect(result.error).toBe("يجب تسجيل الدخول لإجراء هذه العملية");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("ينبغي استدعاء delete_user_account_securely بمعرف المستخدم المسجل نفسه فقط، ثم تسجيل الخروج", async () => {
    const mockRpc = vi.fn().mockResolvedValue({ error: null });
    const mockSignOut = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "usr_self_123", email: "client@test.com" } },
          error: null,
        }),
        signOut: mockSignOut,
      },
      rpc: mockRpc,
    } as unknown as ReturnType<typeof createServerClient>);

    const result = await deleteAccountAction();

    expect(result.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith("delete_user_account_securely", {
      p_user_id: "usr_self_123",
    });
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("ينبغي إرجاع فشل واضح عند خطأ الـ RPC دون استدعاء signOut", async () => {
    const mockSignOut = vi.fn();

    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "usr_1", email: "client@test.com" } },
          error: null,
        }),
        signOut: mockSignOut,
      },
      rpc: vi.fn().mockResolvedValue({ error: { message: "DB error" } }),
    } as unknown as ReturnType<typeof createServerClient>);

    const result = await deleteAccountAction();

    expect(result.success).toBe(false);
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});