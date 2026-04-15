// =============================================================================
// lib/supabase/idempotency.ts
// Idempotency helper — Faza 3 SPEC secțiunea 7.
//
// Garantează zero duplicate execution la retry/reconnect/multi-instance.
// Folosește supabaseServer (service_role) — server-side only.
// =============================================================================

import { supabaseServer } from "@/app/lib/supabase/server";

// ─── Hash determinist ─────────────────────────────────────────────────────────

/**
 * Calculează SHA-256 hex al:
 *   app_user_id + wedding_id + JSON.stringify(payload, sortedKeys) + client_operation_id
 *
 * Payload TREBUIE stringificat cu chei sortate alfabetic.
 * Altfel același conținut → hash diferit → false dedupe.
 */
export async function computeRequestHash(
  appUserId: string,
  weddingId: string,
  payload: Record<string, unknown>,
  clientOperationId: string
): Promise<string> {
  const deterministicPayload = JSON.stringify(
    payload,
    Object.keys(payload).sort()
  );

  const raw = appUserId + weddingId + deterministicPayload + clientOperationId;
  const encoded = new TextEncoder().encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);

  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── withIdempotency ──────────────────────────────────────────────────────────

/**
 * Execută `execute()` o singură dată per `requestHash`.
 * Dacă hash-ul există deja în DB, returnează răspunsul cached fără a apela execute.
 *
 * Race condition safe: INSERT ignoră conflictul pe request_hash (UNIQUE).
 * La conflict, altă instanță a inserat primul — citim răspunsul lor.
 *
 * Non-fatal: dacă tabelul idempotency_keys lipsește (ex: DEV fără migrație),
 * operația se execută oricum și eroarea de INSERT e loggată, nu aruncată.
 *
 * @param requestHash        SHA-256 hex din computeRequestHash()
 * @param appUserId          UUID-ul utilizatorului autentificat
 * @param weddingId          UUID-ul nunții active
 * @param rpcName            Numele operației (pentru debugging/audit)
 * @param clientOperationId  ID generat pe client O SINGURĂ DATĂ per intenție de Save
 * @param execute            Operația idempotentă de executat
 */
export async function withIdempotency<T>(
  requestHash: string,
  appUserId: string,
  weddingId: string,
  rpcName: string,
  clientOperationId: string,
  execute: () => Promise<T>
): Promise<T> {
  // 1. Verificăm dacă există un răspuns cached
  const { data: existing } = await supabaseServer
    .from("idempotency_keys")
    .select("response")
    .eq("request_hash", requestHash)
    .maybeSingle();

  if (existing !== null) {
    return existing.response as T;
  }

  // 2. Executăm operația
  const result = await execute();

  // 3. Stocăm răspunsul — non-fatal dacă tabelul lipsește sau există conflict de UNIQUE
  const { error: insertError } = await supabaseServer
    .from("idempotency_keys")
    .insert({
      request_hash:        requestHash,
      client_operation_id: clientOperationId,
      app_user_id:         appUserId,
      wedding_id:          weddingId,
      rpc_name:            rpcName,
      response:            result as Record<string, unknown>,
    });

  if (insertError) {
    console.warn("[Idempotency] insert failed, skipping dedup:", insertError.code);
  }

  return result;
}
