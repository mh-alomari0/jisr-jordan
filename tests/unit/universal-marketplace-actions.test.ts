import { beforeEach, describe, expect, it, vi } from "vitest";
import { acceptProviderQuoteAction, requestListingQuoteAction } from "@/lib/actions/marketplace-transactions";
import { createProviderListingAction } from "@/lib/actions/provider-listings";
import { createProviderPostAction } from "@/lib/actions/provider-content";
import { createServerSupabaseClient, getAuthenticatedUser } from "@/lib/supabase/server";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 10, reset: Date.now() + 1000 }) }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}));

const user = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" };
const listingId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const quoteId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("universal marketplace server boundaries", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("rejects an unauthenticated quote request before invoking the guarded RPC", async () => {
    const rpc = vi.fn();
    vi.mocked(createServerSupabaseClient).mockResolvedValue({ rpc } as never);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    const result = await requestListingQuoteAction({
      listingId, requirements: "أحتاج تنفيذ مشروع واضح مع هذه المتطلبات التفصيلية", budget: 100,
      targetDate: null, idempotencyKey: "quote_request_123",
    });
    expect(result.success).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sends quote ownership and listing resolution to the database RPC without client provider id", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { success: true, quote_request_id: quoteId }, error: null });
    vi.mocked(createServerSupabaseClient).mockResolvedValue({ rpc } as never);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(user as never);
    const result = await requestListingQuoteAction({
      listingId, requirements: "أحتاج تنفيذ مشروع واضح مع هذه المتطلبات التفصيلية", budget: 100,
      targetDate: "2026-09-01", idempotencyKey: "quote_request_123",
    });
    expect(result.success).toBe(true);
    expect(rpc).toHaveBeenCalledWith("request_listing_quote", expect.objectContaining({ p_listing_id: listingId }));
    expect(rpc.mock.calls[0][1]).not.toHaveProperty("p_provider_id");
    expect(rpc.mock.calls[0][1]).not.toHaveProperty("p_customer_id");
  });

  it("accepts a quote by id and schedule only so the client cannot manipulate price or commission", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { success: true, booking_id: listingId }, error: null });
    vi.mocked(createServerSupabaseClient).mockResolvedValue({ rpc } as never);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(user as never);
    const result = await acceptProviderQuoteAction({
      quoteId, bookingDate: "2026-09-01", startTime: "10:00", endTime: "11:00",
      phone: "0791234567", address: "عمّان، شارع الجامعة", idempotencyKey: "accept_quote_123",
    });
    expect(result.success).toBe(true);
    const payload = rpc.mock.calls[0][1];
    expect(payload).not.toHaveProperty("p_amount");
    expect(payload).not.toHaveProperty("p_commission_rate");
    expect(payload).not.toHaveProperty("p_provider_id");
  });

  it("prevents a non-approved account from creating a listing before insert", async () => {
    const insert = vi.fn();
    const client = {
      from: vi.fn((table: string) => table === "provider_profiles" ? {
        select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { application_status: "PENDING_VERIFICATION", is_verified: false } }) })) })),
      } : { insert }),
    };
    vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(user as never);
    const result = await createProviderListingAction({
      serviceTypeId: "55555555-5555-4555-8555-555555555555",
      title: "تطوير متجر إلكتروني", shortDescription: "متجر عربي سريع ومتجاوب للأعمال المحلية",
      description: "تطوير متجر إلكتروني متكامل مع تجربة عربية متجاوبة ولوحة إدارة واضحة.",
      categoryId: listingId, deliveryType: "REMOTE", pricingModel: "QUOTE_REQUIRED",
      basePrice: null, estimatedDurationMinutes: 1440, serviceAreas: [],
    });
    expect(result.success).toBe(false);
    expect(insert).not.toHaveBeenCalled();
  });

  it("prevents an unapproved account from publishing provider content", async () => {
    const insert = vi.fn();
    const client = {
      from: vi.fn((table: string) => table === "provider_profiles" ? {
        select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) })) })),
      } : { insert }),
    };
    vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(user as never);
    const result = await createProviderPostAction({ content: "نصيحة مهنية مفيدة", postType: "TIP", listingId: null });
    expect(result.success).toBe(false);
    expect(insert).not.toHaveBeenCalled();
  });
});
