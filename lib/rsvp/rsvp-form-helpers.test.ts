// =============================================================================
// lib/rsvp/rsvp-form-helpers.test.ts
// Unit tests pentru helpers formular public RSVP
// =============================================================================

import { describe, it, expect } from "vitest";
import {
  getMealChoiceForSubmit,
  hasAnyAccepted,
  getSharedDietaryNotes,
  applyDietaryNotesToAccepted,
  type EventAnswer,
} from "./rsvp-form-helpers";

function makeAnswer(overrides: Partial<EventAnswer> = {}): EventAnswer {
  return {
    guest_event_id: "ge-1",
    status: null,
    meal_choice: null,
    dietary_notes: "",
    note: "",
    ...overrides,
  };
}

describe("getMealChoiceForSubmit", () => {
  it("returns meal_choice when status is accepted + standard", () => {
    const answer = makeAnswer({ status: "accepted", meal_choice: "standard" });
    expect(getMealChoiceForSubmit(answer)).toBe("standard");
  });

  it("returns meal_choice when status is accepted + vegetarian", () => {
    const answer = makeAnswer({ status: "accepted", meal_choice: "vegetarian" });
    expect(getMealChoiceForSubmit(answer)).toBe("vegetarian");
  });

  it("returns null when status is accepted but meal_choice is null", () => {
    const answer = makeAnswer({ status: "accepted", meal_choice: null });
    expect(getMealChoiceForSubmit(answer)).toBeNull();
  });

  it("returns null when status is declined regardless of meal_choice", () => {
    const answer = makeAnswer({ status: "declined", meal_choice: "standard" });
    expect(getMealChoiceForSubmit(answer)).toBeNull();
  });

  it("returns null when status is maybe", () => {
    const answer = makeAnswer({ status: "maybe", meal_choice: "standard" });
    expect(getMealChoiceForSubmit(answer)).toBeNull();
  });

  it("returns null when status is pending", () => {
    const answer = makeAnswer({ status: "pending", meal_choice: "standard" });
    expect(getMealChoiceForSubmit(answer)).toBeNull();
  });

  it("returns null when status is null", () => {
    const answer = makeAnswer({ status: null, meal_choice: "standard" });
    expect(getMealChoiceForSubmit(answer)).toBeNull();
  });
});

describe("hasAnyAccepted", () => {
  it("returns false for empty object", () => {
    expect(hasAnyAccepted({})).toBe(false);
  });

  it("returns false when all answers are declined", () => {
    const answers = {
      a: makeAnswer({ status: "declined" }),
      b: makeAnswer({ status: "declined" }),
    };
    expect(hasAnyAccepted(answers)).toBe(false);
  });

  it("returns false when all answers have null status", () => {
    const answers = {
      a: makeAnswer({ status: null }),
      b: makeAnswer({ status: null }),
    };
    expect(hasAnyAccepted(answers)).toBe(false);
  });

  it("returns true when at least one answer is accepted (mixed)", () => {
    const answers = {
      a: makeAnswer({ status: "declined" }),
      b: makeAnswer({ status: "accepted" }),
      c: makeAnswer({ status: "maybe" }),
    };
    expect(hasAnyAccepted(answers)).toBe(true);
  });

  it("returns true when all answers are accepted", () => {
    const answers = {
      a: makeAnswer({ status: "accepted" }),
      b: makeAnswer({ status: "accepted" }),
    };
    expect(hasAnyAccepted(answers)).toBe(true);
  });

  it("returns true for a single accepted answer", () => {
    expect(hasAnyAccepted({ a: makeAnswer({ status: "accepted" }) })).toBe(true);
  });
});

describe("getSharedDietaryNotes", () => {
  it("returns empty string for empty object", () => {
    expect(getSharedDietaryNotes({})).toBe("");
  });

  it("returns empty string when no answer is accepted", () => {
    const answers = {
      a: makeAnswer({ status: "declined", dietary_notes: "ignored" }),
      b: makeAnswer({ status: "maybe", dietary_notes: "also ignored" }),
    };
    expect(getSharedDietaryNotes(answers)).toBe("");
  });

  it("returns dietary_notes from the single accepted answer", () => {
    const answers = {
      a: makeAnswer({ status: "accepted", dietary_notes: "fara carne" }),
    };
    expect(getSharedDietaryNotes(answers)).toBe("fara carne");
  });

  it("returns empty string when accepted answer has empty dietary_notes", () => {
    const answers = {
      a: makeAnswer({ status: "accepted", dietary_notes: "" }),
    };
    expect(getSharedDietaryNotes(answers)).toBe("");
  });

  it("returns notes from first accepted (first-wins) when multiple accepted differ", () => {
    const answers = {
      a: makeAnswer({ status: "accepted", dietary_notes: "first" }),
      b: makeAnswer({ status: "accepted", dietary_notes: "second" }),
    };
    expect(getSharedDietaryNotes(answers)).toBe("first");
  });

  it("skips declined entries before finding the first accepted", () => {
    const answers = {
      a: makeAnswer({ status: "declined", dietary_notes: "skip" }),
      b: makeAnswer({ status: "accepted", dietary_notes: "used" }),
    };
    expect(getSharedDietaryNotes(answers)).toBe("used");
  });
});

describe("applyDietaryNotesToAccepted", () => {
  it("returns an empty object for empty input (new reference)", () => {
    const input: Record<string, EventAnswer> = {};
    const result = applyDietaryNotesToAccepted(input, "x");
    expect(result).toEqual({});
    expect(result).not.toBe(input);
  });

  it("returns new top-level reference when no answer is accepted", () => {
    const input = {
      a: makeAnswer({ status: "declined", dietary_notes: "kept" }),
    };
    const result = applyDietaryNotesToAccepted(input, "new");
    expect(result).not.toBe(input);
    expect(result.a.dietary_notes).toBe("kept");
  });

  it("updates dietary_notes only on accepted entries", () => {
    const input = {
      a: makeAnswer({ status: "accepted", dietary_notes: "old" }),
      b: makeAnswer({ status: "declined", dietary_notes: "unchanged" }),
      c: makeAnswer({ status: "maybe", dietary_notes: "unchanged-too" }),
    };
    const result = applyDietaryNotesToAccepted(input, "new-value");
    expect(result.a.dietary_notes).toBe("new-value");
    expect(result.b.dietary_notes).toBe("unchanged");
    expect(result.c.dietary_notes).toBe("unchanged-too");
  });

  it("updates dietary_notes on all accepted entries", () => {
    const input = {
      a: makeAnswer({ status: "accepted", dietary_notes: "old-a" }),
      b: makeAnswer({ status: "accepted", dietary_notes: "old-b" }),
    };
    const result = applyDietaryNotesToAccepted(input, "shared");
    expect(result.a.dietary_notes).toBe("shared");
    expect(result.b.dietary_notes).toBe("shared");
  });

  it("does not mutate the original input (immutability)", () => {
    const input = {
      a: makeAnswer({ status: "accepted", dietary_notes: "original" }),
      b: makeAnswer({ status: "declined", dietary_notes: "other" }),
    };
    applyDietaryNotesToAccepted(input, "mutated");
    expect(input.a.dietary_notes).toBe("original");
    expect(input.b.dietary_notes).toBe("other");
  });

  it("preserves non-dietary fields on accepted entries", () => {
    const input = {
      a: makeAnswer({
        status: "accepted",
        meal_choice: "vegetarian",
        note: "arrive late",
        dietary_notes: "old",
      }),
    };
    const result = applyDietaryNotesToAccepted(input, "new");
    expect(result.a.status).toBe("accepted");
    expect(result.a.meal_choice).toBe("vegetarian");
    expect(result.a.note).toBe("arrive late");
    expect(result.a.dietary_notes).toBe("new");
  });
});