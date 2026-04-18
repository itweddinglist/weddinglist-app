// =============================================================================
// types/guests.ts
// Domain types for Guests CRUD — Phase 3.1
// =============================================================================

// ─── Database Row Types ─────────────────────────────────────────────────────

/** Matches the `guests` table schema exactly. */
export interface GuestRow {
  id: string;
  wedding_id: string;
  guest_group_id: string | null;
  first_name: string;
  last_name: string | null;
  display_name: string;
  side: GuestSide | null;
  notes: string | null;
  is_vip: boolean;
  created_at: string;
  updated_at: string;
}

/** Matches the `guest_groups` table schema exactly. */
export interface GuestGroupRow {
  id: string;
  wedding_id: string;
  name: string;
  group_type: string | null;
  sort_order: number;
  notes: string | null;
}

/** Matches the `guest_events` table schema exactly. */
export interface GuestEventRow {
  id: string;
  wedding_id: string;
  event_id: string;
  guest_id: string;
  attendance_status: AttendanceStatus | null;
  meal_choice: string | null;
  plus_one_label: string | null;
  created_at: string;
  updated_at: string;
}

// ── Seating Chart Projection ─────────────────────────────────────────────────
// Subset de GuestEventRow folosit in seating chart.
// Reflecta exact campurile selectate in query /api/weddings/[id]/seating/load.
// Endpoint-ul e hot (se incarca la fiecare intrare in plan) — overfetching-ul
// e nejustificat pentru campuri neconsumabile in frontend (id, created_at, etc).
//
// Daca UI seating incepe sa consume campuri noi (ex: plus_one_label), adauga-le
// aici SI in query-ul din load route. Contractul trebuie sa ramana aliniat.
export type SeatingEventProjection = Pick<
  GuestEventRow,
  'attendance_status' | 'meal_choice' | 'event_id'
>;

// ─── Enums ──────────────────────────────────────────────────────────────────

export type GuestSide = "bride" | "groom" | "both" | "other";

// Matches DB CHECK constraint exactly:
// CHECK (attendance_status IN ('pending', 'invited', 'attending', 'declined', 'maybe'))
export type AttendanceStatus =
  | "pending"
  | "invited"
  | "attending"
  | "declined"
  | "maybe";

// ─── API Request Types ──────────────────────────────────────────────────────

/** POST /api/guests — Create a new guest. */
export interface CreateGuestInput {
  wedding_id: string;
  first_name: string;
  last_name?: string | null;
  display_name?: string | null; // Auto-generated from first+last if omitted
  guest_group_id?: string | null;
  side?: GuestSide | null;
  notes?: string | null;
  is_vip?: boolean;
}

/** PUT /api/guests/[id] — Update an existing guest. */
export interface UpdateGuestInput {
  first_name?: string;
  last_name?: string | null;
  display_name?: string | null;
  guest_group_id?: string | null;
  side?: GuestSide | null;
  notes?: string | null;
  is_vip?: boolean;
}

// ─── API Response Types ─────────────────────────────────────────────────────

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  /** Non-blocking warnings (e.g. duplicate name detected). Client should display these. */
  warnings?: string[];
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * GET /api/guests response shape.
 * guest_events included intentionally — seating chart needs attendance_status
 * per event for each guest. Full list for MVP; pagination at Phase 4.
 */
export interface GuestWithRelations extends GuestRow {
  guest_group: Pick<GuestGroupRow, "id" | "name"> | null;
  guest_events: GuestEventRow[];
}

// ─── Validation Types ───────────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

export type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; errors: ValidationError[] };
