// =============================================================================
// lib/validation/budget-items.test.ts
// Unit tests pentru validateCreateBudgetItem și validateUpdateBudgetItem.
// Pattern identic cu lib/validation/guests.test.ts.
// =============================================================================

import { describe, it, expect } from "vitest";
import {
  validateCreateBudgetItem,
  validateUpdateBudgetItem,
} from "./budget-items";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";
const VALID_UUID_2 = "223e4567-e89b-12d3-a456-426614174001";

// ─── validateCreateBudgetItem ─────────────────────────────────────────────────

describe("validateCreateBudgetItem", () => {
  const base = {
    wedding_id: VALID_UUID,
    name: "Catering",
    estimated_amount: 5000,
  };

  it("acceptă un payload minimal valid", () => {
    const result = validateCreateBudgetItem(base);
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.data.name).toBe("Catering");
    expect(result.data.status).toBe("planned");         // default
    expect(result.data.currency).toBe("RON");           // default
    expect(result.data.actual_amount).toBeNull();
    expect(result.data.vendor_id).toBeNull();
    expect(result.data.due_date).toBeNull();
    expect(result.data.notes).toBeNull();
  });

  it("acceptă payload complet", () => {
    const result = validateCreateBudgetItem({
      ...base,
      category: "Mâncare",
      actual_amount: 4800,
      currency: "eur",            // trebuie normalizat la EUR
      status: "confirmed",
      vendor_id: VALID_UUID_2,
      due_date: "2026-09-15",
      notes: "Include open bar",
    });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.data.currency).toBe("EUR");           // normalizat uppercase
    expect(result.data.status).toBe("confirmed");
    expect(result.data.vendor_id).toBe(VALID_UUID_2);
    expect(result.data.due_date).toBe("2026-09-15");
  });

  it("eșuează fără wedding_id", () => {
    const result = validateCreateBudgetItem({ ...base, wedding_id: undefined });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors.some((e) => e.field === "wedding_id")).toBe(true);
  });

  it("eșuează cu wedding_id invalid", () => {
    const result = validateCreateBudgetItem({ ...base, wedding_id: "not-a-uuid" });
    expect(result.valid).toBe(false);
  });

  it("eșuează fără name", () => {
    const result = validateCreateBudgetItem({ ...base, name: undefined });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors.some((e) => e.field === "name")).toBe(true);
  });

  it("eșuează cu name gol după trim", () => {
    const result = validateCreateBudgetItem({ ...base, name: "   " });
    expect(result.valid).toBe(false);
  });

  it("sanitizează name (strip HTML)", () => {
    const result = validateCreateBudgetItem({ ...base, name: "<b>Catering</b>" });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.data.name).toBe("Catering");
  });

  it("eșuează cu estimated_amount negativ", () => {
    const result = validateCreateBudgetItem({ ...base, estimated_amount: -100 });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors.some((e) => e.field === "estimated_amount")).toBe(true);
  });

  it("acceptă estimated_amount = 0", () => {
    const result = validateCreateBudgetItem({ ...base, estimated_amount: 0 });
    expect(result.valid).toBe(true);
  });

  it("eșuează cu actual_amount negativ", () => {
    const result = validateCreateBudgetItem({ ...base, actual_amount: -1 });
    expect(result.valid).toBe(false);
  });

  it("acceptă actual_amount = null explicit", () => {
    const result = validateCreateBudgetItem({ ...base, actual_amount: null });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.data.actual_amount).toBeNull();
  });

  it("eșuează cu currency de 2 caractere", () => {
    const result = validateCreateBudgetItem({ ...base, currency: "RO" });
    expect(result.valid).toBe(false);
  });

  it("eșuează cu status invalid", () => {
    const result = validateCreateBudgetItem({ ...base, status: "pending" });
    expect(result.valid).toBe(false);
  });

  it("eșuează cu vendor_id invalid", () => {
    const result = validateCreateBudgetItem({ ...base, vendor_id: "not-uuid" });
    expect(result.valid).toBe(false);
  });

  it("acceptă vendor_id = null", () => {
    const result = validateCreateBudgetItem({ ...base, vendor_id: null });
    expect(result.valid).toBe(true);
  });

  it("eșuează cu due_date în format greșit", () => {
    const result = validateCreateBudgetItem({ ...base, due_date: "15/09/2026" });
    expect(result.valid).toBe(false);
  });

  it("acceptă due_date în format corect", () => {
    const result = validateCreateBudgetItem({ ...base, due_date: "2026-09-15" });
    expect(result.valid).toBe(true);
  });

  it("eșuează cu body non-object", () => {
    const result = validateCreateBudgetItem("string");
    expect(result.valid).toBe(false);
  });

  it("eșuează cu body null", () => {
    const result = validateCreateBudgetItem(null);
    expect(result.valid).toBe(false);
  });
});

// ─── validateUpdateBudgetItem ─────────────────────────────────────────────────

describe("validateUpdateBudgetItem", () => {
  it("acceptă update parțial valid — doar name", () => {
    const result = validateUpdateBudgetItem({ name: "Florărie" }, "planned");
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.data.name).toBe("Florărie");
  });

  it("blochează orice update dacă status curent e paid", () => {
    const result = validateUpdateBudgetItem({ name: "Test" }, "paid");
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors[0].field).toBe("status");
  });

  it("blochează tranziție invalidă planned → paid (skip confirmed)", () => {
    const result = validateUpdateBudgetItem({ status: "paid" }, "planned");
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors.some((e) => e.field === "status")).toBe(true);
  });

  it("permite tranziție validă planned → confirmed", () => {
    const result = validateUpdateBudgetItem({ status: "confirmed" }, "planned");
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.data.status).toBe("confirmed");
  });

  it("permite tranziție validă confirmed → paid", () => {
    const result = validateUpdateBudgetItem({ status: "paid" }, "confirmed");
    expect(result.valid).toBe(true);
  });

  it("permite tranziție validă planned → cancelled", () => {
    const result = validateUpdateBudgetItem({ status: "cancelled" }, "planned");
    expect(result.valid).toBe(true);
  });

  it("blochează tranziție cancelled → planned", () => {
    const result = validateUpdateBudgetItem({ status: "planned" }, "cancelled");
    expect(result.valid).toBe(false);
  });

  it("acceptă aceeași valoare status (no-op)", () => {
    const result = validateUpdateBudgetItem({ status: "planned" }, "planned");
    expect(result.valid).toBe(true);
  });

  it("eșuează cu body gol (niciun câmp)", () => {
    const result = validateUpdateBudgetItem({}, "planned");
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors[0].field).toBe("body");
  });

  it("acceptă actual_amount = null (reset)", () => {
    const result = validateUpdateBudgetItem({ actual_amount: null }, "planned");
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.data.actual_amount).toBeNull();
  });

  it("acceptă vendor_id = null (deconectare vendor)", () => {
    const result = validateUpdateBudgetItem({ vendor_id: null }, "planned");
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.data.vendor_id).toBeNull();
  });

  it("acceptă due_date = null (ștergere dată)", () => {
    const result = validateUpdateBudgetItem({ due_date: null }, "planned");
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.data.due_date).toBeNull();
  });

  it("normalizează currency la uppercase", () => {
    const result = validateUpdateBudgetItem({ currency: "eur" }, "planned");
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.data.currency).toBe("EUR");
  });

  it("eșuează cu estimated_amount non-numeric", () => {
    const result = validateUpdateBudgetItem({ estimated_amount: "5000" }, "planned");
    expect(result.valid).toBe(false);
  });
});
