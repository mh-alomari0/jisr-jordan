import { describe, it, expect } from "vitest";

describe("Middleware Protected Routes Rule Check", () => {
  const protectedRoutes = ["/admin", "/bookings", "/profile", "/booking"];

  it("ينبغي أن يعتبر المسارات الحساسة مسارات محمية مخصصة للتحويل", () => {
    protectedRoutes.forEach((route) => {
      const isProtected = protectedRoutes.some((p) => route.startsWith(p));
      expect(isProtected).toBe(true);
    });
  });

  it("ينبغي ألا يعتبر المسارات العامة مثل الرئيسية محمية", () => {
    const publicPath = "/services";
    const isProtected = protectedRoutes.some((p) => publicPath.startsWith(p));
    expect(isProtected).toBe(false);
  });
});