// =============================================================================
// types/seating.ts
// API request/response types pentru Faza 6 — Seating ↔ Guests Integration
// Re-exportă din lib/seating/types.ts pentru conveniență în routes.
// =============================================================================

export type {
  SeatingGuest,
  SeatingTableSnapshot,
  SeatingSnapshot,
  ChangeReason,
  AssignmentState,
  AssignmentDiff,
  NumericIdMap,
  SeatingTableSyncItem,
  SeatingAssignmentSyncItem,
  SeatingFullSyncRequest,
  SeatingFullSyncResponse,
  SeatingAssignmentsResponse,
} from "../lib/seating/types";
