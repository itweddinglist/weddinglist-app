// =============================================================================
// lib/csv/parse-guests.test.ts
// Unit tests for CSV parser and guest row validation — Phase 3.4
// =============================================================================

import { describe, it, expect } from "vitest";
import { parseCsvText, mapHeaders, parseGuestsCsv } from "./parse-guests";

// ─── parseCsvText ────────────────────────────────────────────────────────────

describe("parseCsvText", () => {
  it("parsează CSV simplu", () => {
    const r = parseCsvText("a,b,c\n1,2,3");
    expect(r).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
  });

  it("gestionează quoted fields cu virgulă", () => {
    const r = parseCsvText(`"Ion, Maria",Popescu`);
    expect(r[0][0]).toBe("Ion, Maria");
    expect(r[0][1]).toBe("Popescu");
  });

  it("gestionează escaped quotes", () => {
    const r = parseCsvText(`"Ion ""Nicu"" Pop"`);
    expect(r[0][0]).toBe('Ion "Nicu" Pop');
  });

  it("gestionează CRLF", () => {
    const r = parseCsvText("a,b\r\n1,2");
    expect(r).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("stripează BOM", () => {
    const r = parseCsvText("\uFEFFprenume,nume\nIon,Pop");
    expect(r[0][0]).toBe("prenume");
  });

  it("gestionează newline în quoted field", () => {
    const r = parseCsvText(`"Ion\nMaria",Pop`);
    expect(r[0][0]).toBe("Ion\nMaria");
  });
});

// ─── mapHeaders ──────────────────────────────────────────────────────────────

describe("mapHeaders", () => {
  it("recunoaște coloane EN", () => {
    const r = mapHeaders(["first_name", "last_name", "notes"]);
    expect("error" in r).toBe(false);
    if (!("error" in r)) {
      expect(r.mapping.first_name).toBe(0);
      expect(r.mapping.last_name).toBe(1);
      expect(r.mapping.notes).toBe(2);
    }
  });

  it("recunoaște coloane RO", () => {
    const r = mapHeaders(["prenume", "nume", "grup", "notițe"]);
    expect("error" in r).toBe(false);
    if (!("error" in r)) {
      expect(r.mapping.first_name).toBe(0);
      expect(r.mapping.last_name).toBe(1);
      expect(r.mapping.group).toBe(2);
      expect(r.mapping.notes).toBe(3);
    }
  });

  it("returnează error dacă lipsește first_name/prenume", () => {
    const r = mapHeaders(["nume", "email"]);
    expect("error" in r).toBe(true);
  });

  it("coloane necunoscute → unmapped", () => {
    const r = mapHeaders(["prenume", "email", "telefon"]);
    if (!("error" in r)) {
      expect(r.unmapped).toContain("email");
      expect(r.unmapped).toContain("telefon");
    }
  });

  it("case-insensitive", () => {
    const r = mapHeaders(["PRENUME", "NUME"]);
    expect("error" in r).toBe(false);
  });
});

// ─── parseGuestsCsv ──────────────────────────────────────────────────────────

describe("parseGuestsCsv", () => {
  it("parsează CSV valid minimal", () => {
    const r = parseGuestsCsv("prenume\nIon");
    expect(r.rows.length).toBe(1);
    expect(r.rows[0].first_name).toBe("Ion");
    expect(r.errors.length).toBe(0);
  });

  it("auto-generează display_name", () => {
    const r = parseGuestsCsv("prenume,nume\nIon,Popescu");
    expect(r.rows[0].display_name).toBe("Ion Popescu");
  });

  it("rejectează rând fără first_name", () => {
    const r = parseGuestsCsv("prenume,nume\n,Popescu");
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors[0].field).toBe("first_name");
    expect(r.errors[0].row).toBe(2);
  });

  it("sanitizează HTML din câmpuri", () => {
    const r = parseGuestsCsv("prenume\n<b>Ion</b>");
    expect(r.rows[0].first_name).toBe("Ion");
  });

  it("parsează is_vip — da/true/1", () => {
    const r = parseGuestsCsv("prenume,vip\nIon,da\nMaria,true\nAna,1");
    expect(r.rows[0].is_vip).toBe(true);
    expect(r.rows[1].is_vip).toBe(true);
    expect(r.rows[2].is_vip).toBe(true);
  });

  it("parsează side valid", () => {
    const r = parseGuestsCsv("prenume,side\nIon,bride");
    expect(r.rows[0].side).toBe("bride");
  });

  it("rejectează side invalid", () => {
    const r = parseGuestsCsv("prenume,side\nIon,center");
    expect(r.errors[0].field).toBe("side");
  });

  it("returnează error pentru fișier gol", () => {
    const r = parseGuestsCsv("");
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("returnează error pentru header fără prenume", () => {
    const r = parseGuestsCsv("email,telefon\nion@test.com,0700");
    expect(r.errors[0].field).toBe("header");
  });

  it("enforced max 500 rânduri", () => {
    const rows = ["prenume"];
    for (let i = 0; i < 501; i++) rows.push(`Guest${i}`);
    const r = parseGuestsCsv(rows.join("\n"));
    expect(r.errors[0].field).toBe("file");
    expect(r.errors[0].message).toContain("500");
  });

  it("skip rânduri goale", () => {
    const r = parseGuestsCsv("prenume\nIon\n\n\nMaria");
    expect(r.rows.length).toBe(2);
  });

  it("warning pentru coloane necunoscute", () => {
    const r = parseGuestsCsv("prenume,email\nIon,ion@test.com");
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings[0].message).toContain("email");
  });

  it("parsează grupuri", () => {
    const r = parseGuestsCsv("prenume,grup\nIon,Familie Mire");
    expect(r.rows[0].group_name).toBe("Familie Mire");
  });

  it("_csvRow e corect — row 2 pentru primul rând de date", () => {
    const r = parseGuestsCsv("prenume\nIon");
    expect(r.rows[0]._csvRow).toBe(2);
  });
});
