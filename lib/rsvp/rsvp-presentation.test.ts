import { describe, it, expect } from "vitest";
import type { RsvpAttendanceStatus } from "@/types/rsvp";
import {
  RSVP_STATUS_COLORS_HEX,
  getStatusColorHex,
  getStatusLabel,
} from "./rsvp-presentation";
import { getTranslations } from "./rsvp-translations";

const ALL_STATUSES: RsvpAttendanceStatus[] = [
  "accepted",
  "declined",
  "maybe",
  "pending",
];

describe("RSVP_STATUS_COLORS_HEX", () => {
  it("defines a hex value for every status", () => {
    for (const status of ALL_STATUSES) {
      expect(RSVP_STATUS_COLORS_HEX[status]).toBeTruthy();
    }
  });

  it("uses distinct colors across all statuses", () => {
    const values = ALL_STATUSES.map((s) => RSVP_STATUS_COLORS_HEX[s]);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(ALL_STATUSES.length);
  });
});

describe("getStatusColorHex", () => {
  for (const status of ALL_STATUSES) {
    it(`returns the constant hex for "${status}"`, () => {
      expect(getStatusColorHex(status)).toBe(RSVP_STATUS_COLORS_HEX[status]);
    });
  }
});

describe("getStatusLabel", () => {
  const t = getTranslations("ro");

  for (const status of ALL_STATUSES) {
    it(`returns the RO translation for "${status}"`, () => {
      expect(getStatusLabel(status)).toBe(t.status[status]);
    });
  }

  it("defaults to RO locale when none is provided", () => {
    expect(getStatusLabel("accepted")).toBe(getStatusLabel("accepted", "ro"));
  });
});