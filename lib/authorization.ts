// =============================================================================
// lib/authorization.ts
// Wedding membership checks for API route authorization.
// =============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";

const DEV_AUTH_TOKEN = process.env.DEV_AUTH_TOKEN;

export async function isWeddingMember(
  supabase: SupabaseClient,
  weddingId: string
): Promise<boolean> {
  // DEV BYPASS — doar în development când DEV_AUTH_TOKEN e configurat
  // În producție NODE_ENV=production → nu se execută niciodată
  // DEV_AUTH_TOKEN nu e setat în Vercel production → dublu guard
  if (
    process.env.NODE_ENV === "development" &&
    DEV_AUTH_TOKEN
  ) {
    return true;
  }

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