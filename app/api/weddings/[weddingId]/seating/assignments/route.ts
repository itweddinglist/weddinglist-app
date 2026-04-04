// =============================================================================
// app/api/weddings/[weddingId]/seating/assignments/route.ts
// GET /api/weddings/[weddingId]/seating/assignments?event_id=X
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
import type { SeatingAssignmentsResponse } from "@/types/seating";

type RouteContext = { params: Promise<{ weddingId: string }> };

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  const { weddingId } = await context.params;

  if (!isValidUuid(weddingId)) {
    return errorResponse(400, "INVALID_ID", "Wedding ID must be a valid UUID.");
  }

  const ctx = await getServerAppContext(request);
  const authResult = requireAuthenticatedContext(ctx);
  if (!authResult.ok) return authResult.response;

  const eventId = request.nextUrl.searchParams.get("event_id");
  if (!eventId || !isValidUuid(eventId)) {
    return errorResponse(400, "EVENT_ID_REQUIRED", "A valid event_id query parameter is required.");
  }

  const access = await requireWeddingAccess({ ctx: authResult.ctx, requestedWeddingId: weddingId });
  if (!access.ok) return access.response;

  try {
    const { data, error } = await supabaseServer
      .from("seat_assignments")
      .select(`
        guest_event_id,
        seat_id,
        seats!inner ( table_id ),
        guest_events!inner ( guest_id, event_id, wedding_id )
      `)
      .eq("guest_events.event_id", eventId)
      .eq("guest_events.wedding_id", access.wedding_id);

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
