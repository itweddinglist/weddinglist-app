/**
 * Domain layer — single import point pentru consumatori.
 *
 * Usage:
 *   import { isRsvpDeclined, isBudgetItemPaid, isAttendanceAttending } from "@/lib/domain";
 *
 * Split per domeniu de business:
 * - rsvp.rules — raspunsuri formale RSVP (tabelul rsvp)
 * - attendance.rules — prezenta operationala (tabelul guest_events)
 * - budget.rules — stari financiare items (tabelul budget_items)
 * - vendor.rules — V1 pending (Voxel domain)
 *
 * Predicate pure, zero side effects, zero dependente React.
 * Contract H3 — SPEC Hard Rule #7: nicio logica de business in UI sau hooks.
 */

export * from "./rsvp.rules";
export * from "./attendance.rules";
export * from "./budget.rules";
export * from "./vendor.rules";
