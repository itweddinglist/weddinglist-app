// =============================================================================
// app/api/weddings/[weddingId]/seating/assignments/route.ts
// GET /api/weddings/[weddingId]/seating/assignments?event_id=X
// =============================================================================

import { type NextRequest } from "next/server";
import { extractAuth } from "@/lib/auth";
import { createAuthenticatedClient } from "@/lib/supabase-server";
import { isWeddingMember } from "@/lib/authorization";
import { isValidUuid } from "@/lib/sanitize";
import {
  successResponse,
  authErrorResponse,
  forbiddenResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/api-response";
import type { SeatingAssignmentsResponse } from "@/types/seating";

type RouteContext = { params: Promise<{ weddingId: string }> };

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  const { weddingId } = await context.params;

  if (!isValidUuid(weddingId)) {
    return errorResponse(400, "INVALID_ID", "Wedding ID must be a valid UUID.");
  }

  const auth = extractAuth(request);
  if (!auth.authenticated) return authErrorResponse(auth.error.code, auth.error.message);

  const eventId = request.nextUrl.searchParams.get("event_id");
  if (!eventId || !isValidUuid(eventId)) {
    return errorResponse(400, "EVENT_ID_REQUIRED", "A valid event_id query parameter is required.");
  }

  const supabase = createAuthenticatedClient(auth.context.token);

  const isMember = await isWeddingMember(supabase, weddingId);
  if (!isMember) return forbiddenResponse();

  try {
    const { data, error } = await supabase
      .from("seat_assignments")
      .select(`
        guest_event_id,
        seat_id,
        seats!inner ( table_id ),
        guest_events!inner ( guest_id, event_id, wedding_id )
      `)
      .eq("guest_events.event_id", eventId)
      .eq("guest_events.wedding_id", weddingId);

    if (error) return internalErrorResponse(error, "GET seating/assignments");

    const assignments: SeatingAssignmentsResponse["assignments"] = (data ?? []).map((row: any) => ({
      guest_event_id: row.guest_event_id,
      seat_id:        row.seat_id,
      table_id:       row.seats.table_id,
      guest_id:       row.guest_events.guest_id,
    }));

    return successResponse<SeatingAssignmentsResponse>({ assignments });
  } catch (err) {
    return internalErrorResponse(err, "GET seating/assignments");
  }
}
