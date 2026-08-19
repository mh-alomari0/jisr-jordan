import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";
const testTarget = new URL(baseURL);
const usesLocalServer = ["localhost", "127.0.0.1"].includes(testTarget.hostname);

export default defineConfig({
  testDir: "./tests/e2e",
  // Public acceptance tests intentionally exercise the linked Supabase catalog.
  // Serialize them so responsive sweeps do not create an artificial burst of
  // concurrent live reads that can mask product behavior with transport errors.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 120 * 1000,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: usesLocalServer ? {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  } : undefined,
});
