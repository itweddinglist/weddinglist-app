// =============================================================================
// lib/seating/use-seating-sync.ts
// Orchestrator Faza 6 — Seating ↔ Guests Integration.
// Snapshot minim: { reason, assignments, tables } — fără guest model coupling.
// =============================================================================

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { fetchAndAllocateIds } from "./id-bridge";
import { mapGuestsToSeating, type GuestWithEventData } from "./map-guests";
import { applyAssignments, type SeatAssignmentRow } from "./map-assignments";
import type { SeatingGuest, SeatingSnapshot, NumericIdMap, SeatingFullSyncRequest } from "./types";

const SYNC_DEBOUNCE_MS = 1500;
const SYNC_MAX_RETRIES = 3;
const SYNC_RETRY_BASE_MS = 1000;

export interface UseSeatingSyncOptions {
  weddingId: string;
  eventId: string;
  supabase: any;
}

export interface SeatingSyncState {
  initialGuests: SeatingGuest[] | null;
  isLoading: boolean;
  error: string | null;
  onSeatingStateChanged: (snapshot: SeatingSnapshot) => void;
  idMaps: NumericIdMap | null;
}

export function useSeatingSync({
  weddingId,
  eventId,
  supabase,
}: UseSeatingSyncOptions): SeatingSyncState {
  const [initialGuests, setInitialGuests] = useState<SeatingGuest[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [idMaps, setIdMaps] = useState<NumericIdMap | null>(null);

  const idMapsRef = useRef<NumericIdMap | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedSnapshotRef = useRef<string | null>(null);

  // ── LOAD ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!weddingId || !eventId) return;

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const { data: guests, error: guestsError } = await supabase
          .from("guests")
          .select(`
            id, first_name, last_name,
            guest_group:guest_groups(name),
            guest_events(attendance_status, meal_choice, event_id)
          `)
          .eq("wedding_id", weddingId);

        if (guestsError) throw guestsError;

        const guestsForEvent = (guests ?? []).map((g: any) => ({
          ...g,
          guest_events: g.guest_events?.filter((ge: any) => ge.event_id === eventId) ?? [],
        })) as GuestWithEventData[];

        const { data: assignments, error: assignmentsError } = await supabase
          .from("seat_assignments")
          .select(`
            guest_events!inner(guest_id, event_id, wedding_id),
            seats!inner(table_id)
          `)
          .eq("guest_events.event_id", eventId)
          .eq("guest_events.wedding_id", weddingId);

        if (assignmentsError) throw assignmentsError;

        const assignmentRows: SeatAssignmentRow[] = (assignments ?? []).map((row: any) => ({
          guest_id: row.guest_events.guest_id,
          table_id: row.seats.table_id,
        }));

        const guestUuids = guestsForEvent.map((g) => g.id);
        const tableUuids = [...new Set(assignmentRows.map((a) => a.table_id))];

        const maps = await fetchAndAllocateIds(supabase, weddingId, eventId, guestUuids, tableUuids);

        if (cancelled) return;

        idMapsRef.current = maps;
        setIdMaps(maps);

        const seatingGuests = mapGuestsToSeating(guestsForEvent, maps);
        const withAssignments = applyAssignments(seatingGuests, assignmentRows, maps);

        setInitialGuests(withAssignments);
      } catch (err: any) {
        if (!cancelled) {
          console.error("[SeatingSync] load failed:", err);
          setError(err.message ?? "Failed to load seating data");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [weddingId, eventId, supabase]);

  // ── SYNC ────────────────────────────────────────────────────────────────────

  const doSync = useCallback(async (
    snapshot: SeatingSnapshot,
    retryCount = 0
  ): Promise<void> => {
    const maps = idMapsRef.current;
    if (!maps) return;

    const tables: SeatingFullSyncRequest["tables"] = snapshot.tables.map((t) => ({
      local_id:   t.id,
      uuid:       maps.tablesReverse.get(t.id) ?? null,
      name:       t.name,
      table_type: t.type,
      seat_count: t.seats,
      x:          t.x,
      y:          t.y,
      rotation:   t.rotation,
      is_ring:    t.isRing,
    }));

    // FIX 1: snapshot.assignments (Record<number, number|null>) — nu snapshot.guests
    // FIX 2: guard pe assignments — previne crash la snapshot corupt
    if (!snapshot.assignments) return;

    const assignments: SeatingFullSyncRequest["assignments"] = Object.entries(
      snapshot.assignments
    ).map(([guestId, tableId]) => ({
      guest_local_id: Number(guestId),
      table_local_id: tableId,
    }));

    const snapshotKey = JSON.stringify({ tables, assignments });
    if (snapshotKey === lastSyncedSnapshotRef.current) return;

    try {
      const response = await fetch(
        `/api/weddings/${weddingId}/seating/sync`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_id: eventId, tables, assignments }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error("[SeatingSync] sync failed:", err);

        // FIX 5: retry exponential
        if (retryCount < SYNC_MAX_RETRIES) {
          const delay = SYNC_RETRY_BASE_MS * Math.pow(2, retryCount);
          setTimeout(() => doSync(snapshot, retryCount + 1), delay);
        } else {
          // Marcam ca nesincronizat — retry la next change
          lastSyncedSnapshotRef.current = null;
        }
        return;
      }

      const result = await response.json();

      // Update bridge cu tables noi create pe server
      if (result.data?.bridge_updates?.tables?.length > 0) {
        for (const update of result.data.bridge_updates.tables) {
          maps.tables.set(update.uuid, update.local_id);
          maps.tablesReverse.set(update.local_id, update.uuid);
        }
        // FIX 6: reset snapshot după bridge update — mapping s-a schimbat
        lastSyncedSnapshotRef.current = null;
      } else {
        lastSyncedSnapshotRef.current = snapshotKey;
      }
    } catch (err) {
      console.error("[SeatingSync] sync network error:", err);
      // FIX 5: retry la next change
      lastSyncedSnapshotRef.current = null;
    }
  }, [weddingId, eventId]);

  const onSeatingStateChanged = useCallback(
    (snapshot: SeatingSnapshot) => {
      if (!idMapsRef.current) return;

      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => doSync(snapshot), SYNC_DEBOUNCE_MS);
    },
    [doSync]
  );

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, []);

  return { initialGuests, isLoading, error, onSeatingStateChanged, idMaps };
}
