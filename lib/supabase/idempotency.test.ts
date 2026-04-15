// =============================================================================
// lib/supabase/idempotency.test.ts
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock supabaseServer — hoisted so vi.mock factory can reference them ───────

const {
  mockFrom,
  mockSelect,
  mockEq,
  mockMaybeSingle,
  mockInsert,
  mockThrowOnError,
} = vi.hoisted(() => {
  const mockMaybeSingle = vi.fn();
  const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
  const mockSelect = vi.fn(() => ({ eq: mockEq }));
  const mockThrowOnError = vi.fn(() => Promise.resolve({ error: null }));
  const mockInsert = vi.fn(() => ({ throwOnError: mockThrowOnError }));
  const mockFrom = vi.fn(() => ({ select: mockSelect, insert: mockInsert }));

  return { mockFrom, mockSelect, mockEq, mockMaybeSingle, mockInsert, mockThrowOnError };
});

vi.mock("@/app/lib/supabase/server", () => ({
  supabaseServer: { from: mockFrom },
}));

import { computeRequestHash, withIdempotency } from "./idempotency";

// ── Helpers ───────────────────────────────────────────────────────────────────

const APP_USER_ID = "00000000-0000-0000-0000-000000000001";
const WEDDING_ID  = "00000000-0000-0000-0000-000000000002";
const CLIENT_OP   = "00000000-0000-0000-0000-000000000003";
const PAYLOAD     = { b: 2, a: 1 };
const RPC_NAME    = "test_rpc";

function makeExecute<T>(value: T) {
  return vi.fn(() => Promise.resolve(value));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("computeRequestHash", () => {
  it("hash determinist — același input → același hash", async () => {
    const h1 = await computeRequestHash(APP_USER_ID, WEDDING_ID, PAYLOAD, CLIENT_OP);
    const h2 = await computeRequestHash(APP_USER_ID, WEDDING_ID, PAYLOAD, CLIENT_OP);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/); // SHA-256 hex = 64 chars
  });

  it("hash diferit la payload diferit", async () => {
    const h1 = await computeRequestHash(APP_USER_ID, WEDDING_ID, { a: 1 }, CLIENT_OP);
    const h2 = await computeRequestHash(APP_USER_ID, WEDDING_ID, { a: 2 }, CLIENT_OP);
    expect(h1).not.toBe(h2);
  });

  it("hash stabil indiferent de ordinea cheilor în payload", async () => {
    const h1 = await computeRequestHash(APP_USER_ID, WEDDING_ID, { a: 1, b: 2 }, CLIENT_OP);
    const h2 = await computeRequestHash(APP_USER_ID, WEDDING_ID, { b: 2, a: 1 }, CLIENT_OP);
    expect(h1).toBe(h2);
  });

  it("hash diferit la client_operation_id diferit", async () => {
    const h1 = await computeRequestHash(APP_USER_ID, WEDDING_ID, PAYLOAD, CLIENT_OP);
    const h2 = await computeRequestHash(APP_USER_ID, WEDDING_ID, PAYLOAD, "different-op-id");
    expect(h1).not.toBe(h2);
  });
});

describe("withIdempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockInsert.mockReturnValue({ throwOnError: mockThrowOnError });
    mockThrowOnError.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert });
  });

  it("execute apelat și rezultatul returnat la primul apel", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const execute = makeExecute({ seats: 42 });
    const result = await withIdempotency("hash-1", APP_USER_ID, WEDDING_ID, RPC_NAME, "op-id-1", execute);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ seats: 42 });
  });

  it("răspuns cached returnat la al doilea apel — execute nu mai e apelat", async () => {
    // Simulăm că hash-ul există deja în DB
    mockMaybeSingle.mockResolvedValue({
      data: { response: { seats: 99 } },
      error: null,
    });

    const execute = makeExecute({ seats: 99 });
    const result = await withIdempotency("hash-2", APP_USER_ID, WEDDING_ID, RPC_NAME, "op-id-2", execute);

    expect(execute).not.toHaveBeenCalled();
    expect(result).toEqual({ seats: 99 });
  });

  it("execute apelat O SINGURĂ DATĂ — insert stochează răspunsul", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const execute = makeExecute({ ok: true });
    await withIdempotency("hash-3", APP_USER_ID, WEDDING_ID, RPC_NAME, "op-id-3", execute);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        request_hash: "hash-3",
        app_user_id: APP_USER_ID,
        wedding_id: WEDDING_ID,
        rpc_name: RPC_NAME,
        response: { ok: true },
      })
    );
  });

  it("câmpul response din cache este returnat direct (fără re-execuție)", async () => {
    const cached = { tables: [1, 2, 3] };
    mockMaybeSingle.mockResolvedValue({ data: { response: cached }, error: null });

    const execute = makeExecute({ tables: [] });
    const result = await withIdempotency("hash-4", APP_USER_ID, WEDDING_ID, RPC_NAME, "op-id-4", execute);

    expect(result).toEqual(cached);
    expect(execute).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
