// =============================================================================
// app/api/dev/session/route.ts
// Dev-only endpoint: returnează sesiunea curentă cu sursa ei.
// SECURITY: 404 în orice alt environment decât development.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getServerAppContext } from "@/lib/server-context/get-server-app-context";
import { isEnabled } from "@/app/lib/auth/feature-flags";

type DevSessionResponse = {
  status: string;
  source: "wordpress" | "dev_mock";
  app_user_id: string | null;
  wedding_id: string | null;
  event_id: string | null;
  provisioning_status: string | null;
  wp_user_id: number | null;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV !== "development" || process.env.DEV_ENDPOINTS_ENABLED !== "true") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  // source: "dev_mock" dacă debugAuthEnabled bypass-ează WP, altfel "wordpress"
  const source: "wordpress" | "dev_mock" = isEnabled("debugAuthEnabled")
    ? "dev_mock"
    : "wordpress";

  const ctx = await getServerAppContext(request);

  if (ctx.status !== "authenticated") {
    const body: DevSessionResponse = {
      status: ctx.status,
      source,
      app_user_id: null,
      wedding_id: null,
      event_id: null,
      provisioning_status: null,
      wp_user_id: null,
    };
    return NextResponse.json(body);
  }

  const body: DevSessionResponse = {
    status: ctx.status,
    source,
    app_user_id: ctx.app_user_id,
    wedding_id: ctx.active_wedding_id,
    event_id: ctx.active_event_id,
    provisioning_status: "ready",
    wp_user_id: ctx.wp_user_id,
  };

  return NextResponse.json(body);
}
