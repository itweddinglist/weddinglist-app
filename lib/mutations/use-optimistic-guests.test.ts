// =============================================================================
// lib/mutations/use-optimistic-guests.test.ts
// Unit tests for useOptimisticGuests — V2 Pragmatic (15-20 tests)
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  isGuestWithRelations,
  parseGuestResponse,
  useOptimisticGuests,
} from "./use-optimistic-guests";
import type { GuestWithRelations, CreateGuestInput } from "@/types/guests";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGuest(overrides: Partial<GuestWithRelations> = {}): GuestWithRelations {
  return {
    id: "aaaaaaaa-0000-0000-0000-000000000001",
    wedding_id: "wedding-uuid",
    guest_group_id: null,
    first_name: "Ion",
    last_name: "Popescu",
    display_name: "Ion Popescu",
    side: null,
    notes: null,
    is_vip: false,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    guest_group: null,
    guest_events: [],
    ...overrides,
  };
}

function successBody(data: GuestWithRelations) {
  return { success: true, data };
}

function makeResponse(
  body: unknown,
  status = 200
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

// ─── Pure function tests ──────────────────────────────────────────────────────

describe("isGuestWithRelations", () => {
  it("returns true for a valid GuestWithRelations object", () => {
    expect(isGuestWithRelations(makeGuest())).toBe(true);
  });

  it("returns false for null", () => {
    expect(isGuestWithRelations(null)).toBe(false);
  });

  it("returns false when required string field is missing", () => {
    const { id: _omit, ...noId } = makeGuest();
    expect(isGuestWithRelations(noId)).toBe(false);
  });

  it("returns false when guest_events is not an array", () => {
    expect(isGuestWithRelations({ ...makeGuest(), guest_events: null })).toBe(false);
  });

  it("returns false for a primitive", () => {
    expect(isGuestWithRelations("string")).toBe(false);
    expect(isGuestWithRelations(42)).toBe(false);
  });
});

describe("parseGuestResponse", () => {
  it("returns GuestWithRelations for a valid success response", () => {
    const guest = makeGuest();
    expect(parseGuestResponse(successBody(guest))).toEqual(guest);
  });

  it("throws when success is false", () => {
    const body = { success: false, error: { code: "ERR", message: "Bad request" } };
    expect(() => parseGuestResponse(body)).toThrow("Bad request");
  });

  it("throws when data does not match GuestWithRelations shape", () => {
    const body = { success: true, data: { id: 123, first_name: "Ion" } };
    expect(() => parseGuestResponse(body)).toThrow("invalidă");
  });

  it("throws when passed a non-object", () => {
    expect(() => parseGuestResponse(null)).toThrow("invalid");
    expect(() => parseGuestResponse("raw string")).toThrow("invalid");
  });
});

// ─── Hook tests ───────────────────────────────────────────────────────────────

describe("useOptimisticGuests", () => {
  const TOKEN = "test-token";
  const WEDDING_ID = "wedding-uuid";

  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Initial state ────────────────────────────────────────────────────────

  it("initialises guests from serverGuests", () => {
    const initial = [makeGuest()];
    const { result } = renderHook(() =>
      useOptimisticGuests(initial, { token: TOKEN })
    );
    expect(result.current.guests).toEqual(initial);
    expect(result.current.pendingIds.size).toBe(0);
  });

  // ── createGuest ──────────────────────────────────────────────────────────

  it("adds an optimistic guest with tmpId before fetch resolves", async () => {
    const realGuest = makeGuest({ id: "real-id-001" });
    fetchMock.mockResolvedValue(makeResponse(successBody(realGuest)));

    const noGuests: GuestWithRelations[] = [];
    const { result } = renderHook(() =>
      useOptimisticGuests(noGuests, { token: TOKEN })
    );

    const input: CreateGuestInput = {
      wedding_id: WEDDING_ID,
      first_name: "Maria",
    };

    // Kick off but don't await
    let promise!: Promise<void>;
    act(() => {
      promise = result.current.createGuest(input);
    });

    // Optimistic guest is already in the list
    expect(result.current.guests).toHaveLength(1);
    expect(result.current.guests[0].id).toMatch(/^tmp_/);
    expect(result.current.guests[0].first_name).toBe("Maria");

    await act(async () => { await promise; });
  });

  it("adds tmpId to pendingIds and removes it after success", async () => {
    const realGuest = makeGuest({ id: "real-id-002" });
    fetchMock.mockResolvedValue(makeResponse(successBody(realGuest)));

    const noGuests: GuestWithRelations[] = [];
    const { result } = renderHook(() =>
      useOptimisticGuests(noGuests, { token: TOKEN })
    );

    let promise!: Promise<void>;
    act(() => {
      promise = result.current.createGuest({
        wedding_id: WEDDING_ID,
        first_name: "Andrei",
      });
    });

    expect(result.current.pendingIds.size).toBe(1);

    await act(async () => { await promise; });

    expect(result.current.pendingIds.size).toBe(0);
  });

  it("replaces tmpId with real guest on successful create", async () => {
    const realGuest = makeGuest({ id: "real-id-003", first_name: "Elena" });
    fetchMock.mockResolvedValue(makeResponse(successBody(realGuest)));

    const noGuests: GuestWithRelations[] = [];
    const { result } = renderHook(() =>
      useOptimisticGuests(noGuests, { token: TOKEN })
    );

    await act(async () => {
      await result.current.createGuest({
        wedding_id: WEDDING_ID,
        first_name: "Elena",
      });
    });

    expect(result.current.guests).toHaveLength(1);
    expect(result.current.guests[0].id).toBe("real-id-003");
    expect(result.current.guests[0].id).not.toMatch(/^tmp_/);
  });

  it("removes optimistic guest and calls onError on HTTP failure", async () => {
    fetchMock.mockResolvedValue(
      makeResponse({ success: false, error: { code: "ERR", message: "Eroare server" } }, 500)
    );

    const onError = vi.fn();
    const noGuests: GuestWithRelations[] = [];
    const { result } = renderHook(() =>
      useOptimisticGuests(noGuests, { token: TOKEN, onError })
    );

    await act(async () => {
      await result.current.createGuest({
        wedding_id: WEDDING_ID,
        first_name: "Vasile",
      });
    });

    expect(result.current.guests).toHaveLength(0);
    expect(onError).toHaveBeenCalledOnce();
  });

  it("removes optimistic guest and calls onError on parse failure", async () => {
    // Server returns ok:true but with malformed data
    fetchMock.mockResolvedValue(
      makeResponse({ success: true, data: { broken: true } }, 200)
    );

    const onError = vi.fn();
    const noGuests: GuestWithRelations[] = [];
    const { result } = renderHook(() =>
      useOptimisticGuests(noGuests, { token: TOKEN, onError })
    );

    await act(async () => {
      await result.current.createGuest({
        wedding_id: WEDDING_ID,
        first_name: "Dumitru",
      });
    });

    expect(result.current.guests).toHaveLength(0);
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toMatch(/invalid/i);
  });

  // ── updateGuest ──────────────────────────────────────────────────────────

  it("applies optimistic update instantly before server responds", async () => {
    const guest = makeGuest({ id: "g1", first_name: "Ion" });
    let resolveUpdate!: (r: Response) => void;
    fetchMock.mockReturnValue(
      new Promise<Response>((res) => { resolveUpdate = res; })
    );

    const initialGuests = [guest];
    const { result } = renderHook(() =>
      useOptimisticGuests(initialGuests, { token: TOKEN })
    );

    act(() => {
      result.current.updateGuest("g1", { first_name: "Ioan" });
    });

    // Updated immediately
    expect(result.current.guests[0].first_name).toBe("Ioan");

    // Resolve to avoid dangling promise
    resolveUpdate(makeResponse(successBody({ ...guest, first_name: "Ioan" })));
    await act(async () => { await Promise.resolve(); });
  });

  it("applies server-confirmed state after successful update", async () => {
    const guest = makeGuest({ id: "g2", notes: null });
    const confirmed = makeGuest({ id: "g2", notes: "VIP", updated_at: "2025-06-01T00:00:00Z" });
    fetchMock.mockResolvedValue(makeResponse(successBody(confirmed)));

    const initialGuests = [guest];
    const { result } = renderHook(() =>
      useOptimisticGuests(initialGuests, { token: TOKEN })
    );

    await act(async () => {
      await result.current.updateGuest("g2", { notes: "VIP" });
    });

    expect(result.current.guests[0].notes).toBe("VIP");
    expect(result.current.guests[0].updated_at).toBe("2025-06-01T00:00:00Z");
  });

  it("rolls back edit to old state on HTTP failure", async () => {
    const guest = makeGuest({ id: "g3", first_name: "Radu" });
    fetchMock.mockResolvedValue(
      makeResponse({ success: false, error: { code: "ERR", message: "Fail" } }, 500)
    );

    const onError = vi.fn();
    const initialGuests = [guest];
    const { result } = renderHook(() =>
      useOptimisticGuests(initialGuests, { token: TOKEN, onError })
    );

    await act(async () => {
      await result.current.updateGuest("g3", { first_name: "RaduNou" });
    });

    // Rolled back to original
    expect(result.current.guests[0].first_name).toBe("Radu");
    expect(onError).toHaveBeenCalledOnce();
  });

  it("does not rollback edit when opSeq is superseded", async () => {
    const guest = makeGuest({ id: "g4", first_name: "Alex" });
    const confirmed2 = makeGuest({ id: "g4", first_name: "Alexandru" });

    // First fetch resolves after second starts (simulated by ordering)
    let resolve1!: (r: Response) => void;
    let resolve2!: (r: Response) => void;
    fetchMock
      .mockReturnValueOnce(new Promise<Response>((r) => { resolve1 = r; }))
      .mockReturnValueOnce(new Promise<Response>((r) => { resolve2 = r; }));

    const onError = vi.fn();
    const initialGuests = [guest];
    const { result } = renderHook(() =>
      useOptimisticGuests(initialGuests, { token: TOKEN, onError })
    );

    // Start edit 1 (first_name → Alexandru Prim)
    act(() => { result.current.updateGuest("g4", { first_name: "AlexPrim" }); });
    // Start edit 2 immediately (first_name → Alexandru)
    act(() => { result.current.updateGuest("g4", { first_name: "Alexandru" }); });

    // Resolve edit 2 with success first
    resolve2(makeResponse(successBody(confirmed2)));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    // Now resolve edit 1 with an error
    resolve1(makeResponse({ success: false, error: { code: "ERR", message: "Stale fail" } }, 500));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    // Edit 2's result should stand — edit 1's rollback was skipped
    expect(result.current.guests[0].first_name).toBe("Alexandru");
  });

  // ── deleteGuest ──────────────────────────────────────────────────────────

  it("removes guest immediately on deleteGuest", async () => {
    const guests = [makeGuest({ id: "d1" }), makeGuest({ id: "d2" })];
    let resolveDelete!: (r: Response) => void;
    fetchMock.mockReturnValue(
      new Promise<Response>((r) => { resolveDelete = r; })
    );

    const { result } = renderHook(() =>
      useOptimisticGuests(guests, { token: TOKEN })
    );

    act(() => { result.current.deleteGuest("d1"); });

    expect(result.current.guests).toHaveLength(1);
    expect(result.current.guests[0].id).toBe("d2");

    resolveDelete(makeResponse({ success: true, data: { id: "d1", deleted: true } }));
    await act(async () => { await Promise.resolve(); });
  });

  it("restores deleted guest at exact original index on failure", async () => {
    const g1 = makeGuest({ id: "r1", first_name: "A" });
    const g2 = makeGuest({ id: "r2", first_name: "B" });
    const g3 = makeGuest({ id: "r3", first_name: "C" });

    fetchMock.mockResolvedValue(
      makeResponse({ success: false, error: { code: "ERR", message: "Cannot delete" } }, 409)
    );

    const onError = vi.fn();
    const initialGuests = [g1, g2, g3];
    const { result } = renderHook(() =>
      useOptimisticGuests(initialGuests, { token: TOKEN, onError })
    );

    // Delete the middle element (index 1)
    await act(async () => {
      await result.current.deleteGuest("r2");
    });

    expect(result.current.guests).toHaveLength(3);
    expect(result.current.guests[0].id).toBe("r1");
    expect(result.current.guests[1].id).toBe("r2"); // restored at index 1
    expect(result.current.guests[2].id).toBe("r3");
    expect(onError).toHaveBeenCalledOnce();
  });

  it("does not restore deleted guest when opSeq is superseded", async () => {
    const guest = makeGuest({ id: "s1" });

    let resolve1!: (r: Response) => void;
    fetchMock
      .mockReturnValueOnce(new Promise<Response>((r) => { resolve1 = r; }))
      .mockResolvedValueOnce(makeResponse(successBody(guest))); // second (re-add) succeeds

    const onError = vi.fn();
    const initialGuests = [guest];
    const { result } = renderHook(() =>
      useOptimisticGuests(initialGuests, { token: TOKEN, onError })
    );

    // Delete s1
    act(() => { result.current.deleteGuest("s1"); });
    // Immediately increment opSeq for s1 via a new operation
    act(() => { result.current.updateGuest("s1", { notes: "irrelevant" }); });

    // Now resolve delete with error — should NOT restore because seq was superseded
    resolve1(makeResponse({ success: false, error: { code: "ERR", message: "Fail" } }, 500));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    // Guest is still absent (rollback was skipped)
    expect(result.current.guests).toHaveLength(0);
  });

  // ── Server sync ──────────────────────────────────────────────────────────

  it("syncs to new serverGuests when the prop changes", async () => {
    const initial = [makeGuest({ id: "sync1" })];
    const updated = [makeGuest({ id: "sync1" }), makeGuest({ id: "sync2" })];

    const { result, rerender } = renderHook(
      ({ guests }: { guests: GuestWithRelations[] }) =>
        useOptimisticGuests(guests, { token: TOKEN }),
      { initialProps: { guests: initial } }
    );

    expect(result.current.guests).toHaveLength(1);

    rerender({ guests: updated });

    await waitFor(() => {
      expect(result.current.guests).toHaveLength(2);
    });
  });
});
