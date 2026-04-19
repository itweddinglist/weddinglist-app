/**
 * Budget rules — predicate pentru starea financiara a unui budget item.
 *
 * Folosit in: budget page UI, summary calculations, items API routes.
 * Contextul business: a fost platit acest item? E activ pentru calcule? Planificat sau confirmat?
 *
 * Opereaza pe tabelul budget_items — valori enum: planned | confirmed | paid | cancelled.
 *
 * isBudgetItemActive = NOT cancelled, definit cu Exclude<status, "cancelled">.
 * Implementarea e check direct (item.status !== "cancelled"), NU compozitie
 * cu !isBudgetItemCancelled — type guards nu propaga narrowing prin negare.
 * Util pentru filtre "items vizibile" vs "items arhivate".
 */

import type { BudgetItemRow } from "@/types/budget";

export function isBudgetItemPaid(
  item: Pick<BudgetItemRow, "status">,
): item is Pick<BudgetItemRow, "status"> & { status: Extract<BudgetItemRow["status"], "paid"> } {
  return item.status === "paid";
}

export function isBudgetItemPlanned(
  item: Pick<BudgetItemRow, "status">,
): item is Pick<BudgetItemRow, "status"> & { status: Extract<BudgetItemRow["status"], "planned"> } {
  return item.status === "planned";
}

export function isBudgetItemConfirmed(
  item: Pick<BudgetItemRow, "status">,
): item is Pick<BudgetItemRow, "status"> & { status: Extract<BudgetItemRow["status"], "confirmed"> } {
  return item.status === "confirmed";
}

export function isBudgetItemCancelled(
  item: Pick<BudgetItemRow, "status">,
): item is Pick<BudgetItemRow, "status"> & { status: Extract<BudgetItemRow["status"], "cancelled"> } {
  return item.status === "cancelled";
}

export function isBudgetItemActive(
  item: Pick<BudgetItemRow, "status">,
): item is Pick<BudgetItemRow, "status"> & { status: Exclude<BudgetItemRow["status"], "cancelled"> } {
  return item.status !== "cancelled";
}
