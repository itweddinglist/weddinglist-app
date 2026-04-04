/**
 * Feature flags — simple, in-code, fără librărie externă.
 * Schimbă valorile aici pentru a activa/dezactiva funcționalități.
 */
export const featureFlags = {
  // Auth & Session
  wpBridgeEnabled: true,
  supabaseEnabled: true,
  // Module
  seatingEnabled: true,
  guestsEnabled: true,    // Faza 3 — activ
  budgetEnabled: true,    // Faza 5 — activ
  vendorsEnabled: false,  // Faza 4 — blocat pe Voxel
  rsvpEnabled: true,      // Faza 7 — activ
  // Dev
  debugAuthEnabled: process.env.NODE_ENV === "development",
} as const;
export type FeatureFlag = keyof typeof featureFlags;
export function isEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag];
}
