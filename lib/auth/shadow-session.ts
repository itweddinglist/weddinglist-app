// =============================================================================
// lib/auth/shadow-session.ts
// Shadow session JWT — signed with SHADOW_SESSION_SECRET, TTL 15 minutes.
//
// SECURITY CONTRACT:
//   auth_source = "wordpress" : token was issued from a live WP bootstrap session
//   auth_source = "shadow"    : token was issued from an existing shadow session
//                               (WP was unavailable at issuance time)
//
//   absolute_issued_at: Unix timestamp (seconds) of the FIRST WP-backed issuance.
//   Preserved across refreshes. Hard ceiling: absolute_issued_at + 15 min.
//   Shadow can only extend itself ONCE (wordpress -> shadow); shadow -> shadow is rejected.
//
// IMPORTED EXCLUSIVELY FROM:
//   - app/api/auth/shadow-session/route.ts  (generation + cookie set)
//   - lib/server-context/get-server-app-context.ts  (WP-down fallback)
//
// Server-side only — do not import from client code.
// =============================================================================

import { SignJWT, jwtVerify } from "jose";
import type { AuthenticatedContext, WeddingInfo } from "@/lib/server-context/types";

export const SHADOW_COOKIE = "wl_shadow";
export const SHADOW_TTL_SECONDS = 15 * 60;
export const SHADOW_MAX_LIFETIME_SECONDS = 15 * 60;

type ShadowPayload = {
  app_user_id: string;
  wp_user_id: number;
  email: string;
  display_name: string;
  plan_tier: string | null;
  active_wedding_id: string | null;
  active_event_id: string | null;
  weddings: WeddingInfo[];
  auth_source: "wordpress" | "shadow";
  absolute_issued_at: number;
};

function getSecret(): Uint8Array {
  const secret = process.env.SHADOW_SESSION_SECRET;
  if (!secret) throw new Error("SHADOW_SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

/**
 * Signs a JWT with data from AuthenticatedContext plus auth provenance fields.
 *
 * @param ctx              - Authenticated context to encode.
 * @param auth_source      - "wordpress" if ctx came from live WP; "shadow" if from shadow fallback.
 * @param absolute_issued_at - Unix timestamp (seconds) of the original WP-backed issuance.
 *                             Pass Date.now()/1000 on first creation; preserve on subsequent tokens.
 */
export async function generateShadowToken(
  ctx: AuthenticatedContext,
  auth_source: "wordpress" | "shadow",
  absolute_issued_at: number
): Promise<string> {
  const payload: ShadowPayload = {
    app_user_id: ctx.app_user_id,
    wp_user_id: ctx.wp_user_id,
    email: ctx.email,
    display_name: ctx.display_name,
    plan_tier: ctx.plan_tier,
    active_wedding_id: ctx.active_wedding_id,
    active_event_id: ctx.active_event_id,
    weddings: ctx.weddings,
    auth_source,
    absolute_issued_at,
  };

  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SHADOW_TTL_SECONDS}s`)
    .sign(getSecret());
}

/**
 * Reads auth provenance fields from a shadow cookie without side effects.
 * Verifies signature and JWT expiry — returns null on any failure.
 * Used by the shadow-session route to inspect the existing cookie before
 * deciding whether to issue a new one.
 */
export async function readShadowPayload(token: string): Promise<{
  auth_source: "wordpress" | "shadow";
  absolute_issued_at: number;
} | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const p = payload as unknown as ShadowPayload;
    if (
      (p.auth_source !== "wordpress" && p.auth_source !== "shadow") ||
      typeof p.absolute_issued_at !== "number"
    ) {
      return null;
    }
    return { auth_source: p.auth_source, absolute_issued_at: p.absolute_issued_at };
  } catch {
    return null;
  }
}

/**
 * Verifies a shadow token and returns an AuthenticatedContext, or null.
 * null on any failure: expired JWT, invalid signature, malformed payload,
 * or absolute lifetime exceeded.
 *
 * Exposes shadow_auth_source in the returned context so callers can detect
 * whether this request is riding on a shadow session (WP unavailable).
 */
export async function verifyShadowToken(
  token: string,
  request_id: string
): Promise<AuthenticatedContext | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const p = payload as unknown as ShadowPayload;

    if (
      typeof p.app_user_id !== "string" ||
      typeof p.wp_user_id !== "number" ||
      typeof p.email !== "string" ||
      typeof p.display_name !== "string"
    ) {
      return null;
    }

    // Enforce absolute lifetime — hard ceiling from original WP-backed issuance
    if (typeof p.absolute_issued_at === "number") {
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (nowSeconds > p.absolute_issued_at + SHADOW_MAX_LIFETIME_SECONDS) {
        return null;
      }
    }

    const shadow_auth_source =
      p.auth_source === "wordpress" || p.auth_source === "shadow"
        ? p.auth_source
        : undefined;

    return {
      status: "authenticated",
      request_id,
      app_user_id: p.app_user_id,
      wp_user_id: p.wp_user_id,
      email: p.email,
      display_name: p.display_name,
      plan_tier: p.plan_tier ?? null,
      active_wedding_id: p.active_wedding_id ?? null,
      active_event_id: p.active_event_id ?? null,
      weddings: Array.isArray(p.weddings) ? p.weddings : [],
      shadow_auth_source,
    };
  } catch {
    return null;
  }
}
