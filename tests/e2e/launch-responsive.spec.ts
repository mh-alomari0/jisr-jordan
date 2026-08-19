import { expect, test } from "@playwright/test";

const widths = [320, 375, 390, 430, 768, 1024, 1440];

test("homepage and live service catalog remain usable at launch viewports", async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

    await page.goto("/services");
    await expect(page.getByRole("heading", { level: 1, name: "خدمات الصيانة المنزلية" })).toBeVisible();
    await expect(page.getByRole("link", { name: "حجز الخدمة الآن" })).toHaveCount(16);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }
});
