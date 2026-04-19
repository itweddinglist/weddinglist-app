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
import type { BudgetItemRow } from "@/types/budget";

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

/**
 * Type narrowing — predicatele sunt declarate ca type guards.
 *
 * 4 predicate exacte (Paid/Planned/Confirmed/Cancelled): narrowing la literal
 * concret cu Extract<status, "...">. Active: narrowing la status ≠ cancelled
 * cu Exclude<status, "cancelled"> — implementare directa, NU compozitie cu !.
 *
 * Branch pozitiv: compilare fara eroare = dovada narrowing. Branch negativ:
 * @ts-expect-error confirma ca narrowing-ul nu se propaga inafara if-ului.
 */
describe("type narrowing", () => {
  it("isBudgetItemPaid narrows status la 'paid' in branch pozitiv", () => {
    const item: Pick<BudgetItemRow, "status"> = { status: "paid" };
    if (isBudgetItemPaid(item)) {
      const literal: "paid" = item.status;
      expect(literal).toBe("paid");
    } else {
      throw new Error("Narrowing trebuia sa reuseasca pentru 'paid'");
    }
  });

  it("isBudgetItemPaid NU narrows in branch negativ", () => {
    const item: Pick<BudgetItemRow, "status"> = { status: "planned" };
    if (!isBudgetItemPaid(item)) {
      // @ts-expect-error — item.status nu e narrow-at la "paid" aici
      const literal: "paid" = item.status;
      expect(literal).not.toBe("paid");
    }
  });

  it("isBudgetItemPlanned narrows status la 'planned' in branch pozitiv", () => {
    const item: Pick<BudgetItemRow, "status"> = { status: "planned" };
    if (isBudgetItemPlanned(item)) {
      const literal: "planned" = item.status;
      expect(literal).toBe("planned");
    } else {
      throw new Error("Narrowing trebuia sa reuseasca pentru 'planned'");
    }
  });

  it("isBudgetItemConfirmed narrows status la 'confirmed' in branch pozitiv", () => {
    const item: Pick<BudgetItemRow, "status"> = { status: "confirmed" };
    if (isBudgetItemConfirmed(item)) {
      const literal: "confirmed" = item.status;
      expect(literal).toBe("confirmed");
    } else {
      throw new Error("Narrowing trebuia sa reuseasca pentru 'confirmed'");
    }
  });

  it("isBudgetItemCancelled narrows status la 'cancelled' in branch pozitiv", () => {
    const item: Pick<BudgetItemRow, "status"> = { status: "cancelled" };
    if (isBudgetItemCancelled(item)) {
      const literal: "cancelled" = item.status;
      expect(literal).toBe("cancelled");
    } else {
      throw new Error("Narrowing trebuia sa reuseasca pentru 'cancelled'");
    }
  });

  it("isBudgetItemActive narrows status la non-'cancelled' in branch pozitiv", () => {
    const item: Pick<BudgetItemRow, "status"> = { status: "planned" };
    if (isBudgetItemActive(item)) {
      // status e narrow-at la Exclude<..., "cancelled"> = "planned" | "confirmed" | "paid"
      // Asignarea la "cancelled" trebuie sa esueze la compilare:
      // @ts-expect-error — "cancelled" e exclus din uniunea narrow-ata
      const _excluded: "cancelled" = item.status;
      expect(item.status).not.toBe("cancelled");
    } else {
      throw new Error("Narrowing trebuia sa reuseasca pentru 'planned'");
    }
  });
});
