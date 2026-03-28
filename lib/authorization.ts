// =============================================================================
// lib/authorization.ts
// Wedding membership checks for API route authorization.
//
// Two levels of protection:
// 1. Explicit check here — catches unauthorized access early with clear 403
// 2. RLS — safety net even if this check is somehow bypassed
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
 * Used by PUT/DELETE where guest ID is in URL but wedding_id is needed for auth.
 * RLS ensures this returns null if user isn't a wedding member.
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
