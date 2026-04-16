// =============================================================================
// app/api/weddings/[weddingId]/seating/sync/route.ts
// POST /api/weddings/[weddingId]/seating/sync
//
// Wrapper subțire peste RPC sync_seating_editor_state.
// Toată logica de reconciliere e în RPC (tranzacțional, SECURITY DEFINER).
// =============================================================================

import { type NextRequest } from "next/server";
import {
  getServerAppContext,
  requireAuthenticatedContext,
  requireWeddingAccess,
} from "@/lib/server-context";
import { supabaseServer } from "@/app/lib/supabase/server";
import { isValidUuid } from "@/lib/sanitize";
import {
  successResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/api-response";
import { computeRequestHash, withIdempotency } from "@/lib/supabase/idempotency";
import type { SeatingFullSyncRequest, SeatingFullSyncResponse } from "@/types/seating";

type RouteContext = { params: Promise<{ weddingId: string }> };

// Mapare ERRCODE → HTTP status + cod API (aliniat cu SPEC v5.4 secțiunea 10.3)
const RPC_ERROR_MAP: Record<string, { status: number; code: string }> = {
  P0001: { status: 403, code: "FORBIDDEN" },
  P0002: { status: 409, code: "VERSION_MISMATCH" },
  P0003: { status: 409, code: "CAPACITY_EXCEEDED" },
  P0004: { status: 400, code: "GUEST_NOT_FOUND" },
  P0005: { status: 400, code: "GUEST_NOT_FOUND" },
  P0006: { status: 400, code: "TABLE_MAPPING_NOT_FOUND" },
  P0007: { status: 400, code: "TABLE_DELETED" },
  P0008: { status: 409, code: "CAPACITY_EXCEEDED" },
  P0009: { status: 400, code: "EVENT_NOT_FOUND" },
};

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  const { weddingId } = await context.params;

  if (!isValidUuid(weddingId)) {
    return errorResponse(400, "INVALID_ID", "Wedding ID must be a valid UUID.");
  }

  const ctx = await getServerAppContext(request);
  const authResult = requireAuthenticatedContext(ctx);
  if (!authResult.ok) return authResult.response;

  let body: SeatingFullSyncRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  if (!body.event_id || !isValidUuid(body.event_id)) {
    return errorResponse(400, "EVENT_ID_REQUIRED", "A valid event_id is required.");
  }

  const access = await requireWeddingAccess({ ctx: authResult.ctx, requestedWeddingId: weddingId, minRole: "editor" });
  if (!access.ok) return access.response;

  const rpcParams = {
    p_wedding_id:  access.wedding_id,
    p_event_id:    body.event_id,
    p_caller_uid:  authResult.ctx.app_user_id,
    p_tables:      body.tables,
    p_assignments: body.assignments,
    p_version:     body.version          ?? -1,
    p_force:       body.force_overwrite  ?? false,
  };

  try {
    let data: SeatingFullSyncResponse | null = null;
    let rpcError: { code?: string | null; message?: string | null } | null = null;

    if (body.client_operation_id) {
      // ── Faza 3: Idempotency — deduplică retry-urile pe aceeași intenție de Save ──
      const hash = await computeRequestHash(
        authResult.ctx.app_user_id,
        access.wedding_id,
        rpcParams as Record<string, unknown>,
        body.client_operation_id
      );
      try {
        data = await withIdempotency(
          hash,
          authResult.ctx.app_user_id,
          access.wedding_id,
          "sync_seating_editor_state",
          body.client_operation_id,
          async () => {
            const { data: d, error: e } = await supabaseServer.rpc(
              "sync_seating_editor_state",
              rpcParams
            );
            if (e) throw e;
            return d as SeatingFullSyncResponse;
          }
        );
      } catch (e: unknown) {
        rpcError = e as { code?: string | null; message?: string | null };
      }
    } else {
      // ── Fără client_operation_id → apel direct (backward compat) ──────────────
      const { data: d, error: e } = await supabaseServer.rpc(
        "sync_seating_editor_state",
        rpcParams
      );
      data = d as SeatingFullSyncResponse;
      rpcError = e;
    }

    if (rpcError) {
      const mapped = RPC_ERROR_MAP[rpcError.code ?? ""];
      if (mapped) {
        return errorResponse(mapped.status, mapped.code, rpcError.message ?? "");
      }
      return internalErrorResponse(rpcError, "POST seating/sync — RPC");
    }

    return successResponse<SeatingFullSyncResponse>(data as SeatingFullSyncResponse, 200);
  } catch (err) {
    return internalErrorResponse(err, "POST seating/sync");
  }
}
