import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

const createProject = (name: string, device: keyof typeof devices) => ({
  name,
  use: { ...devices[device] },
});

export default defineConfig({
  testDir: "./tests/e2e/specs",
  outputDir: "./test-results",

  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,

  timeout: 30000,
  expect: { timeout: 5000 },

  reporter: [
    isCI ? ["github"] : ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],

  use: {
    baseURL,
    locale: "ro-RO",
    timezoneId: "Europe/Bucharest",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10000,
    navigationTimeout: 20000,
  },

  projects: [
    createProject("chromium", "Desktop Chrome"),
    createProject("webkit", "Desktop Safari"),
  ],

  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        // /favicon.ico returns 200 — used as readiness probe because /
        // returns 404 (no root page yet, see TD-26). Playwright waits for
        // 2xx before considering server ready; 404 would loop until timeout.
        url: "http://localhost:3000/favicon.ico",
        reuseExistingServer: !isCI,
        timeout: 120000,
        stdout: "ignore",
        stderr: "pipe",
      },
});
