// =============================================================================
// app/api/rsvp/[token]/route.ts
// GET  /api/rsvp/[token] — Validează token, returnează date pentru pagina publică
// POST /api/rsvp/[token] — Submit răspuns RSVP
// Rute PUBLICE — fără auth, fără sesiune
// =============================================================================

import { type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hashToken, validateTokenState } from "@/lib/rsvp/token";
import { validateRsvpSubmission } from "@/lib/rsvp/validate-rsvp-submission";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/api-response";
import type { RsvpPageData } from "@/types/rsvp";

type RouteContext = { params: Promise<{ token: string }> };

// Client Supabase cu anon key — RLS protejează datele
// Politica publică permite citire doar pe token_hash valid
function getPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ─── GET /api/rsvp/[token] ────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const { token: rawToken } = await context.params;

  if (!rawToken || rawToken.length < 10) {
    return errorResponse(400, "INVALID_TOKEN", "Token invalid.");
  }

  const tokenHash = hashToken(rawToken);
  const supabase = getPublicClient();

  try {
    // ── Lookup invitație după token_hash ───────────────────────────────────
    const { data: invitation, error: invError } = await supabase
      .from("rsvp_invitations")
      .select(`
        id, wedding_id, guest_id, is_active,
        expires_at, responded_at, opened_at
      `)
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (invError) return internalErrorResponse(invError, "GET /api/rsvp/[token]");

    if (!invitation) {
      return errorResponse(404, "TOKEN_NOT_FOUND", "Linkul de invitație nu este valid.");
    }

    // ── Validare stare token ───────────────────────────────────────────────
    const tokenState = validateTokenState({
      is_active: invitation.is_active,
      responded_at: invitation.responded_at,
      expires_at: invitation.expires_at,
    });

    if (!tokenState.valid) {
      const code = tokenState.reason === "expired" ? "TOKEN_EXPIRED" : "TOKEN_INACTIVE";
      const message = tokenState.reason === "expired"
        ? "Linkul de invitație a expirat."
        : "Linkul de invitație nu mai este activ.";
      return errorResponse(410, code, message);
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
      return errorResponse(404, "GUEST_NOT_FOUND", "Invitatul nu a fost găsit.");
    }

    // ── Fetch guest_events (evenimentele la care e invitat) ────────────────
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

    if (eventsError) return internalErrorResponse(eventsError, "GET /api/rsvp/[token] events");

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
    return internalErrorResponse(err, "GET /api/rsvp/[token]");
  }
}

// ─── POST /api/rsvp/[token] ───────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const { token: rawToken } = await context.params;

  if (!rawToken || rawToken.length < 10) {
    return errorResponse(400, "INVALID_TOKEN", "Token invalid.");
  }

  const tokenHash = hashToken(rawToken);
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
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (invError) return internalErrorResponse(invError, "POST /api/rsvp/[token]");

    if (!invitation) {
      return errorResponse(404, "TOKEN_NOT_FOUND", "Linkul de invitație nu este valid.");
    }

    // ── Validare stare token ───────────────────────────────────────────────
    const tokenState = validateTokenState({
      is_active: invitation.is_active,
      responded_at: invitation.responded_at,
      expires_at: invitation.expires_at,
    });

    if (!tokenState.valid) {
      const code = tokenState.reason === "expired" ? "TOKEN_EXPIRED" : "TOKEN_INACTIVE";
      const message = tokenState.reason === "expired"
        ? "Linkul de invitație a expirat."
        : "Linkul de invitație nu mai este activ.";
      return errorResponse(410, code, message);
    }

    // ── Verifică că guest_event_id aparține acestui guest ─────────────────
    const { data: validEvents, error: eventsError } = await supabase
      .from("guest_events")
      .select("id")
      .eq("guest_id", invitation.guest_id)
      .eq("wedding_id", invitation.wedding_id);

    if (eventsError) return internalErrorResponse(eventsError, "POST /api/rsvp/[token] events");

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
        ? r.guest_event_id // placeholder — vom face join
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
      return internalErrorResponse(upsertError, "POST /api/rsvp/[token] upsert");
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
    return internalErrorResponse(err, "POST /api/rsvp/[token]");
  }
}