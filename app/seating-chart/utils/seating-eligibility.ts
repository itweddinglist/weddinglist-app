// =============================================================================
// utils/seating-eligibility.ts
// Selector reutilizabil — single source of truth pentru eligibilitate seating.
// Un guest este eligibil pentru seating dacă nu a refuzat explicit (RSVP declined).
// =============================================================================

import type { SeatingGuestWithEvents } from '@/types/seating'

/**
 * Returns true if a guest should appear in the unassigned list and
 * be considered by Magic Fill.
 *
 * Rules:
 * - guest_events empty → eligible (no RSVP data yet)
 * - attendance_status !== 'declined' → eligible
 * - attendance_status === 'declined' → NOT eligible
 *
 * Contract: consumatorul trebuie sa garanteze ca guest_events e atasat
 * (tip SeatingGuestWithEvents forteaza asta la nivel de tip).
 */
export function isSeatingEligible(guest: SeatingGuestWithEvents): boolean {
  const status = guest.guest_events[0]?.attendance_status;
  return status !== 'declined';
}
