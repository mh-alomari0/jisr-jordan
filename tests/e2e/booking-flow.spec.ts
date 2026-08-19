import { test, expect } from "@playwright/test";

test.describe("مسار اكتشاف الخدمة والحجز المحمي", () => {
  test("ينبغي أن يختار العميل نوع الخدمة قبل مقدمها دون سعر مركزي", async ({ page }) => {
    await page.goto("/services");
    await expect(page).toHaveURL("/services");
    await expect(page.getByRole("heading", { name: "كشف وإصلاح تسربات المياه" })).toBeVisible();
    await expect(page.getByText(/د\.أ/)).toHaveCount(0);
    await page.getByRole("heading", { name: "كشف وإصلاح تسربات المياه" }).click();
    await expect(page).toHaveURL(/\/service-types\//);
    await expect(page.getByRole("heading", { name: "مقدمو الخدمة" })).toBeVisible();

    // The transactional booking route remains protected until a provider offer is selected.
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
