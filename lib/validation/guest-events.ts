// =============================================================================
// lib/validation/guest-events.ts
// Validation logic for guest-event create, update, and bulk operations.
//
// PRODUCT RULE — attendance_status:
//   - In create/update: optional, can be null ("no status set yet")
//   - In bulk: defaults to 'pending' if not provided
//     ('pending' = added to event roster, not yet responded)
//   This distinction is intentional. Bulk always sets an explicit status
//   so the event roster is complete. Individual operations allow null
//   to represent "status unknown / not applicable".
// =============================================================================

import { sanitizeText, isValidUuid, isValidEnum } from "../sanitize";
import type { AttendanceStatus } from "../../types/guest-events";
import type { ValidationError } from "../../types/guests";

const VALID_STATUSES: readonly AttendanceStatus[] = [
  "pending",
  "invited",
  "attending",
  "declined",
  "maybe",
];

// ─── Create Guest Event ─────────────────────────────────────────────────────

export interface ValidatedCreateGuestEvent {
  wedding_id: string;
  event_id: string;
  guest_id: string;
  attendance_status: AttendanceStatus | null;
  meal_choice: string | null;
  plus_one_label: string | null;
}

export type CreateGuestEventValidation =
  | { valid: true; data: ValidatedCreateGuestEvent }
  | { valid: false; errors: ValidationError[] };

export function validateCreateGuestEvent(body: unknown): CreateGuestEventValidation {
  if (!body || typeof body !== "object") {
    return { valid: false, errors: [{ field: "body", message: "Request body must be a JSON object." }] };
  }

  const input = body as Record<string, unknown>;
  const errors: ValidationError[] = [];

  if (!isValidUuid(input.wedding_id)) {
    errors.push({ field: "wedding_id", message: "A valid wedding_id (UUID) is required." });
  }
  if (!isValidUuid(input.event_id)) {
    errors.push({ field: "event_id", message: "A valid event_id (UUID) is required." });
  }
  if (!isValidUuid(input.guest_id)) {
    errors.push({ field: "guest_id", message: "A valid guest_id (UUID) is required." });
  }

  const status = input.attendance_status;
  if (status !== undefined && status !== null && !isValidEnum(status, VALID_STATUSES)) {
    errors.push({
      field: "attendance_status",
      message: `attendance_status must be one of: ${VALID_STATUSES.join(", ")}.`,
    });
  }

  const mealChoice = sanitizeText(input.meal_choice, 100);
  const plusOneLabel = sanitizeText(input.plus_one_label, 100);

  if (errors.length > 0) return { valid: false, errors };

  return {
    valid: true,
    data: {
      wedding_id: input.wedding_id as string,
      event_id: input.event_id as string,
      guest_id: input.guest_id as string,
      attendance_status: (status as AttendanceStatus) ?? null,
      meal_choice: mealChoice,
      plus_one_label: plusOneLabel,
    },
  };
}

// ─── Update Guest Event ─────────────────────────────────────────────────────

export interface ValidatedUpdateGuestEvent {
  attendance_status?: AttendanceStatus | null;
  meal_choice?: string | null;
  plus_one_label?: string | null;
}

export type UpdateGuestEventValidation =
  | { valid: true; data: ValidatedUpdateGuestEvent }
  | { valid: false; errors: ValidationError[] };

export function validateUpdateGuestEvent(body: unknown): UpdateGuestEventValidation {
  if (!body || typeof body !== "object") {
    return { valid: false, errors: [{ field: "body", message: "Request body must be a JSON object." }] };
  }

  const input = body as Record<string, unknown>;
  const errors: ValidationError[] = [];
  const data: ValidatedUpdateGuestEvent = {};
  let hasFields = false;

  if ("attendance_status" in input) {
    if (input.attendance_status === null) {
      data.attendance_status = null;
      hasFields = true;
    } else if (!isValidEnum(input.attendance_status, VALID_STATUSES)) {
      errors.push({
        field: "attendance_status",
        message: `attendance_status must be one of: ${VALID_STATUSES.join(", ")}.`,
      });
    } else {
      data.attendance_status = input.attendance_status;
      hasFields = true;
    }
  }

  if ("meal_choice" in input) {
    data.meal_choice = sanitizeText(input.meal_choice, 100);
    hasFields = true;
  }

  if ("plus_one_label" in input) {
    data.plus_one_label = sanitizeText(input.plus_one_label, 100);
    hasFields = true;
  }

  if (!hasFields && errors.length === 0) {
    errors.push({ field: "body", message: "At least one field must be provided for update." });
  }

  if (errors.length > 0) return { valid: false, errors };

  return { valid: true, data };
}

// ─── Bulk Create Guest Events ───────────────────────────────────────────────

export interface ValidatedBulkCreate {
  wedding_id: string;
  event_id: string;
  attendance_status: AttendanceStatus;
}

export type BulkCreateValidation =
  | { valid: true; data: ValidatedBulkCreate }
  | { valid: false; errors: ValidationError[] };

export function validateBulkCreateGuestEvents(body: unknown): BulkCreateValidation {
  if (!body || typeof body !== "object") {
    return { valid: false, errors: [{ field: "body", message: "Request body must be a JSON object." }] };
  }

  const input = body as Record<string, unknown>;
  const errors: ValidationError[] = [];

  if (!isValidUuid(input.wedding_id)) {
    errors.push({ field: "wedding_id", message: "A valid wedding_id (UUID) is required." });
  }
  if (!isValidUuid(input.event_id)) {
    errors.push({ field: "event_id", message: "A valid event_id (UUID) is required." });
  }

  // Default to 'pending' — see PRODUCT RULE at top of file
  const status = input.attendance_status ?? "pending";
  if (!isValidEnum(status, VALID_STATUSES)) {
    errors.push({
      field: "attendance_status",
      message: `attendance_status must be one of: ${VALID_STATUSES.join(", ")}.`,
    });
  }

  if (errors.length > 0) return { valid: false, errors };

  return {
    valid: true,
    data: {
      wedding_id: input.wedding_id as string,
      event_id: input.event_id as string,
      attendance_status: status as AttendanceStatus,
    },
  };
}
