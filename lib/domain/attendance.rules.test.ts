/**
 * Tests pentru attendance.rules.ts — predicate Attendance pure.
 *
 * Coverage: fiecare predicate testat pe toate valorile enum AttendanceStatus
 * (pending | invited | attending | declined | maybe) + null + undefined.
 *
 * Diferenta vs rsvp.rules.test.ts: signatura accepta si undefined (guest_events poate
 * sa nu aiba un rand pentru event curent).
 */

import { describe, it, expect } from "vitest";
import { isAttendanceAttending, isAttendanceDeclined, isAttendanceMaybe, isAttendancePending } from "./attendance.rules";
import type { AttendanceStatus } from "@/types/guests";

describe("isAttendanceAttending", () => {
  it("returneaza true pentru attending", () => {
    expect(isAttendanceAttending("attending")).toBe(true);
  });
  it("returneaza false pentru pending", () => {
    expect(isAttendanceAttending("pending")).toBe(false);
  });
  it("returneaza false pentru invited", () => {
    expect(isAttendanceAttending("invited")).toBe(false);
  });
  it("returneaza false pentru declined", () => {
    expect(isAttendanceAttending("declined")).toBe(false);
  });
  it("returneaza false pentru maybe", () => {
    expect(isAttendanceAttending("maybe")).toBe(false);
  });
  it("returneaza false pentru null", () => {
    expect(isAttendanceAttending(null)).toBe(false);
  });
  it("returneaza false pentru undefined", () => {
    expect(isAttendanceAttending(undefined)).toBe(false);
  });
});

describe("isAttendanceDeclined", () => {
  it("returneaza true pentru declined", () => {
    expect(isAttendanceDeclined("declined")).toBe(true);
  });
  it("returneaza false pentru attending", () => {
    expect(isAttendanceDeclined("attending")).toBe(false);
  });
  it("returneaza false pentru pending", () => {
    expect(isAttendanceDeclined("pending")).toBe(false);
  });
  it("returneaza false pentru invited", () => {
    expect(isAttendanceDeclined("invited")).toBe(false);
  });
  it("returneaza false pentru maybe", () => {
    expect(isAttendanceDeclined("maybe")).toBe(false);
  });
  it("returneaza false pentru null", () => {
    expect(isAttendanceDeclined(null)).toBe(false);
  });
  it("returneaza false pentru undefined", () => {
    expect(isAttendanceDeclined(undefined)).toBe(false);
  });
});

describe("isAttendanceMaybe", () => {
  it("returneaza true pentru maybe", () => {
    expect(isAttendanceMaybe("maybe")).toBe(true);
  });
  it("returneaza false pentru attending", () => {
    expect(isAttendanceMaybe("attending")).toBe(false);
  });
  it("returneaza false pentru declined", () => {
    expect(isAttendanceMaybe("declined")).toBe(false);
  });
  it("returneaza false pentru pending", () => {
    expect(isAttendanceMaybe("pending")).toBe(false);
  });
  it("returneaza false pentru invited", () => {
    expect(isAttendanceMaybe("invited")).toBe(false);
  });
  it("returneaza false pentru null", () => {
    expect(isAttendanceMaybe(null)).toBe(false);
  });
  it("returneaza false pentru undefined", () => {
    expect(isAttendanceMaybe(undefined)).toBe(false);
  });
});

describe("isAttendancePending", () => {
  it("returneaza true pentru pending", () => {
    expect(isAttendancePending("pending")).toBe(true);
  });
  it("returneaza false pentru attending", () => {
    expect(isAttendancePending("attending")).toBe(false);
  });
  it("returneaza false pentru declined", () => {
    expect(isAttendancePending("declined")).toBe(false);
  });
  it("returneaza false pentru maybe", () => {
    expect(isAttendancePending("maybe")).toBe(false);
  });
  it("returneaza false pentru invited", () => {
    expect(isAttendancePending("invited")).toBe(false);
  });
  it("returneaza false pentru null", () => {
    expect(isAttendancePending(null)).toBe(false);
  });
  it("returneaza false pentru undefined", () => {
    expect(isAttendancePending(undefined)).toBe(false);
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
  it("isAttendanceAttending narrows la literal 'attending' in branch pozitiv", () => {
    const s: AttendanceStatus | null | undefined = "attending";
    if (isAttendanceAttending(s)) {
      const literal: "attending" = s;
      expect(literal).toBe("attending");
    } else {
      throw new Error("Narrowing trebuia sa reuseasca pentru 'attending'");
    }
  });

  it("isAttendanceAttending NU narrows in branch negativ", () => {
    const s: AttendanceStatus | null | undefined = "declined";
    if (!isAttendanceAttending(s)) {
      // @ts-expect-error — s nu e narrow-at la "attending" aici
      const literal: "attending" = s;
      expect(literal).not.toBe("attending");
    }
  });

  it("isAttendanceDeclined narrows la literal 'declined' in branch pozitiv", () => {
    const s: AttendanceStatus | null | undefined = "declined";
    if (isAttendanceDeclined(s)) {
      const literal: "declined" = s;
      expect(literal).toBe("declined");
    } else {
      throw new Error("Narrowing trebuia sa reuseasca pentru 'declined'");
    }
  });

  it("isAttendanceMaybe narrows la literal 'maybe' in branch pozitiv", () => {
    const s: AttendanceStatus | null | undefined = "maybe";
    if (isAttendanceMaybe(s)) {
      const literal: "maybe" = s;
      expect(literal).toBe("maybe");
    } else {
      throw new Error("Narrowing trebuia sa reuseasca pentru 'maybe'");
    }
  });

  it("isAttendancePending narrows la literal 'pending' in branch pozitiv", () => {
    const s: AttendanceStatus | null | undefined = "pending";
    if (isAttendancePending(s)) {
      const literal: "pending" = s;
      expect(literal).toBe("pending");
    } else {
      throw new Error("Narrowing trebuia sa reuseasca pentru 'pending'");
    }
  });
});
