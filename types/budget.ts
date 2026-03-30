
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
