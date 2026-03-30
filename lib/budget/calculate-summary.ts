// =============================================================================
// lib/budget/calculate-summary.ts
// Funcție pură pentru calculul derived totals din budget.
//
// V1 LIMITATION: multi-currency — totalurile sunt calculate pe toate items
// indiferent de currency. has_mixed_currencies semnalează UI-ul să afișeze warning.
// =============================================================================

import type { BudgetSummary } from "../../types/budget";

interface BudgetItemRow {
  estimated_amount: number;
  actual_amount: number | null;
  status: string;
  currency: string;
}

interface PaymentRow {
  amount: number;
}

export function calculateBudgetSummary(
  items: BudgetItemRow[],
  payments: PaymentRow[]
): BudgetSummary {
  const activeItems = items.filter((i) => i.status !== "cancelled");

  const total_estimated = activeItems.reduce((sum, i) => sum + (i.estimated_amount ?? 0), 0);
  const total_actual = activeItems
    .filter((i) => i.actual_amount !== null)
    .reduce((sum, i) => sum + (i.actual_amount ?? 0), 0);
  const total_paid = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const total_remaining = total_estimated - total_paid;

  const items_by_status = {
    planned:   items.filter((i) => i.status === "planned").length,
    confirmed: items.filter((i) => i.status === "confirmed").length,
    paid:      items.filter((i) => i.status === "paid").length,
    cancelled: items.filter((i) => i.status === "cancelled").length,
  };

  // Currency detection
  const currencies = [...new Set(items.map((i) => i.currency).filter(Boolean))];
  const has_mixed_currencies = currencies.length > 1;
  const currency = currencies[0] ?? "RON";

  return {
    total_estimated,
    total_actual,
    total_paid,
    total_remaining,
    items_count: items.length,
    items_by_status,
    currency,
    has_mixed_currencies,
  };
}
