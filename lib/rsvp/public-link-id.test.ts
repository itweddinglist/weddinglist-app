// =============================================================================
// lib/rsvp/public-link-id.test.ts
// =============================================================================

import { describe, it, expect } from "vitest";
import { generatePublicLinkId, PUBLIC_LINK_ID_LENGTH } from "./public-link-id";

const VALID_CHARSET = /^[0-9A-Za-z]+$/;

describe("generatePublicLinkId", () => {
  it("generează un string de lungime corectă", () => {
    expect(generatePublicLinkId()).toHaveLength(PUBLIC_LINK_ID_LENGTH);
  });

  it("conține doar caractere din charset [0-9A-Za-z]", () => {
    for (let i = 0; i < 50; i++) {
      expect(generatePublicLinkId()).toMatch(VALID_CHARSET);
    }
  });

  it("generează valori diferite la apeluri succesive", () => {
    const ids = new Set(Array.from({ length: 100 }, generatePublicLinkId));
    expect(ids.size).toBe(100);
  });

  it("nu conține cratime, underscore sau slash", () => {
    for (let i = 0; i < 50; i++) {
      const id = generatePublicLinkId();
      expect(id).not.toContain("-");
      expect(id).not.toContain("_");
      expect(id).not.toContain("/");
    }
  });
});
