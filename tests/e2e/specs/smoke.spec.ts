import { expect, test } from "@playwright/test";

test.describe("Smoke", () => {
  test("homepage responds and renders layout", async ({ page }) => {
    // NOTE: WeddingList rulează pe subdomeniu (app.*) — domeniul principal
    // (marketing) e WordPress + Voxel. Root path / nu are landing page yet.
    // TD-26 (HWE0.5): implement redirect / → /login.
    // Until then, smoke validates: server boots, layout renders, metadata applied.
    const response = await page.goto("/");

    // App boots: server responds (no 5xx crash). 404 expected pre-TD-26 fix.
    expect(response?.status() ?? 0).toBeLessThan(500);

    // Layout renders: title from app/layout.js metadata.
    await expect(page).toHaveTitle(/WeddingList/i);

    // Locale attribute renders (validates layout structure).
    await expect(page.locator("html")).toHaveAttribute("lang", "ro");
  });
});
