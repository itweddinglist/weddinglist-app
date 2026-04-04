// =============================================================================
// lib/authorization.ts
// Wedding membership checks for API route authorization.
//
// Two levels of protection:
// 1. This check: explicit membership verification BEFORE the query.
//    Catches unauthorized access early with a clear 403 response.
// 2. RLS policies: even if this check is somehow bypassed, Supabase
//    returns 0 rows for unauthorized queries. Defense in depth.
//
// STANDARD ΓÇö 404 vs 403:
//   ID-scoped resources (PUT/DELETE /[id]):
//     ΓåÆ 404 when resource not found OR user not authorized
//     ΓåÆ avoids leaking existence information
//   Parent-scoped endpoints with explicit wedding_id (GET/POST/bulk):
//     ΓåÆ 403 when user is not a wedding member
//     ΓåÆ 400 when wedding_id/event_id is invalid or cross-wedding
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Checks if the authenticated user is a member of the specified wedding.
 * RLS on wedding_members ensures only the caller's own rows are visible.
 */
export async function isWeddingMember(
  supabase: SupabaseClient,
  weddingId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("wedding_members")
    .select("id")
    .eq("wedding_id", weddingId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[Auth] Wedding membership check failed:", error.message);
    return false;
  }

  return data !== null;
}

/**
 * Fetches the wedding_id for a guest by guest ID.
 * Used by PUT/DELETE /api/guests/[id].
 * RLS ensures null is returned if user isn't a wedding member.
 */
export async function getGuestWeddingId(
  supabase: SupabaseClient,
  guestId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("guests")
    .select("wedding_id")
    .eq("id", guestId)
    .maybeSingle();

  if (error) {
    console.error("[Auth] Guest lookup failed:", error.message);
    return null;
  }

  return data?.wedding_id ?? null;
}

/**
 * Fetches the wedding_id for a guest_event by its ID.
 * Used by PUT/DELETE /api/guest-events/[id].
 * RLS ensures null is returned if user isn't a wedding member.
 */
export async function getGuestEventWeddingId(
  supabase: SupabaseClient,
  guestEventId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("guest_events")
    .select("wedding_id")
    .eq("id", guestEventId)
    .maybeSingle();

  if (error) {
    console.error("[Auth] GuestEvent lookup failed:", error.message);
    return null;
  }

  return data?.wedding_id ?? null;
}

/**
 * Fetches wedding_id AND status for a budget_item.
 * Used by PATCH/DELETE /api/weddings/[weddingId]/budget/items/[itemId].
 * RLS ensures null is returned if user isn't a wedding member.
 */
export async function getBudgetItemMeta(
  supabase: SupabaseClient,
  itemId: string
): Promise<{ wedding_id: string; status: string } | null> {
  const { data, error } = await supabase
    .from("budget_items")
    .select("wedding_id, status")
    .eq("id", itemId)
    .maybeSingle();

  if (error) {
    console.error("[Auth] BudgetItem meta lookup failed:", error.message);
    return null;
  }
  return data ?? null;
}
