// =============================================================================
// types/seating.ts
// Tipuri centrale UI (Faza 0) + API request/response (Faza 6)
// =============================================================================

import type { SeatingEventProjection } from "@/types/guests"

// ── FAZA 0: tipuri centrale seating chart ─────────────────────────────────────

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
  guest_events?: SeatingEventProjection[]
  meta?: SeatingGuestMeta
}

// ── SeatingGuestWithEvents ────────────────────────────────────────────────────
// SeatingGuest cu guest_events GARANTAT (non-optional).
// Folosit de consumatori care depind de event context — eligibility, filtering etc.
// Semnatura explicita forteaza apelantul sa demonstreze ca are datele RSVP.
//
// Nota arhitecturala: folosim Omit pentru a izola axa "events" de axa "UI meta".
// Cele doua sunt independente conceptual — un guest poate avea events fara meta,
// si invers. Omit previne scurgeri intre axe prin mostenire implicita.
export interface SeatingGuestWithEvents extends Omit<SeatingGuest, 'guest_events' | 'meta'> {
  guest_events: SeatingEventProjection[]
}

// ── SeatingGuestUI ────────────────────────────────────────────────────────────
// SeatingGuest extins cu meta de UI state (isDeclined etc).
// Meta ramane optional aici — e legitim sa lipseasca in UI state initial,
// se populeaza lazy pe baza guest_events cand sunt disponibile.
//
// Nota arhitecturala: Omit analog cu SeatingGuestWithEvents — axa UI (meta) e
// izolata de axa events. Cele doua variante pot fi combinate explicit daca e
// nevoie: type X = SeatingGuestWithEvents & { meta?: SeatingGuestMeta }.
export interface SeatingGuestUI extends Omit<SeatingGuest, 'guest_events' | 'meta'> {
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
  guests: SeatingGuestWithEvents[]
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
  client_operation_id?: string;  // Faza 3: idempotency — generat O SINGURĂ DATĂ per intenție de Save
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
