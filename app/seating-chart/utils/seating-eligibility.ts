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
 *
 * @deprecated CONTRACT INCORECT — bug H2 in curs de fix.
 *
 * Semnatura curenta `Pick<SeatingGuest, 'guest_events'>` accepta silent
 * obiecte fara guest_events (pentru ca guest_events? e optional pe SeatingGuest).
 * In plus, pipeline-ul de productie (lib/seating/map-guests.ts) NU ataseaza
 * guest_events pe output, ceea ce inseamna ca in practica aceasta functie
 * returneaza intotdeauna true (nu filtreaza declined guests).
 *
 * Fix planificat in PR H2.5:
 * 1. Schimba semnatura la `(guest: SeatingGuestWithEvents)` — guest_events required
 * 2. Modifica map-guests.ts sa includa guest_events in output
 * 3. Actualizeaza toti consumatorii (useSeatingData, magicFill)
 * 4. Sterge testele toxice din useSeatingData.test.js care documenteaza bugul
 *
 * Pana atunci, aceasta functie RAMANE cu semnatura si comportamentul curent
 * pentru a nu schimba produs in acelasi PR cu hardening-ul de tipuri.
 * Vezi test guardrail: app/seating-chart/utils/seating-eligibility.test.ts
 */
export function isSeatingEligible(guest: Pick<SeatingGuest, 'guest_events'>): boolean {
  const status = guest.guest_events?.[0]?.attendance_status;
  return status !== 'declined';
}
