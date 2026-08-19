import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerPushSubscriptionAction, removePushDeviceAction } from "@/lib/actions/push-notifications";
import { createServerSupabaseClient, getAuthenticatedUser } from "@/lib/supabase/server";

vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue({ get: vi.fn().mockReturnValue("test-agent") }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn().mockResolvedValue({ success: true }) }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: vi.fn(), getAuthenticatedUser: vi.fn() }));

describe("push subscription ownership", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not write a subscription for an unauthenticated request", async () => {
    const upsert = vi.fn();
    vi.mocked(createServerSupabaseClient).mockResolvedValue({ from: vi.fn(() => ({ upsert })) } as never);
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    const result = await registerPushSubscriptionAction({ endpoint: "https://push.example.test/subscription/123456789", p256dh: "a".repeat(32), auth: "b".repeat(16), expirationTime: null });
    expect(result.success).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("always scopes device deletion to the authenticated owner", async () => {
    const secondEq = vi.fn().mockResolvedValue({ error: null });
    const firstEq = vi.fn(() => ({ eq: secondEq }));
    const remove = vi.fn(() => ({ eq: firstEq }));
    vi.mocked(createServerSupabaseClient).mockResolvedValue({ from: vi.fn(() => ({ delete: remove })) } as never);
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } as never);
    const result = await removePushDeviceAction("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    expect(result.success).toBe(true);
    expect(firstEq).toHaveBeenCalledWith("id", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    expect(secondEq).toHaveBeenCalledWith("user_id", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });
});
