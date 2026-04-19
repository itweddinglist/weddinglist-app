// =============================================================================
// app/api/rsvp/dashboard/route.ts
// GET /api/rsvp/dashboard
// Returnează stats + lista invitați cu status RSVP
// Autentificat — doar cuplul poate accesa
// Source of truth: rsvp_responses (răspuns) + rsvp_invitations (delivery)
// =============================================================================

import { type NextRequest } from "next/server";
import {
  getServerAppContext,
  requireAuthenticatedContext,
  requireWeddingAccess,
} from "@/lib/server-context";
import { supabaseServer } from "@/app/lib/supabase/server";
import {
  successResponse,
  internalErrorResponse,
} from "@/lib/api-response";
import type {
  RsvpResponseRow,
  RsvpInvitationRow,
  RsvpDashboardGuest,
} from "@/types/rsvp";

// Projection locală — reflectă exact câmpurile selectate în query-ul rsvp_invitations.
type InvitationProjection = Pick<
  RsvpInvitationRow,
  | "id"
  | "guest_id"
  | "delivery_channel"
  | "delivery_status"
  | "opened_at"
  | "last_sent_at"
  | "is_active"
  | "public_link_id"
>;

// Shape-ul rândurilor returnate de query-ul guest_events cu join-uri !inner.
// Supabase returnează obiecte (nu array) pentru relații one-to-one prin FK direct.
interface GuestEventJoinRow {
  id: string;
  guest_id: string;
  event_id: string;
  guests: {
    id: string;
    display_name: string;
    first_name: string;
    last_name: string | null;
  };
  events: {
    id: string;
    name: string;
  };
}

export async function GET(request: NextRequest): Promise<Response> {
  const ctx = await getServerAppContext(request);
  const authResult = requireAuthenticatedContext(ctx);
  if (!authResult.ok) return authResult.response;

  const access = await requireWeddingAccess({ ctx: authResult.ctx, minRole: "viewer" });
  if (!access.ok) return access.response;

  const weddingId = access.wedding_id;

  try {
    // ── Fetch guests + guest_events ────────────────────────────────────────
    const { data: guestEventsRaw, error: geError } = await supabaseServer
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

    // Supabase JS client fără Database generic type inferă relațiile !inner
    // ca array {...}[] — heuristică greșită pentru FK direct 1-to-1.
    // Runtime garantat obiect (evidence: app/api/export/pdf/route.ts,
    // app/api/rsvp/[public_link_id]/route.ts consumă .display_name/.name
    // direct, rulează în prod).
    //
    // Double cast via `unknown` necesar: TS2352 blochează cast direct între
    // guests: {...}[] (inferred) și guests: {...} (real) — "neither type
    // sufficiently overlaps". `unknown` e bridge-ul canonic pentru
    // conversie între tipuri fără intersecție, dar cu realitate runtime
    // cunoscută.
    //
    // TODO(post-launch): elimină cast-ul după generarea types Supabase
    // cu `supabase gen types typescript` → types/supabase.ts. Task de
    // roadmap separat, nu în H3/Hardening Week.
    const guestEvents = guestEventsRaw as unknown as GuestEventJoinRow[] | null;

    // ── Fetch rsvp_responses ───────────────────────────────────────────────
    const { data: responses, error: respError } = await supabaseServer
      .from("rsvp_responses")
      .select("*")
      .eq("wedding_id", weddingId);

    if (respError) return internalErrorResponse(respError, "GET /api/rsvp/dashboard — responses");

    // ── Fetch rsvp_invitations ────────────────────────────────────────────
    const { data: invitations, error: invError } = await supabaseServer
      .from("rsvp_invitations")
      .select("id, guest_id, delivery_channel, delivery_status, opened_at, last_sent_at, is_active, public_link_id")
      .eq("wedding_id", weddingId)
      .eq("is_active", true);

    if (invError) return internalErrorResponse(invError, "GET /api/rsvp/dashboard — invitations");

    // ── Build maps ────────────────────────────────────────────────────────
    const responseByGuestEventId = new Map(
      (responses ?? []).map((r: RsvpResponseRow) => [r.guest_event_id, r])
    );

    const invitationByGuestId = new Map(
      (invitations ?? []).map((i: InvitationProjection) => [i.guest_id, i])
    );

    // ── Build guest rows ──────────────────────────────────────────────────
    const guests: RsvpDashboardGuest[] = (guestEvents ?? []).map((ge: GuestEventJoinRow): RsvpDashboardGuest => {
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
        public_link_id: invitation?.public_link_id ?? null,
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
