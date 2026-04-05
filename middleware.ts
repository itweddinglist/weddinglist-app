// =============================================================================
// middleware.ts
// RSVP Abuse Protection — sliding window rate limiting via Upstash Redis
// Fail-open: Redis indisponibil → request permis, log RATE_LIMIT_STORE_UNAVAILABLE
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ─── Redis + Limitere ─────────────────────────────────────────────────────────

const redis = Redis.fromEnv();

/** /rsvp/[public_link_id] — 20 req/min per IP */
const pageRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  prefix: "rl:rsvp_page",
  ephemeralCache: new Map(),
});

/** /api/rsvp/* — 5 req/min per (IP + segment hash) */
const apiRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "rl:rsvp_api",
  ephemeralCache: new Map(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function sha256hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function resolveIp(req: NextRequest): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null
  );
}

async function getIdentifier(req: NextRequest): Promise<string> {
  const ip = resolveIp(req);
  if (ip) return ip;
  // Fallback: hash of User-Agent + Accept-Language (nicio PII stocată)
  const ua = req.headers.get("user-agent") ?? "";
  const lang = req.headers.get("accept-language") ?? "";
  return sha256hex(ua + lang);
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  const timestamp = new Date().toISOString();

  // /rsvp/[public_link_id] — pagina publică
  const isRsvpPage = /^\/rsvp\/[^/]+\/?$/.test(pathname);
  // /api/rsvp/[public_link_id] sau /api/rsvp/invitations
  const isRsvpApi = /^\/api\/rsvp\/[^/]+\/?$/.test(pathname);

  if (!isRsvpPage && !isRsvpApi) {
    return NextResponse.next();
  }

  try {
    const identifier = await getIdentifier(req);
    let key: string;
    let limiter: Ratelimit;

    if (isRsvpPage) {
      // Per IP
      key = identifier;
      limiter = pageRatelimit;
    } else {
      // Per (IP + sha256(url_segment)) — isolează bucket per public_link_id / invitations
      const segment = pathname.split("/")[3] ?? "";
      key = await sha256hex(identifier + ":" + segment);
      limiter = apiRatelimit;
    }

    const { success } = await limiter.limit(key);

    if (!success) {
      console.log(
        JSON.stringify({
          event: "RATE_LIMIT_HIT",
          key_hash: await sha256hex(key),
          route: pathname,
          timestamp,
        })
      );
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: "Prea multe încercări. Încearcă din nou în curând.",
          },
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch {
    // Fail-open — Redis indisponibil nu blochează utilizatorii legitimi
    console.log(
      JSON.stringify({
        event: "RATE_LIMIT_STORE_UNAVAILABLE",
        route: pathname,
        timestamp,
      })
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Aplică DOAR pe rutele RSVP; exclude /_next, assets statice, favicon
    "/rsvp/:path+",
    "/api/rsvp/:path+",
  ],
};
