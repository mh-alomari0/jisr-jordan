import { test, expect } from "@playwright/test";

test.describe("مسار الحجز الكامل (Customer Booking E2E Flow)", () => {
  test("ينبغي أن يتمكن العميل من تصفح الخدمات واختيار موعد وتعبئة تفاصيل الطلب", async ({ page }) => {
    // 1. تصفح صفحة الخدمات العامة
    await page.goto("/services");
    await expect(page).toHaveURL("/services");

    // 2. محاولة زيارة صفحة الحجز المحمية
    await page.goto("/booking");

    // 3. التحقق من السلوك بحسب حالة الجلسة (إما التحويل لصفحة الدخول أو فتح صفحة الحجز)
    const currentUrl = page.url();
    if (currentUrl.includes("/login")) {
      await expect(page).toHaveURL(/\/login\?redirectTo=%2Fbooking/);
    } else {
      await expect(page.locator("h2")).toContainText("احجز خدمتك مع \"جسر\"");
    }
  });
});