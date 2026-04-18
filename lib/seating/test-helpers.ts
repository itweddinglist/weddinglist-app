// =============================================================================
// lib/seating/test-helpers.ts
// Factory helpers pentru constructia obiectelor tipate (teste + date demo).
// Zero logic, doar defaults sanatoase + override pattern.
// =============================================================================

import type { GuestEventRow, AttendanceStatus } from "@/types/guests";

/**
 * Construieste un GuestEventRow valid cu defaults realiste.
 * Override ce ai nevoie. Toate campurile DB populate (aliniat CHECK constraint).
 *
 * Uzuri:
 * - Test fixtures (isSeatingEligible, useSeatingData)
 * - Date demo (INITIAL_GUESTS in geometry.ts)
 *
 * Defaults:
 * - attendance_status: 'pending' (valoare DB valida, not null)
 * - meal_choice, plus_one_label: null
 * - id, wedding_id, event_id, guest_id: UUID-uri zero (valide ca forma, nu ca date reale)
 * - timestamps: epoch start
 *
 * Exemplu:
 *   const event = makeGuestEventRow({ attendance_status: "attending" });
 *   const declined = makeGuestEventRow({ attendance_status: "declined", meal_choice: "vegetarian" });
 */
export function makeGuestEventRow(
  overrides: Partial<GuestEventRow> = {}
): GuestEventRow {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    wedding_id: "00000000-0000-0000-0000-000000000000",
    event_id: "00000000-0000-0000-0000-000000000000",
    guest_id: "00000000-0000-0000-0000-000000000000",
    attendance_status: "pending",
    meal_choice: null,
    plus_one_label: null,
    created_at: "1970-01-01T00:00:00.000Z",
    updated_at: "1970-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * Shortcut pentru scenariul comun "event cu doar status setat".
 * Util cand testul nu are nevoie sa specifice restul campurilor.
 *
 * Exemplu:
 *   const events = [makeEventWithStatus("declined")];
 */
export function makeEventWithStatus(
  attendance_status: AttendanceStatus | null
): GuestEventRow {
  return makeGuestEventRow({ attendance_status });
}
