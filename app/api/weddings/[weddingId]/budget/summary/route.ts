// =============================================================================
// app/api/weddings/[weddingId]/budget/summary/route.ts
// GET — derived totals pentru bugetul unui wedding
//
// Logica de calcul este în lib/budget/calculate-summary.ts (funcție pură testabilă).
//
// V1 LIMITATION: multi-currency — totalurile sunt calculate pe toate items
// indiferent de currency. has_mixed_currencies = true semnalează UI-ul să
// afișeze un warning.
//
// Pattern: getServerAppContext → requireAuthenticatedContext → requireWeddingAccess → query
// =============================================================================

import { type NextRequest } from "next/server";
import {
  getServerAppContext,
  requireAuthenticatedContext,
  requireWeddingAccess,
} from "@/lib/server-context";
import { supabaseServer } from "@/app/lib/supabase/server";
import { isValidUuid } from "@/lib/sanitize";
import { calculateBudgetSummary } from "@/lib/budget/calculate-summary";
import {
  successResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/api-response";
import type { BudgetSummary } from "@/types/budget";

type RouteContext = { params: Promise<{ weddingId: string }> };

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  const { weddingId } = await context.params;

  if (!isValidUuid(weddingId)) {
    return errorResponse(400, "INVALID_ID", "Wedding ID must be a valid UUID.");
  }

  const ctx = await getServerAppContext(request);
  const authResult = requireAuthenticatedContext(ctx);
  if (!authResult.ok) return authResult.response;

  const access = await requireWeddingAccess({ ctx: authResult.ctx, requestedWeddingId: weddingId });
  if (!access.ok) return access.response;

  // Fetch budget_items
  const { data: items, error: itemsError } = await supabaseServer
    .from("budget_items")
    .select("estimated_amount, actual_amount, status, currency")
    .eq("wedding_id", weddingId);

  if (itemsError) {
    return internalErrorResponse(itemsError, `GET budget summary items for wedding ${weddingId}`);
  }

  // Fetch payments
  const { data: payments, error: paymentsError } = await supabaseServer
    .from("payments")
    .select("amount")
    .eq("wedding_id", weddingId);

  if (paymentsError) {
    return internalErrorResponse(paymentsError, `GET budget summary payments for wedding ${weddingId}`);
  }

  const summary = calculateBudgetSummary(items ?? [], payments ?? []);

  return successResponse<BudgetSummary>(summary);
}
