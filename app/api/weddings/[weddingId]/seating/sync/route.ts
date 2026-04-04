// =============================================================================
// app/api/weddings/[weddingId]/seating/sync/route.ts
// POST /api/weddings/[weddingId]/seating/sync
//
// Wrapper subțire peste RPC sync_seating_editor_state.
// Toată logica de reconciliere e în RPC (tranzacțional, SECURITY DEFINER).
// =============================================================================

import { type NextRequest } from "next/server";
import { extractAuth } from "@/lib/auth";
import { createAuthenticatedClient } from "@/lib/supabase-server";
import { isValidUuid } from "@/lib/sanitize";
import {
  successResponse,
  authErrorResponse,
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

  const auth = extractAuth(request);
  if (!auth.authenticated) return authErrorResponse(auth.error.code, auth.error.message);

  let body: SeatingFullSyncRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  if (!body.event_id || !isValidUuid(body.event_id)) {
    return errorResponse(400, "EVENT_ID_REQUIRED", "A valid event_id is required.");
  }

  const supabase = createAuthenticatedClient(auth.context.token);

  try {
    const { data, error } = await supabase.rpc("sync_seating_editor_state", {
      p_wedding_id:  weddingId,
      p_event_id:    body.event_id,
      p_caller_uid:  auth.context.userId,
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
