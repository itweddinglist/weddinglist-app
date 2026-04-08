// =============================================================================
// lib/seating/types.ts
// Contracte pentru Faza 6 — Seating ↔ Guests Integration
// =============================================================================

// ─── SeatingGuest ─────────────────────────────────────────────────────────────
// Forma exactă pe care seating engine-ul o consumă.
// Identică cu schema internă existentă din app/seating-chart/.

export interface SeatingGuest {
  id: number;              // numeric_id din seating_id_maps — stabil, persistent
  prenume: string;         // ← guests.first_name
  nume: string;            // ← guests.last_name ?? ''
  grup: string;            // ← guest_groups.name ?? 'Fără grup'
  meniu: string;           // ← guest_events.meal_choice ?? 'Standard'
  status: string;          // mapped: attending→confirmat, declined→declinat, *→in_asteptare
  tableId: number | null;  // ← din seat_assignments, mapped prin id-bridge
}

// ─── SeatingTable ─────────────────────────────────────────────────────────────
// Snapshot al unei mese pentru sync și diff.

export interface SeatingTableSnapshot {
  id: number;        // numeric_id local
  name: string;
  type: string;
  seats: number;
  x: number;
  y: number;
  rotation: number;
  isRing: boolean;
}

// ─── SeatingSnapshot ──────────────────────────────────────────────────────────
// Payload emis de onSeatingStateChanged din useSeatingData.

export type ChangeReason = "assignments" | "layout" | "both";

export interface SeatingSnapshot {
  reason: ChangeReason;
  assignments: AssignmentState;   // guest numeric_id → table numeric_id | null
  tables: SeatingTableSnapshot[];
}

// ─── AssignmentState ──────────────────────────────────────────────────────────
// guest numeric_id → table numeric_id | null

export type AssignmentState = Record<number, number | null>;

// ─── AssignmentDiff ───────────────────────────────────────────────────────────

export interface AssignmentDiff {
  toAssign:   { guestNumericId: number; tableNumericId: number }[];
  toUnassign: { guestNumericId: number }[];
  toMove:     { guestNumericId: number; fromTableNumericId: number; toTableNumericId: number }[];
}

// ─── ID Bridge ────────────────────────────────────────────────────────────────

export interface NumericIdMap {
  guests: Map<string, number>;  // uuid → numeric_id
  tables: Map<string, number>;  // uuid → numeric_id
  guestsReverse: Map<number, string>;  // numeric_id → uuid
  tablesReverse: Map<number, string>;  // numeric_id → uuid
}

// ─── API Request / Response ───────────────────────────────────────────────────

export interface SeatingTableSyncItem {
  local_id: number;
  uuid: string | null;  // null = table nouă, de creat
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
  table_local_id: number | null;  // null = unassigned
}

export interface SeatingFullSyncRequest {
  event_id: string;
  tables: SeatingTableSyncItem[];
  assignments: SeatingAssignmentSyncItem[];
}

export interface SeatingFullSyncResponse {
  success: true;
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

export interface SeatingIdMapEntry {
  uuid: string;
  numericId: number;
}

export interface SeatingLoadResponse {
  guests: SeatingGuest[];
  guestIdMap: SeatingIdMapEntry[];
  tableIdMap: SeatingIdMapEntry[];
}
