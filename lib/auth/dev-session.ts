// =============================================================================
// lib/auth/dev-session.ts
// Dev session centralizat — SPEC Faza 1.
//
// IMPORTAT EXCLUSIV DIN:
//   - app/lib/auth/session/session-bridge.ts
//   - lib/server-context/get-server-app-context.ts
//
// Returnează null în orice alt environment decât development.
// Returnează null dacă NEXT_PUBLIC_DEBUG_AUTH !== "true".
// Niciun bypass în producție — eliminat la build-time de Next.js (NODE_ENV constant).
// =============================================================================

import type { BootstrapResponse } from "@/app/lib/auth/fetch-wordpress-bootstrap";

export const DEV_MOCK_IDS = {
  APP_USER_ID: "00000000-0000-0000-0000-000000000001",
  WEDDING_ID: "00000000-0000-0000-0000-000000000002",
  EVENT_ID: "00000000-0000-0000-0000-000000000003",
} as const;

export function getDevSession(): BootstrapResponse | null {
  if (process.env.NODE_ENV !== "development") return null;
  if (process.env.NEXT_PUBLIC_DEBUG_AUTH !== "true") return null;

  return {
    authenticated: true,
    user: {
      wp_user_id: 1,
      email: "dev@local.test",
      display_name: "Dev User",
      plan_tier: null,
    },
    app_user_id: DEV_MOCK_IDS.APP_USER_ID,
    weddings: [
      { id: DEV_MOCK_IDS.WEDDING_ID, title: "Nuntă Dev", role: "owner" },
    ],
    active_wedding_id: DEV_MOCK_IDS.WEDDING_ID,
    active_event_id: DEV_MOCK_IDS.EVENT_ID,
    provisioning_status: "ready",
  };
}
