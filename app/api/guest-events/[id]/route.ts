// =============================================================================
// app/api/guest-events/[id]/route.ts
// PUT    /api/guest-events/[id]  — Update attendance, meal, plus_one
// DELETE /api/guest-events/[id]  — Remove guest-event association
// =============================================================================

import { type NextRequest } from "next/server";
import {
  getServerAppContext,
  requireAuthenticatedContext,
  requireWeddingAccess,
} from "@/lib/server-context";
import { supabaseServer } from "@/app/lib/supabase/server";
import { validateUpdateGuestEvent } from "@/lib/validation/guest-events";
import { isValidUuid } from "@/lib/sanitize";
import {
  successResponse,
  notFoundResponse,
  validationErrorResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/api-response";
import type { GuestEventWithGuest } from "@/types/guest-events";

type RouteContext = { params: Promise<{ id: string }> };

// ─── PUT /api/guest-events/[id] ─────────────────────────────────────────────

export async function PUT(request: NextRequest, context: RouteContext): Promise<Response> {
  const { id: guestEventId } = await context.params;

  if (!isValidUuid(guestEventId)) return errorResponse(400, "INVALID_ID", "Guest-event ID must be a valid UUID.");

  const ctx = await getServerAppContext(request);
  const authResult = requireAuthenticatedContext(ctx);
  if (!authResult.ok) return authResult.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const validation = validateUpdateGuestEvent(body);
  if (!validation.valid) return validationErrorResponse(validation.errors);
  const input = validation.data;

  // Look up the wedding_id for this guest-event record
  const { data: ge, error: geLookupError } = await supabaseServer
    .from("guest_events")
    .select("wedding_id")
    .eq("id", guestEventId)
    .maybeSingle();

  if (geLookupError) return internalErrorResponse(geLookupError, "PUT /api/guest-events/[id] — lookup");
  if (!ge?.wedding_id) return notFoundResponse("Guest-event");

  const access = await requireWeddingAccess({ ctx: authResult.ctx, requestedWeddingId: ge.wedding_id, minRole: "editor" });
  if (!access.ok) return access.response;

  try {
    const updatePayload: Record<string, unknown> = {};
    if (input.attendance_status !== undefined) updatePayload.attendance_status = input.attendance_status;
    if (input.meal_choice !== undefined) updatePayload.meal_choice = input.meal_choice;
    if (input.plus_one_label !== undefined) updatePayload.plus_one_label = input.plus_one_label;

    const { data, error } = await supabaseServer
      .from("guest_events")
      .update(updatePayload)
      .eq("id", guestEventId)
      .select(`*, guest:guests(id, first_name, last_name, display_name, is_vip, side)`)
      .single();

    if (error) {
      if (error.code === "23514") return errorResponse(400, "CONSTRAINT_VIOLATION", "Data violates a database constraint. Check attendance_status value.");
      if (error.code === "PGRST116") return notFoundResponse("Guest-event");
      return internalErrorResponse(error, "PUT /api/guest-events/[id]");
    }

    return successResponse<GuestEventWithGuest>(data as GuestEventWithGuest);
  } catch (err) {
    return internalErrorResponse(err, "PUT /api/guest-events/[id]");
  }
}

// ─── DELETE /api/guest-events/[id] ──────────────────────────────────────────

export async function DELETE(request: NextRequest, context: RouteContext): Promise<Response> {
  const { id: guestEventId } = await context.params;

  if (!isValidUuid(guestEventId)) return errorResponse(400, "INVALID_ID", "Guest-event ID must be a valid UUID.");

  const ctx = await getServerAppContext(request);
  const authResult = requireAuthenticatedContext(ctx);
  if (!authResult.ok) return authResult.response;

  // Look up the wedding_id for this guest-event record
  const { data: ge, error: geLookupError } = await supabaseServer
    .from("guest_events")
    .select("wedding_id")
    .eq("id", guestEventId)
    .maybeSingle();

  if (geLookupError) return internalErrorResponse(geLookupError, "DELETE /api/guest-events/[id] — lookup");
  if (!ge?.wedding_id) return notFoundResponse("Guest-event");

  const access = await requireWeddingAccess({ ctx: authResult.ctx, requestedWeddingId: ge.wedding_id, minRole: "editor" });
  if (!access.ok) return access.response;

  try {
    const { error } = await supabaseServer
      .from("guest_events")
      .delete()
      .eq("id", guestEventId);

    if (error) return internalErrorResponse(error, "DELETE /api/guest-events/[id]");

    return successResponse({ id: guestEventId, deleted: true });
  } catch (err) {
    return internalErrorResponse(err, "DELETE /api/guest-events/[id]");
  }
}
