// =============================================================================
// lib/api/with-auth.ts
// Higher-order utility for wedding-scoped API route handlers.
//
// Encapsulates the standard auth chain:
//   getServerAppContext → requireAuthenticatedContext → requireWeddingAccess
//
// Usage:
//   export async function GET(request: NextRequest, context: RouteContext) {
//     const { weddingId } = await context.params;
//     return withAuthHandler(request, weddingId);
//   }
//   const withAuthHandler = withAuth(
//     { minRole: "viewer", route: "GET /api/weddings/[weddingId]/..." },
//     async (request, { ctx, wedding_id, role }) => { ... }
//   );
// =============================================================================

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getServerAppContext,
  requireAuthenticatedContext,
  requireWeddingAccess,
  ROLE_HIERARCHY,
} from "@/lib/server-context";
import type { AuthenticatedContext } from "@/lib/server-context";

// ─── Public Types ────────────────────────────────────────────────────────────

export type HandlerParams = {
  /** Fully authenticated context — identity is verified server-side via WP bootstrap. */
  ctx: AuthenticatedContext;
  /** Wedding ID resolved from membership check (never from client body). */
  wedding_id: string;
  /** Caller's role in this wedding (e.g. "editor", "owner"). */
  role: string;
};

type WithAuthOptions = {
  /** Minimum role required for this handler (enforced by requireWeddingAccess). */
  minRole: string;
  /** Route label used in error logging (e.g. "GET /api/weddings/[weddingId]/budget"). */
  route: string;
};

// ─── assertRole ──────────────────────────────────────────────────────────────

/**
 * Validates that the caller's role meets the required minimum.
 * Use inside handlers for finer-grained checks beyond the outer minRole guard.
 *
 * Returns void if the check passes.
 * Returns a 403 NextResponse if the role is insufficient — caller must return it.
 *
 * Explicit validation, not a cast: reads ROLE_HIERARCHY to compare ranks.
 */
export function assertRole(
  actualRole: string,
  requiredRole: string
): NextResponse | null {
  const actualRank = ROLE_HIERARCHY[actualRole] ?? 0;
  const requiredRank = ROLE_HIERARCHY[requiredRole] ?? 0;

  if (actualRank < requiredRank) {
    return NextResponse.json(
      {
        error: {
          code: "INSUFFICIENT_ROLE",
          message: `This action requires the '${requiredRole}' role or higher.`,
        },
      },
      { status: 403 }
    );
  }

  return null;
}

// ─── withAuth ────────────────────────────────────────────────────────────────

/**
 * Wraps a wedding-scoped handler with the standard auth + access chain.
 *
 * Returns an async function that:
 *  1. Resolves server app context (WP bootstrap / shadow session)
 *  2. Asserts authenticated status (401/503/409/403 on failure)
 *  3. Asserts wedding membership + minimum role (403 on failure)
 *  4. Calls the handler with { ctx, wedding_id, role }
 *  5. Catches unexpected errors → logs structured context, returns generic 500
 *
 * @param options - minRole and route label for logging
 * @param handler - the actual route logic, receives (request, HandlerParams)
 * @returns async (request, weddingId?) → Response
 */
export function withAuth(
  { minRole, route }: WithAuthOptions,
  handler: (request: NextRequest, params: HandlerParams) => Promise<Response>
): (request: NextRequest, weddingId?: string) => Promise<Response> {
  return async (request: NextRequest, weddingId?: string): Promise<Response> => {
    let resolvedUserId: string | undefined;
    let resolvedWeddingId: string | undefined;

    try {
      const ctx = await getServerAppContext(request);

      const authResult = requireAuthenticatedContext(ctx);
      if (!authResult.ok) return authResult.response;

      resolvedUserId = authResult.ctx.app_user_id;

      const accessResult = await requireWeddingAccess({
        ctx: authResult.ctx,
        requestedWeddingId: weddingId,
        minRole,
      });
      if (!accessResult.ok) return accessResult.response;

      resolvedWeddingId = accessResult.wedding_id;

      return await handler(request, {
        ctx: authResult.ctx,
        wedding_id: accessResult.wedding_id,
        role: accessResult.role,
      });
    } catch (err) {
      console.error("[withAuth] Unexpected error", {
        route,
        wedding_id: resolvedWeddingId ?? "unknown",
        user_id: resolvedUserId ?? "unknown",
        error: err,
      });
      return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
    }
  };
}
