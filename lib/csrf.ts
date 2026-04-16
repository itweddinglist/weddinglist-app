// =============================================================================
// lib/csrf.ts
// Origin-based CSRF protection for mutating API routes.
//
// SameSite=Strict on auth cookies provides primary protection.
// This origin check adds defense-in-depth for cross-origin mutation attempts.
//
// Policy:
//   - Origin header absent  → allow (server-to-server, curl, Postman, tests)
//   - Origin header present → must match the allowed list, else 403
// =============================================================================

import type { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api-response";
import type { NextResponse } from "next/server";
import type { ApiErrorResponse } from "@/types/guests";

function getAllowedOrigins(): Set<string> {
  const productionOrigin =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://app.weddinglist.ro";
  return new Set([
    "http://localhost:3000",
    "http://localhost:3001",
    productionOrigin,
  ]);
}

/**
 * Checks the Origin header against the allowed-origins list.
 *
 * Returns null if the request is allowed.
 * Returns a 403 NextResponse if the origin is present but not allowed.
 *
 * Call this as the first check inside any mutating handler (POST/PATCH/DELETE).
 */
export function checkOrigin(
  request: NextRequest
): NextResponse<ApiErrorResponse> | null {
  const origin = request.headers.get("origin");

  // No Origin header — server-to-server, native apps, curl, etc. — allow.
  if (!origin) return null;

  if (!getAllowedOrigins().has(origin)) {
    return errorResponse(
      403,
      "FORBIDDEN_ORIGIN",
      "Cross-origin request not allowed."
    );
  }

  return null;
}
