// =============================================================================
// app/api/dev/health/route.ts
// Dev-only endpoint: verifică starea Supabase și WordPress.
// SECURITY: 404 în orice alt environment decât development.
// =============================================================================

import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabase/server";
import { isEnabled } from "@/app/lib/auth/feature-flags";

type HealthResponse = {
  supabase: "ok" | "error";
  wordpress: "ok" | "error" | "skipped";
  isReadOnly: boolean;
  readOnlyReason?: string;
  timestamp: string;
};

export async function GET(): Promise<NextResponse> {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  // ── Supabase ping ────────────────────────────────────────────────────────
  let supabase: "ok" | "error" = "ok";
  try {
    const { error } = await supabaseServer
      .from("app_users")
      .select("id")
      .limit(1);
    if (error) supabase = "error";
  } catch {
    supabase = "error";
  }

  // ── WordPress ping ────────────────────────────────────────────────────────
  let wordpress: "ok" | "error" | "skipped" = "skipped";

  if (isEnabled("wpBridgeEnabled")) {
    const wpBaseUrl = process.env.NEXT_PUBLIC_WP_BASE_URL;
    if (!wpBaseUrl) {
      wordpress = "error";
    } else {
      try {
        const res = await fetch(`${wpBaseUrl}/wp-json/weddinglist/v1/bootstrap`, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: AbortSignal.timeout(3000),
        });
        wordpress = res.ok ? "ok" : "error";
      } catch {
        wordpress = "error";
      }
    }
  }

  // ── Read-only derivat din starea Supabase ─────────────────────────────────
  const isReadOnly = supabase === "error";

  const body: HealthResponse = {
    supabase,
    wordpress,
    isReadOnly,
    ...(isReadOnly ? { readOnlyReason: "supabase_down" } : {}),
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body);
}
