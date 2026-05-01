import { expect, type Page } from "@playwright/test";

/**
 * DEV mock identity — must match lib/auth/dev-session.ts EXACTLY.
 *
 * If dev-session.ts changes the mock UUIDs, email, or wedding title,
 * tests using these constants will fail deliberately. This is the
 * intended canary for drift between mock config and test assertions.
 *
 * Source of truth: lib/auth/dev-session.ts (DEV_MOCK_IDS + return shape)
 */
export const DEV_MOCK_IDENTITY = {
  appUserId: "00000000-0000-0000-0000-000000000001",
  weddingId: "00000000-0000-0000-0000-000000000002",
  eventId: "00000000-0000-0000-0000-000000000003",
  user: {
    email: "dev@local.test",
    displayName: "Dev User",
    wpUserId: 1,
  },
  wedding: {
    title: "Nuntă Dev",
    role: "owner",
  },
} as const;

/**
 * Response shape from GET /api/dev/session (when 200).
 * Source: app/api/dev/session/route.ts
 */
type DevSessionResponse = {
  status: string;
  source: string;
  app_user_id: string | null;
  wedding_id: string | null;
  event_id: string | null;
  provisioning_status: string | null;
  wp_user_id: number | null;
};

/**
 * Probes /api/dev/session to verify that DEV bypass env vars are
 * propagated to the webServer process AND that the mock session
 * resolver returns the expected identity.
 *
 * This is a composite probe — checking individual gates orthogonally
 * is unreliable because some response fields (e.g., `source`) reflect
 * only NODE_ENV and NOT NEXT_PUBLIC_DEBUG_AUTH propagation.
 *
 * Probe assertions (in order, fail-fast diagnostic):
 *   1. HTTP 200 (not 404 → DEV_ENDPOINTS_ENABLED gate failed)
 *   2. status === "authenticated" (not "unauthenticated" →
 *      NEXT_PUBLIC_DEBUG_AUTH not propagated OR getDevSession()
 *      returned null)
 *   3. app_user_id matches DEV_MOCK_IDENTITY (not just any UUID →
 *      dev-session.ts mock data drift)
 *   4. wedding_id matches DEV_MOCK_IDENTITY
 *
 * @example
 *   test("dashboard loads with DEV bypass", async ({ page }) => {
 *     await assertDevBypassActive(page);
 *     await page.goto("/dashboard");
 *     // ...
 *   });
 */
export async function assertDevBypassActive(page: Page): Promise<void> {
  const response = await page.request.get("/api/dev/session");

  expect(
    response.status(),
    "DEV_ENDPOINTS_ENABLED gate failed (404) — verify NODE_ENV=development AND DEV_ENDPOINTS_ENABLED=true in webServer.env",
  ).toBe(200);

  const body = (await response.json()) as DevSessionResponse;

  expect(
    body.status,
    "Session not authenticated — verify NEXT_PUBLIC_DEBUG_AUTH=true propagates to webServer",
  ).toBe("authenticated");

  expect(
    body.app_user_id,
    "Mock app_user_id mismatch — dev-session.ts may have drifted from DEV_MOCK_IDENTITY",
  ).toBe(DEV_MOCK_IDENTITY.appUserId);

  expect(
    body.wedding_id,
    "Mock wedding_id mismatch — dev-session.ts may have drifted from DEV_MOCK_IDENTITY",
  ).toBe(DEV_MOCK_IDENTITY.weddingId);
}
