import { createClient } from "@supabase/supabase-js";
import { type SeatingPersistenceAdapter, type SeatingSnapshot } from "./types";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase env variables");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createSupabaseAdapter(
  weddingId: string,
  eventId: string | null
): SeatingPersistenceAdapter {
  return {
    async save(snapshot: SeatingSnapshot): Promise<void> {
      const supabase = getSupabaseClient();

      const { error } = await supabase
        .from("seating_editor_states")
        .upsert(
          {
            wedding_id: weddingId,
            event_id: eventId,
            state: snapshot,
            revision: snapshot.version,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "wedding_id,event_id" }
        );

      if (error) throw new Error(error.message);
    },

    async load(): Promise<SeatingSnapshot | null> {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from("seating_editor_states")
        .select("state")
        .eq("wedding_id", weddingId)
        .maybeSingle();

      if (error || !data) return null;
      return data.state as SeatingSnapshot;
    },
  };
}