import type { RsvpAttendanceStatus } from "@/types/rsvp";
import { getTranslations, type RsvpLocale } from "./rsvp-translations";

/**
 * Hex colors pentru consumatori non-DOM (ex: react-pdf, email rendering).
 * UI (browser DOM) foloseste CSS variables direct: var(--green) etc.
 * din app/globals.css.
 *
 * TODO(dark-mode): cand implementam dark mode, extindem cu variants:
 *   RSVP_STATUS_COLORS_HEX = {
 *     light: { accepted: "#48bb78", ... },
 *     dark:  { accepted: "#XXXXXX", ... },
 *   }
 * si getStatusColorHex(status, theme) va primi parametru theme.
 * Momentan single theme (light) — rendering non-DOM e static, nu
 * depinde de user's OS theme.
 */
export const RSVP_STATUS_COLORS_HEX = {
  accepted: "#48bb78", // align cu --green din globals.css
  declined: "#e53e3e", // align cu --red
  maybe:    "#ecc94b", // align cu --yellow
  pending:  "#9da3bc", // NU align cu --muted (#7a7f99) — pastrat istoric
                       // pdf-export pentru zero visual change.
                       // Aliniere = design decision separat.
} as const;

export function getStatusColorHex(status: RsvpAttendanceStatus): string {
  return RSVP_STATUS_COLORS_HEX[status];
}

export function getStatusLabel(
  status: RsvpAttendanceStatus,
  locale: RsvpLocale = "ro",
): string {
  return getTranslations(locale).status[status];
}