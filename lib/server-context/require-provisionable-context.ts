// =============================================================================
// lib/server-context/require-provisionable-context.ts
// Guard for the provision endpoint.
//
// Accepts contexts where WordPress identity is verified and the user either
// needs provisioning (pending/failed) or is already provisioned (authenticated).
// Rejects unauthenticated and wp_unavailable states — no WP cookie, no provision.
//
// already_provisioned: true  → caller can return existing app_user_id immediately
// already_provisioned: false → caller must complete the upsert workflow
// =============================================================================

import { type NextResponse } from "next/server";
import type { ServerAppContext } from "./types";
import { errorResponse } from "@/lib/api-response";

export type ProvisionableIdentity = {
  app_user_id: string;
  wp_user_id: number;
  email: string;
  display_name: string;
};

export type RequireProvisionableResult =
  | { ok: true; identity: ProvisionableIdentity; already_provisioned: boolean }
  | { ok: false; response: NextResponse };

export function requireProvisionableContext(
  ctx: ServerAppContext
): RequireProvisionableResult {
  switch (ctx.status) {
    case "provisioning_pending":
    case "provisioning_failed":
      return {
        ok: true,
        identity: {
          app_user_id: ctx.app_user_id,
          wp_user_id: ctx.wp_user_id,
          email: ctx.email,
          display_name: ctx.display_name,
        },
        already_provisioned: false,
      };

    case "authenticated":
      // Idempotent re-call — user already fully provisioned.
      return {
        ok: true,
        identity: {
          app_user_id: ctx.app_user_id,
          wp_user_id: ctx.wp_user_id,
          email: ctx.email,
          display_name: ctx.display_name,
        },
        already_provisioned: true,
      };

    case "unauthenticated":
      return {
        ok: false,
        response: errorResponse(
          401,
          "WP_SESSION_REQUIRED",
          "A valid WordPress session is required to provision an account."
        ),
      };

    case "wp_unavailable":
      return {
        ok: false,
        response: errorResponse(
          503,
          "AUTH_SERVICE_UNAVAILABLE",
          "Authentication service is temporarily unavailable. Please try again."
        ),
      };
  }
}
