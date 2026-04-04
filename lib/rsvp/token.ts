// =============================================================================
// lib/rsvp/token.ts
// Token security pentru RSVP — Faza 7.5
// Token raw: crypto.randomBytes(32) → 64 char hex
// Stocat în DB: SHA-256(token raw) — tokenul raw nu se stochează niciodată
// TTL: 30 zile
// One-time: used_at setat la primul submit valid
// =============================================================================

import crypto from "crypto";
import type { GeneratedToken } from "@/types/rsvp";

const TOKEN_TTL_DAYS = 30;

/**
 * Generează un token RSVP securizat.
 * Returnează atât tokenul raw (pentru link) cât și hash-ul (pentru DB).
 * Tokenul raw NU se stochează niciodată — doar hash-ul.
 */
export function generateRsvpToken(): GeneratedToken {
  const raw = crypto.randomBytes(32).toString("hex"); // 64 char hex
  const hash = hashToken(raw);
  return { raw, hash };
}

/**
 * Calculează SHA-256 hash al unui token raw.
 * Folosit atât la generare cât și la lookup din DB.
 */
export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Calculează data de expirare — 30 zile de la acum.
 */
export function getTokenExpiresAt(): Date {
  const date = new Date();
  date.setDate(date.getDate() + TOKEN_TTL_DAYS);
  return date;
}

/**
 * Verifică dacă un token e expirat.
 */
export function isTokenExpired(expiresAt: string | Date | null): boolean {
  if (!expiresAt) return false; // NULL = fără expirare
  return new Date(expiresAt) < new Date();
}

/**
 * Verifică dacă un token e valid pentru submit.
 * Returnează motivul invalidității dacă există.
 */
export function validateTokenState(invitation: {
  is_active: boolean;
  responded_at: string | null;
  expires_at?: string | null;
}): { valid: true } | { valid: false; reason: "expired" | "inactive" } {
  if (!invitation.is_active) {
    return { valid: false, reason: "inactive" };
  }

  if (invitation.expires_at && isTokenExpired(invitation.expires_at)) {
    return { valid: false, reason: "expired" };
  }

  return { valid: true };
}