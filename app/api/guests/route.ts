// =============================================================================
// app/api/guests/route.ts
// GET  /api/guests?wedding_id=X   — List guests for a wedding
// POST /api/guests                — Create a new guest
// =============================================================================

import { type NextRequest } from "next/server";
import { extractAuth } from "@/lib/auth";
import { createAuthenticatedClient } from "@/lib/supabase-server";
import { isWeddingMember } from "@/lib/authorization";
import { validateCreateGuest } from "@/lib/validation/guests";
import { isValidUuid } from "@/lib/sanitize";
import {
  successResponse,
  authErrorResponse,
  forbiddenResponse,
  validationErrorResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/api-response";
import type { GuestWithRelations } from "@/types/guests";

// ─── GET /api/guests?wedding_id=X ───────────────────────────────────────────

export async function GET(request: NextRequest): Promise<Response> {
  const auth = extractAuth(request);
  if (!auth.authenticated) return authErrorResponse(auth.error.code, auth.error.message);

  const weddingId = request.nextUrl.searchParams.get("wedding_id");
  if (!weddingId || !isValidUuid(weddingId)) {
    return errorResponse(400, "INVALID_WEDDING_ID", "A valid wedding_id query parameter is required.");
  }

  const supabase = createAuthenticatedClient(auth.context.token);

  const isMember = await isWeddingMember(supabase, weddingId);
  if (!isMember) return forbiddenResponse("You are not a member of this wedding.");

  try {
    // Full list for MVP — pagination at Phase 4
    // guest_events included intentionally: seating chart needs attendance_status per event
    const { data, error } = await supabase
      .from("guests")
      .select(`*, guest_group:guest_groups(id, name), guest_events(*)`)
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: true });

    if (error) return internalErrorResponse(error, "GET /api/guests");

    return successResponse<GuestWithRelations[]>((data as GuestWithRelations[]) ?? []);
  } catch (err) {
    return internalErrorResponse(err, "GET /api/guests");
  }
}

// ─── POST /api/guests ───────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  const auth = extractAuth(request);
  if (!auth.authenticated) return authErrorResponse(auth.error.code, auth.error.message);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const validation = validateCreateGuest(body);
  if (!validation.valid) return validationErrorResponse(validation.errors);
  const input = validation.data;

  const supabase = createAuthenticatedClient(auth.context.token);

  const isMember = await isWeddingMember(supabase, input.wedding_id);
  if (!isMember) return forbiddenResponse("You are not a member of this wedding.");

  try {
    // Verify guest_group_id belongs to the same wedding (cross-wedding guard)
    if (input.guest_group_id) {
      const { data: group, error: groupError } = await supabase
        .from("guest_groups")
        .select("id")
        .eq("id", input.guest_group_id)
        .eq("wedding_id", input.wedding_id)
        .maybeSingle();

      if (groupError || !group) {
        return errorResponse(400, "INVALID_GUEST_GROUP", "guest_group_id does not exist or belongs to a different wedding.");
      }
    }

    const { data, error } = await supabase
      .from("guests")
      .insert({
        wedding_id: input.wedding_id,
        first_name: input.first_name,
        last_name: input.last_name,
        display_name: input.display_name,
        guest_group_id: input.guest_group_id,
        side: input.side,
        notes: input.notes,
        is_vip: input.is_vip,
      })
      .select(`*, guest_group:guest_groups(id, name), guest_events(*)`)
      .single();

    if (error) {
      if (error.code === "23503") return errorResponse(400, "FK_VIOLATION", "A referenced record (wedding or guest group) does not exist.");
      if (error.code === "23514") return errorResponse(400, "CONSTRAINT_VIOLATION", "Data violates a database constraint. Check required fields.");
      return internalErrorResponse(error, "POST /api/guests");
    }

    return successResponse<GuestWithRelations>(data as GuestWithRelations, 201);
  } catch (err) {
    return internalErrorResponse(err, "POST /api/guests");
  }
}
