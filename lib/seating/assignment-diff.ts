// =============================================================================
// lib/seating/assignment-diff.ts
// Diff extins cu toMove — pentru debugging, telemetry și future swap support.
// =============================================================================

import type { AssignmentState, AssignmentDiff } from "./types";

export function diffAssignments(
  prev: AssignmentState,
  current: AssignmentState
): AssignmentDiff {
  const toAssign:   AssignmentDiff["toAssign"]   = [];
  const toUnassign: AssignmentDiff["toUnassign"] = [];
  const toMove:     AssignmentDiff["toMove"]     = [];

  const allGuestIds = new Set([
    ...Object.keys(prev).map(Number),
    ...Object.keys(current).map(Number),
  ]);

  for (const guestId of allGuestIds) {
    const prevTableId    = prev[guestId]    ?? null;
    const currentTableId = current[guestId] ?? null;

    if (prevTableId === currentTableId) continue;

    if (prevTableId !== null && currentTableId !== null) {
      // Move: era la o masă, acum la alta
      toMove.push({
        guestNumericId:     guestId,
        fromTableNumericId: prevTableId,
        toTableNumericId:   currentTableId,
      });
    } else if (currentTableId !== null) {
      // Assign nou
      toAssign.push({ guestNumericId: guestId, tableNumericId: currentTableId });
    } else {
      // Unassign
      toUnassign.push({ guestNumericId: guestId });
    }
  }

  return { toAssign, toUnassign, toMove };
}

export function extractAssignmentState(
  guests: { id: number; tableId: number | null }[]
): AssignmentState {
  const state: AssignmentState = {};
  for (const guest of guests) {
    state[guest.id] = guest.tableId;
  }
  return state;
}

export function hasChanges(prev: AssignmentState, current: AssignmentState): boolean {
  const diff = diffAssignments(prev, current);
  return diff.toAssign.length > 0 || diff.toUnassign.length > 0 || diff.toMove.length > 0;
}
