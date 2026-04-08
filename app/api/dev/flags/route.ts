// =============================================================================
// app/api/dev/flags/route.ts
// Dev-only endpoint: returnează toate feature flags curente.
// SECURITY: 404 în orice alt environment decât development.
// =============================================================================

import { NextResponse } from "next/server";
import { featureFlags } from "@/app/lib/auth/feature-flags";

export async function GET(): Promise<NextResponse> {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  return NextResponse.json(featureFlags);
}
