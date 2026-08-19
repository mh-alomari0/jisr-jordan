import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServerClient } from "@supabase/ssr";
import { approveProviderAction, assignProviderToBookingAction } from "@/lib/actions/admin-providers";
import { createCODPaymentAction } from "@/lib/actions/cod-payment";

vi.mock("next/headers", () => ({ cookies: vi.fn().mockResolvedValue({ getAll: vi.fn().mockReturnValue([]), set: vi.fn() }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));

function adminClient(role: string, rpc: ReturnType<typeof vi.fn>) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } }, error: null }) },
    from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { role } }) }) }) }),
    rpc,
  } as unknown as ReturnType<typeof createServerClient>;
}

describe("provider approval, assignment, and COD action boundaries", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("blocks provider approval before invoking the database when actor is not admin", async () => {
    const rpc = vi.fn();
    vi.mocked(createServerClient).mockReturnValue(adminClient("CUSTOMER", rpc));
    const result = await approveProviderAction("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    expect(result.success).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("passes provider approval actor and decision to the guarded RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
    vi.mocked(createServerClient).mockReturnValue(adminClient("ADMIN", rpc));
    const providerId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    expect((await approveProviderAction(providerId)).success).toBe(true);
    expect(rpc).toHaveBeenCalledWith("review_provider_application", {
      p_provider_id: providerId, p_actor_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", p_decision: "APPROVE", p_reason: null,
    });
  });

  it("passes assignment only through the guarded assignment RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
    vi.mocked(createServerClient).mockReturnValue(adminClient("ADMIN", rpc));
    const bookingId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const providerId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    expect((await assignProviderToBookingAction(bookingId, providerId)).success).toBe(true);
    expect(rpc).toHaveBeenCalledWith("assign_provider_to_booking", {
      p_booking_id: bookingId, p_provider_id: providerId, p_assigned_by: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
  });

  it("creates COD only for the authenticated user through the idempotent RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { success: true, payment: { status: "PAY_ON_COMPLETION" } }, error: null });
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" } }, error: null }) },
      rpc,
    } as unknown as ReturnType<typeof createServerClient>);
    const bookingId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const result = await createCODPaymentAction(bookingId);
    expect(result.success).toBe(true);
    expect(rpc).toHaveBeenCalledWith("create_cod_payment", { p_booking_id: bookingId });
  });
});
