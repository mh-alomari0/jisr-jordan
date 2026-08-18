import { expect, test } from "@playwright/test";

const publicPages = ["/", "/services", "/login"];

for (const viewport of [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test.describe(`Public UI smoke - ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const path of publicPages) {
      test(`${path} renders without page errors or horizontal overflow`, async ({ page }) => {
        const pageErrors: string[] = [];
        page.on("pageerror", (error) => pageErrors.push(error.message));
        await page.goto(path);
        await expect(page.locator("body")).toBeVisible();
        const hasOverflow = await page.evaluate(() =>
          document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        );
        expect(hasOverflow).toBe(false);
        expect(pageErrors).toEqual([]);
      });
    }
  });
}
