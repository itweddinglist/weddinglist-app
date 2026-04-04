// =============================================================================
// lib/import/json-import.test.ts
// Teste pentru validare și preview import JSON — Faza 8.2
// =============================================================================

import { describe, it, expect } from "vitest";
import {
  validateImportPayload,
  buildImportPreview,
  MAX_GUESTS,
  MAX_TABLES,
} from "./validate-import";
import { EXPORT_FORMAT, EXPORT_SCHEMA_VERSION } from "../../lib/export/json-export";

// ─── Helper ───────────────────────────────────────────────────────────────────

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    format: EXPORT_FORMAT,
    schema_version: EXPORT_SCHEMA_VERSION,
    exported_at: "2026-04-03T12:00:00.000Z",
    wedding_id: "123e4567-e89b-12d3-a456-426614174000",
    counts: {
      events: 1,
      guests: 2,
      guest_events: 2,
      guest_groups: 0,
      tables: 1,
      seats: 8,
      seat_assignments: 1,
      budget_items: 0,
      payments: 0,
      rsvp_invitations: 0,
      rsvp_responses: 0,
    },
    data: {
      wedding: { id: "old-id", title: "Nunta Test" },
      events: [{ id: "ev1" }],
      guests: [{ id: "g1" }, { id: "g2" }],
      guest_events: [{ id: "ge1" }],
      guest_groups: [],
      tables: [{ id: "t1" }],
      seats: [],
      seat_assignments: [],
      budget_items: [],
      payments: [],
      rsvp_invitations: [],
      rsvp_responses: [],
    },
    ...overrides,
  };
}

// ─── validateImportPayload ────────────────────────────────────────────────────

describe("validateImportPayload", () => {
  it("acceptă payload valid", () => {
    const result = validateImportPayload(validPayload());
    expect(result.valid).toBe(true);
  });

  it("rejectează null", () => {
    const result = validateImportPayload(null);
    expect(result.valid).toBe(false);
  });

  it("rejectează string", () => {
    const result = validateImportPayload("not json");
    expect(result.valid).toBe(false);
  });

  it("rejectează format greșit", () => {
    const result = validateImportPayload(validPayload({ format: "alte-format" }));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("Format invalid");
  });

  it("rejectează schema_version greșită", () => {
    const result = validateImportPayload(validPayload({ schema_version: "2.0" }));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("schemă incompatibilă");
  });

  it("rejectează fără wedding_id", () => {
    const result = validateImportPayload(validPayload({ wedding_id: undefined }));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("wedding_id");
  });

  it("rejectează fără exported_at", () => {
    const result = validateImportPayload(validPayload({ exported_at: undefined }));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("exported_at");
  });

  it("rejectează fără data", () => {
    const result = validateImportPayload(validPayload({ data: undefined }));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("data");
  });

  it("rejectează dacă guests nu e array", () => {
    const payload = validPayload();
    (payload.data as any).guests = null;
    const result = validateImportPayload(payload);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("guests");
  });

  it("rejectează dacă tables nu e array", () => {
    const payload = validPayload();
    (payload.data as any).tables = "invalid";
    const result = validateImportPayload(payload);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("tables");
  });

  it("rejectează dacă wedding lipsește din data", () => {
    const payload = validPayload();
    (payload.data as any).wedding = null;
    const result = validateImportPayload(payload);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("wedding");
  });

  it(`rejectează prea mulți guests (>${MAX_GUESTS})`, () => {
    const payload = validPayload();
    (payload.data as any).guests = Array(MAX_GUESTS + 1).fill({ id: "g" });
    const result = validateImportPayload(payload);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("invitați");
  });

  it(`rejectează prea multe tables (>${MAX_TABLES})`, () => {
    const payload = validPayload();
    (payload.data as any).tables = Array(MAX_TABLES + 1).fill({ id: "t" });
    const result = validateImportPayload(payload);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("mese");
  });

  it("acceptă arrays goale", () => {
    const payload = validPayload();
    (payload.data as any).budget_items = [];
    (payload.data as any).payments = [];
    const result = validateImportPayload(payload);
    expect(result.valid).toBe(true);
  });
});

// ─── buildImportPreview ───────────────────────────────────────────────────────

describe("buildImportPreview", () => {
  it("returnează preview corect", () => {
    const payload = validPayload() as any;
    const preview = buildImportPreview(payload);
    expect(preview.wedding_title).toBe("Nunta Test");
    expect(preview.exported_at).toBe("2026-04-03T12:00:00.000Z");
    expect(preview.counts.guests).toBe(2);
    expect(preview.warnings).toHaveLength(0);
  });

  it("adaugă warning dacă 0 guests", () => {
    const payload = validPayload() as any;
    payload.counts.guests = 0;
    const preview = buildImportPreview(payload);
    expect(preview.warnings.some((w: string) => w.includes("invitați"))).toBe(true);
  });

  it("adaugă warning dacă 0 events", () => {
    const payload = validPayload() as any;
    payload.counts.events = 0;
    const preview = buildImportPreview(payload);
    expect(preview.warnings.some((w: string) => w.includes("evenimente"))).toBe(true);
  });

  it("adaugă warning dacă 0 tables", () => {
    const payload = validPayload() as any;
    payload.counts.tables = 0;
    const preview = buildImportPreview(payload);
    expect(preview.warnings.some((w: string) => w.includes("mese"))).toBe(true);
  });

  it("nu adaugă warnings pentru backup complet", () => {
    const payload = validPayload() as any;
    const preview = buildImportPreview(payload);
    expect(preview.warnings).toHaveLength(0);
  });
});