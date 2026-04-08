// =============================================================================
// lib/seating/id-bridge.ts
// Batch allocation via RPC allocate_seating_numeric_ids_batch.
// Un singur apel RPC per entity_type — nu 600 apeluri individuale.
//
// NOTĂ: persistarea în seating_id_maps se face server-side în
// GET /api/weddings/[weddingId]/seating/load — nu aici.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { NumericIdMap } from "./types";

export async function fetchAndAllocateIds(
  supabase: SupabaseClient,
  weddingId: string,
  eventId: string,
  guestUuids: string[],
  tableUuids: string[]
): Promise<NumericIdMap> {
  const result: NumericIdMap = {
    guests: new Map(),
    tables: new Map(),
    guestsReverse: new Map(),
    tablesReverse: new Map(),
  };

  // Batch guests
  if (guestUuids.length > 0) {
    const { data: guestMaps, error: guestError } = await supabase.rpc(
      "allocate_seating_numeric_ids_batch",
      {
        p_wedding_id:   weddingId,
        p_event_id:     eventId,
        p_entity_type:  "guest",
        p_entity_uuids: guestUuids,
      }
    );

    if (guestError) {
      console.error("[IdBridge] guest batch allocation failed:", guestError.message);
      throw guestError;
    }

    for (const row of guestMaps ?? []) {
      result.guests.set(row.entity_uuid, row.numeric_id);
      result.guestsReverse.set(row.numeric_id, row.entity_uuid);
    }
  }

  // Batch tables
  if (tableUuids.length > 0) {
    const { data: tableMaps, error: tableError } = await supabase.rpc(
      "allocate_seating_numeric_ids_batch",
      {
        p_wedding_id:   weddingId,
        p_event_id:     eventId,
        p_entity_type:  "table",
        p_entity_uuids: tableUuids,
      }
    );

    if (tableError) {
      console.error("[IdBridge] table batch allocation failed:", tableError.message);
      throw tableError;
    }

    for (const row of tableMaps ?? []) {
      result.tables.set(row.entity_uuid, row.numeric_id);
      result.tablesReverse.set(row.numeric_id, row.entity_uuid);
    }
  }

  return result;
}
