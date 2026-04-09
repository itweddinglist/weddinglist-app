// =============================================================================
// lib/seating/use-seating-sync.ts
// Orchestrator Faza 6 — Seating ↔ Guests Integration.
// Snapshot minim: { reason, assignments, tables } — fără guest model coupling.
// Faza 9.5: cancel stale retries + snapshot hashing stabil
// Faza 10: confirmedSnapshotRef + SaveStatus + retry/confirmRevert
// Faza 11: load mutat pe server (GET /api/.../seating/load) — service_role
// =============================================================================

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  SeatingGuest,
  SeatingSnapshot,
  SeatingTableSnapshot,
  SeatingTableLoad,
  AssignmentState,
  NumericIdMap,
  SeatingFullSyncRequest,
  SeatingLoadResponse,
  SeatingIdMapEntry,
} from "./types";

const SYNC_DEBOUNCE_MS = 1500;
const SYNC_MAX_RETRIES = 3;
const SYNC_RETRY_BASE_MS = 1000;
const SAVED_IDLE_MS = 2000;

// ─── SaveStatus ───────────────────────────────────────────────────────────────

export type SaveStatus = "idle" | "saving" | "saved" | "unconfirmed";

// ─── ConfirmedSnapshot ────────────────────────────────────────────────────────

export interface ConfirmedSnapshot {
  tables: SeatingTableSnapshot[];
  guests: SeatingGuest[];
  serverConfirmedAt: number;
}

// ─── Options / Return ─────────────────────────────────────────────────────────

export interface UseSeatingSyncOptions {
  weddingId: string;
  eventId: string;
}

export interface SeatingSyncState {
  initialGuests: SeatingGuest[] | null;
  initialTables: SeatingTableLoad[] | null;
  isLoading: boolean;
  error: string | null;
  onSeatingStateChanged: (snapshot: SeatingSnapshot) => void;
  idMaps: NumericIdMap | null;
  // Faza 10
  saveStatus: SaveStatus;
  confirmedAt: number | null;
  confirmedSnapshot: ConfirmedSnapshot | null;
  retry: () => void;
  confirmRevert: () => void;
}

// ── Faza 9.5: hash stabil fără JSON.stringify pe obiecte mari ─────────────────
function stableSnapshotHash(
  tables: SeatingFullSyncRequest["tables"],
  assignments: SeatingFullSyncRequest["assignments"]
): string {
  const tHash = tables
    .map((t) => `${t.local_id}:${t.name}:${t.x}:${t.y}:${t.rotation}:${t.seat_count}`)
    .sort()
    .join("|");
  const aHash = assignments
    .map((a) => `${a.guest_local_id}:${a.table_local_id ?? "null"}`)
    .sort()
    .join("|");
  return `t:${tHash}__a:${aHash}`;
}

// ── Faza 10: reconstruiește SeatingGuest[] cu tableId-urile din assignments ───
function buildGuestsSnapshot(
  baseGuests: SeatingGuest[],
  assignments: AssignmentState
): SeatingGuest[] {
  return baseGuests.map((g) => ({
    ...g,
    tableId: (assignments[g.id] as number | null | undefined) ?? null,
  }));
}

// ── Reconstituie NumericIdMap din array-urile plate din răspunsul API ─────────
function buildNumericIdMap(
  guestIdMap: SeatingIdMapEntry[],
  tableIdMap: SeatingIdMapEntry[]
): NumericIdMap {
  return {
    guests:        new Map(guestIdMap.map((r) => [r.uuid, r.numericId])),
    tables:        new Map(tableIdMap.map((r) => [r.uuid, r.numericId])),
    guestsReverse: new Map(guestIdMap.map((r) => [r.numericId, r.uuid])),
    tablesReverse: new Map(tableIdMap.map((r) => [r.numericId, r.uuid])),
  };
}

export function useSeatingSync({
  weddingId,
  eventId,
}: UseSeatingSyncOptions): SeatingSyncState {
  const [initialGuests, setInitialGuests] = useState<SeatingGuest[] | null>(null);
  const [initialTables, setInitialTables] = useState<SeatingTableLoad[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [idMaps, setIdMaps] = useState<NumericIdMap | null>(null);

  // ── Faza 10: SaveStatus ────────────────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const idMapsRef = useRef<NumericIdMap | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedSnapshotRef = useRef<string | null>(null);

  // ── Faza 10: noi refs ──────────────────────────────────────────────────────
  const confirmedSnapshotRef = useRef<ConfirmedSnapshot | null>(null);
  const baseGuestsRef = useRef<SeatingGuest[]>([]);
  const latestSnapshotRef = useRef<SeatingSnapshot | null>(null);
  const isRetryInProgressRef = useRef(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── LOAD — server-side, service_role ────────────────────────────────────────

  useEffect(() => {
    if (!weddingId || !eventId) return;

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/weddings/${weddingId}/seating/load?event_id=${eventId}`
        );

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err?.error?.message ?? `Load failed: ${response.status}`);
        }

        const json = await response.json() as { data: SeatingLoadResponse };
        if (cancelled) return;

        const { guests, tables, guestIdMap, tableIdMap } = json.data;

        const maps = buildNumericIdMap(guestIdMap, tableIdMap);
        idMapsRef.current = maps;
        setIdMaps(maps);

        // baseGuests = guests fără tableId — pentru buildGuestsSnapshot la retry
        baseGuestsRef.current = guests.map((g) => ({ ...g, tableId: null }));

        const loadedTables = tables ?? [];
        confirmedSnapshotRef.current = {
          tables: loadedTables.map(({ uuid: _uuid, ...rest }) => rest),
          guests: structuredClone(guests),
          serverConfirmedAt: Date.now(),
        };

        setInitialGuests(guests);
        setInitialTables(loadedTables);
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Failed to load seating data";
          console.error("[SeatingSync] load failed:", err);
          setError(msg);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [weddingId, eventId]);

  // ── SYNC ────────────────────────────────────────────────────────────────────

  const doSync = useCallback(async (
    snapshot: SeatingSnapshot,
    retryCount = 0
  ): Promise<void> => {
    const maps = idMapsRef.current;
    if (!maps) return;

    setSaveStatus("saving");

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

    if (!snapshot.assignments) return;

    const assignments: SeatingFullSyncRequest["assignments"] = Object.entries(
      snapshot.assignments
    ).map(([guestId, tableId]) => ({
      guest_local_id: Number(guestId),
      table_local_id: tableId,
    }));

    const snapshotKey = stableSnapshotHash(tables, assignments);
    if (snapshotKey === lastSyncedSnapshotRef.current) {
      isRetryInProgressRef.current = false;
      setSaveStatus("saved");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), SAVED_IDLE_MS);
      return;
    }

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

        if (retryCount < SYNC_MAX_RETRIES) {
          const delay = SYNC_RETRY_BASE_MS * Math.pow(2, retryCount);
          retryTimerRef.current = setTimeout(() => doSync(snapshot, retryCount + 1), delay);
        } else {
          lastSyncedSnapshotRef.current = null;
          isRetryInProgressRef.current = false;
          setSaveStatus("unconfirmed");
        }
        return;
      }

      const result = await response.json();

      if (result.data?.bridge_updates?.tables?.length > 0) {
        for (const update of result.data.bridge_updates.tables) {
          maps.tables.set(update.uuid, update.local_id);
          maps.tablesReverse.set(update.local_id, update.uuid);
        }
        lastSyncedSnapshotRef.current = null;
      } else {
        lastSyncedSnapshotRef.current = snapshotKey;
      }

      confirmedSnapshotRef.current = {
        tables: structuredClone(snapshot.tables),
        guests: structuredClone(buildGuestsSnapshot(baseGuestsRef.current, snapshot.assignments)),
        serverConfirmedAt: Date.now(),
      };
      isRetryInProgressRef.current = false;
      setSaveStatus("saved");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), SAVED_IDLE_MS);
    } catch (err) {
      console.error("[SeatingSync] sync network error:", err);
      if (retryCount < SYNC_MAX_RETRIES) {
        const delay = SYNC_RETRY_BASE_MS * Math.pow(2, retryCount);
        retryTimerRef.current = setTimeout(() => doSync(snapshot, retryCount + 1), delay);
      } else {
        lastSyncedSnapshotRef.current = null;
        isRetryInProgressRef.current = false;
        setSaveStatus("unconfirmed");
      }
    }
  }, [weddingId, eventId]);

  // ── RETRY ─────────────────────────────────────────────────────────────────

  const retry = useCallback((): void => {
    if (isRetryInProgressRef.current) return;

    const snapshot = latestSnapshotRef.current;
    if (!snapshot) return;

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    isRetryInProgressRef.current = true;
    doSync(snapshot, 0);
  }, [doSync]);

  // ── CONFIRM REVERT ────────────────────────────────────────────────────────

  const confirmRevert = useCallback((): void => {
    isRetryInProgressRef.current = false;
    lastSyncedSnapshotRef.current = null;

    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    setSaveStatus("saved");
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), SAVED_IDLE_MS);
  }, []);

  const onSeatingStateChanged = useCallback(
    (snapshot: SeatingSnapshot) => {
      if (!idMapsRef.current) return;

      latestSnapshotRef.current = snapshot;

      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
        isRetryInProgressRef.current = false;
      }

      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => doSync(snapshot), SYNC_DEBOUNCE_MS);
    },
    [doSync]
  );

  // Cleanup complet
  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  return {
    initialGuests,
    initialTables,
    isLoading,
    error,
    onSeatingStateChanged,
    idMaps,
    saveStatus,
    confirmedAt: confirmedSnapshotRef.current?.serverConfirmedAt ?? null,
    confirmedSnapshot: confirmedSnapshotRef.current,
    retry,
    confirmRevert,
  };
}
