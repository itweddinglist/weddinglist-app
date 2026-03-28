// =============================================================================
// types/guest-events.ts
// Domain types for Guest Events CRUD — Phase 3.2
// Extends types from types/guests.ts (GuestEventRow, AttendanceStatus)
// =============================================================================

import type { GuestEventRow, AttendanceStatus, GuestRow } from "./guests";

// Re-export for convenience
export type { GuestEventRow, AttendanceStatus };

// ─── API Request Types ──────────────────────────────────────────────────────

/** POST /api/guest-events — Associate a guest with an event. */
export interface CreateGuestEventInput {
  wedding_id: string;
  event_id: string;
  guest_id: string;
  attendance_status?: AttendanceStatus | null;
  meal_choice?: string | null;
  plus_one_label?: string | null;
}

/** PUT /api/guest-events/[id] — Update a guest-event association. */
export interface UpdateGuestEventInput {
  attendance_status?: AttendanceStatus | null;
  meal_choice?: string | null;
  plus_one_label?: string | null;
}

/** POST /api/guest-events/bulk — Associate all wedding guests with an event. */
export interface BulkCreateGuestEventsInput {
  wedding_id: string;
  event_id: string;
  /**
   * Default attendance_status for all newly created guest_events.
   * PRODUCT RULE: defaults to 'pending' if not provided.
   * attendance_status can be null in individual create/update (intentional —
   * allows "no status set yet"). In bulk, we always set an explicit status
   * so the event roster is complete. 'pending' = invited but not yet responded.
   */
  attendance_status?: AttendanceStatus;
}

// ─── API Response Types ─────────────────────────────────────────────────────

/** GET response — guest_event with joined guest info for display. */
export interface GuestEventWithGuest extends GuestEventRow {
  guest: Pick<GuestRow, "id" | "first_name" | "last_name" | "display_name" | "is_vip" | "side">;
}

/** POST /api/guest-events/bulk response. */
export interface BulkCreateResult {
  created: number;
  skipped: number;
  total_guests: number;
  event_id: string;
  /** True when all guests were already associated — useful for UI toasts. */
  already_complete: boolean;
}
