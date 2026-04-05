// =============================================================================
// lib/rsvp/get-public-rsvp-url.ts
// Construiește URL-ul public RSVP pentru un token dat.
// Base: NEXT_PUBLIC_APP_URL (env) → window.location.origin (fallback browser)
// =============================================================================

/**
 * Returnează URL-ul complet pentru pagina RSVP a unui invitat.
 * Aruncă dacă tokenul lipsește sau baza URL nu poate fi determinată.
 */
export function getPublicRsvpUrl(token: string): string {
  if (!token) throw new Error("Token RSVP lipsește.");

  const env = process.env.NEXT_PUBLIC_APP_URL;
  const base = env
    ? env.replace(/\/$/, "")
    : typeof window !== "undefined"
    ? window.location.origin
    : null;

  if (!base) throw new Error("NEXT_PUBLIC_APP_URL nedefinit.");

  return `${base}/rsvp/${token}`;
}
