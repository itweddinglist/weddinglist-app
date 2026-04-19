/**
 * Attendance rules — predicate pentru starea curenta a prezentei unui guest per event.
 *
 * Folosit in: seating pipeline, guest list filtering, magic fill eligibility.
 * Contextul business: e acest guest prezent la acest event pentru planning operational?
 *
 * Opereaza pe tabelul guest_events — valori enum: pending | invited | attending | declined | maybe.
 * NU confunda cu RsvpAttendanceStatus (types/rsvp.ts) care opereaza pe tabelul rsvp.
 *
 * Diferenta semantica:
 * - RSVP = raspuns formal al invitatului prin formular.
 * - Attendance = starea curenta pentru planning operational (poate fi derivata din RSVP).
 */

import type { AttendanceStatus } from "@/types/guests";

export function isAttendanceAttending(
  status: AttendanceStatus | null | undefined,
): status is Extract<AttendanceStatus, "attending"> {
  return status === "attending";
}

export function isAttendanceDeclined(
  status: AttendanceStatus | null | undefined,
): status is Extract<AttendanceStatus, "declined"> {
  return status === "declined";
}

export function isAttendanceMaybe(
  status: AttendanceStatus | null | undefined,
): status is Extract<AttendanceStatus, "maybe"> {
  return status === "maybe";
}

export function isAttendancePending(
  status: AttendanceStatus | null | undefined,
): status is Extract<AttendanceStatus, "pending"> {
  return status === "pending";
}
