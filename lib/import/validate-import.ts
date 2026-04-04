// =============================================================================
// lib/import/validate-import.ts
// Validare import JSON — 3 straturi
// 1. JSON valid + format + schema_version
// 2. Schema — toate cheile prezente, arrays există
// 3. Limite — dimensiune, counts
// =============================================================================

import type { WeddingExport, ExportCounts } from "../../lib/export/json-export";
import { EXPORT_FORMAT, EXPORT_SCHEMA_VERSION } from "../../lib/export/json-export";

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_GUESTS = 1000;
export const MAX_TABLES = 200;

export type ValidationResult =
  | { valid: true; data: WeddingExport }
  | { valid: false; error: string };

export interface ImportPreview {
  wedding_title: string;
  exported_at: string;
  counts: ExportCounts;
  warnings: string[];
}

// ─── Validare principală ──────────────────────────────────────────────────────

export function validateImportPayload(raw: unknown): ValidationResult {
  // ── Strat 1: structură de bază ────────────────────────────────────────────
  if (!raw || typeof raw !== "object") {
    return { valid: false, error: "Fișierul nu este un JSON valid." };
  }

  const obj = raw as Record<string, unknown>;

  if (obj.format !== EXPORT_FORMAT) {
    return { valid: false, error: `Format invalid. Așteptat: "${EXPORT_FORMAT}".` };
  }

  if (obj.schema_version !== EXPORT_SCHEMA_VERSION) {
    return {
      valid: false,
      error: `Versiune schemă incompatibilă. Așteptat: "${EXPORT_SCHEMA_VERSION}", primit: "${obj.schema_version}".`,
    };
  }

  if (!obj.wedding_id || typeof obj.wedding_id !== "string") {
    return { valid: false, error: "Câmpul wedding_id lipsește sau este invalid." };
  }

  if (!obj.exported_at || typeof obj.exported_at !== "string") {
    return { valid: false, error: "Câmpul exported_at lipsește sau este invalid." };
  }

  if (!obj.data || typeof obj.data !== "object") {
    return { valid: false, error: "Câmpul data lipsește sau este invalid." };
  }

  // ── Strat 2: schema data ──────────────────────────────────────────────────
  const data = obj.data as Record<string, unknown>;

  const requiredArrays = [
    "events",
    "guests",
    "guest_events",
    "guest_groups",
    "tables",
    "seats",
    "seat_assignments",
    "budget_items",
    "payments",
    "rsvp_invitations",
    "rsvp_responses",
  ];

  for (const key of requiredArrays) {
    if (!Array.isArray(data[key])) {
      return {
        valid: false,
        error: `Câmpul data.${key} lipsește sau nu este un array.`,
      };
    }
  }

  if (!data.wedding || typeof data.wedding !== "object") {
    return { valid: false, error: "Câmpul data.wedding lipsește sau este invalid." };
  }

  // ── Strat 3: limite ───────────────────────────────────────────────────────
  const guests = data.guests as unknown[];
  const tables = data.tables as unknown[];

  if (guests.length > MAX_GUESTS) {
    return {
      valid: false,
      error: `Prea mulți invitați în backup (${guests.length}). Maximum permis: ${MAX_GUESTS}.`,
    };
  }

  if (tables.length > MAX_TABLES) {
    return {
      valid: false,
      error: `Prea multe mese în backup (${tables.length}). Maximum permis: ${MAX_TABLES}.`,
    };
  }

  return { valid: true, data: raw as WeddingExport };
}

// ─── Preview ──────────────────────────────────────────────────────────────────

export function buildImportPreview(exportData: WeddingExport): ImportPreview {
  const { data, exported_at, counts } = exportData;
  const warnings: string[] = [];

  if (counts.guests === 0) {
    warnings.push("Backup fără invitați.");
  }

  if (counts.events === 0) {
    warnings.push("Backup fără evenimente.");
  }

  if (counts.tables === 0) {
    warnings.push("Backup fără plan de mese.");
  }

  return {
    wedding_title: (data.wedding as any)?.title ?? "Nuntă",
    exported_at,
    counts,
    warnings,
  };
}