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
    const now = new Date().toISOString();

    const { error } = await supabaseServer
      .from("rsvp_invitations")
      .update({
        delivery_channel: deliveryChannel ?? null,
        delivery_status: "sent",
        last_sent_at: now,
        updated_at: now,
      })
      .eq("id", id);

    if (error) return internalErrorResponse(error, "PATCH /api/rsvp/invitations/[id]/mark-sent");

    return successResponse({ success: true, invitation_id: id });

  } catch (err) {
    return internalErrorResponse(err, "PATCH /api/rsvp/invitations/[id]/mark-sent");
  }
}
