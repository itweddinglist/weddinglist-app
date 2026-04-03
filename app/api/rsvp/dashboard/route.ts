// =============================================================================
// app/api/rsvp/dashboard/route.ts
// GET /api/rsvp/dashboard?wedding_id=...
// Returnează stats + lista invitați cu status RSVP
// Autentificat — doar cuplul poate accesa
// Source of truth: rsvp_responses (răspuns) + rsvp_invitations (delivery)
// =============================================================================

import { type NextRequest } from "next/server";
import { extractAuth } from "@/lib/auth";
import { createAuthenticatedClient } from "@/lib/supabase-server";
import { isWeddingMember } from "@/lib/authorization";
import { isValidUuid } from "@/lib/sanitize";
import {
  successResponse,
  authErrorResponse,
  validationErrorResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/api-response";

export async function GET(request: NextRequest): Promise<Response> {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const auth = extractAuth(request);
  if (!auth.authenticated) return authErrorResponse(auth.error.code, auth.error.message);

  const { searchParams } = new URL(request.url);
  const weddingId = searchParams.get("wedding_id");

  if (!isValidUuid(weddingId)) {
    return validationErrorResponse([
      { field: "wedding_id", message: "A valid wedding_id (UUID) is required." },
    ]);
  }

  const supabase = createAuthenticatedClient(auth.context.token);

  // ── Authorization ──────────────────────────────────────────────────────────
  const isMember = await isWeddingMember(supabase, weddingId);
  if (!isMember) return errorResponse(403, "FORBIDDEN", "You are not a member of this wedding.");

  try {
    // ── Fetch guests + guest_events ────────────────────────────────────────
    const { data: guestEvents, error: geError } = await supabase
      .from("guest_events")
      .select(`
        id,
        guest_id,
        event_id,
        guests!inner (
          id,
          display_name,
          first_name,
          last_name
        ),
        events!inner (
          id,
          name
        )
      `)
      .eq("wedding_id", weddingId);

    if (geError) return internalErrorResponse(geError, "GET /api/rsvp/dashboard — guest_events");

    // ── Fetch rsvp_responses ───────────────────────────────────────────────
    const { data: responses, error: respError } = await supabase
      .from("rsvp_responses")
      .select("*")
      .eq("wedding_id", weddingId);

    if (respError) return internalErrorResponse(respError, "GET /api/rsvp/dashboard — responses");

    // ── Fetch rsvp_invitations ────────────────────────────────────────────
    const { data: invitations, error: invError } = await supabase
      .from("rsvp_invitations")
      .select("id, guest_id, delivery_channel, delivery_status, opened_at, last_sent_at, is_active")
      .eq("wedding_id", weddingId)
      .eq("is_active", true);

    if (invError) return internalErrorResponse(invError, "GET /api/rsvp/dashboard — invitations");

    // ── Build maps ────────────────────────────────────────────────────────
    const responseByGuestEventId = new Map(
      (responses ?? []).map((r: any) => [r.guest_event_id, r])
    );

    const invitationByGuestId = new Map(
      (invitations ?? []).map((i: any) => [i.guest_id, i])
    );

    // ── Build guest rows ──────────────────────────────────────────────────
    const guests = (guestEvents ?? []).map((ge: any) => {
      const response = responseByGuestEventId.get(ge.id);
      const invitation = invitationByGuestId.get(ge.guest_id);

      return {
        guest_id: ge.guest_id,
        display_name: ge.guests.display_name,
        first_name: ge.guests.first_name,
        guest_event_id: ge.id,
        event_id: ge.event_id,
        event_name: ge.events.name,
        // Din rsvp_responses
        rsvp_status: response?.status ?? "pending",
        meal_choice: response?.meal_choice ?? null,
        dietary_notes: response?.dietary_notes ?? null,
        responded_at: response?.responded_at ?? null,
        rsvp_source: response?.rsvp_source ?? null,
        // Din rsvp_invitations
        invitation_id: invitation?.id ?? null,
        delivery_channel: invitation?.delivery_channel ?? null,
        delivery_status: invitation?.delivery_status ?? null,
        opened_at: invitation?.opened_at ?? null,
        last_sent_at: invitation?.last_sent_at ?? null,
        is_active: invitation?.is_active ?? null,
      };
    });

    // ── Compute stats ─────────────────────────────────────────────────────
    const total = guests.length;
    const accepted = guests.filter((g) => g.rsvp_status === "accepted").length;
    const declined = guests.filter((g) => g.rsvp_status === "declined").length;
    const maybe = guests.filter((g) => g.rsvp_status === "maybe").length;
    const pending = guests.filter((g) => g.rsvp_status === "pending").length;
    const responded = accepted + declined + maybe;
    const response_rate = total > 0 ? Math.round((responded / total) * 100) : 0;
    const opened_not_answered = guests.filter(
      (g) => g.opened_at && g.rsvp_status === "pending"
    ).length;
    const special_meals = guests.filter(
      (g) => g.meal_choice === "vegetarian"
    ).length;
    const has_allergies = guests.filter(
      (g) => g.dietary_notes && g.dietary_notes.trim().length > 0
    ).length;

    const stats = {
      total,
      accepted,
      declined,
      pending,
      maybe,
      response_rate,
      opened_not_answered,
      special_meals,
      has_allergies,
    };

    return successResponse({ guests, stats });

  } catch (err) {
    return internalErrorResponse(err, "GET /api/rsvp/dashboard");
  }
}