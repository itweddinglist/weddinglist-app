// =============================================================================
// lib/csv/parse-guests.ts
// CSV parsing and row validation for guest import.
// Zero external dependencies — hand-rolled RFC 4180 parser.
//
// FIX 1: validateRow() delegates to validateCreateGuest() from
//        lib/validation/guests.ts instead of duplicating sanitization logic.
// =============================================================================

import { sanitizeName } from "../sanitize";
import { validateCreateGuest } from "../validation/guests";
import type {
  CsvColumnName,
  ParsedGuestRow,
  ImportRowError,
  ImportRowWarning,
} from "../../types/guest-import";

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_ROWS = 500;

/** Dummy UUID used to satisfy validateCreateGuest()'s wedding_id requirement. */
const DUMMY_WEDDING_UUID = "00000000-0000-0000-0000-000000000000";

/**
 * Maps CSV header text (lowercase, trimmed) to canonical column name.
 * Supports English and Romanian aliases.
 */
const HEADER_ALIASES: Record<string, CsvColumnName> = {
  // English
  first_name: "first_name",
  firstname: "first_name",
  "first name": "first_name",
  last_name: "last_name",
  lastname: "last_name",
  "last name": "last_name",
  display_name: "display_name",
  displayname: "display_name",
  "display name": "display_name",
  group: "group",
  group_name: "group",
  side: "side",
  notes: "notes",
  note: "notes",
  is_vip: "is_vip",
  isvip: "is_vip",
  vip: "is_vip",

  // Romanian
  prenume: "first_name",
  nume: "last_name",
  "nume familie": "last_name",
  nume_afisat: "display_name",
  "nume afisat": "display_name",
  "nume afișat": "display_name",
  grup: "group",
  notite: "notes",
  notițe: "notes",
  "notă": "notes",
  nota: "notes",
  parte: "side",
};

/** Values that map to is_vip = true. */
const VIP_TRUTHY = new Set(["true", "1", "yes", "da", "vip", "x"]);

// ─── CSV Parser (RFC 4180 compliant) ────────────────────────────────────────

/**
 * Parses a CSV string into an array of string arrays.
 * Handles: quoted fields, embedded commas, embedded newlines in quotes,
 * escaped quotes (""), BOM, CRLF/LF/CR line endings.
 */
export function parseCsvText(text: string): string[][] {
  // Strip BOM
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < input.length && input[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        row.push(field);
        field = "";
        i++;
      } else if (ch === "\r") {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
        if (i + 1 < input.length && input[i + 1] === "\n") {
          i += 2;
        } else {
          i++;
        }
      } else if (ch === "\n") {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

// ─── Header Mapping ─────────────────────────────────────────────────────────

export interface ColumnMapping {
  first_name: number;
  last_name: number;
  display_name: number;
  group: number;
  side: number;
  notes: number;
  is_vip: number;
}

/**
 * Maps CSV header row to canonical column indices.
 * Returns error if first_name/prenume column is missing.
 */
export function mapHeaders(
  headerRow: string[]
): { mapping: ColumnMapping; unmapped: string[] } | { error: string } {
  const mapping: ColumnMapping = {
    first_name: -1,
    last_name: -1,
    display_name: -1,
    group: -1,
    side: -1,
    notes: -1,
    is_vip: -1,
  };

  const unmapped: string[] = [];

  for (let i = 0; i < headerRow.length; i++) {
    const raw = headerRow[i].trim().toLowerCase();
    if (!raw) continue;

    const canonical = HEADER_ALIASES[raw];
    if (canonical) {
      if (mapping[canonical] === -1) {
        mapping[canonical] = i;
      }
    } else {
      unmapped.push(headerRow[i].trim());
    }
  }

  if (mapping.first_name === -1) {
    return {
      error:
        "CSV must contain a 'first_name' or 'prenume' column. " +
        `Found columns: ${headerRow.map((h) => h.trim()).filter(Boolean).join(", ")}`,
    };
  }

  return { mapping, unmapped };
}

// ─── Row Validation (FIX 1: delegates to validateCreateGuest) ───────────────

function getCellValue(row: string[], index: number): string | null {
  if (index === -1) return null;
  const val = row[index]?.trim() ?? "";
  return val.length > 0 ? val : null;
}

/**
 * Converts a raw CSV is_vip cell to a value validateCreateGuest understands.
 * Returns true/false (boolean) or undefined if cell is empty.
 */
function parseIsVip(raw: string | null): boolean | undefined {
  if (raw === null) return undefined;
  return VIP_TRUTHY.has(raw.toLowerCase());
}

/**
 * Validates and sanitizes a single CSV data row by delegating to
 * validateCreateGuest() from lib/validation/guests.ts.
 *
 * Constructs an intermediate object matching CreateGuestInput shape,
 * passes it through the canonical validator, and extracts the result.
 * The group column is handled separately (not part of guest validation).
 */
export function validateRow(
  row: string[],
  rowNumber: number,
  mapping: ColumnMapping
): { parsed: ParsedGuestRow } | { errors: ImportRowError[] } {
  // Extract raw cell values
  const rawFirstName = getCellValue(row, mapping.first_name);
  const rawLastName = getCellValue(row, mapping.last_name);
  const rawDisplayName = getCellValue(row, mapping.display_name);
  const rawSide = getCellValue(row, mapping.side);
  const rawNotes = getCellValue(row, mapping.notes);
  const rawVip = getCellValue(row, mapping.is_vip);

  // Group is handled separately (not part of validateCreateGuest)
  const groupName = sanitizeName(getCellValue(row, mapping.group));

  // Build object matching CreateGuestInput for the canonical validator.
  // wedding_id uses a dummy UUID — the real one is checked at route level.
  // guest_group_id is null — resolved later by the route.
  const candidateInput: Record<string, unknown> = {
    wedding_id: DUMMY_WEDDING_UUID,
    first_name: rawFirstName,
    guest_group_id: null,
    is_vip: parseIsVip(rawVip),
  };

  // Only include optional fields if they have values (so the validator
  // applies its auto-generation logic correctly for display_name)
  if (rawLastName !== null) candidateInput.last_name = rawLastName;
  if (rawDisplayName !== null) candidateInput.display_name = rawDisplayName;
  if (rawSide !== null) candidateInput.side = rawSide.toLowerCase();
  if (rawNotes !== null) candidateInput.notes = rawNotes;

  // Run through the canonical validator
  const result = validateCreateGuest(candidateInput);

  if (!result.valid) {
    // Remap errors: replace "wedding_id" errors (always valid with dummy UUID)
    // and add row numbers
    const errors: ImportRowError[] = result.errors
      .filter((e) => e.field !== "wedding_id")
      .map((e) => ({
        row: rowNumber,
        field: e.field,
        message: e.message,
      }));

    return { errors };
  }

  // Extract validated+sanitized data from the canonical validator
  const validated = result.data;

  return {
    parsed: {
      _csvRow: rowNumber,
      first_name: validated.first_name,
      last_name: validated.last_name,
      display_name: validated.display_name,
      group_name: groupName,
      side: validated.side,
      notes: validated.notes,
      is_vip: validated.is_vip,
    },
  };
}

// ─── Full CSV Processing ────────────────────────────────────────────────────

export interface CsvParseResult {
  rows: ParsedGuestRow[];
  errors: ImportRowError[];
  warnings: ImportRowWarning[];
  totalDataRows: number;
}

/**
 * Parses and validates an entire CSV file.
 */
export function parseGuestsCsv(csvText: string): CsvParseResult {
  const errors: ImportRowError[] = [];
  const warnings: ImportRowWarning[] = [];

  // 1. Parse raw CSV
  const rawRows = parseCsvText(csvText);

  if (rawRows.length === 0) {
    errors.push({ row: 0, field: "file", message: "CSV file is empty." });
    return { rows: [], errors, warnings, totalDataRows: 0 };
  }

  // 2. Map headers
  const headerResult = mapHeaders(rawRows[0]);
  if ("error" in headerResult) {
    errors.push({ row: 1, field: "header", message: headerResult.error });
    return { rows: [], errors, warnings, totalDataRows: 0 };
  }

  const { mapping, unmapped } = headerResult;
  if (unmapped.length > 0) {
    warnings.push({
      row: 1,
      message: `Unrecognized columns (ignored): ${unmapped.join(", ")}`,
    });
  }

  // 3. Data rows (skip header, skip blank lines)
  const dataRows = rawRows.slice(1).filter((row) =>
    row.some((cell) => cell.trim().length > 0)
  );

  const totalDataRows = dataRows.length;

  if (totalDataRows === 0) {
    errors.push({
      row: 0,
      field: "file",
      message: "CSV file contains a header but no data rows.",
    });
    return { rows: [], errors, warnings, totalDataRows: 0 };
  }

  // 4. Enforce row limit
  if (totalDataRows > MAX_ROWS) {
    errors.push({
      row: 0,
      field: "file",
      message: `CSV contains ${totalDataRows} data rows. Maximum is ${MAX_ROWS}.`,
    });
    return { rows: [], errors, warnings, totalDataRows };
  }

  // 5. Validate each row via validateCreateGuest() wrapper
  const parsedRows: ParsedGuestRow[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const rowNumber = i + 2; // row 1 = header, data starts at row 2
    const result = validateRow(dataRows[i], rowNumber, mapping);

    if ("errors" in result) {
      errors.push(...result.errors);
    } else {
      parsedRows.push(result.parsed);
    }
  }

  return { rows: parsedRows, errors, warnings, totalDataRows };
}
