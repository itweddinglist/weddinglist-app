// app/api/dashboard/stats/route.ts
// GET /api/dashboard/stats?wedding_id=<uuid>

import { type NextRequest } from "next/server"
import { extractAuth } from "@/lib/auth"
import { createAuthenticatedClient } from "@/lib/supabase-server"
import { isWeddingMember } from "@/lib/authorization"
import { isValidUuid } from "@/lib/sanitize"
import {
  successResponse,
  authErrorResponse,
  validationErrorResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/api-response"
import type { DashboardStats } from "@/types/dashboard"

export async function GET(request: NextRequest): Promise<Response> {
  const auth = extractAuth(request)
  if (!auth.authenticated)
    return authErrorResponse(auth.error.code, auth.error.message)

  const { searchParams } = new URL(request.url)
  const weddingId = searchParams.get("wedding_id")

  if (!isValidUuid(weddingId)) {
    return validationErrorResponse([
      { field: "wedding_id", message: "A valid wedding_id (UUID) is required." },
    ])
  }

  const supabase = createAuthenticatedClient(auth.context.token)

  const isMember = await isWeddingMember(supabase, weddingId)
  if (!isMember)
    return errorResponse(403, "FORBIDDEN", "You are not a member of this wedding.")

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
      supabase.from("weddings").select("id, title, event_date").eq("id", weddingId).single(),
      supabase.from("guests").select("id").eq("wedding_id", weddingId),
      supabase.from("rsvp_responses").select("status").eq("wedding_id", weddingId),
      supabase.from("tables").select("id").eq("wedding_id", weddingId),
      supabase.from("seats").select("id").eq("wedding_id", weddingId),
      supabase.from("seat_assignments").select("guest_id").eq("wedding_id", weddingId),
      supabase.from("budget_items").select("estimated_amount").eq("wedding_id", weddingId),
      supabase.from("payments").select("amount").eq("wedding_id", weddingId),
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


