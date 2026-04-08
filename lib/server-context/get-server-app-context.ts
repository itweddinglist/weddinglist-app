// =============================================================================
// lib/server-context/get-server-app-context.ts
// Single entry point for auth in internal API routes.
// Fetches WordPress bootstrap server-side (Cookie forwarded manually).
// Uses circuit breaker + L1 cache.
// =============================================================================

import type { NextRequest } from "next/server";
import { withCircuitBreaker } from "@/app/lib/auth/session/wp-circuit-breaker";
import type { BootstrapResponse } from "@/app/lib/auth/fetch-wordpress-bootstrap";
import type { ServerAppContext, AuthenticatedContext } from "./types";
import { makeCacheKey, get as cacheGet, set as cacheSet } from "./cache";
import { getDevSession } from "@/lib/auth/dev-session";

/** Filters the raw Cookie header to only wordpress_logged_in_* cookies. */
function filterWpCookies(cookieHeader: string): string {
  return cookieHeader
    .split(";")
    .map((c) => c.trim())
    .filter((c) => c.startsWith("wordpress_logged_in_"))
    .join("; ");
}

/**
 * Fetches the WordPress bootstrap endpoint with the user's session cookie
 * forwarded manually via the Cookie request header.
 * Must NOT use credentials: "include" — that only works from a browser.
 */
async function fetchBootstrapServerSide(
  filteredCookies: string
): Promise<BootstrapResponse> {
  const wpBaseUrl = process.env.NEXT_PUBLIC_WP_BASE_URL;
  if (!wpBaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_WP_BASE_URL");
  }

  const response = await fetch(
    `${wpBaseUrl}/wp-json/weddinglist/v1/bootstrap`,
    {
      method: "GET",
      headers: {
        Cookie: filteredCookies,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Bootstrap request failed with status ${response.status}`
    );
  }

  return response.json() as Promise<BootstrapResponse>;
}

/**
 * A coherent authenticated response has authenticated=true, a non-null
 * app_user_id, and a non-null provisioning_status.
 */
function isCoherentAuthenticated(
  data: BootstrapResponse
): data is BootstrapResponse & {
  app_user_id: string;
  provisioning_status: NonNullable<BootstrapResponse["provisioning_status"]>;
  user: NonNullable<BootstrapResponse["user"]>;
} {
  return (
    data.authenticated === true &&
    typeof data.app_user_id === "string" &&
    data.provisioning_status !== null &&
    data.user !== null
  );
}

/**
 * Resolves the server-side application context for the current request.
 * This is the single authoritative entry point for auth in API routes.
 *
 * Flow:
 *  1. Extract request_id
 *  2. Filter wordpress_logged_in_* cookies
 *  3. Check L1 cache
 *  4. Call WP bootstrap with forwarded cookie
 *  5. Normalise into ServerAppContext
 *  6. Cache if authenticated
 */
export async function getServerAppContext(
  request: NextRequest
): Promise<ServerAppContext> {
  const request_id =
    request.headers.get("x-request-id") ?? crypto.randomUUID();

  // Dev bypass — verificat înainte de orice cookie sau apel WP
  const devSession = getDevSession();
  if (devSession && devSession.authenticated && devSession.user && devSession.app_user_id) {
    const ctx: AuthenticatedContext = {
      status: "authenticated",
      request_id,
      app_user_id: devSession.app_user_id,
      wp_user_id: devSession.user.wp_user_id,
      email: devSession.user.email,
      display_name: devSession.user.display_name,
      plan_tier: devSession.user.plan_tier,
      active_wedding_id: devSession.active_wedding_id,
      active_event_id: devSession.active_event_id,
      weddings: devSession.weddings,
    };
    return ctx;
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const filteredCookies = filterWpCookies(cookieHeader);

  if (!filteredCookies) {
    return { status: "unauthenticated", request_id };
  }

  const cacheKey = makeCacheKey(filteredCookies);
  const cached = cacheGet(cacheKey);
  if (cached) {
    // request_id is per-request; override the one stored in cache
    return { ...cached, request_id };
  }

  const result = await withCircuitBreaker(() =>
    fetchBootstrapServerSide(filteredCookies)
  );

  if (!result.ok) {
    return {
      status: "wp_unavailable",
      reason: result.reason,
      request_id,
    };
  }

  const data = result.data;

  if (!isCoherentAuthenticated(data)) {
    return { status: "unauthenticated", request_id };
  }

  const { app_user_id, provisioning_status, user } = data;

  if (provisioning_status === "pending") {
    return { status: "provisioning_pending", app_user_id, request_id };
  }

  if (provisioning_status === "failed") {
    return { status: "provisioning_failed", app_user_id, request_id };
  }

  // provisioning_status === "ready"
  const ctx: AuthenticatedContext = {
    status: "authenticated",
    request_id,
    app_user_id,
    wp_user_id: user.wp_user_id,
    email: user.email,
    display_name: user.display_name,
    plan_tier: user.plan_tier,
    active_wedding_id: data.active_wedding_id,
    active_event_id: data.active_event_id,
    weddings: data.weddings,
  };

  cacheSet(cacheKey, ctx);
  return ctx;
}
