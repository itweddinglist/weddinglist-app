// =============================================================================
// app/api/weddings/[weddingId]/budget/items/route.ts
// GET  — lista budget items pentru un wedding
// POST — creare budget item nou
//
// Pattern: getServerAppContext → requireAuthenticatedContext → requireWeddingAccess → query
// =============================================================================

import { type NextRequest } from "next/server";
import {
  getServerAppContext,
  requireAuthenticatedContext,
  requireWeddingAccess,
} from "@/lib/server-context";
import { checkOrigin } from "@/lib/csrf";
import { supabaseServer } from "@/app/lib/supabase/server";
import { validateCreateBudgetItem } from "@/lib/validation/budget-items";
import { isValidUuid } from "@/lib/sanitize";
import {
  successResponse,
  validationErrorResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/api-response";
import type { BudgetItemRow } from "@/types/budget";

type RouteContext = { params: Promise<{ weddingId: string }> };

// ─── GET /api/weddings/[weddingId]/budget/items ───────────────────────────────

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  const { weddingId } = await context.params;

  if (!isValidUuid(weddingId)) return errorResponse(400, "INVALID_ID", "Wedding ID must be a valid UUID.");

  const ctx = await getServerAppContext(request);
  const authResult = requireAuthenticatedContext(ctx);
  if (!authResult.ok) return authResult.response;

  const access = await requireWeddingAccess({ ctx: authResult.ctx, requestedWeddingId: weddingId, minRole: "viewer" });
  if (!access.ok) return access.response;

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");
  const VALID_STATUSES = ["planned", "confirmed", "paid", "cancelled"];

  let query = supabaseServer
    .from("budget_items")
    .select("*")
    .eq("wedding_id", weddingId)
    .order("created_at", { ascending: true });

  if (statusFilter && VALID_STATUSES.includes(statusFilter)) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) return internalErrorResponse(error, `GET budget items for wedding ${weddingId}`);

  return successResponse<BudgetItemRow[]>(data ?? []);
}

// ─── POST /api/weddings/[weddingId]/budget/items ──────────────────────────────

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  const originCheck = checkOrigin(request);
  if (originCheck) return originCheck;

  const { weddingId } = await context.params;

  if (!isValidUuid(weddingId)) return errorResponse(400, "INVALID_ID", "Wedding ID must be a valid UUID.");

  const ctx = await getServerAppContext(request);
  const authResult = requireAuthenticatedContext(ctx);
  if (!authResult.ok) return authResult.response;

  const access = await requireWeddingAccess({ ctx: authResult.ctx, requestedWeddingId: weddingId, minRole: "editor" });
  if (!access.ok) return access.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const bodyWithWeddingId =
    body && typeof body === "object"
      ? { ...(body as Record<string, unknown>), wedding_id: weddingId }
      : { wedding_id: weddingId };

  const validation = validateCreateBudgetItem(bodyWithWeddingId);
  if (!validation.valid) return validationErrorResponse(validation.errors);

  const { data, error } = await supabaseServer
    .from("budget_items")
    .insert(validation.data)
    .select()
    .single();

  if (error) return internalErrorResponse(error, `POST budget item for wedding ${weddingId}`);

  return successResponse<BudgetItemRow>(data, 201);
}
