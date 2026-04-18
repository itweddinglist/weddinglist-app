"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { MutableRefObject } from "react";
import {
  PLAN_W,
  PLAN_H,
  GRID,
  INITIAL_GUESTS,
  buildTemplate,
  getTableDims,
  getGroupColor,
} from "../utils/geometry.ts";
import { loadStorageState, saveStorageState } from "../utils/storage.ts";
import { calculateMagicFill } from "../utils/magicFill.ts";
import { isSeatingEligible } from "../utils/seating-eligibility.ts";
import type { SeatingGuest, SeatingGuestWithEvents, SeatingTable, CameraState, TableType, SeatingSnapshot, ChangeReason } from "@/types/seating";

export { isSeatingEligible };

// ── LOCAL TYPES ───────────────────────────────────────────────────────────────

type SaveStatus = "saving" | "saved" | "error"

type SeatingGuestWithMeta = SeatingGuestWithEvents & { meta: { isDeclined: boolean } }

interface HistoryEntry {
  guests: SeatingGuestWithEvents[]
  tables: SeatingTable[]
}

interface TableSnapshot {
  id: number
  name: string
  type: TableType
  seats: number
  x: number
  y: number
  rotation: number
  isRing: boolean
}

interface Snapshot {
  assignments: Record<string, number | null>
  tables: TableSnapshot[]
}

interface SeatingStateChangedData {
  reason: ChangeReason
  assignments: Record<string, number | null>
  tables: TableSnapshot[]
}

interface UseSeatingDataOptions {
  onSaveStatusChange?: ((status: SaveStatus) => void) | null
  initialGuests?: SeatingGuestWithEvents[] | null
  initialTables?: SeatingTable[] | null
  onSeatingStateChanged?: ((data: SeatingStateChangedData) => void) | null
}

type SeatingEffect =
  | { type: "SHOW_TOAST"; payload: { message: string; toastType: string } }
  | { type: "CLEAR_CLICKED_SEAT" }
  | { type: "SELECT_TABLE"; payload: { tableId: number | null } }
  | { type: "CLOSE_MODAL" }
  | { type: "CLOSE_EDIT_PANEL" }

interface SeatingActionResult {
  ok: boolean
  effects: SeatingEffect[]
}

interface SeatingActionConfirmRequired {
  title: string
  sub: string
  onConfirm: () => SeatingActionResult
}

interface SeatingActionResultWithConfirm extends SeatingActionResult {
  confirmRequired?: SeatingActionConfirmRequired
}

interface CreateTableModal {
  type: TableType
  seats: number
  name: string
  isRing?: boolean
}

// ── SPAWN ─────────────────────────────────────────────────────────────────────

function getSpawnPosition(
  proto: Pick<SeatingTable, "type" | "seats" | "isRing">,
  spawnIndex: number,
  camRef: MutableRefObject<CameraState>,
  canvasWRef: MutableRefObject<number>,
  canvasHRef: MutableRefObject<number>
): { x: number; y: number } {
  const cam = camRef.current;
  const cw = canvasWRef.current;
  const ch = canvasHRef.current;
  const d = getTableDims(proto);

  const OFFSET = Math.min(Math.max(Math.max(d.w as number, d.h as number) * 0.2, 32), 72);

  const cx = cam.vx + cw / cam.z / 2 - (d.w as number) / 2;
  const cy = cam.vy + ch / cam.z / 2 - (d.h as number) / 2;

  const rawX = cx + spawnIndex * OFFSET;
  const rawY = cy + spawnIndex * OFFSET;

  const x = Math.max(0, Math.min(PLAN_W - (d.w as number), Math.round(rawX / GRID) * GRID));
  const y = Math.max(0, Math.min(PLAN_H - (d.h as number), Math.round(rawY / GRID) * GRID));

  return { x, y };
}

// ── RESET HELPERS ─────────────────────────────────────────────────────────────

function buildRingOnly(): SeatingTable[] {
  return [
    {
      id: 1,
      name: "Ring Dans",
      type: "bar",
      seats: 0,
      x: 5100,
      y: 5150,
      rotation: 0,
      isRing: true,
    },
  ];
}

const RING_CENTER_X = 5100 + 300 / 2;
const RING_CENTER_Y = 5150 + 200 / 2;
const RESET_ZOOM = 0.9;

// ── HOOK ──────────────────────────────────────────────────────────────────────

/**
 * useSeatingData
 *
 * Owner exclusiv al data + business logic pentru seating chart.
 * NU știe de UI state.
 * NU apelează setClickedSeat, showToast, setModal etc.
 *
 * Toate acțiunile returnează { ok, effects[] } pentru ca page.js
 * să aplice efectele UI prin applySeatingEffect.
 */
export function useSeatingData(
  cam: CameraState,
  camRef: MutableRefObject<CameraState>,
  canvasWRef: MutableRefObject<number>,
  canvasHRef: MutableRefObject<number>,
  { onSaveStatusChange, initialGuests, initialTables, onSeatingStateChanged }: UseSeatingDataOptions = {}
) {
  // ── STATE ──
  const [guests, setGuests] = useState<SeatingGuestWithEvents[]>(() => (initialGuests ?? INITIAL_GUESTS).map((g) => ({ ...g })));
  const [tables, setTables] = useState<SeatingTable[]>(() =>
    initialTables ? initialTables.map((t) => ({ ...t } as SeatingTable)) : buildTemplate()
  );
  const [nextId, setNextId] = useState<number>(10);
  const [hydrated, setHydrated] = useState<boolean>(false);
  const [newTableIds, setNewTableIds] = useState<Set<number>>(new Set());

  // ── REFS ──
  const tablesRef = useRef<SeatingTable[]>(tables);
  const guestsRef = useRef<SeatingGuestWithEvents[]>(guests);
  const historyRef = useRef<HistoryEntry[]>([]);
  const spawnCounterRef = useRef<number>(0);
  const onSaveStatusChangeRef = useRef<((status: SaveStatus) => void) | null | undefined>(onSaveStatusChange);
  useEffect(() => { onSaveStatusChangeRef.current = onSaveStatusChange; }, [onSaveStatusChange]);

  useEffect(() => { tablesRef.current = tables; }, [tables]);
  useEffect(() => { guestsRef.current = guests; }, [guests]);

  // ── HYDRATION ──
  useEffect(() => {
    const cw = canvasWRef.current || 1200;
    const ch = canvasHRef.current || 700;
    const result = loadStorageState(cw, ch);
    if (!initialGuests && result.data.guests) setGuests(result.data.guests);
    // DB are prioritate față de localStorage — dacă initialTables e prezent, ignorăm localStorage
    if (!initialTables && result.data.tables) setTables(result.data.tables);
    if (result.data.nextId) setNextId(result.data.nextId);
    setHydrated(true);
  }, []);

  // ── SEATING STATE CHANGE NOTIFICATION ──
  const prevSnapshotRef = useRef<Snapshot | null>(null);
  const onSeatingStateChangedRef = useRef<((data: SeatingStateChangedData) => void) | null | undefined>(onSeatingStateChanged);
  useEffect(() => { onSeatingStateChangedRef.current = onSeatingStateChanged; }, [onSeatingStateChanged]);

  useEffect(() => {
    if (!hydrated) return;

    const assignmentsSnapshot: Record<string, number | null> = Object.fromEntries(
      guests.map((g) => [g.id, g.tableId ?? null])
    );

    const tablesSnapshot: TableSnapshot[] = tables.map((t) => ({
      id:       t.id,
      name:     t.name,
      type:     t.type,
      seats:    t.seats,
      x:        Math.round(t.x),
      y:        Math.round(t.y),
      rotation: Math.round(t.rotation || 0),
      isRing:   !!t.isRing,
    }));

    const snapshot: Snapshot = { assignments: assignmentsSnapshot, tables: tablesSnapshot };
    const prev = prevSnapshotRef.current;
    prevSnapshotRef.current = snapshot;

    if (prev === null) return;

    const assignmentsChanged = JSON.stringify(prev.assignments) !== JSON.stringify(snapshot.assignments);
    const tablesChanged = JSON.stringify(prev.tables) !== JSON.stringify(snapshot.tables);

    if (!assignmentsChanged && !tablesChanged) return;

    const reason: ChangeReason = assignmentsChanged && tablesChanged ? "both"
      : assignmentsChanged ? "assignments"
      : "layout";

    onSeatingStateChangedRef.current?.({ reason, assignments: assignmentsSnapshot, tables: tablesSnapshot });
  }, [guests, tables, hydrated]);

  // ── AUTOSAVE (debounced 500ms) ──
  useEffect(() => {
    if (!hydrated) return;
    onSaveStatusChangeRef.current?.("saving");
    const timer = setTimeout(() => {
      try {
        saveStorageState({ guests, tables, nextId, cam });
        onSaveStatusChangeRef.current?.("saved");
      } catch {
        onSaveStatusChangeRef.current?.("error");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [guests, tables, nextId, cam, hydrated]);

  // ── SAVE ACTION + UNDO ──
  const saveAction = useCallback(() => {
    historyRef.current = [
      ...historyRef.current.slice(-20),
      {
        guests: JSON.parse(JSON.stringify(guestsRef.current)),
        tables: JSON.parse(JSON.stringify(tablesRef.current)),
      },
    ];
  }, []);

  const undo = useCallback((): SeatingActionResult => {
    if (!historyRef.current.length) {
      return {
        ok: false,
        effects: [
          { type: "SHOW_TOAST", payload: { message: "Nimic de anulat", toastType: "yellow" } },
        ],
      };
    }
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    setGuests(prev.guests);
    setTables(prev.tables);
    return {
      ok: true,
      effects: [
        { type: "SHOW_TOAST", payload: { message: "Actiune anulata ↩", toastType: "rose" } },
      ],
    };
  }, []);

  // ── COMPUTED VALUES ──
  const guestsByTable = useMemo(() => {
    const map: Record<number, SeatingGuestWithMeta[]> = {};
    guests.forEach((g) => {
      if (g.tableId != null) {
        if (!map[g.tableId]) map[g.tableId] = [];
        map[g.tableId].push({
          ...g,
          meta: { isDeclined: g.guest_events[0]?.attendance_status === 'declined' },
        } as SeatingGuestWithMeta);
      }
    });
    return map;
  }, [guests]);

  const guestById = useMemo(() => new Map<number, SeatingGuestWithEvents>(guests.map((g) => [g.id, g])), [guests]);
  const tableById = useMemo(() => new Map<number, SeatingTable>(tables.map((t) => [t.id, t])), [tables]);

  const realTables = useMemo(() => tables.filter((t) => t.type !== "bar" && !t.isRing), [tables]);
  const totalSeats = useMemo(() => realTables.reduce((s, t) => s + t.seats, 0), [realTables]);
  const assignedCount = useMemo(() => guests.filter((g) => g.tableId != null).length, [guests]);
  const unassigned = useMemo(
    () => guests.filter((g) => g.tableId == null && isSeatingEligible(g)),
    [guests]
  );
  const progress = guests.length > 0 ? (assignedCount / guests.length) * 100 : 0;

  const menuStats = useMemo(
    () => guests.reduce<Record<string, number>>((acc, g) => { acc[g.meniu] = (acc[g.meniu] || 0) + 1; return acc; }, {}),
    [guests]
  );

  const guestMeta = useMemo(() => {
    const groupsMap = new Map<string, number>();
    for (const guest of guests) {
      const group = guest.grup?.trim();
      if (!group) continue;
      groupsMap.set(group, (groupsMap.get(group) || 0) + 1);
    }
    return {
      total: guests.length,
      seated: assignedCount,
      unseated: unassigned.length,
      groups: Array.from(groupsMap, ([name, count]) => ({ name, count })),
    };
  }, [guests, assignedCount, unassigned]);

  const groupColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const group of guestMeta.groups) map[group.name] = getGroupColor(group.name);
    return map;
  }, [guestMeta.groups]);

  // ── ASSIGN GUEST ──
  const assignGuest = useCallback((gId: number | string, tableId: number): SeatingActionResult => {
    const table = tableById.get(tableId);
    if (!table || table.type === "bar" || table.isRing) return { ok: false, effects: [] };

    const guest = guestById.get(parseInt(String(gId)));
    if (!guest || guest.tableId === tableId) return { ok: false, effects: [] };

    const occupied = guestsRef.current.filter((g) => g.tableId === tableId).length;
    if (occupied >= table.seats) {
      return {
        ok: false,
        effects: [
          { type: "SHOW_TOAST", payload: { message: "Masa este plină!", toastType: "yellow" } },
        ],
      };
    }

    saveAction();
    setGuests((prev) => prev.map((g) => (g.id === parseInt(String(gId)) ? { ...g, tableId } : g)));

    return {
      ok: true,
      effects: [
        {
          type: "SHOW_TOAST",
          payload: {
            message: `✓ ${guest.prenume} ${guest.nume[0]}. → ${table.name}`,
            toastType: "green",
          },
        },
        { type: "CLEAR_CLICKED_SEAT" },
      ],
    };
  }, [saveAction, guestById, tableById]);

  // ── UNASSIGN GUEST ──
  const unassignGuest = useCallback((guestId: number | null): SeatingActionResult => {
    if (!guestId) return { ok: false, effects: [] };

    const guest = guestsRef.current.find((g) => g.id === guestId);
    if (!guest || guest.tableId === null) return { ok: false, effects: [] };

    saveAction();
    setGuests((prev) => prev.map((g) => (g.id === guestId ? { ...g, tableId: null } : g)));

    return {
      ok: true,
      effects: [
        {
          type: "SHOW_TOAST",
          payload: {
            message: `${guest.prenume} ${guest.nume[0]}. eliminat`,
            toastType: "rose",
          },
        },
        { type: "CLEAR_CLICKED_SEAT" },
      ],
    };
  }, [saveAction]);

  // ── MAGIC FILL ──
  const magicFill = useCallback((): SeatingActionResult => {
    const anyUnassigned = guestsRef.current.some(
      (g) => g.tableId === null && isSeatingEligible(g) &&
        !(g.grup && g.grup.toLowerCase() === "prezidiu")
    );

    if (!anyUnassigned) {
      return {
        ok: false,
        effects: [
          { type: "SHOW_TOAST", payload: { message: "Toti invitatii au deja un loc!", toastType: "yellow" } },
        ],
      };
    }

    const result = calculateMagicFill(guestsRef.current, tablesRef.current);
    const { assignments, assignmentsCount, skippedGuests, prezidiuSkipped, skippedGroups, limitReached } = result;

    saveAction();
    setGuests((prev) =>
      prev.map((g) => assignments[g.id] !== undefined ? { ...g, tableId: assignments[g.id] } : g)
    );

    const effects: SeatingEffect[] = [
      { type: "SHOW_TOAST", payload: { message: `✨ ${assignmentsCount} invitați așezați automat`, toastType: "green" } },
    ];

    if (prezidiuSkipped > 0) {
      effects.push({ type: "SHOW_TOAST", payload: { message: `ℹ ${prezidiuSkipped} invitati din grupul "Prezidiu" au fost exclusi`, toastType: "rose" } });
    }
    if (skippedGuests.length > 0) {
      effects.push({ type: "SHOW_TOAST", payload: { message: `⚠ ${skippedGuests.length} invitati fara loc disponibil`, toastType: "yellow" } });
    }
    if (skippedGroups.length === 1) {
      effects.push({ type: "SHOW_TOAST", payload: { message: `⚠ ${skippedGroups[0].reason}`, toastType: "yellow" } });
    } else if (skippedGroups.length > 1) {
      effects.push({ type: "SHOW_TOAST", payload: { message: `⚠ ${skippedGroups.length} grupuri nu au putut fi plasate impreuna`, toastType: "yellow" } });
    }
    if (limitReached) {
      effects.push({ type: "SHOW_TOAST", payload: { message: "⚠ Solutie partiala — limita atinsa, se foloseste cel mai bun rezultat gasit", toastType: "yellow" } });
    }

    return { ok: true, effects };
  }, [saveAction]);

  // ── GET NEXT TABLE NAME ──
  const getNextTableName = useCallback(
    () => `Masa ${tables.filter((t) => t.type !== "bar" && !t.isRing).length + 1}`,
    [tables]
  );

  // ── CREATE TABLE ──
  const createTable = useCallback((modal: CreateTableModal | null): SeatingActionResult => {
    if (modal?.type !== "bar" && !modal?.name?.trim()) {
      return {
        ok: false,
        effects: [
          { type: "SHOW_TOAST", payload: { message: "Introdu numele mesei!", toastType: "red" } },
        ],
      };
    }

    saveAction();
    const id = nextId;
    setNextId((n) => n + 1);
    spawnCounterRef.current++;

    const proto = { type: modal.type, seats: modal.seats || 0, isRing: false, rotation: 0 };
    const { x, y } = getSpawnPosition(proto, spawnCounterRef.current, camRef, canvasWRef, canvasHRef);

    setTables((prev) => [
      ...prev,
      { id, name: modal.name.trim() || "Bar", type: modal.type, seats: modal.seats || 0, isRing: modal.isRing || false, x, y, rotation: 0 },
    ]);
    setNewTableIds((prev) => new Set([...prev, id]));

    return {
      ok: true,
      effects: [
        { type: "SELECT_TABLE", payload: { tableId: id } },
        { type: "SHOW_TOAST", payload: { message: `✓ "${modal.name || "Bar"}" creat`, toastType: "green" } },
        { type: "CLOSE_MODAL" },
      ],
    };
  }, [nextId, saveAction, newTableIds.size, camRef, canvasWRef, canvasHRef]);

  // ── CLEAR NEW TABLE HIGHLIGHT ──
  const clearNewTableHighlight = useCallback((tableId: number) => {
    setNewTableIds((prev) => {
      if (!prev.has(tableId)) return prev;
      const next = new Set(prev);
      next.delete(tableId);
      return next;
    });
  }, []);

  // ── DELETE TABLE ──
  const deleteTable = useCallback((tableId: number, _tables?: SeatingTable[]): SeatingActionResultWithConfirm => {
    const t = tablesRef.current.find((x) => x.id === tableId);
    if (!t) return { ok: false, effects: [] };

    const sub = t.isRing ? "Ring-ul dans va fi eliminat."
      : t.type === "bar" ? "Obiectul va fi eliminat."
      : "Invitatii revin in neatribuiti.";

    return {
      ok: true,
      confirmRequired: {
        title: `Stergi "${t.name}"?`,
        sub,
        onConfirm: () => {
          saveAction();
          setGuests((prev) => prev.map((g) => (g.tableId === tableId ? { ...g, tableId: null } : g)));
          setTables((prev) => prev.filter((x) => x.id !== tableId));
          setNewTableIds((prev) => { const next = new Set(prev); next.delete(tableId); return next; });
          return {
            ok: true,
            effects: [
              { type: "CLOSE_EDIT_PANEL" },
              { type: "SELECT_TABLE", payload: { tableId: null } },
              { type: "SHOW_TOAST", payload: { message: `"${t.name}" sters`, toastType: "red" } },
            ],
          };
        },
      },
      effects: [],
    };
  }, [saveAction]);

  // ── ROTATE TABLE ──
  const rotateTable = useCallback((tableId: number, deg: number): SeatingActionResult => {
    saveAction();
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, rotation: (((t.rotation || 0) + deg) % 360 + 360) % 360 } : t))
    );
    return { ok: true, effects: [] };
  }, [saveAction]);

  // ── SAVE EDIT ──
  const saveEdit = useCallback((editName: string, editSeats: number, editPanelTableId: number): SeatingActionResult => {
    if (!editName.trim()) return { ok: false, effects: [] };

    saveAction();
    setTables((prev) =>
      prev.map((t) =>
        t.id === editPanelTableId ? { ...t, name: editName.trim(), seats: editSeats } : t
      )
    );

    return {
      ok: true,
      effects: [
        { type: "CLOSE_EDIT_PANEL" },
        { type: "SHOW_TOAST", payload: { message: "Actualizat", toastType: "rose" } },
      ],
    };
  }, []);

  // ── RESET PLAN ──
  const resetPlan = useCallback((dispatchCam?: ((action: { type: string; [key: string]: unknown }) => void) | null): SeatingActionResult => {
    saveAction();
    setTables(buildRingOnly());
    setGuests((prev) => prev.map((g) => ({ ...g, tableId: null })));
    setNextId(10);
    setNewTableIds(new Set());

    if (dispatchCam && canvasWRef.current && canvasHRef.current) {
      const z = RESET_ZOOM;
      dispatchCam({
        type: "CAM_SET",
        vx: RING_CENTER_X - canvasWRef.current / z / 2,
        vy: RING_CENTER_Y - canvasHRef.current / z / 2,
        z,
        canvasW: canvasWRef.current,
        canvasH: canvasHRef.current,
      });
    }

    return {
      ok: true,
      effects: [
        { type: "SHOW_TOAST", payload: { message: "Plan resetat", toastType: "red" } },
      ],
    };
  }, [saveAction, canvasWRef, canvasHRef]);

  // ── SET TABLES (pentru drag extern) ──
  const setTablesExternal = useCallback((updater: SeatingTable[] | ((prev: SeatingTable[]) => SeatingTable[])) => {
    setTables(updater);
  }, []);

  // ── FILTERED UNASSIGNED ──
  const filteredUnassigned = useCallback((searchQuery?: string | null): SeatingGuestWithEvents[] => {
    const base = guests.filter((g) => g.tableId == null && isSeatingEligible(g));
    if (!searchQuery) return base;
    const q = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return base.filter((g) =>
      `${g.prenume} ${g.nume} ${g.grup}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q)
    );
  }, [guests]);

  // ── REVERT TO SNAPSHOT ────────────────────────────────────────────────────
  // Restaurare atomică: setTables + setGuests cu tableId-urile din snapshot.
  // Apelat de page.js la confirmare dialog "Revenire".
  const revertToSnapshot = useCallback(({ tables: snapTables, guests: snapGuests }: SeatingSnapshot) => {
    setTables(structuredClone(snapTables));
    setGuests(structuredClone(snapGuests));
  }, []);

  return {
    // State
    guests,
    tables,
    nextId,
    hydrated,
    newTableIds,
    guestsByTable,
    guestById,
    tableById,
    realTables,
    totalSeats,
    assignedCount,
    unassigned,
    progress,
    menuStats,
    guestMeta,
    groupColorMap,

    // Refs (pentru useTableInteractions)
    tablesRef,
    guestsRef,
    spawnCounterRef,

    // Setters direcți (pentru useTableInteractions drag)
    setTables: setTablesExternal,

    // Actions
    saveAction,
    undo,
    assignGuest,
    unassignGuest,
    magicFill,
    getNextTableName,
    createTable,
    clearNewTableHighlight,
    deleteTable,
    rotateTable,
    saveEdit,
    resetPlan,
    revertToSnapshot,

    // Helper
    getGuestTableId: (guestId: number): number | null => {
      const guest = guestById.get(guestId);
      return guest?.tableId ?? null;
    },

    // Search
    filteredUnassigned,
  };
}
