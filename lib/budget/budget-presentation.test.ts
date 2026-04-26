import { describe, it, expect } from "vitest";
import type { BudgetItemStatus } from "@/types/budget";
import {
  BUDGET_STATUS_LABELS,
  getBudgetStatusLabel,
  BUDGET_STATUS_COLORS_VAR,
  getBudgetStatusColorVar,
  BUDGET_STATUS_TRANSITIONS,
  getBudgetStatusTransitions,
  isValidBudgetStatusTransition,
  type BudgetStatusColorVar,
  type BudgetStatusTransition,
} from "./budget-presentation";

describe("BUDGET_STATUS_LABELS", () => {
  it("acoperă toate cele 4 statusuri", () => {
    expect(Object.keys(BUDGET_STATUS_LABELS).sort()).toEqual([
      "cancelled",
      "confirmed",
      "paid",
      "planned",
    ]);
  });

  it("returnează label RO corect pentru planned", () => {
    expect(BUDGET_STATUS_LABELS.planned).toBe("Planificat");
  });

  it("returnează label RO corect pentru confirmed", () => {
    expect(BUDGET_STATUS_LABELS.confirmed).toBe("Confirmat");
  });

  it("returnează label RO corect pentru paid", () => {
    expect(BUDGET_STATUS_LABELS.paid).toBe("Plătit");
  });

  it("returnează label RO corect pentru cancelled", () => {
    expect(BUDGET_STATUS_LABELS.cancelled).toBe("Anulat");
  });
});

describe("getBudgetStatusLabel", () => {
  it("returnează același label ca BUDGET_STATUS_LABELS pentru toate statusurile", () => {
    const statuses: BudgetItemStatus[] = ["planned", "confirmed", "paid", "cancelled"];
    for (const status of statuses) {
      expect(getBudgetStatusLabel(status)).toBe(BUDGET_STATUS_LABELS[status]);
    }
  });
});

describe("BUDGET_STATUS_COLORS_VAR", () => {
  it("acoperă toate cele 4 statusuri", () => {
    expect(Object.keys(BUDGET_STATUS_COLORS_VAR).sort()).toEqual([
      "cancelled",
      "confirmed",
      "paid",
      "planned",
    ]);
  });

  it("paid mapează la success (verde)", () => {
    expect(BUDGET_STATUS_COLORS_VAR.paid).toEqual({
      border: "var(--color-success)",
      text: "var(--color-success-text)",
      bg: "var(--color-success-soft)",
    });
  });

  it("confirmed mapează la info (albastru)", () => {
    expect(BUDGET_STATUS_COLORS_VAR.confirmed).toEqual({
      border: "var(--color-info)",
      text: "var(--color-info-text)",
      bg: "var(--color-info-soft)",
    });
  });

  it("planned mapează la warning (galben)", () => {
    expect(BUDGET_STATUS_COLORS_VAR.planned).toEqual({
      border: "var(--color-warning)",
      text: "var(--color-warning-text)",
      bg: "var(--color-warning-soft)",
    });
  });

  it("cancelled mapează la neutral (gri)", () => {
    expect(BUDGET_STATUS_COLORS_VAR.cancelled).toEqual({
      border: "var(--color-neutral)",
      text: "var(--color-neutral-text)",
      bg: "var(--color-neutral-soft)",
    });
  });

  it("fiecare entry are exact 3 keys (border, text, bg)", () => {
    const statuses: BudgetItemStatus[] = ["planned", "confirmed", "paid", "cancelled"];
    for (const status of statuses) {
      const colors = BUDGET_STATUS_COLORS_VAR[status];
      expect(Object.keys(colors).sort()).toEqual(["bg", "border", "text"]);
    }
  });

  it("toate culorile sunt CSS vars (var(--color-*))", () => {
    const statuses: BudgetItemStatus[] = ["planned", "confirmed", "paid", "cancelled"];
    for (const status of statuses) {
      const { border, text, bg } = BUDGET_STATUS_COLORS_VAR[status];
      expect(border).toMatch(/^var\(--color-/);
      expect(text).toMatch(/^var\(--color-/);
      expect(bg).toMatch(/^var\(--color-/);
    }
  });
});

describe("getBudgetStatusColorVar", () => {
  it("returnează același obiect ca BUDGET_STATUS_COLORS_VAR pentru toate statusurile", () => {
    const statuses: BudgetItemStatus[] = ["planned", "confirmed", "paid", "cancelled"];
    for (const status of statuses) {
      expect(getBudgetStatusColorVar(status)).toEqual(BUDGET_STATUS_COLORS_VAR[status]);
    }
  });

  it("returnează un obiect tip BudgetStatusColorVar", () => {
    const result: BudgetStatusColorVar = getBudgetStatusColorVar("paid");
    expect(result.border).toBeDefined();
    expect(result.text).toBeDefined();
    expect(result.bg).toBeDefined();
  });
});

describe("BUDGET_STATUS_TRANSITIONS", () => {
  it("acoperă toate cele 4 statusuri", () => {
    expect(Object.keys(BUDGET_STATUS_TRANSITIONS).sort()).toEqual([
      "cancelled",
      "confirmed",
      "paid",
      "planned",
    ]);
  });

  it("paid e terminal (zero tranziții)", () => {
    expect(BUDGET_STATUS_TRANSITIONS.paid).toEqual([]);
  });

  it("cancelled e terminal (zero tranziții)", () => {
    expect(BUDGET_STATUS_TRANSITIONS.cancelled).toEqual([]);
  });

  it("planned are exact 2 tranziții (confirmed, cancelled)", () => {
    expect(BUDGET_STATUS_TRANSITIONS.planned).toHaveLength(2);
    const targets = BUDGET_STATUS_TRANSITIONS.planned.map((t) => t.to).sort();
    expect(targets).toEqual(["cancelled", "confirmed"]);
  });

  it("confirmed are exact 2 tranziții (paid, cancelled)", () => {
    expect(BUDGET_STATUS_TRANSITIONS.confirmed).toHaveLength(2);
    const targets = BUDGET_STATUS_TRANSITIONS.confirmed.map((t) => t.to).sort();
    expect(targets).toEqual(["cancelled", "paid"]);
  });

  it("planned -> confirmed are label CTA Confirmă", () => {
    const transition = BUDGET_STATUS_TRANSITIONS.planned.find((t) => t.to === "confirmed");
    expect(transition?.label).toBe("Confirmă");
  });

  it("confirmed -> paid are label CTA Marchează plătit", () => {
    const transition = BUDGET_STATUS_TRANSITIONS.confirmed.find((t) => t.to === "paid");
    expect(transition?.label).toBe("Marchează plătit");
  });

  it("toate tranzițiile spre cancelled au label Anulează", () => {
    const fromStatuses: BudgetItemStatus[] = ["planned", "confirmed"];
    for (const from of fromStatuses) {
      const cancelTransition = BUDGET_STATUS_TRANSITIONS[from].find((t) => t.to === "cancelled");
      expect(cancelTransition?.label).toBe("Anulează");
    }
  });

  it("fiecare tranziție are exact 2 keys (to, label)", () => {
    const statuses: BudgetItemStatus[] = ["planned", "confirmed"];
    for (const status of statuses) {
      for (const transition of BUDGET_STATUS_TRANSITIONS[status]) {
        expect(Object.keys(transition).sort()).toEqual(["label", "to"]);
      }
    }
  });
});

describe("getBudgetStatusTransitions", () => {
  it("returnează lista tranzițiilor pentru fiecare status", () => {
    const statuses: BudgetItemStatus[] = ["planned", "confirmed", "paid", "cancelled"];
    for (const status of statuses) {
      expect(getBudgetStatusTransitions(status)).toEqual(BUDGET_STATUS_TRANSITIONS[status]);
    }
  });

  it("returnează tip BudgetStatusTransition[]", () => {
    const result: readonly BudgetStatusTransition[] = getBudgetStatusTransitions("planned");
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("to");
    expect(result[0]).toHaveProperty("label");
  });
});

describe("isValidBudgetStatusTransition — POSITIVE cases", () => {
  it("planned -> confirmed e valid", () => {
    expect(isValidBudgetStatusTransition("planned", "confirmed")).toBe(true);
  });

  it("planned -> cancelled e valid", () => {
    expect(isValidBudgetStatusTransition("planned", "cancelled")).toBe(true);
  });

  it("confirmed -> paid e valid", () => {
    expect(isValidBudgetStatusTransition("confirmed", "paid")).toBe(true);
  });

  it("confirmed -> cancelled e valid", () => {
    expect(isValidBudgetStatusTransition("confirmed", "cancelled")).toBe(true);
  });
});

describe("isValidBudgetStatusTransition — NEGATIVE cases (terminal states)", () => {
  it("paid -> ANY e invalid (terminal)", () => {
    const targets: BudgetItemStatus[] = ["planned", "confirmed", "paid", "cancelled"];
    for (const to of targets) {
      expect(isValidBudgetStatusTransition("paid", to)).toBe(false);
    }
  });

  it("cancelled -> ANY e invalid (terminal)", () => {
    const targets: BudgetItemStatus[] = ["planned", "confirmed", "paid", "cancelled"];
    for (const to of targets) {
      expect(isValidBudgetStatusTransition("cancelled", to)).toBe(false);
    }
  });

  it("paid -> cancelled e invalid (NU mai e refund)", () => {
    expect(isValidBudgetStatusTransition("paid", "cancelled")).toBe(false);
  });

  it("cancelled -> planned e invalid (NU mai e reactivare)", () => {
    expect(isValidBudgetStatusTransition("cancelled", "planned")).toBe(false);
  });
});

describe("isValidBudgetStatusTransition — NEGATIVE cases (skip steps + revert)", () => {
  it("planned -> paid e invalid (skip step confirmed)", () => {
    expect(isValidBudgetStatusTransition("planned", "paid")).toBe(false);
  });

  it("confirmed -> planned e invalid (revert)", () => {
    expect(isValidBudgetStatusTransition("confirmed", "planned")).toBe(false);
  });
});

describe("isValidBudgetStatusTransition — NEGATIVE cases (same state)", () => {
  it("planned -> planned e invalid", () => {
    expect(isValidBudgetStatusTransition("planned", "planned")).toBe(false);
  });

  it("confirmed -> confirmed e invalid", () => {
    expect(isValidBudgetStatusTransition("confirmed", "confirmed")).toBe(false);
  });

  it("paid -> paid e invalid", () => {
    expect(isValidBudgetStatusTransition("paid", "paid")).toBe(false);
  });

  it("cancelled -> cancelled e invalid", () => {
    expect(isValidBudgetStatusTransition("cancelled", "cancelled")).toBe(false);
  });
});

describe("Completeness invariants", () => {
  it("BUDGET_STATUS_LABELS, COLORS_VAR și TRANSITIONS au exact aceleași keys", () => {
    const labelsKeys = Object.keys(BUDGET_STATUS_LABELS).sort();
    const colorsKeys = Object.keys(BUDGET_STATUS_COLORS_VAR).sort();
    const transitionsKeys = Object.keys(BUDGET_STATUS_TRANSITIONS).sort();
    expect(labelsKeys).toEqual(colorsKeys);
    expect(colorsKeys).toEqual(transitionsKeys);
  });

  it("toate tranzițiile pointează spre statusuri valide BudgetItemStatus", () => {
    const validStatuses = new Set<BudgetItemStatus>(["planned", "confirmed", "paid", "cancelled"]);
    const fromStatuses: BudgetItemStatus[] = ["planned", "confirmed", "paid", "cancelled"];
    for (const from of fromStatuses) {
      for (const transition of BUDGET_STATUS_TRANSITIONS[from]) {
        expect(validStatuses.has(transition.to)).toBe(true);
      }
    }
  });
});