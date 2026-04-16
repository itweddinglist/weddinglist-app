// =============================================================================
// app/api/guest-events/route.ts
// GET  /api/guest-events?wedding_id=X&event_id=Y  — List guest-events for an event
// POST /api/guest-events                          — Create a guest-event association
// =============================================================================

import { type NextRequest } from "next/server";
import {
  getServerAppContext,
  requireAuthenticatedContext,
  requireWeddingAccess,
} from "@/lib/server-context";
import { supabaseServer } from "@/app/lib/supabase/server";
import { validateCreateGuestEvent } from "@/lib/validation/guest-events";
import { isValidUuid } from "@/lib/sanitize";
import {
  successResponse,
  validationErrorResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/api-response";
import type { GuestEventWithGuest } from "@/types/guest-events";

// ─── GET /api/guest-events?wedding_id=X&event_id=Y ─────────────────────────

export async function GET(request: NextRequest): Promise<Response> {
  const ctx = await getServerAppContext(request);
  const authResult = requireAuthenticatedContext(ctx);
  if (!authResult.ok) return authResult.response;

  const weddingId = request.nextUrl.searchParams.get("wedding_id");
  if (!weddingId || !isValidUuid(weddingId)) {
    return errorResponse(400, "INVALID_WEDDING_ID", "A valid wedding_id query parameter is required.");
  }

  // event_id is required — this endpoint is scoped per event, not per wedding
  const eventId = request.nextUrl.searchParams.get("event_id");
  if (!eventId || !isValidUuid(eventId)) {
    return errorResponse(400, "EVENT_ID_REQUIRED", "A valid event_id query parameter is required.");
  }

  const access = await requireWeddingAccess({ ctx: authResult.ctx, requestedWeddingId: weddingId, minRole: "viewer" });
  if (!access.ok) return access.response;

  try {
    // guest_events joined with guest info for display
    // Keep focused: list guest_events for editing/display only.
    // Avoid adding more joins here — payload grows fast.
    const { data, error } = await supabaseServer
      .from("guest_events")
      .select(`*, guest:guests(id, first_name, last_name, display_name, is_vip, side)`)
      .eq("wedding_id", access.wedding_id)
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (error) return internalErrorResponse(error, "GET /api/guest-events");

    return successResponse<GuestEventWithGuest[]>((data as GuestEventWithGuest[]) ?? []);
  } catch (err) {
    return internalErrorResponse(err, "GET /api/guest-events");
  }
}

// ─── POST /api/guest-events ─────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  const ctx = await getServerAppContext(request);
  const authResult = requireAuthenticatedContext(ctx);
  if (!authResult.ok) return authResult.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const validation = validateCreateGuestEvent(body);
  if (!validation.valid) return validationErrorResponse(validation.errors);
  const input = validation.data;

  const access = await requireWeddingAccess({ ctx: authResult.ctx, requestedWeddingId: input.wedding_id, minRole: "editor" });
  if (!access.ok) return access.response;

  try {
    // Verify event belongs to this wedding (cross-wedding guard)
    const { data: event, error: eventError } = await supabaseServer
      .from("events")
      .select("id")
      .eq("id", input.event_id)
      .eq("wedding_id", access.wedding_id)
      .maybeSingle();

    if (eventError || !event) {
      return errorResponse(400, "INVALID_EVENT", "Event does not exist or belongs to a different wedding.");
    }

    // Verify guest belongs to this wedding (cross-wedding guard)
    const { data: guest, error: guestError } = await supabaseServer
      .from("guests")
      .select("id")
      .eq("id", input.guest_id)
      .eq("wedding_id", access.wedding_id)
      .maybeSingle();

    if (guestError || !guest) {
      return errorResponse(400, "INVALID_GUEST", "Guest does not exist or belongs to a different wedding.");
    }

    const { data, error } = await supabaseServer
      .from("guest_events")
      .insert({
        wedding_id: access.wedding_id,
        event_id: input.event_id,
        guest_id: input.guest_id,
        attendance_status: input.attendance_status,
        meal_choice: input.meal_choice,
        plus_one_label: input.plus_one_label,
      })
      .select(`*, guest:guests(id, first_name, last_name, display_name, is_vip, side)`)
      .single();

    if (error) {
      if (error.code === "23505") return errorResponse(409, "ALREADY_ASSOCIATED", "This guest is already associated with this event.");
      if (error.code === "23503") return errorResponse(400, "FK_VIOLATION", "A referenced record (event or guest) does not exist.");
      if (error.code === "23514") return errorResponse(400, "CONSTRAINT_VIOLATION", "Data violates a database constraint. Check attendance_status value.");
      return internalErrorResponse(error, "POST /api/guest-events");
    }

    return successResponse<GuestEventWithGuest>(data as GuestEventWithGuest, 201);
  } catch (err) {
    return internalErrorResponse(err, "POST /api/guest-events");
  }
}
