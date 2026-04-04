// =============================================================================
// lib/rsvp/validate-rsvp-submission.test.ts
// Teste pentru validateRsvpSubmission
// =============================================================================

import { describe, it, expect } from "vitest";
import { validateRsvpSubmission } from "./validate-rsvp-submission";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";
const VALID_UUID_2 = "223e4567-e89b-12d3-a456-426614174000";

const baseResponse = {
  guest_event_id: VALID_UUID,
  status: "accepted",
  meal_choice: "standard",
};

describe("validateRsvpSubmission", () => {
  // ── Valid ──────────────────────────────────────────────────────────────────

  it("acceptă payload minimal valid", () => {
    const result = validateRsvpSubmission({
      responses: [baseResponse],
    });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.data.responses).toHaveLength(1);
    expect(result.data.responses[0].status).toBe("accepted");
  });

  it("acceptă declined fără meal_choice", () => {
    const result = validateRsvpSubmission({
      responses: [{ guest_event_id: VALID_UUID, status: "declined" }],
    });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.data.responses[0].meal_choice).toBeNull();
  });

  it("acceptă maybe fără meal_choice", () => {
    const result = validateRsvpSubmission({
      responses: [{ guest_event_id: VALID_UUID, status: "maybe" }],
    });
    expect(result.valid).toBe(true);
  });

  it("acceptă multiple responses", () => {
    const result = validateRsvpSubmission({
      responses: [
        { guest_event_id: VALID_UUID, status: "accepted", meal_choice: "standard" },
        { guest_event_id: VALID_UUID_2, status: "declined" },
      ],
    });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.data.responses).toHaveLength(2);
  });

  it("sanitizează dietary_notes", () => {
    const result = validateRsvpSubmission({
      responses: [{
        ...baseResponse,
        dietary_notes: "<script>hack</script>alergic la nuci",
      }],
    });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.data.responses[0].dietary_notes).toBe("hack alergic la nuci");
  });

  it("sanitizează note", () => {
    const result = validateRsvpSubmission({
      responses: [{
        ...baseResponse,
        note: "<b>Felicitări!</b>",
      }],
    });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.data.responses[0].note).toBe("Felicitări!");
  });

  it("trunchiază dietary_notes la 500 chars", () => {
    const result = validateRsvpSubmission({
      responses: [{
        ...baseResponse,
        dietary_notes: "A".repeat(600),
      }],
    });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.data.responses[0].dietary_notes!.length).toBe(500);
  });

  it("acceptă vegetarian meal_choice", () => {
    const result = validateRsvpSubmission({
      responses: [{
        guest_event_id: VALID_UUID,
        status: "accepted",
        meal_choice: "vegetarian",
      }],
    });
    expect(result.valid).toBe(true);
  });

  // ── Invalid ────────────────────────────────────────────────────────────────

  it("rejectează body non-object", () => {
    const result = validateRsvpSubmission("string");
    expect(result.valid).toBe(false);
  });

  it("rejectează body null", () => {
    const result = validateRsvpSubmission(null);
    expect(result.valid).toBe(false);
  });

  it("rejectează responses gol", () => {
    const result = validateRsvpSubmission({ responses: [] });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors[0].field).toBe("responses");
  });

  it("rejectează responses lipsă", () => {
    const result = validateRsvpSubmission({});
    expect(result.valid).toBe(false);
  });

  it("rejectează mai mult de 10 responses", () => {
    const result = validateRsvpSubmission({
      responses: Array(11).fill(baseResponse),
    });
    expect(result.valid).toBe(false);
  });

  it("rejectează guest_event_id invalid", () => {
    const result = validateRsvpSubmission({
      responses: [{ guest_event_id: "not-uuid", status: "accepted" }],
    });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors[0].field).toContain("guest_event_id");
  });

  it("rejectează status invalid", () => {
    const result = validateRsvpSubmission({
      responses: [{ guest_event_id: VALID_UUID, status: "confirmed" }],
    });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors[0].field).toContain("status");
  });

  it("rejectează meal_choice invalid când accepted", () => {
    const result = validateRsvpSubmission({
      responses: [{
        guest_event_id: VALID_UUID,
        status: "accepted",
        meal_choice: "carne",
      }],
    });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors[0].field).toContain("meal_choice");
  });

  it("toate statusurile valide sunt acceptate", () => {
    const statuses = ["pending", "accepted", "declined", "maybe"];
    for (const status of statuses) {
      const result = validateRsvpSubmission({
        responses: [{ guest_event_id: VALID_UUID, status }],
      });
      expect(result.valid).toBe(true);
    }
  });
});