/**
 * Tests pentru budget.rules.ts — predicate Budget pure.
 *
 * Coverage: fiecare predicate testat pe toate valorile enum BudgetItemStatus
 * (planned | confirmed | paid | cancelled).
 *
 * Nota: predicate accepta Pick<BudgetItemRow, "status"> — minim necesar.
 * Folosim mock simplu { status } pentru fiecare test.
 */

import { describe, it, expect } from "vitest";
import { isBudgetItemPaid, isBudgetItemPlanned, isBudgetItemConfirmed, isBudgetItemCancelled, isBudgetItemActive } from "./budget.rules";

describe("isBudgetItemPaid", () => {
  it("returneaza true pentru paid", () => {
    expect(isBudgetItemPaid({ status: "paid" })).toBe(true);
  });
  it("returneaza false pentru planned", () => {
    expect(isBudgetItemPaid({ status: "planned" })).toBe(false);
  });
  it("returneaza false pentru confirmed", () => {
    expect(isBudgetItemPaid({ status: "confirmed" })).toBe(false);
  });
  it("returneaza false pentru cancelled", () => {
    expect(isBudgetItemPaid({ status: "cancelled" })).toBe(false);
  });
});

describe("isBudgetItemPlanned", () => {
  it("returneaza true pentru planned", () => {
    expect(isBudgetItemPlanned({ status: "planned" })).toBe(true);
  });
  it("returneaza false pentru confirmed", () => {
    expect(isBudgetItemPlanned({ status: "confirmed" })).toBe(false);
  });
  it("returneaza false pentru paid", () => {
    expect(isBudgetItemPlanned({ status: "paid" })).toBe(false);
  });
  it("returneaza false pentru cancelled", () => {
    expect(isBudgetItemPlanned({ status: "cancelled" })).toBe(false);
  });
});

describe("isBudgetItemConfirmed", () => {
  it("returneaza true pentru confirmed", () => {
    expect(isBudgetItemConfirmed({ status: "confirmed" })).toBe(true);
  });
  it("returneaza false pentru planned", () => {
    expect(isBudgetItemConfirmed({ status: "planned" })).toBe(false);
  });
  it("returneaza false pentru paid", () => {
    expect(isBudgetItemConfirmed({ status: "paid" })).toBe(false);
  });
  it("returneaza false pentru cancelled", () => {
    expect(isBudgetItemConfirmed({ status: "cancelled" })).toBe(false);
  });
});

describe("isBudgetItemCancelled", () => {
  it("returneaza true pentru cancelled", () => {
    expect(isBudgetItemCancelled({ status: "cancelled" })).toBe(true);
  });
  it("returneaza false pentru planned", () => {
    expect(isBudgetItemCancelled({ status: "planned" })).toBe(false);
  });
  it("returneaza false pentru confirmed", () => {
    expect(isBudgetItemCancelled({ status: "confirmed" })).toBe(false);
  });
  it("returneaza false pentru paid", () => {
    expect(isBudgetItemCancelled({ status: "paid" })).toBe(false);
  });
});

describe("isBudgetItemActive", () => {
  it("returneaza true pentru planned", () => {
    expect(isBudgetItemActive({ status: "planned" })).toBe(true);
  });
  it("returneaza true pentru confirmed", () => {
    expect(isBudgetItemActive({ status: "confirmed" })).toBe(true);
  });
  it("returneaza true pentru paid", () => {
    expect(isBudgetItemActive({ status: "paid" })).toBe(true);
  });
  it("returneaza false pentru cancelled", () => {
    expect(isBudgetItemActive({ status: "cancelled" })).toBe(false);
  });
});
