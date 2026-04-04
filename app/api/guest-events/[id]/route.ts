// =============================================================================
// app/api/guest-events/[id]/route.ts
// PUT    /api/guest-events/[id]  — Update attendance, meal, plus_one
// DELETE /api/guest-events/[id]  — Remove guest-event association
// =============================================================================

import { type NextRequest } from "next/server";
import { extractAuth } from "@/lib/auth";
import { createAuthenticatedClient } from "@/lib/supabase-server";
import { getGuestEventWeddingId } from "@/lib/authorization";
import { validateUpdateGuestEvent } from "@/lib/validation/guest-events";
import { isValidUuid } from "@/lib/sanitize";
import {
  successResponse,
  authErrorResponse,
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

  const auth = extractAuth(request);
  if (!auth.authenticated) return authErrorResponse(auth.error.code, auth.error.message);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const validation = validateUpdateGuestEvent(body);
  if (!validation.valid) return validationErrorResponse(validation.errors);
  const input = validation.data;

  const supabase = createAuthenticatedClient(auth.context.token);

  // RLS lookup — returns null if not found OR user not authorized (404 in both cases)
  const weddingId = await getGuestEventWeddingId(supabase, guestEventId);
  if (!weddingId) return notFoundResponse("Guest-event");

  try {
    const updatePayload: Record<string, unknown> = {};
    if (input.attendance_status !== undefined) updatePayload.attendance_status = input.attendance_status;
    if (input.meal_choice !== undefined) updatePayload.meal_choice = input.meal_choice;
    if (input.plus_one_label !== undefined) updatePayload.plus_one_label = input.plus_one_label;

    const { data, error } = await supabase
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

  const auth = extractAuth(request);
  if (!auth.authenticated) return authErrorResponse(auth.error.code, auth.error.message);

  const supabase = createAuthenticatedClient(auth.context.token);

  const weddingId = await getGuestEventWeddingId(supabase, guestEventId);
  if (!weddingId) return notFoundResponse("Guest-event");

  try {
    const { error } = await supabase
      .from("guest_events")
      .delete()
      .eq("id", guestEventId);

    if (error) return internalErrorResponse(error, "DELETE /api/guest-events/[id]");

    return successResponse({ id: guestEventId, deleted: true });
  } catch (err) {
    return internalErrorResponse(err, "DELETE /api/guest-events/[id]");
  }
}
