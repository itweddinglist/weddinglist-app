// =============================================================================
// app/api/auth/shadow-session/route.ts
// POST /api/auth/shadow-session
//
// Issues a shadow session JWT cookie after a successful WP bootstrap.
//
// SECURITY CONTRACT — shadow session MUST NOT extend itself indefinitely:
//
//   1. If the existing shadow cookie has auth_source === "shadow":
//      the previous token was already a shadow-of-shadow extension.
//      REJECT 401 — chain stops here.
//
//   2. If the existing token's absolute_issued_at + 15 min < now:
//      the original WP-backed session window has expired.
//      REJECT 401 — no extension beyond the absolute window.
//
//   3. If ctx was derived from a shadow fallback (WP unavailable at this request):
//      new token gets auth_source = "shadow" and preserves absolute_issued_at.
//      This is the ONE allowed extension (wordpress -> shadow).
//
//   4. If ctx was derived from a live WP session:
//      new token gets auth_source = "wordpress".
//      absolute_issued_at is preserved from the existing cookie (if any and valid),
//      or set fresh if no valid existing cookie exists.
//
//   Result: total shadow session lifetime is at most 15 min from absolute_issued_at,
//   with at most one WP-down extension allowed.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getServerAppContext } from "@/lib/server-context/get-server-app-context";
import {
  generateShadowToken,
  readShadowPayload,
  SHADOW_COOKIE,
  SHADOW_TTL_SECONDS,
  SHADOW_MAX_LIFETIME_SECONDS,
} from "@/lib/auth/shadow-session";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ctx = await getServerAppContext(request);

  if (ctx.status !== "authenticated") {
    const response = NextResponse.json({ ok: false }, { status: 401 });
    response.cookies.set(SHADOW_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);

  // ── Read existing shadow cookie to enforce chain rules ─────────────────────
  const existingCookieValue = request.cookies.get(SHADOW_COOKIE)?.value;
  let absolute_issued_at = nowSeconds;

  if (existingCookieValue) {
    const existing = await readShadowPayload(existingCookieValue);

    if (existing) {
      // Rule 1: shadow can never extend shadow
      if (existing.auth_source === "shadow") {
        return NextResponse.json(
          { ok: false, error: "SHADOW_CHAIN_REJECTED" },
          { status: 401 }
        );
      }

      // Rule 2: absolute lifetime ceiling
      if (nowSeconds > existing.absolute_issued_at + SHADOW_MAX_LIFETIME_SECONDS) {
        return NextResponse.json(
          { ok: false, error: "SHADOW_LIFETIME_EXCEEDED" },
          { status: 401 }
        );
      }

      // Preserve the original WP-backed issuance timestamp
      absolute_issued_at = existing.absolute_issued_at;
    }
    // If existing token is expired/invalid: treat as no prior session — absolute_issued_at = now
  }

  // ── Determine auth_source for the new token ────────────────────────────────
  // ctx.shadow_auth_source is set iff getServerAppContext fell back to shadow
  // (WP was unavailable for this request).
  const auth_source: "wordpress" | "shadow" =
    ctx.shadow_auth_source !== undefined ? "shadow" : "wordpress";

  const token = await generateShadowToken(ctx, auth_source, absolute_issued_at);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SHADOW_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SHADOW_TTL_SECONDS,
  });

  return response;
}
