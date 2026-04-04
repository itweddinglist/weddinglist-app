// =============================================================================
// types/seating.ts
// API request/response types pentru Faza 6 — Seating ↔ Guests Integration
// =============================================================================

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
