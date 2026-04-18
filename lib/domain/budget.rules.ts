/**
 * Budget rules — predicate pentru starea financiara a unui budget item.
 *
 * Folosit in: budget page UI, summary calculations, items API routes.
 * Contextul business: a fost platit acest item? E activ pentru calcule? Planificat sau confirmat?
 *
 * Opereaza pe tabelul budget_items — valori enum: planned | confirmed | paid | cancelled.
 *
 * isBudgetItemActive = NOT cancelled (compose: !isBudgetItemCancelled).
 * Util pentru filtre "items vizibile" vs "items arhivate".
 */

import type { BudgetItemRow } from "@/types/budget";

export function isBudgetItemPaid(item: Pick<BudgetItemRow, "status">): boolean {
  return item.status === "paid";
}

export function isBudgetItemPlanned(item: Pick<BudgetItemRow, "status">): boolean {
  return item.status === "planned";
}

export function isBudgetItemConfirmed(item: Pick<BudgetItemRow, "status">): boolean {
  return item.status === "confirmed";
}

export function isBudgetItemCancelled(item: Pick<BudgetItemRow, "status">): boolean {
  return item.status === "cancelled";
}

export function isBudgetItemActive(item: Pick<BudgetItemRow, "status">): boolean {
  return !isBudgetItemCancelled(item);
}
