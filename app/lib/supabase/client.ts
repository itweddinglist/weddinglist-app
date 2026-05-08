import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Supabase client cu anon key — sigur pentru browser.
 * RLS protejează datele.
 * Lazy — instanțiat la primul apel, nu la import.
 */

let _supabaseClient: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (_supabaseClient) return _supabaseClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseAnonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");

  _supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _supabaseClient;
}

/**
 * @deprecated Folosește getSupabaseClient() în loc.
 * Păstrat temporar pentru compatibilitate.
 */
export const supabaseClient: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop: string | symbol) {
    return Reflect.get(getSupabaseClient(), prop);
  },
});
