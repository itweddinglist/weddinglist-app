// =============================================================================
// lib/supabase/db.ts
// Data Access Layer — Faza 10 SPEC secțiunea 14.
//
// Wrapper typed peste supabaseServer.rpc() cu:
//   - Logging structurat (slow query warn, error)
//   - Auto-trigger read-only dacă duration > 2000ms
//   - Normalizare erori (normalizeRpcError → RpcError tipizat)
//
// Server-side only — nu importa din client code.
// =============================================================================

import { supabaseServer } from "@/app/lib/supabase/server";
import { triggerReadOnlyMode } from "@/lib/system/read-only";

// ─── RpcError ─────────────────────────────────────────────────────────────────

/**
 * Coduri de eroare aplicație — aliniate cu SPEC v5.4 §10.3 și §12.2.
 */
export type RpcErrorCode =
  | "FORBIDDEN"
  | "VERSION_MISMATCH"
  | "DUPLICATE_GUEST"
  | "CAPACITY_EXCEEDED"
  | "GUEST_NOT_FOUND"
  | "PROTECTED_DELETE"
  | "NETWORK"
  | "UNKNOWN";

/**
 * Eroare tipizată aruncată de rpc<T>().
 * Route handlers o prind și o serializează ca { error: { code, message } }.
 */
export class RpcError extends Error {
  readonly code: RpcErrorCode;

  constructor(code: RpcErrorCode, message: string) {
    super(message);
    this.name = "RpcError";
    this.code = code;
  }
}

// ─── Mapare ERRCODE Postgres → RpcErrorCode ───────────────────────────────────

// Aliniat cu SPEC v5.4 §10.3:
//   P0001 → FORBIDDEN
//   P0002 → VERSION_MISMATCH
//   P0003 → DUPLICATE_GUEST
//   P0004 → CAPACITY_EXCEEDED
//   P0005 → GUEST_NOT_FOUND
//   P0006 → PROTECTED_DELETE
const POSTGRES_CODE_MAP: Record<string, RpcErrorCode> = {
  P0001: "FORBIDDEN",
  P0002: "VERSION_MISMATCH",
  P0003: "DUPLICATE_GUEST",
  P0004: "CAPACITY_EXCEEDED",
  P0005: "GUEST_NOT_FOUND",
  P0006: "PROTECTED_DELETE",
};

/**
 * Mapează o eroare PostgrestError → RpcError tipizat.
 * `error.code` conține ERRCODE-ul Postgres (ex: "P0001").
 * `error.message` conține mesajul din RAISE EXCEPTION.
 */
export function normalizeRpcError(error: {
  code?: string | null;
  message?: string | null;
}): RpcError {
  const pgCode = error.code ?? "";
  const message = error.message ?? "Eroare necunoscută";

  const appCode: RpcErrorCode = POSTGRES_CODE_MAP[pgCode] ?? "UNKNOWN";
  return new RpcError(appCode, message);
}

// ─── Options ──────────────────────────────────────────────────────────────────

interface RpcOptions {
  request_id?: string;
}

// ─── rpc<T> ───────────────────────────────────────────────────────────────────

/**
 * Execută un RPC Supabase cu timing, logging și auto read-only trigger.
 *
 * - > 300ms  → warn (slow query)
 * - > 2000ms → triggerReadOnlyMode("rpc_error_threshold")
 * - error    → throw RpcError normalizat (cod tipizat, mesaj din Postgres)
 */
export async function rpc<T>(
  name: string,
  payload: Record<string, unknown>,
  options: RpcOptions = {}
): Promise<T> {
  const request_id = options.request_id ?? crypto.randomUUID();
  const start = Date.now();

  const { data, error } = await supabaseServer.rpc(name, payload);

  const duration = Date.now() - start;

  if (duration > 300) {
    console.warn(`[RPC] ${name} slow`, { request_id, duration });
  }
  if (duration > 2000) {
    triggerReadOnlyMode("rpc_error_threshold");
  }

  if (error) {
    console.error(`[RPC] ${name} failed`, {
      request_id,
      error: error.code,
      duration,
    });
    throw normalizeRpcError(error);
  }

  console.warn(`[RPC] ${name} ok`, { request_id, duration });
  return data as T;
}
