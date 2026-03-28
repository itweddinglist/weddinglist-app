// =============================================================================
// lib/validation/guests.test.ts
// Unit tests for validateCreateGuest and validateUpdateGuest
// Covers: 3.5 Validări + 3.7 Data sanitation
// =============================================================================

import { describe, it, expect } from "vitest";
import { validateCreateGuest, validateUpdateGuest } from "./guests";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";
const VALID_UUID_2 = "223e4567-e89b-12d3-a456-426614174000";

// ─── validateCreateGuest ─────────────────────────────────────────────────────

describe("validateCreateGuest", () => {
  const base = { wedding_id: VALID_UUID, first_name: "Ion" };

  it("valid minimal input", () => {
    const result = validateCreateGuest(base);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.first_name).toBe("Ion");
      expect(result.data.display_name).toBe("Ion");
      expect(result.data.last_name).toBeNull();
    }
  });

  it("auto-generates display_name from first+last", () => {
    const result = validateCreateGuest({ ...base, last_name: "Popescu" });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.display_name).toBe("Ion Popescu");
  });

  it("respects explicit display_name", () => {
    const result = validateCreateGuest({ ...base, display_name: "Nașul" });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.display_name).toBe("Nașul");
  });

  // 3.7 Data sanitation — trim
  it("trimează spații din first_name", () => {
    const result = validateCreateGuest({ ...base, first_name: "  Ion  " });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.first_name).toBe("Ion");
  });

  it("colapsează spații multiple în first_name", () => {
    const result = validateCreateGuest({ ...base, first_name: "Ion  Maria" });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.first_name).toBe("Ion Maria");
  });

  it("trimează spații din last_name", () => {
    const result = validateCreateGuest({ ...base, last_name: "  Popescu  " });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.last_name).toBe("Popescu");
  });

  it("trimează spații din notes", () => {
    const result = validateCreateGuest({ ...base, notes: "  O notă  " });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.notes).toBe("O notă");
  });

  // empty / whitespace
  it("rejectează first_name gol", () => {
    const result = validateCreateGuest({ ...base, first_name: "" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors[0].field).toBe("first_name");
  });

  it("rejectează first_name cu doar spații", () => {
    const result = validateCreateGuest({ ...base, first_name: "   " });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors[0].field).toBe("first_name");
  });

  it("rejectează display_name gol când e furnizat explicit", () => {
    const result = validateCreateGuest({ ...base, display_name: "" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors[0].field).toBe("display_name");
  });

  it("rejectează display_name cu doar spații", () => {
    const result = validateCreateGuest({ ...base, display_name: "   " });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors[0].field).toBe("display_name");
  });

  // 3.7 HTML sanitization
  it("stripează HTML din first_name", () => {
    const result = validateCreateGuest({ ...base, first_name: "<b>Ion</b>" });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.first_name).toBe("Ion");
  });

  it("stripează HTML tags fără text și rejectează", () => {
    const result = validateCreateGuest({ ...base, first_name: "<b></b>" });
    expect(result.valid).toBe(false);
  });

  it("stripează HTML tags și păstrează textul din interior", () => {
    const result = validateCreateGuest({ ...base, first_name: "<script>alert(1)</script>" });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.first_name).toBe("alert(1)");
  });

  it("stripează HTML entities din first_name", () => {
    const result = validateCreateGuest({ ...base, first_name: "&lt;Ion&gt;" });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.first_name).toBe("Ion");
  });

  // null inputs
  it("acceptă last_name null", () => {
    const result = validateCreateGuest({ ...base, last_name: null });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.last_name).toBeNull();
  });

  it("rejectează first_name null", () => {
    const result = validateCreateGuest({ ...base, first_name: null });
    expect(result.valid).toBe(false);
  });

  // max length — 3.5 Validări
  it("trunchiază first_name la 100 chars", () => {
    const long = "A".repeat(150);
    const result = validateCreateGuest({ ...base, first_name: long });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.first_name.length).toBe(100);
  });

  it("trunchiază notes la 500 chars", () => {
    const long = "A".repeat(600);
    const result = validateCreateGuest({ ...base, notes: long });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.notes!.length).toBe(500);
  });

  // enum side
  it("acceptă side valid", () => {
    const result = validateCreateGuest({ ...base, side: "bride" });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.side).toBe("bride");
  });

  it("rejectează side invalid", () => {
    const result = validateCreateGuest({ ...base, side: "unknown" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors[0].field).toBe("side");
  });

  // UUID
  it("rejectează wedding_id invalid", () => {
    const result = validateCreateGuest({ ...base, wedding_id: "not-a-uuid" });
    expect(result.valid).toBe(false);
  });

  it("rejectează guest_group_id invalid", () => {
    const result = validateCreateGuest({ ...base, guest_group_id: "bad" });
    expect(result.valid).toBe(false);
  });

  it("acceptă guest_group_id valid UUID", () => {
    const result = validateCreateGuest({ ...base, guest_group_id: VALID_UUID_2 });
    expect(result.valid).toBe(true);
  });

  it("rejectează body non-object", () => {
    const result = validateCreateGuest("string");
    expect(result.valid).toBe(false);
  });
});

// ─── validateUpdateGuest ─────────────────────────────────────────────────────

describe("validateUpdateGuest", () => {
  it("acceptă update valid cu un câmp", () => {
    const result = validateUpdateGuest({ first_name: "Maria" });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.first_name).toBe("Maria");
  });

  it("rejectează body gol", () => {
    const result = validateUpdateGuest({});
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors[0].field).toBe("body");
  });

  it("rejectează first_name gol", () => {
    const result = validateUpdateGuest({ first_name: "" });
    expect(result.valid).toBe(false);
  });

  it("rejectează first_name cu spații", () => {
    const result = validateUpdateGuest({ first_name: "   " });
    expect(result.valid).toBe(false);
  });

  // 3.7 sanitation în update
  it("trimează spații din first_name", () => {
    const result = validateUpdateGuest({ first_name: "  Maria  " });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.first_name).toBe("Maria");
  });

  it("stripează HTML din first_name", () => {
    const result = validateUpdateGuest({ first_name: "<em>Maria</em>" });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.first_name).toBe("Maria");
  });

  it("acceptă last_name null explicit", () => {
    const result = validateUpdateGuest({ last_name: null });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.last_name).toBeNull();
  });

  it("acceptă display_name null explicit", () => {
    const result = validateUpdateGuest({ display_name: null });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.display_name).toBeNull();
  });

  it("rejectează display_name gol", () => {
    const result = validateUpdateGuest({ display_name: "" });
    expect(result.valid).toBe(false);
  });

  it("rejectează side invalid", () => {
    const result = validateUpdateGuest({ side: "center" });
    expect(result.valid).toBe(false);
  });

  it("acceptă side null explicit", () => {
    const result = validateUpdateGuest({ side: null });
    expect(result.valid).toBe(true);
  });

  it("rejectează is_vip non-boolean", () => {
    const result = validateUpdateGuest({ is_vip: "yes" });
    expect(result.valid).toBe(false);
  });

  it("acceptă is_vip boolean", () => {
    const result = validateUpdateGuest({ is_vip: true });
    expect(result.valid).toBe(true);
  });

  it("trunchiază notes la 500 chars", () => {
    const result = validateUpdateGuest({ notes: "X".repeat(600) });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.notes!.length).toBe(500);
  });

  it("rejectează guest_group_id invalid UUID", () => {
    const result = validateUpdateGuest({ guest_group_id: "bad-uuid" });
    expect(result.valid).toBe(false);
  });

  it("acceptă guest_group_id null explicit", () => {
    const result = validateUpdateGuest({ guest_group_id: null });
    expect(result.valid).toBe(true);
  });
});
