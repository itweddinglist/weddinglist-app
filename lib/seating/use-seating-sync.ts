// =============================================================================
// lib/seating/use-seating-sync.ts
// Orchestrator Faza 6-7 — Seating ↔ Guests Integration + Conflict System.
//
// Faza 7 adaugă:
//   - VERSION_MISMATCH: OCC check, rollback la confirmedSnapshotRef, dialog UI
//   - GUEST_NOT_FOUND: toast + saveError cu codul explicit
//   - CAPACITY_EXCEEDED: toast + saveError
//   - Tab overlap: localStorage session_id per tab, warning persistent
//   - forceOverwrite: retrimite cu p_force=true după dialog
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

// ─── SaveError ────────────────────────────────────────────────────────────────

export type SaveError =
  | { code: "VERSION_MISMATCH"; message: string }
  | { code: "GUEST_NOT_FOUND"; message: string }
  | { code: "CAPACITY_EXCEEDED"; message: string }
  | { code: "FORBIDDEN"; message: string }
  | { code: "TABLE_MAPPING_NOT_FOUND"; message: string };

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
  // Faza 7
  saveError: SaveError | null;
  clearSaveError: () => void;
  forceOverwrite: () => void;
  tabOverlap: boolean;
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

  // ── Faza 7: SaveError + tab overlap ───────────────────────────────────────
  const [saveError, setSaveError] = useState<SaveError | null>(null);
  const [tabOverlap, setTabOverlap] = useState(false);

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

  // ── Faza 7: version tracking ───────────────────────────────────────────────
  const currentVersionRef = useRef<number>(-1);

  // ── Faza 7: tab overlap detection ─────────────────────────────────────────
  const tabSessionIdRef = useRef<string>(
    typeof window !== "undefined"
      ? `wl_${Math.random().toString(36).slice(2)}`
      : ""
  );

  useEffect(() => {
    if (typeof window === "undefined" || !weddingId) return;
    const key = `wl_seating_tab_${weddingId}`;
    const myId = tabSessionIdRef.current;

    // Detectează dacă alt tab are deja planul deschis
    const existing = localStorage.getItem(key);
    if (existing && existing !== myId) {
      setTabOverlap(true);
    }

    localStorage.setItem(key, myId);

    const handler = (e: StorageEvent) => {
      if (e.key === key && e.newValue && e.newValue !== myId) {
        setTabOverlap(true);
      }
    };
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("storage", handler);
      if (localStorage.getItem(key) === myId) {
        localStorage.removeItem(key);
      }
    };
  }, [weddingId]);

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

        const { guests, tables, guestIdMap, tableIdMap, version } = json.data;

        const maps = buildNumericIdMap(guestIdMap, tableIdMap);
        idMapsRef.current = maps;
        setIdMaps(maps);

        // Salvează versiunea curentă pentru OCC la sync
        currentVersionRef.current = version ?? 0;

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
    retryCount = 0,
    useForce = false
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
    if (!useForce && snapshotKey === lastSyncedSnapshotRef.current) {
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
          body: JSON.stringify({
            event_id:       eventId,
            tables,
            assignments,
            version:        useForce ? -1 : currentVersionRef.current,
            force_overwrite: useForce,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const errCode: string = err?.error?.code ?? "";
        const errMsg: string  = err?.error?.message ?? "Eroare necunoscută";

        console.error("[SeatingSync] sync failed:", errCode, errMsg);

        // ── Erori care nu se retryează ────────────────────────────────────────
        if (errCode === "VERSION_MISMATCH") {
          isRetryInProgressRef.current = false;
          lastSyncedSnapshotRef.current = null;
          setSaveError({ code: "VERSION_MISMATCH", message: "Planul a fost modificat de pe alt dispozitiv." });
          setSaveStatus("unconfirmed");
          return;
        }

        if (errCode === "GUEST_NOT_FOUND") {
          isRetryInProgressRef.current = false;
          lastSyncedSnapshotRef.current = null;
          setSaveError({ code: "GUEST_NOT_FOUND", message: errMsg });
          setSaveStatus("unconfirmed");
          return;
        }

        if (errCode === "CAPACITY_EXCEEDED") {
          isRetryInProgressRef.current = false;
          lastSyncedSnapshotRef.current = null;
          setSaveError({ code: "CAPACITY_EXCEEDED", message: errMsg });
          setSaveStatus("unconfirmed");
          return;
        }

        if (errCode === "FORBIDDEN") {
          isRetryInProgressRef.current = false;
          lastSyncedSnapshotRef.current = null;
          setSaveError({ code: "FORBIDDEN", message: "Acces interzis. Reîncarcă pagina." });
          setSaveStatus("unconfirmed");
          return;
        }

        // ── Erori retryabile (TABLE_MAPPING_NOT_FOUND, network, etc.) ─────────
        if (retryCount < SYNC_MAX_RETRIES) {
          const delay = SYNC_RETRY_BASE_MS * Math.pow(2, retryCount);
          retryTimerRef.current = setTimeout(() => doSync(snapshot, retryCount + 1, useForce), delay);
        } else {
          lastSyncedSnapshotRef.current = null;
          isRetryInProgressRef.current = false;
          setSaveStatus("unconfirmed");
        }
        return;
      }

      const result = await response.json();

      // Actualizează versiunea locală cu ce a returnat serverul
      if (typeof result.data?.version === "number") {
        currentVersionRef.current = result.data.version;
      }

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
      setSaveError(null);
      setSaveStatus("saved");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), SAVED_IDLE_MS);
    } catch (err) {
      console.error("[SeatingSync] sync network error:", err);
      if (retryCount < SYNC_MAX_RETRIES) {
        const delay = SYNC_RETRY_BASE_MS * Math.pow(2, retryCount);
        retryTimerRef.current = setTimeout(() => doSync(snapshot, retryCount + 1, useForce), delay);
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

    setSaveError(null);
    isRetryInProgressRef.current = true;
    doSync(snapshot, 0);
  }, [doSync]);

  // ── FORCE OVERWRITE ───────────────────────────────────────────────────────
  // Faza 7: "Păstrează modificările mele" — trimite cu p_force=true

  const forceOverwrite = useCallback((): void => {
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

    setSaveError(null);
    isRetryInProgressRef.current = true;
    doSync(snapshot, 0, true);
  }, [doSync]);

  // ── CLEAR SAVE ERROR ──────────────────────────────────────────────────────

  const clearSaveError = useCallback((): void => {
    setSaveError(null);
  }, []);

  // ── CONFIRM REVERT ────────────────────────────────────────────────────────

  const confirmRevert = useCallback((): void => {
    isRetryInProgressRef.current = false;
    lastSyncedSnapshotRef.current = null;
    setSaveError(null);

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
    saveError,
    clearSaveError,
    forceOverwrite,
    tabOverlap,
  };
}
