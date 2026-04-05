// =============================================================================
// lib/rsvp/public-link-id.ts
// Generare public_link_id stabil pentru invitațiile RSVP.
// Charset: [0-9a-zA-Z] (URL-safe, opaque, 16 chars = ~95 bits entropie)
// NICIODATĂ regenerat automat — e stable identifier al invitației.
// =============================================================================

import { customAlphabet } from "nanoid";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
export const PUBLIC_LINK_ID_LENGTH = 16;

const generate = customAlphabet(ALPHABET, PUBLIC_LINK_ID_LENGTH);

/**
 * Generează un public_link_id unic pentru o invitație RSVP.
 * 62^16 ≈ 4.7 × 10^28 spațiu de căutare — practic imposibil de ghicit.
 */
export function generatePublicLinkId(): string {
  return generate();
}
