// =============================================================================
// types/seating.ts
// Tipuri centrale UI (Faza 0) + API request/response (Faza 6)
// =============================================================================

// ── FAZA 0: tipuri centrale seating chart ─────────────────────────────────────

export type AttendanceStatus =
  | 'confirmed'
  | 'declined'
  | 'pending'
  | 'invited'
  | null

// Tipuri reale din geometry.js: round, square, rect, prezidiu, bar
// (spec inițial avea 'rectangle' și 'oval' — nu există în cod)
export type TableType =
  | 'round'
  | 'square'
  | 'rect'
  | 'prezidiu'
  | 'bar'

export interface Point {
  x: number
  y: number
}

export interface SeatingDimensions {
  width: number
  height: number
}

export interface GuestEvent {
  attendance_status: AttendanceStatus
}

export interface SeatingGuestMeta {
  isDeclined?: boolean
}

export interface SeatingGuest {
  id: number
  prenume: string
  nume: string
  grup: string
  status: string
  meniu: string
  tableId: number | null
  guest_events?: GuestEvent[]
  meta?: SeatingGuestMeta
}

export interface SeatingTable {
  id: number
  name: string
  type: TableType
  seats: number
  x: number
  y: number
  rotation: number
  isRing?: boolean
  deleted_at?: string | null
}

export interface CameraState {
  vx: number
  vy: number
  z: number
}

export interface SeatingSnapshot {
  tables: SeatingTable[]
  guests: SeatingGuest[]
}

export type SeatingAction =
  | { type: 'MOVE_TABLE'; payload: { id: number; pos: Point } }
  | { type: 'SELECT_TABLE'; payload: { id: number | null } }
  | { type: 'DELETE_TABLE'; payload: number }

// ── FAZA 6: API request/response types ───────────────────────────────────────

export type ChangeReason = "assignments" | "layout" | "both";

export type AssignmentState = Record<number, number | null>;

export interface SeatingTableSyncItem {
  local_id: number;
  uuid: string | null;
  name: string;
  table_type: string;
  seat_count: number;
  x: number;
  y: number;
  rotation: number;
  is_ring: boolean;
}

export interface SeatingAssignmentSyncItem {
  guest_local_id: number;
  table_local_id: number | null;
}

export interface SeatingFullSyncRequest {
  event_id: string;
  tables: SeatingTableSyncItem[];
  assignments: SeatingAssignmentSyncItem[];
  version?: number;
  force_overwrite?: boolean;
}

export interface SeatingFullSyncResponse {
  success: true;
  version: number;
  synced: {
    tables_created: number;
    tables_updated: number;
    tables_deleted: number;
    assignments_created: number;
    assignments_deleted: number;
  };
  bridge_updates: {
    tables: { local_id: number; uuid: string }[];
  };
  errors: { entity: string; id: string; error: string }[];
}

export interface SeatingAssignmentsResponse {
  assignments: {
    guest_event_id: string;
    seat_id: string;
    table_id: string;
    guest_id: string;
  }[];
}
