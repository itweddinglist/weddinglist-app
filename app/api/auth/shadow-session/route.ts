// =============================================================================
// app/api/auth/shadow-session/route.ts
// Setează cookie-ul shadow session după un bootstrap WP reușit.
//
// POST /api/auth/shadow-session
//   - Autentificat → generează JWT, setează wl_shadow (httpOnly)
//   - Neautentificat → șterge cookie-ul, 401
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getServerAppContext } from "@/lib/server-context/get-server-app-context";
import {
  generateShadowToken,
  SHADOW_COOKIE,
  SHADOW_TTL_SECONDS,
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

  const token = await generateShadowToken(ctx);

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
