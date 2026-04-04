// =============================================================================
// lib/selectors/dashboard-selectors.ts
// Agregă date din Supabase și construiește TaskEngineContext.
// Folosit de dashboard pentru a alimenta Task Engine.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js"
import type { TaskEngineContext } from "@/lib/task-engine"

/**
 * Agregă toate datele necesare pentru Task Engine într-un singur batch.
 * Toate queries rulează în paralel — un singur round-trip logic.
 */
export async function buildTaskEngineContext(
  supabase: SupabaseClient,
  weddingId: string,
  daysUntilWedding: number
): Promise<TaskEngineContext | null> {
  try {
    const [
      guestsResult,
      rsvpResult,
      tablesResult,
      assignmentsResult,
      budgetResult,
      paymentsResult,
      vendorsResult,
    ] = await Promise.all([
      // Guests total
      supabase
        .from("guests")
        .select("id")
        .eq("wedding_id", weddingId),

      // RSVP — responses + invitations
      supabase
        .from("rsvp_responses")
        .select("status")
        .eq("wedding_id", weddingId),

      // Tables
      supabase
        .from("tables")
        .select("id")
        .eq("wedding_id", weddingId)
        .is("deleted_at", null),

      // Seat assignments — distinct guests
      supabase
        .from("seat_assignments")
        .select("guest_id")
        .eq("wedding_id", weddingId),

      // Budget items
      supabase
        .from("budget_items")
        .select("estimated_amount")
        .eq("wedding_id", weddingId),

      // Payments
      supabase
        .from("payments")
        .select("amount, due_date")
        .eq("wedding_id", weddingId),

      // Vendors
      supabase
        .from("vendors")
        .select("category, status")
        .eq("wedding_id", weddingId),
    ])

    // ── Guests ────────────────────────────────────────────────────────────────
    const guestsTotal = guestsResult.data?.length ?? 0

    // ── RSVP ──────────────────────────────────────────────────────────────────
    const rsvpRows = rsvpResult.data ?? []
    const rsvpAccepted = rsvpRows.filter((r) => r.status === "accepted").length
    const rsvpDeclined = rsvpRows.filter((r) => r.status === "declined").length
    const rsvpMaybe    = rsvpRows.filter((r) => r.status === "maybe").length
    const rsvpSentCount = rsvpAccepted + rsvpDeclined + rsvpMaybe
    const rsvpPending   = guestsTotal - rsvpSentCount

    // ── Tables + Seating ──────────────────────────────────────────────────────
    const tablesTotal = tablesResult.data?.length ?? 0
    const seatedGuests = new Set((assignmentsResult.data ?? []).map((a) => a.guest_id))
    const seatedGuestsTotal = seatedGuests.size
    const guestsUnassigned  = Math.max(0, guestsTotal - seatedGuestsTotal)

    // ── Budget ────────────────────────────────────────────────────────────────
    const budgetTotal = (budgetResult.data ?? []).reduce(
      (sum, item) => sum + (item.estimated_amount ?? 0), 0
    )
    const budgetPaid = (paymentsResult.data ?? []).reduce(
      (sum, p) => sum + (p.amount ?? 0), 0
    )

    // ── Plăți scadente în < 3 zile ────────────────────────────────────────────
    const now = new Date()
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const paymentDueSoonCount = (paymentsResult.data ?? []).filter((p) => {
      if (!p.due_date) return false
      const due = new Date(p.due_date)
      return due >= now && due <= in3Days
    }).length

    // ── Vendors ───────────────────────────────────────────────────────────────
    const vendors = vendorsResult.data ?? []

    const hasLocation = vendors.some(
      (v) => v.category === "location" && v.status === "booked"
    )
    const hasCatering = vendors.some(
      (v) => v.category === "catering" && v.status === "booked"
    )
    const vendorsInProgressCount = vendors.filter(
      (v) => v.status === "contacted" || v.status === "meeting"
    ).length

    return {
      daysUntilWedding,
      guestsTotal,
      guestsUnassigned,
      rsvpPending: Math.max(0, rsvpPending),
      rsvpSentCount,
      hasLocation,
      hasCatering,
      vendorsInProgressCount,
      budgetTotal,
      budgetPaid,
      paymentDueSoonCount,
      tablesTotal,
      seatedGuestsTotal,
    }
  } catch (err) {
    console.error("[DashboardSelectors] buildTaskEngineContext failed:", err)
    return null
  }
}
