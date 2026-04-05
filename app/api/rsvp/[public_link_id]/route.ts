// =============================================================================
// app/api/rsvp/[public_link_id]/route.ts
// GET  /api/rsvp/[public_link_id] — Validează invitația, returnează date publice
// POST /api/rsvp/[public_link_id] — Submit răspuns RSVP
// Rute PUBLICE — fără auth, fără sesiune
// Lookup după public_link_id (stabil, opaque) nu după token_hash.
// =============================================================================

import { type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateTokenState } from "@/lib/rsvp/token";
import { validateRsvpSubmission } from "@/lib/rsvp/validate-rsvp-submission";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/api-response";
import type { RsvpPageData } from "@/types/rsvp";

type RouteContext = { params: Promise<{ public_link_id: string }> };

// Mesaj generic expus utilizatorilor — nu dezvăluie cauza reală
const GENERIC_404_MSG = "Acest link de invitație nu este valid sau a expirat.";

// Client Supabase cu anon key — RLS protejează datele
function getPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Log intern structurat — fără PII, fără token raw
function logInternal(event: string, extra: Record<string, unknown>) {
  console.warn(JSON.stringify({ event, ...extra, timestamp: new Date().toISOString() }));
}

// ─── GET /api/rsvp/[public_link_id] ──────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const { public_link_id: publicLinkId } = await context.params;
  const route = `/api/rsvp/${publicLinkId}`;

  if (!publicLinkId || publicLinkId.length < 8) {
    logInternal("RSVP_LINK_INVALID", { reason: "param_too_short", route });
    return errorResponse(404, "NOT_FOUND", GENERIC_404_MSG);
  }

  const supabase = getPublicClient();

  try {
    const { data: invitation, error: invError } = await supabase
      .from("rsvp_invitations")
      .select(`
        id, wedding_id, guest_id, is_active,
        expires_at, responded_at, opened_at
      `)
      .eq("public_link_id", publicLinkId)
      .maybeSingle();

    if (invError) return internalErrorResponse(invError, `GET ${route}`);

    if (!invitation) {
      logInternal("RSVP_LINK_INVALID", { reason: "not_found", route });
      return errorResponse(404, "NOT_FOUND", GENERIC_404_MSG);
    }

    const tokenState = validateTokenState({
      is_active: invitation.is_active,
      responded_at: invitation.responded_at,
      expires_at: invitation.expires_at,
    });

    if (!tokenState.valid) {
      logInternal("RSVP_LINK_INVALID", { reason: tokenState.reason, route });
      return errorResponse(404, "NOT_FOUND", GENERIC_404_MSG);
    }

    // Marchează opened_at la primul acces
    if (!invitation.opened_at) {
      await supabase
        .from("rsvp_invitations")
        .update({ opened_at: new Date().toISOString() })
        .eq("id", invitation.id);
    }

    const { data: guest, error: guestError } = await supabase
      .from("guests")
      .select("id, first_name, last_name, display_name")
      .eq("id", invitation.guest_id)
      .single();

    if (guestError || !guest) {
      logInternal("RSVP_LINK_INVALID", { reason: "guest_not_found", route });
      return errorResponse(404, "NOT_FOUND", GENERIC_404_MSG);
    }

    const { data: guestEvents, error: eventsError } = await supabase
      .from("guest_events")
      .select(`
        id,
        event_id,
        events!inner (
          id, name, event_type, starts_at
        )
      `)
      .eq("guest_id", invitation.guest_id)
      .eq("wedding_id", invitation.wedding_id);

    if (eventsError) return internalErrorResponse(eventsError, `GET ${route} events`);

    const { data: existingResponses } = await supabase
      .from("rsvp_responses")
      .select("*")
      .eq("invitation_id", invitation.id);

    const events = (guestEvents ?? []).map((ge: any) => {
      const existing = (existingResponses ?? []).find(
        (r: any) => r.guest_event_id === ge.id
      );
      return {
        guest_event_id: ge.id,
        event_id: ge.event_id,
        event_name: ge.events.name,
        event_date: ge.events.starts_at,
        event_type: ge.events.event_type,
        current_response: existing ?? null,
      };
    });

    const pageData: RsvpPageData = {
      invitation: {
        id: invitation.id,
        guest_id: invitation.guest_id,
        is_active: invitation.is_active,
        expires_at: invitation.expires_at,
      },
      guest: {
        id: guest.id,
        display_name: guest.display_name,
        first_name: guest.first_name,
      },
      events,
      existing_responses: existingResponses ?? [],
    };

    return successResponse(pageData);

  } catch (err) {
    return internalErrorResponse(err, `GET ${route}`);
  }
}

// ─── POST /api/rsvp/[public_link_id] ─────────────────────────────────────────

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const { public_link_id: publicLinkId } = await context.params;
  const route = `/api/rsvp/${publicLinkId}`;

  if (!publicLinkId || publicLinkId.length < 8) {
    logInternal("RSVP_LINK_INVALID", { reason: "param_too_short", route });
    return errorResponse(404, "NOT_FOUND", GENERIC_404_MSG);
  }

  const supabase = getPublicClient();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  // ── Honey pot check ────────────────────────────────────────────────────────
  // Câmpul _rsvp_confirm_extra_ trebuie să fie gol pentru utilizatori reali.
  // Boții care completează automat toate câmpurile vor popula acest câmp.
  const bodyObj = body as Record<string, unknown>;
  if (bodyObj._rsvp_confirm_extra_) {
    logInternal("HONEYPOT_HIT", { route });
    // Fake success — nu revelăm botului că a fost detectat
    return successResponse({ success: true, responses_saved: 0, invitation_id: null });
  }

  // ── Validare input ─────────────────────────────────────────────────────────
  const validation = validateRsvpSubmission(body);
  if (!validation.valid) return validationErrorResponse(validation.errors);
  const { responses } = validation.data;

  try {
    const { data: invitation, error: invError } = await supabase
      .from("rsvp_invitations")
      .select("id, wedding_id, guest_id, is_active, expires_at, responded_at")
      .eq("public_link_id", publicLinkId)
      .maybeSingle();

    if (invError) return internalErrorResponse(invError, `POST ${route}`);

    if (!invitation) {
      logInternal("RSVP_LINK_INVALID", { reason: "not_found", route });
      return errorResponse(404, "NOT_FOUND", GENERIC_404_MSG);
    }

    const tokenState = validateTokenState({
      is_active: invitation.is_active,
      responded_at: invitation.responded_at,
      expires_at: invitation.expires_at,
    });

    if (!tokenState.valid) {
      logInternal("RSVP_LINK_INVALID", { reason: tokenState.reason, route });
      return errorResponse(404, "NOT_FOUND", GENERIC_404_MSG);
    }

    const { data: validEvents, error: eventsError } = await supabase
      .from("guest_events")
      .select("id")
      .eq("guest_id", invitation.guest_id)
      .eq("wedding_id", invitation.wedding_id);

    if (eventsError) return internalErrorResponse(eventsError, `POST ${route} events`);

    const validEventIds = new Set((validEvents ?? []).map((e: any) => e.id));

    for (const r of responses) {
      if (!validEventIds.has(r.guest_event_id)) {
        return errorResponse(
          403,
          "UNAUTHORIZED_GUEST_EVENT",
          "Nu ai permisiunea să răspunzi pentru acest eveniment."
        );
      }
    }

    const now = new Date().toISOString();
    const upsertData = responses.map((r) => ({
      wedding_id: invitation.wedding_id,
      event_id: validEvents?.find((e: any) => e.id === r.guest_event_id)
        ? r.guest_event_id
        : r.guest_event_id,
      invitation_id: invitation.id,
      guest_event_id: r.guest_event_id,
      status: r.status,
      meal_choice: r.meal_choice ?? null,
      dietary_notes: r.dietary_notes ?? null,
      note: r.note ?? null,
      rsvp_source: "guest_link" as const,
      responded_at: now,
    }));

    const { error: upsertError } = await supabase
      .from("rsvp_responses")
      .upsert(upsertData, { onConflict: "guest_event_id" });

    if (upsertError) {
      return internalErrorResponse(upsertError, `POST ${route} upsert`);
    }

    await supabase
      .from("rsvp_invitations")
      .update({ responded_at: now, updated_at: now })
      .eq("id", invitation.id);

    return successResponse({
      success: true,
      responses_saved: responses.length,
      invitation_id: invitation.id,
    });

  } catch (err) {
    return internalErrorResponse(err, `POST ${route}`);
  }
}
