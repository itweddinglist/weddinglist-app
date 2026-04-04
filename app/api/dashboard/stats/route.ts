// app/api/dashboard/stats/route.ts
// GET /api/dashboard/stats
// Dashboard is active-wedding-only — no wedding_id from client.
// Auth via Server App Context Layer (WP bootstrap, no JWT).

import { type NextRequest } from "next/server"
import { supabaseServer } from "@/app/lib/supabase/server"
import { getServerAppContext } from "@/lib/server-context/get-server-app-context"
import { requireAuthenticatedContext } from "@/lib/server-context/require-authenticated"
import { requireWeddingAccess } from "@/lib/server-context/require-wedding-access"
import {
  successResponse,
  internalErrorResponse,
} from "@/lib/api-response"
import type { DashboardStats } from "@/types/dashboard"

export async function GET(request: NextRequest): Promise<Response> {
  const ctx = await getServerAppContext(request)

  const authResult = requireAuthenticatedContext(ctx)
  if (!authResult.ok) return authResult.response

  // Dashboard uses the session's active wedding — no requestedWeddingId from client
  const accessResult = await requireWeddingAccess({ ctx: authResult.ctx })
  if (!accessResult.ok) return accessResult.response

  const { wedding_id: weddingId } = accessResult

  try {
    const [
      weddingResult,
      guestsResult,
      rsvpResult,
      tablesResult,
      seatsResult,
      assignmentsResult,
      budgetItemsResult,
      paymentsResult,
    ] = await Promise.all([
      supabaseServer.from("weddings").select("id, title, event_date").eq("id", weddingId).single(),
      supabaseServer.from("guests").select("id").eq("wedding_id", weddingId),
      supabaseServer.from("rsvp_responses").select("status").eq("wedding_id", weddingId),
      supabaseServer.from("tables").select("id").eq("wedding_id", weddingId),
      supabaseServer.from("seats").select("id").eq("wedding_id", weddingId),
      supabaseServer.from("seat_assignments").select("guest_id").eq("wedding_id", weddingId),
      supabaseServer.from("budget_items").select("estimated_amount").eq("wedding_id", weddingId),
      supabaseServer.from("payments").select("amount").eq("wedding_id", weddingId),
    ])

    if (weddingResult.error)
      return internalErrorResponse(weddingResult.error, "GET /api/dashboard/stats — wedding")
    if (guestsResult.error)
      return internalErrorResponse(guestsResult.error, "GET /api/dashboard/stats — guests")
    if (rsvpResult.error)
      return internalErrorResponse(rsvpResult.error, "GET /api/dashboard/stats — rsvp")
    if (tablesResult.error)
      return internalErrorResponse(tablesResult.error, "GET /api/dashboard/stats — tables")
    if (seatsResult.error)
      return internalErrorResponse(seatsResult.error, "GET /api/dashboard/stats — seats")
    if (assignmentsResult.error)
      return internalErrorResponse(assignmentsResult.error, "GET /api/dashboard/stats — assignments")
    if (budgetItemsResult.error)
      return internalErrorResponse(budgetItemsResult.error, "GET /api/dashboard/stats — budget_items")
    if (paymentsResult.error)
      return internalErrorResponse(paymentsResult.error, "GET /api/dashboard/stats — payments")

    const guests_total = guestsResult.data?.length ?? 0
    const rsvpRows = rsvpResult.data ?? []
    const rsvp_accepted = rsvpRows.filter((r) => r.status === "accepted").length
    const rsvp_declined = rsvpRows.filter((r) => r.status === "declined").length
    const rsvp_maybe    = rsvpRows.filter((r) => r.status === "maybe").length
    const rsvp_pending  = guests_total - (rsvp_accepted + rsvp_declined + rsvp_maybe)
    const response_rate =
      guests_total === 0
        ? 0
        : Math.round(((rsvp_accepted + rsvp_declined + rsvp_maybe) / guests_total) * 100)

    const tables_total = tablesResult.data?.length ?? 0
    const seats_total  = seatsResult.data?.length ?? 0
    const uniqueSeatedGuests = new Set((assignmentsResult.data ?? []).map((a) => a.guest_id))
    const seated_guests_total = uniqueSeatedGuests.size

    const budget_total = (budgetItemsResult.data ?? []).reduce(
      (sum, item) => sum + (item.estimated_amount ?? 0), 0
    )
    const budget_paid = (paymentsResult.data ?? []).reduce(
      (sum, p) => sum + (p.amount ?? 0), 0
    )
    const budget_remaining = Math.max(0, budget_total - budget_paid)

    const payload: DashboardStats = {
      wedding: {
        id: weddingResult.data.id,
        title: weddingResult.data.title ?? "",
        event_date: weddingResult.data.event_date ?? null,
      },
      stats: {
        guests_total,
        rsvp_accepted,
        rsvp_declined,
        rsvp_maybe,
        rsvp_pending,
        response_rate,
        tables_total,
        seats_total,
        seated_guests_total,
        budget_total,
        budget_paid,
        budget_remaining,
      },
    }

    return successResponse(payload)
  } catch (err) {
    return internalErrorResponse(err, "GET /api/dashboard/stats")
  }
}
