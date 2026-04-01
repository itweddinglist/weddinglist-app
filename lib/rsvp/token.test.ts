// =============================================================================
// lib/rsvp/token.test.ts
// Teste pentru token security RSVP — Faza 7.5
// =============================================================================

import { describe, it, expect } from "vitest";
import {
  generateRsvpToken,
  hashToken,
  getTokenExpiresAt,
  isTokenExpired,
  validateTokenState,
} from "./token";

// ─── generateRsvpToken ────────────────────────────────────────────────────────

describe("generateRsvpToken", () => {
  it("generează token raw de 64 caractere hex", () => {
    const { raw } = generateRsvpToken();
    expect(raw).toHaveLength(64);
    expect(raw).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generează hash de 64 caractere hex", () => {
    const { hash } = generateRsvpToken();
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("raw și hash sunt diferite", () => {
    const { raw, hash } = generateRsvpToken();
    expect(raw).not.toBe(hash);
  });

  it("două tokenuri generate sunt unice", () => {
    const t1 = generateRsvpToken();
    const t2 = generateRsvpToken();
    expect(t1.raw).not.toBe(t2.raw);
    expect(t1.hash).not.toBe(t2.hash);
  });

  it("hash-ul e deterministic — același raw produce același hash", () => {
    const { raw } = generateRsvpToken();
    const hash1 = hashToken(raw);
    const hash2 = hashToken(raw);
    expect(hash1).toBe(hash2);
  });
});

// ─── hashToken ────────────────────────────────────────────────────────────────

describe("hashToken", () => {
  it("produce SHA-256 hex de 64 caractere", () => {
    const hash = hashToken("test-token");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hash-uri diferite pentru input-uri diferite", () => {
    const h1 = hashToken("token-a");
    const h2 = hashToken("token-b");
    expect(h1).not.toBe(h2);
  });

  it("hash cunoscut pentru input cunoscut", () => {
    // SHA-256("abc") — valoare calculată de Node.js crypto
    const hash = hashToken("abc");
    expect(hash).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

// ─── getTokenExpiresAt ────────────────────────────────────────────────────────

describe("getTokenExpiresAt", () => {
  it("returnează o dată în viitor", () => {
    const expiresAt = getTokenExpiresAt();
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("expiră după 30 zile", () => {
    const expiresAt = getTokenExpiresAt();
    const diffDays = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(29);
    expect(diffDays).toBeLessThan(31);
  });
});

// ─── isTokenExpired ───────────────────────────────────────────────────────────

describe("isTokenExpired", () => {
  it("returnează false pentru token în viitor", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    expect(isTokenExpired(future)).toBe(false);
  });

  it("returnează true pentru token în trecut", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
    expect(isTokenExpired(past)).toBe(true);
  });

  it("returnează false pentru null — fără expirare", () => {
    expect(isTokenExpired(null)).toBe(false);
  });

  it("acceptă Date object", () => {
    const past = new Date(Date.now() - 1000);
    expect(isTokenExpired(past)).toBe(true);
  });
});

// ─── validateTokenState ───────────────────────────────────────────────────────

describe("validateTokenState", () => {
  it("valid — token activ fără expirare", () => {
    const result = validateTokenState({
      is_active: true,
      responded_at: null,
      expires_at: null,
    });
    expect(result.valid).toBe(true);
  });

  it("invalid — token inactiv", () => {
    const result = validateTokenState({
      is_active: false,
      responded_at: null,
      expires_at: null,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("inactive");
  });

  it("invalid — token expirat", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
    const result = validateTokenState({
      is_active: true,
      responded_at: null,
      expires_at: past,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("expired");
  });

  it("valid — token activ cu expirare în viitor", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
    const result = validateTokenState({
      is_active: true,
      responded_at: null,
      expires_at: future,
    });
    expect(result.valid).toBe(true);
  });

  it("invalid — is_active false chiar dacă nu e expirat", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
    const result = validateTokenState({
      is_active: false,
      responded_at: null,
      expires_at: future,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("inactive");
  });
});