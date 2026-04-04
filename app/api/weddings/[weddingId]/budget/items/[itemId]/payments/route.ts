// =============================================================================
// app/api/weddings/[weddingId]/budget/items/[itemId]/payments/route.ts
// GET  — lista payments pentru un budget item
// POST — creare payment nou
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
import { validateCreatePayment } from "@/lib/validation/payments";
import { isValidUuid } from "@/lib/sanitize";
import {
  successResponse,
  notFoundResponse,
  validationErrorResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/api-response";
import type { PaymentRow } from "@/types/budget";

type RouteContext = { params: Promise<{ weddingId: string; itemId: string }> };

// ─── GET /api/weddings/[weddingId]/budget/items/[itemId]/payments ─────────────
// Returnează toate payments pentru un budget item, ordonate după created_at ASC.

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  const { weddingId, itemId } = await context.params;

  if (!isValidUuid(weddingId)) return errorResponse(400, "INVALID_ID", "Wedding ID must be a valid UUID.");
  if (!isValidUuid(itemId)) return errorResponse(400, "INVALID_ID", "Item ID must be a valid UUID.");

  const ctx = await getServerAppContext(request);
  const authResult = requireAuthenticatedContext(ctx);
  if (!authResult.ok) return authResult.response;

  const access = await requireWeddingAccess({ ctx: authResult.ctx, requestedWeddingId: weddingId });
  if (!access.ok) return access.response;

  const { data: meta, error: metaError } = await supabaseServer
    .from("budget_items")
    .select("wedding_id, status")
    .eq("id", itemId)
    .maybeSingle();

  if (metaError) return internalErrorResponse(metaError, `GET payments for item ${itemId} — meta`);
  if (!meta || meta.wedding_id !== weddingId) return notFoundResponse("Budget item");

  const { data, error } = await supabaseServer
    .from("payments")
    .select("*")
    .eq("budget_item_id", itemId)
    .eq("wedding_id", weddingId)
    .order("created_at", { ascending: true });

  if (error) return internalErrorResponse(error, `GET payments for item ${itemId}`);

  return successResponse<PaymentRow[]>(data ?? []);
}

// ─── POST /api/weddings/[weddingId]/budget/items/[itemId]/payments ────────────
// Creare payment nou.
// wedding_id și budget_item_id sunt injectate din URL — nu din body.
//
// PRODUCT RULE: POST permis doar dacă budget_item.status IN (planned, confirmed).
// Un item paid sau cancelled nu mai acceptă payments noi.

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  const { weddingId, itemId } = await context.params;

  if (!isValidUuid(weddingId)) return errorResponse(400, "INVALID_ID", "Wedding ID must be a valid UUID.");
  if (!isValidUuid(itemId)) return errorResponse(400, "INVALID_ID", "Item ID must be a valid UUID.");

  const ctx = await getServerAppContext(request);
  const authResult = requireAuthenticatedContext(ctx);
  if (!authResult.ok) return authResult.response;

  const access = await requireWeddingAccess({ ctx: authResult.ctx, requestedWeddingId: weddingId });
  if (!access.ok) return access.response;

  // Verifică existență + ownership + status
  const { data: meta, error: metaError } = await supabaseServer
    .from("budget_items")
    .select("wedding_id, status")
    .eq("id", itemId)
    .maybeSingle();

  if (metaError) return internalErrorResponse(metaError, `POST payment for item ${itemId} — meta`);
  if (!meta || meta.wedding_id !== weddingId) return notFoundResponse("Budget item");

  // PRODUCT RULE: payments noi doar pe items planned sau confirmed
  if (meta.status !== "planned" && meta.status !== "confirmed") {
    return errorResponse(
      409,
      "ITEM_NOT_EDITABLE",
      `Nu poți adăuga o plată pe un item cu statusul "${meta.status}".`
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  // Injectează wedding_id și budget_item_id din URL — sursa de adevăr = URL
  const bodyWithIds =
    body && typeof body === "object"
      ? {
          ...(body as Record<string, unknown>),
          wedding_id: weddingId,
          budget_item_id: itemId,
        }
      : { wedding_id: weddingId, budget_item_id: itemId };

  const validation = validateCreatePayment(bodyWithIds);
  if (!validation.valid) return validationErrorResponse(validation.errors);

  const { data, error } = await supabaseServer
    .from("payments")
    .insert(validation.data)
    .select()
    .single();

  if (error) {
    if (error.code === "23514") return errorResponse(400, "CONSTRAINT_VIOLATION", "Data violates a database constraint.");
    if (error.code === "23503") return errorResponse(400, "FK_VIOLATION", "budget_item_id does not exist.");
    return internalErrorResponse(error, `POST payment for item ${itemId}`);
  }

  return successResponse<PaymentRow>(data, 201);
}
