// =============================================================================
// lib/supabase-server.ts
// Server-side Supabase client factory for API routes.
// Creates a per-request client authenticated with the caller's JWT.
// =============================================================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Creates a Supabase client authenticated with the user's JWT.
 * Throws at call time (not module load) if env vars are missing.
 *
 * - Passes Bearer token so RLS evaluates against `sub` claim (= app_users.id)
 * - Each API route call gets a fresh client — no shared state
 */
export function createAuthenticatedClient(jwt: string): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${jwt}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
