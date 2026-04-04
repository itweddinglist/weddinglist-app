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
import type { SeatingFullSyncRequest, SeatingFullSyncResponse } from "@/types/seating";

type RouteContext = { params: Promise<{ weddingId: string }> };

// Mapare ERRCODE → HTTP status + cod API
const RPC_ERROR_MAP: Record<string, { status: number; code: string }> = {
  P0001: { status: 403, code: "FORBIDDEN" },
  P0002: { status: 400, code: "TABLE_SCOPE_INVALID" },
  P0003: { status: 409, code: "SEAT_REDUCTION_BLOCKED" },
  P0004: { status: 400, code: "GUEST_MAPPING_NOT_FOUND" },
  P0005: { status: 400, code: "GUEST_EVENT_NOT_FOUND" },
  P0006: { status: 400, code: "TABLE_MAPPING_NOT_FOUND" },
  P0007: { status: 409, code: "TABLE_SCOPE_INVALID" },
  P0008: { status: 409, code: "NO_FREE_SEAT" },
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

  const access = await requireWeddingAccess({ ctx: authResult.ctx, requestedWeddingId: weddingId });
  if (!access.ok) return access.response;

  try {
    const { data, error } = await supabaseServer.rpc("sync_seating_editor_state", {
      p_wedding_id:  access.wedding_id,
      p_event_id:    body.event_id,
      p_caller_uid:  authResult.ctx.app_user_id,
      p_tables:      JSON.stringify(body.tables),
      p_assignments: JSON.stringify(body.assignments),
    });

    if (error) {
      // Mapează erori business din RPC
      const mapped = RPC_ERROR_MAP[error.code ?? ""];
      if (mapped) {
        return errorResponse(mapped.status, mapped.code, error.message);
      }
      return internalErrorResponse(error, "POST seating/sync — RPC");
    }

    return successResponse<SeatingFullSyncResponse>(data as SeatingFullSyncResponse, 200);
  } catch (err) {
    return internalErrorResponse(err, "POST seating/sync");
  }
}
