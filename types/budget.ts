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
  currency: string;             // char(3), ex: "RON", "EUR"
  status: BudgetItemStatus;
  due_date: string | null;      // date → ISO string "YYYY-MM-DD"
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
  id: string;
  wedding_id: string;
  budget_item_id: string;
  amount: number;
  currency: string;             // char(3)
  paid_at: string | null;       // date → ISO string "YYYY-MM-DD"
  payment_method: string | null;
  note: string | null;          // singular — așa e în schema
  created_at: string;
}

// ─── Budget Summary (5.3) ─────────────────────────────────────────────────────

export interface BudgetSummary {
  // Totaluri financiare
  total_estimated: number;       // SUM(estimated_amount) items active (exclus cancelled)
  total_actual: number;          // SUM(actual_amount) items unde actual_amount NOT NULL
  total_paid: number;            // SUM(amount) din payments
  total_remaining: number;       // total_estimated - total_paid

  // Contoare
  items_count: number;           // total items (inclusiv cancelled)
  items_by_status: {
    planned: number;
    confirmed: number;
    paid: number;
    cancelled: number;
  };

  // Currency
  currency: string;              // currency-ul primului item găsit (default "RON")
  has_mixed_currencies: boolean; // true dacă există items cu currency diferit
}

// ─── API Response types ───────────────────────────────────────────────────────

export type BudgetItemResponse = ApiSuccessResponse<BudgetItemRow>;
export type BudgetItemListResponse = ApiSuccessResponse<BudgetItemRow[]>;
export type BudgetSummaryResponse = ApiSuccessResponse<BudgetSummary>;

// Re-export pentru conveniență în routes
export type { ApiSuccessResponse, ValidationError };
