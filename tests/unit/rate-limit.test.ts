import { describe, it, expect } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("Rate Limiter Unit Tests", () => {
  it("ينبغي أن يسمح بالطلبات ضمن الحد المسموح ويرفض ما يتجاوزه", async () => {
    const testKey = `test_ip_${Date.now()}`;
    const config = { limit: 2, windowMs: 60000 };

    const req1 = await checkRateLimit(testKey, config);
    expect(req1.success).toBe(true);

    const req2 = await checkRateLimit(testKey, config);
    expect(req2.success).toBe(true);

    const req3 = await checkRateLimit(testKey, config);
    expect(req3.success).toBe(false);
  });
});