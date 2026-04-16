// =============================================================================
// app/api/auth/provision/route.ts
// POST /api/auth/provision
//
// Creates (or idempotently confirms) the app_user + identity_link records for
// a WordPress-authenticated user.
//
// SECURITY CONTRACT:
//   - wp_user_id and email are NEVER accepted from the request body.
//   - Identity is derived exclusively from the verified WordPress session via
//     getServerAppContext, which calls WP bootstrap server-to-server using the
//     wordpress_logged_in_* cookie forwarded from the browser.
//   - Calling this endpoint without a valid WP cookie is impossible — the guard
//     rejects unauthenticated and wp_unavailable contexts before any DB write.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabase/server";
import { rateLimit, getClientIp } from "@/app/lib/rate-limit";
import { getServerAppContext } from "@/lib/server-context";
import { requireProvisionableContext } from "@/lib/server-context/require-provisionable-context";
import { checkOrigin } from "@/lib/csrf";

export const runtime = "nodejs";

const RATE_LIMIT = { limit: 10, windowMs: 60_000 };

type ProvisionResponse =
  | { ok: true; app_user_id: string; provisioning_status: "ready" | "already_provisioned" }
  | { ok: false; error: string };

export async function POST(
  req: NextRequest
): Promise<NextResponse<ProvisionResponse>> {
  // Origin check — before rate limiting and auth
  const originCheck = checkOrigin(req);
  if (originCheck) return originCheck as unknown as NextResponse<ProvisionResponse>;

  // Rate limiting — before any auth to prevent timing-based enumeration
  const ip = getClientIp(req);
  const rl = rateLimit(`provision:${ip}`, RATE_LIMIT);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests" },
      { status: 429 }
    );
  }

  // Auth — verifies WP session server-to-server; extracts wp_user_id + email
  // from WP bootstrap response. No client body fields trusted for identity.
  const ctx = await getServerAppContext(req);
  const provisionable = requireProvisionableContext(ctx);
  if (!provisionable.ok) {
    return provisionable.response as NextResponse<ProvisionResponse>;
  }

  const { identity, already_provisioned } = provisionable;

  // Idempotent path — already fully provisioned, nothing to do
  if (already_provisioned) {
    return NextResponse.json({
      ok: true,
      app_user_id: identity.app_user_id,
      provisioning_status: "already_provisioned",
    });
  }

  try {
    // 1. Upsert app_user — id and email come exclusively from verified WP context
    const { data: user, error: userError } = await supabaseServer
      .from("app_users")
      .upsert(
        { id: identity.app_user_id, email: identity.email },
        { onConflict: "id" }
      )
      .select("id")
      .single();

    if (userError || !user) {
      console.error("[provision] app_users upsert failed:", userError?.message);
      return NextResponse.json(
        { ok: false, error: "Failed to provision user account." },
        { status: 500 }
      );
    }

    // 2. Upsert identity_link — maps verified wp_user_id → app_user_id
    //    onConflict on (provider, external_user_id) ensures idempotency
    const { error: linkError } = await supabaseServer
      .from("identity_links")
      .upsert(
        {
          app_user_id: user.id,
          provider: "wordpress",
          external_user_id: String(identity.wp_user_id),
        },
        { onConflict: "provider,external_user_id" }
      );

    if (linkError) {
      console.error("[provision] identity_links upsert failed:", linkError.message);
      return NextResponse.json(
        { ok: false, error: "Failed to link WordPress identity." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      app_user_id: user.id,
      provisioning_status: "ready",
    });

  } catch (error) {
    console.error("[provision] Unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
