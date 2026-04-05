// =============================================================================
// lib/rsvp/get-public-rsvp-url.test.ts
// =============================================================================

import { describe, it, expect, afterEach } from "vitest";
import { getPublicRsvpUrl } from "./get-public-rsvp-url";

afterEach(() => {
  delete process.env.NEXT_PUBLIC_APP_URL;
});

describe("getPublicRsvpUrl", () => {
  it("aruncă dacă token este gol", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
    expect(() => getPublicRsvpUrl("")).toThrow("Token RSVP lipsește.");
  });

  it("normalizează slash-ul de la finalul base URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com/";
    expect(getPublicRsvpUrl("abc123")).toBe("https://example.com/rsvp/abc123");
  });

  it("funcționează corect fără slash final", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
    expect(getPublicRsvpUrl("tok_abc")).toBe("https://example.com/rsvp/tok_abc");
  });

  it("NEXT_PUBLIC_APP_URL are prioritate față de window.location.origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://prod.example.com";
    // jsdom setează window.location.origin la "http://localhost" — env trebuie să câștige
    const result = getPublicRsvpUrl("abc123");
    expect(result).toBe("https://prod.example.com/rsvp/abc123");
    expect(result).not.toContain("localhost");
  });

  it("folosește window.location.origin ca fallback când NEXT_PUBLIC_APP_URL lipsește", () => {
    // jsdom setează window.location.origin (ex: "http://localhost:3000")
    const result = getPublicRsvpUrl("mytoken");
    expect(result).toMatch(/^http:\/\/localhost(:\d+)?\/rsvp\/mytoken$/);
  });
});
