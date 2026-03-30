// =============================================================================
// lib/validation/budget-items.ts
// Validation logic for budget item create and update operations.
// Follows exact same pattern as lib/validation/guests.ts.
//
// PRODUCT RULES:
//   - status "paid" → nu poate fi modificat prin UI (tranziție interzisă)
//   - estimated_amount ≥ 0 (constraint DB)
//   - actual_amount ≥ 0 sau null (constraint DB)
//   - currency = exact 3 caractere (constraint DB budget_currency_format)
//   - due_date = ISO date string "YYYY-MM-DD" sau null
// =============================================================================

import { sanitizeName, sanitizeNotes, isValidUuid, isValidEnum } from "../sanitize";
import type { BudgetItemStatus, ValidationError } from "../../types/budget";

const VALID_STATUSES: readonly BudgetItemStatus[] = [
  "planned",
  "confirmed",
  "paid",
  "cancelled",
];

// Regex ISO date: YYYY-MM-DD
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE_RE.test(value);
}

function isValidCurrency(value: unknown): value is string {
  return typeof value === "string" && value.trim().length === 3;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && isFinite(value) && value >= 0;
}

// ─── Create BudgetItem ────────────────────────────────────────────────────────

export interface ValidatedCreateBudgetItem {
  wedding_id: string;
  name: string;
  category: string | null;
  estimated_amount: number;
  actual_amount: number | null;
  currency: string;
  status: BudgetItemStatus;
  vendor_id: string | null;
  due_date: string | null;
  notes: string | null;
}

export type CreateBudgetItemValidation =
  | { valid: true; data: ValidatedCreateBudgetItem }
  | { valid: false; errors: ValidationError[] };

export function validateCreateBudgetItem(body: unknown): CreateBudgetItemValidation {
  if (!body || typeof body !== "object") {
    return {
      valid: false,
      errors: [{ field: "body", message: "Request body must be a JSON object." }],
    };
  }

  const input = body as Record<string, unknown>;
  const errors: ValidationError[] = [];

  // wedding_id — required UUID
  if (!isValidUuid(input.wedding_id)) {
    errors.push({ field: "wedding_id", message: "A valid wedding_id (UUID) is required." });
  }

  // name — required, non-empty după sanitizare (max 200 chars — CONTEXT #17)
  const name = sanitizeName(input.name);
  if (!name) {
    errors.push({ field: "name", message: "name este obligatoriu și nu poate fi gol." });
  }

  // category — optional text
  const category = input.category != null ? sanitizeName(input.category) : null;

  // estimated_amount — required, >= 0
  if (!isNonNegativeNumber(input.estimated_amount)) {
    errors.push({
      field: "estimated_amount",
      message: "estimated_amount trebuie să fie un număr >= 0.",
    });
  }

  // actual_amount — optional, >= 0 sau null
  if (input.actual_amount !== undefined && input.actual_amount !== null) {
    if (!isNonNegativeNumber(input.actual_amount)) {
      errors.push({
        field: "actual_amount",
        message: "actual_amount trebuie să fie un număr >= 0.",
      });
    }
  }

  // currency — optional, default "RON", exact 3 caractere
  const currency =
    input.currency === undefined || input.currency === null
      ? "RON"
      : input.currency;
  if (!isValidCurrency(currency)) {
    errors.push({
      field: "currency",
      message: "currency trebuie să aibă exact 3 caractere (ex: RON, EUR).",
    });
  }

  // status — optional, default "planned"
  const status =
    input.status === undefined || input.status === null ? "planned" : input.status;
  if (!isValidEnum(status, VALID_STATUSES)) {
    errors.push({
      field: "status",
      message: `status trebuie să fie unul din: ${VALID_STATUSES.join(", ")}.`,
    });
  }

  // vendor_id — optional UUID
  if (input.vendor_id !== undefined && input.vendor_id !== null) {
    if (!isValidUuid(input.vendor_id)) {
      errors.push({ field: "vendor_id", message: "vendor_id trebuie să fie un UUID valid." });
    }
  }

  // due_date — optional ISO date
  if (input.due_date !== undefined && input.due_date !== null) {
    if (!isValidIsoDate(input.due_date)) {
      errors.push({
        field: "due_date",
        message: "due_date trebuie să fie o dată validă în format YYYY-MM-DD.",
      });
    }
  }

  // notes — optional, max 500 chars
  const notes = sanitizeNotes(input.notes);

  if (errors.length > 0) return { valid: false, errors };

  return {
    valid: true,
    data: {
      wedding_id: input.wedding_id as string,
      name: name!,
      category,
      estimated_amount: input.estimated_amount as number,
      actual_amount:
        input.actual_amount !== undefined && input.actual_amount !== null
          ? (input.actual_amount as number)
          : null,
      currency: (currency as string).trim().toUpperCase(),
      status: status as BudgetItemStatus,
      vendor_id:
        input.vendor_id !== undefined && input.vendor_id !== null
          ? (input.vendor_id as string)
          : null,
      due_date:
        input.due_date !== undefined && input.due_date !== null
          ? (input.due_date as string)
          : null,
      notes,
    },
  };
}

// ─── Update BudgetItem ────────────────────────────────────────────────────────

export interface ValidatedUpdateBudgetItem {
  name?: string;
  category?: string | null;
  estimated_amount?: number;
  actual_amount?: number | null;
  currency?: string;
  status?: BudgetItemStatus;
  vendor_id?: string | null;
  due_date?: string | null;
  notes?: string | null;
}

export type UpdateBudgetItemValidation =
  | { valid: true; data: ValidatedUpdateBudgetItem }
  | { valid: false; errors: ValidationError[] };

export function validateUpdateBudgetItem(
  body: unknown,
  currentStatus: BudgetItemStatus
): UpdateBudgetItemValidation {
  if (!body || typeof body !== "object") {
    return {
      valid: false,
      errors: [{ field: "body", message: "Request body must be a JSON object." }],
    };
  }

  // PRODUCT RULE: status "paid" → interzis orice modificare prin UI
  // State Transitions (#15 CONTEXT.md): paid → orice = interzis prin UI
  if (currentStatus === "paid") {
    return {
      valid: false,
      errors: [
        {
          field: "status",
          message: "Un item plătit nu poate fi modificat. Contactați suportul pentru corecții.",
        },
      ],
    };
  }

  const input = body as Record<string, unknown>;
  const errors: ValidationError[] = [];
  const data: ValidatedUpdateBudgetItem = {};
  let hasFields = false;

  if ("name" in input) {
    const name = sanitizeName(input.name);
    if (!name) {
      errors.push({ field: "name", message: "name nu poate fi gol." });
    } else {
      data.name = name;
      hasFields = true;
    }
  }

  if ("category" in input) {
    data.category = input.category != null ? sanitizeName(input.category) : null;
    hasFields = true;
  }

  if ("estimated_amount" in input) {
    if (!isNonNegativeNumber(input.estimated_amount)) {
      errors.push({
        field: "estimated_amount",
        message: "estimated_amount trebuie să fie un număr >= 0.",
      });
    } else {
      data.estimated_amount = input.estimated_amount;
      hasFields = true;
    }
  }

  if ("actual_amount" in input) {
    if (input.actual_amount === null) {
      data.actual_amount = null;
      hasFields = true;
    } else if (!isNonNegativeNumber(input.actual_amount)) {
      errors.push({
        field: "actual_amount",
        message: "actual_amount trebuie să fie un număr >= 0.",
      });
    } else {
      data.actual_amount = input.actual_amount;
      hasFields = true;
    }
  }

  if ("currency" in input) {
    if (!isValidCurrency(input.currency)) {
      errors.push({
        field: "currency",
        message: "currency trebuie să aibă exact 3 caractere (ex: RON, EUR).",
      });
    } else {
      data.currency = (input.currency as string).trim().toUpperCase();
      hasFields = true;
    }
  }

  if ("status" in input) {
    if (!isValidEnum(input.status, VALID_STATUSES)) {
      errors.push({
        field: "status",
        message: `status trebuie să fie unul din: ${VALID_STATUSES.join(", ")}.`,
      });
    } else {
      // Validare tranziție de status
      const transitionError = validateStatusTransition(
        currentStatus,
        input.status as BudgetItemStatus
      );
      if (transitionError) {
        errors.push({ field: "status", message: transitionError });
      } else {
        data.status = input.status as BudgetItemStatus;
        hasFields = true;
      }
    }
  }

  if ("vendor_id" in input) {
    if (input.vendor_id === null) {
      data.vendor_id = null;
      hasFields = true;
    } else if (!isValidUuid(input.vendor_id)) {
      errors.push({ field: "vendor_id", message: "vendor_id trebuie să fie un UUID valid." });
    } else {
      data.vendor_id = input.vendor_id as string;
      hasFields = true;
    }
  }

  if ("due_date" in input) {
    if (input.due_date === null) {
      data.due_date = null;
      hasFields = true;
    } else if (!isValidIsoDate(input.due_date)) {
      errors.push({
        field: "due_date",
        message: "due_date trebuie să fie o dată validă în format YYYY-MM-DD.",
      });
    } else {
      data.due_date = input.due_date;
      hasFields = true;
    }
  }

  if ("notes" in input) {
    data.notes = sanitizeNotes(input.notes);
    hasFields = true;
  }

  if (!hasFields && errors.length === 0) {
    errors.push({
      field: "body",
      message: "Cel puțin un câmp trebuie furnizat pentru actualizare.",
    });
  }

  if (errors.length > 0) return { valid: false, errors };

  return { valid: true, data };
}

// ─── State Transition Guard ───────────────────────────────────────────────────
// State Transitions din CONTEXT.md #15:
//   planned → confirmed → paid
//   planned → cancelled
//   confirmed → cancelled
//   INTERZIS: paid → orice (gestionat mai sus)

const VALID_TRANSITIONS: Record<BudgetItemStatus, readonly BudgetItemStatus[]> = {
  planned: ["confirmed", "cancelled"],
  confirmed: ["paid", "cancelled"],
  paid: [],        // nicio tranziție permisă prin UI
  cancelled: [],   // terminal
};

function validateStatusTransition(
  from: BudgetItemStatus,
  to: BudgetItemStatus
): string | null {
  if (from === to) return null; // no-op, ok
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    return `Statusul nu poate fi schimbat din "${from}" în "${to}".`;
  }
  return null;
}
