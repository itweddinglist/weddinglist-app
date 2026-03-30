// =============================================================================
// app/api/weddings/[weddingId]/budget/items/[itemId]/route.ts
// GET    — un singur budget item
// PATCH  — actualizare parțială (cu state transition guard)
// DELETE — ștergere (interzisă dacă status = "paid")
//
// STANDARD 404 vs 403:
//   ID-scoped resources → 404 când resursa nu există SAU userul nu e autorizat
//   → evită leak de existență
// =============================================================================

import { type NextRequest } from "next/server";
import { extractAuth } from "@/lib/auth";
import { createAuthenticatedClient } from "@/lib/supabase-server";
import { getBudgetItemMeta } from "@/lib/authorization";
import { validateUpdateBudgetItem } from "@/lib/validation/budget-items";
import { isValidUuid } from "@/lib/sanitize";
import {
  successResponse,
  authErrorResponse,
  notFoundResponse,
  validationErrorResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/api-response";
import type { BudgetItemRow, BudgetItemStatus } from "@/types/budget";

type RouteContext = { params: Promise<{ weddingId: string; itemId: string }> };

// ─── GET /api/weddings/[weddingId]/budget/items/[itemId] ─────────────────────

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  const { weddingId, itemId } = await context.params;

  if (!isValidUuid(weddingId)) return errorResponse(400, "INVALID_ID", "Wedding ID must be a valid UUID.");
  if (!isValidUuid(itemId)) return errorResponse(400, "INVALID_ID", "Item ID must be a valid UUID.");

  const auth = extractAuth(request);
  if (!auth.authenticated) return authErrorResponse(auth.error.code, auth.error.message);

  const supabase = createAuthenticatedClient(auth.context.token);

  const { data, error } = await supabase
    .from("budget_items")
    .select("*")
    .eq("id", itemId)
    .eq("wedding_id", weddingId)
    .maybeSingle();

  if (error) return internalErrorResponse(error, `GET budget item ${itemId}`);
  if (!data) return notFoundResponse("Budget item");

  return successResponse<BudgetItemRow>(data);
}

// ─── PATCH /api/weddings/[weddingId]/budget/items/[itemId] ───────────────────

export async function PATCH(request: NextRequest, context: RouteContext): Promise<Response> {
  const { weddingId, itemId } = await context.params;

  if (!isValidUuid(weddingId)) return errorResponse(400, "INVALID_ID", "Wedding ID must be a valid UUID.");
  if (!isValidUuid(itemId)) return errorResponse(400, "INVALID_ID", "Item ID must be a valid UUID.");

  const auth = extractAuth(request);
  if (!auth.authenticated) return authErrorResponse(auth.error.code, auth.error.message);

  const supabase = createAuthenticatedClient(auth.context.token);

  const meta = await getBudgetItemMeta(supabase, itemId);
  if (!meta || meta.wedding_id !== weddingId) return notFoundResponse("Budget item");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const validation = validateUpdateBudgetItem(body, meta.status as BudgetItemStatus);
  if (!validation.valid) return validationErrorResponse(validation.errors);

  const { data, error } = await supabase
    .from("budget_items")
    .update({ ...validation.data, updated_at: new Date().toISOString() })
    .eq("id", itemId)
    .eq("wedding_id", weddingId)
    .select()
    .single();

  if (error) return internalErrorResponse(error, `PATCH budget item ${itemId}`);
  if (!data) return notFoundResponse("Budget item");

  return successResponse<BudgetItemRow>(data);
}

// ─── DELETE /api/weddings/[weddingId]/budget/items/[itemId] ──────────────────
// PRODUCT RULE: items cu status "paid" nu pot fi șterse prin UI.

export async function DELETE(request: NextRequest, context: RouteContext): Promise<Response> {
  const { weddingId, itemId } = await context.params;

  if (!isValidUuid(weddingId)) return errorResponse(400, "INVALID_ID", "Wedding ID must be a valid UUID.");
  if (!isValidUuid(itemId)) return errorResponse(400, "INVALID_ID", "Item ID must be a valid UUID.");

  const auth = extractAuth(request);
  if (!auth.authenticated) return authErrorResponse(auth.error.code, auth.error.message);

  const supabase = createAuthenticatedClient(auth.context.token);

  const meta = await getBudgetItemMeta(supabase, itemId);
  if (!meta || meta.wedding_id !== weddingId) return notFoundResponse("Budget item");

  if (meta.status === "paid") {
    return validationErrorResponse([
      {
        field: "status",
        message: "Un item plătit nu poate fi șters. Contactați suportul pentru corecții.",
      },
    ]);
  }

  const { error } = await supabase
    .from("budget_items")
    .delete()
    .eq("id", itemId)
    .eq("wedding_id", weddingId);

  if (error) return internalErrorResponse(error, `DELETE budget item ${itemId}`);

  return successResponse<{ id: string }>({ id: itemId });
}
