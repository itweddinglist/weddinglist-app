// =============================================================================
// lib/export/json-export.test.ts
// Teste pentru logica de export JSON — Faza 8.1
// =============================================================================

import { describe, it, expect } from "vitest";
import {
  slugifyTitle,
  buildExportFilename,
  EXPORT_FORMAT,
  EXPORT_SCHEMA_VERSION,
} from "./json-export";

// ─── slugifyTitle ─────────────────────────────────────────────────────────────

describe("slugifyTitle", () => {
  it("convertește la lowercase", () => {
    expect(slugifyTitle("Ioana Maria")).toBe("ioana-maria");
  });

  it("elimină diacriticele", () => {
    expect(slugifyTitle("Andreea & Alexandru")).toBe("andreea-alexandru");
  });

  it("înlocuiește spațiile cu cratime", () => {
    expect(slugifyTitle("Ion si Maria")).toBe("ion-si-maria");
  });

  it("elimină caracterele speciale", () => {
    expect(slugifyTitle("Nunta lui Ion!")).toBe("nunta-lui-ion");
  });

  it("elimină cratimele de la început și sfârșit", () => {
    expect(slugifyTitle("  Ion  ")).toBe("ion");
  });

  it("trunchiază la 50 caractere", () => {
    const long = "a".repeat(100);
    expect(slugifyTitle(long)).toHaveLength(50);
  });

  it("tratează string gol", () => {
    expect(slugifyTitle("")).toBe("");
  });

  it("tratează caractere românești", () => {
    expect(slugifyTitle("Nuntă în București")).toBe("nunta-in-bucuresti");
  });

  it("colapsează cratime multiple", () => {
    expect(slugifyTitle("Ion --- Maria")).toBe("ion-maria");
  });
});

// ─── buildExportFilename ──────────────────────────────────────────────────────

describe("buildExportFilename", () => {
  it("construiește filename corect", () => {
    const filename = buildExportFilename("Ioana & Alexandru", "2026-04-03T12:00:00.000Z");
    expect(filename).toBe("weddinglist-export-ioana-alexandru-2026-04-03.json");
  });

  it("folosește doar data, nu ora", () => {
    const filename = buildExportFilename("Test", "2026-09-15T23:59:59.999Z");
    expect(filename).toBe("weddinglist-export-test-2026-09-15.json");
  });

  it("are extensia .json", () => {
    const filename = buildExportFilename("Test", "2026-01-01T00:00:00.000Z");
    expect(filename.endsWith(".json")).toBe(true);
  });

  it("începe cu weddinglist-export-", () => {
    const filename = buildExportFilename("Test", "2026-01-01T00:00:00.000Z");
    expect(filename.startsWith("weddinglist-export-")).toBe(true);
  });
});

// ─── Constants ────────────────────────────────────────────────────────────────

describe("Export constants", () => {
  it("EXPORT_FORMAT are valoarea corectă", () => {
    expect(EXPORT_FORMAT).toBe("weddinglist-export");
  });

  it("EXPORT_SCHEMA_VERSION are valoarea corectă", () => {
    expect(EXPORT_SCHEMA_VERSION).toBe("1.0");
  });
});