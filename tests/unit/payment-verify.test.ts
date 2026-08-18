import { describe, expect, it } from "vitest";
import { POST } from "../../app/api/payments/verify/route";

describe("Payment verification endpoint", () => {
  it("يفشل بحالة واضحة وآمنة حتى تركيب موصل بوابة حقيقي", async () => {
    const response = await POST();
    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toEqual({
      error: "Electronic payment verification is not configured",
    });
  });
});
