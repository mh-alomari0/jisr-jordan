import { expect, test } from "@playwright/test";

test.describe("Universal marketplace public discovery", () => {
  test("home exposes database-driven mega categories and search conversion", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /أي خدمة تحتاجها/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "استكشف حسب المجال" })).toBeVisible();
    await expect(page.getByRole("link", { name: "التقنية والبرمجة" })).toBeVisible();
    await page.getByRole("search").last().getByRole("searchbox").fill("مبرمج متجر");
    await page.getByRole("search").last().getByRole("button", { name: "ابحث" }).click();
    await expect(page).toHaveURL(/\/discover\?q=/);
    await expect(page.getByRole("heading", { name: "استكشف سوق جسر الأردن" })).toBeVisible();
  });

  test("discover supports result scopes and adaptive filters", async ({ page }) => {
    await page.goto("/discover");
    await expect(page.getByRole("navigation", { name: "نوع نتيجة البحث" })).toBeVisible();
    await expect(page.getByRole("link", { name: "الخدمات", exact: true })).toBeVisible();
    await expect(page.getByLabel("المجال")).toBeVisible();
    await expect(page.getByLabel("طريقة تقديم الخدمة")).toBeVisible();
    await expect(page.getByLabel("نظام التسعير")).toBeVisible();
  });

  test("mobile navigation remains usable at 320px without horizontal page overflow", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto("/");
    const bottomNav = page.getByRole("navigation", { name: "التنقل الرئيسي على الهاتف" });
    await expect(bottomNav).toBeVisible();
    await expect(bottomNav.getByRole("link", { name: "استكشاف" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });

  test("theme control persists a user-selected mode", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: /اضغط لتغيير المظهر/ });
    await expect(toggle).toBeVisible();
    await toggle.click();
    const stored = await page.evaluate(() => window.localStorage.getItem("jisr-theme"));
    expect(["light", "dark", "system"]).toContain(stored);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", /light|dark/);
  });
});

