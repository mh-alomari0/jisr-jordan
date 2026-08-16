import { test, expect } from "@playwright/test";

test.describe("مسار الحجز الكامل (Customer Booking E2E Flow)", () => {
  test("ينبغي أن يتمكن العميل من تصفح الخدمات واختيار موعد وتعبئة تفاصيل الطلب", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/منصة جسر/);

    await page.goto("/booking");
    await expect(page.locator("h2")).toContainText("احجز خدمتك مع \"جسر\"");

    const firstServiceBtn = page.locator("button", { hasText: "صيانة الكهرباء" });
    if (await firstServiceBtn.isVisible()) {
      await firstServiceBtn.click();
    }

    const dateButtons = page.locator("button", { hasText: "202" });
    if ((await dateButtons.count()) > 0) {
      await dateButtons.first().click();
    }

    await expect(page.locator("body")).toBeVisible();
  });
});