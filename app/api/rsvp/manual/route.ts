// =============================================================================
// app/api/rsvp/manual/route.ts
// POST /api/rsvp/manual — Manual override status RSVP de către cuplu
// Autentificat — doar cuplul poate face override
// Scrie în rsvp_responses cu rsvp_source = 'couple_manual'
// =============================================================================

import { type NextRequest } from "next/server";
import { extractAuth } from "@/lib/auth";
import { createAuthenticatedClient } from "@/lib/supabase-server";
import { isValidUuid } from "@/lib/sanitize";
import {
  successResponse,
  authErrorResponse,
  validationErrorResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/api-response";

const VALID_STATUSES = ["accepted", "declined", "maybe"] as const;

export async function POST(request: NextRequest): Promise<Response> {
  const auth = extractAuth(request);
  if (!auth.authenticated) return authErrorResponse(auth.error.code, auth.error.message);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const input = body as Record<string, unknown>;

  if (!isValidUuid(input.guest_event_id)) {
    return validationErrorResponse([
      { field: "guest_event_id", message: "A valid guest_event_id (UUID) is required." },
    ]);
  }

  if (!input.status || !VALID_STATUSES.includes(input.status as any)) {
    return validationErrorResponse([
      { field: "status", message: "Status must be: accepted, declined, or maybe." },
    ]);
  }

  const guestEventId = input.guest_event_id as string;
  const status = input.status as typeof VALID_STATUSES[number];

  const supabase = createAuthenticatedClient(auth.context.token);

  try {
    // Verifică că guest_event aparține unui wedding unde userul e membru
    const { data: ge, error: geError } = await supabase
      .from("guest_events")
      .select("id, wedding_id, event_id, guest_id")
      .eq("id", guestEventId)
      .maybeSingle();

    if (geError) return internalErrorResponse(geError, "POST /api/rsvp/manual — lookup");
    if (!ge) return errorResponse(404, "NOT_FOUND", "Guest event not found.");

    // Upsert în rsvp_responses
    const { error: upsertError } = await supabase
      .from("rsvp_responses")
      .upsert({
        wedding_id: ge.wedding_id,
        event_id: ge.event_id,
        invitation_id: null,
        guest_event_id: guestEventId,
        status,
        rsvp_source: "couple_manual",
        responded_at: new Date().toISOString(),
      }, { onConflict: "guest_event_id" });

    if (upsertError) return internalErrorResponse(upsertError, "POST /api/rsvp/manual — upsert");

    return successResponse({ success: true, guest_event_id: guestEventId, status });

  } catch (err) {
    return internalErrorResponse(err, "POST /api/rsvp/manual");
  }
}