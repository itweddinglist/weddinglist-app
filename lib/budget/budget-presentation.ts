/**
 * Budget presentation helpers.
 *
 * Separă logica UI (labels + colors + transitions) de business
 * logic (predicate în lib/domain/budget.rules.ts).
 *
 * Pattern: Sub-opțiunea B (HANDOFF.md L4) — UI consumers folosesc
 * CSS vars direct (var(--color-X)). Hex variants NU sunt necesare
 * (zero consumeri non-DOM Budget — verificat PAS 1.5).
 *
 * Foundation pentru rescriere TS viitoare a app/budget/page.tsx.
 */

import type { BudgetItemStatus } from "@/types/budget";

/**
 * Labels Budget status în română.
 * Folosit în UI badges, dropdowns, dialog-uri.
 */
export const BUDGET_STATUS_LABELS: Record<BudgetItemStatus, string> = {
  planned: "Planificat",
  confirmed: "Confirmat",
  paid: "Plătit",
  cancelled: "Anulat",
};

/**
 * Returnează label RO pentru un Budget status.
 */
export function getBudgetStatusLabel(status: BudgetItemStatus): string {
  return BUDGET_STATUS_LABELS[status];
}

/**
 * Tuple culori pentru un Budget status (consumed by DOM components).
 *
 * Mapping semantic:
 *   - paid      → success (verde)
 *   - confirmed → info (albastru)
 *   - planned   → warning (galben)
 *   - cancelled → neutral (gri)
 *
 * Fiecare CSS var e definit în app/globals.css.
 */
export type BudgetStatusColorVar = {
  /** Border + main color (var(--color-X)) */
  border: string;
  /** Text dark variant pentru contrast pe -soft bg (var(--color-X-text)) */
  text: string;
  /** Background tint cu alpha 12% (var(--color-X-soft)) */
  bg: string;
};

export const BUDGET_STATUS_COLORS_VAR: Record<BudgetItemStatus, BudgetStatusColorVar> = {
  paid: {
    border: "var(--color-success)",
    text: "var(--color-success-text)",
    bg: "var(--color-success-soft)",
  },
  confirmed: {
    border: "var(--color-info)",
    text: "var(--color-info-text)",
    bg: "var(--color-info-soft)",
  },
  planned: {
    border: "var(--color-warning)",
    text: "var(--color-warning-text)",
    bg: "var(--color-warning-soft)",
  },
  cancelled: {
    border: "var(--color-neutral)",
    text: "var(--color-neutral-text)",
    bg: "var(--color-neutral-soft)",
  },
};

/**
 * Returnează tuple culori (border + text + bg) pentru un Budget status.
 */
export function getBudgetStatusColorVar(status: BudgetItemStatus): BudgetStatusColorVar {
  return BUDGET_STATUS_COLORS_VAR[status];
}

/**
 * State machine: o tranziție validă de status, cu label CTA.
 *
 * Used in dropdown "Schimbă status" — buton afișează `label`,
 * iar la click setează `to`.
 */
export type BudgetStatusTransition = {
  to: BudgetItemStatus;
  label: string;
};

/**
 * State machine: tranziții valide pentru Budget status.
 *
 * Reguli business actuale (source of truth = app/budget/page.tsx):
 *   - planned   → confirmed | cancelled
 *   - confirmed → paid | cancelled
 *   - paid      → [] (terminal)
 *   - cancelled → [] (terminal)
 *
 * Reactivare paid/cancelled = decizie produs viitoare. Modificarea
 * tranzițiilor cere update în:
 *   - acest map
 *   - testele isValidBudgetStatusTransition (negative cases)
 *   - eventual schema DB constraints
 */
export const BUDGET_STATUS_TRANSITIONS: Record<BudgetItemStatus, readonly BudgetStatusTransition[]> = {
  planned: [
    { to: "confirmed", label: "Confirmă" },
    { to: "cancelled", label: "Anulează" },
  ],
  confirmed: [
    { to: "paid", label: "Marchează plătit" },
    { to: "cancelled", label: "Anulează" },
  ],
  paid: [],
  cancelled: [],
};

/**
 * Returnează lista tranzițiilor valide din statusul curent.
 */
export function getBudgetStatusTransitions(
  from: BudgetItemStatus,
): readonly BudgetStatusTransition[] {
  return BUDGET_STATUS_TRANSITIONS[from];
}

/**
 * Verifică dacă o tranziție de status e validă.
 */
export function isValidBudgetStatusTransition(
  from: BudgetItemStatus,
  to: BudgetItemStatus,
): boolean {
  return BUDGET_STATUS_TRANSITIONS[from].some((t) => t.to === to);
}