// =============================================================================
// app/api/guests/route.ts
// GET  /api/guests   — List guests for the active wedding
// POST /api/guests   — Create a new guest
// =============================================================================

import { type NextRequest } from "next/server";
import {
  getServerAppContext,
  requireAuthenticatedContext,
  requireWeddingAccess,
} from "@/lib/server-context";
import { supabaseServer } from "@/app/lib/supabase/server";
import { validateCreateGuest } from "@/lib/validation/guests";
import {
  successResponse,
  validationErrorResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/api-response";
import type { GuestWithRelations } from "@/types/guests";
import { checkOrigin } from "@/lib/csrf";

// ─── GET /api/guests ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<Response> {
  const ctx = await getServerAppContext(request);
  const authResult = requireAuthenticatedContext(ctx);
  if (!authResult.ok) return authResult.response;

  const access = await requireWeddingAccess({ ctx: authResult.ctx, minRole: "viewer" });
  if (!access.ok) return access.response;

  try {
    // Full list for MVP — pagination at Phase 4
    // guest_events included intentionally: seating chart needs attendance_status per event
    const { data, error } = await supabaseServer
      .from("guests")
      .select(`*, guest_group:guest_groups(id, name), guest_events(*)`)
      .eq("wedding_id", access.wedding_id)
      .order("created_at", { ascending: true });

    if (error) return internalErrorResponse(error, "GET /api/guests");

    return successResponse<GuestWithRelations[]>((data as GuestWithRelations[]) ?? []);
  } catch (err) {
    return internalErrorResponse(err, "GET /api/guests");
  }
}

// ─── POST /api/guests ────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  const originCheck = checkOrigin(request);
  if (originCheck) return originCheck;

  const ctx = await getServerAppContext(request);
  const authResult = requireAuthenticatedContext(ctx);
  if (!authResult.ok) return authResult.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const validation = validateCreateGuest(body);
  if (!validation.valid) return validationErrorResponse(validation.errors);
  const input = validation.data;

  const access = await requireWeddingAccess({ ctx: authResult.ctx, minRole: "editor" });
  if (!access.ok) return access.response;

  const weddingId = access.wedding_id;

  try {
    // Verify guest_group_id belongs to the same wedding (cross-wedding guard)
    if (input.guest_group_id) {
      const { data: group, error: groupError } = await supabaseServer
        .from("guest_groups")
        .select("id")
        .eq("id", input.guest_group_id)
        .eq("wedding_id", weddingId)
        .maybeSingle();

      if (groupError || !group) {
        return errorResponse(400, "INVALID_GUEST_GROUP", "guest_group_id does not exist or belongs to a different wedding.");
      }
    }

    // 3.5 Duplicate check — non-blocking warning
    // Same first_name + last_name in the same wedding → warn, don't block
    // 3.7 Data sanitation — already applied in validateCreateGuest via sanitizeName:
    //   trim, strip HTML, collapse spaces, max 100 chars
    const warnings: string[] = [];
    const { data: duplicates } = await supabaseServer
      .from("guests")
      .select("id")
      .eq("wedding_id", weddingId)
      .eq("first_name", input.first_name)
      .eq("last_name", input.last_name ?? "")
      .limit(1);

    if (duplicates && duplicates.length > 0) {
      warnings.push(
        `A guest named "${input.first_name}${input.last_name ? " " + input.last_name : ""}" already exists in this wedding.`
      );
    }

    const { data, error } = await supabaseServer
      .from("guests")
      .insert({
        wedding_id: weddingId,
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

    return successResponse<GuestWithRelations>(data as GuestWithRelations, 201, warnings);
  } catch (err) {
    return internalErrorResponse(err, "POST /api/guests");
  }
}
