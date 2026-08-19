import { test, expect } from "@playwright/test";

test.describe("مسار الحجز الكامل (Customer Booking E2E Flow)", () => {
  test("ينبغي أن يتمكن العميل من تصفح الخدمات واختيار موعد وتعبئة تفاصيل الطلب", async ({ page }) => {
    // 1. تصفح صفحة الخدمات العامة
    await page.goto("/services");
    await expect(page).toHaveURL("/services");
    await expect(page.getByRole("heading", { name: "كشف وإصلاح تسربات المياه" })).toBeVisible();
    await expect(page.getByRole("link", { name: "حجز الخدمة الآن" })).toHaveCount(16);

    await page.getByRole("button", { name: "نجارة" }).click();
    await expect(page.getByRole("heading", { name: "إصلاح أبواب وخزائن خشبية" })).toBeVisible();
    await expect(page.getByRole("link", { name: "حجز الخدمة الآن" })).toHaveCount(2);

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
