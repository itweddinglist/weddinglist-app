// =============================================================================
// types/budget.ts
// Types for Budget module (Faza 5).
// Aligned with initial_schema.sql — budget_items + payments tables.
// =============================================================================

import type { ApiSuccessResponse, ValidationError } from "./guests";

// ─── Enums ────────────────────────────────────────────────────────────────────

export type BudgetItemStatus = "planned" | "confirmed" | "paid" | "cancelled";

// ─── DB Row shapes (snake_case = Supabase) ────────────────────────────────────

export interface BudgetItemRow {
  id: string;
  wedding_id: string;
  vendor_id: string | null;
  name: string;
  category: string | null;
  estimated_amount: number;
  actual_amount: number | null;
  currency: string;
  status: BudgetItemStatus;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
  id: string;
  wedding_id: string;
  budget_item_id: string;
  amount: number;
  currency: string;
  paid_at: string | null;
  payment_method: string | null;
  note: string | null;
  created_at: string;
}

// ─── Budget Summary ───────────────────────────────────────────────────────────

export interface BudgetSummary {
  total_estimated: number;
  total_actual: number;
  total_paid: number;
  total_remaining: number;
  items_count: number;
  items_by_status: {
    planned: number;
    confirmed: number;
    paid: number;
    cancelled: number;
  };
  currency: string;
  has_mixed_currencies: boolean;
}

// ─── API Response types ───────────────────────────────────────────────────────

export type BudgetItemResponse = ApiSuccessResponse<BudgetItemRow>;
export type BudgetItemListResponse = ApiSuccessResponse<BudgetItemRow[]>;

export type { ApiSuccessResponse, ValidationError };
