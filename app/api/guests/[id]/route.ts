// =============================================================================
// app/api/guests/[id]/route.ts
// PUT    /api/guests/[id]   — Update a guest
// DELETE /api/guests/[id]   — Delete a guest
// =============================================================================

import { type NextRequest } from "next/server";
import { extractAuth } from "@/lib/auth";
import { createAuthenticatedClient } from "@/lib/supabase-server";
import { getGuestWeddingId } from "@/lib/authorization";
import { validateUpdateGuest } from "@/lib/validation/guests";
import { isValidUuid } from "@/lib/sanitize";
import {
  successResponse,
  authErrorResponse,
  notFoundResponse,
  validationErrorResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/api-response";
import type { GuestWithRelations } from "@/types/guests";

type RouteContext = { params: Promise<{ id: string }> };

// ─── PUT /api/guests/[id] ───────────────────────────────────────────────────

export async function PUT(request: NextRequest, context: RouteContext): Promise<Response> {
  const { id: guestId } = await context.params;

  if (!isValidUuid(guestId)) return errorResponse(400, "INVALID_ID", "Guest ID must be a valid UUID.");

  const auth = extractAuth(request);
  if (!auth.authenticated) return authErrorResponse(auth.error.code, auth.error.message);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const validation = validateUpdateGuest(body);
  if (!validation.valid) return validationErrorResponse(validation.errors);
  const input = validation.data;

  const supabase = createAuthenticatedClient(auth.context.token);

  // getGuestWeddingId goes through RLS — returns null if guest doesn't exist
  // or user isn't a wedding member. 404 in both cases (no existence leak).
  const weddingId = await getGuestWeddingId(supabase, guestId);
  if (!weddingId) return notFoundResponse("Guest");

  try {
    // Cross-wedding guard for guest_group_id
    if (input.guest_group_id !== undefined && input.guest_group_id !== null) {
      const { data: group, error: groupError } = await supabase
        .from("guest_groups")
        .select("id")
        .eq("id", input.guest_group_id)
        .eq("wedding_id", weddingId)
        .maybeSingle();

      if (groupError || !group) {
        return errorResponse(400, "INVALID_GUEST_GROUP", "guest_group_id does not exist or belongs to a different wedding.");
      }
    }

    const updatePayload: Record<string, unknown> = {};
    if (input.first_name !== undefined) updatePayload.first_name = input.first_name;
    if (input.last_name !== undefined) updatePayload.last_name = input.last_name;
    if (input.display_name !== undefined) updatePayload.display_name = input.display_name;
    if (input.guest_group_id !== undefined) updatePayload.guest_group_id = input.guest_group_id;
    if (input.side !== undefined) updatePayload.side = input.side;
    if (input.notes !== undefined) updatePayload.notes = input.notes;
    if (input.is_vip !== undefined) updatePayload.is_vip = input.is_vip;

    // Auto-regenerate display_name if first/last changed but display_name wasn't provided.
    // PRODUCT RULE: only regenerates if current display_name was auto-generated
    // (matches first + " " + last). Manual overrides are preserved.
    if (
      (input.first_name !== undefined || input.last_name !== undefined) &&
      input.display_name === undefined
    ) {
      const { data: current } = await supabase
        .from("guests")
        .select("first_name, last_name, display_name")
        .eq("id", guestId)
        .single();

      if (current) {
        const newFirst = input.first_name ?? current.first_name;
        const newLast = input.last_name !== undefined ? input.last_name : current.last_name;
        const autoDisplay = [newFirst, newLast].filter(Boolean).join(" ");
        const currentAuto = [current.first_name, current.last_name].filter(Boolean).join(" ");
        if (current.display_name === currentAuto) {
          updatePayload.display_name = autoDisplay;
        }
      }
    }

    const { data, error } = await supabase
      .from("guests")
      .update(updatePayload)
      .eq("id", guestId)
      .select(`*, guest_group:guest_groups(id, name), guest_events(*)`)
      .single();

    if (error) {
      if (error.code === "23514") return errorResponse(400, "CONSTRAINT_VIOLATION", "Data violates a database constraint.");
      if (error.code === "PGRST116") return notFoundResponse("Guest");
      return internalErrorResponse(error, "PUT /api/guests/[id]");
    }

    return successResponse<GuestWithRelations>(data as GuestWithRelations);
  } catch (err) {
    return internalErrorResponse(err, "PUT /api/guests/[id]");
  }
}

// ─── DELETE /api/guests/[id] ────────────────────────────────────────────────

export async function DELETE(request: NextRequest, context: RouteContext): Promise<Response> {
  const { id: guestId } = await context.params;

  if (!isValidUuid(guestId)) return errorResponse(400, "INVALID_ID", "Guest ID must be a valid UUID.");

  const auth = extractAuth(request);
  if (!auth.authenticated) return authErrorResponse(auth.error.code, auth.error.message);

  const supabase = createAuthenticatedClient(auth.context.token);

  const weddingId = await getGuestWeddingId(supabase, guestId);
  if (!weddingId) return notFoundResponse("Guest");

  try {
    // FK CASCADE confirmed in schema: guest_events, seat_assignments → ON DELETE CASCADE
    const { error } = await supabase.from("guests").delete().eq("id", guestId);

    if (error) {
      if (error.code === "23503") {
        return errorResponse(409, "HAS_DEPENDENCIES", "Cannot delete guest: dependent records exist without CASCADE.");
      }
      return internalErrorResponse(error, "DELETE /api/guests/[id]");
    }

    return successResponse({ id: guestId, deleted: true });
  } catch (err) {
    return internalErrorResponse(err, "DELETE /api/guests/[id]");
  }
}
