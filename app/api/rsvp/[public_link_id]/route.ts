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

// Client Supabase cu anon key — RLS protejează datele
function getPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ─── GET /api/rsvp/[public_link_id] ──────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const { public_link_id: publicLinkId } = await context.params;

  if (!publicLinkId || publicLinkId.length < 8) {
    return errorResponse(404, "NOT_FOUND", "Linkul de invitație nu este valid.");
  }

  const supabase = getPublicClient();

  try {
    // ── Lookup invitație după public_link_id ───────────────────────────────
    const { data: invitation, error: invError } = await supabase
      .from("rsvp_invitations")
      .select(`
        id, wedding_id, guest_id, is_active,
        expires_at, responded_at, opened_at
      `)
      .eq("public_link_id", publicLinkId)
      .maybeSingle();

    if (invError) return internalErrorResponse(invError, "GET /api/rsvp/[public_link_id]");

    // 404 generic — fără detalii despre motivul invalidității
    if (!invitation) {
      return errorResponse(404, "NOT_FOUND", "Linkul de invitație nu este valid.");
    }

    // ── Validare stare invitație ───────────────────────────────────────────
    const tokenState = validateTokenState({
      is_active: invitation.is_active,
      responded_at: invitation.responded_at,
      expires_at: invitation.expires_at,
    });

    if (!tokenState.valid) {
      return errorResponse(404, "NOT_FOUND", "Linkul de invitație nu este valid.");
    }

    // ── Marchează opened_at dacă e primul acces ────────────────────────────
    if (!invitation.opened_at) {
      await supabase
        .from("rsvp_invitations")
        .update({ opened_at: new Date().toISOString() })
        .eq("id", invitation.id);
    }

    // ── Fetch guest ────────────────────────────────────────────────────────
    const { data: guest, error: guestError } = await supabase
      .from("guests")
      .select("id, first_name, last_name, display_name")
      .eq("id", invitation.guest_id)
      .single();

    if (guestError || !guest) {
      return errorResponse(404, "NOT_FOUND", "Linkul de invitație nu este valid.");
    }

    // ── Fetch guest_events ─────────────────────────────────────────────────
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

    if (eventsError) return internalErrorResponse(eventsError, "GET /api/rsvp/[public_link_id] events");

    // ── Fetch răspunsuri existente ─────────────────────────────────────────
    const { data: existingResponses } = await supabase
      .from("rsvp_responses")
      .select("*")
      .eq("invitation_id", invitation.id);

    // ── Build response ─────────────────────────────────────────────────────
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
    return internalErrorResponse(err, "GET /api/rsvp/[public_link_id]");
  }
}

// ─── POST /api/rsvp/[public_link_id] ─────────────────────────────────────────

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const { public_link_id: publicLinkId } = await context.params;

  if (!publicLinkId || publicLinkId.length < 8) {
    return errorResponse(404, "NOT_FOUND", "Linkul de invitație nu este valid.");
  }

  const supabase = getPublicClient();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  // ── Validare input ─────────────────────────────────────────────────────────
  const validation = validateRsvpSubmission(body);
  if (!validation.valid) return validationErrorResponse(validation.errors);
  const { responses } = validation.data;

  try {
    // ── Lookup invitație ───────────────────────────────────────────────────
    const { data: invitation, error: invError } = await supabase
      .from("rsvp_invitations")
      .select("id, wedding_id, guest_id, is_active, expires_at, responded_at")
      .eq("public_link_id", publicLinkId)
      .maybeSingle();

    if (invError) return internalErrorResponse(invError, "POST /api/rsvp/[public_link_id]");

    if (!invitation) {
      return errorResponse(404, "NOT_FOUND", "Linkul de invitație nu este valid.");
    }

    // ── Validare stare invitație ───────────────────────────────────────────
    const tokenState = validateTokenState({
      is_active: invitation.is_active,
      responded_at: invitation.responded_at,
      expires_at: invitation.expires_at,
    });

    if (!tokenState.valid) {
      return errorResponse(404, "NOT_FOUND", "Linkul de invitație nu este valid.");
    }

    // ── Verifică că guest_event_id aparține acestui guest ─────────────────
    const { data: validEvents, error: eventsError } = await supabase
      .from("guest_events")
      .select("id")
      .eq("guest_id", invitation.guest_id)
      .eq("wedding_id", invitation.wedding_id);

    if (eventsError) return internalErrorResponse(eventsError, "POST /api/rsvp/[public_link_id] events");

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

    // ── Upsert răspunsuri ──────────────────────────────────────────────────
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
      return internalErrorResponse(upsertError, "POST /api/rsvp/[public_link_id] upsert");
    }

    // ── Marchează invitația ca responded ──────────────────────────────────
    await supabase
      .from("rsvp_invitations")
      .update({
        responded_at: now,
        updated_at: now,
      })
      .eq("id", invitation.id);

    return successResponse({
      success: true,
      responses_saved: responses.length,
      invitation_id: invitation.id,
    });

  } catch (err) {
    return internalErrorResponse(err, "POST /api/rsvp/[public_link_id]");
  }
}
