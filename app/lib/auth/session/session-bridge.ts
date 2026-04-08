import {
  fetchWordPressBootstrap,
  type BootstrapResponse,
  type BootstrapWedding,
  type ProvisioningStatus,
} from "../fetch-wordpress-bootstrap";
import { withCircuitBreaker } from "./wp-circuit-breaker";
import { isEnabled } from "../feature-flags";
import { getDevSession } from "@/lib/auth/dev-session";

export type SessionState =
  | { status: "loading" }
  | {
      status: "authenticated";
      wpUser: BootstrapResponse["user"];
      appUserId: string | null;
      weddings: BootstrapWedding[];
      activeWeddingId: string | null;
      activeEventId: string | null;
      provisioningStatus: ProvisioningStatus | null;
    }
  | { status: "guest" }
  | { status: "error"; message: string }
  | { status: "wp_down" };

const SESSION_CACHE_KEY = "wl_session_cache";
const SESSION_CACHE_TTL_MS = 5 * 60 * 1000;

type CachedSession = {
  data: BootstrapResponse;
  cachedAt: number;
};

function getCachedSession(): BootstrapResponse | null {
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const cached: CachedSession = JSON.parse(raw);
    const isExpired = Date.now() - cached.cachedAt > SESSION_CACHE_TTL_MS;
    if (isExpired) {
      sessionStorage.removeItem(SESSION_CACHE_KEY);
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

function setCachedSession(data: BootstrapResponse): void {
  try {
    const cached: CachedSession = { data, cachedAt: Date.now() };
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cached));
  } catch {
    // sessionStorage poate fi indisponibil
  }
}

export function clearSessionCache(): void {
  try {
    sessionStorage.removeItem(SESSION_CACHE_KEY);
  } catch {
    // ignorăm
  }
}

/**
 * Builds the authenticated session state from a bootstrap response.
 * Consumes all fields directly — no inference, no resolution.
 */
function buildAuthenticatedState(bootstrap: BootstrapResponse): SessionState {
  return {
    status: "authenticated",
    wpUser: bootstrap.user,
    appUserId: bootstrap.app_user_id ?? null,
    weddings: bootstrap.weddings ?? [],
    activeWeddingId: bootstrap.active_wedding_id ?? null,
    activeEventId: bootstrap.active_event_id ?? null,
    provisioningStatus: bootstrap.provisioning_status ?? null,
  };
}

export async function resolveSession(): Promise<SessionState> {
  const devSession = getDevSession();
  if (devSession) {
    return buildAuthenticatedState(devSession);
  }

  if (!isEnabled("wpBridgeEnabled")) {
    return { status: "guest" };
  }

  const cached = getCachedSession();
  if (cached) {
    if (cached.authenticated && cached.user) {
      return buildAuthenticatedState(cached);
    }
    return { status: "guest" };
  }

  const result = await withCircuitBreaker(fetchWordPressBootstrap);

  if (result.ok === false) {
    if (result.reason === "timeout") {
      return { status: "wp_down" };
    }
    return { status: "error", message: result.message };
  }

  const bootstrap = result.data;
  setCachedSession(bootstrap);

  if (!bootstrap.authenticated || !bootstrap.user) {
    return { status: "guest" };
  }

  return buildAuthenticatedState(bootstrap);
}
