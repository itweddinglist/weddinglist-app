// =============================================================================
// lib/auth/shadow-session.ts
// Shadow session JWT — signed with SHADOW_SESSION_SECRET, TTL 15 minutes.
//
// IMPORTAT EXCLUSIV DIN:
//   - app/api/auth/shadow-session/route.ts  (generare + cookie set)
//   - lib/server-context/get-server-app-context.ts  (fallback WP down)
//
// Server-side only — nu importa din client code.
// =============================================================================

import { SignJWT, jwtVerify } from "jose";
import type { AuthenticatedContext, WeddingInfo } from "@/lib/server-context/types";

export const SHADOW_COOKIE = "wl_shadow";
export const SHADOW_TTL_SECONDS = 15 * 60; // 15 minute — strict

type ShadowPayload = {
  app_user_id: string;
  wp_user_id: number;
  email: string;
  display_name: string;
  plan_tier: string | null;
  active_wedding_id: string | null;
  active_event_id: string | null;
  weddings: WeddingInfo[];
};

function getSecret(): Uint8Array {
  const secret = process.env.SHADOW_SESSION_SECRET;
  if (!secret) throw new Error("SHADOW_SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

/**
 * Semnează un JWT cu datele din AuthenticatedContext.
 * TTL strict 15 minute — după expirare verifyShadowToken returnează null.
 */
export async function generateShadowToken(
  ctx: AuthenticatedContext
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
  };

  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SHADOW_TTL_SECONDS}s`)
    .sign(getSecret());
}

/**
 * Verifică shadow token și returnează AuthenticatedContext sau null.
 * null la orice eroare: expirat, semnătură invalidă, payload malformat.
 * Nu există fallback silențios — null înseamnă sesiune expirată.
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
    };
  } catch {
    // Expirat, semnătură invalidă, malformat → null, fără fallback
    return null;
  }
}
