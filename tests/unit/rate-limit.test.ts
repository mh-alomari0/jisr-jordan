import { describe, it, expect } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("Rate Limiter Unit Tests", () => {
  it("ينبغي السماح بالطلبات ضمن الحد وحظر الطلب الزائد", () => {
    const config = { limit: 2, windowMs: 10000 };
    const testKey = "test_ip_999";

    // الطلب الأول والثاني مقبولان
    expect(checkRateLimit(testKey, config).success).toBe(true);
    expect(checkRateLimit(testKey, config).success).toBe(true);

    // الطلب الثالث يتم حظره
    expect(checkRateLimit(testKey, config).success).toBe(false);
  });
});