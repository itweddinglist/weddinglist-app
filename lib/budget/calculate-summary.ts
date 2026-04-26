// =============================================================================
// lib/budget/calculate-summary.ts
// Funcție pură pentru calculul derived totals din budget.
//
// V1 LIMITATION: multi-currency — totalurile sunt calculate pe toate items
// indiferent de currency. has_mixed_currencies semnalează UI-ul să afișeze warning.
// =============================================================================

import type { BudgetSummary, BudgetItemStatus } from "../../types/budget";
import {
  isBudgetItemActive,
  isBudgetItemPaid,
  isBudgetItemPlanned,
  isBudgetItemConfirmed,
  isBudgetItemCancelled,
} from "../domain/budget.rules";

export interface BudgetItemForSummary {
  estimated_amount: number;
  actual_amount: number | null;
  status: BudgetItemStatus;
  currency: string;
}
export interface PaymentForSummary {
  amount: number;
}

export function calculateBudgetSummary(
  items: BudgetItemForSummary[],
  payments: PaymentForSummary[]
): BudgetSummary {
  const activeItems = items.filter(isBudgetItemActive);

  const total_estimated = activeItems.reduce((sum, i) => sum + (i.estimated_amount ?? 0), 0);
  const total_actual = activeItems
    .filter((i) => i.actual_amount !== null)
    .reduce((sum, i) => sum + (i.actual_amount ?? 0), 0);
  const total_paid = Math.round(payments.reduce((sum, p) => sum + (p.amount ?? 0), 0) * 100) / 100;
  const total_remaining = Math.max(0, Math.round((total_estimated - total_paid) * 100) / 100);

  const items_by_status = {
    planned:   items.filter(isBudgetItemPlanned).length,
    confirmed: items.filter(isBudgetItemConfirmed).length,
    paid:      items.filter(isBudgetItemPaid).length,
    cancelled: items.filter(isBudgetItemCancelled).length,
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
