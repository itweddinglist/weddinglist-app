// =============================================================================
// lib/validation/guests.ts
// Validation logic for guest create and update operations.
// Separated from routes for unit testability.
//
// PRODUCT RULE — display_name:
//   Auto-generated from first+last if not provided or if set to null.
//   On PUT: only auto-regenerated if the current display_name matches the
//   auto-generated pattern (first + " " + last). Manual overrides are preserved.
//   This is intentional product behavior, not an implementation accident.
// =============================================================================

import { sanitizeName, sanitizeNotes, isValidUuid, isValidEnum } from "../sanitize";
import type { GuestSide, ValidationError } from "../../types/guests";

const VALID_SIDES: readonly GuestSide[] = ["bride", "groom", "both", "other"];

// ─── Create Guest ────────────────────────────────────────────────────────────

export interface ValidatedCreateGuest {
  wedding_id: string;
  first_name: string;
  last_name: string | null;
  display_name: string;
  guest_group_id: string | null;
  side: GuestSide | null;
  notes: string | null;
  is_vip: boolean;
}

export type CreateGuestValidation =
  | { valid: true; data: ValidatedCreateGuest }
  | { valid: false; errors: ValidationError[] };

export function validateCreateGuest(body: unknown): CreateGuestValidation {
  if (!body || typeof body !== "object") {
    return { valid: false, errors: [{ field: "body", message: "Request body must be a JSON object." }] };
  }

  const input = body as Record<string, unknown>;
  const errors: ValidationError[] = [];

  // wedding_id — required UUID
  if (!isValidUuid(input.wedding_id)) {
    errors.push({ field: "wedding_id", message: "A valid wedding_id (UUID) is required." });
  }

  // first_name — required, non-empty after sanitization (CONTEXT.md #14)
  const firstName = sanitizeName(input.first_name);
  if (!firstName) {
    errors.push({ field: "first_name", message: "first_name is required and cannot be empty." });
  }

  // last_name — optional
  const lastName = sanitizeName(input.last_name);

  // display_name — auto-generated from first+last if not provided
  // sanitizeName("  ") → null → falls back to auto-generated
  let displayName: string | null = null;
  if (input.display_name !== undefined && input.display_name !== null) {
    displayName = sanitizeName(input.display_name);
    if (!displayName) {
      errors.push({ field: "display_name", message: "display_name cannot be empty when provided." });
    }
  } else {
    displayName = [firstName, lastName].filter(Boolean).join(" ") || null;
  }

  // guest_group_id — optional UUID
  const guestGroupId = input.guest_group_id;
  if (guestGroupId !== undefined && guestGroupId !== null && !isValidUuid(guestGroupId)) {
    errors.push({ field: "guest_group_id", message: "guest_group_id must be a valid UUID." });
  }

  // side — optional enum
  const side = input.side;
  if (side !== undefined && side !== null && !isValidEnum(side, VALID_SIDES)) {
    errors.push({ field: "side", message: `side must be one of: ${VALID_SIDES.join(", ")}.` });
  }

  // notes — optional, max 500 chars
  const notes = sanitizeNotes(input.notes);

  // is_vip — optional boolean, defaults false
  const isVip = input.is_vip === true || input.is_vip === "true" ? true : false;

  if (errors.length > 0) return { valid: false, errors };

  return {
    valid: true,
    data: {
      wedding_id: input.wedding_id as string,
      first_name: firstName!,
      last_name: lastName,
      display_name: displayName!,
      guest_group_id: (guestGroupId as string) ?? null,
      side: (side as GuestSide) ?? null,
      notes,
      is_vip: isVip,
    },
  };
}

// ─── Update Guest ────────────────────────────────────────────────────────────

export interface ValidatedUpdateGuest {
  first_name?: string;
  last_name?: string | null;
  display_name?: string | null;
  guest_group_id?: string | null;
  side?: GuestSide | null;
  notes?: string | null;
  is_vip?: boolean;
}

export type UpdateGuestValidation =
  | { valid: true; data: ValidatedUpdateGuest }
  | { valid: false; errors: ValidationError[] };

export function validateUpdateGuest(body: unknown): UpdateGuestValidation {
  if (!body || typeof body !== "object") {
    return { valid: false, errors: [{ field: "body", message: "Request body must be a JSON object." }] };
  }

  const input = body as Record<string, unknown>;
  const errors: ValidationError[] = [];
  const data: ValidatedUpdateGuest = {};
  let hasFields = false;

  if ("first_name" in input) {
    const firstName = sanitizeName(input.first_name);
    if (!firstName) {
      errors.push({ field: "first_name", message: "first_name cannot be empty." });
    } else {
      data.first_name = firstName;
      hasFields = true;
    }
  }

  if ("last_name" in input) {
    data.last_name = sanitizeName(input.last_name);
    hasFields = true;
  }

  if ("display_name" in input) {
    if (input.display_name === null) {
      data.display_name = null; // null → route will auto-regenerate from first+last
      hasFields = true;
    } else {
      const displayName = sanitizeName(input.display_name);
      if (!displayName) {
        errors.push({ field: "display_name", message: "display_name cannot be empty when provided." });
      } else {
        data.display_name = displayName;
        hasFields = true;
      }
    }
  }

  if ("guest_group_id" in input) {
    if (input.guest_group_id === null) {
      data.guest_group_id = null;
      hasFields = true;
    } else if (!isValidUuid(input.guest_group_id)) {
      errors.push({ field: "guest_group_id", message: "guest_group_id must be a valid UUID." });
    } else {
      data.guest_group_id = input.guest_group_id;
      hasFields = true;
    }
  }

  if ("side" in input) {
    if (input.side === null) {
      data.side = null;
      hasFields = true;
    } else if (!isValidEnum(input.side, VALID_SIDES)) {
      errors.push({ field: "side", message: `side must be one of: ${VALID_SIDES.join(", ")}.` });
    } else {
      data.side = input.side;
      hasFields = true;
    }
  }

  if ("notes" in input) {
    data.notes = sanitizeNotes(input.notes);
    hasFields = true;
  }

  if ("is_vip" in input) {
    if (typeof input.is_vip !== "boolean") {
      errors.push({ field: "is_vip", message: "is_vip must be a boolean." });
    } else {
      data.is_vip = input.is_vip;
      hasFields = true;
    }
  }

  if (!hasFields && errors.length === 0) {
    errors.push({ field: "body", message: "At least one field must be provided for update." });
  }

  if (errors.length > 0) return { valid: false, errors };

  return { valid: true, data };
}
