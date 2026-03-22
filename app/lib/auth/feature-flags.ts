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
  guestsEnabled: false,   // Faza 3
  budgetEnabled: false,   // Faza 5
  vendorsEnabled: false,  // Faza 4
  rsvpEnabled: false,     // Faza 7

  // Dev
  debugAuthEnabled: process.env.NODE_ENV === "development",
} as const;

export type FeatureFlag = keyof typeof featureFlags;

export function isEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag];
}