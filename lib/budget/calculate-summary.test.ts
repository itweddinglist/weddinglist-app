// =============================================================================
// lib/budget/calculate-summary.test.ts
// Unit tests pentru calculateBudgetSummary.
// =============================================================================

import { describe, it, expect } from "vitest";
import { calculateBudgetSummary } from "./calculate-summary";
import type { BudgetItemForSummary, PaymentForSummary } from "./calculate-summary";

const item = (
  estimated: number,
  status: string,
  currency = "RON",
  actual: number | null = null
): BudgetItemForSummary => ({
  estimated_amount: estimated,
  actual_amount: actual,
  status,
  currency,
});

const payment = (amount: number): PaymentForSummary => ({ amount });

describe("calculateBudgetSummary", () => {
  it("returnează zero-state când nu există items sau payments", () => {
    const result = calculateBudgetSummary([], []);
    expect(result.total_estimated).toBe(0);
    expect(result.total_actual).toBe(0);
    expect(result.total_paid).toBe(0);
    expect(result.total_remaining).toBe(0);
    expect(result.items_count).toBe(0);
    expect(result.currency).toBe("RON");
    expect(result.has_mixed_currencies).toBe(false);
    expect(result.items_by_status).toEqual({
      planned: 0,
      confirmed: 0,
      paid: 0,
      cancelled: 0,
    });
  });

  it("calculează total_estimated exclusiv pe items active (exclus cancelled)", () => {
    const items = [
      item(1000, "planned"),
      item(2000, "confirmed"),
      item(3000, "paid"),
      item(500, "cancelled"),   // exclus
    ];
    const result = calculateBudgetSummary(items, []);
    expect(result.total_estimated).toBe(6000); // 1000 + 2000 + 3000
  });

  it("calculează total_actual din items cu actual_amount setat", () => {
    const items = [
      item(1000, "planned", "RON", 900),
      item(2000, "confirmed", "RON", null),  // null — exclus
      item(3000, "paid", "RON", 3000),
    ];
    const result = calculateBudgetSummary(items, []);
    expect(result.total_actual).toBe(3900); // 900 + 3000
  });

  it("calculează total_paid din payments", () => {
    const items = [item(5000, "planned")];
    const payments = [payment(1000), payment(500), payment(250)];
    const result = calculateBudgetSummary(items, payments);
    expect(result.total_paid).toBe(1750);
  });

  it("calculează total_remaining = total_estimated - total_paid", () => {
    const items = [item(5000, "planned")];
    const payments = [payment(2000)];
    const result = calculateBudgetSummary(items, payments);
    expect(result.total_remaining).toBe(3000);
  });

  it("total_remaining nu poate fi negativ (minim 0)", () => {
    const items = [item(1000, "planned")];
    const payments = [payment(1500)]; // plătit mai mult decât estimat
    const result = calculateBudgetSummary(items, payments);
    expect(result.total_remaining).toBe(0);
  });

  it("calculează items_count inclusiv cancelled", () => {
    const items = [
      item(1000, "planned"),
      item(2000, "cancelled"),
      item(3000, "paid"),
    ];
    const result = calculateBudgetSummary(items, []);
    expect(result.items_count).toBe(3);
  });

  it("calculează items_by_status corect", () => {
    const items = [
      item(100, "planned"),
      item(200, "planned"),
      item(300, "confirmed"),
      item(400, "paid"),
      item(500, "cancelled"),
    ];
    const result = calculateBudgetSummary(items, []);
    expect(result.items_by_status).toEqual({
      planned: 2,
      confirmed: 1,
      paid: 1,
      cancelled: 1,
    });
  });

  it("detectează currency din primul item", () => {
    const items = [item(1000, "planned", "EUR")];
    const result = calculateBudgetSummary(items, []);
    expect(result.currency).toBe("EUR");
  });

  it("has_mixed_currencies = false când toate items au același currency", () => {
    const items = [
      item(1000, "planned", "RON"),
      item(2000, "confirmed", "RON"),
    ];
    const result = calculateBudgetSummary(items, []);
    expect(result.has_mixed_currencies).toBe(false);
  });

  it("has_mixed_currencies = true când există items cu currency diferit", () => {
    const items = [
      item(1000, "planned", "RON"),
      item(2000, "confirmed", "EUR"),
    ];
    const result = calculateBudgetSummary(items, []);
    expect(result.has_mixed_currencies).toBe(true);
    expect(result.currency).toBe("RON"); // primul item
  });

  it("rotunjește la 2 zecimale — evită floating point artifacts", () => {
    const items = [
      item(1500.1, "planned"),
      item(200.2, "planned"),
    ];
    const result = calculateBudgetSummary(items, []);
    expect(result.total_estimated).toBe(1700.3); // nu 1700.3000000000002
  });

  it("rotunjește total_paid la 2 zecimale", () => {
    const payments = [payment(100.1), payment(200.2)];
    const result = calculateBudgetSummary([], payments);
    expect(result.total_paid).toBe(300.3);
  });

  it("funcționează cu doar payments și fără items", () => {
    const result = calculateBudgetSummary([], [payment(500)]);
    expect(result.total_paid).toBe(500);
    expect(result.total_estimated).toBe(0);
    expect(result.total_remaining).toBe(0); // max(0, 0-500) = 0
  });

  it("funcționează cu toate items cancelled", () => {
    const items = [
      item(1000, "cancelled"),
      item(2000, "cancelled"),
    ];
    const result = calculateBudgetSummary(items, []);
    expect(result.total_estimated).toBe(0); // toate cancelled
    expect(result.items_count).toBe(2);
    expect(result.items_by_status.cancelled).toBe(2);
  });
});
