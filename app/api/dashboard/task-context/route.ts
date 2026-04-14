// =============================================================================
// app/api/dashboard/task-context/route.ts
// GET /api/dashboard/task-context
//
// Returnează datele suplimentare pentru Task Engine:
//   - has_location, has_catering, vendors_in_progress_count — din vendors
//   - payments_due_soon_count — din budget_items scadente în 14 zile
//
// Auth: getServerAppContext + requireWeddingAccess (identic cu /stats).
// DB access: supabaseServer (service_role).
// =============================================================================

import { type NextRequest } from "next/server"
import {
  getServerAppContext,
  requireAuthenticatedContext,
  requireWeddingAccess,
} from "@/lib/server-context"
import { supabaseServer } from "@/app/lib/supabase/server"
import {
  successResponse,
  internalErrorResponse,
} from "@/lib/api-response"
import type { TaskContextResponse } from "@/types/dashboard"

export async function GET(request: NextRequest): Promise<Response> {
  const ctx = await getServerAppContext(request)

  const authResult = requireAuthenticatedContext(ctx)
  if (!authResult.ok) return authResult.response

  const accessResult = await requireWeddingAccess({ ctx: authResult.ctx })
  if (!accessResult.ok) return accessResult.response

  const { wedding_id: weddingId } = accessResult

  try {
    const now = new Date().toISOString()
    const in14Days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

    const [vendorsResult, paymentsDueResult] = await Promise.all([
      supabaseServer
        .from("vendors")
        .select("category, status")
        .eq("wedding_id", weddingId),

      supabaseServer
        .from("budget_items")
        .select("id")
        .eq("wedding_id", weddingId)
        .neq("status", "paid")
        .gte("due_date", now)
        .lte("due_date", in14Days),
    ])

    if (vendorsResult.error) {
      return internalErrorResponse(vendorsResult.error, "GET /api/dashboard/task-context — vendors")
    }
    if (paymentsDueResult.error) {
      return internalErrorResponse(paymentsDueResult.error, "GET /api/dashboard/task-context — payments_due")
    }

    const vendors = vendorsResult.data ?? []

    const has_location = vendors.some(
      (v) => v.category === "location" && v.status === "booked"
    )
    const has_catering = vendors.some(
      (v) => v.category === "catering" && v.status === "booked"
    )
    const vendors_in_progress_count = vendors.filter(
      (v) => v.status === "contacted" || v.status === "meeting"
    ).length

    const payments_due_soon_count = paymentsDueResult.data?.length ?? 0

    const payload: TaskContextResponse = {
      has_location,
      has_catering,
      vendors_in_progress_count,
      payments_due_soon_count,
    }

    return successResponse(payload)
  } catch (err) {
    return internalErrorResponse(err, "GET /api/dashboard/task-context")
  }
}
