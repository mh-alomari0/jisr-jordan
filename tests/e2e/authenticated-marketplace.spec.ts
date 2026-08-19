import { expect, test } from "@playwright/test";

const customer = { email: process.env.E2E_CUSTOMER_EMAIL, password: process.env.E2E_CUSTOMER_PASSWORD };
const provider = { email: process.env.E2E_PROVIDER_EMAIL, password: process.env.E2E_PROVIDER_PASSWORD };
const admin = { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD };
const accountsConfigured = Boolean(customer.email && customer.password && provider.email && provider.password && admin.email && admin.password);

async function login(page: import("@playwright/test").Page, credentials: typeof customer) {
  await page.goto("/login");
  await page.getByLabel("البريد الإلكتروني").fill(credentials.email!);
  await page.getByLabel("كلمة المرور").fill(credentials.password!);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test.describe("Live authenticated marketplace roles", () => {
  test.skip(!accountsConfigured, "Requires dedicated non-production customer, approved provider, and admin E2E accounts");

  test("customer account can reach booking history and create-booking UI", async ({ page }) => {
    await login(page, customer);
    await page.goto("/bookings");
    await expect(page).toHaveURL(/\/bookings/);
    await page.goto("/booking?serviceId=10000000-0000-4000-8000-000000000001");
    await expect(page.getByRole("heading", { name: "احجز خدمتك مع جسر" })).toBeVisible();
  });

  test("approved provider account can reach provider operations", async ({ page }) => {
    await login(page, provider);
    await page.goto("/provider");
    await expect(page).toHaveURL(/\/provider/);
    await expect(page.locator("main")).toBeVisible();
    for (const path of ["/provider/listings", "/provider/quotes", "/provider/posts", "/provider/profile"]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(path.replaceAll("/", "\\/")));
      await expect(page.locator("main")).toBeVisible();
    }
  });

  test("admin account can reach operational dashboards", async ({ page }) => {
    await login(page, admin);
    for (const path of ["/admin", "/admin/categories", "/admin/listings", "/admin/quotes", "/admin/content", "/admin/commissions", "/admin/providers", "/admin/bookings", "/admin/payments", "/admin/audit-logs"]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(path.replaceAll("/", "\\/")));
      await expect(page.locator("main")).toBeVisible();
    }
  });
});
