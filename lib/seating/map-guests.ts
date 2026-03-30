// =============================================================================
// lib/seating/map-guests.ts
// Mapare GuestWithRelations[] → SeatingGuest[] cu numeric IDs din id-bridge.
// =============================================================================

import type { NumericIdMap, SeatingGuest } from "./types";

// Status mapping: guest_events.attendance_status → format intern seating
const STATUS_MAP: Record<string, string> = {
  attending: "confirmat",
  declined:  "declinat",
  maybe:     "in_asteptare",
  invited:   "in_asteptare",
  pending:   "in_asteptare",
};

function mapStatus(status: string | null | undefined): string {
  if (!status) return "in_asteptare";
  return STATUS_MAP[status] ?? "in_asteptare";
}

export interface GuestWithEventData {
  id: string;                    // UUID
  first_name: string;
  last_name: string | null;
  guest_group?: { name: string } | null;
  guest_events?: {
    attendance_status: string | null;
    meal_choice: string | null;
  }[] | null;
}

/**
 * Mapează guests din Supabase la formatul intern al seating engine-ului.
 * Guests fără numeric_id în bridge sunt omișii (nu ar trebui să se întâmple
 * dacă allocateMissingIds a rulat înainte).
 */
export function mapGuestsToSeating(
  guests: GuestWithEventData[],
  idMaps: NumericIdMap
): SeatingGuest[] {
  const result: SeatingGuest[] = [];

  for (const guest of guests) {
    const numericId = idMaps.guests.get(guest.id);
    if (numericId === undefined) {
      // ID bridge allocation a eșuat pentru acest guest.
      // Cauze posibile: allocate_seating_numeric_ids_batch n-a rulat sau a picat parțial.
      // Guest-ul e omis din seating — va reapărea la next load după re-alocare.
      console.warn(
        `[mapGuests] Guest ${guest.id} (${guest.first_name} ${guest.last_name ?? ''}) ` +
        `lipsește din id bridge — omis din seating. ` +
        `Verifică allocate_seating_numeric_ids_batch.`
      );
      continue;
    }

    // Ia primul guest_event (event activ)
    const guestEvent = guest.guest_events?.[0] ?? null;

    result.push({
      id: numericId,
      prenume: guest.first_name,
      nume: guest.last_name ?? "",
      grup: guest.guest_group?.name ?? "Fără grup",
      meniu: guestEvent?.meal_choice ?? "Standard",
      status: mapStatus(guestEvent?.attendance_status),
      tableId: null, // populat ulterior din seat_assignments
    });
  }

  return result;
}
