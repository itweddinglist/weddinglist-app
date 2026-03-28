// =============================================================================
// lib/auth.ts
// JWT extraction and validation for API routes.
// WordPress bridge auth: JWT `sub` claim = app_users.id (uuid)
// =============================================================================

import { type NextRequest } from "next/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AuthContext {
  userId: string;
  token: string;
}

export interface AuthError {
  status: 401;
  code: string;
  message: string;
}

export type AuthResult =
  | { authenticated: true; context: AuthContext }
  | { authenticated: false; error: AuthError };

/**
 * Extracts and validates the JWT from the Authorization header.
 *
 * Does NOT do full cryptographic verification — that's Supabase's job.
 * We extract the `sub` claim and pass the raw token to Supabase which
 * validates it against the JWT secret on every query via RLS.
 */
export function extractAuth(request: NextRequest): AuthResult {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return {
      authenticated: false,
      error: { status: 401, code: "MISSING_AUTH", message: "Authorization header is required." },
    };
  }

  if (!authHeader.startsWith("Bearer ")) {
    return {
      authenticated: false,
      error: { status: 401, code: "INVALID_AUTH_FORMAT", message: "Authorization header must use Bearer scheme." },
    };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return {
      authenticated: false,
      error: { status: 401, code: "EMPTY_TOKEN", message: "Bearer token is empty." },
    };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return {
      authenticated: false,
      error: { status: 401, code: "MALFORMED_TOKEN", message: "Token is not a valid JWT." },
    };
  }

  try {
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8");
    const payload = JSON.parse(payloadJson) as Record<string, unknown>;

    const sub = payload.sub;
    if (typeof sub !== "string" || !UUID_REGEX.test(sub)) {
      return {
        authenticated: false,
        error: { status: 401, code: "INVALID_SUB_CLAIM", message: "JWT sub claim must be a valid UUID." },
      };
    }

    // Check expiration with 30s leeway for clock skew
    const exp = payload.exp;
    if (typeof exp === "number") {
      const now = Math.floor(Date.now() / 1000);
      if (exp + 30 < now) {
        return {
          authenticated: false,
          error: { status: 401, code: "TOKEN_EXPIRED", message: "JWT has expired." },
        };
      }
    }

    return { authenticated: true, context: { userId: sub, token } };
  } catch {
    return {
      authenticated: false,
      error: { status: 401, code: "TOKEN_DECODE_ERROR", message: "Failed to decode JWT payload." },
    };
  }
}
