import { expect, test } from "@playwright/test";
import { assertDevBypassActive, DEV_MOCK_IDENTITY } from "../helpers/auth";

test.describe("DEV bypass auth foundation", () => {
  test("dashboard loads with mock identity", async ({ page }) => {
    // PROBE 1: env propagation + dev-session resolver
    // Pre-flight check — fail-fast if env not propagated to webServer.
    // Diagnostic precis: distinge env issue vs render issue.
    await assertDevBypassActive(page);

    // PROBE 2: navigate authenticated route
    await page.goto("/dashboard");

    // ASSERT: NU am fost redirect-ați la WordPress login
    // (auth fail = redirect to /login or wp-login.php)
    await expect(page).not.toHaveURL(/login|sign-in|wp-login/);

    // ASSERT: heading h1 conține mock wedding title
    // "Nuntă Dev" e literal în dev-session.ts — match deterministic.
    // Apare DOAR în session authenticated (loading state arată "Se încarcă...").
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      DEV_MOCK_IDENTITY.wedding.title,
      { timeout: 10000 }
    );

    // ASSERT: module cards visible (Dashboard mount complet, nu doar h1)
    // Folosim data-testid (contract stable) în loc de role-based —
    // role + accessible name colide între sidebar nav + grid cards
    // (ambele render aceleași MODULES). data-testid e unique per location.
    // Diagnostic: dacă heading apare dar cards nu, render parțial =
    // probably error în /api/dashboard/stats (separate concern).
    await expect(page.getByTestId("module-card-seating-chart")).toBeVisible();
    await expect(page.getByTestId("module-card-guest-list")).toBeVisible();
  });
});
