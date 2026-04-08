// =============================================================================
// lib/supabase/db.ts
// Data Access Layer — Faza 10 SPEC secțiunea 14.
//
// Wrapper typed peste supabaseServer.rpc() cu:
//   - Logging structurat (slow query warn, error)
//   - Auto-trigger read-only dacă duration > 2000ms
//   - Normalizare erori
//
// Server-side only — nu importa din client code.
// =============================================================================

import { supabaseServer } from "@/app/lib/supabase/server";
import { triggerReadOnlyMode } from "@/lib/system/read-only";

interface RpcOptions {
  request_id?: string;
}

/**
 * Execută un RPC Supabase cu timing, logging și auto read-only trigger.
 *
 * - > 300ms  → warn (slow query)
 * - > 2000ms → triggerReadOnlyMode("rpc_error_threshold")
 * - error    → throw Error normalizat
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
    throw new Error(error.message ?? `RPC ${name} failed`);
  }

  console.warn(`[RPC] ${name} ok`, { request_id, duration });
  return data as T;
}
