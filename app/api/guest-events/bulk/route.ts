// =============================================================================
// app/api/guest-events/bulk/route.ts
// POST /api/guest-events/bulk — Associate all wedding guests with an event.
//
// Idempotent: guests already associated are skipped (ON CONFLICT DO NOTHING).
// Safe to call multiple times.
//
// Known scaling limit: fetches all guests into Node.js memory.
// For 600 guests (product limit) this is fine.
// For 1000+ guests, migrate to a Postgres RPC (Phase 4).
// =============================================================================

import { type NextRequest } from "next/server";
import {
  getServerAppContext,
  requireAuthenticatedContext,
  requireWeddingAccess,
} from "@/lib/server-context";
import { supabaseServer } from "@/app/lib/supabase/server";
import { validateBulkCreateGuestEvents } from "@/lib/validation/guest-events";
import {
  successResponse,
  validationErrorResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/api-response";
import type { BulkCreateResult } from "@/types/guest-events";

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

  const validation = validateBulkCreateGuestEvents(body);
  if (!validation.valid) return validationErrorResponse(validation.errors);
  const input = validation.data;

  const access = await requireWeddingAccess({ ctx: authResult.ctx, requestedWeddingId: input.wedding_id, minRole: "editor" });
  if (!access.ok) return access.response;

  try {
    // Verify event belongs to this wedding
    const { data: event, error: eventError } = await supabaseServer
      .from("events")
      .select("id")
      .eq("id", input.event_id)
      .eq("wedding_id", access.wedding_id)
      .maybeSingle();

    if (eventError || !event) {
      return errorResponse(400, "INVALID_EVENT", "Event does not exist or belongs to a different wedding.");
    }

    // Fetch all guests for this wedding
    const { data: guests, error: guestsError } = await supabaseServer
      .from("guests")
      .select("id")
      .eq("wedding_id", access.wedding_id);

    if (guestsError) return internalErrorResponse(guestsError, "POST /api/guest-events/bulk — fetch guests");

    if (!guests || guests.length === 0) {
      return successResponse<BulkCreateResult>({
        created: 0, skipped: 0, total_guests: 0,
        event_id: input.event_id, already_complete: true,
      });
    }

    // Fetch existing associations for this event
    const { data: existing, error: existingError } = await supabaseServer
      .from("guest_events")
      .select("guest_id")
      .eq("event_id", input.event_id)
      .eq("wedding_id", access.wedding_id);

    if (existingError) return internalErrorResponse(existingError, "POST /api/guest-events/bulk — fetch existing");

    const existingGuestIds = new Set((existing ?? []).map((ge) => ge.guest_id));

    const newRows = guests
      .filter((g) => !existingGuestIds.has(g.id))
      .map((g) => ({
        wedding_id: access.wedding_id,
        event_id: input.event_id,
        guest_id: g.id,
        attendance_status: input.attendance_status,
      }));

    if (newRows.length === 0) {
      return successResponse<BulkCreateResult>({
        created: 0,
        skipped: guests.length,
        total_guests: guests.length,
        event_id: input.event_id,
        already_complete: true,
      });
    }

    // Upsert with ignoreDuplicates as safety net against race conditions
    const { data: inserted, error: insertError } = await supabaseServer
      .from("guest_events")
      .upsert(newRows, { onConflict: "event_id,guest_id", ignoreDuplicates: true })
      .select("id");

    if (insertError) {
      if (insertError.code === "23514") {
        return errorResponse(400, "CONSTRAINT_VIOLATION", "Data violates a database constraint. Check attendance_status value.");
      }
      return internalErrorResponse(insertError, "POST /api/guest-events/bulk — insert");
    }

    const createdCount = inserted?.length ?? 0;

    return successResponse<BulkCreateResult>(
      {
        created: createdCount,
        skipped: guests.length - createdCount,
        total_guests: guests.length,
        event_id: input.event_id,
        already_complete: false,
      },
      201
    );
  } catch (err) {
    return internalErrorResponse(err, "POST /api/guest-events/bulk");
  }
}
