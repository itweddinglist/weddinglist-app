/**
 * Tests pentru rsvp.rules.ts — predicate RSVP pure.
 *
 * Coverage: fiecare predicate testat pe toate valorile enum RsvpAttendanceStatus
 * (pending | accepted | declined | maybe) + null.
 */

import { describe, it, expect } from "vitest";
import { isRsvpAccepted, isRsvpDeclined, isRsvpMaybe, isRsvpPending } from "./rsvp.rules";
import type { RsvpAttendanceStatus } from "@/types/rsvp";

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

/**
 * Type narrowing — predicatele sunt declarate ca type guards (`status is "..."`).
 *
 * Pe branch pozitiv: compilarea fara eroare e dovada ca narrowing functioneaza
 * (asignare la literal type concret). Pe branch negativ: @ts-expect-error
 * confirma ca narrowing-ul NU se propaga in afara if-ului — daca semnatura
 * regreseaza la `boolean`, @ts-expect-error devine la randul lui eroare TS.
 */
describe("type narrowing", () => {
  it("isRsvpAccepted narrows la literal 'accepted' in branch pozitiv", () => {
    const s: RsvpAttendanceStatus | null = "accepted";
    if (isRsvpAccepted(s)) {
      const literal: "accepted" = s;
      expect(literal).toBe("accepted");
    } else {
      throw new Error("Narrowing trebuia sa reuseasca pentru 'accepted'");
    }
  });

  it("isRsvpAccepted NU narrows in branch negativ", () => {
    const s: RsvpAttendanceStatus | null = "declined";
    if (!isRsvpAccepted(s)) {
      // @ts-expect-error — s nu e narrow-at la "accepted" aici
      const literal: "accepted" = s;
      expect(literal).not.toBe("accepted");
    }
  });

  it("isRsvpDeclined narrows la literal 'declined' in branch pozitiv", () => {
    const s: RsvpAttendanceStatus | null = "declined";
    if (isRsvpDeclined(s)) {
      const literal: "declined" = s;
      expect(literal).toBe("declined");
    } else {
      throw new Error("Narrowing trebuia sa reuseasca pentru 'declined'");
    }
  });

  it("isRsvpMaybe narrows la literal 'maybe' in branch pozitiv", () => {
    const s: RsvpAttendanceStatus | null = "maybe";
    if (isRsvpMaybe(s)) {
      const literal: "maybe" = s;
      expect(literal).toBe("maybe");
    } else {
      throw new Error("Narrowing trebuia sa reuseasca pentru 'maybe'");
    }
  });

  it("isRsvpPending narrows la literal 'pending' in branch pozitiv", () => {
    const s: RsvpAttendanceStatus | null = "pending";
    if (isRsvpPending(s)) {
      const literal: "pending" = s;
      expect(literal).toBe("pending");
    } else {
      throw new Error("Narrowing trebuia sa reuseasca pentru 'pending'");
    }
  });
});
