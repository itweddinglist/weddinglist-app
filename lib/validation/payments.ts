// =============================================================================
// lib/validation/payments.ts
// Validation logic for payment create operations.
// Follows exact same pattern as lib/validation/budget-items.ts.
//
// PRODUCT RULES:
//   - amount > 0 (constraint DB: CHECK amount > 0)
//   - currency = exact 3 caractere (constraint DB payment_currency_format)
//   - paid_at = ISO date string "YYYY-MM-DD" sau null
//   - payment_method = free text, max 100 chars, optional
//   - note = free text, max 500 chars, optional
//   - payments sunt imutabile după creare — nu există update, doar DELETE
//   - DELETE permis doar dacă budget_item.status IN (planned, confirmed)
// =============================================================================

import { sanitizeText, isValidUuid } from "../sanitize";
import type { ValidationError } from "../../types/guests";

// Regex ISO date: YYYY-MM-DD
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE_RE.test(value);
}

function isValidCurrency(value: unknown): value is string {
  return typeof value === "string" && value.trim().length === 3;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && isFinite(value) && value > 0;
}

// ─── Create Payment ───────────────────────────────────────────────────────────

export interface ValidatedCreatePayment {
  wedding_id: string;
  budget_item_id: string;
  amount: number;
  currency: string;
  paid_at: string | null;
  payment_method: string | null;
  note: string | null;
}

export type CreatePaymentValidation =
  | { valid: true; data: ValidatedCreatePayment }
  | { valid: false; errors: ValidationError[] };

export function validateCreatePayment(body: unknown): CreatePaymentValidation {
  if (!body || typeof body !== "object") {
    return {
      valid: false,
      errors: [{ field: "body", message: "Request body must be a JSON object." }],
    };
  }

  const input = body as Record<string, unknown>;
  const errors: ValidationError[] = [];

  // wedding_id — required UUID (injectat din URL în route)
  if (!isValidUuid(input.wedding_id)) {
    errors.push({ field: "wedding_id", message: "A valid wedding_id (UUID) is required." });
  }

  // budget_item_id — required UUID (injectat din URL în route)
  if (!isValidUuid(input.budget_item_id)) {
    errors.push({ field: "budget_item_id", message: "A valid budget_item_id (UUID) is required." });
  }

  // amount — required, > 0 (constraint DB)
  if (!isPositiveNumber(input.amount)) {
    errors.push({
      field: "amount",
      message: "amount trebuie să fie un număr > 0.",
    });
  }

  // currency — optional, default "RON", exact 3 caractere
  const currency =
    input.currency === undefined || input.currency === null ? "RON" : input.currency;
  if (!isValidCurrency(currency)) {
    errors.push({
      field: "currency",
      message: "currency trebuie să aibă exact 3 caractere (ex: RON, EUR).",
    });
  }

  // paid_at — optional ISO date
  if (input.paid_at !== undefined && input.paid_at !== null) {
    if (!isValidIsoDate(input.paid_at)) {
      errors.push({
        field: "paid_at",
        message: "paid_at trebuie să fie o dată validă în format YYYY-MM-DD.",
      });
    }
  }

  // payment_method — optional free text, max 100 chars
  const paymentMethod =
    input.payment_method !== undefined && input.payment_method !== null
      ? sanitizeText(input.payment_method, 100)
      : null;

  // note — optional, max 500 chars
  const note =
    input.note !== undefined && input.note !== null
      ? sanitizeText(input.note, 500)
      : null;

  if (errors.length > 0) return { valid: false, errors };

  return {
    valid: true,
    data: {
      wedding_id: input.wedding_id as string,
      budget_item_id: input.budget_item_id as string,
      amount: input.amount as number,
      currency: (currency as string).trim().toUpperCase(),
      paid_at:
        input.paid_at !== undefined && input.paid_at !== null
          ? (input.paid_at as string)
          : null,
      payment_method: paymentMethod,
      note,
    },
  };
}
