// =============================================================================
// lib/rsvp/validate-rsvp-submission.ts
// Validare input pentru submit RSVP de pe pagina publică
// Input public — risc maxim — sanitizare completă
// =============================================================================

import { sanitizeText, isValidUuid } from "../../lib/sanitize";
import { isRsvpAccepted } from "@/lib/domain";
import type {
  SubmitRsvpInput,
  RsvpEventResponse,
  RsvpAttendanceStatus,
  RsvpMealChoice,
} from "@/types/rsvp";
import type { ValidationError } from "@/types/guests";

const VALID_STATUSES: readonly RsvpAttendanceStatus[] = [
  "pending",
  "accepted",
  "declined",
  "maybe",
];

const VALID_MEAL_CHOICES: readonly RsvpMealChoice[] = [
  "standard",
  "vegetarian",
];

export type SubmitRsvpValidation =
  | { valid: true; data: SubmitRsvpInput }
  | { valid: false; errors: ValidationError[] };

export function validateRsvpSubmission(body: unknown): SubmitRsvpValidation {
  if (!body || typeof body !== "object") {
    return {
      valid: false,
      errors: [{ field: "body", message: "Request body must be a JSON object." }],
    };
  }

  const input = body as Record<string, unknown>;
  const errors: ValidationError[] = [];

  // responses — required array
  if (!Array.isArray(input.responses) || input.responses.length === 0) {
    return {
      valid: false,
      errors: [{ field: "responses", message: "Cel puțin un răspuns este obligatoriu." }],
    };
  }

  if (input.responses.length > 10) {
    return {
      valid: false,
      errors: [{ field: "responses", message: "Prea multe răspunsuri." }],
    };
  }

  const validatedResponses: RsvpEventResponse[] = [];

  for (let i = 0; i < input.responses.length; i++) {
    const r = input.responses[i] as Record<string, unknown>;

    // guest_event_id — required UUID
    if (!isValidUuid(r.guest_event_id)) {
      errors.push({
        field: `responses[${i}].guest_event_id`,
        message: "guest_event_id trebuie să fie un UUID valid.",
      });
      continue;
    }

    // status — required enum
    if (!r.status || !VALID_STATUSES.includes(r.status as RsvpAttendanceStatus)) {
      errors.push({
        field: `responses[${i}].status`,
        message: `status trebuie să fie unul din: ${VALID_STATUSES.join(", ")}.`,
      });
      continue;
    }

    const status = r.status as RsvpAttendanceStatus;

    // meal_choice — obligatoriu dacă accepted
    if (isRsvpAccepted(status)) {
      if (r.meal_choice !== undefined && r.meal_choice !== null) {
        if (!VALID_MEAL_CHOICES.includes(r.meal_choice as RsvpMealChoice)) {
          errors.push({
            field: `responses[${i}].meal_choice`,
            message: `meal_choice trebuie să fie: ${VALID_MEAL_CHOICES.join(", ")}.`,
          });
          continue;
        }
      }
    }

    // dietary_notes — optional, max 500 chars, sanitizat
    const dietaryNotes = sanitizeText(r.dietary_notes, 500);

    // note — optional, max 500 chars, sanitizat
    const note = sanitizeText(r.note, 500);

    validatedResponses.push({
      guest_event_id: r.guest_event_id as string,
      status,
      meal_choice: r.meal_choice
        ? (r.meal_choice as RsvpMealChoice)
        : null,
      dietary_notes: dietaryNotes,
      note,
    });
  }

  if (errors.length > 0) return { valid: false, errors };

  return {
    valid: true,
    data: { responses: validatedResponses },
  };
}