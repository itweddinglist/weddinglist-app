/**
 * RSVP response rules — predicate pure pentru starea formala a raspunsurilor RSVP.
 *
 * Folosit in: dashboard stats, export PDF, selectors, validare submissions, pagina publica RSVP.
 * Contextul business: invitatul a raspuns formal prin formularul RSVP.
 *
 * Opereaza pe tabelul rsvp — valori enum: pending | accepted | declined | maybe.
 * NU confunda cu AttendanceStatus (types/guests.ts) care opereaza pe guest_events.
 */

import type { RsvpAttendanceStatus } from "@/types/rsvp";

export function isRsvpAccepted(status: RsvpAttendanceStatus | null): boolean {
  return status === "accepted";
}

export function isRsvpDeclined(status: RsvpAttendanceStatus | null): boolean {
  return status === "declined";
}

export function isRsvpMaybe(status: RsvpAttendanceStatus | null): boolean {
  return status === "maybe";
}

export function isRsvpPending(status: RsvpAttendanceStatus | null): boolean {
  return status === "pending";
}
