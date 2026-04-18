/**
 * Tests pentru rsvp.rules.ts — predicate RSVP pure.
 *
 * Coverage: fiecare predicate testat pe toate valorile enum RsvpAttendanceStatus
 * (pending | accepted | declined | maybe) + null.
 */

import { describe, it, expect } from "vitest";
import { isRsvpAccepted, isRsvpDeclined, isRsvpMaybe, isRsvpPending } from "./rsvp.rules";

describe("isRsvpAccepted", () => {
  it("returneaza true pentru accepted", () => {
    expect(isRsvpAccepted("accepted")).toBe(true);
  });
  it("returneaza false pentru declined", () => {
    expect(isRsvpAccepted("declined")).toBe(false);
  });
  it("returneaza false pentru maybe", () => {
    expect(isRsvpAccepted("maybe")).toBe(false);
  });
  it("returneaza false pentru pending", () => {
    expect(isRsvpAccepted("pending")).toBe(false);
  });
  it("returneaza false pentru null", () => {
    expect(isRsvpAccepted(null)).toBe(false);
  });
});

describe("isRsvpDeclined", () => {
  it("returneaza true pentru declined", () => {
    expect(isRsvpDeclined("declined")).toBe(true);
  });
  it("returneaza false pentru accepted", () => {
    expect(isRsvpDeclined("accepted")).toBe(false);
  });
  it("returneaza false pentru maybe", () => {
    expect(isRsvpDeclined("maybe")).toBe(false);
  });
  it("returneaza false pentru pending", () => {
    expect(isRsvpDeclined("pending")).toBe(false);
  });
  it("returneaza false pentru null", () => {
    expect(isRsvpDeclined(null)).toBe(false);
  });
});

describe("isRsvpMaybe", () => {
  it("returneaza true pentru maybe", () => {
    expect(isRsvpMaybe("maybe")).toBe(true);
  });
  it("returneaza false pentru accepted", () => {
    expect(isRsvpMaybe("accepted")).toBe(false);
  });
  it("returneaza false pentru declined", () => {
    expect(isRsvpMaybe("declined")).toBe(false);
  });
  it("returneaza false pentru pending", () => {
    expect(isRsvpMaybe("pending")).toBe(false);
  });
  it("returneaza false pentru null", () => {
    expect(isRsvpMaybe(null)).toBe(false);
  });
});

describe("isRsvpPending", () => {
  it("returneaza true pentru pending", () => {
    expect(isRsvpPending("pending")).toBe(true);
  });
  it("returneaza false pentru accepted", () => {
    expect(isRsvpPending("accepted")).toBe(false);
  });
  it("returneaza false pentru declined", () => {
    expect(isRsvpPending("declined")).toBe(false);
  });
  it("returneaza false pentru maybe", () => {
    expect(isRsvpPending("maybe")).toBe(false);
  });
  it("returneaza false pentru null", () => {
    expect(isRsvpPending(null)).toBe(false);
  });
});
