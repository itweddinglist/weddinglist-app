// =============================================================================
// app/api/rsvp/invitations/route.ts
// POST /api/rsvp/invitations — Creează token RSVP pentru un invitat
// Autentificat — doar cuplul poate crea invitații
// =============================================================================

import { type NextRequest } from "next/server";
import {
  getServerAppContext,
  requireAuthenticatedContext,
  requireWeddingAccess,
} from "@/lib/server-context";
import { supabaseServer } from "@/app/lib/supabase/server";
import { isValidUuid } from "@/lib/sanitize";
import { generateRsvpToken, getTokenExpiresAt } from "@/lib/rsvp/token";
import { sendRsvpInvitationEmail } from "@/lib/rsvp/send-invitation-email";
import {
  successResponse,
  validationErrorResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/api-response";

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

  if (!body || typeof body !== "object") {
    return errorResponse(400, "INVALID_BODY", "Request body must be a JSON object.");
  }

  const input = body as Record<string, unknown>;

  // ── Validare input ─────────────────────────────────────────────────────────
  if (!isValidUuid(input.guest_id)) {
    return validationErrorResponse([
      { field: "guest_id", message: "A valid guest_id (UUID) is required." },
    ]);
  }

  const guestId = input.guest_id as string;
  const deliveryChannel = input.delivery_channel as string | undefined;

  const access = await requireWeddingAccess({ ctx: authResult.ctx });
  if (!access.ok) return access.response;

  const weddingId = access.wedding_id;

  try {
    // ── Verifică că guest aparține wedding-ului ────────────────────────────
    const { data: guest, error: guestError } = await supabaseServer
      .from("guests")
      .select("id, first_name, last_name, display_name")
      .eq("id", guestId)
      .eq("wedding_id", weddingId)
      .maybeSingle();

    if (guestError || !guest) {
      return errorResponse(404, "GUEST_NOT_FOUND", "Guest not found in this wedding.");
    }

    // ── Dezactivează invitațiile active existente pentru acest guest ────────
    const { error: deactivateError } = await supabaseServer
      .from("rsvp_invitations")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("guest_id", guestId)
      .eq("wedding_id", weddingId)
      .eq("is_active", true);

    if (deactivateError) {
      return internalErrorResponse(deactivateError, "POST /api/rsvp/invitations — deactivate");
    }

    // ── Generează token nou ────────────────────────────────────────────────
    const { raw, hash } = generateRsvpToken();
    const expiresAt = getTokenExpiresAt();

    // ── Fetch wedding pentru email ─────────────────────────────────────────
    const { data: wedding } = await supabaseServer
      .from("weddings")
      .select("title, event_date")
      .eq("id", weddingId)
      .single();

    // ── Inserează invitația ────────────────────────────────────────────────
    const { data: invitation, error: insertError } = await supabaseServer
      .from("rsvp_invitations")
      .insert({
        wedding_id: weddingId,
        guest_id: guestId,
        token_hash: hash,
        delivery_channel: deliveryChannel ?? null,
        delivery_status: "ready",
        is_active: true,
        expires_at: expiresAt.toISOString(),
        last_sent_at: null,
      })
      .select()
      .single();

    if (insertError) {
      return internalErrorResponse(insertError, "POST /api/rsvp/invitations — insert");
    }

    // ── Trimite email (stub dacă RESEND_API_KEY lipsește) ─────────────────
    const emailResult = await sendRsvpInvitationEmail({
      to: "", // TODO: adaugă email pe guests când implementăm câmpul
      guestName: guest.display_name,
      coupleNames: wedding?.title ?? "Cuplu",
      weddingDate: wedding?.event_date ?? null,
      rsvpToken: raw,
    });

    return successResponse({
      invitation_id: invitation.id,
      token: raw, // tokenul raw — pentru link manual / QR
      expires_at: expiresAt.toISOString(),
      email_sent: emailResult.sent,
    }, 201);

  } catch (err) {
    return internalErrorResponse(err, "POST /api/rsvp/invitations");
  }
}
