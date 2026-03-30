// =============================================================================
// app/api/weddings/[weddingId]/budget/items/[itemId]/payments/[paymentId]/route.ts
// DELETE — ștergere payment
//
// PRODUCT RULE:
//   DELETE permis doar dacă budget_item.status IN (planned, confirmed).
//   Motivație: integritate istorică — un item paid sau cancelled are
//   payments care trebuie să rămână ca audit trail.
//
// STANDARD 404:
//   ID-scoped → 404 când resursa nu există SAU userul nu e autorizat.
//   Evită leak de existență.
// =============================================================================

import { type NextRequest } from "next/server";
import { extractAuth } from "@/lib/auth";
import { createAuthenticatedClient } from "@/lib/supabase-server";
import { getBudgetItemMeta } from "@/lib/authorization";
import { isValidUuid } from "@/lib/sanitize";
import {
  successResponse,
  authErrorResponse,
  notFoundResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/api-response";

type RouteContext = { params: Promise<{ weddingId: string; itemId: string; paymentId: string }> };

// ─── DELETE /api/weddings/[weddingId]/budget/items/[itemId]/payments/[paymentId]

export async function DELETE(request: NextRequest, context: RouteContext): Promise<Response> {
  const { weddingId, itemId, paymentId } = await context.params;

  if (!isValidUuid(weddingId)) return errorResponse(400, "INVALID_ID", "Wedding ID must be a valid UUID.");
  if (!isValidUuid(itemId)) return errorResponse(400, "INVALID_ID", "Item ID must be a valid UUID.");
  if (!isValidUuid(paymentId)) return errorResponse(400, "INVALID_ID", "Payment ID must be a valid UUID.");

  const auth = extractAuth(request);
  if (!auth.authenticated) return authErrorResponse(auth.error.code, auth.error.message);

  const supabase = createAuthenticatedClient(auth.context.token);

  // Verifică existență + ownership budget_item (RLS)
  const meta = await getBudgetItemMeta(supabase, itemId);
  if (!meta || meta.wedding_id !== weddingId) return notFoundResponse("Budget item");

  // PRODUCT RULE: DELETE permis doar pe items planned sau confirmed
  if (meta.status !== "planned" && meta.status !== "confirmed") {
    return errorResponse(
      409,
      "ITEM_NOT_EDITABLE",
      `Nu poți șterge o plată de pe un item cu statusul "${meta.status}".`
    );
  }

  // Verifică că payment-ul există și aparține acestui budget_item + wedding
  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("id")
    .eq("id", paymentId)
    .eq("budget_item_id", itemId)
    .eq("wedding_id", weddingId)
    .maybeSingle();

  if (fetchError) return internalErrorResponse(fetchError, `DELETE payment ${paymentId} — fetch`);
  if (!payment) return notFoundResponse("Payment");

  // Delete
  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("id", paymentId)
    .eq("budget_item_id", itemId)
    .eq("wedding_id", weddingId);

  if (error) return internalErrorResponse(error, `DELETE payment ${paymentId}`);

  return successResponse<{ id: string }>({ id: paymentId });
}
