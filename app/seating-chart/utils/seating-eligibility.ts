// =============================================================================
// utils/seating-eligibility.ts
// Selector reutilizabil — single source of truth pentru eligibilitate seating.
// Un guest este eligibil pentru seating dacă nu a refuzat explicit (RSVP declined).
// =============================================================================

import type { SeatingGuest } from '@/types/seating'

/**
 * Returns true if a guest should appear in the unassigned list and
 * be considered by Magic Fill.
 *
 * Rules:
 * - guest_events missing or empty → eligible (no RSVP data yet)
 * - attendance_status !== 'declined' → eligible
 * - attendance_status === 'declined' → NOT eligible
 */
export function isSeatingEligible(guest: Pick<SeatingGuest, 'guest_events'>): boolean {
  const status = guest.guest_events?.[0]?.attendance_status;
  return status !== 'declined';
}
