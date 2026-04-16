// =============================================================================
// app/api/rsvp/invitations/[id]/mark-sent/route.ts
// PATCH /api/rsvp/invitations/[id]/mark-sent
// Marchează invitația ca trimisă pe un canal specific
// Fire and forget — nu e truth de livrare, ci semnal de inițiere
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
  errorResponse,
  internalErrorResponse,
} from "@/lib/api-response";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_CHANNELS = ["whatsapp", "email", "sms", "facebook", "qr", "link", "manual"] as const;

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const ctx = await getServerAppContext(request);
  const authResult = requireAuthenticatedContext(ctx);
  if (!authResult.ok) return authResult.response;

  const access = await requireWeddingAccess({ ctx: authResult.ctx, minRole: "editor" });
  if (!access.ok) return access.response;

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const input = body as Record<string, unknown>;
  const deliveryChannel = input.delivery_channel as string | undefined;

  if (deliveryChannel && !VALID_CHANNELS.includes(deliveryChannel as any)) {
    return errorResponse(400, "INVALID_CHANNEL", "Invalid delivery channel.");
  }

  try {
    // 1. Verificăm că invitația există și aparține nunții autentificate
    const { data: existing, error: fetchError } = await supabaseServer
      .from("rsvp_invitations")
      .select("id, wedding_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) return internalErrorResponse(fetchError, "PATCH /api/rsvp/invitations/[id]/mark-sent fetch");

    // 404 generic — nu revelăm dacă invitația există sau aparține altcuiva
    if (!existing || existing.wedding_id !== access.wedding_id) {
      return errorResponse(404, "NOT_FOUND", "Invitation not found.");
    }

    // 2. Update cu select pentru a confirma că rândul a fost afectat
    const now = new Date().toISOString();

    const { data: updated, error: updateError } = await supabaseServer
      .from("rsvp_invitations")
      .update({
        delivery_channel: deliveryChannel ?? null,
        delivery_status: "sent",
        last_sent_at: now,
        updated_at: now,
      })
      .eq("id", id)
      .eq("wedding_id", access.wedding_id)
      .select("id");

    if (updateError) return internalErrorResponse(updateError, "PATCH /api/rsvp/invitations/[id]/mark-sent update");

    // Race condition: rândul a fost șters între SELECT și UPDATE
    if (!updated || updated.length === 0) {
      return errorResponse(404, "NOT_FOUND", "Invitation not found.");
    }

    return successResponse({ success: true, invitation_id: id });

  } catch (err) {
    return internalErrorResponse(err, "PATCH /api/rsvp/invitations/[id]/mark-sent");
  }
}
