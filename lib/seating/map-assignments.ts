// =============================================================================
// lib/seating/map-assignments.ts
// Populează tableId pe SeatingGuest[] din seat_assignments + id-bridge.
// =============================================================================

import type { NumericIdMap, SeatingGuest } from "./types";

export interface SeatAssignmentRow {
  guest_id: string;    // UUID
  table_id: string;    // UUID (derivat din seat → table)
}

/**
 * Populează tableId pe guests din seat_assignments.
 * Returnează un nou array — nu mutează inputul.
 */
export function applyAssignments(
  guests: SeatingGuest[],
  assignments: SeatAssignmentRow[],
  idMaps: NumericIdMap
): SeatingGuest[] {
  // Build lookup: guest UUID → table numeric_id
  const assignmentMap = new Map<number, number>();

  for (const assignment of assignments) {
    const guestNumericId = idMaps.guests.get(assignment.guest_id);
    const tableNumericId = idMaps.tables.get(assignment.table_id);

    if (guestNumericId === undefined || tableNumericId === undefined) {
      // Guest sau table fără mapping — skip
      // Poate apărea la primul sync când tables nu sunt încă în bridge
      continue;
    }

    assignmentMap.set(guestNumericId, tableNumericId);
  }

  return guests.map((guest) => ({
    ...guest,
    tableId: assignmentMap.get(guest.id) ?? null,
  }));
}
