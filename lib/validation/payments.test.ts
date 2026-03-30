// =============================================================================
// lib/validation/payments.test.ts
// Unit tests pentru validateCreatePayment.
// Pattern identic cu lib/validation/budget-items.test.ts.
// =============================================================================

import { describe, it, expect } from "vitest";
import { validateCreatePayment } from "./payments";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";
const VALID_UUID_2 = "223e4567-e89b-12d3-a456-426614174001";

describe("validateCreatePayment", () => {
  const base = {
    wedding_id: VALID_UUID,
    budget_item_id: VALID_UUID_2,
    amount: 1500,
  };

  it("acceptă un payload minimal valid", () => {
    const result = validateCreatePayment(base);
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.data.amount).toBe(1500);
    expect(result.data.currency).toBe("RON");       // default
    expect(result.data.paid_at).toBeNull();
    expect(result.data.payment_method).toBeNull();
    expect(result.data.note).toBeNull();
  });

  it("acceptă payload complet", () => {
    const result = validateCreatePayment({
      ...base,
      currency: "eur",                              // trebuie normalizat la EUR
      paid_at: "2026-09-15",
      payment_method: "transfer bancar",
      note: "Avans 50%",
    });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.data.currency).toBe("EUR");       // normalizat uppercase
    expect(result.data.paid_at).toBe("2026-09-15");
    expect(result.data.payment_method).toBe("transfer bancar");
    expect(result.data.note).toBe("Avans 50%");
  });

  it("eșuează fără wedding_id", () => {
    const result = validateCreatePayment({ ...base, wedding_id: undefined });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors.some((e) => e.field === "wedding_id")).toBe(true);
  });

  it("eșuează cu wedding_id invalid", () => {
    const result = validateCreatePayment({ ...base, wedding_id: "not-a-uuid" });
    expect(result.valid).toBe(false);
  });

  it("eșuează fără budget_item_id", () => {
    const result = validateCreatePayment({ ...base, budget_item_id: undefined });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors.some((e) => e.field === "budget_item_id")).toBe(true);
  });

  it("eșuează cu budget_item_id invalid", () => {
    const result = validateCreatePayment({ ...base, budget_item_id: "not-a-uuid" });
    expect(result.valid).toBe(false);
  });

  it("eșuează fără amount", () => {
    const result = validateCreatePayment({ ...base, amount: undefined });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors.some((e) => e.field === "amount")).toBe(true);
  });

  it("eșuează cu amount = 0", () => {
    const result = validateCreatePayment({ ...base, amount: 0 });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors.some((e) => e.field === "amount")).toBe(true);
  });

  it("eșuează cu amount negativ", () => {
    const result = validateCreatePayment({ ...base, amount: -100 });
    expect(result.valid).toBe(false);
  });

  it("eșuează cu amount non-numeric", () => {
    const result = validateCreatePayment({ ...base, amount: "1500" });
    expect(result.valid).toBe(false);
  });

  it("acceptă amount zecimal valid", () => {
    const result = validateCreatePayment({ ...base, amount: 1500.50 });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.data.amount).toBe(1500.50);
  });

  it("eșuează cu currency de 2 caractere", () => {
    const result = validateCreatePayment({ ...base, currency: "RO" });
    expect(result.valid).toBe(false);
  });

  it("eșuează cu currency de 4 caractere", () => {
    const result = validateCreatePayment({ ...base, currency: "EURO" });
    expect(result.valid).toBe(false);
  });

  it("normalizează currency la uppercase", () => {
    const result = validateCreatePayment({ ...base, currency: "ron" });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.data.currency).toBe("RON");
  });

  it("acceptă currency = null → default RON", () => {
    const result = validateCreatePayment({ ...base, currency: null });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.data.currency).toBe("RON");
  });

  it("eșuează cu paid_at în format greșit", () => {
    const result = validateCreatePayment({ ...base, paid_at: "15/09/2026" });
    expect(result.valid).toBe(false);
  });

  it("eșuează cu paid_at datetime (nu doar date)", () => {
    const result = validateCreatePayment({ ...base, paid_at: "2026-09-15T10:00:00Z" });
    expect(result.valid).toBe(false);
  });

  it("acceptă paid_at în format corect", () => {
    const result = validateCreatePayment({ ...base, paid_at: "2026-09-15" });
    expect(result.valid).toBe(true);
  });

  it("acceptă paid_at = null", () => {
    const result = validateCreatePayment({ ...base, paid_at: null });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.data.paid_at).toBeNull();
  });

  it("sanitizează payment_method (strip HTML)", () => {
    const result = validateCreatePayment({ ...base, payment_method: "<b>card</b>" });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.data.payment_method).toBe("card");
  });

  it("sanitizează note (strip HTML)", () => {
    const result = validateCreatePayment({ ...base, note: "<b>avans</b>" });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.data.note).toBe("avans");
  });

  it("eșuează cu body non-object", () => {
    const result = validateCreatePayment("string");
    expect(result.valid).toBe(false);
  });

  it("eșuează cu body null", () => {
    const result = validateCreatePayment(null);
    expect(result.valid).toBe(false);
  });
});
