// =============================================================================
// lib/server-context/require-wedding-access.ts
// Guards a wedding-scoped API route — verifies membership and minimum role.
// Uses supabaseServer (service role) AFTER auth is confirmed.
// Role hierarchy: owner > partner > planner > editor > viewer
// =============================================================================

import { type NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabase/server";
import type { AuthenticatedContext, WeddingAccess } from "./types";
import { ROLE_HIERARCHY } from "./types";
import { errorResponse, internalErrorResponse } from "@/lib/api-response";

type RequireWeddingAccessParams = {
  ctx: AuthenticatedContext;
  requestedWeddingId?: string;
  minRole?: string;
};

export type RequireWeddingAccessResult =
  | { ok: true; wedding_id: string; role: string }
  | { ok: false; response: NextResponse };

// Narrow the Supabase row to the shape we expect
function isMemberRow(data: unknown): data is { role: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    "role" in data &&
    typeof (data as { role: unknown }).role === "string"
  );
}

export async function requireWeddingAccess({
  ctx,
  requestedWeddingId,
  minRole = "viewer",
}: RequireWeddingAccessParams): Promise<RequireWeddingAccessResult> {
  const weddingId = requestedWeddingId ?? ctx.active_wedding_id;

  if (!weddingId) {
    return {
      ok: false,
      response: errorResponse(
        400,
        "WEDDING_ID_REQUIRED",
        "No active wedding found. Please select a wedding."
      ),
    };
  }

  const { data, error } = await supabaseServer
    .from("wedding_members")
    .select("role")
    .eq("wedding_id", weddingId)
    .eq("user_id", ctx.app_user_id)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      response: internalErrorResponse(error, "requireWeddingAccess — membership query"),
    };
  }

  if (!isMemberRow(data)) {
    return {
      ok: false,
      response: errorResponse(
        403,
        "FORBIDDEN",
        "You are not a member of this wedding."
      ),
    };
  }

  const memberRank = ROLE_HIERARCHY[data.role] ?? 0;
  const requiredRank = ROLE_HIERARCHY[minRole] ?? 0;

  if (memberRank < requiredRank) {
    return {
      ok: false,
      response: errorResponse(
        403,
        "INSUFFICIENT_ROLE",
        `This action requires the '${minRole}' role or higher.`
      ),
    };
  }

  const result: WeddingAccess = { wedding_id: weddingId, role: data.role };
  return { ok: true, ...result };
}
