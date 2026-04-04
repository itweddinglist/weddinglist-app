// =============================================================================
// lib/sanitize.ts
// Input sanitization for user-provided text fields.
// Rules from CONTEXT.md #17:
//   - first_name, last_name, display_name: trim, max 100 chars, strip HTML
//   - notes: trim, max 500 chars, strip HTML
// =============================================================================

function stripHtml(input: string): string {
  return input
    .replace(/<!--[\s\S]*?-->/g, "")   // HTML comments
    .replace(/<[^>]*>/g, " ")          // HTML tags → spațiu pentru separare
    .replace(/&[a-zA-Z]+;/g, " ")      // Named HTML entities
    .replace(/&#\d+;/g, " ")           // Numeric HTML entities
    .replace(/&#x[0-9a-fA-F]+;/g, " "); // Hex HTML entities
}

/**
 * Sanitizes a text field: strip HTML, collapse whitespace, trim, enforce max length.
 * Returns null if the result is empty after sanitization.
 */
export function sanitizeText(input: unknown, maxLength: number): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== "string") return null;

  const cleaned = stripHtml(input)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

  return cleaned.length > 0 ? cleaned : null;
}

/** Sanitizes a name field. Max 100 chars per CONTEXT.md #17. */
export function sanitizeName(input: unknown): string | null {
  return sanitizeText(input, 100);
}

/** Sanitizes a notes field. Max 500 chars per CONTEXT.md #17. */
export function sanitizeNotes(input: unknown): string | null {
  return sanitizeText(input, 500);
}

/** Validates UUID v4 format. */
export function isValidUuid(input: unknown): input is string {
  if (typeof input !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);
}

/** Validates that a value is one of the allowed enum values. */
export function isValidEnum<T extends string>(
  input: unknown,
  allowed: readonly T[]
): input is T {
  if (typeof input !== "string") return false;
  return (allowed as readonly string[]).includes(input);
}
