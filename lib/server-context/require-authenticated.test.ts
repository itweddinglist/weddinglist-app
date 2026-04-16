// =============================================================================
// lib/server-context/require-authenticated.test.ts
// =============================================================================

import { describe, it, expect } from "vitest";
import { requireAuthenticatedContext } from "./require-authenticated";
import type {
  ServerAppContext,
  AuthenticatedContext,
} from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE = { request_id: "req-1" };

const authenticatedCtx: AuthenticatedContext = {
  ...BASE,
  status: "authenticated",
  app_user_id: "user-uuid-1",
  wp_user_id: 42,
  email: "test@example.com",
  display_name: "Test User",
  plan_tier: "premium",
  active_wedding_id: "wedding-1",
  active_event_id: "event-1",
  weddings: [],
};

function makeCtx(status: ServerAppContext["status"]): ServerAppContext {
  switch (status) {
    case "authenticated":
      return authenticatedCtx;
    case "unauthenticated":
      return { ...BASE, status: "unauthenticated" };
    case "wp_unavailable":
      return { ...BASE, status: "wp_unavailable", reason: "timeout" };
    case "provisioning_pending":
      return { ...BASE, status: "provisioning_pending", app_user_id: "u1", wp_user_id: 42, email: "test@example.com", display_name: "Test User" };
    case "provisioning_failed":
      return { ...BASE, status: "provisioning_failed", app_user_id: "u1", wp_user_id: 42, email: "test@example.com", display_name: "Test User" };
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("requireAuthenticatedContext", () => {
  it("authenticated → ok: true, ctx devine AuthenticatedContext", () => {
    const result = requireAuthenticatedContext(authenticatedCtx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ctx.status).toBe("authenticated");
    expect(result.ctx.app_user_id).toBe("user-uuid-1");
  });

  it("unauthenticated → 401 SESSION_REQUIRED", async () => {
    const result = requireAuthenticatedContext(makeCtx("unauthenticated"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(401);
    const body = await result.response.json() as { error: { code: string } };
    expect(body.error.code).toBe("SESSION_REQUIRED");
  });

  it("wp_unavailable → 503 AUTH_SERVICE_UNAVAILABLE", async () => {
    const result = requireAuthenticatedContext(makeCtx("wp_unavailable"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(503);
    const body = await result.response.json() as { error: { code: string } };
    expect(body.error.code).toBe("AUTH_SERVICE_UNAVAILABLE");
  });

  it("provisioning_pending → 409 PROVISIONING_PENDING", async () => {
    const result = requireAuthenticatedContext(makeCtx("provisioning_pending"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(409);
    const body = await result.response.json() as { error: { code: string } };
    expect(body.error.code).toBe("PROVISIONING_PENDING");
  });

  it("provisioning_failed → 403 PROVISIONING_FAILED", async () => {
    const result = requireAuthenticatedContext(makeCtx("provisioning_failed"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(403);
    const body = await result.response.json() as { error: { code: string } };
    expect(body.error.code).toBe("PROVISIONING_FAILED");
  });
});
