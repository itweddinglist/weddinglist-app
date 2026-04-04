import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client cu service role — folosit DOAR pe server.
 * Nu expune niciodată în client/browser.
 * Singleton lazy — instanțiat la primul apel, nu la import.
 */

let _supabaseServer: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_supabaseServer) return _supabaseServer;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseServiceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  _supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _supabaseServer;
}

export const supabaseServer: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop: string | symbol) {
    return Reflect.get(getClient(), prop);
  },
});
