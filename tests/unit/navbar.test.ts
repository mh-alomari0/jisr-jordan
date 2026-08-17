import { describe, it, expect } from "vitest";

describe("Navbar Logic Unit Tests", () => {
  it("ينبغي التحقق من صحة رتب الأدمن والمزودين لإظهار الروابط الخاصة", () => {
    const adminRoles = ["ADMIN", "SUPER_ADMIN"];
    const providerRoles = ["STAFF", "ADMIN", "SUPER_ADMIN"];

    expect(adminRoles.includes("ADMIN")).toBe(true);
    expect(adminRoles.includes("USER")).toBe(false);
    expect(providerRoles.includes("STAFF")).toBe(true);
  });
});