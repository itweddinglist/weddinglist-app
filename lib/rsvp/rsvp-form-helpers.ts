// =============================================================================
// lib/rsvp/rsvp-form-helpers.ts
// Derivari + transforme pure pentru formularul public RSVP
// Consumat de app/(public)/rsvp/[public_link_id]/page.tsx
// Hard Rule #7 - business logic separata de UI
// =============================================================================

import { isRsvpAccepted } from "@/lib/domain";
import type { RsvpAttendanceStatus, RsvpMealChoice } from "@/types/rsvp";

export interface EventAnswer {
  guest_event_id: string;
  status: RsvpAttendanceStatus | null;
  meal_choice: RsvpMealChoice | null;
  dietary_notes: string;
  note: string;
}

/** meal_choice transmis la submit - valid doar daca invitatul a acceptat. */
export function getMealChoiceForSubmit(answer: EventAnswer): RsvpMealChoice | null {
  return isRsvpAccepted(answer.status) ? answer.meal_choice : null;
}

/** true daca cel putin un raspuns are status "accepted". */
export function hasAnyAccepted(answers: Record<string, EventAnswer>): boolean {
  return Object.values(answers).some((a) => isRsvpAccepted(a.status));
}

/** Dietary notes partajate - primul answer accepted castiga (first-wins). */
export function getSharedDietaryNotes(answers: Record<string, EventAnswer>): string {
  const firstAccepted = Object.values(answers).find((a) => isRsvpAccepted(a.status));
  return firstAccepted?.dietary_notes ?? "";
}

/** Propaga dietary_notes pe toate raspunsurile accepted; imutabil. */
export function applyDietaryNotesToAccepted(
  answers: Record<string, EventAnswer>,
  value: string,
): Record<string, EventAnswer> {
  const updated: Record<string, EventAnswer> = { ...answers };
  for (const key of Object.keys(updated)) {
    if (isRsvpAccepted(updated[key].status)) {
      updated[key] = { ...updated[key], dietary_notes: value };
    }
  }
  return updated;
}