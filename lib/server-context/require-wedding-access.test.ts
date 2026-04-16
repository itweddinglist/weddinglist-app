// =============================================================================
// lib/server-context/require-wedding-access.test.ts
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthenticatedContext } from "./types";

// ── Hoist mocks ───────────────────────────────────────────────────────────────

const { mockMaybySingle } = vi.hoisted(() => {
  const mockMaybySingle = vi.fn();
  return { mockMaybySingle };
});

vi.mock("@/app/lib/supabase/server", () => ({
  supabaseServer: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybySingle: mockMaybySingle,
            maybeSingle: mockMaybySingle,
          }),
        }),
      }),
    }),
  },
}));

import { requireWeddingAccess } from "./require-wedding-access";

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE_CTX: AuthenticatedContext = {
  request_id: "req-1",
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

function makeCtx(overrides: Partial<AuthenticatedContext> = {}): AuthenticatedContext {
  return { ...BASE_CTX, ...overrides };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireWeddingAccess", () => {
  it("member cu rol suficient → ok: true cu wedding_id și role", async () => {
    mockMaybySingle.mockResolvedValueOnce({ data: { role: "editor" }, error: null });

    const result = await requireWeddingAccess({
      ctx: makeCtx(),
      requestedWeddingId: "wedding-1",
      minRole: "editor",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.wedding_id).toBe("wedding-1");
    expect(result.role).toBe("editor");
  });

  it("nu e member → 403 FORBIDDEN", async () => {
    mockMaybySingle.mockResolvedValueOnce({ data: null, error: null });

    const result = await requireWeddingAccess({
      ctx: makeCtx(),
      requestedWeddingId: "wedding-1",
      minRole: "viewer",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(403);
    const body = await result.response.json() as { error: { code: string } };
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("rol insuficient → 403 INSUFFICIENT_ROLE", async () => {
    mockMaybySingle.mockResolvedValueOnce({ data: { role: "viewer" }, error: null });

    const result = await requireWeddingAccess({
      ctx: makeCtx(),
      requestedWeddingId: "wedding-1",
      minRole: "editor",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(403);
    const body = await result.response.json() as { error: { code: string } };
    expect(body.error.code).toBe("INSUFFICIENT_ROLE");
  });

  it("wedding_id lipsă și active_wedding_id null → 400 WEDDING_ID_REQUIRED", async () => {
    const result = await requireWeddingAccess({
      ctx: makeCtx({ active_wedding_id: null }),
      // requestedWeddingId omis
      minRole: "viewer",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(400);
    const body = await result.response.json() as { error: { code: string } };
    expect(body.error.code).toBe("WEDDING_ID_REQUIRED");
    expect(mockMaybySingle).not.toHaveBeenCalled();
  });

  it("owner are acces la orice minRole", async () => {
    const roles = ["owner", "partner", "planner", "editor", "viewer"];

    for (const minRole of roles) {
      mockMaybySingle.mockResolvedValueOnce({ data: { role: "owner" }, error: null });

      const result = await requireWeddingAccess({
        ctx: makeCtx(),
        requestedWeddingId: "wedding-1",
        minRole,
      });

      expect(result.ok).toBe(true);
    }
  });

  it("viewer nu are acces când minRole=editor", async () => {
    mockMaybySingle.mockResolvedValueOnce({ data: { role: "viewer" }, error: null });

    const result = await requireWeddingAccess({
      ctx: makeCtx(),
      requestedWeddingId: "wedding-1",
      minRole: "editor",
    });

    expect(result.ok).toBe(false);
  });

  it("partner are acces când minRole=planner", async () => {
    mockMaybySingle.mockResolvedValueOnce({ data: { role: "partner" }, error: null });

    const result = await requireWeddingAccess({
      ctx: makeCtx(),
      requestedWeddingId: "wedding-1",
      minRole: "planner",
    });

    expect(result.ok).toBe(true);
  });

  it("requestedWeddingId override active_wedding_id din context", async () => {
    mockMaybySingle.mockResolvedValueOnce({ data: { role: "editor" }, error: null });

    const result = await requireWeddingAccess({
      ctx: makeCtx({ active_wedding_id: "wedding-default" }),
      requestedWeddingId: "wedding-specific",
      minRole: "viewer",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.wedding_id).toBe("wedding-specific");
  });

  it("folosește active_wedding_id dacă requestedWeddingId lipsește", async () => {
    mockMaybySingle.mockResolvedValueOnce({ data: { role: "viewer" }, error: null });

    const result = await requireWeddingAccess({
      ctx: makeCtx({ active_wedding_id: "wedding-from-ctx" }),
      minRole: "viewer",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.wedding_id).toBe("wedding-from-ctx");
  });

  it("DB error → 500 INTERNAL_ERROR", async () => {
    mockMaybySingle.mockResolvedValueOnce({
      data: null,
      error: { message: "Connection timeout" },
    });

    const result = await requireWeddingAccess({
      ctx: makeCtx(),
      requestedWeddingId: "wedding-1",
      minRole: "viewer",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(500);
  });
});
