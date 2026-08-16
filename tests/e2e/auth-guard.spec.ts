import { test, expect } from "@playwright/test";

test.describe("Root Middleware E2E Auth Guard Checks", () => {
  test("ينبغي تحويل الزائر غير المسجل من /admin إلى صفحة /login عبر HTTP حقيقي", async ({ page }) => {
    // زيارة /admin بدون أي جلسة أو كوكيز مسجلة
    await page.goto("/admin");

    // التأكد من أن الميدلوير الرئيسي بالشهادة الحقيقية قد نفذ إعادة التوجيه
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fadmin/);
  });

  test("ينبغي تحويل الزائر غير المسجل من /bookings إلى /login", async ({ page }) => {
    await page.goto("/bookings");
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fbookings/);
  });

  test("ينبغي السماح للزائر بفتح الصفحات العامة مثل /services بدون تحويل", async ({ page }) => {
    await page.goto("/services");
    await expect(page).toHaveURL(/\/services/);
  });
});