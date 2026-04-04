// =============================================================================
// lib/server-context/cache.ts
// L1 server-side in-memory cache for authenticated contexts.
// TTL: 30 seconds. Key: hash of wordpress_logged_in_* cookies only.
// Never caches unauthenticated / wp_unavailable / provisioning_failed contexts.
// =============================================================================

import type { AuthenticatedContext } from "./types";

const CACHE_TTL_MS = 30_000;

type CacheEntry = {
  ctx: AuthenticatedContext;
  expiresAt: number;
};

const store = new Map<string, CacheEntry>();

/**
 * Deterministic djb2-style hash of the filtered cookie string.
 * Avoids storing raw cookie values as map keys.
 */
export function makeCacheKey(filteredCookies: string): string {
  let h = 5381;
  for (let i = 0; i < filteredCookies.length; i++) {
    h = ((h << 5) + h) ^ filteredCookies.charCodeAt(i);
    h = h >>> 0; // keep as unsigned 32-bit
  }
  return h.toString(36);
}

export function get(key: string): AuthenticatedContext | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.ctx;
}

export function set(key: string, ctx: AuthenticatedContext): void {
  store.set(key, { ctx, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function clear(key: string): void {
  store.delete(key);
}

/** Clears the entire cache. Intended for use in tests only. */
export function clearAll(): void {
  store.clear();
}
