// =============================================================================
// lib/validation/guest-events.test.ts
// Unit tests for guest-events validators
// =============================================================================

import { describe, it, expect } from "vitest";
import {
  validateCreateGuestEvent,
  validateUpdateGuestEvent,
  validateBulkCreateGuestEvents,
} from "./guest-events";

const UUID1 = "123e4567-e89b-12d3-a456-426614174000";
const UUID2 = "223e4567-e89b-12d3-a456-426614174000";
const UUID3 = "323e4567-e89b-12d3-a456-426614174000";

const baseCreate = { wedding_id: UUID1, event_id: UUID2, guest_id: UUID3 };

// ─── validateCreateGuestEvent ────────────────────────────────────────────────

describe("validateCreateGuestEvent", () => {
  it("acceptă input minimal valid", () => {
    const r = validateCreateGuestEvent(baseCreate);
    expect(r.valid).toBe(true);
    if (r.valid) {
      expect(r.data.attendance_status).toBeNull();
      expect(r.data.meal_choice).toBeNull();
      expect(r.data.plus_one_label).toBeNull();
    }
  });

  it("acceptă attendance_status valid", () => {
    const r = validateCreateGuestEvent({ ...baseCreate, attendance_status: "attending" });
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.data.attendance_status).toBe("attending");
  });

  it("acceptă attendance_status null explicit", () => {
    const r = validateCreateGuestEvent({ ...baseCreate, attendance_status: null });
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.data.attendance_status).toBeNull();
  });

  it("rejectează attendance_status invalid", () => {
    const r = validateCreateGuestEvent({ ...baseCreate, attendance_status: "confirmed" });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors[0].field).toBe("attendance_status");
  });

  it("rejectează wedding_id invalid", () => {
    const r = validateCreateGuestEvent({ ...baseCreate, wedding_id: "bad" });
    expect(r.valid).toBe(false);
  });

  it("rejectează event_id invalid", () => {
    const r = validateCreateGuestEvent({ ...baseCreate, event_id: "bad" });
    expect(r.valid).toBe(false);
  });

  it("rejectează guest_id invalid", () => {
    const r = validateCreateGuestEvent({ ...baseCreate, guest_id: "bad" });
    expect(r.valid).toBe(false);
  });

  it("sanitizează meal_choice", () => {
    const r = validateCreateGuestEvent({ ...baseCreate, meal_choice: "<b>Vegan</b>" });
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.data.meal_choice).toBe("Vegan");
  });

  it("trunchiază meal_choice la 100 chars", () => {
    const r = validateCreateGuestEvent({ ...baseCreate, meal_choice: "V".repeat(150) });
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.data.meal_choice!.length).toBe(100);
  });

  it("sanitizează plus_one_label", () => {
    const r = validateCreateGuestEvent({ ...baseCreate, plus_one_label: "  Soț  " });
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.data.plus_one_label).toBe("Soț");
  });

  it("rejectează body non-object", () => {
    const r = validateCreateGuestEvent("string");
    expect(r.valid).toBe(false);
  });

  it("toate statusurile valide sunt acceptate", () => {
    const statuses = ["pending", "invited", "attending", "declined", "maybe"];
    for (const s of statuses) {
      const r = validateCreateGuestEvent({ ...baseCreate, attendance_status: s });
      expect(r.valid).toBe(true);
    }
  });
});

// ─── validateUpdateGuestEvent ────────────────────────────────────────────────

describe("validateUpdateGuestEvent", () => {
  it("acceptă update cu un câmp", () => {
    const r = validateUpdateGuestEvent({ attendance_status: "attending" });
    expect(r.valid).toBe(true);
  });

  it("rejectează body gol", () => {
    const r = validateUpdateGuestEvent({});
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors[0].field).toBe("body");
  });

  it("acceptă attendance_status null", () => {
    const r = validateUpdateGuestEvent({ attendance_status: null });
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.data.attendance_status).toBeNull();
  });

  it("rejectează attendance_status invalid", () => {
    const r = validateUpdateGuestEvent({ attendance_status: "unknown" });
    expect(r.valid).toBe(false);
  });

  it("sanitizează meal_choice", () => {
    const r = validateUpdateGuestEvent({ meal_choice: "<script>hack</script>" });
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.data.meal_choice).toBe("hack");
  });

  it("acceptă meal_choice null", () => {
    const r = validateUpdateGuestEvent({ meal_choice: null });
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.data.meal_choice).toBeNull();
  });

  it("acceptă plus_one_label null", () => {
    const r = validateUpdateGuestEvent({ plus_one_label: null });
    expect(r.valid).toBe(true);
  });

  it("trunchiază plus_one_label la 100 chars", () => {
    const r = validateUpdateGuestEvent({ plus_one_label: "X".repeat(200) });
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.data.plus_one_label!.length).toBe(100);
  });
});

// ─── validateBulkCreateGuestEvents ──────────────────────────────────────────

describe("validateBulkCreateGuestEvents", () => {
  const baseBulk = { wedding_id: UUID1, event_id: UUID2 };

  it("acceptă input minimal — default pending", () => {
    const r = validateBulkCreateGuestEvents(baseBulk);
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.data.attendance_status).toBe("pending");
  });

  it("acceptă attendance_status explicit", () => {
    const r = validateBulkCreateGuestEvents({ ...baseBulk, attendance_status: "invited" });
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.data.attendance_status).toBe("invited");
  });

  it("rejectează attendance_status invalid", () => {
    const r = validateBulkCreateGuestEvents({ ...baseBulk, attendance_status: "bad" });
    expect(r.valid).toBe(false);
  });

  it("rejectează wedding_id invalid", () => {
    const r = validateBulkCreateGuestEvents({ ...baseBulk, wedding_id: "bad" });
    expect(r.valid).toBe(false);
  });

  it("rejectează event_id invalid", () => {
    const r = validateBulkCreateGuestEvents({ ...baseBulk, event_id: "bad" });
    expect(r.valid).toBe(false);
  });

  it("rejectează body non-object", () => {
    const r = validateBulkCreateGuestEvents(null);
    expect(r.valid).toBe(false);
  });

  it("toate statusurile valide sunt acceptate în bulk", () => {
    const statuses = ["pending", "invited", "attending", "declined", "maybe"];
    for (const s of statuses) {
      const r = validateBulkCreateGuestEvents({ ...baseBulk, attendance_status: s });
      expect(r.valid).toBe(true);
    }
  });
});
