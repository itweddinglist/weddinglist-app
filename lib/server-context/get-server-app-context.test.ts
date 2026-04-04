// =============================================================================
// lib/server-context/get-server-app-context.test.ts
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import type { CircuitBreakerResult } from "@/app/lib/auth/session/wp-circuit-breaker";
import type { BootstrapResponse } from "@/app/lib/auth/fetch-wordpress-bootstrap";

// ── Hoist mocks so vi.mock() can reference them ──────────────────────────────

const { mockWithCircuitBreaker } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockWithCircuitBreaker = vi.fn<() => Promise<CircuitBreakerResult<BootstrapResponse>>>();
  return { mockWithCircuitBreaker };
});

vi.mock("@/app/lib/auth/session/wp-circuit-breaker", () => ({
  withCircuitBreaker: mockWithCircuitBreaker,
}));

// Set env var before module is loaded
process.env.NEXT_PUBLIC_WP_BASE_URL = "http://wp.test";

import { getServerAppContext } from "./get-server-app-context";
import { clearAll } from "./cache";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return {
    headers: {
      get: (key: string) => headers[key.toLowerCase()] ?? null,
    },
  } as unknown as NextRequest;
}

const WP_COOKIE = "wordpress_logged_in_abc=session_value";

const AUTHENTICATED_BOOTSTRAP: BootstrapResponse = {
  authenticated: true,
  app_user_id: "user-uuid-1",
  provisioning_status: "ready",
  user: {
    wp_user_id: 42,
    email: "test@example.com",
    display_name: "Test User",
    plan_tier: "premium",
  },
  weddings: [{ id: "wedding-1", title: "Our Wedding", role: "owner" }],
  active_wedding_id: "wedding-1",
  active_event_id: "event-1",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  clearAll();
  vi.clearAllMocks();
});

describe("getServerAppContext", () => {
  it("WP returnează authenticated → context corect", async () => {
    mockWithCircuitBreaker.mockResolvedValueOnce({
      ok: true,
      data: AUTHENTICATED_BOOTSTRAP,
    });

    const ctx = await getServerAppContext(
      makeRequest({ cookie: WP_COOKIE })
    );

    expect(ctx.status).toBe("authenticated");
    if (ctx.status !== "authenticated") return;

    expect(ctx.app_user_id).toBe("user-uuid-1");
    expect(ctx.email).toBe("test@example.com");
    expect(ctx.active_wedding_id).toBe("wedding-1");
    expect(ctx.wp_user_id).toBe(42);
    expect(ctx.request_id).toBeTruthy();
  });

  it("WP returnează unauthenticated → status unauthenticated", async () => {
    mockWithCircuitBreaker.mockResolvedValueOnce({
      ok: true,
      data: {
        authenticated: false,
        app_user_id: null,
        provisioning_status: null,
        user: null,
        weddings: [],
        active_wedding_id: null,
        active_event_id: null,
      },
    });

    const ctx = await getServerAppContext(
      makeRequest({ cookie: WP_COOKIE })
    );

    expect(ctx.status).toBe("unauthenticated");
  });

  it("WP timeout → status wp_unavailable cu reason timeout", async () => {
    mockWithCircuitBreaker.mockResolvedValueOnce({
      ok: false,
      reason: "timeout",
      message: "WordPress nu răspunde",
    });

    const ctx = await getServerAppContext(
      makeRequest({ cookie: WP_COOKIE })
    );

    expect(ctx.status).toBe("wp_unavailable");
    if (ctx.status !== "wp_unavailable") return;
    expect(ctx.reason).toBe("timeout");
  });

  it("WP error → status wp_unavailable cu reason error", async () => {
    mockWithCircuitBreaker.mockResolvedValueOnce({
      ok: false,
      reason: "error",
      message: "Connection refused",
    });

    const ctx = await getServerAppContext(
      makeRequest({ cookie: WP_COOKIE })
    );

    expect(ctx.status).toBe("wp_unavailable");
    if (ctx.status !== "wp_unavailable") return;
    expect(ctx.reason).toBe("error");
  });

  it("Cache hit → nu face fetch la WP a doua oară", async () => {
    mockWithCircuitBreaker.mockResolvedValueOnce({
      ok: true,
      data: AUTHENTICATED_BOOTSTRAP,
    });

    const req = makeRequest({ cookie: WP_COOKIE });

    // First call — populates cache
    await getServerAppContext(req);

    // Second call — should use cache, not WP
    const ctx = await getServerAppContext(makeRequest({ cookie: WP_COOKIE }));

    expect(mockWithCircuitBreaker).toHaveBeenCalledTimes(1);
    expect(ctx.status).toBe("authenticated");
  });

  it("Cache hit override request_id cu cel curent", async () => {
    mockWithCircuitBreaker.mockResolvedValueOnce({
      ok: true,
      data: AUTHENTICATED_BOOTSTRAP,
    });

    await getServerAppContext(makeRequest({ cookie: WP_COOKIE }));

    const ctx = await getServerAppContext(
      makeRequest({ cookie: WP_COOKIE, "x-request-id": "my-req-id" })
    );

    expect(ctx.request_id).toBe("my-req-id");
  });

  it("Cookie lipsă → status unauthenticated fără WP call", async () => {
    const ctx = await getServerAppContext(makeRequest());

    expect(ctx.status).toBe("unauthenticated");
    expect(mockWithCircuitBreaker).not.toHaveBeenCalled();
  });

  it("Cookie fără wordpress_logged_in_ → unauthenticated fără WP call", async () => {
    const ctx = await getServerAppContext(
      makeRequest({ cookie: "session_id=abc; other=xyz" })
    );

    expect(ctx.status).toBe("unauthenticated");
    expect(mockWithCircuitBreaker).not.toHaveBeenCalled();
  });

  it("WP returnează provisioning_pending → status provisioning_pending", async () => {
    mockWithCircuitBreaker.mockResolvedValueOnce({
      ok: true,
      data: {
        authenticated: true,
        app_user_id: "user-uuid-1",
        provisioning_status: "pending",
        user: {
          wp_user_id: 42,
          email: "test@example.com",
          display_name: "Test User",
          plan_tier: null,
        },
        weddings: [],
        active_wedding_id: null,
        active_event_id: null,
      },
    });

    const ctx = await getServerAppContext(
      makeRequest({ cookie: WP_COOKIE })
    );

    expect(ctx.status).toBe("provisioning_pending");
  });

  it("WP returnează provisioning_failed → status provisioning_failed", async () => {
    mockWithCircuitBreaker.mockResolvedValueOnce({
      ok: true,
      data: {
        authenticated: true,
        app_user_id: "user-uuid-1",
        provisioning_status: "failed",
        user: {
          wp_user_id: 42,
          email: "test@example.com",
          display_name: "Test User",
          plan_tier: null,
        },
        weddings: [],
        active_wedding_id: null,
        active_event_id: null,
      },
    });

    const ctx = await getServerAppContext(
      makeRequest({ cookie: WP_COOKIE })
    );

    expect(ctx.status).toBe("provisioning_failed");
  });

  it("request_id din x-request-id header", async () => {
    const ctx = await getServerAppContext(
      makeRequest({ "x-request-id": "req-123" })
    );

    expect(ctx.request_id).toBe("req-123");
  });

  it("request_id generat automat dacă header lipsește", async () => {
    const ctx = await getServerAppContext(makeRequest());

    expect(ctx.request_id).toBeTruthy();
    expect(typeof ctx.request_id).toBe("string");
  });
});
