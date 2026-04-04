// =============================================================================
// lib/server-context/require-authenticated.ts
// Guards an API route handler — ensures the context is fully authenticated.
// Maps each non-authenticated status to the appropriate HTTP error response.
// =============================================================================

import { type NextResponse } from "next/server";
import type { ServerAppContext, AuthenticatedContext } from "./types";
import { errorResponse } from "@/lib/api-response";

export type RequireAuthenticatedResult =
  | { ok: true; ctx: AuthenticatedContext }
  | { ok: false; response: NextResponse };

export function requireAuthenticatedContext(
  ctx: ServerAppContext
): RequireAuthenticatedResult {
  switch (ctx.status) {
    case "authenticated":
      return { ok: true, ctx };

    case "unauthenticated":
      return {
        ok: false,
        response: errorResponse(401, "SESSION_REQUIRED", "Authentication is required."),
      };

    case "wp_unavailable":
      return {
        ok: false,
        response: errorResponse(
          503,
          "AUTH_SERVICE_UNAVAILABLE",
          "Authentication service is temporarily unavailable. Please try again."
        ),
      };

    case "provisioning_pending":
      return {
        ok: false,
        response: errorResponse(
          409,
          "PROVISIONING_PENDING",
          "Your account is being set up. Please try again in a moment."
        ),
      };

    case "provisioning_failed":
      return {
        ok: false,
        response: errorResponse(
          403,
          "PROVISIONING_FAILED",
          "Account setup failed. Please contact support."
        ),
      };
  }
}
