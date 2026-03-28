// =============================================================================
// types/guest-import.ts
// Types for CSV Guest Import — Phase 3.4 (revised)
// =============================================================================

import type { GuestSide } from "./guests";

// ─── CSV Column Mapping ─────────────────────────────────────────────────────

/**
 * Canonical column names after header normalization.
 * CSV headers are case-insensitive with Romanian aliases supported.
 */
export type CsvColumnName =
  | "first_name"
  | "last_name"
  | "display_name"
  | "group"
  | "side"
  | "notes"
  | "is_vip";

// ─── Parsed Row ─────────────────────────────────────────────────────────────

/**
 * A single CSV row after parsing + validation via validateCreateGuest().
 * All text fields are already sanitized by the validator.
 * _csvRow tracks the original CSV line number (1-based, header=1) for errors.
 */
export interface ParsedGuestRow {
  _csvRow: number;
  first_name: string;
  last_name: string | null;
  display_name: string;
  group_name: string | null;
  side: GuestSide | null;
  notes: string | null;
  is_vip: boolean;
}

// ─── Import Result ──────────────────────────────────────────────────────────

export interface ImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface ImportRowWarning {
  row: number;
  message: string;
}

/**
 * Import result with clear counting semantics:
 *
 * - created:    rows inserted successfully into the database.
 * - skipped:    rows intentionally ignored (DB duplicate or intra-CSV duplicate).
 * - errors[]:   rows that failed validation OR DB insert. NOT counted in skipped.
 * - warnings[]: informational (unrecognized columns, group ignored, etc.)
 * - total_rows: total data rows parsed from CSV (excl. header + blank lines).
 *
 * Invariant: created + skipped + len(unique error rows) <= total_rows
 */
export interface ImportResult {
  created: number;
  skipped: number;
  errors: ImportRowError[];
  warnings: ImportRowWarning[];
  total_rows: number;
}
